import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { rateDeliverable, getDeliverableRating } from '@/lib/data-service';
import { Star, Loader2, CheckCircle2 } from 'lucide-react';

interface Props {
  deliverableId: string;
  clientId: string;
  compact?: boolean;
}

export default function DeliverableRating({ deliverableId, clientId, compact = false }: Props) {
  const [rating, setRating] = useState(0);
  const [hoveredStar, setHoveredStar] = useState(0);
  const [feedback, setFeedback] = useState('');
  const [existingRating, setExistingRating] = useState<{ rating: number; feedback: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    async function fetchRating() {
      try {
        const data = await getDeliverableRating(deliverableId, clientId);
        if (data) {
          setExistingRating({ rating: data.rating, feedback: data.feedback || '' });
          setRating(data.rating);
          setFeedback(data.feedback || '');
        }
      } catch {
        // No rating yet
      }
    }
    fetchRating();
  }, [deliverableId, clientId]);

  const handleRate = async (star: number) => {
    setRating(star);
    if (compact) {
      // Auto-save in compact mode
      setLoading(true);
      try {
        await rateDeliverable({
          deliverableId,
          clientId,
          rating: star,
          feedback: feedback || undefined,
        });
        setExistingRating({ rating: star, feedback });
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      } catch (e) {
        console.error('Failed to rate:', e);
      } finally {
        setLoading(false);
      }
    }
  };

  const handleSave = async () => {
    if (rating === 0) return;
    setLoading(true);
    try {
      await rateDeliverable({
        deliverableId,
        clientId,
        rating,
        feedback: feedback || undefined,
      });
      setExistingRating({ rating, feedback });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e) {
      console.error('Failed to rate:', e);
    } finally {
      setLoading(false);
    }
  };

  if (compact) {
    return (
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            onClick={() => handleRate(star)}
            onMouseEnter={() => setHoveredStar(star)}
            onMouseLeave={() => setHoveredStar(0)}
            disabled={loading}
            className="active:scale-110 transition-transform disabled:opacity-50"
          >
            <Star
              className={`w-4 h-4 transition-colors ${
                star <= (hoveredStar || rating)
                  ? 'text-titan-amber fill-titan-amber'
                  : 'text-white/10'
              }`}
            />
          </button>
        ))}
        {loading && <Loader2 className="w-3 h-3 text-titan-cyan animate-spin ml-1" />}
        {saved && <CheckCircle2 className="w-3 h-3 text-titan-lime ml-1" />}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Star Rating */}
      <div>
        <p className="font-mono text-[10px] text-white/40 mb-2">
          {existingRating ? 'Your rating' : 'Rate this deliverable'}
        </p>
        <div className="flex items-center gap-2">
          {[1, 2, 3, 4, 5].map((star) => (
            <motion.button
              key={star}
              whileTap={{ scale: 1.2 }}
              onClick={() => setRating(star)}
              onMouseEnter={() => setHoveredStar(star)}
              onMouseLeave={() => setHoveredStar(0)}
              className="active:scale-110 transition-transform"
            >
              <Star
                className={`w-6 h-6 transition-colors ${
                  star <= (hoveredStar || rating)
                    ? 'text-titan-amber fill-titan-amber drop-shadow-[0_0_6px_rgba(255,184,0,0.4)]'
                    : 'text-white/10'
                }`}
              />
            </motion.button>
          ))}
          {rating > 0 && (
            <span className="font-display font-bold text-sm text-white ml-2">
              {rating}/5
            </span>
          )}
        </div>
      </div>

      {/* Feedback */}
      <div>
        <label className="font-mono text-[10px] text-white/40 block mb-1.5">Feedback (optional)</label>
        <textarea
          value={feedback}
          onChange={(e) => setFeedback(e.target.value)}
          placeholder="Share your thoughts about this deliverable..."
          rows={2}
          className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 font-mono text-xs text-white placeholder:text-white/20 focus:border-titan-cyan/50 focus:outline-none resize-none"
        />
      </div>

      {/* Save */}
      <button
        onClick={handleSave}
        disabled={rating === 0 || loading}
        className="w-full py-2.5 rounded-xl bg-titan-amber/15 border border-titan-amber/30 font-display font-bold text-xs text-titan-amber active:scale-[0.97] transition-transform disabled:opacity-30 flex items-center justify-center gap-2"
      >
        {loading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : saved ? (
          <>
            <CheckCircle2 className="w-4 h-4" />
            Saved!
          </>
        ) : (
          <>
            <Star className="w-4 h-4" />
            {existingRating ? 'Update Rating' : 'Submit Rating'}
          </>
        )}
      </button>
    </div>
  );
}
