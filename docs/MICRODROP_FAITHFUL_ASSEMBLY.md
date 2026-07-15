# Microdrop faithful assembly

`microdrop-faithful` is the email contract for page-shaped microdrop artifacts. The
assembly agent receives a semantic source packet from `nfl-editorial` and writes
template-valid Markdown. It does not write HTML, CSS, JavaScript, or Maizzle code.

The source and review layers are separate:

- `email.agent.md` is the latest generated draft.
- `email.md` is the operator-owned working source used by the build.
- `assembly-plan.json` records source-block coverage, transformations, warnings,
  and the prompt version.

The first run initializes `email.md` from `email.agent.md`. Later runs with
`--regenerate` replace only `email.agent.md`, leaving the working Markdown intact.

The Apple InfraMaximal workflow is normally invoked from `nfl-editorial`:

```bash
npm run mail:build:microdrop -- apple-watch-inframaximal-6502 --draft-only
# edit output/editorial-platforms/microdrop/apple-watch-inframaximal-6502/adjacency-microdrop-mail/email.md
npm run mail:build:microdrop -- apple-watch-inframaximal-6502 --build-from-draft
```

Use `--source-markdown /path/to/email.md` when the operator-owned source should
live outside the disposable export bundle. Use `--fallback-only` for a
source-backed local draft when an LLM call is unavailable. The fallback follows
the same section contract and still passes through the canonical newsletter
schema and Maizzle build.

The template linearizes browser interactions as follows:

- carousel views become ordered image/content blocks;
- accordions become expanded sections;
- region controls use the supplied United States content;
- browser-only controls become static copy or canonical links.

Editorial notes, grounding, provenance, research references, and explanations of
the artifact’s construction stay out of the email. The in-world About section,
legal language, product logic, complete supplied images, and authored sequence stay
in the email when the source packet supplies them.
