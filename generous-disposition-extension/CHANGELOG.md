# Changelog

## [1.0.0] - 2026-03-13

### Added
- Fenced code block syntax highlighting with language injection (Python, TypeScript, JavaScript, JSON, Bash, Rust, Go, CSS, HTML, SQL, YAML)
- Extension and file icons matching the Generous Disposition visual identity (concentric circles)
- Icon theme contribution for `.gdp` files in the Explorer sidebar

### Changed
- Bumped to stable 1.0.0 release

## [0.1.0] - 2026-03-13

### Added
- Initial release of the Generous Disposition VS Code extension
- Syntax highlighting for `.gd` files via TextMate grammar
- Real-time linting with 14 diagnostic rules (errors, warnings, info)
- Quick-fix code actions for fixable diagnostics
- Autocomplete for block names, CONTEXT keys, CONSTRAINTS keys, DECOMPOSE strategy/task fields
- Hover documentation for all 8 canonical block headers
- Token estimation with 3 model profiles (gpt-4/claude, gpt-3.5, llama-3)
- Status bar showing live token count and prompt quality score
- 5 commands: Create New Prompt, Run Linter, Estimate Tokens, Normalize Prompt, Convert Freeform
- 12 snippets for quick block and template insertion
- Sample files: coding.gd, debugging.gd, research.gd
- Configurable token warning threshold (default: 800 tokens)
