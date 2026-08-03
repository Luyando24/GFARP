import { Router, type Request, type Response } from 'express';
import { query, transaction } from '../lib/db.js';
import { authenticateToken } from '../middleware/auth.js';
import {
  buildRecurringSessionDates,
  calculateAttendanceGamification,
  type TrainingAttendanceStatus,
} from '../lib/training-attendance.js';
import { decryptField } from '../lib/field-encryption.js';

const router = Router();

const attendanceStatuses = new Set<TrainingAttendanceStatus>([
  'present',
  'absent',
  'late',
  'excused',
  'injured',
]);

type PlayerSource = 'academy' | 'individual';

const decryptPlayerValue = decryptField;

function normalizeRole(role: unknown): string {
  return String(role || '').trim().toLowerCase().replace(/-/g, '_');
}

function sendError(res: Response, status: number, message: string) {
  return res.status(status).json({ success: false, message });
}

async function canAccessAcademy(req: Request, academyId: string): Promise<boolean> {
  const user = (req as any).user || {};
  const role = normalizeRole(user.role);
  if (role === 'admin' || role === 'superadmin' || role === 'super_admin') return true;
  if (
    (role === 'academy' || role === 'academy_admin') &&
    String(user.id || '') === String(academyId)
  ) {
    return true;
  }

  const tokenAcademyId = user.academyId || user.academy_id || user.schoolId;
  if (tokenAcademyId && String(tokenAcademyId) === String(academyId)) return true;

  const staff = await query(
    `SELECT 1
       FROM staff_users
      WHERE id = $1
        AND academy_id = $2
        AND is_active = TRUE
      LIMIT 1`,
    [String(user.id || ''), academyId],
  );
  return staff.rows.length > 0;
}

async function requireAcademyAccess(
  req: Request,
  res: Response,
  academyId: string,
): Promise<boolean> {
  if (await canAccessAcademy(req, academyId)) return true;
  sendError(res, 403, 'You do not have access to this academy training data');
  return false;
}

async function resolveSession(req: Request, res: Response, sessionId: string) {
  const result = await query(
    `SELECT id, academy_id, title, session_date, location, status
       FROM training_sessions
      WHERE id = $1
        AND is_active = TRUE`,
    [sessionId],
  );
  if (!result.rows.length) {
    sendError(res, 404, 'Training session not found');
    return null;
  }

  const session = result.rows[0];
  if (!(await requireAcademyAccess(req, res, session.academy_id))) return null;
  return session;
}

async function resolveRecorderId(client: any, userId: string | undefined) {
  if (!userId) return null;
  const result = await client.query(
    `SELECT id FROM staff_users WHERE id = $1 AND is_active = TRUE LIMIT 1`,
    [userId],
  );
  return result.rows[0]?.id ?? null;
}

function normalizeLocationName(value: unknown): string {
  return String(value || '').trim().replace(/\s+/g, ' ');
}

function mapCreatedSession(row: any) {
  return {
    id: row.id,
    sessionNumber: row.session_number,
    title: row.title,
    description: row.description,
    sessionDate: row.session_date,
    durationMinutes: Number(row.duration_minutes || 90),
    locationId: row.location_id,
    location: row.location,
    intensity: row.intensity,
    status: row.status,
    seriesId: row.series_id,
    seriesSequence: row.series_sequence
      ? Number(row.series_sequence)
      : null,
    markedCount: 0,
    attendedCount: 0,
    absentCount: 0,
    attendanceRate: 0,
    createdAt: row.created_at,
  };
}

router.use(authenticateToken);

// GET /api/training-attendance/academies/:academyId/locations
router.get('/academies/:academyId/locations', async (req, res) => {
  try {
    const { academyId } = req.params;
    if (!(await requireAcademyAccess(req, res, academyId))) return;

    const result = await query(
      `SELECT id, name, created_at, updated_at
       FROM training_locations
       WHERE academy_id = $1
         AND is_active = TRUE
       ORDER BY LOWER(name), id`,
      [academyId],
    );

    res.json({
      success: true,
      data: {
        locations: result.rows.map((row) => ({
          id: row.id,
          name: row.name,
          createdAt: row.created_at,
          updatedAt: row.updated_at,
        })),
      },
    });
  } catch (error) {
    console.error('[TrainingAttendance] List locations failed:', error);
    sendError(res, 500, 'Unable to load saved training locations');
  }
});

