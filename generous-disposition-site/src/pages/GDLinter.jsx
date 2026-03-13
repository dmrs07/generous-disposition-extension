import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";

const VER = "0.2.0";
const BLOCKS = {
  INTENT: { req: true, desc: "What + deliverable type", hint: "INTENT: Build a REST endpoint for user registration", color: "#a78bfa" },
  WHY: { req: false, desc: "Business context or purpose", hint: "WHY: New signup flow for PinDay mobile app", color: "#818cf8" },
  FOR: { req: false, desc: "Audience / skill level / reviewer", hint: "FOR: Senior backend dev, PR review context", color: "#6366f1" },
  CONTEXT: { req: false, desc: "Key-value state (TOON-compatible for tabular data)", hint: "CONTEXT:\n  stack: NestJS + Prisma\n  auth: JWT", color: "#8b5cf6" },
  CONSTRAINTS: { req: false, desc: "Format, length, style, exclude, include", hint: "CONSTRAINTS:\n  format: single file\n  length: < 80 lines", color: "#7c3aed" },
  EXAMPLE: { req: false, desc: "Fragment of desired output shape", hint: "EXAMPLE:\n  @Post('/register')\n  async register(@Body() dto) { }", color: "#6d28d9" },
  ASSUMPTIONS: { req: false, desc: "What you take for granted", hint: "ASSUMPTIONS:\n  - DB configured\n  - Auth middleware exists", color: "#5b21b6" },
  DECOMPOSE: { req: false, desc: "Sub-tasks + execution strategy (6th pillar)", hint: "DECOMPOSE:\n  task-1: Generate Prisma schema\n  task-2: Create controller + DTOs\n  strategy: sequential", color: "#f59e0b" },
};
const BN = Object.keys(BLOCKS);

const EXAMPLE_PROMPT = `INTENT: Create a Stripe webhook handler for payment confirmations
WHY: PinDay needs real-time deposit status updates for bookings
FOR: Production codebase, senior dev reviewing

CONTEXT:
  stack: NestJS + TypeScript + Prisma
  entity: Payment { id, bookingId, stripeIntentId, status }
  provider: Stripe SDK v14 (installed)
  webhook: payment_intent.succeeded, payment_intent.failed

CONSTRAINTS:
  format: single NestJS controller method
  length: < 60 lines
  style: follow existing PaymentModule patterns
  exclude: no unit tests, no Swagger
  include: signature verification, idempotency check

EXAMPLE:
  @Post('webhook/stripe')
  async handleStripeWebhook(
    @Req() req: RawBodyRequest<Request>
  ): Promise<{ received: boolean }>

ASSUMPTIONS:
  - Raw body parsing configured in main.ts
  - PaymentService.updateStatus() exists
  - Stripe webhook secret in env as STRIPE_WEBHOOK_SECRET

---
Handle both succeeded and failed events.`;

const COMPLEX_EXAMPLE = `INTENT: Build a full booking management system with REST API, admin dashboard, payment processing, and automated email notifications
WHY: PinDay MVP launch requires end-to-end booking flow
FOR: Production deployment, team of 3 devs

CONTEXT:
  stack: NestJS + TypeScript + Prisma + React + Stripe + Resend
  entities: User, Provider, Service, Booking, Payment, Notification
  auth: JWT with refresh tokens
  deployment: Render web service + PostgreSQL + Redis

CONSTRAINTS:
  format: full module structure with all files
  include: CRUD for all entities, Stripe Connect, email templates, admin role guards
  style: NestJS conventions throughout

DECOMPOSE:
  task-1: Database schema + Prisma models for all 6 entities
  task-2: Auth module (JWT + refresh + role guards)
  task-3: Booking + Service CRUD endpoints
  task-4: Stripe payment integration (deposits + webhooks)
  task-5: Email notification system (Resend + templates)
  task-6: Admin dashboard API endpoints
  strategy: sequential (1 → 2 → 3,4 parallel → 5,6 parallel)

ASSUMPTIONS:
  - Render deployment configured
  - Stripe Connect account approved
  - Resend API key available
  - Redis for Bull job queues`;

