# Troubleshooting

A consolidated FAQ for the gotchas that bit us while building and wiring up the decompiler + MCP server. Each entry: **symptom → cause → fix**.

If you hit something that isn't here, the [decompiler-current-state.md](decompiler-current-state.md) reference doc has implementation details that might explain new failure modes.

---

## Decompiler

### "Classifier failed: terminated" or stream ends mid-tool-input

**Symptom.** `node scripts/decompile-email.mjs ...` runs, the classifier streams ~24,000 characters of partial JSON, then dies with `Error: terminated`. Happens reliably at roughly the same point regardless of input.

**Cause.** The classifier defaulted to `claude-sonnet-4-20250514` (Sonnet 4.0, May 2025). That model has a known issue where the stream terminates mid-response on large tool-input arguments. Real emails exceed its threshold.

**Fix.** Set `DECOMPILER_MODEL` in `.env` to a model that handles large tool outputs:

```env
DECOMPILER_MODEL=claude-opus-4-7        # validated default
# or
DECOMPILER_MODEL=claude-sonnet-4-6      # also works, ~6× cheaper than Opus
```

Per-run override on the CLI: `--model=claude-sonnet-4-6`.

The Sonnet 4.0 default is preserved as a legacy fallback (`DECOMPOSER_MODEL` env var still recognized) but not recommended.

---

### "ANTHROPIC_API_KEY not set" even though it's in `.env`

**Symptom.** The decompiler reports the key is missing, but `cat .env | grep ANTHROPIC_API_KEY` shows it set with a real value.

**Cause.** Some launching environments (notably the Claude Code desktop app) inject an empty `ANTHROPIC_API_KEY=` into subprocess environments. `dotenv`'s default behavior is to *not* override existing env vars, so the empty shell value wins over the file value.

**Fix.** Already applied in [lib/decompiler/config.mjs](../lib/decompiler/config.mjs) — `dotenv.config({ override: true, quiet: true })`. The `override` defeats empty injection; `quiet` suppresses a startup tip dotenv writes to stdout (which would corrupt the MCP stdio JSON-RPC channel — see next entry).

If you're writing a new entry point that needs `.env`, use the same flags.

---

### Decompiler output is summarized / says "[content truncated for brevity]"

**Symptom.** Rebuilt HTML has bracketed summaries like `[Contains multiple linked items with descriptions about John Muir...]` instead of the original text.

**Cause.** Early classifier prompt didn't forbid summarization; the model decided to paraphrase long content.

**Fix.** Already applied in [lib/decompiler/classifier.mjs](../lib/decompiler/classifier.mjs) — the system prompt now has CORE RULE 5: "NEVER SUMMARIZE, TRUNCATE, OR PARAPHRASE CONTENT. itemValues must contain the LITERAL text, HTML, URLs, and attributes from the source section, verbatim and complete."

If you see truncation reappear with a new model, check that rule made it through.

---

### Rebuilt email shows `<em>foo</em>` as visible text instead of italics

**Symptom.** HTML tags inside a slot value render as literal text in the rebuilt email.

**Cause.** The classifier emitted `{{slot_name}}` (escaped mustache) for a slot it marked as `rich_text` kind. Escaped mustache HTML-encodes the value.

**Fix.** Already applied in [lib/decompiler/emitter.mjs](../lib/decompiler/emitter.mjs) — the emitter's `rewriteSlots()` auto-promotes any `rich_text` slot to triple-mustache `{{{ }}}` (raw output) regardless of what the classifier wrote.

---

### Rebuilt email overflows the viewport on mobile (650px-wide table)

**Symptom.** At 375px viewport the rebuilt email scrolls horizontally; logos and headers appear cropped.

**Cause.** The source's inline styles include `min-width: 650px` on the layout table. The auto-generated mobile media query was setting `width: 100% !important` but not overriding `min-width`.

