import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";

const VER = "0.2.0";

const EXAMPLE_CONTEXT = `PROJECT: PinDay — SaaS scheduling + payments for service pros
STACK: NestJS / TypeScript strict / Prisma ORM / PostgreSQL / Stripe / Google Calendar API
DEPLOY: Render (web service) / Node 20 / pnpm

ARCHITECTURE:
  pattern: modular monolith, one module per domain
  module-shape: controller + service + dto + entity per module
  api-style: REST, versioned (/api/v1/*)
  auth: JWT access + refresh tokens, global AuthGuard
  errors: global HttpExceptionFilter, HttpException only
  responses: { data: T, meta?: { page, total } } envelope

ENTITIES:
  User: { id, email, name, role(PROVIDER|CLIENT), stripeCustomerId? }
  Provider: { id, userId, businessName, stripeAccountId, calendarId }
  Booking: { id, clientId, providerId, serviceId, dateTime, duration, status, depositAmount }
  Service: { id, providerId, name, duration, price, depositPercent }
  Payment: { id, bookingId, stripePaymentIntentId, amount, status }

RELATIONS:
  User 1:1 Provider (if role=PROVIDER)
  Provider 1:N Service, Provider 1:N Booking
  Booking 1:1 Payment, Booking N:1 Service

CONVENTIONS:
  money: cents (integer), converted at API boundary
  dates: ISO 8601, stored UTC
  ids: cuid2 via Prisma
  naming: camelCase props, PascalCase classes, kebab-case files

EXTERNAL:
  Stripe: Connect for payouts, PaymentIntents for deposits
  Google Calendar: two-way sync via CalendarService
  Email: Resend SDK, templates in /src/mail/templates

ASSUMPTIONS:
  - Prisma handles all migrations, no raw SQL
  - All protected routes use @UseGuards(AuthGuard)
  - Background jobs via @nestjs/schedule
  - No GraphQL, REST only
  - Single deployable unit

DECOMPOSE:
  layer-1: CONTEXT.gdp (this file — project-wide)
  layer-2: MODULE.gdp (per src/ module — domain-specific)
  layer-3: TASK.gdp (per coding task — ephemeral)
  strategy: hierarchical — agent reads layer-1 always, layer-2 when scoped, layer-3 per prompt`;

const MODULE_GD = `# src/booking/MODULE.gdp — domain-specific context

MODULE: BookingModule
RESPONSIBILITY: CRUD + lifecycle for bookings

ENDPOINTS:
  POST   /api/v1/bookings ........ create (CLIENT role)
  GET    /api/v1/bookings/:id .... findOne (owner|provider)
  PATCH  /api/v1/bookings/:id/cancel  cancel (policy applies)
  GET    /api/v1/bookings ........ list (filtered by role)

DEPENDENCIES:
  imports: PaymentModule, CalendarModule, NotificationModule
  injects: PrismaService, StripeService, CalendarService

BUSINESS RULES:
  - Deposit required (% from Service.depositPercent)
  - Cancel < 24h: no refund
  - Cancel >= 24h: full deposit refund
  - No-show: no refund + client flag
  - Calendar event on CONFIRMED, deleted on CANCELLED

STATE MACHINE:
  PENDING → CONFIRMED (payment success)
  PENDING → CANCELLED (payment fail | client cancel)
  CONFIRMED → CANCELLED | COMPLETED | NO_SHOW

DECOMPOSE:
  sub-task-a: Booking CRUD (controller + service + DTOs)
  sub-task-b: Cancellation policy logic (service method)
  sub-task-c: State machine transitions (service + events)
  sub-task-d: Calendar sync integration
  strategy: a → b,c parallel → d (depends on state machine)`;