function tokEst(t) {
  if (!t.trim()) return 0;
  return Math.ceil(t.split(/\s+/).filter(Boolean).length * 1.33);
}

function lintGD(text) {
  const lines = text.split("\n"), issues = [], found = {};
  let cur = null, ln = 0, free = false, order = [];
  let intentText = "", contextLines = 0;

  for (const line of lines) {
    ln++;
    const tr = line.trim();
    if (tr === "---") { free = true; continue; }
    if (free) continue;
    const bm = tr.match(/^([A-Z]+)\s*:\s*(.*)/);
    if (bm && BN.includes(bm[1])) {
      const n = bm[1];
      if (found[n]) issues.push({ line: ln, level: "error", msg: `Duplicate block: ${n}` });
      found[n] = ln; cur = n; order.push(n);
      if (n === "INTENT") { intentText = bm[2] || ""; if (!bm[2].trim()) issues.push({ line: ln, level: "error", msg: "INTENT is empty — most critical block" }); }
      continue;
    }
    if (tr.startsWith("  ") && cur) {
      if (cur === "CONTEXT") contextLines++;
      if ((cur === "CONTEXT" || cur === "CONSTRAINTS") && !tr.match(/^(\w[\w-]*):\s*(.*)/) && !tr.startsWith("-") && !tr.startsWith("#") && tr.length > 0)
        issues.push({ line: ln, level: "warn", msg: `Expected key: value or - item inside ${cur}` });
      if (cur === "ASSUMPTIONS" && !tr.startsWith("-") && !tr.startsWith("#") && tr.length > 0)
        issues.push({ line: ln, level: "warn", msg: "ASSUMPTIONS items should start with -" });
      if (cur === "INTENT") intentText += " " + tr;
    }
  }

  if (!found["INTENT"]) issues.push({ line: 1, level: "error", msg: "Missing INTENT — every GD prompt needs one" });
  if (!found["CONTEXT"] && Object.keys(found).length > 1) issues.push({ line: 0, level: "info", msg: "Consider adding CONTEXT" });
  if (!found["CONSTRAINTS"]) issues.push({ line: 0, level: "info", msg: "CONSTRAINTS prevents over-generation" });
  if (!found["ASSUMPTIONS"]) issues.push({ line: 0, level: "info", msg: "ASSUMPTIONS: each unstated = coin-flip" });

  const IO = BN, ep = order.map(b => IO.indexOf(b));
  for (let i = 1; i < ep.length; i++) {
    if (ep[i] < ep[i - 1]) { issues.push({ line: found[order[i]], level: "warn", msg: `${order[i]} out of recommended order` }); break; }
  }

  // Decomposition analysis
  const decomp = analyzeDecompNeed(intentText, contextLines, text);
  if (decomp.score >= 8 && !found["DECOMPOSE"]) {
    issues.push({ line: 0, level: "warn", msg: `High complexity detected (${decomp.score}/15). Consider adding a DECOMPOSE block to split this task.` });
  }
  if (found["DECOMPOSE"]) {
    // Check DECOMPOSE has strategy
    const decompContent = text.slice(text.indexOf("DECOMPOSE:"));
    if (!decompContent.includes("strategy:")) {
      issues.push({ line: found["DECOMPOSE"], level: "info", msg: "DECOMPOSE: add a 'strategy:' line (sequential, parallel, or hybrid)" });
    }
  }

  let score = 0;
  if (found.INTENT) score += 25; if (found.CONTEXT) score += 20; if (found.CONSTRAINTS) score += 18;
  if (found.ASSUMPTIONS) score += 14; if (found.EXAMPLE) score += 5; if (found.WHY) score += 3;
  if (found.FOR) score += 3;
  if (found.DECOMPOSE) score += 7;
  if (decomp.score >= 8 && !found.DECOMPOSE) score -= 5;
  score = Math.max(0, Math.min(100, score - issues.filter(i => i.level === "error").length * 10));

  return { issues, found, score, blockCount: Object.keys(found).length, decomp };
}

