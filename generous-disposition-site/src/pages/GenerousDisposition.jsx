import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";

const SECTIONS = ["philosophy", "framework", "decompose", "syntax", "measurement", "showcases", "implement"];
const sLabels = { philosophy: "Philosophy", framework: "6 Pillars", decompose: "Decompose", syntax: "Syntax", measurement: "Measure", showcases: "Showcases", implement: "Implement" };

const TOKEN_CASES = [
  { title: "Blog Post", naive: { prompt: 45, rounds: 3, perRound: [850, 1200, 900] }, gd: { prompt: 180, rounds: 1, perRound: [920] } },
  { title: "API Endpoint", naive: { prompt: 30, rounds: 4, perRound: [600, 750, 800, 500] }, gd: { prompt: 210, rounds: 1, perRound: [550] } },
  { title: "Data Analysis", naive: { prompt: 55, rounds: 3, perRound: [700, 950, 1100] }, gd: { prompt: 195, rounds: 1, perRound: [1050] } },
  { title: "Email Draft", naive: { prompt: 25, rounds: 2, perRound: [350, 400] }, gd: { prompt: 120, rounds: 1, perRound: [380] } },
];

function calcTCC(c) {
  let t = 0, a = c.prompt;
  for (let i = 0; i < c.rounds; i++) { t += a + c.perRound[i]; if (i < c.rounds - 1) a += c.perRound[i] + 40; }
  return t;
}

const PILLARS = [
  { key: "intent", icon: "◎", n: "01", label: "Intent", full: "Generous Intent", short: "WHAT + WHY + FOR WHOM", desc: "Declare the task, its purpose, and the audience. Removes guessing, eliminates hedge-words and generic outputs.", example: "INTENT: Generate a NestJS controller\nWHY: New endpoint for PinDay booking API\nFOR: Senior backend dev reviewing a PR" },
  { key: "context", icon: "◈", n: "02", label: "Context", full: "Generous Context", short: "ALL RELEVANT STATE UPFRONT", desc: "Front-load every relevant detail. Don't drip-feed across rounds. For structured data, use TOON encoding inside this block.", example: "CONTEXT:\n  stack: NestJS + TypeScript + Prisma\n  entity: Booking (id, userId, date, status)\n  auth: JWT guard already implemented" },
  { key: "constraints", icon: "◇", n: "03", label: "Constraints", full: "Generous Constraints", short: "FORMAT + LENGTH + BOUNDARIES", desc: "Define output shape, length, and what to exclude. Constraints are cheaper than corrections.", example: "CONSTRAINTS:\n  format: single file, controller + DTOs\n  length: < 120 lines\n  exclude: no tests, no swagger" },
  { key: "examples", icon: "△", n: "04", label: "Examples", full: "Generous Examples", short: "SHOW THE SHAPE", desc: "One good example beats fifty words of description. Even a fragment anchors the model's generation.", example: "EXAMPLE:\n  @Post('/book')\n  async createBooking(\n    @Body() dto: CreateBookingDto\n  ): Promise<BookingResponse> { ... }" },
  { key: "assumptions", icon: "○", n: "05", label: "Assumptions", full: "Generous Assumptions", short: "STATE WHAT YOU ASSUME", desc: "Every unstated assumption is a coin-flip. Each wrong guess costs a correction round. Make them explicit.", example: "ASSUMPTIONS:\n  - DB connection configured\n  - BookingService.create() exists\n  - Error handling via global filter" },
  { key: "decompose", icon: "◆", n: "06", label: "Decompose", full: "Generous Decomposition", short: "KNOW WHEN TO SPLIT", desc: "Not every task fits one prompt. When complexity exceeds reliable generation, split into sub-tasks — each with its own GD structure. Inspired by Chip Huyen's emphasis on task decomposition (AI Engineering, p.248).", example: "DECOMPOSE:\n  task-1: Generate Prisma schema\n  task-2: Create controller + DTOs\n  task-3: Write integration tests\n  strategy: sequential (each uses prior output)\n  parallel: task-2 and task-3 can run after task-1" },
];

const SHOWCASES = [
  { tag: "BEFORE", color: "#ef4444", prompt: "Write me a function to process payments", response: "[Model guesses language, framework, provider...]\n\nUser: \"No, I meant TypeScript with Stripe\"\nUser: \"It needs webhooks too\"\nUser: \"Use my existing Customer model\"", rounds: "3-4 rounds · ~4,200 TCC" },
  { tag: "AFTER", color: "#22c55e", prompt: "INTENT: Stripe payment processing function\nWHY: PinDay deposit collection for bookings\nFOR: Production, TypeScript strict\n\nCONTEXT:\n  runtime: NestJS service class\n  provider: Stripe SDK (installed)\n  entity: Booking { id, amount, customerId }\n\nCONSTRAINTS:\n  - Handle payment_intent.succeeded webhook\n  - < 80 lines, typed PaymentResult\n\nASSUMPTIONS:\n  - Stripe customer exists\n  - Webhook signature in middleware", response: "[Correct code on first attempt — right\nlanguage, framework, types, error handling]", rounds: "1 round · ~780 TCC" },
];

