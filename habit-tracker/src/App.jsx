import "./App.css";
import { useState, useEffect, useCallback } from "react";
import { supabase } from "./supabaseClient";

const YEAR = 2026;
const CELL_H = 26;
const STRIP_H = 18;
const DONUT_SIZE = 150;

const months = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December"
];

const DAYS_OF_WEEK = ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"];

const DAY_COLORS = [
  "#BBDEFB","#FFE0B2","#FFF9C4","#C8E6C9","#FFCCBC","#B2EBF2","#E1BEE7",
];
const DAY_DONE_COLORS = [
  "#90CAF9","#FFB74D","#FFF176","#81C784","#FF8A65","#4DD0E1","#CE93D8",
];
const weekBgColors = [
  "#E3F2FD","#FFF9E6","#FCE4EC","#E8F5E9","#F3E5F5","#E0F7FA",
];
const barColors = [
  "#90CAF9","#FFD54F","#EF9A9A","#A5D6A7","#CE93D8","#4DD0E1",
];
const DAY_LABELS = ["S","M","T","W","T","F","S"];

function getDaysInMonth(m) { return new Date(YEAR, m + 1, 0).getDate(); }
function getFirstDow(m) { return new Date(YEAR, m, 1).getDay(); }

function buildWeeks(month) {
  const dim = getDaysInMonth(month);
  const fd = getFirstDow(month);
  const colDow = Array.from({ length: 7 }, (_, c) => (fd + c) % 7);
  const totalWeeks = Math.ceil(dim / 7);
  const weeks = [];
  let day = 1;
  for (let w = 0; w < totalWeeks; w++) {
    const week = [];
    for (let c = 0; c < 7; c++) {
      week.push(day <= dim ? { day, dow: colDow[c] } : null);
      day++;
    }
    weeks.push(week);
  }
  return { weeks, colDow };
}

const DEFAULT_HABITS = [
  { id: "1", name: "Wake up early" },
  { id: "2", name: "Drink water" },
  { id: "3", name: "Plan the day" },
  { id: "4", name: "Exercise" },
  { id: "5", name: "Meditate" },
  { id: "6", name: "Read a book" },
  { id: "7", name: "Write gratitude" },
];

const DEFAULT_WEEKLY_TASKS = [
  "Plan weekly goals","Exercise 3-5 times","Clean the house","Do laundry","Grocery shopping",
];

function makeDefaultWeeklyHabits() {
  const result = {};
  for (let d = 0; d < 7; d++) {
    result[d] = DEFAULT_WEEKLY_TASKS.map((name, i) => ({
      id: `d${d}-${i}`, name, done: false,
    }));
  }
  return result;
}

// ─── Login Screen ───────────────────────────────────────────────────────────
function LoginScreen() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError("");
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.origin },
    });
    if (error) { setError(error.message); setLoading(false); }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-icon">📋</div>
        <h1 className="login-title">HABIT TRACKER</h1>
        <p className="login-sub">Track your daily & weekly habits.<br />Sign in to save your progress across devices.</p>
        {error && <div className="login-error">{error}</div>}
        <button className="google-btn" onClick={handleGoogleLogin} disabled={loading}>
          {loading ? (
            <span className="login-spinner" />
          ) : (
            <>
              <svg width="18" height="18" viewBox="0 0 48 48">
                <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.36-8.16 2.36-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
              </svg>
              Continue with Google
            </>
          )}
        </button>
        <p className="login-note">Your data is private and synced to your account.</p>
      </div>
    </div>
  );
}