// POST /api/training-attendance/academies/:academyId/locations
router.post('/academies/:academyId/locations', async (req, res) => {
  try {
    const { academyId } = req.params;
    if (!(await requireAcademyAccess(req, res, academyId))) return;

    const name = normalizeLocationName(req.body.name);
    if (name.length < 2 || name.length > 200) {
      return sendError(res, 400, 'Location name must be between 2 and 200 characters');
    }

    const createdBy = String((req as any).user?.id || '') || null;
    const result = await query(
      `INSERT INTO training_locations (
         academy_id,
         name,
         created_by
       )
       VALUES ($1, $2, $3)
       ON CONFLICT (academy_id, normalized_name)
       DO UPDATE SET
         name = EXCLUDED.name,
         is_active = TRUE,
         updated_at = NOW()
       RETURNING id, name, created_at, updated_at`,
      [academyId, name, createdBy],
    );

    const row = result.rows[0];
    res.status(201).json({
      success: true,
      message: 'Training location saved',
      data: {
        location: {
          id: row.id,
          name: row.name,
          createdAt: row.created_at,
          updatedAt: row.updated_at,
        },
      },
    });
  } catch (error) {
    console.error('[TrainingAttendance] Save location failed:', error);
    sendError(res, 500, 'Unable to save the training location');
  }
});

// GET /api/training-attendance/academies/:academyId/sessions
router.get('/academies/:academyId/sessions', async (req, res) => {
  try {
    const { academyId } = req.params;
    if (!(await requireAcademyAccess(req, res, academyId))) return;

    const result = await query(
      `SELECT
         s.id,
         s.session_number,
         s.title,
         s.description,
         s.session_date,
         s.duration_minutes,
         s.location_id,
         s.location,
         s.intensity,
         s.status,
         s.series_id,
         s.series_sequence,
         s.created_at,
         COUNT(a.id)::int AS marked_count,
         COUNT(a.id) FILTER (WHERE a.status IN ('present', 'late'))::int AS attended_count,
         COUNT(a.id) FILTER (WHERE a.status = 'absent')::int AS absent_count
       FROM training_sessions s
       LEFT JOIN training_attendance a ON a.session_id = s.id
       WHERE s.academy_id = $1
         AND s.is_active = TRUE
       GROUP BY s.id
       ORDER BY s.session_date DESC
       LIMIT 150`,
      [academyId],
    );

    const sessions = result.rows.map((row) => {
      const markedCount = Number(row.marked_count || 0);
      const attendedCount = Number(row.attended_count || 0);
      return {
        id: row.id,
        sessionNumber: row.session_number,
        title: row.title,
        description: row.description,
        sessionDate: row.session_date,
        durationMinutes: Number(row.duration_minutes || 90),
        locationId: row.location_id,
        location: row.location,
        intensity: row.intensity,
        status: row.status,
        seriesId: row.series_id,
        seriesSequence: row.series_sequence
          ? Number(row.series_sequence)
          : null,
        markedCount,
        attendedCount,
        absentCount: Number(row.absent_count || 0),
        attendanceRate:
          markedCount > 0 ? Math.round((attendedCount / markedCount) * 100) : 0,
        createdAt: row.created_at,
      };
    });

    const completedSessions = sessions.filter((session) => session.status === 'completed');
    const completedWithAttendance = completedSessions.filter(
      (session) => session.markedCount > 0,
    );
    const averageAttendance =
      completedWithAttendance.length > 0
        ? Math.round(
            completedWithAttendance.reduce(
              (total, session) => total + session.attendanceRate,
              0,
            ) / completedWithAttendance.length,
          )
        : 0;

    res.json({
      success: true,
      data: {
        sessions,
        summary: {
          total: sessions.length,
          upcoming: sessions.filter(
            (session) =>
              session.status === 'scheduled' &&
              new Date(session.sessionDate).getTime() >= Date.now(),
          ).length,
          completed: completedSessions.length,
          averageAttendance,
        },
      },
    });
  } catch (error) {
    console.error('[TrainingAttendance] List sessions failed:', error);
    sendError(res, 500, 'Unable to load training sessions');
  }
});

