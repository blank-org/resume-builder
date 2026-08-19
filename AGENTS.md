# AGENTS.md

Static HTML résumé builder. No framework, bundler, tests, or package manager. The browser loads `index.html`, which pulls in `style.css` and `script.js`. `script.js` injects a profile data file (`window.resumeData = { ... }`) and renders the page. Re-render is idempotent: `#dynamic-sections` stays mounted.

README.md is stale (it still mentions `app.js` and `template.html`, which do not exist). Trust this file and the code.

## Layout

```
index.html                 # toolbar + paper chrome (name, intro, summary, #dynamic-sections) + #resume-footer
style.css                  # CSS variables, screen + @media print (980px page)
script.js                  # profile/theme/preview chrome + all rendering
Caddyfile                  # resume-builder.local → [::1]:8000
data.json.js.example       # schema template (on origin/main)
data/                      # git submodule: personal résumé data (separate repo)
  data.json.js             # Current profile (live consulting résumé)
  data.json_grok.js        # Grok one-pager (founder)
  data.json_grok_full.js   # Grok full (founder + selected engineering)
  data.json_elon.js        # Elon one-pager
  data.json_elon_full.js   # Elon full
  data.json_pratham.js     # extra résumé file (not in the profile switcher)
  README.md
  .gitignore               # ignores archive/
.gitmodules.template       # sample submodule URL (on origin/main)
.gitignore                 # contains `.gitmodules` so each clone can use its own data repo
.vscode/settings.json      # VS Code window title only
LICENSE                    # MIT, blank-org
```

No `package.json`, Makefile, pyproject, CI, `.env`, Cursor rules, CONTRIBUTING, or CLAUDE.md.

## Git

- Default branch: `main`
- Builder remote: `git@github.com-p:blank-org/resume-builder.git`
- SSH host alias is `github.com-p` (not `github.com`)
- Data remote (this machine): `git@github.com-p:ujLion/resume.git` → path `data/`
- `core.autocrlf=input`

On origin/main, `.gitmodules` is **gitignored**. Copy `.gitmodules.template` and point `url` at the résumé-data repo. Do not commit personal data or `.gitmodules` into the builder repo.

Keep builder changes and data changes in **their own repos**. Do not mix them in one commit.

## Run (nothing to install)

Serve the **repo root** so `./data/*.js` resolves.

- VS Code Live Server: open `index.html`
- Python: `py -m http.server 8000` then http://127.0.0.1:8000/
- Prefer http:// over `file://` (Google Fonts + relative script loads)
- Local HTTPS: `resume-builder.local` (Caddy, `tls internal`, reverse proxy to `[::1]:8000`). Copy the site block from `Caddyfile` into `ujLion/caddy` (`caddyfile`) so it loads with the rest of the `.local` sites.

Shareable profile URL: http://127.0.0.1:8000/?profile=grok (`current` | `grok` | `grok-full` | `elon` | `elon-full`).

PDF: browser Print → Save as PDF. There is no export script. Print CSS forces the light palette and **hides the toolbar and footer**.

## Toolbar (hidden in print and preview-mode)

Sits above `.preview-page`. Native `<select>` / `<button>` only (no custom select overlay, no icon fonts). Buttons are icon-only SVGs.

| Control | Markup | Persistence |
|---------|--------|-------------|
| Profile | `#profile-select` | `localStorage['resume.activeProfile']` **and** `?profile=` query. Query wins on load. Changing the select calls `history.replaceState` (no reload). |
| Preview | `#preview-toggle` | **Not** persisted. Toggles `preview-mode` on `<body>` and `aria-pressed`. Hides the toolbar and footer so only the paper résumé shows. Entering preview `history.pushState`; Back (or Preview again) restores chrome via `popstate`. |
| Dark mode | `#theme-toggle` | `localStorage['resume.activeAppearance']` = `light` \| `dark`. Sets `html` and `body` to `theme-light` / `theme-dark` plus `data-active-theme`. `aria-pressed` is true when dark. An inline script in `<head>` applies the saved theme on `document.documentElement` before CSS to avoid a flash. **No** `prefers-color-scheme` auto-switch. |
| Underline links | `#underline-toggle` | `localStorage['resume.linkUnderline']` = `true` \| `false`. Toggles `links-underline` on `html` and `body`. |

Profile files:

| id | src | label |
|----|-----|-------|
| `current` | `./data/data.json.js` | Current |
| `grok` | `./data/data.json_grok.js` | Grok |
| `grok-full` | `./data/data.json_grok_full.js` | Grok full |
| `elon` | `./data/data.json_elon.js` | Elon |
| `elon-full` | `./data/data.json_elon_full.js` | Elon full |

Do **not** add a static `<script src="./data/data.json.js">` in `index.html` — that would double-define `window.resumeData` against the loader. The loader injects/replaces `#resume-data-script`. If `window.resumeData` is still missing, it tries `./data/data.json.js`, then root `./data.json.js`.

Do not overwrite `data/data.json.js` (live consulting résumé; may have local edits). Leave it as the Current profile. Grok files must not include Avyaan / avyaan.tech jobs or the avyaan.tech email.

## Theme tokens

Copied names: `--body-bg`, `--body-text`, `--surface-bg`, `--surface-border`, `--muted-text`, `--icon-color`, `--icon-color-active`, `--accent-primary`.

Light canvas is BrandStudio-like (`#f7f7f8`); résumé accent stays near `#00599A` / `#6CA9DB`. Dark canvas is slate `#0f172a` / text `#e2e8f0`. `@media print` resets to light.

`.preview-page` and `.page-content` use `box-sizing: border-box`. The paper is 980px wide including padding and border so the right edge stays outside the content.

