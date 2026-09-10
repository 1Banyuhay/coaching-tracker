import { supabaseClient } from '../config/supabase';
import { userService } from './userService';

// ---------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------

// Look up display info for a set of coaching_users ids in one query.
// Returns a Map<id, { id, full_name, role, branch }>.
async function getUsersByIds(ids) {
  const uniqueIds = [...new Set(ids)].filter((id) => id !== undefined && id !== null);
  if (uniqueIds.length === 0) return new Map();

  const { data, error } = await supabaseClient
    .from('coaching_users')
    .select('id, full_name, role, branch')
    .in('id', uniqueIds);

  if (error) {
    console.error('Error fetching users by id:', error);
    return new Map();
  }

  return new Map((data || []).map((u) => [u.id, u]));
}

// Attach human-readable planner/coach names onto coaching_records rows.
function attachNames(records, usersById) {
  return records.map((r) => ({
    ...r,
    planner_name: usersById.get(r.planner_id)?.full_name || 'Unknown Planner',
    coach_name: usersById.get(r.coach_id)?.full_name || 'Unknown Coach',
  }));
}

// Marks each record with has_follow_up: true when some other record's
// follow_up_of_id points back at it - i.e. the follow-up session already
// happened. Used to decide whether to show a "Log Follow-Up" action and
// whether a due/overdue badge still applies.
async function attachFollowUpInfo(records) {
  const ids = records.map((r) => r.id).filter((id) => id !== undefined && id !== null);
  if (ids.length === 0) return records;

  const { data, error } = await supabaseClient
    .from('coaching_records')
    .select('follow_up_of_id')
    .in('follow_up_of_id', ids);

  if (error) {
    console.error('Error fetching follow-up info:', error);
    return records.map((r) => ({ ...r, has_follow_up: false }));
  }

  const followedUpIds = new Set((data || []).map((r) => r.follow_up_of_id));
  return records.map((r) => ({ ...r, has_follow_up: followedUpIds.has(r.id) }));
}

// Group a scope of planners and their coaching_records into progress buckets.
//
// Rules (deliberately simple and documented so they're easy to adjust later):
//   needCoaching  - the planner has 0 or 1 coaching_records total
//   completed     - 2+ records AND at least one has status 'coaching_complete'
//   acknowledged  - 2+ records, not completed (coaching is actively happening)
//
// Every planner passed in appears in exactly one bucket, including planners
// with zero records - "need coaching" is meant to surface exactly that gap.
export function categorizePlanners(planners, records) {
  const byPlanner = new Map();
  planners.forEach((p) => byPlanner.set(p.id, { planner: p, records: [] }));

  records.forEach((r) => {
    if (byPlanner.has(r.planner_id)) {
      byPlanner.get(r.planner_id).records.push(r);
    }
  });

  const needCoaching = [];
  const acknowledged = [];
  const completed = [];
  let coachedAtLeastOnce = 0;

  byPlanner.forEach((entry) => {
    const rs = entry.records;
    if (rs.length >= 1) coachedAtLeastOnce += 1;

    if (rs.length <= 1) {
      needCoaching.push(entry);
    } else if (rs.some((r) => r.status === 'coaching_complete')) {
      completed.push(entry);
    } else {
      acknowledged.push(entry);
    }
  });

  const competencyValues = records
    .map((r) => r.competency_level)
    .filter((v) => typeof v === 'number' && !Number.isNaN(v));
  const avgCompetency = competencyValues.length
    ? competencyValues.reduce((a, b) => a + b, 0) / competencyValues.length
    : null;

  return {
    needCoaching,
    acknowledged,
    completed,
    avgCompetency,
    totalPlanners: planners.length,
    coachedAtLeastOnce,
    pctCoached: planners.length ? Math.round((coachedAtLeastOnce / planners.length) * 100) : null,
  };
}