// POST /api/training-attendance/academies/:academyId/sessions
router.post('/academies/:academyId/sessions', async (req, res) => {
  try {
    const { academyId } = req.params;
    if (!(await requireAcademyAccess(req, res, academyId))) return;

    const title = String(req.body.title || 'Training Session').trim();
    const requestedLocation = normalizeLocationName(req.body.location);
    const requestedLocationId = String(req.body.locationId || '').trim() || null;
    const saveLocation = req.body.saveLocation === true;
    const description = String(req.body.description || '').trim();
    const sessionDate = new Date(req.body.sessionDate);
    const durationMinutes = Number(req.body.durationMinutes ?? 90);
    const recurrencePayload = req.body.recurrence;
    const recurrenceFrequency = recurrencePayload
      ? String(recurrencePayload.frequency || '')
      : null;
    const recurrenceInterval = recurrencePayload
      ? Number(recurrencePayload.interval)
      : 0;
    const recurrenceWeekday =
      recurrencePayload?.weekday == null
        ? null
        : Number(recurrencePayload.weekday);
    const occurrenceCount = recurrencePayload
      ? Number(recurrencePayload.occurrenceCount)
      : 1;
    const timezoneOffsetMinutes = Number(
      recurrencePayload?.timezoneOffsetMinutes ??
        req.body.timezoneOffsetMinutes ??
        0,
    );

    if (!title || title.length > 200) {
      return sendError(res, 400, 'Session title must be between 1 and 200 characters');
    }
    if (!requestedLocationId && !requestedLocation) {
      return sendError(res, 400, 'Training location is required');
    }
    if (
      !requestedLocationId &&
      (requestedLocation.length < 2 || requestedLocation.length > 200)
    ) {
      return sendError(res, 400, 'Location name must be between 2 and 200 characters');
    }
    if (Number.isNaN(sessionDate.getTime())) {
      return sendError(res, 400, 'A valid training date and time is required');
    }
    if (
      !Number.isInteger(durationMinutes) ||
      durationMinutes < 15 ||
      durationMinutes > 480
    ) {
      return sendError(res, 400, 'Duration must be between 15 and 480 minutes');
    }
    if (
      recurrencePayload &&
      (!['daily', 'weekly'].includes(recurrenceFrequency || '') ||
        !Number.isInteger(recurrenceInterval) ||
        recurrenceInterval < 1 ||
        recurrenceInterval > 12 ||
        (recurrenceWeekday != null &&
          (!Number.isInteger(recurrenceWeekday) ||
            recurrenceWeekday < 0 ||
            recurrenceWeekday > 6 ||
            recurrenceFrequency !== 'weekly')) ||
        !Number.isInteger(occurrenceCount) ||
        occurrenceCount < 2 ||
        occurrenceCount > 52)
    ) {
      return sendError(
        res,
        400,
        'Recurring sessions require a daily or weekly interval and 2–52 occurrences',
      );
    }
    if (
      !Number.isInteger(timezoneOffsetMinutes) ||
      timezoneOffsetMinutes < -840 ||
      timezoneOffsetMinutes > 840
    ) {
      return sendError(res, 400, 'A valid timezone offset is required');
    }

    const user = (req as any).user || {};
    const createdBy = String(user.id || '') || null;
    const created = await transaction(async (client) => {
      let location = requestedLocation;
      let locationId = requestedLocationId;

      if (locationId) {
        const locationResult = await client.query(
          `SELECT id, name
           FROM training_locations
           WHERE id = $1
             AND academy_id = $2
             AND is_active = TRUE
           LIMIT 1`,
          [locationId, academyId],
        );
        if (!locationResult.rows.length) {
          const error: any = new Error('Saved training location not found');
          error.status = 400;
          throw error;
        }
        location = locationResult.rows[0].name;
      } else if (saveLocation) {
        const savedLocation = await client.query(
          `INSERT INTO training_locations (
             academy_id,
             name,
             created_by
           )
           VALUES ($1, $2, $3)
           ON CONFLICT (academy_id, normalized_name)
           DO UPDATE SET
             name = EXCLUDED.name,
             is_active = TRUE,
             updated_at = NOW()
           RETURNING id, name`,
          [academyId, location, createdBy],
        );
        locationId = savedLocation.rows[0].id;
        location = savedLocation.rows[0].name;
      }

      const dates =
        recurrencePayload
          ? buildRecurringSessionDates(
              sessionDate,
              {
                frequency: recurrenceFrequency as 'daily' | 'weekly',
                interval: recurrenceInterval,
                weekday: recurrenceWeekday,
                timezoneOffsetMinutes,
              },
              occurrenceCount,
            )
          : [sessionDate];

      let seriesId: string | null = null;
      if (dates.length > 1) {
        const seriesResult = await client.query(
          `INSERT INTO training_session_series (
             academy_id,
             title,
             description,
             location_id,
             location,
             start_date,
             duration_minutes,
             interval_weeks,
             recurrence_frequency,
             recurrence_interval,
             recurrence_weekday,
             timezone_offset_minutes,
             occurrence_count,
             created_by
           )
           VALUES (
             $1, $2, NULLIF($3, ''), $4, $5, $6, $7, $8,
             $9, $10, $11, $12, $13, $14
           )
           RETURNING id`,
          [
            academyId,
            title,
            description,
            locationId,
            location,
            dates[0].toISOString(),
            durationMinutes,
            recurrenceFrequency === 'weekly' ? recurrenceInterval : null,
            recurrenceFrequency,
            recurrenceInterval,
            recurrenceWeekday,
            timezoneOffsetMinutes,
            occurrenceCount,
            createdBy,
          ],
        );
        seriesId = seriesResult.rows[0].id;
      }

      const sessionsResult = await client.query(
        `INSERT INTO training_sessions (
           academy_id,
           title,
           description,
           session_type,
           intensity,
           status,
           session_date,
           duration_minutes,
           location_id,
           location,
           series_id,
           series_sequence,
           timezone_offset_minutes,
           created_by
         )
         SELECT
           $1::uuid,
           $2::text,
           NULLIF($3::text, ''),
           'technical',
           'medium',
           'scheduled',
           occurrence.session_date::timestamptz,
           $4::integer,
           $5::uuid,
           $6::text,
           $7::uuid,
           occurrence.sequence::smallint,
           $8::smallint,
           $9::uuid
         FROM jsonb_to_recordset($10::jsonb) AS occurrence(
           session_date text,
           sequence integer
         )
         ORDER BY occurrence.sequence
         RETURNING
           id,
           session_number,
           title,
           description,
           session_date,
           duration_minutes,
           location_id,
           location,
           intensity,
           status,
           series_id,
           series_sequence,
           created_at`,
        [
          academyId,
          title,
          description,
          durationMinutes,
          locationId,
          location,
          seriesId,
          timezoneOffsetMinutes,
          createdBy,
          JSON.stringify(
            dates.map((date, index) => ({
              session_date: date.toISOString(),
              sequence: seriesId ? index + 1 : null,
            })),
          ),
        ],
      );

      return {
        sessions: sessionsResult.rows
          .map(mapCreatedSession)
          .sort(
            (left, right) =>
              new Date(left.sessionDate).getTime() -
              new Date(right.sessionDate).getTime(),
          ),
        seriesId,
        locationId,
      };
    });

    res.status(201).json({
      success: true,
      message:
        created.sessions.length > 1
          ? `${created.sessions.length} recurring training sessions created`
          : 'Training session created',
      data: {
        session: created.sessions[0],
        sessions: created.sessions,
        createdCount: created.sessions.length,
        seriesId: created.seriesId,
        locationId: created.locationId,
      },
    });
  } catch (error: any) {
    console.error('[TrainingAttendance] Create session failed:', error);
    sendError(
      res,
      Number(error?.status) || 500,
      error?.status ? error.message : 'Unable to create the training session',
    );
  }
});

