import { useState, useEffect, useCallback } from "react";

const COACHES = ["Rodolfo", "Karina", "Luis", "Juan", "Mica"];
const WEEKS   = ["S1", "S2", "S3", "S4"];
const MONTHS  = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];

const RULES = [
  { key:"bs",  emoji:"📞", label:"Bright Spot",        pts:5,  unit:"por envio"   },
  { key:"or",  emoji:"👥", label:"On Ramp",            pts:15, unit:"por atleta"  },
  { key:"rv",  emoji:"⭐", label:"Review Google",      pts:20, unit:"por review"  },
  { key:"rec", emoji:"❤️", label:"Atleta Recuperado",  pts:30, unit:"por atleta"  },
  { key:"ld",  emoji:"🎯", label:"Lead Convertido",    pts:50, unit:"por lead"    },
  { key:"ev",  emoji:"💪", label:"Evento",             pts:10, unit:"por atleta"  },
];

const PRIZES = [
  { emoji:"🥇", label:"1.º lugar", amount:250, color:"#F5C518" },
  { emoji:"🥈", label:"2.º lugar", amount:100, color:"#B8C4CC" },
  { emoji:"🥉", label:"3.º lugar", amount:50,  color:"#CD7F32" },
];

const ADMIN_PASS = "cf2024";

const P = {
  bg:"#080810", surface:"#0f0f1a", card:"#13131f", border:"#1e1e30",
  border2:"#2a2a40", red:"#e8000d", redDim:"#7a0008", white:"#f0f0f8",
  grey:"#6b7280", grey2:"#9ca3af", green:"#10b981", input:"#0a0a14",
};
const mono = "'JetBrains Mono', 'Fira Mono', monospace";
const sans = "'Inter', 'Helvetica Neue', Arial, sans-serif";

function emptyCoach() {
  return {
    weeks: Object.fromEntries(WEEKS.map(w => [w, Object.fromEntries(RULES.map(r => [r.key, 0]))])),
    churnStart:"", churnLeft:"", activeAthletes:"", avgAttendance:"",
  };
}
function initData() {
  return Object.fromEntries(COACHES.map(c => [c, emptyCoach()]));
}
function calcIndicatorPts(d) {
  return WEEKS.reduce((sum, w) =>
    sum + RULES.reduce((s, r) => s + (Number(d.weeks[w][r.key]) || 0) * r.pts, 0), 0);
}
function calcChurn(start, left) {
  const s = Number(start), l = Number(left);
  if (!s) return null;
  return Math.max(0, (l / s) * 100);
}
function churnPts(start, left) {
  const c = calcChurn(start, left);
  return c !== null && c < 2 ? 100 : 0;
}
function calcBonusPts(tasks, coach) {
  return (tasks || []).reduce((sum, t) => sum + (t.awarded?.[coach] ? Number(t.pts) || 0 : 0), 0);
}
function calcTotal(d, tasks, coach) {
  return calcIndicatorPts(d) + churnPts(d.churnStart, d.churnLeft) + calcBonusPts(tasks, coach);
}

function loadState() {
  try {
    const d = localStorage.getItem("cf_data");
    const t = localStorage.getItem("cf_tasks");
    const h = localStorage.getItem("cf_history");
    return {
      data:    d ? JSON.parse(d) : initData(),
      tasks:   t ? JSON.parse(t) : [],
      history: h ? JSON.parse(h) : [],
    };
  } catch {
    return { data: initData(), tasks: [], history: [] };
  }
}
function saveState(data, tasks, history) {
  try {
    localStorage.setItem("cf_data",    JSON.stringify(data));
    localStorage.setItem("cf_tasks",   JSON.stringify(tasks));
    localStorage.setItem("cf_history", JSON.stringify(history));
  } catch {}
}

