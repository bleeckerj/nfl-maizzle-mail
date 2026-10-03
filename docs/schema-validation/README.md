# Newsletter schema and authoring contract

Every maintained template owns `templates/<template>/newsletter.schema.json`. The schema defines accepted source values, authoring controls, defaults, and examples. The CLI generator and Backoffice read the same resolved contract through `scripts/newsletter-contract.mjs`.

Builds validate before rendering. Invalid values stop the build with the source path, section, field, supplied value, and accepted type or pattern. `--strict-schema` remains accepted for existing commands; validation is always required. A missing template schema is an error. Optional fields may be absent from an authored draft.

## Field roles

- Author fields declare a type and an explicit `default`, `examples`, `const`, or `enum` for starter generation. Structured objects and arrays declare their children. Use defaults only for actual rendering defaults.
- `readOnly: true` marks generated fields. They are omitted from new boilerplate. Existing source fields receive a compatibility notice before build normalization.
- `deprecated: true` marks legacy fields that remain accepted for existing drafts and are omitted from new boilerplate.
- `x-nfl-authoring` provides a narrower section or registry-item authoring view where rendering also consumes hydrated fields.

Reference-site annotations override referenced defaults. Section discovery combines common fields with the matching discriminator branch. Mutually exclusive alternatives remain alternatives. The generator rejects unknown section names and validates its result before writing it.

## Spacing and CTA controls

For Dense Discovery, Daily Headlines, and Brain Dead inline CTAs, `space_top`, `space_bottom`, `border_width`, and `border_radius` accept any nonnegative pixel number, numeric string, or `px` string, including zero and decimals. Examples include `0`, `7.5`, and `13.25px`. There is no size enum. Top and bottom spacing are additional space around the card; neighboring sections can contribute their own spacing.

`font_family` accepts `mono`, `sans`, or a CSS font stack. Blank lines in plain CTA statements create paragraph breaks. Authored block HTML retains its structure. The shared presentation helper preserves zero and prevents duplicate `px` suffixes.

## Source-only authoring

```sh
node scripts/generate-skeleton-from-schema.mjs --template dense-discovery --output /tmp/reference.md
node scripts/newsletter-contract.mjs --template dense-discovery
```

Full reference starters include working author controls. Backoffice's new issue workflow continues to omit unsourced example sections and seed its required recurring content. Section lookup exposes the schema constraints and the same examples used by the CLI. Section insertion uses those examples while clearing content collections so it never inserts invented registry IDs.

Generating, inserting, or saving source does not run tests or builds. Saving a draft preserves omitted optional controls. The old Python skeleton command delegates to the shared generator. Maintained templates also use it through the snippet command.

## Maintaining a schema

Update the schema, responsible renderer or normalizer, examples, and focused tests together. Never generate a production schema by scanning template expressions. That scan cannot distinguish source values from hydrated content or build helpers.

```sh
npm run schema:generate -- --entry templates/dense-discovery/newsletter.html --output /tmp/dense-discovery.schema.discovered.json
```

The scanner refuses to overwrite `newsletter.schema.json`. `workflow.sh --regen-schema` writes a separate discovery file for review. Review the differences against the maintained schema.

## Explicit verification

```sh
npm run test:newsletter-contracts
node scripts/build-newsletter.mjs /path/to/source-snapshot.md verification-output --no-open
```

The contract suite covers all twelve maintained schemas, generated source validity, reference annotations, conditional fields, excluded runtime controls, invalid values, schema protection, and rendered CTA behavior. A generated-source check does not prove every field's visual effect. Verify renderer changes with focused output assertions and a representative canonical build. Public artifact links still require the active publication registry and successful live validation.

The GitHub Actions job requires a `BACKOFFICE_READ_TOKEN` repository secret with read-only contents access to the private `bleeckerj/nfl-backoffice` repository. It checks out only `packages/nfl-native-lockups` for the existing local package dependency. Tests themselves run without network access. This change does not create or store that credential.