// GET /api/training-attendance/sessions/:sessionId/roster
router.get('/sessions/:sessionId/roster', async (req, res) => {
  try {
    const session = await resolveSession(req, res, req.params.sessionId);
    if (!session) return;

    const result = await query(
      `SELECT roster.*, a.status, a.notes, a.marked_at
       FROM (
         SELECT
           p.id,
           'academy'::text AS player_source,
           p.first_name_cipher AS first_name_value,
           p.last_name_cipher AS last_name_value,
           p.email_cipher AS email_value,
           p.position,
           p.jersey_number,
           FALSE AS is_self_registered
         FROM players p
         WHERE p.academy_id = $1

         UNION ALL

         SELECT
           ip.id,
           'individual'::text AS player_source,
           ip.first_name::bytea AS first_name_value,
           ip.last_name::bytea AS last_name_value,
           ip.email::bytea AS email_value,
           pp.position,
           NULL::integer AS jersey_number,
           TRUE AS is_self_registered
         FROM individual_players ip
         LEFT JOIN player_profiles pp ON pp.player_id = ip.id
         WHERE ip.academy_id = $1
       ) roster
       LEFT JOIN training_attendance a
         ON a.session_id = $2
        AND a.player_id = roster.id
        AND a.player_source = roster.player_source
       ORDER BY
         LOWER(CONVERT_FROM(roster.first_name_value, 'UTF8')),
         LOWER(CONVERT_FROM(roster.last_name_value, 'UTF8')),
         roster.id`,
      [session.academy_id, session.id],
    );

    const players = result.rows.map((row) => ({
      id: row.id,
      playerSource: row.player_source as PlayerSource,
      firstName: decryptPlayerValue(row.first_name_value),
      lastName: decryptPlayerValue(row.last_name_value),
      email: decryptPlayerValue(row.email_value),
      position: row.position || '',
      jerseyNumber: row.jersey_number,
      isSelfRegistered: Boolean(row.is_self_registered),
      attendanceStatus: (row.status || 'absent') as TrainingAttendanceStatus,
      attendanceNotes: row.notes || '',
      markedAt: row.marked_at,
      isMarked: Boolean(row.marked_at),
    }));

    res.json({
      success: true,
      data: {
        session: {
          id: session.id,
          title: session.title,
          sessionDate: session.session_date,
          location: session.location,
          status: session.status,
        },
        players,
      },
    });
  } catch (error) {
    console.error('[TrainingAttendance] Load roster failed:', error);
    sendError(res, 500, 'Unable to load the session roster');
  }
});

