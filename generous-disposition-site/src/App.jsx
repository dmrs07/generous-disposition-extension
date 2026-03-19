import { useNavigate } from 'react-router-dom'

const PAGES = [
  {
    path: "/framework",
    icon: "◎",
    title: "Generous Disposition",
    subtitle: "The Framework",
    desc: "Philosophy, 6 pillars, interactive split detector, TCC calculator, before/after showcases, and implementation guide.",
    color: "#a78bfa",
    tags: ["6 Pillars", "Split Detector", "TCC Calculator", "Benchmarks"],
  },
  {
    path: "/linter",
    icon: "◎",
    title: "GDP Spec & Linter",
    subtitle: ".gdp Format + Validator",
    desc: "Write and validate .gdp prompts in real-time. Decomposition analysis, block coverage scoring, and token estimates.",
    color: "#818cf8",
    tags: ["Live Editor", "Decompose Analysis", "Spec v0.2", "Cheat Sheet"],
  },
  {
    path: "/context",
    icon: "◈",
    title: "CONTEXT.gdp",
    subtitle: "Repo Context Compression",
    desc: "3-layer hierarchical context: CONTEXT.gdp → MODULE.gdp → TASK.gdp. Replace 6,300 tokens of file dumps with ~350.",
    color: "#22c55e",
    tags: ["3-Layer", "96% Savings", "Claude Code", "Cursor"],
  },
]

export default function App() {
  const nav = useNavigate()

  return (
    <div style={{ fontFamily: "'IBM Plex Mono','SF Mono',monospace", background: "#0a0a0b", color: "#e4e4e7", minHeight: "100vh", lineHeight: 1.6 }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@300;400;500;600;700&family=Space+Grotesk:wght@300;400;500;600;700&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}
        body{background:#0a0a0b}
        @keyframes fu{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
        .fu{animation:fu .5s ease-out both}
        .card-hover{transition:all .25s ease;cursor:pointer}
        .card-hover:hover{transform:translateY(-4px);border-color:#3f3f46!important;box-shadow:0 12px 40px rgba(0,0,0,.4)}
      `}</style>

      <div style={{ maxWidth: 860, margin: "0 auto", padding: "clamp(40px,8vw,80px) clamp(20px,5vw,40px)" }}>
        {/* Hero */}
        <div className="fu" style={{ textAlign: "center", marginBottom: "clamp(40px,8vw,64px)" }}>
          <div style={{ fontSize: "clamp(36px,8vw,56px)", color: "#a78bfa", fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, marginBottom: 8 }}>◎</div>
          <h1 style={{ fontSize: "clamp(28px,6vw,44px)", fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, color: "#fafafa", letterSpacing: -1, marginBottom: 12 }}>
            Generous Disposition
          </h1>
          <p style={{ fontSize: "clamp(14px,3vw,18px)", color: "#71717a", maxWidth: 560, margin: "0 auto", lineHeight: 1.6 }}>
            A framework for human-AI interaction that reduces token consumption by <strong style={{ color: "#a78bfa" }}>76%</strong> through structured generosity.
          </p>
          <div style={{ display: "flex", justifyContent: "center", gap: 12, marginTop: 24, flexWrap: "wrap" }}>
            {[
              { label: "76.4% TCC reduction", color: "#a78bfa" },
              { label: "6 pillars", color: "#f59e0b" },
              { label: "10-task benchmark", color: "#22c55e" },
            ].map(b => (
              <span key={b.label} style={{ fontSize: 12, color: b.color, background: `${b.color}12`, border: `1px solid ${b.color}30`, padding: "4px 12px", borderRadius: 20, fontWeight: 500 }}>{b.label}</span>
            ))}
          </div>
        </div>

        {/* Cards */}
        <div style={{ display: "grid", gap: "clamp(16px,3vw,20px)" }}>
          {PAGES.map((page, i) => (
            <div
              key={page.path}
              className="fu card-hover"
              style={{ animationDelay: `${i * 0.1}s`, padding: "clamp(20px,4vw,32px)", background: "#18181b", borderRadius: 16, border: "1px solid #27272a", display: "grid", gridTemplateColumns: "auto 1fr", gap: "clamp(16px,3vw,24px)", alignItems: "start" }}
              onClick={() => nav(page.path)}
            >
              <div style={{ width: "clamp(48px,10vw,64px)", height: "clamp(48px,10vw,64px)", borderRadius: 14, background: `${page.color}10`, border: `1px solid ${page.color}25`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "clamp(22px,5vw,30px)", color: page.color, flexShrink: 0 }}>
                {page.icon}
              </div>
              <div>
                <div style={{ display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap", marginBottom: 4 }}>
                  <h2 style={{ fontSize: "clamp(18px,4vw,22px)", fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, color: "#fafafa" }}>{page.title}</h2>
                  <span style={{ fontSize: 12, color: page.color, fontWeight: 500 }}>{page.subtitle}</span>
                </div>
                <p style={{ fontSize: "clamp(13px,2.5vw,14px)", color: "#71717a", lineHeight: 1.6, marginBottom: 12 }}>{page.desc}</p>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {page.tags.map(tag => (
                    <span key={tag} style={{ fontSize: 11, color: "#52525b", background: "#0a0a0b", padding: "3px 8px", borderRadius: 6, border: "1px solid #1f1f23" }}>{tag}</span>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="fu" style={{ animationDelay: "0.4s", textAlign: "center", marginTop: "clamp(40px,8vw,64px)", padding: "24px 0", borderTop: "1px solid #1f1f23" }}>
          <p style={{ fontSize: 13, color: "#3f3f46" }}>
            Built by Daniel / PinDay · Inspired by{" "}
            <span style={{ color: "#52525b" }}>AI Engineering</span>{" "}
            by Chip Huyen
          </p>
          <p style={{ fontSize: 12, color: "#27272a", marginTop: 6 }}>
            Complementary to TOON · v0.2.0 · 2026
          </p>
        </div>
      </div>
    </div>
  )
}