// Mark one coaching record acknowledged (the recipient confirming the
// session happened). Only moves pending -> acknowledged, never backwards -
// except one case: a session rated Proficient with no follow-up date has
// nothing left to check up on (that's the "close coaching cycle" choice
// in the coaching log form), so acknowledging it carries it straight
// through to 'coaching_complete' in the same action instead of leaving it
// stuck at 'acknowledged' forever with no way to ever become 'completed'.
// Returns { closedCycle } so callers can tailor their success message.
export async function acknowledgeCoachingRecord(recordId) {
  const { data: record, error: fetchError } = await supabaseClient
    .from('coaching_records')
    .select('competency_level, follow_up_date, status, created_at')
    .eq('id', recordId)
    .single();

  if (fetchError) throw fetchError;

  // Hard 24-hour deadline, permanent - see isAcknowledgeExpired above. The
  // UI already hides/disables the Acknowledge action once expired; this is
  // the server-side guard for a stale screen still showing the button.
  if (isAcknowledgeExpired(record)) {
    throw new Error("This session's 24-hour acknowledge window has passed - it can no longer be acknowledged.");
  }

  const closedCycle = record.competency_level === 4 && !record.follow_up_date;
  const nextStatus = closedCycle ? 'coaching_complete' : 'acknowledged';

  const { error } = await supabaseClient
    .from('coaching_records')
    .update({ status: nextStatus, updated_at: new Date().toISOString() })
    .eq('id', recordId)
    .eq('status', 'pending');

  if (error) throw error;

  return { closedCycle };
}

// Logs a brand-new coaching_records row as the follow-up to an earlier one,
// then marks the original 'coaching_complete' - this is the "opened the
// follow-up and it counted" path. Whether it happened on or before the
// original follow_up_date is purely a UI badge (see followUpStatus below);
// logging late still completes the cycle, it just won't have been on time.
export async function logFollowUp(originalRecord, newRecordFields) {
  const { error: insertError } = await supabaseClient.from('coaching_records').insert({
    ...newRecordFields,
    follow_up_of_id: originalRecord.id,
    status: 'pending',
  });
  if (insertError) throw insertError;

  const { error: updateError } = await supabaseClient
    .from('coaching_records')
    .update({ status: 'coaching_complete', updated_at: new Date().toISOString() })
    .eq('id', originalRecord.id);
  if (updateError) throw updateError;
}

// Due-date badge state for a record's follow_up_date. Returns null when
// there's nothing to flag (no date, already completed, or already
// followed up). Four states, based on days until the follow-up date:
//   > 7 days out   - null (nothing to show yet)
//   4-7 days out   - 'upcoming'  - a heads-up only, not actionable yet
//   0-3 days out   - 'ready'     - the only window a follow-up can be
//                                  logged in (see canLogFollowUp below)
//   past the date  - 'missed'    - the window has closed; this record
//                                  stays incomplete for good - logging a
//                                  follow-up no longer counts against it
export function followUpStatus(record) {
  if (!record.follow_up_date || record.status === 'coaching_complete' || record.has_follow_up) {
    return null;
  }
  const due = new Date(record.follow_up_date);
  const now = new Date();
  const diffDays = Math.ceil((due.setHours(0, 0, 0, 0) - now.setHours(0, 0, 0, 0)) / 86400000);

  if (diffDays < 0) return { level: 'missed', label: `Missed - ${Math.abs(diffDays)}d ago` };
  if (diffDays <= 3) return { level: 'ready', label: diffDays === 0 ? 'Ready - due today' : `Ready in ${diffDays}d` };
  if (diffDays <= 7) return { level: 'upcoming', label: `Due in ${diffDays}d` };
  return null;
}

// A follow-up can only be logged inside its 3-day-before-through-due-date
// window - not earlier (too soon to matter yet) and never after the due
// date has passed (per the "past due = won't be completed" rule).
export function canLogFollowUp(record) {
  if (!record.follow_up_date || record.has_follow_up || record.status === 'coaching_complete') {
    return false;
  }
  return followUpStatus(record)?.level === 'ready';
}

// Tallies how many sessions in a list are 'upcoming' / 'ready' / 'missed'
// right now - powers the "N follow-ups due" banner on the Manager and
// Senior Manager dashboards.
export function followUpCounts(sessions) {
  const counts = { upcoming: 0, ready: 0, missed: 0 };
  (sessions || []).forEach((s) => {
    const status = followUpStatus(s);
    if (status && counts[status.level] !== undefined) counts[status.level] += 1;
  });
  return counts;
}

// coaching_records.created_at/updated_at are Postgres "timestamp without
// time zone" columns - PostgREST serializes them with no offset (e.g.
// "2026-09-09T09:58:28.945"), even though every write in this app stores
// them as UTC (new Date().toISOString()). JavaScript's Date parser treats
// an offset-less date-TIME string as LOCAL time, not UTC, so plain
// new Date(record.created_at) silently shifts by the viewer's UTC offset -
// wrong by a fixed 8 hours for every user here (Asia/Manila, UTC+8), which
// is fatal to a 24-hour deadline. Parse explicitly as UTC instead. (A
// date-ONLY string like follow_up_date, e.g. "2026-09-17", doesn't have
// this problem - the spec already parses that form as UTC.)
function parseUtcTimestamp(value) {
  if (!value) return null;
  const hasOffset = /Z$|[+-]\d{2}:?\d{2}$/.test(value);
  return new Date(hasOffset ? value : `${value}Z`);
}

