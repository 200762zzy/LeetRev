# LeetRev — Agent Guide

## Stack
- **Frontend**: React 19 + TypeScript 6 + Vite 8 + Tailwind CSS 3 + react-router-dom 7
- **Backend**: Tauri 2 (Rust) with SQLite via rusqlite (bundled), GraphQL/REST scraping of leetcode.cn
- **No monorepo tool** — `src/` is the Vite React app, `src-tauri/` is the Tauri/Rust crate.
- **Database**: SQLite stored at Tauri's `app_data_dir/leetrev.db` (auto-created + migrated on startup).

## Entrypoints
- `src/main.tsx` — React app root
- `src-tauri/src/main.rs` — Desktop binary entry
- `src-tauri/src/lib.rs` — Tauri setup, command registration, DB init
- `src-tauri/src/db.rs` — SQLite schema, migrations (`migrate()`), all CRUD
- `src-tauri/src/scraper.rs` — leetcode.cn scraping (GraphQL, submission, sync)

## Developer Commands
```sh
npm run dev          # Vite dev server (port 5173, strict)
npm run build        # tsc -b && vite build  (type-check before bundling!)
npm run lint         # ESLint flat config
npm run tauri        # Tauri CLI wrapper (e.g. `npm run tauri dev`)
npm run preview      # Vite preview of built frontend
```

Rust tests (in-memory SQLite):
```sh
cd src-tauri && cargo test
```

## TypeScript Constraints
- `verbatimModuleSyntax` — must use `import type` for type-only imports
- `erasableSyntaxOnly` — no `enum`, no `namespace`, no constructor parameter properties
- `noUnusedLocals` + `noUnusedParameters` — both enabled
- `noUncheckedSideEffectImports` — enabled

## Style Conventions
- **CSS**: Tailwind utility classes + custom component classes in `src/index.css` (`btn-primary`, `btn-secondary`, `btn-ghost`, `input-field`, `card`)
- **Custom color palette**: `primary-{50..950}` defined in `tailwind.config.js`
- **Imports**: Named exports, no default exports except `App`

## Tauri Backend
- Commands live in `src-tauri/src/commands.rs` — all use `#[tauri::command]` and are registered in `lib.rs::run()`.
- LeetCode session cookie stored in `settings` table under key `leetcode_session`.
- CSRF token cached globally (`CSRF_TOKEN` static mutex in scraper.rs).
- Problem cache (`PROBLEM_CACHE` static mutex) — lazy-loaded from leetcode.cn `/api/problems/all/`.
- SM-2 spaced repetition algorithm implemented in `db.rs` (`record_review`, `get_review_queue`).

## Testing (Rust only)
- `cargo test` from `src-tauri/` — uses `:memory:` SQLite via `Database::new(":memory:")`.
- Tests live in `db.rs` (`#[cfg(test)] mod tests`).
- No frontend JS test framework detected.

## Architecture Notes
- **Pages**: `Welcome` (dashboard with ECharts), `Problems` (list+filter), `ProblemForm` (add/edit), `ProblemDetail`, `ReviewSession` (SRS recall), `Settings`, `TagManager`
- **Components**: `Layout` (sidebar + API search), `CodeEditor` (CodeMirror wrapper), `ApiSearch` (STL API quick lookup), `CustomApiForm`
- **Scripts** (`scripts/`): Data generation for STL API reference database (build DB, gen STL entries). Not needed for normal dev.
- **API search** toggled via `Ctrl+Shift+A`.
- **LeetCode sync** flow: `fetch_user_progress` (basic info) → `fetch_problem_info` (detail via GraphQL) → save content + tags