const TASK_GD = `# Ephemeral — used for a single coding task

TASK: Add cancellation policy enforcement to BookingService
PARENT: src/booking/MODULE.gdp (sub-task-b)

INTENT: Implement cancellation logic with time-based refund rules
WHY: Business rule enforcement for PinDay
FOR: PR review, must pass existing tests

CONTEXT:
  # Inherits from CONTEXT.gdp + MODULE.gdp
  method: BookingService.cancelBooking(bookingId, userId)
  rules: see MODULE.gdp BUSINESS RULES
  deps: PaymentService.refundDeposit(paymentId)

CONSTRAINTS:
  format: single service method
  length: < 40 lines
  include: time check, refund call, status update, event emit
  exclude: no controller changes

ASSUMPTIONS:
  - Booking includes createdAt for time calculation
  - PaymentService.refundDeposit() exists and returns void
  - @nestjs/event-emitter configured for BookingCancelledEvent`;

function tokEst(t) { return t.trim() ? Math.ceil(t.split(/\s+/).filter(Boolean).length * 1.33) : 0; }

const GUIDES = [
  { tool: "Claude Code", icon: "⌘", steps: ["CONTEXT.gdp at repo root → always read first", "MODULE.gdp per src/ directory → read when scoped to module", "Reference hierarchy in CLAUDE.md", "Agent reads ~350 tokens instead of scanning ~6,300 tokens of files"], example: `# CLAUDE.md\nAlways read CONTEXT.gdp first for project context.\nFor module work, also read src/{module}/MODULE.gdp.\nFollow conventions and decomposition patterns strictly.` },
  { tool: "Cursor", icon: "▸", steps: ["Embed CONTEXT.gdp in .cursorrules", "Use @file MODULE.gdp when working in a module", "DECOMPOSE block guides multi-file generation order", "Reduces context overhead by 94% per prompt"], example: `# .cursorrules\n# Full project context — see CONTEXT.gdp\nINTENT: Senior NestJS dev on PinDay\nCONTEXT:\n  See CONTEXT.gdp for project spec\n  See MODULE.gdp files for domain detail\nCONSTRAINTS:\n  - Follow module-shape from CONTEXT.gdp\n  - Respect DECOMPOSE strategies` },
  { tool: "Agent Chains", icon: "◈", steps: ["Parse CONTEXT.gdp DECOMPOSE block for task planning", "Generate sub-tasks from MODULE.gdp DECOMPOSE", "Each sub-task becomes a GD prompt with TASK.gdp", "Chain resolves dependencies: sequential, parallel, hybrid"], example: `// Agent reads DECOMPOSE strategy\nconst ctx = parseGD('CONTEXT.gdp');\nconst mod = parseGD('src/booking/MODULE.gdp');\n\n// Generate sequential chain from decompose\nfor (const task of mod.DECOMPOSE.tasks) {\n  const gdPrompt = buildGDPrompt(task, ctx, mod);\n  const result = await llm.complete(gdPrompt);\n  chainContext.add(result);\n}` },
  { tool: "Team Onboarding", icon: "◎", steps: ["New dev reads CONTEXT.gdp: project in 2 minutes", "MODULE.gdp per domain: business rules + state machines", "DECOMPOSE blocks show how features are built incrementally", "PR template checks: did you update .gdp files?"], example: `# Onboarding checklist\n1. Read CONTEXT.gdp (5 min)\n2. Read MODULE.gdp for your assigned module (3 min)\n3. Use TASK.gdp template for your first task\n4. Run GD Linter on your prompts before sending` },
];