function analyzeDecompNeed(intentText, contextLines, fullText) {
  let score = 0;
  const signals = [];
  const verbs = (intentText.match(/\b(create|build|write|generate|design|implement|refactor|test|document|deploy|configure|setup|integrate|migrate)\b/gi) || []);
  if (verbs.length > 2) { score += verbs.length; signals.push({ label: "Multiple action verbs", detail: verbs.slice(0, 5).join(", ") }); }
  if (contextLines > 12) { score += 3; signals.push({ label: "Large CONTEXT block", detail: `${contextLines} lines` }); }
  const domains = (fullText.match(/\b(frontend|backend|database|api|ui|test|deploy|email|auth|payment|admin)\b/gi) || []);
  const uniqueDomains = [...new Set(domains.map(d => d.toLowerCase()))];
  if (uniqueDomains.length > 2) { score += uniqueDomains.length; signals.push({ label: "Multiple domains", detail: uniqueDomains.join(", ") }); }
  const conjunctions = (intentText.match(/\b(and|also|plus|then|with)\b/gi) || []);
  if (conjunctions.length > 1) { score += conjunctions.length; signals.push({ label: "Task conjunctions", detail: conjunctions.join(", ") }); }
  const words = fullText.split(/\s+/).length;
  if (words > 250) { score += 2; signals.push({ label: "Prompt size", detail: `${words} words` }); }
  return { score: Math.min(score, 15), signals, level: score >= 8 ? "split" : score >= 4 ? "consider" : "single" };
}

const LS = { error: { bg: "#2d1215", border: "#ef4444", color: "#fca5a5", icon: "✕" }, warn: { bg: "#2d2305", border: "#f59e0b", color: "#fcd34d", icon: "△" }, info: { bg: "#0c1d29", border: "#3b82f6", color: "#93c5fd", icon: "◇" } };

