import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Mic, Send, X, Pause, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface VoiceRecorderProps {
  onSendVoice: (audioBlob: Blob, duration: number) => void;
  onCancel: () => void;
}

export default function VoiceRecorder({ onSendVoice, onCancel }: VoiceRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [duration, setDuration] = useState(0);
  const [audioLevels, setAudioLevels] = useState<number[]>(Array(20).fill(4));
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const animationRef = useRef<number | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);

  useEffect(() => {
    startRecording();
    return () => {
      stopRecording();
    };
  }, []);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      // Setup audio analyzer for waveform
      const audioContext = new AudioContext();
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 64;
      source.connect(analyser);
      analyserRef.current = analyser;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.start();
      setIsRecording(true);

      // Start timer
      timerRef.current = setInterval(() => {
        setDuration((prev) => prev + 1);
      }, 1000);

      // Animate waveform
      animateWaveform();
    } catch (error) {
      console.error('Error accessing microphone:', error);
      alert('Could not access microphone. Please check permissions.');
      onCancel();
    }
  };

  const animateWaveform = () => {
    if (!analyserRef.current) return;

    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
    
    const animate = () => {
      if (!analyserRef.current) return;
      
      analyserRef.current.getByteFrequencyData(dataArray);
      
      const levels = Array.from({ length: 20 }, (_, i) => {
        const index = Math.floor((i / 20) * dataArray.length);
        return Math.max(4, (dataArray[index] / 255) * 24);
      });
      
      setAudioLevels(levels);
      animationRef.current = requestAnimationFrame(animate);
    };

    animate();
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      setIsRecording(false);
    }

    if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
  };

  const handleSend = () => {
    stopRecording();
    
    if (audioChunksRef.current.length > 0) {
      const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
      onSendVoice(audioBlob, duration);
    }
  };

  const handleCancel = () => {
    stopRecording();
    audioChunksRef.current = [];
    onCancel();
  };

  const togglePause = () => {
    if (!mediaRecorderRef.current) return;

    if (isPaused) {
      mediaRecorderRef.current.resume();
      timerRef.current = setInterval(() => {
        setDuration((prev) => prev + 1);
      }, 1000);
    } else {
      mediaRecorderRef.current.pause();
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    }
    setIsPaused(!isPaused);
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-center gap-3 px-4 py-3 glass-card rounded-xl border border-white/[0.1]"
    >
      {/* Recording Indicator */}
      <motion.div
        animate={{ scale: isPaused ? 1 : [1, 1.2, 1] }}
        transition={{ repeat: isPaused ? 0 : Infinity, duration: 1.5 }}
        className={`w-3 h-3 rounded-full ${isPaused ? 'bg-yellow-500' : 'bg-red-500'}`}
      />

      {/* Waveform */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-0.5 h-6">
          {audioLevels.map((height, i) => (
            <motion.div
              key={i}
              className="w-1 bg-titan-cyan rounded-full"
              animate={{ height: isPaused ? 4 : height }}
              transition={{ duration: 0.1 }}
            />
          ))}
        </div>
        <p className="text-xs text-white/40 mt-1">{formatDuration(duration)}</p>
      </div>

      {/* Controls */}
      <Button
        size="sm"
        variant="ghost"
        onClick={togglePause}
        className="p-2 h-auto hover:bg-white/[0.06]"
      >
        {isPaused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
      </Button>

      <Button
        size="sm"
        onClick={handleSend}
        className="p-2 h-auto bg-titan-cyan hover:bg-titan-cyan/80"
      >
        <Send className="w-4 h-4" />
      </Button>

      <Button
        size="sm"
        variant="ghost"
        onClick={handleCancel}
        className="p-2 h-auto hover:bg-white/[0.06] text-red-400"
      >
        <X className="w-4 h-4" />
      </Button>
    </motion.div>
  );
}
