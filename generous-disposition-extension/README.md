# Generous Disposition Extension

A VS Code extension for authoring structured AI prompts in `.gdp` format.

## Features

- **Syntax highlighting** — full TextMate grammar for `.gdp` files with block headers, keys, values, comments, and freeform sections
- **Real-time linting** — 14 diagnostic rules covering errors, warnings, and info-level hints
- **Quick-fix code actions** — automatic fixes for common linting issues
- **Autocomplete** — context-aware completions for block names, CONTEXT keys, CONSTRAINTS keys, and DECOMPOSE strategy/task fields
- **Hover documentation** — inline docs for all 8 canonical block headers
- **Token estimation** — per-block and total token counts with 3 model profiles (gpt-4/claude, gpt-3.5, llama-3)
- **Status bar** — live token count and prompt quality score
- **5 commands** — Create New Prompt, Run Linter, Estimate Tokens, Normalize Prompt, Convert Freeform
- **12 snippets** — quick insertion of blocks, templates, and common patterns

## Installation

### From VSIX

```bash
code --install-extension generous-disposition-0.1.0.vsix
```

### From Marketplace

Search for "Generous Disposition" in the VS Code Extensions view (`Ctrl+Shift+X`).

## Usage

### Creating a new prompt

1. Open the Command Palette (`Ctrl+Shift+P`)
2. Run **GD: Create New Prompt**
3. A new `.gdp` file opens with the full block template

### GD Format

A `.gdp` file is a structured prompt composed of named blocks. Each block starts with an uppercase header followed by a colon. Indented lines beneath belong to that block.

Use `---` to separate structured blocks from a freeform section at the end of the file.

### Blocks

| Block | Description |
|-------|-------------|
| `INTENT` | The core request or goal of the prompt (required) |
| `WHY` | The motivation or reason behind the request |
| `FOR` | The target audience or consumer of the output |
| `CONTEXT` | Background information, stack details, environment |
| `CONSTRAINTS` | Output format, length, style, and other limitations |
| `EXAMPLE` | Example input/output pairs to guide the model |
| `ASSUMPTIONS` | Assumptions the model should make |
| `DECOMPOSE` | Task breakdown with strategy (sequential/parallel) |

## Commands

| Command | ID | Description |
|---------|----|-------------|
| GD: Create New Prompt | `gd.createPrompt` | Open an untitled `.gdp` file with the full block template |
| GD: Run Linter | `gd.runLinter` | Parse and lint the active `.gdp` file, show results in output channel |
| GD: Estimate Tokens | `gd.estimateTokens` | Show per-block token breakdown in output channel |
| GD: Normalize Prompt | `gd.normalizePrompt` | Reorder blocks to canonical order and fix formatting |
| GD: Convert Freeform | `gd.convertFreeform` | Convert selected freeform text into GD structure |

## Configuration

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| `generousDisposition.tokenProfile` | string | `gpt-4 / claude (default)` | Token estimation profile to use |
| `generousDisposition.tokenWarningThreshold` | number | `800` | Warn when estimated token count exceeds this threshold |
| `generousDisposition.enableLinting` | boolean | `true` | Enable real-time linting for `.gdp` files |
| `generousDisposition.showStatusBar` | boolean | `true` | Show token count and score in status bar |

## Snippets

The following snippet prefixes are available in `.gdp` files:

| Prefix | Description |
|--------|-------------|
| `gd-full` | Full prompt template with all blocks |
| `gd-intent` | INTENT block |
| `gd-why` | WHY block |
| `gd-for` | FOR block |
| `gd-context` | CONTEXT block |
| `gd-constraints` | CONSTRAINTS block |
| `gd-example` | EXAMPLE block |
| `gd-assumptions` | ASSUMPTIONS block |
| `gd-decompose` | DECOMPOSE block |
| `gd-coding` | Coding prompt template |
| `gd-debugging` | Debugging prompt template |
| `gd-research` | Research prompt template |

## Sample Files

See the `samples/` directory for example `.gdp` files:

- `coding.gdp` — a coding task prompt
- `debugging.gdp` — a debugging task prompt
- `research.gdp` — a research task prompt

## GD Format Overview

```
INTENT: What you want built — include a deliverable noun

WHY: Business context or purpose

FOR: Audience and skill level

CONTEXT:
  language: TypeScript
  framework: NestJS

CONSTRAINTS:
  format: single file
  length: < 80 lines

EXAMPLE:
  Expected output fragment

ASSUMPTIONS:
  - Database is configured
  - Auth middleware exists

DECOMPOSE:
  task-1: Generate schema
  task-2: Create controller
  strategy: sequential

---
Freeform notes go below the separator.
```

- `INTENT` is required; all other blocks are optional.
- Use `---` to separate structured blocks from a freeform section.

## Publishing

```bash
# Package as VSIX
npm run package

# Publish to Open VSX
npx ovsx publish generous-disposition-0.1.0.vsix
```

## License

MIT