export default function GDLinter() {
  const nav = useNavigate();
  const [code, setCode] = useState(EXAMPLE_PROMPT);
  const [tab, setTab] = useState("linter");
  const lint = useMemo(() => lintGD(code), [code]);
  const tok = useMemo(() => tokEst(code), [code]);
  const sCol = lint.score >= 80 ? "#22c55e" : lint.score >= 50 ? "#f59e0b" : "#ef4444";
  const sLbl = lint.score >= 80 ? "Strong GD" : lint.score >= 50 ? "Partial GD" : "Weak GD";
  const dCol = lint.decomp.level === "split" ? "#ef4444" : lint.decomp.level === "consider" ? "#f59e0b" : "#22c55e";

  return (
    <div style={{ fontFamily: "'IBM Plex Mono','SF Mono',monospace", background: "#0a0a0b", color: "#e4e4e7", minHeight: "100vh", lineHeight: 1.6 }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@300;400;500;600;700&family=Space+Grotesk:wght@300;400;500;600;700&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}
        ::-webkit-scrollbar{width:4px}::-webkit-scrollbar-track{background:#18181b}::-webkit-scrollbar-thumb{background:#3f3f46;border-radius:2px}
        @keyframes fu{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}.fu{animation:fu .4s ease-out both}
        @keyframes bg{from{width:0}}.bg{animation:bg .8s ease-out both}
        textarea:focus{outline:none;border-color:#a78bfa!important}pre{overflow-x:auto}
      `}</style>

      <header style={{ padding: "clamp(20px,5vw,32px) clamp(16px,4vw,28px) clamp(14px,3vw,20px)", borderBottom: "1px solid #27272a" }}>
        <div style={{ maxWidth: 1000, margin: "0 auto" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4, flexWrap: "wrap" }}>
            <button onClick={() => nav("/")} style={{ background: "none", border: "1px solid #27272a", borderRadius: 6, color: "#71717a", cursor: "pointer", fontSize: 14, padding: "4px 8px", fontFamily: "'IBM Plex Mono',monospace", lineHeight: 1 }} title="Back to home">← back</button>
            <span style={{ fontSize: "clamp(18px,4vw,22px)", color: "#a78bfa", fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700 }}>◎</span>
            <h1 style={{ fontSize: "clamp(18px,4vw,22px)", fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, letterSpacing: -0.5, color: "#fafafa" }}>GD Spec & Linter</h1>
            <span style={{ fontSize: 11, color: "#3f3f46", background: "#18181b", padding: "3px 8px", borderRadius: 4 }}>v{VER}</span>
            <span style={{ fontSize: 10, color: "#f59e0b", background: "#f59e0b15", padding: "2px 8px", borderRadius: 10, fontWeight: 600 }}>+ DECOMPOSE</span>
          </div>
          <p style={{ fontSize: "clamp(11px,2.2vw,13px)", color: "#52525b", maxWidth: 560 }}>Validate GD prompts with real-time linting, decomposition analysis, and token estimates.</p>
        </div>
      </header>

      <nav style={{ borderBottom: "1px solid #27272a", padding: "0 clamp(16px,4vw,28px)", position: "sticky", top: 0, background: "#0a0a0b", zIndex: 100, overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
        <div style={{ maxWidth: 1000, margin: "0 auto", display: "flex", minWidth: "max-content" }}>
          {[{ k: "linter", l: "Linter" }, { k: "spec", l: "Spec" }, { k: "cheat", l: "Cheat Sheet" }].map(t => (
            <button key={t.k} onClick={() => setTab(t.k)} style={{ padding: "12px clamp(10px,2.5vw,18px)", fontSize: "clamp(10px,2vw,12px)", fontFamily: "'IBM Plex Mono',monospace", fontWeight: tab === t.k ? 600 : 400, color: tab === t.k ? "#a78bfa" : "#52525b", background: "none", border: "none", borderBottom: tab === t.k ? "2px solid #a78bfa" : "2px solid transparent", cursor: "pointer", textTransform: "uppercase", letterSpacing: 1.5 }}>{t.l}</button>
          ))}
        </div>
      </nav>

      <main style={{ maxWidth: 1000, margin: "0 auto", padding: "clamp(20px,4vw,24px) clamp(16px,4vw,28px) 80px" }}>

        {tab === "linter" && (
          <div className="fu">
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(320px,100%),1fr))", gap: 20, alignItems: "start" }}>
              {/* Editor */}
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8, flexWrap: "wrap", gap: 6 }}>
                  <span style={{ fontSize: 11, color: "#52525b", textTransform: "uppercase", letterSpacing: 1.5 }}>Editor</span>
                  <div style={{ display: "flex", gap: 6 }}>
                    <button onClick={() => setCode(EXAMPLE_PROMPT)} style={{ fontSize: 11, color: "#a78bfa", background: "#1a1625", border: "1px solid #2e2450", borderRadius: 4, padding: "4px 10px", cursor: "pointer", fontFamily: "'IBM Plex Mono',monospace" }}>Simple</button>
                    <button onClick={() => setCode(COMPLEX_EXAMPLE)} style={{ fontSize: 11, color: "#f59e0b", background: "#1a1510", border: "1px solid #4a3520", borderRadius: 4, padding: "4px 10px", cursor: "pointer", fontFamily: "'IBM Plex Mono',monospace" }}>Complex</button>
                    <button onClick={() => setCode("INTENT: \n")} style={{ fontSize: 11, color: "#71717a", background: "#18181b", border: "1px solid #27272a", borderRadius: 4, padding: "4px 10px", cursor: "pointer", fontFamily: "'IBM Plex Mono',monospace" }}>Clear</button>
                  </div>
                </div>
                <textarea value={code} onChange={e => setCode(e.target.value)} spellCheck={false} style={{ width: "100%", minHeight: "clamp(300px,50vh,480px)", padding: "clamp(12px,3vw,20px)", fontSize: "clamp(12px,2.2vw,13px)", lineHeight: 1.7, fontFamily: "'IBM Plex Mono',monospace", color: "#d4d4d8", background: "#111113", border: "1px solid #27272a", borderRadius: 10, resize: "vertical" }} />
                <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6, fontSize: 11, color: "#3f3f46" }}>
                  <span>{code.split("\n").length} lines · ~{tok} tokens</span>
                  <span>{lint.blockCount}/{BN.length} blocks</span>
                </div>
              </div>

              {/* Sidebar */}
              <div style={{ display: "grid", gap: 14 }}>
                {/* Score */}
                <div style={{ padding: "clamp(14px,3vw,20px)", background: "#18181b", borderRadius: 10, border: "1px solid #27272a", textAlign: "center" }}>
                  <div style={{ fontSize: 11, color: "#52525b", textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 6 }}>GD Score</div>
                  <div style={{ fontSize: "clamp(32px,8vw,42px)", fontWeight: 700, fontFamily: "'Space Grotesk',sans-serif", color: sCol, lineHeight: 1 }}>{lint.score}</div>
                  <div style={{ fontSize: 12, color: sCol, fontWeight: 500, marginTop: 3 }}>{sLbl}</div>
                  <div style={{ marginTop: 10, height: 6, background: "#27272a", borderRadius: 3, overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${lint.score}%`, background: sCol, borderRadius: 3, transition: "all 0.5s" }} />
                  </div>
                </div>

                {/* Decomposition Analysis — NEW */}
                <div style={{ padding: "clamp(14px,3vw,20px)", background: "#18181b", borderRadius: 10, border: `1px solid ${lint.decomp.level === "single" ? "#27272a" : "#f59e0b30"}` }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                    <div style={{ fontSize: 11, color: "#f59e0b", textTransform: "uppercase", letterSpacing: 1.5, fontWeight: 600 }}>◆ Decomposition</div>
                    <span style={{ fontSize: 11, color: dCol, fontWeight: 600, background: `${dCol}15`, padding: "2px 8px", borderRadius: 10 }}>
                      {lint.decomp.level === "split" ? "SPLIT" : lint.decomp.level === "consider" ? "MAYBE" : "OK"}
                    </span>
                  </div>
                  <div style={{ height: 4, background: "#27272a", borderRadius: 2, overflow: "hidden", marginBottom: 8 }}>
                    <div style={{ height: "100%", width: `${Math.min(lint.decomp.score / 15 * 100, 100)}%`, background: dCol, borderRadius: 2, transition: "all 0.4s" }} />
                  </div>
                  {lint.decomp.signals.length > 0 ? (
                    <div style={{ display: "grid", gap: 4 }}>
                      {lint.decomp.signals.map((s, i) => (
                        <div key={i} style={{ fontSize: 11, color: "#a1a1aa", display: "flex", justifyContent: "space-between" }}>
                          <span>{s.label}</span>
                          <span style={{ color: "#f59e0b", fontSize: 10 }}>{s.detail}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div style={{ fontSize: 12, color: "#22c55e", textAlign: "center" }}>Single prompt is fine</div>
                  )}
                </div>

                {/* Block coverage */}
                <div style={{ padding: "clamp(14px,3vw,20px)", background: "#18181b", borderRadius: 10, border: "1px solid #27272a" }}>
                  <div style={{ fontSize: 11, color: "#52525b", textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 10 }}>Blocks</div>
                  {Object.entries(BLOCKS).map(([n, b]) => { const on = !!lint.found[n]; return (
                    <div key={n} style={{ display: "flex", alignItems: "center", gap: 8, padding: "4px 0", borderBottom: "1px solid #1a1a1e" }}>
                      <span style={{ width: 8, height: 8, borderRadius: "50%", background: on ? b.color : "#27272a", flexShrink: 0, transition: "background .3s" }} />
                      <span style={{ fontSize: 12, color: on ? "#d4d4d8" : "#3f3f46", fontWeight: on ? 500 : 400, flex: 1 }}>{n}</span>
                      {n === "DECOMPOSE" && <span style={{ fontSize: 9, color: "#f59e0b", fontWeight: 600 }}>NEW</span>}
                      {b.req && <span style={{ fontSize: 9, color: "#ef4444", fontWeight: 600 }}>REQ</span>}
                      {on && <span style={{ fontSize: 10, color: "#22c55e" }}>✓</span>}
                    </div>
                  ); })}
                </div>

                {/* Issues */}
                <div style={{ padding: "clamp(14px,3vw,20px)", background: "#18181b", borderRadius: 10, border: "1px solid #27272a" }}>
                  <div style={{ fontSize: 11, color: "#52525b", textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 10 }}>Issues ({lint.issues.length})</div>
                  {lint.issues.length === 0 ? (
                    <div style={{ fontSize: 13, color: "#22c55e", textAlign: "center", padding: 10 }}>✓ No issues</div>
                  ) : (
                    <div style={{ display: "grid", gap: 5, maxHeight: 200, overflowY: "auto" }}>
                      {lint.issues.map((iss, i) => { const s = LS[iss.level]; return (
                        <div key={i} style={{ padding: "7px 10px", background: s.bg, borderRadius: 6, borderLeft: `3px solid ${s.border}`, fontSize: "clamp(11px,2.2vw,12px)", color: s.color, lineHeight: 1.4 }}>
                          <span style={{ fontWeight: 600, marginRight: 5 }}>{s.icon}</span>
                          {iss.line > 0 && <span style={{ color: "#52525b", marginRight: 4 }}>L{iss.line}</span>}
                          {iss.msg}
                        </div>
                      ); })}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {tab === "spec" && (
          <div className="fu" style={{ display: "grid", gap: 16 }}>
            <div style={{ padding: "clamp(16px,3vw,24px)", background: "#18181b", borderRadius: 12, border: "1px solid #27272a" }}>
              <h2 style={{ fontSize: "clamp(16px,3.5vw,18px)", fontFamily: "'Space Grotesk',sans-serif", fontWeight: 600, color: "#fafafa", marginBottom: 14 }}>Block Reference (v{VER})</h2>
              {Object.entries(BLOCKS).map(([n, b]) => (
                <div key={n} style={{ padding: "clamp(10px,2vw,14px)", marginBottom: 8, background: "#0a0a0b", borderRadius: 8, border: "1px solid #27272a", borderLeft: `3px solid ${b.color}` }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                    <span style={{ fontSize: 14, fontWeight: 600, color: "#fafafa", fontFamily: "'Space Grotesk',sans-serif" }}>{n}</span>
                    <div style={{ display: "flex", gap: 6 }}>
                      {n === "DECOMPOSE" && <span style={{ fontSize: 9, color: "#f59e0b", fontWeight: 600, background: "#f59e0b15", padding: "1px 6px", borderRadius: 8 }}>6TH PILLAR</span>}
                      <span style={{ fontSize: 10, color: b.req ? "#ef4444" : "#3f3f46", fontWeight: 600 }}>{b.req ? "Required" : "Optional"}</span>
                    </div>
                  </div>
                  <div style={{ fontSize: 13, color: "#71717a", marginBottom: 6 }}>{b.desc}</div>
                  <pre style={{ fontSize: "clamp(11px,2vw,12px)", color: b.color, background: "#18181b", padding: 8, borderRadius: 6, fontFamily: "'IBM Plex Mono',monospace", whiteSpace: "pre-wrap", lineHeight: 1.6 }}>{b.hint}</pre>
                </div>
              ))}
            </div>
            <div style={{ padding: "clamp(16px,3vw,24px)", background: "#18181b", borderRadius: 12, border: "1px solid #27272a" }}>
              <div style={{ fontSize: 11, color: "#f59e0b", fontWeight: 600, letterSpacing: 1.5, marginBottom: 14, textTransform: "uppercase" }}>DECOMPOSE Block Rules</div>
              {[
                "Use when task has >2 action verbs in INTENT, CONTEXT >300 tokens, or spans >2 domains",
                "Each sub-task is named task-N with a brief description",
                "Include a strategy: line — sequential, parallel, or hybrid",
                "Each sub-task should get its own GD prompt when executed",
                "Use → notation for dependencies: task-1 → task-2 means 2 depends on 1",
                "Mark parallelizable tasks: 'task-2, task-3 can run in parallel after task-1'",
              ].map((r, i) => (
                <div key={i} style={{ fontSize: "clamp(12px,2.2vw,13px)", color: "#a1a1aa", padding: "7px 0", borderBottom: i < 5 ? "1px solid #1a1a1e" : "none", display: "flex", gap: 10 }}>
                  <span style={{ color: "#f59e0b", fontSize: 11, fontWeight: 600, flexShrink: 0 }}>{String(i + 1).padStart(2, "0")}</span>{r}
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === "cheat" && (
          <div className="fu" style={{ display: "grid", gap: 16 }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(280px,100%),1fr))", gap: 14 }}>
              <div style={{ padding: "clamp(12px,3vw,16px)", background: "#18181b", borderRadius: 10, border: "1px solid #27272a" }}>
                <div style={{ fontSize: 11, color: "#22c55e", fontWeight: 600, letterSpacing: 1.5, marginBottom: 6, textTransform: "uppercase" }}>Simple Task (no decomposition)</div>
                <pre style={{ fontSize: "clamp(11px,2vw,12px)", color: "#a78bfa", lineHeight: 1.7, fontFamily: "'IBM Plex Mono',monospace", whiteSpace: "pre-wrap" }}>{`INTENT: Create a booking endpoint
CONTEXT:
  stack: NestJS + Prisma
  entity: Booking { id, date, userId }
CONSTRAINTS:
  length: < 50 lines
ASSUMPTIONS:
  - Auth guard global`}</pre>
              </div>
              <div style={{ padding: "clamp(12px,3vw,16px)", background: "#18181b", borderRadius: 10, border: "1px solid #f59e0b30" }}>
                <div style={{ fontSize: 11, color: "#f59e0b", fontWeight: 600, letterSpacing: 1.5, marginBottom: 6, textTransform: "uppercase" }}>Complex Task (with decomposition)</div>
                <pre style={{ fontSize: "clamp(11px,2vw,12px)", color: "#fbbf24", lineHeight: 1.7, fontFamily: "'IBM Plex Mono',monospace", whiteSpace: "pre-wrap" }}>{`INTENT: Full booking module
WHY: PinDay MVP feature
FOR: Team codebase

CONTEXT:
  stack: NestJS + Prisma + Stripe
  entities: Booking, Payment, Service

DECOMPOSE:
  task-1: Prisma schema for 3 entities
  task-2: CRUD controller + DTOs
  task-3: Stripe payment integration
  task-4: E2E tests
  strategy: 1 → 2,3 parallel → 4`}</pre>
              </div>
            </div>

            {[
              { task: "Code Generation", must: "INTENT, CONTEXT, CONSTRAINTS", decomp: "Split when: multi-file output, >2 entities, frontend + backend", tip: "Entity shape in CONTEXT eliminates 90% of guessing" },
              { task: "Agent System Prompts", must: "INTENT, CONTEXT (tools), CONSTRAINTS (format)", decomp: "Split when: >5 intents, complex routing, multiple tool chains", tip: "Highest GD ROI — agent loops multiply every wasted token" },
              { task: "Architecture Design", must: "INTENT, CONTEXT, CONSTRAINTS, DECOMPOSE", decomp: "Almost always decompose: overview → module details → implementation", tip: "Use hierarchical decomposition pattern" },
              { task: "Full-Stack Features", must: "All 6 pillars — DECOMPOSE is critical here", decomp: "Always decompose: DB → API → frontend → tests → deploy", tip: "Each layer gets its own GD prompt with prior layer output in CONTEXT" },
            ].map((r, i) => (
              <div key={i} style={{ padding: "clamp(14px,3vw,20px)", background: "#18181b", borderRadius: 10, border: "1px solid #27272a" }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: "#fafafa", fontFamily: "'Space Grotesk',sans-serif", marginBottom: 10 }}>{r.task}</div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(200px,100%),1fr))", gap: 10, marginBottom: 10 }}>
                  <div>
                    <div style={{ fontSize: 11, color: "#22c55e", fontWeight: 600, marginBottom: 3 }}>MUST HAVE</div>
                    <div style={{ fontSize: 12, color: "#a1a1aa" }}>{r.must}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 11, color: "#f59e0b", fontWeight: 600, marginBottom: 3 }}>DECOMPOSE WHEN</div>
                    <div style={{ fontSize: 12, color: "#a1a1aa" }}>{r.decomp}</div>
                  </div>
                </div>
                <div style={{ fontSize: 12, color: "#a78bfa", background: "#0a0a0b", padding: "8px 10px", borderRadius: 6 }}>
                  {r.tip}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}