function NavBtn({ children, active, onClick }) {
  return (
    <button onClick={onClick} style={{
      background: active ? P.red : "transparent",
      color: active ? "#fff" : P.grey,
      border:"none", borderRadius:8, padding:"6px 14px",
      fontWeight:600, fontSize:13, cursor:"pointer", fontFamily:sans,
    }}>{children}</button>
  );
}
function SectionTitle({ children }) {
  return <div style={{ fontSize:17, fontWeight:800, letterSpacing:"-0.3px", marginBottom:12, marginTop:4 }}>{children}</div>;
}
function MiniCard({ label, value, color }) {
  return (
    <div style={{ background:P.card, border:`1px solid ${P.border}`, borderRadius:12, padding:"14px 16px", textAlign:"center" }}>
      <div style={{ fontSize:10, color:P.grey, textTransform:"uppercase", letterSpacing:1.5, marginBottom:6 }}>{label}</div>
      <div style={{ fontSize:28, fontWeight:900, color, fontFamily:mono }}>{value}</div>
    </div>
  );
}
function Tag({ label, val, color }) {
  return <span style={{ fontSize:11, color: color || P.grey }}>{label}: <strong>{val}</strong></span>;
}
function StepBtn({ children, onClick, red }) {
  return (
    <button onClick={onClick} style={{
      background: red ? P.red : P.border, border:"none", color:"#fff",
      width:34, height:34, borderRadius:8, fontSize:18, cursor:"pointer",
      fontWeight:700, display:"flex", alignItems:"center", justifyContent:"center",
    }}>{children}</button>
  );
}
const cardStyle = () => ({ background:P.card, border:`1px solid ${P.border}`, borderRadius:14, padding:"18px 20px" });
const inpStyle  = () => ({
  width:"100%", background:P.input, border:`1px solid ${P.border2}`, borderRadius:10,
  padding:"11px 14px", color:P.white, fontSize:14, outline:"none",
  boxSizing:"border-box", fontFamily:sans,
});
const btnStyle  = () => ({
  width:"100%", background:P.red, color:"#fff", border:"none", borderRadius:10,
  padding:"13px", fontWeight:700, fontSize:15, cursor:"pointer", fontFamily:sans,
});