// PUT /api/training-attendance/sessions/:sessionId/attendance
router.put('/sessions/:sessionId/attendance', async (req, res) => {
  try {
    const session = await resolveSession(req, res, req.params.sessionId);
    if (!session) return;

    const records = Array.isArray(req.body.records) ? req.body.records : null;
    if (!records || records.length === 0) {
      return sendError(res, 400, 'At least one attendance record is required');
    }

    const normalizedRecords = records.map((record: any) => ({
      playerId: String(record.playerId || '').trim(),
      playerSource: String(record.playerSource || '') as PlayerSource,
      status: String(record.status || '') as TrainingAttendanceStatus,
      notes: String(record.notes || '').trim().slice(0, 1000),
    }));

    const invalidRecord = normalizedRecords.find(
      (record) =>
        !record.playerId ||
        !['academy', 'individual'].includes(record.playerSource) ||
        !attendanceStatuses.has(record.status),
    );
    if (invalidRecord) {
      return sendError(res, 400, 'One or more attendance records are invalid');
    }

    const rosterResult = await query(
      `SELECT id, player_source
       FROM (
         SELECT id, 'academy'::text AS player_source
         FROM players
         WHERE academy_id = $1
         UNION ALL
         SELECT id, 'individual'::text AS player_source
         FROM individual_players
         WHERE academy_id = $1
       ) roster`,
      [session.academy_id],
    );
    const rosterKeys = new Set(
      rosterResult.rows.map((row) => `${row.player_source}:${row.id}`),
    );
    const hasForeignPlayer = normalizedRecords.some(
      (record) => !rosterKeys.has(`${record.playerSource}:${record.playerId}`),
    );
    if (hasForeignPlayer) {
      return sendError(res, 400, 'Attendance includes a player outside this academy');
    }

    const completeSession = req.body.completeSession !== false;
    const userId = String((req as any).user?.id || '') || undefined;

    const saved = await transaction(async (client) => {
      const recorderId = await resolveRecorderId(client, userId);
      await client.query(
        `INSERT INTO training_attendance (
           player_id,
           player_source,
           session_id,
           academy_id,
           status,
           notes,
           recorded_by,
           marked_at,
           updated_at
         )
         SELECT
           record.player_id::uuid,
           record.player_source,
           $2::uuid,
           $3::uuid,
           record.status,
           NULLIF(record.notes, ''),
           $4::uuid,
           NOW(),
           NOW()
         FROM jsonb_to_recordset($1::jsonb) AS record(
           player_id text,
           player_source text,
           status text,
           notes text
         )
         ON CONFLICT (session_id, player_id, player_source)
         DO UPDATE SET
           status = EXCLUDED.status,
           notes = EXCLUDED.notes,
           recorded_by = EXCLUDED.recorded_by,
           marked_at = NOW(),
           updated_at = NOW()`,
        [
          JSON.stringify(
            normalizedRecords.map((record) => ({
              player_id: record.playerId,
              player_source: record.playerSource,
              status: record.status,
              notes: record.notes,
            })),
          ),
          session.id,
          session.academy_id,
          recorderId,
        ],
      );

      if (completeSession) {
        await client.query(
          `UPDATE training_sessions
              SET status = 'completed', updated_at = NOW()
            WHERE id = $1`,
          [session.id],
        );
      }

      const counts = await client.query(
        `SELECT
           COUNT(*)::int AS marked_count,
           COUNT(*) FILTER (WHERE status IN ('present', 'late'))::int AS attended_count,
           COUNT(*) FILTER (WHERE status = 'absent')::int AS absent_count
         FROM training_attendance
         WHERE session_id = $1`,
        [session.id],
      );
      return counts.rows[0];
    });

    const markedCount = Number(saved.marked_count || 0);
    const attendedCount = Number(saved.attended_count || 0);
    res.json({
      success: true,
      message: completeSession
        ? 'Attendance saved and session completed'
        : 'Attendance saved',
      data: {
        markedCount,
        attendedCount,
        absentCount: Number(saved.absent_count || 0),
        attendanceRate:
          markedCount > 0 ? Math.round((attendedCount / markedCount) * 100) : 0,
        status: completeSession ? 'completed' : session.status,
      },
    });
  } catch (error) {
    console.error('[TrainingAttendance] Save attendance failed:', error);
    sendError(res, 500, 'Unable to save attendance');
  }
});