// A pending coaching log has exactly this many hours to be acknowledged
// before it permanently stops counting as a coaching session - see
// countsTowardStats below. Reinforces that coaching isn't "done" until
// the recipient has actually engaged with it, not just when it was typed
// in. No database column for this - it's computed from created_at, the
// same way coaching_complete already reuses updated_at instead of its own
// date field.
export const ACKNOWLEDGE_WINDOW_HOURS = 24;

// Whether a still-pending record has run out its acknowledge window. Once
// true this is permanent by design - acknowledgeCoachingRecord() below
// refuses to update a record in this state, and there is no override.
export function isAcknowledgeExpired(record) {
  if (record.status !== 'pending') return false;
  const hoursSinceLogged = (Date.now() - parseUtcTimestamp(record.created_at).getTime()) / 3600000;
  return hoursSinceLogged >= ACKNOWLEDGE_WINDOW_HOURS;
}

// Countdown/expired badge state for a pending record's acknowledge window -
// same null-until-it-matters shape as followUpStatus() above, so the UI
// pattern matches. Returns null for anything not pending (nothing left to
// count down) or still comfortably within its window.
//   > 4h left - null      - plenty of time, nothing shown yet
//   0-4h left - 'urgent'  - about to expire
//   past due  - 'expired' - permanently excluded from stats now
export function acknowledgeWindowStatus(record) {
  if (record.status !== 'pending') return null;
  const hoursSinceLogged = (Date.now() - parseUtcTimestamp(record.created_at).getTime()) / 3600000;
  const hoursLeft = ACKNOWLEDGE_WINDOW_HOURS - hoursSinceLogged;

  if (hoursLeft <= 0) return { level: 'expired', label: 'Expired - not acknowledged in time' };
  if (hoursLeft <= 4) return { level: 'urgent', label: `${Math.max(1, Math.ceil(hoursLeft))}h left to acknowledge` };
  return null;
}

// Whether a record should count toward coaching stats at all - Coaching
// Sessions, Acknowledged, the Need Coaching/Completed buckets, competency
// averages, planner summaries, all of it. A record that expired without
// acknowledgment never counts as coaching having happened - unacknowledged
// coaching isn't coaching, per the 24-hour acknowledge window policy. Every
// other record (acknowledged, completed, or still within its window)
// counts exactly as it always has. The record itself is never deleted or
// hidden - it stays visible (flagged Expired) in session lists/history for
// trend visibility, just excluded from the counted totals.
export function countsTowardStats(record) {
  return !isAcknowledgeExpired(record);
}

// Which date a session should be counted under for the Current/Previous/QTD/YTD period
// filter. A session that's still open counts under when it was logged
// (created_at). One that's been completed counts under when it was
// actually completed (updated_at, set the moment its follow-up was
// logged) instead - a follow-up can land in a later month, quarter, or
// even year than the original session, and it's the completion that
// should show up in that later period, not the original one.
export function sessionEffectiveDate(session) {
  return session.status === 'coaching_complete' && session.updated_at
    ? session.updated_at
    : session.created_at;
}

// The four periods offered by the consolidated dashboard period selector.
export const PERIOD_OPTIONS = ['Current', 'Previous', 'QTD', 'YTD'];

// Filters a list of coaching_records-shaped rows down to one reporting
// period, using sessionEffectiveDate() to decide which period a record
// falls under (see that function's comment - an open session counts under
// when it was logged, a completed one under when it was completed).
//   Current  - this calendar month so far
//   Previous - the full previous calendar month
//   QTD      - this calendar quarter so far
//   YTD      - this calendar year so far
// Any other value (or none) returns every record, unfiltered.
export function filterRecordsByPeriod(records, period) {
  if (!records) return [];

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();
  const currentQuarter = Math.floor(currentMonth / 3);

  let prevMonth = currentMonth - 1;
  let prevMonthYear = currentYear;
  if (prevMonth < 0) {
    prevMonth = 11;
    prevMonthYear = currentYear - 1;
  }

  return records.filter((record) => {
    const effectiveDate = parseUtcTimestamp(sessionEffectiveDate(record));
    const year = effectiveDate.getFullYear();
    const month = effectiveDate.getMonth();
    const quarter = Math.floor(month / 3);

    switch (period) {
      case 'Current':
        return year === currentYear && month === currentMonth;
      case 'Previous':
        return year === prevMonthYear && month === prevMonth;
      case 'QTD':
        return year === currentYear && quarter === currentQuarter;
      case 'YTD':
        return year === currentYear;
      default:
        return true;
    }
  });
}

