import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/lib/auth';
import { getContentCalendar } from '@/lib/data-service';
import {
  Calendar,
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Image,
  Video,
  PenTool,
  Rocket,
  FileText,
  Clock,
  CheckCircle2,
  X,
  RefreshCw,
} from 'lucide-react';

interface CalendarEvent {
  id: string;
  title: string;
  deliverable_type: string;
  status: string;
  scheduled_publish_date: string;
  published_at: string | null;
  publish_platform: string | null;
  calendar_color: string;
}

const typeIcons: Record<string, typeof Image> = {
  photo_graphics: Image,
  video_editing: Video,
  motion_graphics: Video,
  ui_ux_design: PenTool,
  social_media: Rocket,
  content_writing: FileText,
};

const statusColors: Record<string, string> = {
  pending: '#FFB800',
  'in-progress': '#7B61FF',
  review: '#00D9FF',
  approved: '#39FF14',
  delivered: '#39FF14',
  cancelled: '#FF006E',
};

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function ClientContentCalendar({ onBack }: { onBack: () => void }) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const monthKey = `${year}-${String(month + 1).padStart(2, '0')}`;
  const monthLabel = currentDate.toLocaleDateString('en', { month: 'long', year: 'numeric' });

  const fetchEvents = useCallback(async () => {
    const clientId = user?.client_id;
    if (!clientId) return;
    setLoading(true);
    try {
      const data = await getContentCalendar(clientId, monthKey);
      setEvents(data as CalendarEvent[]);
    } catch (e) {
      console.error('Failed to fetch calendar:', e);
      // No mock fallback - show empty calendar
      setEvents([]);
    } finally {
      setLoading(false);
    }
  }, [user?.client_id, monthKey]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  const calendarDays = useMemo(() => {
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const days: (number | null)[] = [];

    for (let i = 0; i < firstDay; i++) days.push(null);
    for (let i = 1; i <= daysInMonth; i++) days.push(i);
    const remaining = 7 - (days.length % 7);
    if (remaining < 7) {
      for (let i = 0; i < remaining; i++) days.push(null);
    }

    return days;
  }, [year, month]);

  const eventsByDate = useMemo(() => {
    const map: Record<string, CalendarEvent[]> = {};
    events.forEach((ev) => {
      const d = new Date(ev.scheduled_publish_date);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      if (!map[key]) map[key] = [];
      map[key].push(ev);
    });
    return map;
  }, [events]);

  const today = new Date();
  const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

  const selectedDateEvents = selectedDate ? (eventsByDate[selectedDate] || []) : [];

  return (
    <div className="h-full overflow-y-auto scrollbar-hide">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-titan-bg/95 backdrop-blur-xl border-b border-white/[0.06]">
        <div className="flex items-center gap-3 px-4 py-3">
          <button
            onClick={onBack}
            className="w-8 h-8 rounded-full glass-card flex items-center justify-center active:scale-90 transition-transform"
          >
            <ArrowLeft className="w-4 h-4 text-white/50" />
          </button>
          <div className="flex-1">
            <h1 className="font-display font-bold text-sm text-white">Content Calendar</h1>
            <p className="font-mono text-[10px] text-white/30">{events.length} scheduled items</p>
          </div>
          <button
            onClick={fetchEvents}
            className="w-8 h-8 rounded-full glass-card flex items-center justify-center active:scale-90 transition-transform"
          >
            <RefreshCw className={`w-4 h-4 text-white/30 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      <div className="px-4 pt-3 pb-6 space-y-4">
        {/* Month Navigation */}
        <div className="flex items-center justify-between">
          <button onClick={prevMonth} className="w-8 h-8 rounded-full glass-card flex items-center justify-center active:scale-90 transition-transform">
            <ChevronLeft className="w-4 h-4 text-white/40" />
          </button>
          <h2 className="font-display font-bold text-sm text-white">{monthLabel}</h2>
          <button onClick={nextMonth} className="w-8 h-8 rounded-full glass-card flex items-center justify-center active:scale-90 transition-transform">
            <ChevronRight className="w-4 h-4 text-white/40" />
          </button>
        </div>

        {/* Weekday Headers */}
        <div className="grid grid-cols-7 gap-1">
          {WEEKDAYS.map((wd) => (
            <div key={wd} className="text-center font-mono text-[9px] text-white/20 py-1">
              {wd}
            </div>
          ))}
        </div>

        {/* Calendar Grid */}
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 text-titan-cyan/40 animate-spin" />
          </div>
        ) : (
          <div className="grid grid-cols-7 gap-1">
            {calendarDays.map((day, i) => {
              if (day === null) {
                return <div key={`empty-${i}`} className="aspect-square" />;
              }
              const dateKey = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
              const dayEvents = eventsByDate[dateKey] || [];
              const isToday = dateKey === todayKey;
              const isSelected = dateKey === selectedDate;

              return (
                <motion.button
                  key={dateKey}
                  whileTap={{ scale: 0.92 }}
                  onClick={() => setSelectedDate(isSelected ? null : dateKey)}
                  className={`aspect-square rounded-xl flex flex-col items-center justify-center relative transition-all ${
                    isSelected
                      ? 'bg-titan-cyan/15 border border-titan-cyan/30'
                      : isToday
                      ? 'bg-white/5 border border-white/10'
                      : 'border border-transparent hover:bg-white/[0.02]'
                  }`}
                >
                  <span
                    className={`font-mono text-xs ${
                      isSelected ? 'text-titan-cyan font-bold' : isToday ? 'text-white font-bold' : 'text-white/40'
                    }`}
                  >
                    {day}
                  </span>
                  {dayEvents.length > 0 && (
                    <div className="flex gap-0.5 mt-0.5">
                      {dayEvents.slice(0, 3).map((ev, j) => (
                        <span
                          key={j}
                          className="w-1 h-1 rounded-full"
                          style={{ background: ev.calendar_color || '#00D9FF' }}
                        />
                      ))}
                    </div>
                  )}
                </motion.button>
              );
            })}
          </div>
        )}

        {/* Selected Date Events */}
        <AnimatePresence>
          {selectedDate && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="font-display font-bold text-xs text-white">
                    {new Date(selectedDate + 'T00:00:00').toLocaleDateString('en', { weekday: 'long', month: 'short', day: 'numeric' })}
                  </h3>
                  <span className="font-mono text-[10px] text-white/25">
                    {selectedDateEvents.length} item{selectedDateEvents.length !== 1 ? 's' : ''}
                  </span>
                </div>

                {selectedDateEvents.length === 0 ? (
                  <div className="glass-card p-4 text-center">
                    <Calendar className="w-6 h-6 text-white/10 mx-auto mb-1" />
                    <p className="font-mono text-[10px] text-white/25">No content scheduled</p>
                  </div>
                ) : (
                  selectedDateEvents.map((ev, i) => {
                    const Icon = typeIcons[ev.deliverable_type] || FileText;
                    const statusColor = statusColors[ev.status] || '#00D9FF';
                    return (
                      <motion.button
                        key={ev.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.05 }}
                        onClick={() => setSelectedEvent(ev)}
                        className="w-full text-left glass-card p-3 active:scale-[0.98] transition-transform"
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                            style={{
                              background: `${ev.calendar_color || '#00D9FF'}12`,
                              border: `1px solid ${ev.calendar_color || '#00D9FF'}20`,
                            }}
                          >
                            <Icon className="w-4 h-4" style={{ color: ev.calendar_color || '#00D9FF' }} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-display font-semibold text-xs text-white truncate">{ev.title}</p>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span
                                className="w-1.5 h-1.5 rounded-full"
                                style={{ background: statusColor }}
                              />
                              <span className="font-mono text-[9px] text-white/30 capitalize">{ev.status}</span>
                              {ev.publish_platform && (
                                <>
                                  <span className="text-white/10">•</span>
                                  <span className="font-mono text-[9px] text-white/20">{ev.publish_platform}</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      </motion.button>
                    );
                  })
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Upcoming Events (if no date selected) */}
        {!selectedDate && events.length > 0 && (
          <div className="space-y-2">
            <h3 className="font-display font-bold text-xs text-white/60">Upcoming</h3>
            {events
              .filter((ev) => new Date(ev.scheduled_publish_date) >= new Date())
              .slice(0, 5)
              .map((ev, i) => {
                const Icon = typeIcons[ev.deliverable_type] || FileText;
                const d = new Date(ev.scheduled_publish_date);
                return (
                  <motion.div
                    key={ev.id}
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 + i * 0.05 }}
                    className="flex items-center gap-3 glass-card p-3"
                  >
                    <div
                      className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                      style={{
                        background: `${ev.calendar_color || '#00D9FF'}12`,
                        border: `1px solid ${ev.calendar_color || '#00D9FF'}20`,
                      }}
                    >
                      <Icon className="w-3.5 h-3.5" style={{ color: ev.calendar_color || '#00D9FF' }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-display font-semibold text-xs text-white truncate">{ev.title}</p>
                      <p className="font-mono text-[9px] text-white/25">
                        {d.toLocaleDateString('en', { month: 'short', day: 'numeric' })}
                        {ev.publish_platform ? ` • ${ev.publish_platform}` : ''}
                      </p>
                    </div>
                    <span
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ background: statusColors[ev.status] || '#00D9FF' }}
                    />
                  </motion.div>
                );
              })}
          </div>
        )}
      </div>

      {/* Event Detail Modal */}
      <AnimatePresence>
        {selectedEvent && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end"
            onClick={() => setSelectedEvent(null)}
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full bg-titan-bg border-t border-white/10 rounded-t-3xl p-4 space-y-3"
            >
              <div className="flex items-center justify-between">
                <h2 className="font-display font-bold text-base text-white">{selectedEvent.title}</h2>
                <button
                  onClick={() => setSelectedEvent(null)}
                  className="w-8 h-8 rounded-full glass-card flex items-center justify-center"
                >
                  <X className="w-4 h-4 text-white/40" />
                </button>
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Calendar className="w-3.5 h-3.5 text-white/25" />
                  <span className="font-mono text-xs text-white/50">
                    {new Date(selectedEvent.scheduled_publish_date).toLocaleDateString('en', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full" style={{ background: statusColors[selectedEvent.status] }} />
                  <span className="font-mono text-xs text-white/50 capitalize">{selectedEvent.status}</span>
                </div>
                <div className="flex items-center gap-2">
                  <FileText className="w-3.5 h-3.5 text-white/25" />
                  <span className="font-mono text-xs text-white/50 capitalize">
                    {selectedEvent.deliverable_type.replace(/_/g, ' ')}
                  </span>
                </div>
                {selectedEvent.publish_platform && (
                  <div className="flex items-center gap-2">
                    <Rocket className="w-3.5 h-3.5 text-white/25" />
                    <span className="font-mono text-xs text-white/50">{selectedEvent.publish_platform}</span>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