// GET /api/training-attendance/players/:playerId/summary
router.get('/players/:playerId/summary', async (req, res) => {
  try {
    const { playerId } = req.params;
    const playerResult = await query(
      `SELECT id, academy_id, player_source
       FROM (
         SELECT id, academy_id, 'academy'::text AS player_source
         FROM players
         WHERE id = $1
         UNION ALL
         SELECT id, academy_id, 'individual'::text AS player_source
         FROM individual_players
         WHERE id = $1
       ) matched_players
       LIMIT 1`,
      [playerId],
    );

    if (!playerResult.rows.length) return sendError(res, 404, 'Player not found');
    const player = playerResult.rows[0];
    const user = (req as any).user || {};
    const isSelf =
      normalizeRole(user.role) === 'individual_player' &&
      String(user.id) === String(playerId);

    if (
      !isSelf &&
      (!player.academy_id ||
        !(await canAccessAcademy(req, String(player.academy_id))))
    ) {
      return sendError(res, 403, 'You do not have access to this player attendance');
    }

    const historyResult = await query(
      `SELECT
         a.status,
         a.notes,
         a.marked_at,
         s.id AS session_id,
         s.title,
         s.session_date,
         s.location
       FROM training_attendance a
       JOIN training_sessions s ON s.id = a.session_id
       WHERE a.player_id = $1
         AND a.player_source = $2
         AND s.status = 'completed'
         AND s.is_active = TRUE
       ORDER BY s.session_date DESC
       LIMIT 100`,
      [playerId, player.player_source],
    );

    const gamification = calculateAttendanceGamification(
      historyResult.rows.map((row) => ({
        status: row.status as TrainingAttendanceStatus,
        sessionDate: row.session_date,
      })),
    );

    const pointsByStatus: Record<TrainingAttendanceStatus, number> = {
      present: 10,
      late: 7,
      absent: 0,
      excused: 0,
      injured: 0,
    };
    res.json({
      success: true,
      data: {
        summary: gamification,
        history: historyResult.rows.map((row) => ({
          sessionId: row.session_id,
          title: row.title,
          sessionDate: row.session_date,
          location: row.location,
          status: row.status,
          notes: row.notes,
          markedAt: row.marked_at,
          points: pointsByStatus[row.status as TrainingAttendanceStatus] || 0,
        })),
      },
    });
  } catch (error) {
    console.error('[TrainingAttendance] Load player summary failed:', error);
    sendError(res, 500, 'Unable to load player attendance');
  }
});

export default router;