// ── Decomposition Analyzer ──
const SPLIT_SIGNALS = [
  { pattern: /\b(and|also|plus|additionally|then|after that|furthermore)\b/gi, label: "Multiple objectives", weight: 2 },
  { pattern: /\b(create|build|write|generate|design|implement|refactor|test|document|deploy)\b/gi, label: "Action verbs", weight: 1, threshold: 2 },
  { pattern: /\b(frontend|backend|database|api|ui|test|deploy|migrate|config)\b/gi, label: "Distinct domains", weight: 2, threshold: 2 },
  { pattern: /\b(first|second|then|next|finally|step \d|phase)\b/gi, label: "Sequential steps", weight: 3 },
];

function analyzeDecomposition(text) {
  if (!text.trim()) return { score: 0, signals: [], suggestion: "empty" };
  const signals = [];
  let score = 0;
  const words = text.split(/\s+/).length;

  SPLIT_SIGNALS.forEach(s => {
    const matches = text.match(s.pattern) || [];
    const threshold = s.threshold || 1;
    if (matches.length >= threshold) {
      signals.push({ label: s.label, count: matches.length, matches: [...new Set(matches.map(m => m.toLowerCase()))].slice(0, 4) });
      score += s.weight * Math.min(matches.length, 5);
    }
  });

  if (words > 80) { score += 3; signals.push({ label: "Long task description", count: words, matches: [`${words} words`] }); }
  if (words > 150) { score += 3; signals.push({ label: "Very long description", count: words, matches: ["consider splitting into 3+ tasks"] }); }

  const level = score >= 8 ? "split" : score >= 4 ? "consider" : "single";
  return { score: Math.min(score, 15), signals, suggestion: level };
}

const GD_SYNTAX = `# Generous Disposition Prompt Structure

INTENT: [verb] + [object] + [deliverable]
WHY: [business context or purpose]
FOR: [audience / skill level / reviewer]

CONTEXT:
  [key]: [value]
  # TOON for tabular data:
  # records[N]{f1,f2}: row1,row2...

CONSTRAINTS:
  format: [expected shape]
  length: [size boundary]
  exclude: [what to omit]

EXAMPLE:
  [fragment of desired output]

ASSUMPTIONS:
  - [thing you take for granted]

DECOMPOSE:           # optional, when needed
  task-1: [sub-task description]
  task-2: [sub-task description]
  strategy: [sequential | parallel | hybrid]

---
[Optional free-text elaboration]`;