// ─── Main App ────────────────────────────────────────────────────────────────
export default function App() {
  const [session, setSession] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  // Data states
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [activeCells, setActiveCells] = useState({});
  const [habits, setHabits] = useState(DEFAULT_HABITS);
  const [newHabit, setNewHabit] = useState("");
  const [weeklyHabits, setWeeklyHabits] = useState(makeDefaultWeeklyHabits());
  const [newWeeklyTask, setNewWeeklyTask] = useState(Array(7).fill(""));
  const [dataLoading, setDataLoading] = useState(false);

  // ── Auth listener ──
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setAuthLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });
    return () => subscription.unsubscribe();
  }, []);

  // ── Load data when session changes ──
  const loadData = useCallback(async (userId) => {
    setDataLoading(true);
    try {
      const [habitsRes, cellsRes, weeklyRes] = await Promise.all([
        supabase.from("habits").select("*").eq("user_id", userId),
        supabase.from("habit_cells").select("*").eq("user_id", userId),
        supabase.from("weekly_habits").select("*").eq("user_id", userId),
      ]);

      // Habits
      if (habitsRes.data && habitsRes.data.length > 0) {
        setHabits(habitsRes.data.map(r => ({ id: r.habit_id, name: r.name })));
      }

      // Active cells
      if (cellsRes.data) {
        const cells = {};
        cellsRes.data.forEach(r => { cells[r.cell_key] = r.active; });
        setActiveCells(cells);
      }

      // Weekly habits
      if (weeklyRes.data && weeklyRes.data.length > 0) {
        const wh = makeDefaultWeeklyHabits();
        // Group by day_index
        const byDay = {};
        weeklyRes.data.forEach(r => {
          if (!byDay[r.day_index]) byDay[r.day_index] = [];
          byDay[r.day_index].push({ id: r.task_id, name: r.name, done: r.done });
        });
        Object.keys(byDay).forEach(d => { wh[d] = byDay[d]; });
        setWeeklyHabits(wh);
      }
    } finally {
      setDataLoading(false);
    }
  }, []);

  useEffect(() => {
    if (session?.user?.id) loadData(session.user.id);
  }, [session, loadData]);

  const userId = session?.user?.id;

  // ── Habits CRUD ──
  const addHabit = async () => {
    if (!newHabit.trim() || !userId) return;
    const habit = { id: crypto.randomUUID(), name: newHabit.trim() };
    setHabits(prev => [...prev, habit]);
    setNewHabit("");
    await supabase.from("habits").upsert({
      user_id: userId, habit_id: habit.id, name: habit.name,
    });
  };

  const deleteHabit = async (hid) => {
    setHabits(prev => prev.filter(h => h.id !== hid));
    if (userId) {
      await supabase.from("habits").delete().eq("user_id", userId).eq("habit_id", hid);
    }
  };

  // ── Cell toggle ──
  const ck = (day, hid) => `${YEAR}-${selectedMonth}-${day}-${hid}`;

  const toggle = async (key) => {
    const newVal = !activeCells[key];
    setActiveCells(prev => ({ ...prev, [key]: newVal }));
    if (userId) {
      await supabase.from("habit_cells").upsert(
        { user_id: userId, cell_key: key, active: newVal },
        { onConflict: "user_id,cell_key" }
      );
    }
  };

  // ── Weekly habits CRUD ──
  const toggleWeeklyDone = async (dayIdx, taskId) => {
    const task = weeklyHabits[dayIdx]?.find(t => t.id === taskId);
    if (!task) return;
    const newDone = !task.done;
    setWeeklyHabits(prev => ({
      ...prev,
      [dayIdx]: prev[dayIdx].map(t => t.id === taskId ? { ...t, done: newDone } : t),
    }));
    if (userId) {
      await supabase.from("weekly_habits").upsert(
        { user_id: userId, day_index: dayIdx, task_id: taskId, name: task.name, done: newDone },
        { onConflict: "user_id,day_index,task_id" }
      );
    }
  };

  const deleteWeeklyTask = async (dayIdx, taskId) => {
    setWeeklyHabits(prev => ({
      ...prev,
      [dayIdx]: prev[dayIdx].filter(t => t.id !== taskId),
    }));
    if (userId) {
      await supabase.from("weekly_habits").delete()
        .eq("user_id", userId).eq("day_index", dayIdx).eq("task_id", taskId);
    }
  };

  const addWeeklyTask = async (dayIdx) => {
    const name = newWeeklyTask[dayIdx]?.trim();
    if (!name || !userId) return;
    const task = { id: crypto.randomUUID(), name, done: false };
    setWeeklyHabits(prev => ({ ...prev, [dayIdx]: [...prev[dayIdx], task] }));
    setNewWeeklyTask(prev => { const n = [...prev]; n[dayIdx] = ""; return n; });
    await supabase.from("weekly_habits").upsert({
      user_id: userId, day_index: dayIdx, task_id: task.id, name, done: false,
    });
  };

  // ── Computed stats ──
  const dim = getDaysInMonth(selectedMonth);
  const { weeks, colDow } = buildWeeks(selectedMonth);

  const dayStats = {};
  for (let d = 1; d <= dim; d++) {
    let comp = 0;
    habits.forEach(h => { if (activeCells[ck(d, h.id)]) comp++; });
    const tot = habits.length;
    dayStats[d] = { completed: comp, incomplete: tot - comp, total: tot, pct: tot ? comp / tot * 100 : 0 };
  }

  const weekStats = weeks.map(week => {
    let comp = 0, tot = 0;
    week.forEach(s => {
      if (!s) return;
      habits.forEach(h => { tot++; if (activeCells[ck(s.day, h.id)]) comp++; });
    });
    return { completed: comp, incomplete: tot - comp, total: tot, pct: tot ? Math.round(comp / tot * 100) : 0 };
  });

  const mComp = Object.values(dayStats).reduce((a, d) => a + d.completed, 0);
  const mTot = dim * habits.length;
  const mPct = mTot ? (mComp / mTot * 100).toFixed(1) : "0.0";
  const circ = 2 * Math.PI * 45;
  const dashOff = circ - (parseFloat(mPct) / 100) * circ;
  const barMaxH = DONUT_SIZE;
  const CAL_TOP_H = 36 + CELL_H + CELL_H;
  const PROGRESS_BAR_MAX = 120;

  // ── Auth gates ──
  if (authLoading) {
    return (
      <div className="login-page">
        <div className="login-card">
          <div className="login-spinner" style={{ width: 32, height: 32, borderWidth: 3 }} />
        </div>
      </div>
    );
  }
  if (!session) return <LoginScreen />;

  return (
    <div className="page">

      {/* User bar */}
      <div className="user-bar">
        <div className="user-info">
          {session.user.user_metadata?.avatar_url && (
            <img src={session.user.user_metadata.avatar_url} alt="avatar" className="user-avatar" />
          )}
          <span className="user-name">{session.user.user_metadata?.full_name || session.user.email}</span>
          {dataLoading && <span className="sync-badge">Syncing…</span>}
        </div>
        <button className="signout-btn" onClick={() => supabase.auth.signOut()}>Sign out</button>
      </div>

      {/* ═══════════ TOP SECTION ═══════════ */}
      <section className="top-section">
        <div className="top-main-row">
          <div className="top-left">
            <div className="start-date-box">
              <div className="sd-label">Start Date</div>
              <select
                className="month-select"
                value={selectedMonth}
                onChange={e => setSelectedMonth(parseInt(e.target.value))}
              >
                {months.map((_, i) => (
                  <option key={i} value={i}>
                    01/{String(i + 1).padStart(2, "0")}/{YEAR}
                  </option>
                ))}
              </select>
            </div>
            <div className="summary-label">MONTHLY PROGRESS SUMMARY</div>
            <div className="donut-wrap">
              <svg width={DONUT_SIZE} height={DONUT_SIZE} viewBox="0 0 110 110">
                <circle cx="55" cy="55" r="45" fill="none" stroke="#f0c0c0" strokeWidth="14"/>
                <circle cx="55" cy="55" r="45" fill="none"
                  stroke="#6fcf97" strokeWidth="14"
                  strokeDasharray={circ} strokeDashoffset={dashOff}
                  strokeLinecap="butt" transform="rotate(-90 55 55)"
                />
                <text x="55" y="50" textAnchor="middle" fontSize="12" fontWeight="bold" fill="#333">{mPct}%</text>
                <text x="55" y="65" textAnchor="middle" fontSize="8" fill="#888">{mComp} / {mTot}</text>
              </svg>
            </div>
          </div>

          <div className="top-right">
            <h1 className="tracker-title">MONTHLY HABIT TRACKER</h1>
            <div className="overview-label">DAILY TASK COMPLETION OVERVIEW</div>
            <div className="bar-area" style={{ height: barMaxH }}>
              {weeks.map((week, wi) => (
                <div key={wi} className="week-bar-group">
                  {week.map((slot, ci) => {
                    const pct = slot ? (dayStats[slot.day]?.pct || 0) : 0;
                    const h = Math.round(pct / 100 * barMaxH);
                    return (
                      <div key={ci} className="day-bar-wrap">
                        {slot && h > 0 && (
                          <div className="day-bar" style={{ height: h, background: barColors[wi % barColors.length] }} />
                        )}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="shared-strip-row" style={{ height: STRIP_H }}>
          <div className="left-strip ls-comp" style={{ height: STRIP_H }}>
            <span className="ls-dot dot-green" />
            <span className="ls-label">Completed</span>
            <span className="ls-val">{mComp}</span>
          </div>
          <div className="right-strips-data">
            {weeks.map((week, wi) => (
              <div key={wi} className="week-strip-group ws-comp" style={{ height: STRIP_H }}>
                {week.map((slot, ci) => (
                  <div key={ci} className="strip-cell">{slot ? dayStats[slot.day]?.completed ?? 0 : ""}</div>
                ))}
              </div>
            ))}
          </div>
        </div>

        <div className="shared-strip-row" style={{ height: STRIP_H }}>
          <div className="left-strip ls-incomp" style={{ height: STRIP_H }}>
            <span className="ls-dot dot-red" />
            <span className="ls-label">Incomplete</span>
            <span className="ls-val">{mTot - mComp}</span>
          </div>
          <div className="right-strips-data">
            {weeks.map((week, wi) => (
              <div key={wi} className="week-strip-group ws-incomp" style={{ height: STRIP_H }}>
                {week.map((slot, ci) => (
                  <div key={ci} className="strip-cell">{slot ? dayStats[slot.day]?.incomplete ?? 0 : ""}</div>
                ))}
              </div>
            ))}
          </div>
        </div>

        <div className="shared-strip-row" style={{ height: STRIP_H }}>
          <div className="left-strip ls-pct" style={{ height: STRIP_H }}>
            <span className="ls-label ls-label-pct">% Completed</span>
            <span className="ls-val">{mPct}%</span>
          </div>
          <div className="right-strips-data">
            {weeks.map((week, wi) => (
              <div key={wi} className="week-strip-group" style={{ height: STRIP_H }}>
                {week.map((slot, ci) => {
                  const pct = slot ? (dayStats[slot.day]?.pct ?? 0) : null;
                  return (
                    <div key={ci} className="strip-cell"
                      style={pct !== null ? {
                        background: pct > 50 ? "#a5d6a7" : "#ef9a9a",
                        color: pct > 50 ? "#1b5e20" : "#b71c1c",
                        fontSize: "7px", fontWeight: 700,
                      } : {}}
                    >
                      {slot ? `${Math.round(pct)}%` : ""}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════ MIDDLE SECTION ═══════════ */}
      <section className="middle-section">
        <div className="tracker-body">
          <div className="habits-panel">
            <div className="panel-spacer" style={{ height: CAL_TOP_H }}>
              <span className="panel-hdr">DAILY HABITS / TASKS / ROUTINES</span>
            </div>
            {habits.map((habit, idx) => (
              <div className="habit-row" key={habit.id} style={{ height: CELL_H }}>
                <span className="habit-num">{idx + 1}</span>
                <span className="habit-name">{habit.name}</span>
                <button className="del-btn" onClick={() => deleteHabit(habit.id)}>✕</button>
              </div>
            ))}
            <div className="add-habit-row">
              <input
                placeholder="+ Add new habit..."
                value={newHabit}
                onChange={e => setNewHabit(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") addHabit(); }}
              />
            </div>
          </div>

          <div className="cal-area">
            {weeks.map((week, wi) => {
              const ws = weekStats[wi];
              const bg = weekBgColors[wi % weekBgColors.length];
              return (
                <div key={wi} className="week-col" style={{ background: bg }}>
                  <div className="week-stats-hdr" style={{ height: 36 }}>
                    <div className="wsi"><span className="wsl">COMPLETED</span><span className="wsv">{ws.completed}</span></div>
                    <div className="wsi"><span className="wsl">INCOMPLETE</span><span className="wsv">{ws.incomplete}</span></div>
                    <div className="wsi"><span className="wsl">%</span><span className="wsv">{ws.pct}%</span></div>
                  </div>
                  <div className="wrow" style={{ height: CELL_H }}>
                    {week.map((slot, ci) => (
                      <div key={ci} className="cell hdr-cell">{DAY_LABELS[colDow[ci]]}</div>
                    ))}
                  </div>
                  <div className="wrow" style={{ height: CELL_H }}>
                    {week.map((slot, ci) => (
                      <div key={ci} className="cell date-cell">{slot ? slot.day : ""}</div>
                    ))}
                  </div>
                  {habits.map(habit => (
                    <div key={habit.id} className="wrow" style={{ height: CELL_H }}>
                      {week.map((slot, ci) => {
                        if (!slot) return <div key={ci} className="cell empty-cell" />;
                        const key = ck(slot.day, habit.id);
                        const on = !!activeCells[key];
                        return (
                          <div key={ci} className={`cell habit-cell${on ? " on" : ""}`} onClick={() => toggle(key)}>
                            {on && <div className="dot" />}
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ═══════════ WEEKLY HABITS SECTION ═══════════ */}
      <section className="bottom-section">
        <div className="bottom-body">
          <div className="bottom-label-col">
            <span className="bottom-label-text">Weekly Habits / Tasks / Routines</span>
          </div>
          <div className="weekly-days-area">
            {DAYS_OF_WEEK.map((dayName, di) => {
              const tasks = weeklyHabits[di] || [];
              const doneCount = tasks.filter(t => t.done).length;
              const totalCount = tasks.length;
              return (
                <div key={di} className="weekly-day-col" style={{ background: DAY_COLORS[di] }}>
                  <div className="wday-header" style={{ background: DAY_DONE_COLORS[di] }}>{dayName}</div>
                  <div className="wday-tasks">
                    {tasks.map(task => (
                      <div key={task.id} className="wday-task-row">
                        <button className="wday-dot-btn" onClick={() => toggleWeeklyDone(di, task.id)}>
                          <span className={`wday-dot${task.done ? " wday-dot-done" : ""}`} />
                        </button>
                        <span className={`wday-task-name${task.done ? " wday-done-text" : ""}`}>{task.name}</span>
                        <button className="wday-del-btn" onClick={() => deleteWeeklyTask(di, task.id)}>✕</button>
                      </div>
                    ))}
                    <div className="wday-add-row">
                      <input
                        className="wday-add-input"
                        placeholder="+ Add task..."
                        value={newWeeklyTask[di] || ""}
                        onChange={e => setNewWeeklyTask(prev => { const n = [...prev]; n[di] = e.target.value; return n; })}
                        onKeyDown={e => { if (e.key === "Enter") addWeeklyTask(di); }}
                      />
                    </div>
                  </div>
                  <div className="wday-score" style={{ background: DAY_DONE_COLORS[di] }}>{doneCount} / {totalCount}</div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ═══════════ WEEKLY PROGRESS BARS SECTION ═══════════ */}
      <section className="bottom-section">
        <div className="bottom-body">
          <div className="bottom-label-col">
            <span className="bottom-label-text">Weekly Habits / Tasks / Routines Progress</span>
          </div>
          <div className="weekly-days-area">
            {DAYS_OF_WEEK.map((dayName, di) => {
              const tasks = weeklyHabits[di] || [];
              const total = tasks.length;
              const done = tasks.filter(t => t.done).length;
              const doneH = total > 0 ? Math.round((done / total) * PROGRESS_BAR_MAX) : 0;
              return (
                <div key={di} className="progress-day-col">
                  <div className="progress-bars-wrap" style={{ height: PROGRESS_BAR_MAX }}>
                    <div className="prog-bar-slot">
                      {total > 0 && (
                        <div className="prog-bar prog-bar-total" style={{ height: PROGRESS_BAR_MAX, background: DAY_COLORS[di], borderColor: DAY_DONE_COLORS[di] }}>
                          <span className="prog-bar-num">{total}</span>
                        </div>
                      )}
                    </div>
                    <div className="prog-bar-slot">
                      {done > 0 && (
                        <div className="prog-bar prog-bar-done" style={{ height: doneH, background: DAY_DONE_COLORS[di] }}>
                          <span className="prog-bar-num">{done}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="progress-day-label">{dayName}</div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

    </div>
  );
}