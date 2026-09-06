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
// session happened). Only moves pending -> acknowledged, never backwards.
export async function acknowledgeCoachingRecord(recordId) {
  const { error } = await supabaseClient
    .from('coaching_records')
    .update({ status: 'acknowledged', updated_at: new Date().toISOString() })
    .eq('id', recordId)
    .eq('status', 'pending');

  if (error) throw error;
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

// Which date a session should be counted under for the MTD/QTD/YTD period
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

      const buckets = categorizePlanners(roster, givenRecords);
      const sessionsWithFollowUp = await attachFollowUpInfo(givenRecords);

      return {
        stats: {
          needAction: incomingRecords.length,
          needCoaching: buckets.needCoaching.length,
          acknowledged: buckets.acknowledged.length,
          completed: buckets.completed.length,
          avgCompetency: buckets.avgCompetency,
          totalPlanners: buckets.totalPlanners,
          coachedAtLeastOnce: buckets.coachedAtLeastOnce,
          pctCoached: buckets.pctCoached,
        },
        buckets,
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

      const buckets = categorizePlanners(planners, scopedRecords);

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
        const myRecords = scopedRecords.filter((r) => myPlannerIds.has(r.planner_id));
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
          acknowledged: buckets.acknowledged.length,
          completed: buckets.completed.length,
          avgCompetency: buckets.avgCompetency,
          totalPlanners: buckets.totalPlanners,
          coachedAtLeastOnce: buckets.coachedAtLeastOnce,
          pctCoached: buckets.pctCoached,
        },
        buckets,
        managers,
        managerSummaries,
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
      const needAction = records.filter((r) => r.status === 'pending');
      const acknowledged = records.filter((r) => r.status === 'acknowledged');
      const completed = records.filter((r) => r.status === 'coaching_complete');

      const competencyValues = records
        .map((r) => r.competency_level)
        .filter((v) => typeof v === 'number' && !Number.isNaN(v));
      const avgCompetency = competencyValues.length
        ? competencyValues.reduce((a, b) => a + b, 0) / competencyValues.length
        : null;

      const usersById = await getUsersByIds(records.map((r) => r.coach_id));

      return {
        stats: {
          needAction: needAction.length,
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