export default function GenerousDisposition() {
  const nav = useNavigate();
  const [sec, setSec] = useState("philosophy");
  const [pil, setPil] = useState(0);
  const [cas, setCas] = useState(0);
  const [showGD, setShowGD] = useState(false);
  const [anim, setAnim] = useState(0);
  const [decompText, setDecompText] = useState("Build a full-stack booking system with a React frontend, NestJS API, PostgreSQL database, Stripe payments integration, and then write tests and deploy to Render");
  const cc = TOKEN_CASES[cas];
  const nTCC = calcTCC(cc.naive), gTCC = calcTCC(cc.gd);
  const sav = Math.round((1 - gTCC / nTCC) * 100);
  useEffect(() => { setAnim(0); const t = setTimeout(() => setAnim(sav), 100); return () => clearTimeout(t); }, [cas, sav]);

  const decompResult = analyzeDecomposition(decompText);

  return (
    <div style={{ fontFamily: "'IBM Plex Mono','SF Mono',monospace", background: "#0a0a0b", color: "#e4e4e7", minHeight: "100vh", lineHeight: 1.6 }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@300;400;500;600;700&family=Space+Grotesk:wght@300;400;500;600;700&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}
        ::-webkit-scrollbar{width:4px}::-webkit-scrollbar-track{background:#18181b}::-webkit-scrollbar-thumb{background:#3f3f46;border-radius:2px}
        @keyframes fu{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
        @keyframes bg{from{width:0}}.fu{animation:fu .4s ease-out both}.bg{animation:bg .8s ease-out both}
        @keyframes pulse{0%,100%{opacity:.6}50%{opacity:1}}.pulse{animation:pulse 2s ease-in-out infinite}
        pre{overflow-x:auto}textarea:focus{outline:none;border-color:#a78bfa!important}
      `}</style>

      <header style={{ padding: "clamp(20px,5vw,40px) clamp(16px,4vw,32px) clamp(16px,3vw,24px)", borderBottom: "1px solid #27272a" }}>
        <div style={{ maxWidth: 960, margin: "0 auto" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6, flexWrap: "wrap" }}>
            <button onClick={() => nav("/")} style={{ background: "none", border: "1px solid #27272a", borderRadius: 6, color: "#71717a", cursor: "pointer", fontSize: 14, padding: "4px 8px", fontFamily: "'IBM Plex Mono',monospace", lineHeight: 1 }} title="Back to home">← back</button>
            <span style={{ fontSize: "clamp(22px,5vw,28px)", color: "#a78bfa", fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700 }}>◎</span>
            <h1 style={{ fontSize: "clamp(20px,5vw,28px)", fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, letterSpacing: -1, color: "#fafafa" }}>Generous Disposition</h1>
            <span style={{ fontSize: 10, color: "#a78bfa", background: "#1a1625", padding: "2px 8px", borderRadius: 10, fontWeight: 600 }}>6 PILLARS</span>
          </div>
          <p style={{ fontSize: "clamp(12px,2.5vw,14px)", color: "#71717a", maxWidth: 600, fontWeight: 300 }}>
            A framework for human-AI interaction that reduces token consumption by 76%+ through structured generosity. Now with Generous Decomposition.
          </p>
        </div>
      </header>

      <nav style={{ borderBottom: "1px solid #27272a", padding: "0 clamp(16px,4vw,32px)", position: "sticky", top: 0, background: "#0a0a0b", zIndex: 100, overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
        <div style={{ maxWidth: 960, margin: "0 auto", display: "flex", minWidth: "max-content" }}>
          {SECTIONS.map(s => (
            <button key={s} onClick={() => setSec(s)} style={{ padding: "12px clamp(8px,2vw,16px)", fontSize: "clamp(10px,2vw,12px)", fontFamily: "'IBM Plex Mono',monospace", fontWeight: sec === s ? 600 : 400, color: sec === s ? (s === "decompose" ? "#f59e0b" : "#a78bfa") : "#71717a", background: "none", border: "none", borderBottom: sec === s ? `2px solid ${s === "decompose" ? "#f59e0b" : "#a78bfa"}` : "2px solid transparent", cursor: "pointer", textTransform: "uppercase", letterSpacing: 1.2, whiteSpace: "nowrap" }}>
              {sLabels[s]}
            </button>
          ))}
        </div>
      </nav>

      <main style={{ maxWidth: 960, margin: "0 auto", padding: "clamp(20px,4vw,32px) clamp(16px,4vw,32px) 80px" }}>

        {/* ── PHILOSOPHY ── */}
        {sec === "philosophy" && (
          <div className="fu" style={{ display: "grid", gap: "clamp(16px,3vw,20px)" }}>
            <Tag>01 — THE MINDSET</Tag>
            <h2 style={H2}>Vagueness is expensive. Generosity is efficient.</h2>
            <Card>
              <Prose>Most people optimize prompts by making them shorter. This is backwards. A terse prompt forces the model into a guessing game — and every wrong guess costs a correction round that carries the <em>entire conversation history</em> forward.</Prose>
              <Prose><strong style={{ color: "#e4e4e7" }}>Generous Disposition</strong> is the principle that structured generosity in input — declaring intent, context, constraints, examples, assumptions, and decomposition strategy — produces radical efficiency in output.</Prose>
              <Prose last>It's the prompting equivalent of <strong style={{ color: "#a78bfa" }}>"measure twice, cut once."</strong></Prose>
            </Card>
            <div style={grid2}>
              <Card accent="#ef4444">
                <Lbl color="#ef4444">The Vague Loop</Lbl>
                <div style={{ fontSize: 13, color: "#a1a1aa" }}>Short prompt → Guess → Wrong → Correct → Guess again (growing context) → Eventually OK</div>
                <div style={{ fontSize: "clamp(16px,4vw,20px)", fontWeight: 700, color: "#ef4444", marginTop: 10, fontFamily: "'Space Grotesk',sans-serif" }}>~4,200 tokens</div>
              </Card>
              <Card accent="#22c55e">
                <Lbl color="#22c55e">The Generous Path</Lbl>
                <div style={{ fontSize: 13, color: "#a1a1aa" }}>Structured prompt (4× longer) → Full understanding → Correct first try → Done</div>
                <div style={{ fontSize: "clamp(16px,4vw,20px)", fontWeight: 700, color: "#22c55e", marginTop: 10, fontFamily: "'Space Grotesk',sans-serif" }}>~780 tokens</div>
              </Card>
            </div>
            <Card>
              <Lbl color="#818cf8">The Ecosystem</Lbl>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(160px,100%),1fr))", gap: 10 }}>
                {[
                  { layer: "Interaction", tool: "GD Framework", saves: "76% TCC", color: "#a78bfa" },
                  { layer: "Decomposition", tool: "6th Pillar", saves: "Compound accuracy", color: "#f59e0b" },
                  { layer: "Data Encoding", tool: "TOON Format", saves: "30-60% payload", color: "#22c55e" },
                  { layer: "Repo Context", tool: "CONTEXT.gdp", saves: "~96% session", color: "#3b82f6" },
                ].map(l => (
                  <div key={l.layer} style={{ padding: 10, background: "#0a0a0b", borderRadius: 6, border: "1px solid #27272a", borderLeft: `3px solid ${l.color}` }}>
                    <div style={{ fontSize: 11, color: "#71717a" }}>{l.layer}</div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "#fafafa" }}>{l.tool}</div>
                    <div style={{ fontSize: 12, color: l.color, fontWeight: 500 }}>{l.saves}</div>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        )}

        {/* ── FRAMEWORK ── */}
        {sec === "framework" && (
          <div className="fu" style={{ display: "grid", gap: "clamp(16px,3vw,20px)" }}>
            <Tag>02 — THE SIX PILLARS</Tag>
            <h2 style={H2}>Six dimensions of generosity</h2>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {PILLARS.map((pp, i) => (
                <button key={pp.key} onClick={() => setPil(i)} style={{ padding: "8px 12px", fontSize: "clamp(11px,2vw,12px)", fontFamily: "'IBM Plex Mono',monospace", color: pil === i ? "#0a0a0b" : "#a1a1aa", background: pil === i ? (i === 5 ? "#f59e0b" : "#a78bfa") : "#18181b", border: "1px solid", borderColor: pil === i ? (i === 5 ? "#f59e0b" : "#a78bfa") : "#27272a", borderRadius: 6, cursor: "pointer", fontWeight: pil === i ? 600 : 400 }}>
                  {pp.icon} {pp.label}
                </button>
              ))}
            </div>
            <div className="fu" key={pil}>
              <Card accent={pil === 5 ? "#f59e0b" : undefined}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
                  <div style={{ width: 44, height: 44, borderRadius: 10, background: pil === 5 ? "#f59e0b15" : "#a78bfa15", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, color: pil === 5 ? "#f59e0b" : "#a78bfa", flexShrink: 0 }}>{PILLARS[pil].icon}</div>
                  <div>
                    <div style={{ fontSize: 11, color: "#71717a" }}>PILLAR {PILLARS[pil].n}</div>
                    <h3 style={{ fontSize: "clamp(15px,3.5vw,18px)", fontWeight: 600, color: "#fafafa", fontFamily: "'Space Grotesk',sans-serif" }}>{PILLARS[pil].full}</h3>
                    <span style={{ fontSize: 12, color: pil === 5 ? "#f59e0b" : "#a78bfa", fontWeight: 500 }}>{PILLARS[pil].short}</span>
                  </div>
                </div>
                <Prose last>{PILLARS[pil].desc}</Prose>
                <div style={{ background: "#0a0a0b", borderRadius: 8, padding: "clamp(12px,3vw,20px)", border: "1px solid #27272a", marginTop: 14 }}>
                  <div style={{ fontSize: 11, color: "#71717a", marginBottom: 6, textTransform: "uppercase", letterSpacing: 1.5 }}>Example</div>
                  <pre style={{ fontSize: "clamp(11px,2.2vw,13px)", color: pil === 5 ? "#fbbf24" : "#a78bfa", whiteSpace: "pre-wrap", lineHeight: 1.6, fontFamily: "'IBM Plex Mono',monospace" }}>{PILLARS[pil].example}</pre>
                </div>
                {pil === 5 && (
                  <div style={{ marginTop: 16, padding: 14, background: "#f59e0b10", borderRadius: 8, border: "1px solid #f59e0b30" }}>
                    <div style={{ fontSize: 12, color: "#fbbf24", fontWeight: 600, marginBottom: 6 }}>When to Decompose</div>
                    <div style={{ fontSize: 13, color: "#a1a1aa", lineHeight: 1.6 }}>
                      Split when: more than 2 INTENT verbs, CONTEXT exceeds ~300 tokens, task spans multiple domains (frontend + backend + DB), or expected output exceeds reliable generation length. Try the <strong style={{ color: "#f59e0b" }}>Split Detector</strong> in the Decompose tab.
                    </div>
                  </div>
                )}
              </Card>
            </div>
          </div>
        )}

        {/* ── DECOMPOSE (NEW) ── */}
        {sec === "decompose" && (
          <div className="fu" style={{ display: "grid", gap: "clamp(16px,3vw,20px)" }}>
            <Tag color="#f59e0b">06 — GENEROUS DECOMPOSITION</Tag>
            <h2 style={{ ...H2, color: "#fafafa" }}>Know when to split</h2>
            <Prose last>The 6th pillar. Not every task fits one prompt. When complexity exceeds reliable generation, split into sub-tasks — each with its own GD structure. Paste a task description below to detect decomposition signals.</Prose>

            <Card accent="#f59e0b">
              <Lbl color="#f59e0b">Split Detector</Lbl>
              <textarea
                value={decompText}
                onChange={e => setDecompText(e.target.value)}
                placeholder="Paste your task description here..."
                style={{ width: "100%", minHeight: 100, padding: "clamp(10px,2vw,16px)", fontSize: "clamp(12px,2.2vw,13px)", lineHeight: 1.6, fontFamily: "'IBM Plex Mono',monospace", color: "#d4d4d8", background: "#0a0a0b", border: "1px solid #27272a", borderRadius: 8, resize: "vertical" }}
              />
              <div style={{ marginTop: 16, display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(280px,100%),1fr))", gap: 14 }}>
                {/* Verdict */}
                <div style={{ padding: 16, background: "#0a0a0b", borderRadius: 10, border: "1px solid #27272a", textAlign: "center" }}>
                  <div style={{ fontSize: 11, color: "#71717a", textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 8 }}>Verdict</div>
                  <div style={{
                    fontSize: "clamp(28px,7vw,40px)", fontWeight: 700, fontFamily: "'Space Grotesk',sans-serif", lineHeight: 1,
                    color: decompResult.suggestion === "split" ? "#ef4444" : decompResult.suggestion === "consider" ? "#f59e0b" : "#22c55e"
                  }}>
                    {decompResult.suggestion === "split" ? "SPLIT" : decompResult.suggestion === "consider" ? "MAYBE" : "SINGLE"}
                  </div>
                  <div style={{ fontSize: 12, marginTop: 6, color: decompResult.suggestion === "split" ? "#fca5a5" : decompResult.suggestion === "consider" ? "#fcd34d" : "#86efac" }}>
                    {decompResult.suggestion === "split" ? "This task has strong decomposition signals" : decompResult.suggestion === "consider" ? "Some signals detected — evaluate trade-offs" : "One GD prompt should handle this well"}
                  </div>
                  <div style={{ marginTop: 10, height: 6, background: "#27272a", borderRadius: 3, overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${Math.min(decompResult.score / 15 * 100, 100)}%`, background: decompResult.suggestion === "split" ? "#ef4444" : decompResult.suggestion === "consider" ? "#f59e0b" : "#22c55e", borderRadius: 3, transition: "all 0.4s" }} />
                  </div>
                  <div style={{ fontSize: 11, color: "#3f3f46", marginTop: 4 }}>Complexity: {decompResult.score}/15</div>
                </div>
                {/* Signals */}
                <div style={{ padding: 16, background: "#0a0a0b", borderRadius: 10, border: "1px solid #27272a" }}>
                  <div style={{ fontSize: 11, color: "#71717a", textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 10 }}>Signals Detected ({decompResult.signals.length})</div>
                  {decompResult.signals.length === 0 ? (
                    <div style={{ fontSize: 13, color: "#22c55e", textAlign: "center", padding: 8 }}>No split signals found</div>
                  ) : (
                    <div style={{ display: "grid", gap: 6 }}>
                      {decompResult.signals.map((s, i) => (
                        <div key={i} style={{ padding: "8px 10px", background: "#18181b", borderRadius: 6, borderLeft: "3px solid #f59e0b" }}>
                          <div style={{ fontSize: 12, color: "#fcd34d", fontWeight: 500 }}>{s.label} ({s.count})</div>
                          <div style={{ fontSize: 11, color: "#71717a", marginTop: 2 }}>{s.matches.join(", ")}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </Card>

            {/* Decomposition patterns */}
            <Card>
              <Lbl color="#f59e0b">Decomposition Patterns</Lbl>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(260px,100%),1fr))", gap: 12 }}>
                {[
                  { name: "Sequential Chain", icon: "→", desc: "Each task uses the output of the previous. Common for: schema → code → tests.", example: "task-1 → task-2 → task-3\nEach GD prompt includes prior output in CONTEXT", color: "#a78bfa" },
                  { name: "Parallel Fan-Out", icon: "⇉", desc: "Independent tasks run simultaneously. Common for: multi-format content, multi-language.", example: "task-1 ──┬── task-2a (frontend)\n         ├── task-2b (backend)\n         └── task-2c (tests)", color: "#22c55e" },
                  { name: "Hierarchical", icon: "▽", desc: "High-level plan → detailed sub-plans → execution. Common for: architecture → modules.", example: "task-1: Architecture plan\n  task-1a: Module A detail\n  task-1b: Module B detail\n    task-1b-i: Endpoint code", color: "#f59e0b" },
                ].map(p => (
                  <div key={p.name} style={{ padding: 14, background: "#0a0a0b", borderRadius: 8, border: "1px solid #27272a", borderTop: `3px solid ${p.color}` }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                      <span style={{ fontSize: 20, color: p.color }}>{p.icon}</span>
                      <span style={{ fontSize: 14, fontWeight: 600, color: "#fafafa", fontFamily: "'Space Grotesk',sans-serif" }}>{p.name}</span>
                    </div>
                    <div style={{ fontSize: 12, color: "#71717a", marginBottom: 10, lineHeight: 1.5 }}>{p.desc}</div>
                    <pre style={{ fontSize: 11, color: p.color, background: "#18181b", padding: 10, borderRadius: 6, whiteSpace: "pre-wrap", lineHeight: 1.5, fontFamily: "'IBM Plex Mono',monospace" }}>{p.example}</pre>
                  </div>
                ))}
              </div>
            </Card>

            <Card>
              <Lbl color="#71717a">Compound Accuracy Gain (Chip Huyen, AI Engineering p.302)</Lbl>
              <Prose last>If accuracy is 85% per step, a 3-round naive approach yields 61% compound accuracy. GD (1 round) stays at 85%. Decomposition extends this: 3 sequential GD sub-tasks at 85% each give 61% — but since each sub-task is individually correct (GD), the effective accuracy per sub-step is closer to 95%, yielding <strong style={{ color: "#22c55e" }}>85.7%</strong> compound vs naive's <strong style={{ color: "#ef4444" }}>61.4%</strong>.</Prose>
            </Card>
          </div>
        )}

        {/* ── SYNTAX ── */}
        {sec === "syntax" && (
          <div className="fu" style={{ display: "grid", gap: "clamp(16px,3vw,20px)" }}>
            <Tag>03 — THE GD SYNTAX</Tag>
            <h2 style={H2}>Generous compression</h2>
            <Card>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14, flexWrap: "wrap", gap: 8 }}>
                <Lbl color="#a78bfa">GD Prompt Template (with DECOMPOSE block)</Lbl>
                <span style={{ fontSize: 11, color: "#3f3f46", background: "#18181b", padding: "4px 8px", borderRadius: 4 }}>~95 tokens</span>
              </div>
              <pre style={{ fontSize: "clamp(11px,2.2vw,13px)", color: "#d4d4d8", whiteSpace: "pre-wrap", lineHeight: 1.7, fontFamily: "'IBM Plex Mono',monospace", background: "#0a0a0b", padding: "clamp(12px,3vw,20px)", borderRadius: 8, border: "1px solid #27272a" }}>{GD_SYNTAX}</pre>
            </Card>
            <div style={grid2}>
              <Card>
                <Lbl color="#71717a">Design Principles</Lbl>
                {["Key: Value — minimal syntax, max density", "UPPERCASE headers — scannable", "TOON-compatible data in CONTEXT", "DECOMPOSE block — optional, for complex tasks", "Free text below --- for nuance", "Every block optional except INTENT"].map((t, i) => (
                  <div key={i} style={{ fontSize: 13, color: "#a1a1aa", padding: "5px 0", borderBottom: i < 5 ? "1px solid #1a1a1e" : "none", display: "flex", gap: 8 }}>
                    <span style={{ color: "#a78bfa", fontSize: 11, marginTop: 2, flexShrink: 0 }}>▸</span>{t}
                  </div>
                ))}
              </Card>
              <Card>
                <Lbl color="#71717a">Token Comparison</Lbl>
                {[{ l: "XML", t: "~210", w: 100, c: "#ef4444" }, { l: "JSON", t: "~155", w: 74, c: "#f59e0b" }, { l: "Prose", t: "~120*", w: 57, c: "#71717a" }, { l: "GD Syntax", t: "~95", w: 45, c: "#22c55e" }, { l: "GD + TOON", t: "~75", w: 36, c: "#a78bfa" }].map((t, i) => (
                  <div key={i} style={{ marginBottom: 10 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 3 }}>
                      <span style={{ color: "#a1a1aa" }}>{t.l}</span><span style={{ color: t.c, fontWeight: 500 }}>{t.t} tok</span>
                    </div>
                    <div style={{ height: 5, background: "#18181b", borderRadius: 3, overflow: "hidden" }}>
                      <div className="bg" style={{ height: "100%", width: `${t.w}%`, background: t.c, borderRadius: 3 }} />
                    </div>
                  </div>
                ))}
              </Card>
            </div>
          </div>
        )}

        {/* ── MEASUREMENT ── */}
        {sec === "measurement" && (
          <div className="fu" style={{ display: "grid", gap: "clamp(16px,3vw,20px)" }}>
            <Tag>04 — MEASURING THE 76%</Tag>
            <h2 style={H2}>Total Cost of Completion (TCC)</h2>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {TOKEN_CASES.map((tc, i) => (
                <button key={i} onClick={() => setCas(i)} style={{ padding: "7px 12px", fontSize: "clamp(11px,2vw,12px)", fontFamily: "'IBM Plex Mono',monospace", color: cas === i ? "#0a0a0b" : "#a1a1aa", background: cas === i ? "#a78bfa" : "#18181b", border: "1px solid", borderColor: cas === i ? "#a78bfa" : "#27272a", borderRadius: 6, cursor: "pointer", fontWeight: cas === i ? 600 : 400 }}>{tc.title}</button>
              ))}
            </div>
            <div className="fu" key={cas} style={grid2}>
              <Card accent="#ef4444">
                <Lbl color="#ef4444">Naive Prompt</Lbl>
                <Metric label="Prompt tokens" value={cc.naive.prompt} /><Metric label="Rounds" value={cc.naive.rounds} />
                <div style={{ margin: "10px 0", borderTop: "1px solid #27272a" }} />
                <Metric label="TCC" value={`${nTCC.toLocaleString()} tok`} big accent="#ef4444" />
              </Card>
              <Card accent="#22c55e">
                <Lbl color="#22c55e">GD Prompt</Lbl>
                <Metric label="Prompt tokens" value={cc.gd.prompt} /><Metric label="Rounds" value={cc.gd.rounds} />
                <div style={{ margin: "10px 0", borderTop: "1px solid #27272a" }} />
                <Metric label="TCC" value={`${gTCC.toLocaleString()} tok`} big accent="#22c55e" />
              </Card>
            </div>
            <div style={{ padding: "clamp(16px,3vw,24px)", background: "#18181b", borderRadius: 12, border: "1px solid #27272a" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                <span style={{ fontSize: 13, color: "#a1a1aa" }}>TCC Reduction</span>
                <span style={{ fontSize: "clamp(22px,5vw,28px)", fontWeight: 700, color: "#a78bfa", fontFamily: "'Space Grotesk',sans-serif" }}>{anim}%</span>
              </div>
              <div style={{ height: 10, background: "#27272a", borderRadius: 5, overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${anim}%`, background: "linear-gradient(90deg,#a78bfa,#22c55e)", borderRadius: 5, transition: "width 0.8s ease-out" }} />
              </div>
              <div style={{ marginTop: 14, display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(80px,1fr))", gap: 10 }}>
                <MiniMetric label="Naive" value={nTCC.toLocaleString()} /><MiniMetric label="GD" value={gTCC.toLocaleString()} /><MiniMetric label="Saved" value={(nTCC - gTCC).toLocaleString()} /><MiniMetric label="FSA" value="100%" />
              </div>
            </div>
          </div>
        )}

        {/* ── SHOWCASES ── */}
        {sec === "showcases" && (
          <div className="fu" style={{ display: "grid", gap: "clamp(16px,3vw,20px)" }}>
            <Tag>05 — BEFORE & AFTER</Tag>
            <h2 style={H2}>Same task, two dispositions</h2>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => setShowGD(false)} style={{ padding: "8px 14px", fontSize: 12, fontFamily: "'IBM Plex Mono',monospace", color: !showGD ? "#0a0a0b" : "#a1a1aa", background: !showGD ? "#ef4444" : "#18181b", border: "1px solid", borderColor: !showGD ? "#ef4444" : "#27272a", borderRadius: 6, cursor: "pointer", fontWeight: !showGD ? 600 : 400 }}>Before</button>
              <button onClick={() => setShowGD(true)} style={{ padding: "8px 14px", fontSize: 12, fontFamily: "'IBM Plex Mono',monospace", color: showGD ? "#0a0a0b" : "#a1a1aa", background: showGD ? "#22c55e" : "#18181b", border: "1px solid", borderColor: showGD ? "#22c55e" : "#27272a", borderRadius: 6, cursor: "pointer", fontWeight: showGD ? 600 : 400 }}>After (GD)</button>
            </div>
            <div className="fu" key={showGD ? "g" : "n"}>
              {(() => { const s = SHOWCASES[showGD ? 1 : 0]; return (
                <Card accent={s.color}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14, flexWrap: "wrap", gap: 8 }}>
                    <span style={{ fontSize: 11, color: s.color, fontWeight: 600, letterSpacing: 1.5, textTransform: "uppercase" }}>{s.tag}</span>
                    <span style={{ fontSize: 12, color: "#71717a", background: "#0a0a0b", padding: "4px 10px", borderRadius: 4 }}>{s.rounds}</span>
                  </div>
                  <div style={{ marginBottom: 14 }}>
                    <div style={{ fontSize: 11, color: "#71717a", marginBottom: 6, textTransform: "uppercase" }}>Prompt</div>
                    <pre style={{ fontSize: "clamp(11px,2.2vw,13px)", color: showGD ? "#a78bfa" : "#d4d4d8", whiteSpace: "pre-wrap", lineHeight: 1.6, fontFamily: "'IBM Plex Mono',monospace", background: "#0a0a0b", padding: "clamp(12px,3vw,16px)", borderRadius: 8, border: "1px solid #27272a" }}>{s.prompt}</pre>
                  </div>
                  <div>
                    <div style={{ fontSize: 11, color: "#71717a", marginBottom: 6, textTransform: "uppercase" }}>What happens</div>
                    <pre style={{ fontSize: "clamp(11px,2.2vw,13px)", color: "#a1a1aa", whiteSpace: "pre-wrap", lineHeight: 1.6, fontFamily: "'IBM Plex Mono',monospace", background: "#0a0a0b", padding: "clamp(12px,3vw,16px)", borderRadius: 8, border: "1px solid #27272a" }}>{s.response}</pre>
                  </div>
                </Card>
              ); })()}
            </div>
          </div>
        )}

        {/* ── IMPLEMENT ── */}
        {sec === "implement" && (
          <div className="fu" style={{ display: "grid", gap: "clamp(14px,3vw,16px)" }}>
            <Tag>07 — IMPLEMENT IT</Tag>
            <h2 style={H2}>Start in 60 seconds</h2>
            {[
              { s: "01", t: "Add INTENT + CONTEXT", d: "These two blocks eliminate most correction rounds.", i: "~40% TCC ↓" },
              { s: "02", t: "Add CONSTRAINTS", d: "Define format, length, boundaries. Stops over-generation.", i: "+15% TCC ↓" },
              { s: "03", t: "Add ASSUMPTIONS", d: "Highest-leverage block. Each unstated one is a coin-flip.", i: "+10% TCC ↓" },
              { s: "04", t: "Use TOON for data in CONTEXT", d: "Structured data payloads compress 30-60% vs JSON.", i: "+30% data ↓" },
              { s: "05", t: "Apply DECOMPOSITION", d: "Use the Split Detector. If score > 8, split into sub-tasks with individual GD structure.", i: "Accuracy ↑", accent: "#f59e0b" },
              { s: "06", t: "Measure your TCC", d: "Track total tokens across all rounds for your top 5 tasks.", i: "Proves it" },
            ].map(s => (
              <div key={s.s} style={{ padding: "clamp(14px,3vw,20px)", background: "#18181b", borderRadius: 10, border: "1px solid #27272a", borderLeft: s.accent ? `3px solid ${s.accent}` : undefined, display: "grid", gridTemplateColumns: "36px 1fr auto", gap: "clamp(8px,2vw,16px)", alignItems: "start" }}>
                <div style={{ fontSize: "clamp(16px,3.5vw,20px)", fontWeight: 700, color: s.accent || "#a78bfa", fontFamily: "'Space Grotesk',sans-serif" }}>{s.s}</div>
                <div>
                  <div style={{ fontSize: "clamp(13px,2.5vw,14px)", fontWeight: 600, color: "#fafafa", fontFamily: "'Space Grotesk',sans-serif" }}>{s.t}</div>
                  <div style={{ fontSize: "clamp(11px,2.2vw,13px)", color: "#71717a", lineHeight: 1.5 }}>{s.d}</div>
                </div>
                <div style={{ fontSize: 11, color: s.accent || "#a78bfa", fontWeight: 500, whiteSpace: "nowrap" }}>{s.i}</div>
              </div>
            ))}
            <Card>
              <Lbl color="#a78bfa">GD Checklist</Lbl>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(220px,100%),1fr))", gap: 8, marginTop: 4 }}>
                {["WHAT + WHY + FOR WHOM stated?", "All context front-loaded?", "Format, length, boundaries defined?", "Example of desired output?", "Assumptions listed explicitly?", "Task simple enough for 1 prompt?", "TOON for structured data?"].map((q, i) => (
                  <div key={i} style={{ fontSize: "clamp(11px,2.2vw,13px)", color: "#a1a1aa", padding: "8px 10px", background: "#0a0a0b", borderRadius: 6, border: `1px solid ${i === 5 ? '#f59e0b30' : '#27272a'}`, display: "flex", gap: 8, alignItems: "center" }}>
                    <span style={{ color: i === 5 ? "#f59e0b" : "#3f3f46", fontSize: 14 }}>{i === 5 ? "◆" : "☐"}</span>{q}
                  </div>
                ))}
              </div>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
}

const H2 = { fontFamily: "'Space Grotesk',sans-serif", fontSize: "clamp(18px,4vw,24px)", fontWeight: 600, color: "#fafafa" };
const grid2 = { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(260px,100%),1fr))", gap: 14 };

function Card({ children, accent, style = {} }) {
  return (
    <div style={{ padding: "clamp(16px,3vw,24px)", background: "#18181b", borderRadius: 12, border: "1px solid #27272a", borderLeft: accent ? `3px solid ${accent}` : undefined, ...style }}>
      {children}
    </div>
  );
}

function Tag({ children, color }) {
  return (
    <div style={{ fontSize: 11, color: color || "#a78bfa", fontWeight: 600, letterSpacing: 2, textTransform: "uppercase", marginBottom: 4 }}>{children}</div>
  );
}

function Lbl({ children, color }) {
  return (
    <div style={{ fontSize: 11, color, fontWeight: 600, letterSpacing: 1.5, marginBottom: 10, textTransform: "uppercase" }}>{children}</div>
  );
}

function Prose({ children, last }) {
  return (
    <p style={{ fontSize: "clamp(13px,2.5vw,14px)", color: "#a1a1aa", marginBottom: last ? 0 : 14, lineHeight: 1.7 }}>{children}</p>
  );
}

function Metric({ label, value, big, accent }) {
  return (
    <div style={{ marginBottom: 6 }}>
      <div style={{ fontSize: 11, color: "#71717a", marginBottom: 1 }}>{label}</div>
      <div style={{ fontSize: big ? "clamp(18px,4vw,22px)" : 15, fontWeight: big ? 700 : 500, color: accent || "#fafafa", fontFamily: "'Space Grotesk',sans-serif" }}>{value}</div>
    </div>
  );
}

function MiniMetric({ label, value }) {
  return (
    <div style={{ textAlign: "center" }}>
      <div style={{ fontSize: "clamp(10px,2vw,11px)", color: "#71717a", marginBottom: 3 }}>{label}</div>
      <div style={{ fontSize: "clamp(13px,2.5vw,15px)", fontWeight: 600, color: "#e4e4e7", fontFamily: "'Space Grotesk',sans-serif" }}>{value}</div>
    </div>
  );
}