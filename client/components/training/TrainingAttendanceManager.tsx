import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  CalendarCheck2,
  Check,
  CheckCircle2,
  Clock3,
  CalendarRange,
  Flame,
  Loader2,
  Mail,
  MapPin,
  Repeat2,
  Plus,
  Search,
  Trophy,
  UserCheck,
  Users,
} from 'lucide-react';
import {
  Api,
  type TrainingAttendanceStatus,
  type TrainingLocation,
  type TrainingRosterPlayer,
  type TrainingSession,
} from '@/lib/api';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';

interface TrainingAttendanceManagerProps {
  academyId: string;
}

type SessionsSummary = {
  total: number;
  upcoming: number;
  completed: number;
  averageAttendance: number;
};

const emptySummary: SessionsSummary = {
  total: 0,
  upcoming: 0,
  completed: 0,
  averageAttendance: 0,
};

const attendanceOptions: Array<{
  value: TrainingAttendanceStatus;
  label: string;
}> = [
  { value: 'present', label: 'Present' },
  { value: 'late', label: 'Late' },
  { value: 'absent', label: 'Absent' },
  { value: 'excused', label: 'Excused' },
  { value: 'injured', label: 'Injured' },
];

const statusClasses: Record<TrainingAttendanceStatus, string> = {
  present: 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300',
  late: 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300',
  absent: 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-300',
  excused: 'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-300',
  injured: 'border-slate-200 bg-slate-100 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300',
};

const weekdayOptions = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
] as const;

function parseRecurrenceRule(value: string, timezoneOffsetMinutes: number) {
  if (value === 'daily') {
    return {
      frequency: 'daily' as const,
      interval: 1,
      timezoneOffsetMinutes,
    };
  }
  if (value === 'weekly') {
    return {
      frequency: 'weekly' as const,
      interval: 1,
      timezoneOffsetMinutes,
    };
  }
  if (value.startsWith('weekday:')) {
    return {
      frequency: 'weekly' as const,
      interval: 1,
      weekday: Number(value.split(':')[1]),
      timezoneOffsetMinutes,
    };
  }
  if (value.startsWith('weeks:')) {
    return {
      frequency: 'weekly' as const,
      interval: Number(value.split(':')[1]),
      timezoneOffsetMinutes,
    };
  }
  return undefined;
}

function moveDateToWeekday(dateValue: string, weekday: number) {
  const date = new Date(`${dateValue}T12:00:00`);
  if (Number.isNaN(date.getTime())) return dateValue;
  date.setDate(date.getDate() + ((weekday - date.getDay() + 7) % 7));
  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return localDate.toISOString().slice(0, 10);
}

function formatSessionDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(value));
}

function formatSessionTime(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value));
}

function createInitialForm() {
  const nextHour = new Date(Date.now() + 60 * 60 * 1000);
  nextHour.setMinutes(0, 0, 0);
  const localDate = new Date(nextHour.getTime() - nextHour.getTimezoneOffset() * 60_000);
  return {
    title: 'Training Session',
    date: localDate.toISOString().slice(0, 10),
    time: localDate.toISOString().slice(11, 16),
    locationId: '',
    location: '',
    saveLocation: true,
    durationMinutes: '90',
    description: '',
    repeatRule: 'none',
    occurrenceCount: '4',
  };
}