**Fix.** Already applied in [lib/decompiler/emitter.mjs](../lib/decompiler/emitter.mjs) `layoutHtml()` — the `@media (max-width: 599px)` block now includes `min-width: 0 !important` and the selector list covers `table[width], td[width]`.

---

### "posthtml-safe-class-names crashes" during Maizzle build

**Symptom.** `TypeError: node.attrs.class.split is not a function` during the build pass.

**Cause.** Source HTML had `class=""` (empty) attributes that the classifier preserved verbatim. The posthtml plugin doesn't handle empty class strings.

**Fix.** Already applied in [lib/decompiler/emitter.mjs](../lib/decompiler/emitter.mjs) `rewriteSlots()` — strips empty `class=""` attributes during slot rewriting.

---

### Decompiler finds only 1 section (or wrong layout root) on email-X.html

**Symptom.** `--dry-run` reports 1-2 candidate sections when there should clearly be 8+.

**Cause.** The segmenter's "find the layout root" heuristic stopped too early. Email HTML often nests sections inside multi-level wrappers (`table > tbody > tr > td > [sections]`).

**Fix.** Already applied in [lib/decompiler/segmenter.mjs](../lib/decompiler/segmenter.mjs) `findLayoutRoot()` — descends through any element where one structural child carries ≥70% of visible text (excluding `<style>`/`<script>` from the denominator).

If a NEW email still segments wrong, paste its top-level DOM into the issue and we can tune the heuristic.

---

## MCP server

### MCP server fails health check with cryptic JSON error

**Symptom.** `claude mcp list` shows `nfl-maizzle-mail: ... ✗ Failed to connect` with a JSON parse error.

**Cause.** Something in the server's startup path writes to stdout (which is the MCP transport channel). The corrupted output breaks the JSON-RPC handshake. The original culprit was dotenv@17 printing a startup tip line.

**Fix.** [lib/decompiler/config.mjs](../lib/decompiler/config.mjs) passes `quiet: true` to dotenv. If a NEW source of stdout noise creeps in (a stray `console.log` somewhere), redirect to stderr (`process.stderr.write(...)`) — stdout is sacred for MCP servers.

---

### Claude Desktop doesn't show a 🔧 tools icon — where are the MCP tools?

**Symptom.** You configured `claude_desktop_config.json`, restarted Claude Desktop, and don't see the wrench icon I described in early docs.

**Cause.** The wrench-icon-at-bottom-of-input UI exists in an older Claude Desktop. The newer multi-mode app (Chat / Cowork / Code tabs) doesn't surface MCP tools with that exact affordance.

**Fix.** Just ask the LLM. If the MCP server is configured and connected, sending "list my newsletter templates" will cause it to invoke `mcp__nfl-maizzle-mail__list_templates` — no UI hunt needed. Verify connection with `claude mcp list` from any terminal.

---

### `claude mcp list` shows `editorial: ✗ Failed to connect` after fresh checkout

**Symptom.** Other servers connect; the editorial server's compiled JS throws `ERR_MODULE_NOT_FOUND` on a `.ts` import.

**Cause.** TypeScript's NodeNext mode accepts `.ts` extensions in imports but doesn't rewrite them to `.js` on emit. Compiled JS retains `.ts` extensions which Node can't resolve.

**Fix.** In source `.ts` files, write imports with `.js` extension even though the source file is `.ts`:

```ts
// wrong (NodeNext won't rewrite this)
import { foo } from './bar.ts';

// right (TypeScript resolves logically to bar.ts, emits ".js" literally)
import { foo } from './bar.js';
```

Then clean and rebuild: `rm -rf dist && npm run build`. The fix is mechanical — find all `.ts`-extension imports and replace with `.js`.

---

### `newsletter-soup`: "NFL_API_KEY is required to start the NFL newsletter MCP server"

**Symptom.** The MCP server refuses to launch with that message.

**Cause.** `NFL_API_KEY` is the operator API key the soup-to-nuts MCP server uses to call its OWN HTTP API (which lives at `http://localhost:4000` by default). The HTTP API validates incoming requests against `BOOTSTRAP_API_KEY`. The two should hold the same value.