export default function App() {
  const [screen,   setScreen]   = useState("login");
  const [coach,    setCoach]    = useState(null);
  const [isAdmin,  setIsAdmin]  = useState(false);
  const [week,     setWeek]     = useState("S1");
  const [loginVal, setLoginVal] = useState("");
  const [passVal,  setPassVal]  = useState("");
  const [loginErr, setLoginErr] = useState("");
  const [toast,    setToast]    = useState(null);
  const [data,     setData]     = useState(() => loadState().data);
  const [tasks,    setTasks]    = useState(() => loadState().tasks);
  const [history,  setHistory]  = useState(() => loadState().history);
  const [newLabel, setNewLabel] = useState("");
  const [newPts,   setNewPts]   = useState(25);

  useEffect(() => { saveState(data, tasks, history); }, [data, tasks, history]);

  function showToast(msg) {
    setToast(msg);
    setTimeout(() => setToast(null), 2200);
  }

  const scores = [...COACHES]
    .map(c => ({ coach:c, pts: calcTotal(data[c], tasks, c) }))
    .sort((a, b) => b.pts - a.pts);
  const getRank = name => scores.findIndex(s => s.coach === name) + 1;

  function doLogin() {
    const name = COACHES.find(c => c.toLowerCase() === loginVal.trim().toLowerCase());
    if (name) {
      setCoach(name); setIsAdmin(false); setScreen("dash"); setLoginErr("");
    } else if (loginVal.trim().toLowerCase() === "admin" && passVal === ADMIN_PASS) {
      setIsAdmin(true); setCoach(null); setScreen("rank"); setLoginErr("");
    } else {
      setLoginErr("Nome não reconhecido. Tenta novamente.");
    }
  }
  function doLogout() {
    setScreen("login"); setCoach(null); setIsAdmin(false); setLoginVal(""); setPassVal("");
  }
  function setEntry(c, w, key, v) {
    setData(prev => ({
      ...prev,
      [c]: { ...prev[c], weeks: { ...prev[c].weeks, [w]: { ...prev[c].weeks[w], [key]: Math.max(0, Number(v)||0) } } }
    }));
  }
  function setMeta(c, field, v) {
    setData(prev => ({ ...prev, [c]: { ...prev[c], [field]: v } }));
  }
  function addTask() {
    if (!newLabel.trim()) return;
    setTasks(prev => [...prev, { id: Date.now(), label: newLabel.trim(), pts: newPts, awarded:{} }]);
    setNewLabel(""); setNewPts(25); showToast("Tarefa criada! ⚡");
  }
  function toggleAward(taskId, coachName) {
    setTasks(prev => prev.map(t =>
      t.id === taskId ? { ...t, awarded: { ...t.awarded, [coachName]: !t.awarded?.[coachName] } } : t
    ));
  }
  function deleteTask(id) { setTasks(prev => prev.filter(t => t.id !== id)); }
  function doReset() {
    if (!window.confirm("Guardar histórico de " + month + " e reiniciar dados?")) return;
    const snapshot = {
      month, year: new Date().getFullYear(),
      date: new Date().toLocaleDateString("pt-PT"),
      ranking: scores.map((s, i) => ({
        pos: i + 1, coach: s.coach, pts: s.pts,
        prize: i < 3 ? PRIZES[i].amount : 0,
        indPts: calcIndicatorPts(data[s.coach]),
        churnPts: churnPts(data[s.coach].churnStart, data[s.coach].churnLeft),
        bonusPts: calcBonusPts(tasks, s.coach),
        churn: calcChurn(data[s.coach].churnStart, data[s.coach].churnLeft),
      })),
    };
    setHistory(prev => [snapshot, ...prev]);
    setData(initData()); setTasks([]);
    showToast("Histórico guardado! Dados reiniciados. ✅");
  }

  const month     = MONTHS[new Date().getMonth()];
  const coachData = coach ? data[coach] : null;
  const rank      = coach ? getRank(coach) : 0;
  const totalPts  = coach ? calcTotal(coachData, tasks, coach) : 0;
  const prize     = rank >= 1 && rank <= 3 ? PRIZES[rank - 1] : null;

  if (screen === "login") return (
    <div style={{ minHeight:"100vh", background:P.bg, display:"flex", alignItems:"center", justifyContent:"center",
      fontFamily:sans, backgroundImage:"radial-gradient(ellipse 80% 50% at 50% -10%, #3a000822 0%, transparent 60%)" }}>
      <div style={{ width:360, padding:"48px 36px", background:P.card, border:`1px solid ${P.border2}`, borderRadius:20 }}>
        <div style={{ textAlign:"center", marginBottom:36 }}>
          <div style={{ fontSize:40, marginBottom:12 }}>⚡</div>
          <div style={{ fontSize:22, fontWeight:800, color:P.white, letterSpacing:"-0.5px" }}>
            CF <span style={{ color:P.red }}>Performance</span>
          </div>
          <div style={{ fontSize:12, color:P.grey, marginTop:6, letterSpacing:1, textTransform:"uppercase" }}>{month}</div>
        </div>
        <input style={inpStyle()} placeholder="O teu nome (ex: Karina)"
          value={loginVal} onChange={e => setLoginVal(e.target.value)}
          onKeyDown={e => e.key === "Enter" && doLogin()} autoFocus />
        {loginVal.trim().toLowerCase() === "admin" && (
          <input style={{ ...inpStyle(), marginTop:10 }} type="password" placeholder="Password admin"
            value={passVal} onChange={e => setPassVal(e.target.value)}
            onKeyDown={e => e.key === "Enter" && doLogin()} />
        )}
        <button style={{ ...btnStyle(), marginTop:14 }} onClick={doLogin}>Entrar →</button>
        {loginErr && <div style={{ color:P.red, fontSize:12, textAlign:"center", marginTop:8 }}>{loginErr}</div>}
        <div style={{ marginTop:24, fontSize:11, color:P.border2, textAlign:"center" }}>{COACHES.join("  ·  ")}</div>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight:"100vh", background:P.bg, fontFamily:sans, color:P.white }}>
      <nav style={{ background:P.surface, borderBottom:`1px solid ${P.border}`, display:"flex", alignItems:"center",
        justifyContent:"space-between", padding:"0 24px", height:56, position:"sticky", top:0, zIndex:100 }}>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <span style={{ color:P.red, fontSize:18 }}>⚡</span>
          <span style={{ fontWeight:800, fontSize:15, letterSpacing:"-0.3px" }}>CF <span style={{ color:P.red }}>Performance</span></span>
          <span style={{ fontSize:11, color:P.grey, background:P.border, borderRadius:6, padding:"2px 8px", marginLeft:4 }}>{month}</span>
        </div>
        <div style={{ display:"flex", gap:4 }}>
          {!isAdmin && <>
            <NavBtn active={screen==="dash"}  onClick={() => setScreen("dash")}>Dashboard</NavBtn>
            <NavBtn active={screen==="entry"} onClick={() => setScreen("entry")}>Registar</NavBtn>
          </>}
          <NavBtn active={screen==="rank"} onClick={() => setScreen("rank")}>Ranking</NavBtn>
          {isAdmin && <NavBtn active={screen==="hist"} onClick={() => setScreen("hist")}>Histórico</NavBtn>}
          <NavBtn active={false} onClick={doLogout}>Sair</NavBtn>
        </div>
      </nav>

      <div style={{ maxWidth:880, margin:"0 auto", padding:"32px 20px" }}>

        {screen === "dash" && coach && (() => {
          const d = coachData;
          const indP = calcIndicatorPts(d);
          const chP  = churnPts(d.churnStart, d.churnLeft);
          const bP   = calcBonusPts(tasks, coach);
          const ch   = calcChurn(d.churnStart, d.churnLeft);
          return <>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:32, flexWrap:"wrap", gap:16 }}>
              <div>
                <div style={{ fontSize:11, color:P.grey, letterSpacing:2, textTransform:"uppercase", marginBottom:6 }}>Olá,</div>
                <div style={{ fontSize:34, fontWeight:900, letterSpacing:"-1.5px", display:"flex", alignItems:"center", gap:12 }}>
                  {coach} {prize && <span style={{ fontSize:28 }}>{prize.emoji}</span>}
                </div>
                {prize
                  ? <div style={{ fontSize:13, color:prize.color, fontWeight:700, marginTop:4 }}>{prize.label} · prémio de {prize.amount}€</div>
                  : <div style={{ fontSize:13, color:P.grey, marginTop:4 }}>{rank}º lugar este mês</div>}
              </div>
              <div style={{ textAlign:"right" }}>
                <div style={{ fontSize:11, color:P.grey, letterSpacing:2, textTransform:"uppercase", marginBottom:4 }}>Total de pontos</div>
                <div style={{ fontSize:52, fontWeight:900, color:P.red, letterSpacing:"-3px", lineHeight:1, fontFamily:mono }}>{totalPts}</div>
              </div>
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:10, marginBottom:20 }}>
              <MiniCard label="Indicadores"   value={indP} color={P.white} />
              <MiniCard label="Bónus Churn"   value={chP}  color={chP > 0 ? P.green : P.grey} />
              <MiniCard label="Tarefas Extra" value={bP}   color={bP > 0 ? "#a855f7" : P.grey} />
            </div>
            <SectionTitle>Indicadores</SectionTitle>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(2,1fr)", gap:10, marginBottom:24 }}>
              {RULES.map(rule => {
                const total = WEEKS.reduce((s,w) => s + (Number(d.weeks[w][rule.key])||0), 0);
                return (
                  <div key={rule.key} style={cardStyle()}>
                    <div style={{ fontSize:11, color:P.grey, textTransform:"uppercase", letterSpacing:1.5, marginBottom:6 }}>
                      {rule.emoji} {rule.label}
                    </div>
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-end" }}>
                      <div style={{ fontSize:34, fontWeight:900, letterSpacing:"-1px", fontFamily:mono }}>{total}</div>
                      <div style={{ fontSize:12, color:P.red, fontWeight:700 }}>+{total * rule.pts} pts</div>
                    </div>
                  </div>
                );
              })}
            </div>
            <SectionTitle>Churn da carteira</SectionTitle>
            <div style={{ ...cardStyle(), marginBottom:24 }}>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:16, alignItems:"center" }}>
                <div>
                  <div style={{ fontSize:11, color:P.grey, marginBottom:6 }}>Atletas no início</div>
                  <input style={inpStyle()} type="number" placeholder="0" value={d.churnStart}
                    onChange={e => setMeta(coach,"churnStart",e.target.value)} />
                </div>
                <div>
                  <div style={{ fontSize:11, color:P.grey, marginBottom:6 }}>Atletas que saíram</div>
                  <input style={inpStyle()} type="number" placeholder="0" value={d.churnLeft}
                    onChange={e => setMeta(coach,"churnLeft",e.target.value)} />
                </div>
                <div style={{ textAlign:"center" }}>
                  {ch === null
                    ? <div style={{ color:P.grey, fontSize:12 }}>Introduz os dados</div>
                    : <>
                        <div style={{ fontSize:36, fontWeight:900, color: ch<2 ? P.green : P.red, fontFamily:mono }}>{ch.toFixed(1)}%</div>
                        <div style={{ fontSize:11, fontWeight:700, color: ch<2 ? P.green : P.red }}>
                          {ch < 2 ? "✅ Bónus +100 pts" : "❌ Sem bónus"}
                        </div>
                      </>
                  }
                </div>
              </div>
            </div>
            <SectionTitle>Métricas da carteira</SectionTitle>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:24 }}>
              <div style={cardStyle()}>
                <div style={{ fontSize:11, color:P.grey, marginBottom:8 }}>👤 Atletas ativos</div>
                <input style={{ ...inpStyle(), fontSize:28, fontWeight:900, textAlign:"center" }}
                  type="number" placeholder="0" value={d.activeAthletes}
                  onChange={e => setMeta(coach,"activeAthletes",e.target.value)} />
              </div>
              <div style={cardStyle()}>
                <div style={{ fontSize:11, color:P.grey, marginBottom:8 }}>📈 Presença média (%)</div>
                <input style={{ ...inpStyle(), fontSize:28, fontWeight:900, textAlign:"center" }}
                  type="number" placeholder="0" value={d.avgAttendance}
                  onChange={e => setMeta(coach,"avgAttendance",e.target.value)} />
              </div>
            </div>
            {tasks.length > 0 && <>
              <SectionTitle>Tarefas extra</SectionTitle>
              {tasks.map(t => (
                <div key={t.id} style={{ ...cardStyle(), display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8 }}>
                  <div>
                    <div style={{ fontWeight:700, fontSize:14 }}>{t.label}</div>
                    <div style={{ fontSize:11, color:P.red, fontWeight:700, marginTop:2 }}>+{t.pts} pts</div>
                  </div>
                  <div style={{ padding:"6px 14px", borderRadius:8, fontWeight:700, fontSize:12,
                    background: t.awarded?.[coach] ? "#10b98122" : P.border,
                    color: t.awarded?.[coach] ? P.green : P.grey,
                    border:`1px solid ${t.awarded?.[coach] ? P.green : P.border2}` }}>
                    {t.awarded?.[coach] ? "✅ Concluída" : "⏳ Pendente"}
                  </div>
                </div>
              ))}
            </>}
            <button style={{ ...btnStyle(), marginTop:16 }} onClick={() => setScreen("entry")}>
              Registar esta semana →
            </button>
          </>;
        })()}

        {screen === "entry" && coach && (() => {
          const d = coachData;
          const weekData = d.weeks[week];
          const wPts = RULES.reduce((s,r) => s + (Number(weekData[r.key])||0)*r.pts, 0);
          const ch   = calcChurn(d.churnStart, d.churnLeft);
          return <>
            <SectionTitle>Registar — {coach}</SectionTitle>
            <div style={{ display:"flex", gap:8, marginBottom:8 }}>
              {WEEKS.map(w => (
                <button key={w} onClick={() => setWeek(w)} style={{
                  background: week===w ? P.red : P.card, color: week===w ? "#fff" : P.grey,
                  border:`1px solid ${week===w ? P.red : P.border2}`, borderRadius:8,
                  padding:"7px 16px", fontSize:13, fontWeight:700, cursor:"pointer" }}>
                  Semana {w.replace("S","")}
                </button>
              ))}
            </div>
            <div style={{ fontSize:12, color:P.red, fontWeight:700, marginBottom:20 }}>Esta semana: {wPts} pontos</div>
            {RULES.map(rule => (
              <div key={rule.key} style={{ ...cardStyle(), display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8 }}>
                <div style={{ display:"flex", alignItems:"center", gap:14 }}>
                  <span style={{ fontSize:26, width:36, textAlign:"center" }}>{rule.emoji}</span>
                  <div>
                    <div style={{ fontWeight:700, fontSize:14 }}>{rule.label}</div>
                    <div style={{ fontSize:11, color:P.red, fontWeight:700 }}>+{rule.pts} pts · {rule.unit}</div>
                  </div>
                </div>
                <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                  <StepBtn onClick={() => setEntry(coach,week,rule.key,(Number(weekData[rule.key])||0)-1)}>−</StepBtn>
                  <input style={{ ...inpStyle(), width:64, textAlign:"center", fontSize:20, fontWeight:900, padding:"8px 0" }}
                    type="number" value={weekData[rule.key]}
                    onChange={e => setEntry(coach,week,rule.key,e.target.value)} />
                  <StepBtn red onClick={() => setEntry(coach,week,rule.key,(Number(weekData[rule.key])||0)+1)}>+</StepBtn>
                </div>
              </div>
            ))}
            <div style={{ ...cardStyle(), marginTop:16 }}>
              <div style={{ fontSize:11, color:P.grey, textTransform:"uppercase", letterSpacing:1.5, marginBottom:12 }}>
                🏆 Churn — bónus mensal
              </div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:12, alignItems:"center" }}>
                <div>
                  <div style={{ fontSize:11, color:P.grey, marginBottom:4 }}>Início do mês</div>
                  <input style={inpStyle()} type="number" placeholder="0" value={d.churnStart}
                    onChange={e => setMeta(coach,"churnStart",e.target.value)} />
                </div>
                <div>
                  <div style={{ fontSize:11, color:P.grey, marginBottom:4 }}>Saídas</div>
                  <input style={inpStyle()} type="number" placeholder="0" value={d.churnLeft}
                    onChange={e => setMeta(coach,"churnLeft",e.target.value)} />
                </div>
                <div style={{ textAlign:"center" }}>
                  {ch === null
                    ? <div style={{ color:P.grey, fontSize:12 }}>—</div>
                    : <>
                        <div style={{ fontSize:28, fontWeight:900, color: ch<2 ? P.green : P.red, fontFamily:mono }}>{ch.toFixed(1)}%</div>
                        <div style={{ fontSize:11, fontWeight:700, color: ch<2 ? P.green : P.red }}>{ch < 2 ? "✅ +100 pts" : "❌ Sem bónus"}</div>
                      </>
                  }
                </div>
              </div>
            </div>
            <button style={{ ...btnStyle(), marginTop:20 }}
              onClick={() => { showToast("Guardado! 💪"); setScreen("dash"); }}>
              Guardar →
            </button>
          </>;
        })()}

        {screen === "hist" && isAdmin && (() => (
          <>
            <div style={{ textAlign:"center", marginBottom:32 }}>
              <div style={{ fontSize:11, color:P.grey, letterSpacing:2, textTransform:"uppercase", marginBottom:8 }}>Arquivo</div>
              <div style={{ fontSize:30, fontWeight:900, letterSpacing:"-1px" }}>Histórico de meses 📅</div>
            </div>
            {history.length === 0 && (
              <div style={{ textAlign:"center", padding:"48px 0", color:P.grey, fontSize:14 }}>
                <div style={{ fontSize:40, marginBottom:12 }}>📭</div>
                Ainda não há histórico. O primeiro registo aparece aqui quando fizeres o reset do mês.
              </div>
            )}
            {history.map((snap, si) => (
              <div key={si} style={{ ...cardStyle(), marginBottom:20 }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
                  <div>
                    <div style={{ fontSize:18, fontWeight:900, letterSpacing:"-0.5px" }}>{snap.month} {snap.year}</div>
                    <div style={{ fontSize:11, color:P.grey, marginTop:2 }}>Fechado em {snap.date}</div>
                  </div>
                  <div style={{ fontSize:11, color:P.grey, background:P.border, borderRadius:6, padding:"4px 10px" }}>
                    {snap.ranking[0]?.coach} venceu
                  </div>
                </div>
                {snap.ranking.map((r) => {
                  const p = r.pos <= 3 ? PRIZES[r.pos - 1] : null;
                  return (
                    <div key={r.coach} style={{ display:"flex", alignItems:"center", gap:12,
                      padding:"12px 16px", marginBottom:6,
                      background: r.pos <= 3 ? P.surface : P.input,
                      border:`1px solid ${p ? p.color+"33" : P.border}`, borderRadius:10 }}>
                      <div style={{ fontSize:18, width:32, textAlign:"center", fontWeight:900, color: p ? p.color : P.grey }}>
                        {p ? p.emoji : r.pos}
                      </div>
                      <div style={{ flex:1 }}>
                        <div style={{ fontWeight:700, fontSize:14 }}>{r.coach}</div>
                        <div style={{ display:"flex", gap:10, marginTop:2 }}>
                          <span style={{ fontSize:11, color:P.grey }}>ind: <strong style={{color:P.white}}>{r.indPts}</strong></span>
                          <span style={{ fontSize:11, color: r.churnPts > 0 ? P.green : P.grey }}>churn: <strong>{r.churnPts}</strong></span>
                          <span style={{ fontSize:11, color: r.bonusPts > 0 ? "#a855f7" : P.grey }}>extra: <strong>{r.bonusPts}</strong></span>
                          {r.churn !== null && <span style={{ fontSize:11, color: r.churn < 2 ? P.green : P.red }}>{r.churn.toFixed(1)}%</span>}
                        </div>
                      </div>
                      <div style={{ textAlign:"right" }}>
                        <div style={{ fontSize:22, fontWeight:900, color: p ? p.color : P.white, fontFamily:mono }}>{r.pts}</div>
                        {p && <div style={{ fontSize:11, color:p.color, fontWeight:700 }}>{p.amount}€</div>}
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
          </>
        ))()}

        {screen === "rank" && (() => (
          <>
            <div style={{ textAlign:"center", marginBottom:32 }}>
              <div style={{ fontSize:11, color:P.grey, letterSpacing:2, textTransform:"uppercase", marginBottom:8 }}>Ranking de {month}</div>
              <div style={{ fontSize:30, fontWeight:900, letterSpacing:"-1px" }}>Quem está na frente? 🔥</div>
            </div>
            <div style={{ display:"flex", gap:10, marginBottom:32 }}>
              {PRIZES.map(p => (
                <div key={p.label} style={{ flex:1, textAlign:"center", padding:"20px 12px", background:P.card,
                  border:`1px solid ${p.color}33`, borderRadius:14 }}>
                  <div style={{ fontSize:30, marginBottom:6 }}>{p.emoji}</div>
                  <div style={{ fontSize:26, fontWeight:900, color:p.color, fontFamily:mono }}>{p.amount}€</div>
                  <div style={{ fontSize:11, color:P.grey, fontWeight:700, marginTop:2 }}>{p.label}</div>
                </div>
              ))}
            </div>
            {scores.map((s, i) => {
              const p  = i < 3 ? PRIZES[i] : null;
              const d  = data[s.coach];
              const indP = calcIndicatorPts(d);
              const chP  = churnPts(d.churnStart, d.churnLeft);
              const bP   = calcBonusPts(tasks, s.coach);
              const ch   = calcChurn(d.churnStart, d.churnLeft);
              return (
                <div key={s.coach} style={{ display:"flex", alignItems:"center", gap:14, padding:"16px 20px",
                  background: i < 3 ? P.card : "#0c0c16",
                  border:`1px solid ${p ? p.color+"33" : P.border}`, borderRadius:14, marginBottom:8 }}>
                  <div style={{ fontSize:22, width:36, textAlign:"center", fontWeight:900, color: p ? p.color : P.grey }}>
                    {p ? p.emoji : i+1}
                  </div>
                  <div style={{ flex:1 }}>
                    <div style={{ fontWeight:800, fontSize:16, marginBottom:4 }}>{s.coach}</div>
                    <div style={{ display:"flex", gap:10, flexWrap:"wrap" }}>
                      <Tag label="indicadores" val={indP} />
                      <Tag label="churn" val={chP} color={chP > 0 ? P.green : P.grey} />
                      <Tag label="extra" val={bP} color={bP > 0 ? "#a855f7" : P.grey} />
                      {ch !== null && <Tag label="churn%" val={`${ch.toFixed(1)}%`} color={ch<2 ? P.green : P.red} />}
                    </div>
                  </div>
                  <div style={{ textAlign:"right" }}>
                    <div style={{ fontSize:30, fontWeight:900, color: p ? p.color : P.white, fontFamily:mono }}>{s.pts}</div>
                    <div style={{ fontSize:10, color:P.grey }}>pts</div>
                    {p && <div style={{ fontSize:12, color:p.color, fontWeight:700 }}>{p.amount}€</div>}
                  </div>
                </div>
              );
            })}
            {isAdmin && (
              <div style={{ marginTop:40 }}>
                <SectionTitle>⚡ Tarefas Extra</SectionTitle>
                <div style={{ fontSize:12, color:P.grey, marginBottom:20 }}>
                  Cria tarefas e atribui pontos manualmente a quem cumpriu.
                </div>
                <div style={{ ...cardStyle(), marginBottom:20 }}>
                  <div style={{ fontSize:11, color:P.grey, textTransform:"uppercase", letterSpacing:1.5, marginBottom:12 }}>Nova tarefa</div>
                  <div style={{ display:"flex", gap:10, flexWrap:"wrap", alignItems:"center" }}>
                    <input style={{ ...inpStyle(), flex:2, minWidth:200 }}
                      placeholder="Ex: Publicar story no Instagram"
                      value={newLabel} onChange={e => setNewLabel(e.target.value)}
                      onKeyDown={e => e.key === "Enter" && addTask()} />
                    <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                      <input style={{ ...inpStyle(), width:70, textAlign:"center" }}
                        type="number" value={newPts} onChange={e => setNewPts(e.target.value)} />
                      <span style={{ fontSize:12, color:P.grey, whiteSpace:"nowrap" }}>pts</span>
                    </div>
                    <button style={{ ...btnStyle(), width:"auto", padding:"11px 22px" }} onClick={addTask}>+ Criar</button>
                  </div>
                </div>
                {tasks.length === 0 && (
                  <div style={{ color:P.grey, fontSize:13, textAlign:"center", padding:"24px 0" }}>
                    Ainda não criaste nenhuma tarefa.
                  </div>
                )}
                {tasks.map(t => (
                  <div key={t.id} style={{ ...cardStyle(), marginBottom:12 }}>
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}>
                      <div>
                        <div style={{ fontWeight:700, fontSize:15 }}>{t.label}</div>
                        <div style={{ fontSize:11, color:P.red, fontWeight:700, marginTop:2 }}>+{t.pts} pts por coach</div>
                      </div>
                      <button onClick={() => deleteTask(t.id)} style={{ background:"transparent",
                        border:`1px solid ${P.border2}`, color:P.grey, borderRadius:8,
                        padding:"6px 12px", cursor:"pointer", fontSize:12 }}>Eliminar</button>
                    </div>
                    <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
                      {COACHES.map(c => {
                        const on = t.awarded?.[c];
                        return (
                          <button key={c} onClick={() => toggleAward(t.id, c)} style={{
                            background: on ? "#10b98122" : P.border,
                            border:`1px solid ${on ? P.green : P.border2}`,
                            color: on ? P.green : P.grey,
                            borderRadius:8, padding:"8px 16px", fontWeight:700, fontSize:13, cursor:"pointer" }}>
                            {on ? "✅" : "○"} {c}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
                <div style={{ marginTop:32, padding:"16px 20px", background:"#1a0505", border:`1px solid ${P.redDim}`, borderRadius:12 }}>
                  <div style={{ fontSize:13, fontWeight:700, marginBottom:4 }}>⚠️ Reiniciar mês</div>
                  <div style={{ fontSize:12, color:P.grey, marginBottom:12 }}>
                    Apaga todos os dados. Faz isto no início de cada mês depois de registares os prémios.
                  </div>
                  <button onClick={doReset} style={{ background:P.redDim, color:"#ffaaaa",
                    border:`1px solid ${P.red}`, borderRadius:8, padding:"8px 18px",
                    fontWeight:700, fontSize:13, cursor:"pointer" }}>
                    Reiniciar todos os dados
                  </button>
                </div>
              </div>
            )}
          </>
        ))()}
      </div>

      {toast && (
        <div style={{ position:"fixed", bottom:28, left:"50%", transform:"translateX(-50%)",
          background:P.red, color:"#fff", padding:"11px 28px", borderRadius:50,
          fontWeight:700, fontSize:13, zIndex:9999, boxShadow:"0 4px 32px #e8000d55", whiteSpace:"nowrap" }}>
          {toast}
        </div>
      )}
    </div>
  );
}