export default function TrainingAttendanceManager({
  academyId,
}: TrainingAttendanceManagerProps) {
  const { toast } = useToast();
  const [sessions, setSessions] = useState<TrainingSession[]>([]);
  const [locations, setLocations] = useState<TrainingLocation[]>([]);
  const [summary, setSummary] = useState<SessionsSummary>(emptySummary);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isSavingLocation, setIsSavingLocation] = useState(false);
  const [form, setForm] = useState(createInitialForm);
  const [selectedSession, setSelectedSession] = useState<TrainingSession | null>(null);
  const [roster, setRoster] = useState<TrainingRosterPlayer[]>([]);
  const [attendance, setAttendance] = useState<
    Record<string, TrainingAttendanceStatus>
  >({});
  const [rosterSearch, setRosterSearch] = useState('');
  const [isRosterLoading, setIsRosterLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const loadSessions = useCallback(
    async (silent = false) => {
      if (!silent) setIsInitialLoading(true);
      try {
        const response = await Api.getTrainingSessions(academyId);
        setSessions(response.data.sessions);
        setSummary(response.data.summary);
        setSelectedSession((current) => {
          if (!current) return null;
          return (
            response.data.sessions.find((session) => session.id === current.id) ??
            current
          );
        });
      } catch (error: any) {
        toast({
          variant: 'destructive',
          title: 'Could not load training sessions',
          description: error?.message || 'Please try again.',
        });
      } finally {
        setIsInitialLoading(false);
      }
    },
    [academyId, toast],
  );

  const loadLocations = useCallback(async () => {
    try {
      const response = await Api.getTrainingLocations(academyId);
      setLocations(response.data.locations);
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Could not load saved locations',
        description: error?.message || 'You can still enter a location manually.',
      });
    }
  }, [academyId, toast]);

  useEffect(() => {
    if (!academyId) {
      setIsInitialLoading(false);
      return;
    }
    void Promise.all([loadSessions(), loadLocations()]);
  }, [academyId, loadLocations, loadSessions]);

  const openRoster = async (session: TrainingSession) => {
    setSelectedSession(session);
    setIsRosterLoading(true);
    setRosterSearch('');
    try {
      const response = await Api.getTrainingSessionRoster(session.id);
      setRoster(response.data.players);
      setAttendance(
        Object.fromEntries(
          response.data.players.map((player) => [
            `${player.playerSource}:${player.id}`,
            player.attendanceStatus,
          ]),
        ),
      );
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Could not load the player roster',
        description: error?.message || 'Please try again.',
      });
    } finally {
      setIsRosterLoading(false);
    }
  };

  const handleCreateSession = async () => {
    const localDate = new Date(`${form.date}T${form.time}:00`);
    if (!form.location.trim() || Number.isNaN(localDate.getTime())) {
      toast({
        variant: 'destructive',
        title: 'Complete the session details',
        description: 'A valid date, time, and location are required.',
      });
      return;
    }

    setIsCreating(true);
    try {
      const recurrence = parseRecurrenceRule(
        form.repeatRule,
        localDate.getTimezoneOffset(),
      );
      const response = await Api.createTrainingSession(academyId, {
        title: form.title.trim() || 'Training Session',
        sessionDate: localDate.toISOString(),
        location: form.location.trim(),
        locationId: form.locationId || null,
        saveLocation: !form.locationId && form.saveLocation,
        durationMinutes: Number(form.durationMinutes),
        description: form.description.trim(),
        timezoneOffsetMinutes: localDate.getTimezoneOffset(),
        recurrence: recurrence
          ? {
              ...recurrence,
              occurrenceCount: Number(form.occurrenceCount),
            }
          : undefined,
      });
      setIsCreateOpen(false);
      setForm(createInitialForm());
      await Promise.all([loadSessions(true), loadLocations()]);
      toast({
        title:
          response.data.createdCount > 1
            ? 'Recurring sessions created'
            : 'Training session created',
        description:
          response.data.createdCount > 1
            ? `${response.data.createdCount} sessions were scheduled. Each occurrence is ready for attendance.`
            : `${response.data.session.title} is ready for attendance.`,
      });
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Could not create the session',
        description: error?.message || 'Please try again.',
      });
    } finally {
      setIsCreating(false);
    }
  };

  const handleSaveLocation = async () => {
    const name = form.location.trim();
    if (name.length < 2) {
      toast({
        variant: 'destructive',
        title: 'Enter a location name',
        description: 'Use at least two characters before saving.',
      });
      return;
    }

    setIsSavingLocation(true);
    try {
      const response = await Api.saveTrainingLocation(academyId, name);
      const savedLocation = response.data.location;
      setLocations((current) =>
        [...current.filter((item) => item.id !== savedLocation.id), savedLocation].sort(
          (left, right) => left.name.localeCompare(right.name),
        ),
      );
      setForm((current) => ({
        ...current,
        locationId: savedLocation.id,
        location: savedLocation.name,
        saveLocation: false,
      }));
      toast({
        title: 'Location saved',
        description: `${savedLocation.name} is now available to academy users.`,
      });
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Could not save the location',
        description: error?.message || 'Please try again.',
      });
    } finally {
      setIsSavingLocation(false);
    }
  };

  const handleRepeatSession = (session: TrainingSession) => {
    const sevenDays = 7 * 24 * 60 * 60 * 1000;
    let nextDate = new Date(new Date(session.sessionDate).getTime() + sevenDays);
    while (nextDate.getTime() < Date.now()) {
      nextDate = new Date(nextDate.getTime() + sevenDays);
    }
    const localDate = new Date(
      nextDate.getTime() - nextDate.getTimezoneOffset() * 60_000,
    );
    const matchingLocation = locations.find(
      (location) =>
        location.id === session.locationId ||
        location.name.trim().toLowerCase() ===
          session.location.trim().toLowerCase(),
    );

    setForm({
      title: session.title,
      date: localDate.toISOString().slice(0, 10),
      time: localDate.toISOString().slice(11, 16),
      locationId: matchingLocation?.id || '',
      location: matchingLocation?.name || session.location,
      saveLocation: !matchingLocation,
      durationMinutes: String(session.durationMinutes || 90),
      description: session.description || '',
      repeatRule: 'none',
      occurrenceCount: '4',
    });
    setIsCreateOpen(true);
  };

  const recurrenceEndDate = useMemo(() => {
    const start = new Date(`${form.date}T${form.time}:00`);
    const recurrence = parseRecurrenceRule(
      form.repeatRule,
      start.getTimezoneOffset(),
    );
    const occurrenceCount = Number(form.occurrenceCount);
    if (
      Number.isNaN(start.getTime()) ||
      !recurrence ||
      occurrenceCount < 2
    ) {
      return null;
    }

    const firstOccurrence = new Date(start);
    if (recurrence.weekday != null) {
      firstOccurrence.setDate(
        firstOccurrence.getDate() +
          ((recurrence.weekday - firstOccurrence.getDay() + 7) % 7),
      );
    }
    const end = new Date(firstOccurrence);
    const dayInterval =
      recurrence.frequency === 'daily' ? recurrence.interval : recurrence.interval * 7;
    end.setDate(end.getDate() + (occurrenceCount - 1) * dayInterval);
    return end;
  }, [
    form.date,
    form.time,
    form.repeatRule,
    form.occurrenceCount,
  ]);

  const setEveryPlayer = (status: TrainingAttendanceStatus) => {
    setAttendance(
      Object.fromEntries(
        roster.map((player) => [`${player.playerSource}:${player.id}`, status]),
      ),
    );
  };

  const filteredRoster = useMemo(() => {
    const term = rosterSearch.trim().toLowerCase();
    if (!term) return roster;
    return roster.filter((player) =>
      `${player.firstName} ${player.lastName} ${player.position || ''} ${player.email || ''}`
        .toLowerCase()
        .includes(term),
    );
  }, [roster, rosterSearch]);

  const attendedCount = roster.filter((player) =>
    ['present', 'late'].includes(
      attendance[`${player.playerSource}:${player.id}`] || 'absent',
    ),
  ).length;

  const handleSaveAttendance = async () => {
    if (!selectedSession || roster.length === 0) return;
    setIsSaving(true);
    try {
      const response = await Api.saveTrainingAttendance(
        selectedSession.id,
        roster.map((player) => ({
          playerId: player.id,
          playerSource: player.playerSource,
          status:
            attendance[`${player.playerSource}:${player.id}`] || 'absent',
          notes: player.attendanceNotes || '',
        })),
        true,
      );
      await loadSessions(true);
      await openRoster({ ...selectedSession, status: 'completed' });
      toast({
        title: 'Attendance saved',
        description: `${response.data.attendedCount} of ${response.data.markedCount} players attended. Streaks are now updated.`,
      });
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Could not save attendance',
        description: error?.message || 'No records were changed. Please try again.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-blue-950 to-blue-800 p-6 text-white shadow-xl sm:p-8">
        <div className="absolute -right-14 -top-14 h-52 w-52 rounded-full bg-amber-400/20 blur-3xl" />
        <div className="absolute -bottom-16 left-1/3 h-48 w-48 rounded-full bg-cyan-400/20 blur-3xl" />
        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="max-w-2xl">
            <h2 className="text-2xl font-black tracking-tight sm:text-3xl">
              Turn every session into progress
            </h2>
            <p className="mt-2 text-sm leading-6 text-blue-100 sm:text-base">
              Schedule training, take attendance in seconds, and help players build
              streaks that reward consistency.
            </p>
          </div>
          <Button
            className="h-11 shrink-0 bg-amber-400 font-bold text-slate-950 hover:bg-amber-300"
            onClick={() => setIsCreateOpen(true)}
          >
            <Plus className="me-2 h-4 w-4" />
            Create session
          </Button>
        </div>
      </section>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          {
            label: 'Upcoming',
            value: summary.upcoming,
            icon: Clock3,
            color: 'text-blue-600',
          },
          {
            label: 'Completed',
            value: summary.completed,
            icon: CheckCircle2,
            color: 'text-emerald-600',
          },
          {
            label: 'Average attendance',
            value: `${summary.averageAttendance}%`,
            icon: UserCheck,
            color: 'text-violet-600',
          },
          {
            label: 'Total sessions',
            value: summary.total,
            icon: Trophy,
            color: 'text-amber-600',
          },
        ].map(({ label, value, icon: Icon, color }) => (
          <Card key={label} className="border-slate-200/80">
            <CardContent className="flex items-center gap-3 p-4 sm:p-5">
              <div className="rounded-2xl bg-slate-100 p-2.5 dark:bg-slate-800">
                <Icon className={`h-5 w-5 ${color}`} />
              </div>
              <div className="min-w-0">
                <p className="text-xl font-black text-slate-900 dark:text-white">
                  {value}
                </p>
                <p className="truncate text-xs text-slate-500 sm:text-sm">{label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(320px,0.8fr)_minmax(0,1.5fr)]">
        <Card className="h-fit border-slate-200/80">
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle className="text-xl">Sessions</CardTitle>
              <p className="mt-1 text-sm text-slate-500">
                Select a session to take attendance.
              </p>
            </div>
            <CalendarCheck2 className="h-6 w-6 text-blue-600" />
          </CardHeader>
          <CardContent className="space-y-3">
            {isInitialLoading ? (
              <div className="flex items-center justify-center gap-2 py-12 text-sm text-slate-500">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading sessions…
              </div>
            ) : sessions.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 p-8 text-center dark:border-slate-700">
                <CalendarCheck2 className="mx-auto h-9 w-9 text-slate-300" />
                <p className="mt-3 font-semibold text-slate-800 dark:text-slate-200">
                  No training sessions yet
                </p>
                <p className="mt-1 text-sm text-slate-500">
                  Create the first session to start a team streak.
                </p>
              </div>
            ) : (
              sessions.map((session) => {
                const isSelected = selectedSession?.id === session.id;
                return (
                  <div
                    key={session.id}
                    className={`overflow-hidden rounded-2xl border transition ${
                      isSelected
                        ? 'border-blue-500 bg-blue-50 shadow-sm dark:bg-blue-950/30'
                        : 'border-slate-200 hover:border-blue-300 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800/60'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => void openRoster(session)}
                      className="w-full p-4 text-start"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex min-w-0 items-center gap-2">
                            <p className="truncate font-bold text-slate-900 dark:text-white">
                              {session.title}
                            </p>
                            {session.seriesId && (
                              <Badge
                                variant="outline"
                                className="shrink-0 border-violet-200 bg-violet-50 text-[10px] text-violet-700 dark:border-violet-800 dark:bg-violet-950/40 dark:text-violet-300"
                              >
                                Series {session.seriesSequence}
                              </Badge>
                            )}
                          </div>
                          <p className="mt-1 text-xs text-slate-500">
                            {formatSessionDate(session.sessionDate)} ·{' '}
                            {formatSessionTime(session.sessionDate)}
                          </p>
                        </div>
                        <Badge
                          variant="outline"
                          className={
                            session.status === 'completed'
                              ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                              : 'border-blue-200 bg-blue-50 text-blue-700'
                          }
                        >
                          {session.status === 'completed' ? 'Completed' : 'Scheduled'}
                        </Badge>
                      </div>
                      <div className="mt-3 flex items-center gap-2 text-xs text-slate-500">
                        <MapPin className="h-3.5 w-3.5 shrink-0" />
                        <span className="truncate">{session.location}</span>
                      </div>
                      {session.markedCount > 0 && (
                        <div className="mt-3">
                          <div className="mb-1.5 flex justify-between text-xs">
                            <span className="text-slate-500">
                              {session.attendedCount}/{session.markedCount} attended
                            </span>
                            <span className="font-bold text-slate-700 dark:text-slate-200">
                              {session.attendanceRate}%
                            </span>
                          </div>
                          <Progress value={session.attendanceRate} className="h-1.5" />
                        </div>
                      )}
                    </button>
                    <div className="flex items-center justify-between border-t border-slate-200/70 px-3 py-2 dark:border-slate-700">
                      <span className="text-[11px] text-slate-500">
                        Open to take attendance
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-8 text-xs text-blue-700 hover:text-blue-800 dark:text-blue-300"
                        onClick={() => handleRepeatSession(session)}
                      >
                        <Repeat2 className="me-1.5 h-3.5 w-3.5" />
                        Repeat
                      </Button>
                    </div>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>

        <Card className="min-w-0 border-slate-200/80">
          {!selectedSession ? (
            <CardContent className="flex min-h-[420px] flex-col items-center justify-center p-8 text-center">
              <div className="rounded-full bg-blue-50 p-5 dark:bg-blue-950/40">
                <Users className="h-10 w-10 text-blue-600" />
              </div>
              <h3 className="mt-5 text-xl font-bold text-slate-900 dark:text-white">
                Ready for kickoff
              </h3>
              <p className="mt-2 max-w-sm text-sm leading-6 text-slate-500">
                Select a session to mark players present, late, absent, excused,
                or injured.
              </p>
            </CardContent>
          ) : (
            <>
              <CardHeader className="border-b border-slate-100 dark:border-slate-800">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <CardTitle>{selectedSession.title}</CardTitle>
                      {selectedSession.status === 'completed' && (
                        <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">
                          <Check className="me-1 h-3 w-3" />
                          Attendance recorded
                        </Badge>
                      )}
                    </div>
                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-500">
                      <span className="flex items-center gap-1.5">
                        <Clock3 className="h-4 w-4" />
                        {formatSessionDate(selectedSession.sessionDate)} ·{' '}
                        {formatSessionTime(selectedSession.sessionDate)}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <MapPin className="h-4 w-4" />
                        {selectedSession.location}
                      </span>
                    </div>
                  </div>
                  {roster.length > 0 && (
                    <div className="rounded-xl bg-emerald-50 px-4 py-2 text-center dark:bg-emerald-950/30">
                      <p className="text-xl font-black text-emerald-700 dark:text-emerald-300">
                        {attendedCount}/{roster.length}
                      </p>
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-emerald-600">
                        Attending
                      </p>
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent className="p-4 sm:p-6">
                {isRosterLoading ? (
                  <div className="flex min-h-[340px] items-center justify-center gap-2 text-sm text-slate-500">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading the live roster…
                  </div>
                ) : roster.length === 0 ? (
                  <div className="py-14 text-center">
                    <Users className="mx-auto h-9 w-9 text-slate-300" />
                    <p className="mt-3 font-semibold">No players in this academy</p>
                    <p className="mt-1 text-sm text-slate-500">
                      Add players before taking attendance.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                      <div className="relative min-w-0 flex-1">
                        <Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        <Input
                          value={rosterSearch}
                          onChange={(event) => setRosterSearch(event.target.value)}
                          placeholder="Search players"
                          className="ps-10"
                        />
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setEveryPlayer('absent')}
                        >
                          Reset absent
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          className="bg-emerald-600 hover:bg-emerald-700"
                          onClick={() => setEveryPlayer('present')}
                        >
                          <UserCheck className="me-2 h-4 w-4" />
                          Mark all present
                        </Button>
                      </div>
                    </div>

                    <div className="max-h-[540px] space-y-2 overflow-y-auto pe-1">
                      {filteredRoster.map((player) => {
                        const key = `${player.playerSource}:${player.id}`;
                        const value = attendance[key] || 'absent';
                        return (
                          <div
                            key={key}
                            className="flex flex-col gap-3 rounded-2xl border border-slate-200 p-3 sm:flex-row sm:items-center dark:border-slate-700"
                          >
                            <div className="flex min-w-0 flex-1 items-center gap-3">
                              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-100 to-violet-100 text-sm font-black text-blue-700 dark:from-blue-950 dark:to-violet-950 dark:text-blue-300">
                                {player.firstName.slice(0, 1)}
                                {player.lastName.slice(0, 1)}
                              </div>
                              <div className="min-w-0">
                                <p className="truncate font-semibold text-slate-900 dark:text-white">
                                  {player.firstName} {player.lastName}
                                </p>
                                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                                  <span>{player.position || 'Position not set'}</span>
                                  {player.isSelfRegistered && (
                                    <Badge variant="outline" className="h-5 text-[10px]">
                                      Self-registered
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            </div>
                            <Select
                              value={value}
                              onValueChange={(next: TrainingAttendanceStatus) =>
                                setAttendance((current) => ({
                                  ...current,
                                  [key]: next,
                                }))
                              }
                            >
                              <SelectTrigger
                                className={`w-full border font-semibold sm:w-36 ${statusClasses[value]}`}
                                aria-label={`Attendance for ${player.firstName} ${player.lastName}`}
                              >
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {attendanceOptions.map((option) => (
                                  <SelectItem key={option.value} value={option.value}>
                                    {option.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        );
                      })}
                    </div>

                    <div className="flex flex-col gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:items-center sm:justify-between dark:border-slate-800">
                      <p className="flex items-center gap-2 text-xs text-slate-500">
                        <Flame className="h-4 w-4 text-orange-500" />
                        Saving updates each player’s streak and achievement points.
                      </p>
                      <Button
                        className="min-w-40 bg-blue-600 hover:bg-blue-700"
                        onClick={handleSaveAttendance}
                        disabled={isSaving}
                      >
                        {isSaving ? (
                          <Loader2 className="me-2 h-4 w-4 animate-spin" />
                        ) : (
                          <CheckCircle2 className="me-2 h-4 w-4" />
                        )}
                        Save attendance
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </>
          )}
        </Card>
      </div>

      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-h-[92dvh] overflow-y-auto sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Create a training session</DialogTitle>
            <DialogDescription>
              Choose a saved venue or add a new one, then optionally schedule a
              repeating series.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="training-title">Session name</Label>
              <Input
                id="training-title"
                value={form.title}
                onChange={(event) =>
                  setForm((current) => ({ ...current, title: event.target.value }))
                }
                placeholder="First team training"
              />
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="training-date">Date</Label>
                <Input
                  id="training-date"
                  type="date"
                  value={form.date}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, date: event.target.value }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="training-time">Time</Label>
                <Input
                  id="training-time"
                  type="time"
                  value={form.time}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, time: event.target.value }))
                  }
                />
              </div>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-[1fr_140px]">
              <div className="space-y-2">
                <Label htmlFor="training-location-select">Location</Label>
                <Select
                  value={form.locationId || '__new_location__'}
                  onValueChange={(value) => {
                    if (value === '__new_location__') {
                      setForm((current) => ({
                        ...current,
                        locationId: '',
                        location: '',
                        saveLocation: true,
                      }));
                      return;
                    }
                    const location = locations.find((item) => item.id === value);
                    if (!location) return;
                    setForm((current) => ({
                      ...current,
                      locationId: location.id,
                      location: location.name,
                      saveLocation: false,
                    }));
                  }}
                >
                  <SelectTrigger id="training-location-select">
                    <SelectValue placeholder="Select a saved location" />
                  </SelectTrigger>
                  <SelectContent>
                    {locations.map((location) => (
                      <SelectItem key={location.id} value={location.id}>
                        {location.name}
                      </SelectItem>
                    ))}
                    <SelectItem value="__new_location__">
                      + Add a new location
                    </SelectItem>
                  </SelectContent>
                </Select>
                {!form.locationId && (
                  <div className="space-y-2 rounded-xl border border-blue-100 bg-blue-50/60 p-3 dark:border-blue-900/60 dark:bg-blue-950/20">
                    <Input
                      id="training-location"
                      value={form.location}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          location: event.target.value,
                        }))
                      }
                      placeholder="Main training ground"
                    />
                    <div className="flex flex-col gap-2">
                      <label
                        htmlFor="save-training-location"
                        className="flex cursor-pointer items-start gap-2 text-xs text-slate-600 dark:text-slate-300"
                      >
                        <Checkbox
                          id="save-training-location"
                          checked={form.saveLocation}
                          onCheckedChange={(checked) =>
                            setForm((current) => ({
                              ...current,
                              saveLocation: checked === true,
                            }))
                          }
                        />
                        <span>
                          Save automatically when this session is created.
                        </span>
                      </label>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-8 w-full border-blue-200 bg-white text-xs text-blue-700 hover:bg-blue-50 dark:bg-slate-900"
                        onClick={handleSaveLocation}
                        disabled={isSavingLocation}
                      >
                        {isSavingLocation ? (
                          <Loader2 className="me-1.5 h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <MapPin className="me-1.5 h-3.5 w-3.5" />
                        )}
                        Save location now
                      </Button>
                    </div>
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="training-duration">Minutes</Label>
                <Input
                  id="training-duration"
                  type="number"
                  min={15}
                  max={480}
                  value={form.durationMinutes}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      durationMinutes: event.target.value,
                    }))
                  }
                />
              </div>
            </div>
            <div className="rounded-2xl border border-violet-100 bg-violet-50/60 p-4 dark:border-violet-900/60 dark:bg-violet-950/20">
              <div className="mb-3 flex items-center gap-2">
                <CalendarRange className="h-4 w-4 text-violet-600" />
                <div>
                  <p className="text-sm font-bold text-slate-900 dark:text-white">
                    Repeat this training
                  </p>
                  <p className="text-xs text-slate-500">
                    Create each future occurrence now with the same details.
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="training-repeat">Repeats</Label>
                  <Select
                    value={form.repeatRule}
                    onValueChange={(value) =>
                      setForm((current) => {
                        const selectedWeekday = value.startsWith('weekday:')
                          ? Number(value.split(':')[1])
                          : null;
                        return {
                          ...current,
                          repeatRule: value,
                          date:
                            selectedWeekday == null
                              ? current.date
                              : moveDateToWeekday(current.date, selectedWeekday),
                        };
                      })
                    }
                  >
                    <SelectTrigger id="training-repeat">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Does not repeat</SelectItem>
                      <SelectItem value="daily">Daily</SelectItem>
                      <SelectItem value="weekly">Every week</SelectItem>
                      {weekdayOptions.map((weekday, index) => (
                        <SelectItem key={weekday} value={`weekday:${index}`}>
                          Weekly on {weekday}
                        </SelectItem>
                      ))}
                      <SelectItem value="weeks:2">Every 2 weeks</SelectItem>
                      <SelectItem value="weeks:4">Every 4 weeks</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {form.repeatRule !== 'none' && (
                  <div className="space-y-2">
                    <Label htmlFor="training-occurrences">Total sessions</Label>
                    <Input
                      id="training-occurrences"
                      type="number"
                      min={2}
                      max={52}
                      value={form.occurrenceCount}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          occurrenceCount: event.target.value,
                        }))
                      }
                    />
                  </div>
                )}
              </div>
              {recurrenceEndDate && (
                <p className="mt-3 flex items-center gap-2 text-xs font-medium text-violet-700 dark:text-violet-300">
                  <Repeat2 className="h-3.5 w-3.5" />
                  {form.occurrenceCount} sessions, ending{' '}
                  {formatSessionDate(recurrenceEndDate.toISOString())}.
                </p>
              )}
            </div>
            <div className="flex items-start gap-3 rounded-xl border border-blue-100 bg-blue-50/70 p-3 text-sm text-blue-900 dark:border-blue-900/60 dark:bg-blue-950/30 dark:text-blue-200">
              <Mail className="mt-0.5 h-4 w-4 shrink-0" />
              <div>
                <p className="font-semibold">Email reminders included</p>
                <p className="mt-0.5 text-xs text-blue-700 dark:text-blue-300">
                  Academy administrators and every player with an email address
                  receive a reminder before each scheduled session.
                </p>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="training-description">Focus or notes (optional)</Label>
              <Textarea
                id="training-description"
                value={form.description}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    description: event.target.value,
                  }))
                }
                placeholder="Passing patterns, conditioning, match preparation…"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleCreateSession}
              disabled={isCreating}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isCreating && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
              {form.repeatRule !== 'none'
                ? `Create ${form.occurrenceCount || ''} sessions`
                : 'Create session'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
