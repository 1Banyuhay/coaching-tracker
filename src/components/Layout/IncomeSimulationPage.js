import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Plus, X } from 'lucide-react';
import '../Manager/ManagerDashboard.css';
import './IncomeSimulationPage.css';

// "Income Simulation" - a what-if calculator for planning a Financial
// Wealth Planner's (or Senior Financial Wealth Planner's) year: set a
// monthly case count/size/payment-mode plan, and it projects FYC, the
// Monthly Case Bonus (MCB), the Monthly Volume Bonus (MVB), and - for a
// Senior Planner - override income from Business Partners. Everything
// here is illustration/coaching-only math, kept in this browser via
// localStorage so a planner's draft plan survives a refresh.
//
// The bonus rules (case-bonus tiers, volume-bonus tiers) live in the
// MCB_TABLE / MVB_TABLE constants below and in the caseBonus() /
// volumeRate() functions - keep those two in sync if the company's
// compensation rules ever change.

const STORAGE_KEY = 'incomeSimulator_v1';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const PAYMENT_MODES = {
  monthly: { label: 'Monthly', offsets: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11] },
  quarterly: { label: 'Quarterly', offsets: [0, 3, 6, 9] },
  semiannual: { label: 'Semiannual', offsets: [0, 6] },
  annual: { label: 'Annual', offsets: [0] },
};

const GOAL_MODES = [
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'annual', label: 'Annual' },
];

const MCB_TABLE = [
  ['2', '2,000'],
  ['3', '3,500'],
  ['4 to 5', '6,000'],
  ['6 to 7', '12,000'],
  ['8 to 9', '20,000'],
  ['10 and higher', '30,000'],
];

const MVB_TABLE_HEADERS = ['Monthly APE', '70.00% to 84.99%', '85.00% to 100.00%'];
const MVB_TABLE_ROWS = [
  ['50,000 – 99,999', '7.5%', '12.5%'],
  ['100,000 – 149,999', '12.5%', '20.0%'],
  ['150,000 – 199,999', '20.0%', '30.0%'],
  ['200,000 and above', '30.0%', '40.0%'],
];

const money = (n) => '₱' + Math.round(n || 0).toLocaleString('en-PH');
const plain = (n) => Math.round(n || 0).toLocaleString('en-PH');
const parseMoney = (v) => Math.max(0, Number(String(v ?? '').replace(/,/g, '')) || 0);
const parseIntSafe = (v) => Math.max(0, Math.floor(Number(v) || 0));

function volumeRate(ape, persistency) {
  if (persistency < 70 || ape < 50000) return 0;
  const high = persistency >= 85;
  if (ape >= 200000) return high ? 0.40 : 0.30;
  if (ape >= 150000) return high ? 0.30 : 0.20;
  if (ape >= 100000) return high ? 0.20 : 0.125;
  return high ? 0.125 : 0.075;
}

function caseBonus(c) {
  if (c >= 10) return 30000;
  if (c >= 8) return 20000;
  if (c >= 6) return 12000;
  if (c >= 4) return 6000;
  if (c >= 3) return 3500;
  if (c >= 2) return 2000;
  return 0;
}

function mcbCases(cases, size, ape) {
  return size >= 24000 ? cases : Math.floor(ape / 24000);
}

// Spreads a full-year FYC amount across the months a given payment mode
// pays out in, starting at month `start`. Returns the first installment
// (the "initial FYC" for that case) so callers can total that too.
function addSchedule(target, start, full, mode) {
  const offsets = PAYMENT_MODES[mode].offsets;
  const part = offsets.length ? full / offsets.length : 0;
  offsets.forEach((offset) => {
    const month = start + offset;
    if (month < 12) target[month] += part;
  });
  return part;
}

// Used by the goal recommendation: "if every month added N more cases at
// its existing size/mode, would the year reach the goal?"
function projectedPersonal(personal, rate, persistency, extraCases, overrideIncome) {
  const schedule = Array(12).fill(0);
  const rows = personal.map((x, i) => {
    const cases = x.cases + extraCases;
    const ape = cases * x.size;
    const fullFyc = ape * rate;
    const mcbCase = mcbCases(cases, x.size, ape);
    addSchedule(schedule, i, fullFyc, x.mode);
    return { ape, mcbCase };
  });
  const total = rows.reduce(
    (sum, x, i) => sum + schedule[i] + schedule[i] * volumeRate(x.ape, persistency) + caseBonus(x.mcbCase),
    0
  );
  return total + overrideIncome;
}