export default function ContextGD() {
  const nav = useNavigate();
  const [tab, setTab] = useState("concept");
  const [guide, setGuide] = useState(0);
  const [layer, setLayer] = useState(0); // 0=context, 1=module, 2=task
  const ctxTok = useMemo(() => tokEst(EXAMPLE_CONTEXT), []);
  const modTok = useMemo(() => tokEst(MODULE_GD), []);
  const taskTok = useMemo(() => tokEst(TASK_GD), []);
  const trad = 6300;
  const sessNaive = trad * 15;
  const sessGD = ctxTok + ctxTok * 0.1 * 14;
  const sessRed = Math.round((1 - sessGD / sessNaive) * 100);

  const layers = [
    { name: "CONTEXT.gdp", sub: "Project root", color: "#22c55e", tok: ctxTok, content: EXAMPLE_CONTEXT },
    { name: "MODULE.gdp", sub: "Per module", color: "#a78bfa", tok: modTok, content: MODULE_GD },
    { name: "TASK.gdp", sub: "Per task", color: "#f59e0b", tok: taskTok, content: TASK_GD },
  ];

  return (
    <div style={{ fontFamily: "'IBM Plex Mono','SF Mono',monospace", background: "#0a0a0b", color: "#e4e4e7", minHeight: "100vh", lineHeight: 1.6 }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@300;400;500;600;700&family=Space+Grotesk:wght@300;400;500;600;700&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}
        ::-webkit-scrollbar{width:4px}::-webkit-scrollbar-track{background:#18181b}::-webkit-scrollbar-thumb{background:#3f3f46;border-radius:2px}
        @keyframes fu{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}.fu{animation:fu .4s ease-out both}
        @keyframes bg{from{width:0}}.bg{animation:bg 1s ease-out both}
        pre{overflow-x:auto}
      `}</style>

      <header style={{ padding: "clamp(20px,5vw,32px) clamp(16px,4vw,28px) clamp(14px,3vw,20px)", borderBottom: "1px solid #27272a" }}>
        <div style={{ maxWidth: 1000, margin: "0 auto" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4, flexWrap: "wrap" }}>
            <button onClick={() => nav("/")} style={{ background: "none", border: "1px solid #27272a", borderRadius: 6, color: "#71717a", cursor: "pointer", fontSize: 14, padding: "4px 8px", fontFamily: "'IBM Plex Mono',monospace", lineHeight: 1 }} title="Back to home">← back</button>
            <span style={{ fontSize: "clamp(18px,4vw,22px)", color: "#22c55e", fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700 }}>◈</span>
            <h1 style={{ fontSize: "clamp(18px,4vw,22px)", fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, letterSpacing: -0.5, color: "#fafafa" }}>CONTEXT.gdp</h1>
            <span style={{ fontSize: 11, color: "#3f3f46", background: "#18181b", padding: "3px 8px", borderRadius: 4 }}>v{VER}</span>
            <span style={{ fontSize: 10, color: "#f59e0b", background: "#f59e0b15", padding: "2px 8px", borderRadius: 10, fontWeight: 600 }}>3-LAYER</span>
          </div>
          <p style={{ fontSize: "clamp(11px,2.2vw,13px)", color: "#52525b", maxWidth: 600 }}>Hierarchical context decomposition: CONTEXT.gdp → MODULE.gdp → TASK.gdp. Replace thousands of tokens with structured layers.</p>
        </div>
      </header>

      <nav style={{ borderBottom: "1px solid #27272a", padding: "0 clamp(16px,4vw,28px)", position: "sticky", top: 0, background: "#0a0a0b", zIndex: 100, overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
        <div style={{ maxWidth: 1000, margin: "0 auto", display: "flex", minWidth: "max-content" }}>
          {[{ k: "concept", l: "Problem" }, { k: "layers", l: "3 Layers" }, { k: "compare", l: "Token Math" }, { k: "integrate", l: "Integration" }].map(t => (
            <button key={t.k} onClick={() => setTab(t.k)} style={{ padding: "12px clamp(10px,2.5vw,18px)", fontSize: "clamp(10px,2vw,12px)", fontFamily: "'IBM Plex Mono',monospace", fontWeight: tab === t.k ? 600 : 400, color: tab === t.k ? "#22c55e" : "#52525b", background: "none", border: "none", borderBottom: tab === t.k ? "2px solid #22c55e" : "2px solid transparent", cursor: "pointer", textTransform: "uppercase", letterSpacing: 1.5 }}>{t.l}</button>
          ))}
        </div>
      </nav>

      <main style={{ maxWidth: 1000, margin: "0 auto", padding: "clamp(20px,4vw,24px) clamp(16px,4vw,28px) 80px" }}>

        {tab === "concept" && (
          <div className="fu" style={{ display: "grid", gap: "clamp(14px,3vw,20px)" }}>
            <div style={{ padding: "clamp(16px,3vw,24px)", background: "#18181b", borderRadius: 12, border: "1px solid #27272a" }}>
              <h2 style={{ fontSize: "clamp(17px,4vw,20px)", fontFamily: "'Space Grotesk',sans-serif", fontWeight: 600, color: "#fafafa", marginBottom: 14 }}>The repo context problem</h2>
              <p style={{ fontSize: "clamp(13px,2.5vw,14px)", color: "#a1a1aa", marginBottom: 12 }}>AI coding tools dump <strong style={{ color: "#ef4444" }}>~6,300 tokens</strong> of files per prompt. In 15-step agent sessions, that's <strong style={{ color: "#ef4444" }}>94,500 tokens</strong> just on context.</p>
              <p style={{ fontSize: "clamp(13px,2.5vw,14px)", color: "#a1a1aa" }}><strong style={{ color: "#22c55e" }}>Solution:</strong> A 3-layer decomposition. Project-wide context is read once. Module context is loaded when scoped. Task context is ephemeral. Total: ~{ctxTok + modTok + taskTok} tokens for full specificity vs 6,300+ of file dumps.</p>
            </div>

            {/* Hierarchy visualization */}
            <div style={{ padding: "clamp(16px,3vw,24px)", background: "#18181b", borderRadius: 12, border: "1px solid #27272a" }}>
              <div style={{ fontSize: 11, color: "#f59e0b", fontWeight: 600, letterSpacing: 1.5, marginBottom: 16, textTransform: "uppercase" }}>◆ Hierarchical Decomposition</div>
              <div style={{ display: "grid", gap: 8 }}>
                {layers.map((l, i) => (
                  <div key={i} style={{ padding: "clamp(12px,2.5vw,16px)", background: "#0a0a0b", borderRadius: 10, border: "1px solid #27272a", borderLeft: `4px solid ${l.color}`, display: "grid", gridTemplateColumns: "1fr auto", gap: 8, alignItems: "center" }}>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 600, color: l.color, fontFamily: "'Space Grotesk',sans-serif" }}>{l.name}</div>
                      <div style={{ fontSize: 12, color: "#71717a" }}>{l.sub} — {i === 0 ? "always loaded" : i === 1 ? "loaded when module-scoped" : "ephemeral, per prompt"}</div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: 16, fontWeight: 700, color: l.color, fontFamily: "'Space Grotesk',sans-serif" }}>~{l.tok}</div>
                      <div style={{ fontSize: 10, color: "#52525b" }}>tokens</div>
                    </div>
                  </div>
                ))}
                <div style={{ padding: 12, background: "#0a0a0b", borderRadius: 10, border: "1px dashed #27272a", textAlign: "center" }}>
                  <span style={{ fontSize: 13, color: "#71717a" }}>Combined: </span>
                  <span style={{ fontSize: 16, fontWeight: 700, color: "#22c55e", fontFamily: "'Space Grotesk',sans-serif" }}>~{ctxTok + modTok + taskTok} tokens</span>
                  <span style={{ fontSize: 13, color: "#71717a" }}> vs </span>
                  <span style={{ fontSize: 16, fontWeight: 700, color: "#ef4444", fontFamily: "'Space Grotesk',sans-serif" }}>~6,300 tokens</span>
                  <span style={{ fontSize: 13, color: "#71717a" }}> of file dumps</span>
                </div>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(160px,100%),1fr))", gap: 14 }}>
              {[
                { l: "Per-prompt", v: "~6,300", c: "#ef4444", s: "file dumps" },
                { l: "Per-session", v: "~94,500", c: "#ef4444", s: "15 steps" },
                { l: "CONTEXT.gdp", v: `~${ctxTok}`, c: "#22c55e", s: "read once" },
              ].map((m, i) => (
                <div key={i} style={{ padding: "clamp(14px,3vw,20px)", background: "#18181b", borderRadius: 10, border: "1px solid #27272a", textAlign: "center" }}>
                  <div style={{ fontSize: 11, color: "#52525b", textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>{m.l}</div>
                  <div style={{ fontSize: "clamp(22px,5vw,28px)", fontWeight: 700, color: m.c, fontFamily: "'Space Grotesk',sans-serif" }}>{m.v}</div>
                  <div style={{ fontSize: 11, color: "#3f3f46" }}>{m.s}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === "layers" && (
          <div className="fu" style={{ display: "grid", gap: "clamp(14px,3vw,20px)" }}>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {layers.map((l, i) => (
                <button key={i} onClick={() => setLayer(i)} style={{ padding: "8px 14px", fontSize: 12, fontFamily: "'IBM Plex Mono',monospace", color: layer === i ? "#0a0a0b" : "#a1a1aa", background: layer === i ? l.color : "#18181b", border: "1px solid", borderColor: layer === i ? l.color : "#27272a", borderRadius: 6, cursor: "pointer", fontWeight: layer === i ? 600 : 400 }}>
                  {l.name}
                </button>
              ))}
            </div>

            <div className="fu" key={layer} style={{ padding: "clamp(16px,3vw,24px)", background: "#18181b", borderRadius: 12, border: "1px solid #27272a" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14, flexWrap: "wrap", gap: 8 }}>
                <div>
                  <h2 style={{ fontSize: "clamp(15px,3.5vw,18px)", fontFamily: "'Space Grotesk',sans-serif", fontWeight: 600, color: layers[layer].color }}>{layers[layer].name}</h2>
                  <p style={{ fontSize: "clamp(11px,2.2vw,13px)", color: "#52525b", marginTop: 3 }}>
                    {layer === 0 ? "Project-wide context — everything needed for any module" : layer === 1 ? "Module-specific: endpoints, rules, state machines, dependencies" : "Ephemeral task context — references parent MODULE.gdp"}
                  </p>
                </div>
                <span style={{ fontSize: 12, color: layers[layer].color, background: "#0a0a0b", padding: "6px 10px", borderRadius: 6, fontWeight: 600 }}>~{layers[layer].tok} tok</span>
              </div>
              <pre style={{ fontSize: "clamp(11px,2vw,12px)", color: layer === 0 ? "#86efac" : layer === 1 ? "#c4b5fd" : "#fcd34d", lineHeight: 1.7, fontFamily: "'IBM Plex Mono',monospace", whiteSpace: "pre-wrap", background: "#0a0a0b", padding: "clamp(12px,3vw,20px)", borderRadius: 8, border: "1px solid #27272a", maxHeight: "clamp(400px,60vh,600px)", overflowY: "auto" }}>
                {layers[layer].content}
              </pre>
            </div>

            {/* File tree */}
            <div style={{ padding: "clamp(16px,3vw,24px)", background: "#18181b", borderRadius: 12, border: "1px solid #27272a" }}>
              <div style={{ fontSize: 11, color: "#f59e0b", fontWeight: 600, letterSpacing: 1.5, marginBottom: 10, textTransform: "uppercase" }}>◆ Decomposed File Structure</div>
              <pre style={{ fontSize: "clamp(12px,2.2vw,13px)", color: "#a1a1aa", lineHeight: 1.8, fontFamily: "'IBM Plex Mono',monospace", whiteSpace: "pre-wrap" }}>{`your-project/
├── CONTEXT.gdp              ← Layer 1: project (~${ctxTok} tok)
├── CLAUDE.md               ← references CONTEXT.gdp
├── .cursorrules            ← references CONTEXT.gdp
├── src/
│   ├── booking/
│   │   ├── MODULE.gdp       ← Layer 2: domain (~${modTok} tok)
│   │   ├── booking.controller.ts
│   │   └── booking.service.ts
│   ├── payment/
│   │   ├── MODULE.gdp       ← Layer 2: domain
│   │   └── ...
│   └── auth/
│       ├── MODULE.gdp       ← Layer 2: domain
│       └── ...
└── # TASK.gdp files are ephemeral (Layer 3)`}</pre>
            </div>
          </div>
        )}

        {tab === "compare" && (
          <div className="fu" style={{ display: "grid", gap: "clamp(14px,3vw,20px)" }}>
            <div style={{ padding: "clamp(16px,3vw,24px)", background: "#18181b", borderRadius: 12, border: "1px solid #27272a" }}>
              <div style={{ fontSize: 11, color: "#52525b", fontWeight: 600, letterSpacing: 1.5, marginBottom: 14, textTransform: "uppercase" }}>Per-Prompt Context Cost</div>
              {[{ l: "Traditional file dumps", t: trad, w: 100, c: "#ef4444" }, { l: "CONTEXT.gdp only", t: ctxTok, w: Math.round(ctxTok / trad * 100), c: "#22c55e" }, { l: "CONTEXT + MODULE", t: ctxTok + modTok, w: Math.round((ctxTok + modTok) / trad * 100), c: "#a78bfa" }, { l: "Full 3-layer", t: ctxTok + modTok + taskTok, w: Math.round((ctxTok + modTok + taskTok) / trad * 100), c: "#f59e0b" }].map((t, i) => (
                <div key={i} style={{ marginBottom: 14 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 5 }}>
                    <span style={{ color: "#a1a1aa" }}>{t.l}</span>
                    <span style={{ color: t.c, fontWeight: 600 }}>{t.t.toLocaleString()} tok</span>
                  </div>
                  <div style={{ height: 8, background: "#27272a", borderRadius: 4, overflow: "hidden" }}>
                    <div className="bg" style={{ height: "100%", width: `${t.w}%`, background: t.c, borderRadius: 4 }} />
                  </div>
                </div>
              ))}
              <div style={{ fontSize: 12, color: "#52525b", textAlign: "center", marginTop: 4 }}>Even full 3-layer specificity uses {Math.round((ctxTok + modTok + taskTok) / trad * 100)}% of traditional file dumps</div>
            </div>

            <div style={{ padding: "clamp(16px,3vw,24px)", background: "#18181b", borderRadius: 12, border: "1px solid #27272a" }}>
              <div style={{ fontSize: 11, color: "#52525b", fontWeight: 600, letterSpacing: 1.5, marginBottom: 14, textTransform: "uppercase" }}>15-Step Agent Session</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(240px,100%),1fr))", gap: 14, marginBottom: 18 }}>
                <div style={{ padding: "clamp(14px,3vw,20px)", background: "#0a0a0b", borderRadius: 10, border: "1px solid #27272a", borderLeft: "3px solid #ef4444" }}>
                  <div style={{ fontSize: 11, color: "#ef4444", fontWeight: 600, marginBottom: 6, textTransform: "uppercase" }}>Traditional</div>
                  <div style={{ fontSize: 12, color: "#71717a", marginBottom: 10 }}>~6,300 tok × 15 steps</div>
                  <div style={{ fontSize: "clamp(22px,5vw,28px)", fontWeight: 700, color: "#ef4444", fontFamily: "'Space Grotesk',sans-serif" }}>{sessNaive.toLocaleString()}</div>
                </div>
                <div style={{ padding: "clamp(14px,3vw,20px)", background: "#0a0a0b", borderRadius: 10, border: "1px solid #27272a", borderLeft: "3px solid #22c55e" }}>
                  <div style={{ fontSize: 11, color: "#22c55e", fontWeight: 600, marginBottom: 6, textTransform: "uppercase" }}>3-Layer GD</div>
                  <div style={{ fontSize: 12, color: "#71717a", marginBottom: 10 }}>~{ctxTok} once + refs × 14</div>
                  <div style={{ fontSize: "clamp(22px,5vw,28px)", fontWeight: 700, color: "#22c55e", fontFamily: "'Space Grotesk',sans-serif" }}>{Math.round(sessGD).toLocaleString()}</div>
                </div>
              </div>
              <div style={{ textAlign: "center", padding: "clamp(16px,3vw,20px)", background: "linear-gradient(135deg,#052e16,#0a0a0b)", borderRadius: 10, border: "1px solid #166534" }}>
                <div style={{ fontSize: 11, color: "#52525b", textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 6 }}>Session Savings</div>
                <div style={{ fontSize: "clamp(36px,10vw,48px)", fontWeight: 700, color: "#22c55e", fontFamily: "'Space Grotesk',sans-serif", lineHeight: 1 }}>{sessRed}%</div>
                <div style={{ fontSize: 13, color: "#4ade80", marginTop: 6 }}>{(sessNaive - Math.round(sessGD)).toLocaleString()} tokens saved</div>
              </div>
            </div>
          </div>
        )}

        {tab === "integrate" && (
          <div className="fu" style={{ display: "grid", gap: "clamp(14px,3vw,20px)" }}>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {GUIDES.map((g, i) => (
                <button key={i} onClick={() => setGuide(i)} style={{ padding: "8px 12px", fontSize: "clamp(11px,2vw,12px)", fontFamily: "'IBM Plex Mono',monospace", color: guide === i ? "#0a0a0b" : "#a1a1aa", background: guide === i ? "#22c55e" : "#18181b", border: "1px solid", borderColor: guide === i ? "#22c55e" : "#27272a", borderRadius: 6, cursor: "pointer", fontWeight: guide === i ? 600 : 400 }}>{g.icon} {g.tool}</button>
              ))}
            </div>

            <div key={guide} className="fu" style={{ padding: "clamp(16px,3vw,24px)", background: "#18181b", borderRadius: 12, border: "1px solid #27272a" }}>
              <h3 style={{ fontSize: "clamp(15px,3.5vw,18px)", fontFamily: "'Space Grotesk',sans-serif", fontWeight: 600, color: "#fafafa", marginBottom: 14 }}>{GUIDES[guide].icon} {GUIDES[guide].tool}</h3>
              {GUIDES[guide].steps.map((s, i) => (
                <div key={i} style={{ display: "flex", gap: 10, padding: "8px 0", borderBottom: i < GUIDES[guide].steps.length - 1 ? "1px solid #1a1a1e" : "none" }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: "#22c55e", fontFamily: "'Space Grotesk',sans-serif", flexShrink: 0, width: 20 }}>{i + 1}.</span>
                  <span style={{ fontSize: "clamp(12px,2.2vw,13px)", color: "#a1a1aa", lineHeight: 1.5 }}>{s}</span>
                </div>
              ))}
              <div style={{ background: "#0a0a0b", borderRadius: 8, padding: "clamp(12px,3vw,20px)", border: "1px solid #27272a", marginTop: 14 }}>
                <div style={{ fontSize: 11, color: "#22c55e", fontWeight: 600, letterSpacing: 1.5, marginBottom: 6, textTransform: "uppercase" }}>Config</div>
                <pre style={{ fontSize: "clamp(11px,2vw,12px)", color: "#86efac", lineHeight: 1.7, fontFamily: "'IBM Plex Mono',monospace", whiteSpace: "pre-wrap" }}>{GUIDES[guide].example}</pre>
              </div>
            </div>

            <div style={{ padding: "clamp(16px,3vw,24px)", background: "#18181b", borderRadius: 12, border: "1px solid #27272a" }}>
              <div style={{ fontSize: 11, color: "#f59e0b", fontWeight: 600, letterSpacing: 1.5, marginBottom: 14, textTransform: "uppercase" }}>◆ 5-Minute Setup</div>
              {[
                { s: "1", a: "Create CONTEXT.gdp at repo root", d: "PROJECT, STACK, ENTITIES, CONVENTIONS, DECOMPOSE." },
                { s: "2", a: "Add MODULE.gdp to your main module", d: "ENDPOINTS, BUSINESS RULES, STATE MACHINE, DECOMPOSE." },
                { s: "3", a: "Reference from AI tool config", d: "One line in CLAUDE.md or .cursorrules." },
                { s: "4", a: "Use TASK.gdp template for complex tasks", d: "Ephemeral — include PARENT reference to MODULE.gdp." },
              ].map(s => (
                <div key={s.s} style={{ display: "grid", gridTemplateColumns: "32px 1fr", gap: "clamp(8px,2vw,16px)", padding: "12px 0", borderBottom: s.s !== "4" ? "1px solid #1a1a1e" : "none" }}>
                  <div style={{ fontSize: "clamp(16px,3.5vw,18px)", fontWeight: 700, color: "#22c55e", fontFamily: "'Space Grotesk',sans-serif" }}>{s.s}</div>
                  <div>
                    <div style={{ fontSize: "clamp(13px,2.5vw,14px)", fontWeight: 600, color: "#fafafa" }}>{s.a}</div>
                    <div style={{ fontSize: "clamp(11px,2.2vw,12px)", color: "#52525b" }}>{s.d}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}