// All-time, period-independent per-planner rollup used by the Planner
// Summary tab (Manager dashboard) and the List of Planners tab (Senior
// Manager dashboard) - one row per planner regardless of whatever period
// the rest of the dashboard is currently showing.
//
// `usersById` is optional: when passed (a Map<id, user>, as returned by
// getUsersByIds), each row also gets managerId/managerName resolved from
// the planner's reports_to_id - used only by the Senior Manager dashboard,
// where a row can belong to any of several managers.
export function summarizeByPlanner(planners, records, usersById) {
  return planners.map((p) => {
    const myRecords = records.filter((r) => r.planner_id === p.id);
    const competencyValues = myRecords
      .map((r) => r.competency_level)
      .filter((v) => typeof v === 'number' && !Number.isNaN(v));
    const avgCompetency = competencyValues.length
      ? competencyValues.reduce((a, b) => a + b, 0) / competencyValues.length
      : null;
    const mostRecentDate = myRecords.length
      ? myRecords.reduce((latest, r) => (r.created_at > latest ? r.created_at : latest), myRecords[0].created_at)
      : null;

    return {
      id: p.id,
      name: p.full_name,
      branch: p.branch || '—',
      managerId: p.reports_to_id,
      managerName: usersById ? usersById.get(p.reports_to_id)?.full_name || '—' : undefined,
      totalSessions: myRecords.length,
      acknowledged: myRecords.filter((r) => r.status !== 'pending').length,
      completed: myRecords.filter((r) => r.status === 'coaching_complete').length,
      avgCompetency,
      mostRecentDate,
    };
  });
}

// ---------------------------------------------------------------------