const defaultMonths = () => MONTHS.map(() => ({ cases: 0, size: 24000, mode: 'monthly' }));
const defaultPartners = () => MONTHS.map(() => []);

const loadSaved = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

const MoneyInput = ({ value, onChange, className, ariaLabel, prefix }) => (
  <div className={`is-input-wrap ${className || ''}`}>
    {prefix && <span className="is-prefix">{prefix}</span>}
    <input
      type="text"
      inputMode="numeric"
      className="is-money-field"
      value={plain(value)}
      aria-label={ariaLabel}
      onChange={(e) => onChange(parseMoney(e.target.value))}
    />
  </div>
);

const IncomeSimulationPage = () => {
  const saved = useMemo(loadSaved, []);

  const [plannerName, setPlannerName] = useState(saved?.plannerName || '');
  const [role, setRole] = useState(saved?.role || 'planner');
  const [commission, setCommission] = useState(saved?.commission ?? 40);
  const [persistency, setPersistency] = useState(saved?.persistency ?? 85);
  const [incomeGoal, setIncomeGoal] = useState(saved?.incomeGoal ?? 1000000);
  const [goalMode, setGoalMode] = useState(saved?.goalMode || 'annual');
  const [months, setMonths] = useState(saved?.months?.length === 12 ? saved.months : defaultMonths);
  const [partners, setPartners] = useState(saved?.partners?.length === 12 ? saved.partners : defaultPartners);

  useEffect(() => {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ plannerName, role, commission, persistency, incomeGoal, goalMode, months, partners })
      );
    } catch {
      // best-effort only
    }
  }, [plannerName, role, commission, persistency, incomeGoal, goalMode, months, partners]);

  const updateMonth = useCallback((index, field, value) => {
    setMonths((prev) => prev.map((m, i) => (i === index ? { ...m, [field]: value } : m)));
  }, []);

  const addPartner = useCallback((monthIndex) => {
    setPartners((prev) =>
      prev.map((list, i) =>
        i === monthIndex
          ? [...list, { id: `${Date.now()}-${Math.random()}`, name: '', cases: 0, size: 24000, mode: 'monthly' }]
          : list
      )
    );
  }, []);

  const updatePartner = useCallback((monthIndex, partnerId, field, value) => {
    setPartners((prev) =>
      prev.map((list, i) =>
        i === monthIndex ? list.map((p) => (p.id === partnerId ? { ...p, [field]: value } : p)) : list
      )
    );
  }, []);

  const removePartner = useCallback((monthIndex, partnerId) => {
    setPartners((prev) => prev.map((list, i) => (i === monthIndex ? list.filter((p) => p.id !== partnerId) : list)));
  }, []);

  const handleReset = () => {
    if (!window.confirm('Reset the complete simulation, including Business Partners?')) return;
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
    setPlannerName('');
    setRole('planner');
    setCommission(40);
    setPersistency(85);
    setIncomeGoal(1000000);
    setGoalMode('annual');
    setMonths(defaultMonths());
    setPartners(defaultPartners());
  };

  const calc = useMemo(() => {
    const rate = commission / 100;
    const p = Number(persistency) || 0;
    const fycSchedule = Array(12).fill(0);

    const personal = months.map((m) => {
      const cases = parseIntSafe(m.cases);
      const size = Number(m.size) || 0;
      const ape = cases * size;
      return { cases, size, mode: m.mode, ape, mcbCase: mcbCases(cases, size, ape) };
    });

    const totals = { cases: 0, mcbCase: 0, ape: 0, initialFyc: 0, fullFyc: 0, mvb: 0, mcb: 0, income: 0 };

    const withFyc = personal.map((x, i) => {
      const fullFyc = x.ape * rate;
      const initialFyc = addSchedule(fycSchedule, i, fullFyc, x.mode);
      totals.cases += x.cases;
      totals.mcbCase += x.mcbCase;
      totals.ape += x.ape;
      totals.initialFyc += initialFyc;
      totals.fullFyc += fullFyc;
      return { ...x, fullFyc, initialFyc };
    });

    const senior = role === 'senior';
    const orcSchedule = Array(12).fill(0);
    let teamApe = 0;
    let teamFullFyc = 0;

    const partnersComputed = partners.map((list) =>
      list.map((bp) => {
        const cases = parseIntSafe(bp.cases);
        const size = Number(bp.size) || 0;
        const ape = cases * size;
        const fullFyc = ape * rate;
        const initialFyc = fullFyc / PAYMENT_MODES[bp.mode].offsets.length;
        const fullOrc = fullFyc * 0.10;
        const initialOrc = initialFyc * 0.10;
        return { ...bp, cases, size, ape, fullFyc, initialFyc, fullOrc, initialOrc };
      })
    );

    if (senior) {
      partnersComputed.forEach((list, monthIndex) => {
        list.forEach((bp) => {
          teamApe += bp.ape;
          teamFullFyc += bp.fullFyc;
          addSchedule(orcSchedule, monthIndex, bp.fullOrc, bp.mode);
        });
      });
    }

    const monthlyIncome = [];
    const rows = withFyc.map((x, i) => {
      const mvbRate = volumeRate(x.ape, p);
      const mvb = fycSchedule[i] * mvbRate;
      const mcb = caseBonus(x.mcbCase);
      const income = fycSchedule[i] + mvb + mcb + orcSchedule[i];
      monthlyIncome.push(income);
      totals.mvb += mvb;
      totals.mcb += mcb;
      totals.income += income;
      return { ...x, mvbRate, mvb, mcb, income, accumulatedFyc: fycSchedule[i] };
    });

    const fycWithinYear = fycSchedule.reduce((a, b) => a + b, 0);
    const overrideIncome = orcSchedule.reduce((a, b) => a + b, 0);

    const goal = Number(incomeGoal) || 0;
    const annualGoal = goalMode === 'monthly' ? goal * 12 : goalMode === 'quarterly' ? goal * 4 : goal;
    const goalBasisIncome = goalMode === 'monthly' ? totals.income / 12 : goalMode === 'quarterly' ? totals.income / 4 : totals.income;
    const pct = goal ? (goalBasisIncome / goal) * 100 : 0;
    const gap = Math.max(0, goal - goalBasisIncome);
    const aboveGoal = goal > 0 && goalBasisIncome >= goal;

    let extra = 0;
    let recommended = totals.income;
    if (goal > 0 && annualGoal > totals.income) {
      for (extra = 1; extra <= 500; extra++) {
        recommended = projectedPersonal(personal, rate, p, extra, overrideIncome);
        if (recommended >= annualGoal) break;
      }
    }

    return {
      rows, totals, fycWithinYear, overrideIncome, teamApe, teamFullFyc, senior,
      partnersComputed, monthlyIncome, goal, annualGoal, goalBasisIncome, pct, gap, aboveGoal, extra, recommended,
    };
  }, [months, partners, commission, persistency, role, incomeGoal, goalMode]);

  const goalModeLabel = GOAL_MODES.find((g) => g.value === goalMode)?.label || 'Annual';

  return (
    <div className="manager-dashboard">
      <div className="dashboard-header">
        <div className="header-left">
          <p className="header-subtitle">1Sang Banyuhay Financial Group</p>
          <h1 className="header-title">INCOME SIMULATION</h1>
        </div>
        <button type="button" className="is-reset-btn" onClick={handleReset}>Reset</button>
      </div>

      <div className="card">
        <h2 className="section-title">Simulation Assumptions</h2>
        <div className="is-controls">
          <div className="is-field">
            <label htmlFor="is-plannerName">Planner&apos;s Name</label>
            <div className="is-input-wrap">
              <input
                id="is-plannerName"
                type="text"
                placeholder="Enter name"
                value={plannerName}
                onChange={(e) => setPlannerName(e.target.value)}
              />
            </div>
          </div>

          <div className="is-field">
            <label htmlFor="is-role">Role</label>
            <div className="is-input-wrap">
              <select id="is-role" value={role} onChange={(e) => setRole(e.target.value)}>
                <option value="planner">Financial Wealth Planner</option>
                <option value="senior">Senior Financial Wealth Planner</option>
              </select>
            </div>
          </div>

          <div className="is-field">
            <label htmlFor="is-commission">Estimated Commission Rate</label>
            <div className="is-input-wrap">
              <input
                id="is-commission"
                type="number"
                min="0"
                max="100"
                step="0.1"
                value={commission}
                onChange={(e) => setCommission(Number(e.target.value))}
              />
              <span className="is-suffix">%</span>
            </div>
          </div>

          <div className="is-field">
            <label htmlFor="is-persistency">Personal Persistency</label>
            <div className="is-input-wrap">
              <input
                id="is-persistency"
                type="number"
                min="0"
                max="100"
                step="0.01"
                value={persistency}
                onChange={(e) => setPersistency(Number(e.target.value))}
              />
              <span className="is-suffix">%</span>
            </div>
          </div>

          <div className="is-field">
            <label htmlFor="is-incomeGoal">Income Goal</label>
            <div className="is-goal-group">
              <MoneyInput
                value={incomeGoal}
                onChange={setIncomeGoal}
                prefix="₱"
                ariaLabel="Income goal"
              />
              <select
                className="is-goal-mode"
                value={goalMode}
                onChange={(e) => setGoalMode(e.target.value)}
                aria-label="Income goal period"
              >
                {GOAL_MODES.map((g) => (
                  <option key={g.value} value={g.value}>{g.label}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
        <p className="is-hint">
          <strong>Use annualized premium for case size:</strong> a ₱2,000 monthly premium has a ₱24,000 APE. Initial FYC
          is based on the selected payment mode. Previous scheduled installments are added to the current month&apos;s
          FYC before MVB is computed.
        </p>
      </div>

      <div className="card">
        <div className="is-goal-strip">
          <div className="is-goal-copy">
            <strong>{goalModeLabel} Income Goal: {money(calc.goal)}</strong>
            <span>Projected result based on the monthly plan</span>
          </div>
          <div className="is-progress">
            <span style={{ width: `${Math.min(100, calc.pct)}%` }} />
          </div>
          <div className="is-goal-result">
            <strong>{Math.round(calc.pct)}%</strong>
            <span>
              {calc.aboveGoal
                ? `${money(calc.goalBasisIncome - calc.goal)} above goal`
                : `${money(calc.gap)} remaining`}
            </span>
          </div>
        </div>

        <div className="is-recommendation">
          <div className="is-rec-icon">✓</div>
          <div>
            {!calc.goal ? (
              <>
                <strong>Enter an income goal</strong>
                <span>Add a target amount to generate a production recommendation.</span>
              </>
            ) : calc.annualGoal <= calc.totals.income ? (
              <>
                <strong>Your plan reaches the income goal</strong>
                <span>Projected earnings are {money(calc.totals.income - calc.annualGoal)} above the target.</span>
              </>
            ) : calc.extra <= 500 ? (
              <>
                <strong>Add approximately {calc.extra} case{calc.extra === 1 ? '' : 's'} per month</strong>
                <span>
                  Using each month&apos;s case size and payment mode, this adds about {calc.extra * 12} cases and
                  projects {money(calc.recommended)} in total earnings.
                </span>
              </>
            ) : (
              <>
                <strong>Income goal needs a customized production mix</strong>
                <span>Adjust monthly case sizes, payment modes, or Business Partner production to build a practical path to the target.</span>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="summary is-summary">
        <article className="metric-card">
          <div className="metric-label">Annual Cases</div>
          <div className="is-metric-value">{calc.totals.cases}</div>
        </article>
        <article className="metric-card">
          <div className="metric-label">Annual APE</div>
          <div className="is-metric-value">{money(calc.totals.ape)}</div>
        </article>
        <article className="metric-card">
          <div className="metric-label">FYC Received Within Year</div>
          <div className="is-metric-value">{money(calc.fycWithinYear)}</div>
        </article>
        <article className="metric-card">
          <div className="metric-label">Total Bonuses</div>
          <div className="is-metric-value">{money(calc.totals.mvb + calc.totals.mcb)}</div>
        </article>
        <article className="metric-card metric-success is-total-card">
          <div className="metric-label">Total Projected Earnings</div>
          <div className="is-metric-value">{money(calc.totals.income)}</div>
        </article>
      </div>

      {calc.senior && (
        <div className="summary is-summary is-team-summary">
          <article className="metric-card">
            <div className="metric-label">Team APE</div>
            <div className="is-metric-value">{money(calc.teamApe)}</div>
          </article>
          <article className="metric-card">
            <div className="metric-label">Team Full Year FYC</div>
            <div className="is-metric-value">{money(calc.teamFullFyc)}</div>
          </article>
          <article className="metric-card metric-success is-total-card">
            <div className="metric-label">ORC Received Within Year</div>
            <div className="is-metric-value">{money(calc.overrideIncome)}</div>
          </article>
        </div>
      )}

      <div className="card">
        <h2 className="section-title">Monthly Production Plan</h2>
        <p className="is-hint" style={{ marginBottom: '1rem' }}>Case size and payment mode may vary each month.</p>

        <div className="is-table-wrap">
          <table className="data-table is-plan-table">
            <thead>
              <tr>
                <th>Month</th>
                <th>Case Count</th>
                <th>Avg. Case Size</th>
                <th>APE</th>
                <th>Payment Mode</th>
                <th>Initial FYC</th>
                <th>Full Year FYC</th>
                <th>MCB Case</th>
                <th>MCB Amount</th>
                <th>MVB Rate</th>
                <th>MVB Amount</th>
                <th>Total Earnings</th>
              </tr>
            </thead>
            <tbody>
              {MONTHS.map((label, i) => {
                const row = calc.rows[i];
                const partnerList = calc.partnersComputed[i] || [];
                return (
                  <React.Fragment key={label}>
                    <tr>
                      <td className="is-month">{label}</td>
                      <td>
                        <input
                          type="number"
                          min="0"
                          step="1"
                          className="is-cell-input"
                          value={months[i].cases}
                          aria-label={`${label} case count`}
                          onChange={(e) => updateMonth(i, 'cases', e.target.value)}
                        />
                      </td>
                      <td>
                        <MoneyInput
                          className="is-cell-money"
                          value={months[i].size}
                          onChange={(v) => updateMonth(i, 'size', v)}
                          ariaLabel={`${label} average case size`}
                        />
                      </td>
                      <td>{money(row.ape)}</td>
                      <td>
                        <select
                          className="is-cell-select"
                          value={months[i].mode}
                          aria-label={`${label} payment mode`}
                          onChange={(e) => updateMonth(i, 'mode', e.target.value)}
                        >
                          {Object.entries(PAYMENT_MODES).map(([v, x]) => (
                            <option key={v} value={v}>{x.label}</option>
                          ))}
                        </select>
                      </td>
                      <td>{money(row.initialFyc)}</td>
                      <td>{money(row.fullFyc)}</td>
                      <td>{row.mcbCase}</td>
                      <td className="is-bonus">{money(row.mcb)}</td>
                      <td>{row.mvbRate ? `${(row.mvbRate * 100).toFixed(1)}%` : '—'}</td>
                      <td className="is-bonus">{money(row.mvb)}</td>
                      <td className="is-income">{money(row.income)}</td>
                    </tr>
                    {calc.senior && (
                      <tr className="is-partner-zone">
                        <td colSpan={12}>
                          <div className="is-partner-tools">
                            <button type="button" className="action-btn" onClick={() => addPartner(i)}>
                              <Plus size={14} style={{ marginRight: '0.25rem' }} /> Add Business Partner
                            </button>
                            {partnerList.length > 0 && (
                              <span className="is-partner-count">
                                {partnerList.length} added in {label}
                              </span>
                            )}
                          </div>
                          {partnerList.length > 0 && (
                            <div className="is-partner-list">
                              {partnerList.map((bp) => (
                                <div className="is-partner-card" key={bp.id}>
                                  <div className="is-partner-grid">
                                    <div className="is-partner-field">
                                      <label>Business Partner</label>
                                      <input
                                        type="text"
                                        placeholder="Name"
                                        value={bp.name}
                                        onChange={(e) => updatePartner(i, bp.id, 'name', e.target.value)}
                                      />
                                    </div>
                                    <div className="is-partner-field">
                                      <label>Case Count</label>
                                      <input
                                        type="number"
                                        min="0"
                                        step="1"
                                        value={bp.cases}
                                        onChange={(e) => updatePartner(i, bp.id, 'cases', e.target.value)}
                                      />
                                    </div>
                                    <div className="is-partner-field">
                                      <label>Avg. Case Size</label>
                                      <input
                                        type="text"
                                        inputMode="numeric"
                                        value={plain(bp.size)}
                                        onChange={(e) => updatePartner(i, bp.id, 'size', parseMoney(e.target.value))}
                                      />
                                    </div>
                                    <div className="is-partner-field">
                                      <label>APE</label>
                                      <div className="is-partner-output">{money(bp.ape)}</div>
                                    </div>
                                    <div className="is-partner-field">
                                      <label>Payment Mode</label>
                                      <select value={bp.mode} onChange={(e) => updatePartner(i, bp.id, 'mode', e.target.value)}>
                                        {Object.entries(PAYMENT_MODES).map(([v, x]) => (
                                          <option key={v} value={v}>{x.label}</option>
                                        ))}
                                      </select>
                                    </div>
                                    <div className="is-partner-field">
                                      <label>Agent Initial FYC</label>
                                      <div className="is-partner-output">{money(bp.initialFyc)}</div>
                                    </div>
                                    <div className="is-partner-field">
                                      <label>Full Year FYC</label>
                                      <div className="is-partner-output">{money(bp.fullFyc)}</div>
                                    </div>
                                    <div className="is-partner-field">
                                      <label>Initial ORC</label>
                                      <div className="is-partner-output">{money(bp.initialOrc)}</div>
                                    </div>
                                    <div className="is-partner-field">
                                      <label>Full Year ORC</label>
                                      <div className="is-partner-output">{money(bp.fullOrc)}</div>
                                    </div>
                                    <button
                                      type="button"
                                      className="is-partner-remove"
                                      aria-label={`Remove ${bp.name || 'business partner'}`}
                                      onClick={() => removePartner(i, bp.id)}
                                    >
                                      <X size={16} />
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
            <tfoot>
              <tr>
                <td>Annual Total</td>
                <td>{calc.totals.cases}</td>
                <td>—</td>
                <td>{money(calc.totals.ape)}</td>
                <td>—</td>
                <td>{money(calc.totals.initialFyc)}</td>
                <td>{money(calc.totals.fullFyc)}</td>
                <td>{calc.totals.mcbCase}</td>
                <td>{money(calc.totals.mcb)}</td>
                <td>—</td>
                <td>{money(calc.totals.mvb)}</td>
                <td>{money(calc.totals.income)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      <div className="card">
        <h2 className="section-title">Bonus Reference Tables</h2>

        <div className="is-bonus-tables">
          <div className="is-bonus-table-block">
            <h3>Monthly Case Bonus (MCB)</h3>
            <p className="is-bonus-note">
              Meet the minimum level in new business issued monthly APE of ₱24,000. Policies less than ₱24,000 APE
              for the month are aggregated; the sum is divided by ₱24,000 to determine the number of cases.
            </p>
            <div className="is-table-wrap">
              <table className="data-table is-mcb-table">
                <thead>
                  <tr>
                    <th>Monthly Case Count</th>
                    <th>MCB (in PHP)</th>
                  </tr>
                </thead>
                <tbody>
                  {MCB_TABLE.map(([count, amount]) => (
                    <tr key={count}>
                      <td>{count}</td>
                      <td>{amount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="is-bonus-note">The MCB is not cumulative and bonus amounts must be added up. It is payable at the highest amount qualified for by an Agent.</p>
          </div>

          <div className="is-bonus-table-block">
            <h3>Monthly Volume Bonus (MVB)</h3>
            <p className="is-bonus-note">
              Meet the minimum levels in monthly APE (net of cancellations) to earn a percentage of the monthly FYC.
            </p>
            <div className="is-table-wrap">
              <table className="data-table is-mvb-table">
                <thead>
                  <tr>
                    <th>{MVB_TABLE_HEADERS[0]}</th>
                    <th>Personal Persistency<br />{MVB_TABLE_HEADERS[1]}</th>
                    <th>Personal Persistency<br />{MVB_TABLE_HEADERS[2]}</th>
                  </tr>
                </thead>
                <tbody>
                  {MVB_TABLE_ROWS.map((r) => (
                    <tr key={r[0]}>
                      <td>{r[0]}</td>
                      <td>{r[1]}</td>
                      <td>{r[2]}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <p className="is-note">
          For coaching and illustration only. Full Year FYC uses APE × commission rate. Initial FYC applies the
          selected payment-mode fraction. Current-month FYC includes scheduled installments from previous months and
          is used as the MVB base. MCB Case is automatic using the ₱24,000 APE qualification rule. Senior Planner ORC
          is 10% of a Business Partner&apos;s FYC and excludes bonuses. Actual release timing may vary by product and
          current company compensation rules.
        </p>
      </div>

      <p className="is-copyright">© 2026 Mikko James D. Rodriguez. All rights reserved.</p>
    </div>
  );
};

export default IncomeSimulationPage;
