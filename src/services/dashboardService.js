import { supabaseClient } from '../config/supabase';

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

  byPlanner.forEach((entry) => {
    const rs = entry.records;
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

// ---------------------------------------------------------------------

export const dashboardService = {
  async getManagerDashboard(userId) {
    try {
      const { data: givenRecordsRaw } = await supabaseClient
        .from('coaching_records')
        .select('*')
        .eq('coach_id', userId);

      const givenRecords = givenRecordsRaw || [];
      const teamPlannerIds = [...new Set(givenRecords.map((r) => r.planner_id))];

      const { data: incomingRaw } = await supabaseClient
        .from('coaching_records')
        .select('*')
        .eq('planner_id', userId)
        .eq('status', 'pending');

      const incomingRecords = incomingRaw || [];

      const usersById = await getUsersByIds([
        ...teamPlannerIds,
        ...incomingRecords.map((r) => r.coach_id),
      ]);

      const teamPlanners = teamPlannerIds.map((id) => usersById.get(id)).filter(Boolean);
      const buckets = categorizePlanners(teamPlanners, givenRecords);

      return {
        stats: {
          needAction: incomingRecords.length,
          needCoaching: buckets.needCoaching.length,
          acknowledged: buckets.acknowledged.length,
          completed: buckets.completed.length,
          avgCompetency: buckets.avgCompetency,
          totalPlanners: buckets.totalPlanners,
        },
        buckets,
        sessions: attachNames(givenRecords, usersById),
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
      const { data: allPlannersRaw } = await supabaseClient
        .from('coaching_users')
        .select('id, full_name, role, branch')
        .eq('role', 'planner');

      const planners = allPlannersRaw || [];
      const plannerIds = planners.map((p) => p.id);

      const { data: orgRecordsRaw } = plannerIds.length
        ? await supabaseClient.from('coaching_records').select('*').in('planner_id', plannerIds)
        : { data: [] };

      const orgRecords = orgRecordsRaw || [];

      const { data: ownRecordsRaw } = await supabaseClient
        .from('coaching_records')
        .select('*')
        .eq('coach_id', userId);

      const ownRecords = ownRecordsRaw || [];

      const usersById = await getUsersByIds([
        ...planners.map((p) => p.id),
        ...ownRecords.map((r) => r.coach_id),
      ]);

      const buckets = categorizePlanners(planners, orgRecords);

      return {
        stats: {
          needCoaching: buckets.needCoaching.length,
          acknowledged: buckets.acknowledged.length,
          completed: buckets.completed.length,
          avgCompetency: buckets.avgCompetency,
          totalPlanners: buckets.totalPlanners,
        },
        buckets,
        sessions: attachNames(ownRecords, usersById),
      };
    } catch (error) {
      console.error('Error fetching senior manager dashboard:', error);
      return {
        stats: {},
        buckets: { needCoaching: [], acknowledged: [], completed: [] },
        sessions: [],
      };
    }
  },

  async getPlannerDashboard(userId) {
    try {
      const { data: recordsRaw } = await supabaseClient
        .from('coaching_records')
        .select('*')
        .eq('planner_id', userId);

      const records = recordsRaw || [];
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
