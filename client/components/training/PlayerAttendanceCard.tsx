import { useEffect, useMemo, useState } from 'react';
import {
  Award,
  CalendarCheck2,
  CheckCircle2,
  Clock3,
  Flame,
  Loader2,
  MapPin,
  Medal,
  Sparkles,
  Target,
  Trophy,
} from 'lucide-react';
import {
  Api,
  type PlayerAttendanceHistoryItem,
  type PlayerAttendanceSummary,
  type TrainingAttendanceStatus,
} from '@/lib/api';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';

interface PlayerAttendanceCardProps {
  playerId?: string;
  showHistory?: boolean;
}

const statusLabels: Record<TrainingAttendanceStatus, string> = {
  present: 'Present',
  late: 'Late',
  absent: 'Absent',
  excused: 'Excused',
  injured: 'Injured',
};

const statusClasses: Record<TrainingAttendanceStatus, string> = {
  present: 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-300',
  late: 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950/50 dark:text-amber-300',
  absent: 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900 dark:bg-rose-950/50 dark:text-rose-300',
  excused: 'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900 dark:bg-blue-950/50 dark:text-blue-300',
  injured: 'border-slate-200 bg-slate-100 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300',
};

export default function PlayerAttendanceCard({
  playerId,
  showHistory = true,
}: PlayerAttendanceCardProps) {
  const [summary, setSummary] = useState<PlayerAttendanceSummary | null>(null);
  const [history, setHistory] = useState<PlayerAttendanceHistoryItem[]>([]);
  const [loading, setLoading] = useState(Boolean(playerId));
  const [error, setError] = useState('');

  useEffect(() => {
    if (!playerId) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError('');
    Api.getPlayerAttendanceSummary(playerId)
      .then((response) => {
        if (cancelled) return;
        setSummary(response.data.summary);
        setHistory(response.data.history);
      })
      .catch((requestError: any) => {
        if (cancelled) return;
        setError(requestError?.message || 'Attendance is unavailable.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [playerId]);

  const recentHistory = useMemo(() => history.slice(0, 5), [history]);

  if (loading) {
    return (
      <Card className="overflow-hidden border-blue-100 dark:border-blue-900/60">
        <CardContent className="flex min-h-48 items-center justify-center gap-2 text-sm text-slate-500">
          <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
          Loading training progress…
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="border-slate-200 dark:border-slate-800">
        <CardContent className="flex min-h-36 items-center gap-4 p-6">
          <div className="rounded-full bg-slate-100 p-3 dark:bg-slate-800">
            <CalendarCheck2 className="h-6 w-6 text-slate-400" />
          </div>
          <div>
            <p className="font-semibold text-slate-800 dark:text-slate-200">
              Training progress is unavailable
            </p>
            <p className="mt-1 text-sm text-slate-500">{error}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!summary || summary.totalRecordedSessions === 0) {
    return (
      <Card className="relative overflow-hidden border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50 dark:border-amber-900/60 dark:from-amber-950/30 dark:to-slate-950">
        <div className="absolute -right-8 -top-8 h-28 w-28 rounded-full bg-amber-300/30 blur-2xl" />
        <CardContent className="relative flex flex-col gap-5 p-6 sm:flex-row sm:items-center">
          <div className="rounded-2xl bg-white p-4 shadow-sm dark:bg-slate-900">
            <Flame className="h-8 w-8 text-orange-500" />
          </div>
          <div className="flex-1">
            <Badge className="mb-2 bg-amber-200 text-amber-900 hover:bg-amber-200">
              Your first streak awaits
            </Badge>
            <h3 className="text-xl font-black text-slate-900 dark:text-white">
              Show up. Train hard. Build momentum.
            </h3>
            <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-300">
              Your attendance streak starts when your academy records your first
              completed training session.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden border-slate-200 shadow-sm dark:border-slate-800">
      <div className="relative bg-gradient-to-br from-slate-950 via-blue-950 to-violet-900 p-6 text-white sm:p-7">
        <div className="absolute -right-10 -top-12 h-40 w-40 rounded-full bg-orange-400/20 blur-3xl" />
        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge className="border-white/15 bg-white/10 text-white hover:bg-white/10">
                <Medal className="me-1.5 h-3.5 w-3.5 text-amber-300" />
                {summary.badge}
              </Badge>
              {summary.attendedRecentSession && (
                <Badge className="border-emerald-300/20 bg-emerald-400/20 text-emerald-100 hover:bg-emerald-400/20">
                  <CheckCircle2 className="me-1.5 h-3.5 w-3.5" />
                  Attended recent training session
                </Badge>
              )}
            </div>
            <h3 className="mt-4 text-2xl font-black tracking-tight">
              Training momentum
            </h3>
            <p className="mt-1 text-sm text-blue-100">
              Consistency turns practice into performance.
            </p>
          </div>
          <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/10 px-5 py-4 backdrop-blur-sm">
            <Flame className="h-9 w-9 text-orange-400" />
            <div>
              <p className="text-3xl font-black leading-none">{summary.currentStreak}</p>
              <p className="mt-1 text-xs font-bold uppercase tracking-widest text-blue-100">
                Session streak
              </p>
            </div>
          </div>
        </div>
      </div>

      <CardContent className="space-y-6 p-5 sm:p-7">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[
            {
              label: 'Attendance',
              value: `${summary.attendanceRate}%`,
              icon: Target,
              color: 'text-blue-600',
            },
            {
              label: 'Sessions attended',
              value: summary.attendedSessions,
              icon: CalendarCheck2,
              color: 'text-emerald-600',
            },
            {
              label: 'Best streak',
              value: summary.longestStreak,
              icon: Trophy,
              color: 'text-amber-600',
            },
            {
              label: 'Training points',
              value: summary.points,
              icon: Sparkles,
              color: 'text-violet-600',
            },
          ].map(({ label, value, icon: Icon, color }) => (
            <div
              key={label}
              className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-900/70"
            >
              <Icon className={`h-5 w-5 ${color}`} />
              <p className="mt-3 text-2xl font-black text-slate-900 dark:text-white">
                {value}
              </p>
              <p className="mt-0.5 text-xs text-slate-500">{label}</p>
            </div>
          ))}
        </div>

        <div className="rounded-2xl border border-orange-100 bg-orange-50/70 p-4 dark:border-orange-900/50 dark:bg-orange-950/20">
          <div className="mb-2.5 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Award className="h-5 w-5 text-orange-500" />
              <span className="text-sm font-bold text-slate-800 dark:text-slate-200">
                Next streak milestone
              </span>
            </div>
            <span className="text-sm font-black text-orange-600">
              {summary.currentStreak}/{summary.nextMilestone}
            </span>
          </div>
          <Progress value={summary.milestoneProgress} className="h-2.5" />
          <p className="mt-2 text-xs text-slate-500">
            Attend {Math.max(0, summary.nextMilestone - summary.currentStreak)} more{' '}
            {summary.nextMilestone - summary.currentStreak === 1 ? 'session' : 'sessions'}{' '}
            in a row to reach the next milestone.
          </p>
        </div>

        {showHistory && recentHistory.length > 0 && (
          <div>
            <div className="mb-3 flex items-center justify-between">
              <h4 className="font-bold text-slate-900 dark:text-white">
                Recent training
              </h4>
              <span className="text-xs text-slate-500">
                Last {recentHistory.length} sessions
              </span>
            </div>
            <div className="space-y-2">
              {recentHistory.map((item) => (
                <div
                  key={item.sessionId}
                  className="flex flex-col gap-3 rounded-xl border border-slate-200 p-3 sm:flex-row sm:items-center sm:justify-between dark:border-slate-700"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">
                      {item.title}
                    </p>
                    <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
                      <span className="flex items-center gap-1">
                        <Clock3 className="h-3.5 w-3.5" />
                        {new Intl.DateTimeFormat(undefined, {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        }).format(new Date(item.sessionDate))}
                      </span>
                      {item.location && (
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3.5 w-3.5" />
                          {item.location}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center justify-between gap-2 sm:justify-end">
                    {item.points > 0 && (
                      <span className="text-xs font-bold text-violet-600">
                        +{item.points} pts
                      </span>
                    )}
                    <Badge variant="outline" className={statusClasses[item.status]}>
                      {statusLabels[item.status]}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