export const dashboardService = {
  async getManagerDashboard(userId) {
    try {
      // "Team" is the real roster - planners whose reports_to_id points at
      // this manager - not just whoever they happen to have coached. That
      // is what makes "Need Coaching" (0 sessions) and the coached-% stat
      // meaningful instead of self-fulfilling.
      // Only active planners count as "your team" here - a deactivated
      // planner drops out of the roster (and its stats) until reactivated,
      // though their past coaching history stays intact in the database.
      const { data: rosterRaw } = await supabaseClient
        .from('coaching_users')
        .select('id, full_name, role, branch')
        .eq('role', 'planner')
        .eq('status', 'active')
        .eq('reports_to_id', userId);

      const roster = rosterRaw || [];
      const rosterIds = roster.map((p) => p.id);

      const { data: givenRecordsRaw } = rosterIds.length
        ? await supabaseClient.from('coaching_records').select('*').eq('coach_id', userId).in('planner_id', rosterIds)
        : { data: [] };

      const givenRecords = givenRecordsRaw || [];

      const { data: incomingRaw } = await supabaseClient
        .from('coaching_records')
        .select('*')
        .eq('planner_id', userId)
        .eq('status', 'pending');

      const incomingRecords = incomingRaw || [];

      const usersById = await getUsersByIds([
        ...rosterIds,
        ...incomingRecords.map((r) => r.coach_id),
      ]);

      // Records that expired unacknowledged never count as coaching having
      // happened (see countsTowardStats) - excluded from every stat/bucket
      // below, but givenRecords/incomingRecords themselves stay
      // unfiltered further down so expired ones still show up (flagged) in
      // the sessions table and Need Action list for visibility.
      const countedGivenRecords = givenRecords.filter(countsTowardStats);
      const buckets = categorizePlanners(roster, countedGivenRecords);
      const sessionsWithFollowUp = await attachFollowUpInfo(givenRecords);

      return {
        stats: {
          // Excludes expired-unacknowledged items - Need Action should only
          // ever show what's still actually actionable right now.
          needAction: incomingRecords.filter(countsTowardStats).length,
          needCoaching: buckets.needCoaching.length,
          // Session-level counts (separate from the planner-level buckets
          // above) - the goal is for these two to read as the same number
          // once nothing a planner has been given is still sitting pending
          // (or has expired unacknowledged).
          totalSessions: countedGivenRecords.length,
          acknowledged: countedGivenRecords.filter((r) => r.status !== 'pending').length,
          completed: buckets.completed.length,
          avgCompetency: buckets.avgCompetency,
          totalPlanners: buckets.totalPlanners,
          coachedAtLeastOnce: buckets.coachedAtLeastOnce,
          pctCoached: buckets.pctCoached,
        },
        buckets,
        // Roster (all-time, unfiltered) - kept alongside the all-time
        // buckets/stats above so the dashboard can recompute period-scoped
        // buckets client-side for the Current/Previous/QTD/YTD selector,
        // without a second round-trip to the database.
        roster,
        // All-time per-planner rollup for the Planner Summary tab, which
        // always shows full history regardless of the period selector.
        // Built from counted records only, same rule as everything else.
        plannerSummaries: summarizeByPlanner(roster, countedGivenRecords),
        // Unfiltered - includes expired-unacknowledged records so they
        // still show up (with an Expired badge) in the sessions table.
        sessions: attachNames(sessionsWithFollowUp, usersById),
        needActionSessions: attachNames(incomingRecords, usersById),
      };
    } catch (error) {
      console.error('Error fetching manager dashboard:', error);
      return {
        stats: {},
        buckets: { needCoaching: [], acknowledged: [], completed: [] },
        sessions: [],
        needActionSessions: [],
      };
    }
  },

  async getSeniorManagerDashboard(userId) {
    try {
      // Scoped to this Senior Manager's own branch: their managers, and
      // those managers' planners - not every planner in the organization.
      const managers = await userService.getManagersForSeniorManager(userId);
      const managerIds = managers.map((m) => m.id);

      // Only active planners count toward the branch roster/stats - see
      // the same note in getManagerDashboard above.
      const { data: plannersRaw } = managerIds.length
        ? await supabaseClient
            .from('coaching_users')
            .select('id, full_name, role, branch, reports_to_id')
            .eq('role', 'planner')
            .eq('status', 'active')
            .in('reports_to_id', managerIds)
        : { data: [] };

      const planners = plannersRaw || [];
      const plannerIds = planners.map((p) => p.id);

      // Every coaching session logged with a planner in this branch,
      // regardless of who coached them - a Manager coaching their own
      // roster, or this Senior Manager stepping in directly. This is what
      // lets "Coaching Sessions with Planners" show a Manager column.
      const { data: scopedRecordsRaw } = plannerIds.length
        ? await supabaseClient.from('coaching_records').select('*').in('planner_id', plannerIds)
        : { data: [] };

      const scopedRecords = scopedRecordsRaw || [];

      // Sessions where this Senior Manager coached a Manager directly -
      // the only source for "Coaching Sessions with Managers", since
      // nobody else ever coaches a Manager.
      const { data: ownManagerRecordsRaw } = managerIds.length
        ? await supabaseClient
            .from('coaching_records')
            .select('*')
            .eq('coach_id', userId)
            .in('planner_id', managerIds)
        : { data: [] };

      const ownManagerRecords = ownManagerRecordsRaw || [];

      const usersById = await getUsersByIds([
        userId,
        ...managerIds,
        ...plannerIds,
        ...scopedRecords.map((r) => r.coach_id),
      ]);

      // See the same note in getManagerDashboard above - expired-
      // unacknowledged records never count as coaching having happened.
      const countedScopedRecords = scopedRecords.filter(countsTowardStats);
      const buckets = categorizePlanners(planners, countedScopedRecords);

      const plannerSessionsWithFollowUp = await attachFollowUpInfo(scopedRecords);
      const plannerSessions = attachNames(plannerSessionsWithFollowUp, usersById);

      const managerSessionsWithFollowUp = await attachFollowUpInfo(ownManagerRecords);
      const managerSessions = attachNames(managerSessionsWithFollowUp, usersById);

      // Per-manager rollup for the "By Manager" tab - each manager in this
      // branch with their own roster size, coached-%, session count and
      // average competency, so a Senior Manager can see at a glance which
      // of their managers is actually coaching, not just the branch total.
      const managerSummaries = managers.map((m) => {
        const myPlanners = planners.filter((p) => p.reports_to_id === m.id);
        const myPlannerIds = new Set(myPlanners.map((p) => p.id));
        const myRecords = countedScopedRecords.filter((r) => myPlannerIds.has(r.planner_id));
        const competencyValues = myRecords
          .map((r) => r.competency_level)
          .filter((v) => typeof v === 'number' && !Number.isNaN(v));
        const avgCompetency = competencyValues.length
          ? competencyValues.reduce((a, b) => a + b, 0) / competencyValues.length
          : null;
        const coachedAtLeastOnce = myPlanners.filter((p) => myRecords.some((r) => r.planner_id === p.id)).length;

        return {
          id: m.id,
          name: m.full_name,
          branch: m.branch,
          status: m.status,
          totalPlanners: myPlanners.length,
          coachedAtLeastOnce,
          pctCoached: myPlanners.length ? Math.round((coachedAtLeastOnce / myPlanners.length) * 100) : null,
          totalSessions: myRecords.length,
          avgCompetency,
        };
      });

      return {
        stats: {
          needCoaching: buckets.needCoaching.length,
          // Session-level counts (separate from the planner-level buckets
          // above) - the goal is for these two to read as the same number
          // once nothing logged in the branch is still sitting pending (or
          // has expired unacknowledged).
          totalSessions: countedScopedRecords.length,
          acknowledged: countedScopedRecords.filter((r) => r.status !== 'pending').length,
          completed: buckets.completed.length,
          avgCompetency: buckets.avgCompetency,
          totalPlanners: buckets.totalPlanners,
          coachedAtLeastOnce: buckets.coachedAtLeastOnce,
          pctCoached: buckets.pctCoached,
        },
        buckets,
        managers,
        managerSummaries,
        // Branch roster (all-time, unfiltered) - see the same note in
        // getManagerDashboard above.
        roster: planners,
        // All-time per-planner rollup for the List of Planners tab, which
        // always shows full history regardless of the period selector.
        // Built from counted records only, same rule as everything else.
        // usersById resolves each planner's manager name for the Manager
        // column.
        plannerSummaries: summarizeByPlanner(planners, countedScopedRecords, usersById),
        sessions: plannerSessions,
        managerSessions,
      };
    } catch (error) {
      console.error('Error fetching senior manager dashboard:', error);
      return {
        stats: {},
        buckets: { needCoaching: [], acknowledged: [], completed: [] },
        managers: [],
        managerSummaries: [],
        sessions: [],
        managerSessions: [],
      };
    }
  },

  async getPlannerDashboard(userId) {
    try {
      const { data: recordsRaw } = await supabaseClient
        .from('coaching_records')
        .select('*')
        .eq('planner_id', userId);

      const records = await attachFollowUpInfo(recordsRaw || []);
      // Unfiltered - kept for needActionSessions/records below so an
      // expired-unacknowledged session still shows up (flagged) rather
      // than disappearing. countedRecords is the same list minus those,
      // used for every stat/average - see countsTowardStats above.
      const needAction = records.filter((r) => r.status === 'pending');
      const countedRecords = records.filter(countsTowardStats);
      // "Acknowledged" here means "acted on" - anything no longer sitting
      // pending, whether or not it has since gone on to a full completed
      // cycle. This is what lets Coaching Sessions and Acknowledged read
      // as the same number once nothing is left pending or expired.
      const acknowledged = records.filter((r) => r.status !== 'pending');
      const completed = records.filter((r) => r.status === 'coaching_complete');

      const competencyValues = countedRecords
        .map((r) => r.competency_level)
        .filter((v) => typeof v === 'number' && !Number.isNaN(v));
      const avgCompetency = competencyValues.length
        ? competencyValues.reduce((a, b) => a + b, 0) / competencyValues.length
        : null;

      const usersById = await getUsersByIds(records.map((r) => r.coach_id));

      return {
        stats: {
          // Excludes expired-unacknowledged items - Need Action should only
          // ever show what's still actually actionable right now.
          needAction: needAction.filter(countsTowardStats).length,
          totalSessions: countedRecords.length,
          acknowledged: acknowledged.length,
          completed: completed.length,
          avgCompetency,
        },
        needActionSessions: attachNames(needAction, usersById),
        acknowledgedSessions: attachNames(acknowledged, usersById),
        completedSessions: attachNames(completed, usersById),
        records: attachNames(records, usersById),
      };
    } catch (error) {
      console.error('Error fetching planner dashboard:', error);
      return {
        stats: {},
        needActionSessions: [],
        acknowledgedSessions: [],
        completedSessions: [],
        records: [],
      };
    }
  },
};
