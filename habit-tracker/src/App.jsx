import "./App.css";
import { useState, useEffect } from "react";

const YEAR = 2026;
const CELL_H = 26;
const STRIP_H = 18;
const DONUT_SIZE = 150;

const months = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December"
];

// 7 days of week
const DAYS_OF_WEEK = ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"];

// Pastel colours per day (Mon–Sun), matching the reference image palette
const DAY_COLORS = [
  "#BBDEFB", // Monday   – blue
  "#FFE0B2", // Tuesday  – orange/peach
  "#FFF9C4", // Wednesday– yellow
  "#C8E6C9", // Thursday – green
  "#FFCCBC", // Friday   – salmon
  "#B2EBF2", // Saturday – cyan
  "#E1BEE7", // Sunday   – purple
];

// Darker tones for the "done" bar (slightly more saturated)
const DAY_DONE_COLORS = [
  "#90CAF9",
  "#FFB74D",
  "#FFF176",
  "#81C784",
  "#FF8A65",
  "#4DD0E1",
  "#CE93D8",
];

const weekBgColors = [
  "#E3F2FD", "#FFF9E6", "#FCE4EC", "#E8F5E9", "#F3E5F5", "#E0F7FA",
];
const barColors = [
  "#90CAF9", "#FFD54F", "#EF9A9A", "#A5D6A7", "#CE93D8", "#4DD0E1",
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

// Default weekly tasks — same 5 for every day to start
const DEFAULT_WEEKLY_TASKS = [
  "Plan weekly goals",
  "Exercise 3-5 times",
  "Clean the house",
  "Do laundry",
  "Grocery shopping",
];

function makeDefaultWeeklyHabits() {
  // For each day index 0-6, an array of { id, name, done }
  const result = {};
  for (let d = 0; d < 7; d++) {
    result[d] = DEFAULT_WEEKLY_TASKS.map((name, i) => ({
      id: `d${d}-${i}`,
      name,
      done: false,
    }));
  }
  return result;
}

export default function App() {
  const [selectedMonth, setSelectedMonth] = useState(0);

  // Daily habit tracker state
  const [activeCells, setActiveCells] = useState(() => {
    try { const s = localStorage.getItem("hbt-cells"); return s ? JSON.parse(s) : {}; }
    catch { return {}; }
  });
  const [habits, setHabits] = useState(() => {
    try {
      const s = localStorage.getItem("hbt-habits");
      return s ? JSON.parse(s) : [
        { id: "1", name: "Wake up early" },
        { id: "2", name: "Drink water" },
        { id: "3", name: "Plan the day" },
        { id: "4", name: "Exercise" },
        { id: "5", name: "Meditate" },
        { id: "6", name: "Read a book" },
        { id: "7", name: "Write gratitude" },
      ];
    } catch { return []; }
  });
  const [newHabit, setNewHabit] = useState("");

  // Weekly habits state — keyed by day index 0-6
  const [weeklyHabits, setWeeklyHabits] = useState(() => {
    try {
      const s = localStorage.getItem("hbt-weekly");
      return s ? JSON.parse(s) : makeDefaultWeeklyHabits();
    } catch { return makeDefaultWeeklyHabits(); }
  });
  // New task input per day
  const [newWeeklyTask, setNewWeeklyTask] = useState(Array(7).fill(""));

  useEffect(() => { localStorage.setItem("hbt-cells", JSON.stringify(activeCells)); }, [activeCells]);
  useEffect(() => { localStorage.setItem("hbt-habits", JSON.stringify(habits)); }, [habits]);
  useEffect(() => { localStorage.setItem("hbt-weekly", JSON.stringify(weeklyHabits)); }, [weeklyHabits]);

  const ck = (day, hid) => `${YEAR}-${selectedMonth}-${day}-${hid}`;
  const toggle = (key) => setActiveCells(prev => ({ ...prev, [key]: !prev[key] }));

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

  // Weekly habit helpers
  const toggleWeeklyDone = (dayIdx, taskId) => {
    setWeeklyHabits(prev => ({
      ...prev,
      [dayIdx]: prev[dayIdx].map(t => t.id === taskId ? { ...t, done: !t.done } : t),
    }));
  };

  const deleteWeeklyTask = (dayIdx, taskId) => {
    setWeeklyHabits(prev => ({
      ...prev,
      [dayIdx]: prev[dayIdx].filter(t => t.id !== taskId),
    }));
  };

  const addWeeklyTask = (dayIdx) => {
    const name = newWeeklyTask[dayIdx]?.trim();
    if (!name) return;
    setWeeklyHabits(prev => ({
      ...prev,
      [dayIdx]: [...prev[dayIdx], { id: crypto.randomUUID(), name, done: false }],
    }));
    setNewWeeklyTask(prev => { const n = [...prev]; n[dayIdx] = ""; return n; });
  };

  // Progress bar max height for weekly section
  const PROGRESS_BAR_MAX = 120;

  return (
    <div className="page">

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

        {/* Shared strip rows */}
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

      {/* ═══════════ MIDDLE SECTION (Daily habit tracker) ═══════════ */}
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
                <button className="del-btn" onClick={() => setHabits(habits.filter(h => h.id !== habit.id))}>✕</button>
              </div>
            ))}
            <div className="add-habit-row">
              <input
                placeholder="+ Add new habit..."
                value={newHabit}
                onChange={e => setNewHabit(e.target.value)}
                onKeyDown={e => {
                  if (e.key === "Enter" && newHabit.trim()) {
                    setHabits([...habits, { id: crypto.randomUUID(), name: newHabit.trim() }]);
                    setNewHabit("");
                  }
                }}
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

          {/* Left label */}
          <div className="bottom-label-col">
            <span className="bottom-label-text">Weekly Habits / Tasks / Routines</span>
          </div>

          {/* 7 day columns */}
          <div className="weekly-days-area">
            {DAYS_OF_WEEK.map((dayName, di) => {
              const tasks = weeklyHabits[di] || [];
              const doneCount = tasks.filter(t => t.done).length;
              const totalCount = tasks.length;
              return (
                <div key={di} className="weekly-day-col" style={{ background: DAY_COLORS[di] }}>
                  {/* Day header */}
                  <div className="wday-header" style={{ background: DAY_DONE_COLORS[di] }}>
                    {dayName}
                  </div>

                  {/* Task list */}
                  <div className="wday-tasks">
                    {tasks.map(task => (
                      <div key={task.id} className="wday-task-row">
                        <button
                          className="wday-dot-btn"
                          onClick={() => toggleWeeklyDone(di, task.id)}
                          title="Toggle done"
                        >
                          <span className={`wday-dot${task.done ? " wday-dot-done" : ""}`} />
                        </button>
                        <span className={`wday-task-name${task.done ? " wday-done-text" : ""}`}>
                          {task.name}
                        </span>
                        <button
                          className="wday-del-btn"
                          onClick={() => deleteWeeklyTask(di, task.id)}
                          title="Delete task"
                        >✕</button>
                      </div>
                    ))}

                    {/* Add new task input */}
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

                  {/* Score footer */}
                  <div className="wday-score" style={{ background: DAY_DONE_COLORS[di] }}>
                    {doneCount} / {totalCount}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ═══════════ WEEKLY PROGRESS BARS SECTION ═══════════ */}
      <section className="bottom-section">
        <div className="bottom-body">

          {/* Left label */}
          <div className="bottom-label-col">
            <span className="bottom-label-text">Weekly Habits / Tasks / Routines Progress</span>
          </div>

          {/* 7 day bar charts */}
          <div className="weekly-days-area">
            {DAYS_OF_WEEK.map((dayName, di) => {
              const tasks = weeklyHabits[di] || [];
              const total = tasks.length;
              const done = tasks.filter(t => t.done).length;
              const totalH = total > 0 ? Math.round((total / Math.max(total, 1)) * PROGRESS_BAR_MAX) : 0;
              const doneH = total > 0 ? Math.round((done / total) * PROGRESS_BAR_MAX) : 0;

              return (
                <div key={di} className="progress-day-col">
                  {/* Twin bars */}
                  <div className="progress-bars-wrap" style={{ height: PROGRESS_BAR_MAX }}>
                    {/* Total bar (always full height when tasks exist) */}
                    <div className="prog-bar-slot">
                      {total > 0 && (
                        <div
                          className="prog-bar prog-bar-total"
                          style={{
                            height: PROGRESS_BAR_MAX,
                            background: DAY_COLORS[di],
                            borderColor: DAY_DONE_COLORS[di],
                          }}
                        >
                          <span className="prog-bar-num">{total}</span>
                        </div>
                      )}
                    </div>
                    {/* Done bar */}
                    <div className="prog-bar-slot">
                      {done > 0 && (
                        <div
                          className="prog-bar prog-bar-done"
                          style={{
                            height: doneH,
                            background: DAY_DONE_COLORS[di],
                          }}
                        >
                          <span className="prog-bar-num">{done}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Day label below bars */}
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