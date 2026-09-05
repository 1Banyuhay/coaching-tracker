import { supabaseClient } from '../config/supabase';

const avg = (values) => (values.length ? values.reduce((a, b) => a + b, 0) / values.length : null);

// Org-wide rollup for the Admin dashboard: every Senior Manager's branch
// totals, and every Manager's own numbers underneath them - the "summary
// of each senior manager, each manager, and some details of it" view.
// Admin sits above every branch, so unlike the Senior Manager/Manager
// dashboards this one is intentionally NOT scoped to any single branch.
export async function getAdminOrgSummary() {
  try {
    const [{ data: usersRaw }, { data: recordsRaw }] = await Promise.all([
      supabaseClient.from('coaching_users').select('id, full_name, role, branch, status, reports_to_id'),
      supabaseClient.from('coaching_records').select('planner_id, coach_id, status, competency_level'),
    ]);

    const users = usersRaw || [];
    const records = recordsRaw || [];

    const seniorManagers = users.filter((u) => u.role === 'senior_manager');
    const managers = users.filter((u) => u.role === 'manager');
    const planners = users.filter((u) => u.role === 'planner');

    const managerSummaries = managers.map((m) => {
      const myPlanners = planners.filter((p) => p.reports_to_id === m.id);
      const myPlannerIds = new Set(myPlanners.map((p) => p.id));
      const myRecords = records.filter((r) => myPlannerIds.has(r.planner_id));
      const coachedAtLeastOnce = myPlanners.filter((p) => myRecords.some((r) => r.planner_id === p.id)).length;
      const competencyValues = myRecords.map((r) => r.competency_level).filter((v) => typeof v === 'number' && !Number.isNaN(v));

      return {
        id: m.id,
        name: m.full_name,
        branch: m.branch,
        status: m.status,
        seniorManagerId: m.reports_to_id,
        seniorManagerName: users.find((u) => u.id === m.reports_to_id)?.full_name || 'Unassigned',
        totalPlanners: myPlanners.length,
        coachedAtLeastOnce,
        pctCoached: myPlanners.length ? Math.round((coachedAtLeastOnce / myPlanners.length) * 100) : null,
        totalSessions: myRecords.length,
        avgCompetency: avg(competencyValues),
      };
    });

    const seniorManagerSummaries = seniorManagers.map((sm) => {
      const myManagers = managerSummaries.filter((m) => m.seniorManagerId === sm.id);
      const totalPlanners = myManagers.reduce((sum, m) => sum + m.totalPlanners, 0);
      const coachedAtLeastOnce = myManagers.reduce((sum, m) => sum + m.coachedAtLeastOnce, 0);
      const totalSessions = myManagers.reduce((sum, m) => sum + m.totalSessions, 0);
      const competencyValues = myManagers.map((m) => m.avgCompetency).filter((v) => typeof v === 'number');

      return {
        id: sm.id,
        name: sm.full_name,
        branch: sm.branch,
        status: sm.status,
        totalManagers: myManagers.length,
        totalPlanners,
        coachedAtLeastOnce,
        pctCoached: totalPlanners ? Math.round((coachedAtLeastOnce / totalPlanners) * 100) : null,
        totalSessions,
        avgCompetency: avg(competencyValues),
      };
    });

    const orgCompetencyValues = records.map((r) => r.competency_level).filter((v) => typeof v === 'number' && !Number.isNaN(v));

    return {
      totals: {
        seniorManagers: seniorManagers.length,
        managers: managers.length,
        planners: planners.length,
        totalSessions: records.length,
        avgCompetency: avg(orgCompetencyValues),
      },
      seniorManagerSummaries,
      managerSummaries,
    };
  } catch (error) {
    console.error('Error fetching admin org summary:', error);
    return {
      totals: { seniorManagers: 0, managers: 0, planners: 0, totalSessions: 0, avgCompetency: null },
      seniorManagerSummaries: [],
      managerSummaries: [],
    };
  }
}
