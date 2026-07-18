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
live outside the disposable export bundle.

There are three deliberate assembly modes:

- Agentic faithful assembly is the default. The provider selects and linearizes
  source blocks into supported template sections. Normal builds validate the
  generated Markdown through the schema and a temporary Maizzle build; one or
  two repair attempts can use those failures as context.
- `--fallback-only` writes deterministic source-backed Markdown without an LLM
  call. It uses the same section contract and normal builds still validate it
  through Maizzle.
- `--legacy-teaser` belongs to the editorial wrapper and explicitly selects the
  older explanatory/dispatch path. It is separate from faithful assembly.

Use `--no-fallback` when a live run must prove that the provider produced the
draft. Use `--draft-only` to create or regenerate Markdown without building
HTML, then use `--build-from-draft` to build the operator-owned source without
calling the LLM.

The template linearizes browser interactions as follows:

- carousel views become ordered image/content blocks;
- accordions become expanded sections;
- region controls use the supplied United States content;
- browser-only controls become static copy or canonical links.

Editorial notes, grounding, provenance, research references, and explanations of
the artifact’s construction stay out of the email. The in-world About section,
legal language, product logic, complete supplied images, and authored sequence stay
in the email when the source packet supplies them.
