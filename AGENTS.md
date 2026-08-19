# AGENTS.md

## Project overview
- This repository is a simple static resume builder.
- The main UI is driven by index.html, style.css, and script.js.
- Resume content is loaded dynamically from profile data files (see Profiles below).
- Personal résumé data lives in a separate git submodule at `data/` (see `.gitmodules.template`). Do not commit personal résumé JSON into this builder repo.

## Profiles
The toolbar profile switcher loads one of three data files by injecting a `<script id="resume-data-script">` that sets `window.resumeData`:

| Profile key | File | Label |
|-------------|------|-------|
| `current` | `./data/data.json.js` | Current |
| `grok` | `./data/data.json_grok.js` | Grok |
| `grok-full` | `./data/data.json_grok_full.js` | Grok full |

- The active profile is persisted in `localStorage['resume.activeProfile']`.
- The URL query parameter `?profile=` overrides localStorage on load (e.g. `?profile=grok`).
- Selecting a profile updates the URL via `history.replaceState` (no page reload).
- If `window.resumeData` is missing after loading a profile script, the loader falls back to `./data/data.json.js`, then `./data.json.js`.
- Re-rendering is idempotent: `#dynamic-sections` stays mounted and only its inner contents are replaced.
- `index.html` does not include a static data script tag; all loads go through the profile loader in `script.js`.

To set up the data submodule:
1. `git submodule add git@github.com:ujLion/resume.git data`
2. Copy `.gitmodules.template` to `.gitmodules` and adjust the URL if needed.

## Preview mode
- Click **Preview** in the toolbar to toggle `body.preview-mode`.
- Preview hides the toolbar for a clean résumé view.
- Entering preview pushes a history entry (`history.pushState`). The browser **Back** button (and clicking Preview again) returns to the previous chrome/toolbar state via `popstate`.
- Preview state is not persisted across reloads.
- The toolbar is also hidden when printing.

## Theme (dark / light)
- Click **Dark** / **Light** in the toolbar to toggle appearance. Buttons use inline SVG icons (no Material/Lucide).
- Both `html` and `body` use `theme-light` or `theme-dark` plus `data-active-theme`, so the full page canvas (not only the paper) changes color.
- The choice is persisted in `localStorage['resume.activeAppearance']` (`light` or `dark`).
- There is no automatic `prefers-color-scheme` switching.
- An inline script in `index.html` (`<head>`) applies the saved theme on `document.documentElement` before CSS to avoid a flash.
- CSS variables on `html.theme-light` / `html.theme-dark` (and the matching `body` classes) control canvas, paper, and accent colors.
- `@media print` forces the light palette regardless of the active theme.

## Layout
- `.preview-page` and `.page-content` use `box-sizing: border-box`. The paper is 980px wide including padding and border so the right edge stays outside the content.

## Data schema extensions
Top-level keys that are not rendered as sections: `name`, `location`, `phone`, `email`, `summary`, `intro`, `now`, `section_order`.

- **`section_order`**: optional `string[]` — when present, sections render in this order (missing keys are skipped). Otherwise object key order is used.
- **`now`**: optional string — shown as a chip under the intro block. Skipped when empty.
- **`products`** (alias `ventures`): array of `{ name, role, positioning/one_liner, url, dates/duration, facts[], stack[], status, description }`. Name links to `url` when set.
- **`prior_art`**: array of `{ title, description/details, organization/source, date, url }`. Section title is "Prior Art". Title links when `url` is set.

General rendering rules:
- Empty persona fields are skipped.
- `Domain:` and `Skills used:` labels are omitted when those values are empty.
- `skills_used` arrays are joined with `", "`.
- Education `institution` may be a string or `{ school, course }`.
- Portfolio items accept `url` or `link`, and `caption` or `link_text`.
- Trailing `"."` and `"…"` skill placeholders are filtered out.
- HTML in description fields is trusted and rendered as-is.

## General learnings
- Update résumé content in the data submodule (`data/data.json.js` and variants).
- The rendering logic lives in `script.js`; changes there affect how sections and rows are displayed.
- Empty values should be skipped during rendering so missing fields do not show as blank rows.
- A local preview can be served with Python's built-in HTTP server.
- Local HTTPS hostname is `resume-builder.local` (Caddy, `tls internal`, reverse proxy to `[::1]:8000`). Copy the site block from `Caddyfile` into `ujLion/caddy`.
- `https://resume-builder.local` is a **different origin** from `http://127.0.0.1:8000` (the Cursor side browser). Stylesheet cache and `localStorage` theme/profile keys do not carry across. After CSS changes, bump the `?v=` query on `style.css` / `script.js` in `index.html`, or hard-reload `.local`. Caddy sends `Cache-Control: no-store` for this site.

## Useful commands
- Start a local preview:
  - `python -m http.server 8000`
- Check the JavaScript file for syntax issues:
  - `node --check script.js`
- Open the preview in a browser at:
  - http://127.0.0.1:8000/
  - https://resume-builder.local (after Caddy is loaded and the host resolves to localhost)

## Commit guidance
- Keep commits atomic: each commit should represent one complete, focused change.
- Commit when a complete piece of work is marked done, not while the work is still half-finished.
- Avoid mixing unrelated fixes or features in the same commit.
- Write clear commit messages that describe the outcome of the change.