**Fix.** Two options:

1. **Apply the patch (recommended):** the MCP config now falls back to `BOOTSTRAP_API_KEY` (see [the patch in `src/mcp/config.ts`](https://github.com/julian/nfl-newsletter-email-soup-to-nuts)). Re-launch.
2. **Add `NFL_API_KEY` to `.env`:** set it to the same value as `BOOTSTRAP_API_KEY`.

Either way the launcher needs to actually load `.env` — use `node --env-file=.env --import tsx src/mcp/server.ts`.

---

### MCP tool calls work, but slow when classifier is involved

**Symptom.** `decompile_email` via MCP takes 1-5 minutes with no visible progress.

**Cause.** The classifier call dominates; it streams a large tool input from the model.

**Fix.** If the client supports `notifications/progress` (Claude Desktop and Claude Code both do), the server emits 5+ progress milestones with messages like `"classifier streaming (24,000 chars)"`. If you're invoking from a script that doesn't pass a `progressToken`, you won't see them — that's not a bug, just absent.

---

## Environment / config

### "Where do I put my Anthropic API key?"

**Always in `.env`** at the repo root, never as a shell export. The repo's tooling reads `.env` via `dotenv` (with `override: true`). Shell exports may leak across projects and aren't version-controlled with config story. See [the env-secrets memory note](../.claude/projects/-Users-julian-Code-nfl-maizzle-mail/memory/feedback_env_secrets.md) for the project convention.

If you need to add a NEW key, edit `.env` directly. Don't suggest `export FOO=bar` to anyone.

---

### Which model should I pin for `DECOMPILER_MODEL`?

| Model | Use it for | Avoid for |
|---|---|---|
| `claude-opus-4-7` | High-stakes brand work, complex layouts, when you want maximum classification quality. | Routine decompilations where cost matters — Opus is 5-6× the price of Sonnet 4.6. |
| `claude-sonnet-4-6` | Routine work, batch decompilations, anything where Opus 4.7 would be overkill. | (None — validated on the New Yorker corpus.) |
| `claude-sonnet-4-20250514` | (legacy Sonnet 4.0) | **Don't.** Stream-terminates on real emails. |
| `claude-haiku-*` | Untested. | Untested — probably too small for the structural reasoning required. |

Override per-run with `--model=<id>` on the CLI or in the MCP `decompile_email` tool's `model` argument.

---

## Build pipeline

### "warning: sections[N].title is empty" linter noise

**Symptom.** `validate_newsletter_markdown` or `scripts/lint-template.mjs` floods you with `title is empty` / `items array missing` warnings on a decompiler-generated newsletter.

**Cause.** The legacy lint script ([scripts/lint-template.mjs](../scripts/lint-template.mjs)) has hardcoded expectations of the dense-discovery convention (every section has `title` and `items[]`). The decompiler emits flat-slot sections that don't fit that shape.

**Fix.** Ignore the noise — the build will succeed. Long-term, the linter should be updated to consult the per-template schema instead of assuming the dense-discovery shape. Until then, look for *real* errors in the lint output and treat the title/items warnings as expected.

---

## Process / workflow

### "I made a code change in the decompiler — do I need to call the LLM again?"

No — use `--from-cache` (CLI) or `from_cache: true` (MCP tool) to re-emit from the cached classifier output without making a new API call:

```bash
node scripts/decompile-email.mjs emails-to-templatize/X.html --from-cache
```

The cache lives at `generated/<name>-classifier-output.json`. Delete it to force a fresh classifier run.

---

### "How do I make a Markdown change and verify it without re-decompiling?"

The decompiler is only for the FIRST template setup. Once `templates/<name>/` exists, you author and build with:

```bash
node scripts/build-newsletter.mjs content/your-issue.md campaign-name --template=<name>
```

No need to re-run the decompiler unless you want to re-derive the template from a different source email.
