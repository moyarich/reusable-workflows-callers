# Reusable Workflows Callers — Monorepo Template

Starter template for npm-workspaces projects modeled on recent `moyarich` repositories.

## Structure

| Path                 | Purpose                                                             |
| -------------------- | ------------------------------------------------------------------- |
| `packages/example/`  | Buildable TypeScript library with Vitest tests                      |
| `apps/playground/`   | Vite + React playground consuming example library                   |
| `.github/workflows/` | CI, release, publishing, maintenance, and reusable workflow callers |
| `eslint.config.mjs`  | Shared ESLint flat config and Prettier compatibility                |
| `tsconfig.json`      | Shared TypeScript defaults                                          |

## Getting started

```sh
npm install
npm run dev
npm run checks
npm run pack:check
```

Root build and test scripts delegate to npm workspaces using `--workspaces --if-present`. Development targets the conventional `apps/playground` path, without hardcoding a package name. Vite handles individual workspace builds and the playground development server; no custom workspace runner is needed. Rename the `@template/*` workspaces and replace the example package with your own code.

## Workflows and release safety

This GitHub template is the canonical source for shared **thin callers** to workflows maintained in [`moyarich/reusable-workflows`](https://github.com/moyarich/reusable-workflows). A new repository created from the template receives workflow examples, not the central list of synchronization destinations. Review package selectors, release triggers, publishing secrets, branch names, and build paths before enabling workflows. In particular, automatic release/publish workflows should remain dry-run or disabled until intentionally configured.

The Workspace Tools CLI source in migrated callers is `checkout:upstream;branch:main`, not `checkout:current`, because this repository does not contain the Workspace Tools package. For reproducible releases, pin a published CLI version or immutable commit.

`check-dist.yml` is an opt-in example for projects that commit build outputs. If package `dist/` is gitignored, this check will fail until you explicitly choose to track distributions or replace it with an artifact-only check.

`npm run pack:check` uses npm's built-in `--workspaces` flag and includes all configured workspaces, so adjust the workspace selection if you only want to pack publishable packages.

## Typical scripts

`npm run dev`, `npm run build`, `npm test`, `npm run typecheck`, `npm run lint`, `npm run format:check`, `npm run checks`.

## Adapting this template

Add packages under `packages/*`, applications under `apps/*`, and their own `build`, `typecheck`, and `test` scripts. Keep reusable logic in packages and application-specific examples in playgrounds. Configure registry publishing only for real release packages.

## Tests and component stories

The template includes a root `vitest.config.ts`, `playwright.config.ts`, and `.storybook/` configuration. Vitest discovers `*.test.*` files in root, package and application test folders; Playwright discovers `*.spec.*` files and starts the Vite playground on port 4173. Storybook scans stories in application, package and source directories.

```sh
npm run test:unit
npx playwright install chromium
npx playwright test
npm run storybook
npm run build:storybook
```

The CI caller runs Playwright directly on `main`, manual dispatch and PRs changing spec/config files. Projects can change their Playwright fixtures and `webServer` settings in `playwright.config.ts`; no CI-specific package script is required. Storybook is a development-only workspace tool and is not included in the published example package.

## Workflow consumer inventory

Run the private/manual **Inventory reusable workflow consumers** GitHub Actions workflow (`workflow_dispatch`) to scan the default-branch workflow files of repositories accessible to `_WORKFLOW_TOKEN`. The workflow commits [the generated Markdown table](docs/workflow-consumers.md) and prints it in the Actions job summary. The token must have read access to all target repositories and write access to this repository. Private repositories are excluded by default. The manual `include-private` input opts in to publishing their names in this repository's committed inventory, which may be publicly readable.

## Release version selection

The `prepare-release-pr.yml` dispatch supports `package-json` (the default) to use each selected package's current declared `package.json` version without incrementing it, alongside `patch`, `minor`, and `major`.

## Centralized workflow synchronization

This repository is a **GitHub template and source repository**, not the controller for copying workflows. The canonical workflow caller YAML files live in `.github/workflows/`. The cross-repository destination inventory and synchronization engine are maintained separately in [`moyarich/reusable-workflows`](https://github.com/moyarich/reusable-workflows).

- [Central copy configuration](https://github.com/moyarich/reusable-workflows/blob/main/.github/copy-files-config.yml) specifies `source.repository: moyarich/reusable-workflows-callers`, filename patterns, destinations, and per-repository overrides.
- [Central `copy.yml` caller](https://github.com/moyarich/reusable-workflows-callers/blob/main/.github/workflows/copy-files-to-another-repository.yml) dispatches [`reusable_copy-files-to-another-repository.yml`](https://github.com/moyarich/reusable-workflows/blob/main/.github/workflows/reusable_copy-files-to-another-repository.yml).
- [Copier implementation and tests](https://github.com/moyarich/reusable-workflows/tree/main/packages/copy-files-to-another-repository) live upstream, not in this template.

**Do not add the central destination inventory to this template.** The `.github/copy-files-config.yml` in `reusable-workflows` is repository-local; it is neither copied to destinations nor shared automatically with repositories created from this template. A repository that independently calls the reusable copier must maintain its **own** `.github/copy-files-config.yml` with an explicit `source.repository`.

### Updating callers

Edit the desired canonical `.github/workflows/*.yml` file in this repository and merge the change here. Then run **Copy canonical workflow callers** from the [upstream Actions tab](https://github.com/moyarich/reusable-workflows-callers/actions/workflows/copy-files-to-another-repository.yml). Use `dry-run: true` to preview, optionally specify one `owner/repo` destination, and only set `dry-run: false` to create destination pull requests. The copy operation is manually dispatched; it is **not automatically triggered by merges here**.

Synchronization updates only selected workflows that already exist in the destination, unless its `create-files` allowlist explicitly enables creation. It does not delete removed workflows. Per-repository `exclude` and `overrides` rules are maintained in the upstream configuration. The engine checks publishing implementation compatibility and preserves template package selectors when the release package choice synchronizer is not selected. Review destination PRs and CI before merging; destination `main` is not directly rewritten by the default PR mode.

The upstream workflow expects its `workflow-token` secret, passed by the central caller from `_WORKFLOW_TOKEN`, with permission to read sources and create commits/PRs modifying destination workflow files. See the [copier operations guide](https://github.com/moyarich/reusable-workflows/blob/main/docs/02-guides/copy-files-to-another-repository.md) for configuration details and troubleshooting.