## Footer

`#resume-footer` sits below the paper. It is generic builder chrome, not résumé data: `Copyright (c) Resume Builder`. Hidden in preview and print.

## Checks

There is no test, lint, or typecheck suite.

```
node --check script.js
node --check data/data.json.js
node --check data/data.json_grok.js
node --check data/data.json_grok_full.js
node --check data/data.json_elon.js
node --check data/data.json_elon_full.js
```

## Data model

Data files are JavaScript, not raw `.json`:

```js
window.resumeData = { ... };
```

### Top-level keys

| Key | Renders as | Notes |
|-----|------------|--------|
| `name` | `<h1>` + document title (`{name} - Résumé`) | not a dynamic section |
| `summary` | blockquote | `string` or `string[]`. 1 item → `<p class="summary-item">`; 2+ → `<ul class="summary-list">`. A string is split on `.` and newlines. |
| `intro` | top-right | `{ designation, experience }` — not a dynamic section |
| `now` | chip under intro | optional string; skip if empty. Not a section. |
| `section_order` | — | optional `string[]` of top-level keys. If present, render those keys in that order (skip missing). Else object key order. |
| `products` (alias `ventures`) | product blocks | `{ name, role, positioning\|one_liner, url, dates\|duration, facts[], stack[], status, description }` |
| `prior_art` | dated rows | like recognitions: `{ title, description\|details, organization\|source, date, url }`. Title is a link when `url` is set. |
| `skills` | category list | object of `categoryName → string[]`. Trailing `"."` / `"…"` placeholders are filtered. |
| `experiences` | job blocks | array; also matched by `{role, organization\|company}` |
| `recognitions` | dated rows | `{ title, description\|details, organization, date }` |
| `portfolio` | links | `{ title, url\|link, caption\|link_text, date? }`. Never print `"undefined"`. |
| `education` | dated rows | `{ degree, course?, institution, duration\|dates }`. `institution` may be a string **or** `{ school, course }`. |
| `persona` | label/value rows | object of label → string or string[]; empty values skipped |
| `contact` | label/value rows | `{ address, phone, email }` via generic object fallback |

Keys that never become sections: `name`, `location`, `phone`, `email`, `summary`, `intro`, `now`, `section_order`. Nested `contact.phone` still shows inside Contact.

Any other object/array key still renders. Title is the key with `_` → space and words capitalized (`prior_art` → `Prior Art`). Unknown array item shapes dump as `<pre>JSON</pre>`.

### Experience fields

`role`, `organization` (alias `company`), `duration` (alias `dates`), `work_mode` (optional), `skills_used` (string[] joined with `, `), `description`, `domain` (string or array).

Empty `domain` / `skills_used` do **not** print the `Domain:` / `Skills used:` labels.

### Content conventions

- Skills category names are free-form; they become the bold labels.
- Optional persona fields: omit the key or use `""` / `[]` so skip logic hides the row.
- Extra persona keys work without renderer changes. Grok profiles omit persona (founder/US style).
- Education `course` is optional.
- Portfolio `date` is optional.
- Data is interpolated as HTML with **no escaping**. Only put trusted text in the JSON.

Schema for a new résumé: copy `data.json.js.example`.

## Where to change what

| Task | File |
|------|------|
| Update Current résumé | `data/data.json.js` (commit in the **data** repo) |
| Update Grok / Elon variants | matching files in the data repo |
| Switch profile in the UI | toolbar, `?profile=`, or `localStorage['resume.activeProfile']` |
| Reorder sections | `section_order` in the data file (else reorder top-level keys) |
| Add a section that matches an existing shape | add the key; generic renderer handles experience / education / recognition / portfolio / products / prior_art / persona-like objects |
| Add a new section shape | `renderSection` / `renderGenericItem` in `script.js` |
| Layout, colors, print, dark mode | `style.css` |
| Header / summary / now chip / toolbar / footer | `index.html` plus chrome/render code in `script.js` |
| Example schema for others | `data.json.js.example` |

## Renderer pitfalls

- Live path: `renderSection` → `renderSkills` / `renderGenericItem` / `renderGenericObjectFallback`. Unused helpers at the bottom of `script.js` (`renderExperience`, `renderEducation`, `renderRecognition`, `renderPortfolio`, `renderPersona`) are not on the live path; leave them unless they confuse an edit.
- Re-render must keep `#dynamic-sections` and replace its contents. Do not remove the mount node. Last section gets class `print-bottom-border`.
- `avoid-break` special-case looks for keys `contact-info` / `contact_info`, not `contact`.
- `.section-separator` uses `:not(:first-child)` to skip a top rule on the first block in a section.
- Only **Lato** is loaded from Google Fonts. CSS also names Roboto Slab and Merriweather; they fall back when offline.
- Do not copy BrandStudio’s dual theme-family, custom select overlay, Material Icons, Lucide, index-toggle, or `window.BRAND` injection.

## Data submodule

```
copy .gitmodules.template .gitmodules
# edit url, then:
git submodule add git@github.com-p:USER/resume.git data
```

`data/data.json.js` remains the Current profile. Grok/Elon files live beside it in the data repo.

## Deploy

None. Static files; any static host works. Google Fonts needs network. No env vars or secrets.

## Commits

- Atomic: one complete, focused change per commit.
- Commit when the piece is done, not half-finished.
- Do not mix unrelated fixes.
- Do not mix builder + data changes into one repo.
- Message describes the outcome.
- Builder repo: renderer/CSS/chrome/example only.
- Data repo: personal `data.json.js` and profile variants.
- Do not commit `.gitmodules` (gitignored on origin) or private résumé content into `blank-org/resume-builder`.
