# AGENTS.md

## Project overview
- This repository is a simple static resume builder.
- The main UI is driven by index.html, style.css, and script.js.
- Resume content is loaded from data/data.json.js.

## General learnings
- Update the resume content by editing data/data.json.js.
- The rendering logic lives in script.js; changes there affect how sections and rows are displayed.
- Empty values should be skipped during rendering so missing fields do not show as blank rows.
- A local preview can be served with Python's built-in HTTP server.

## Useful commands
- Start a local preview:
  - python -m http.server 8000
- Check the JavaScript file for syntax issues:
  - node --check script.js
- Open the preview in a browser at:
  - http://127.0.0.1:8000/

## Commit guidance
- Keep commits atomic: each commit should represent one complete, focused change.
- Commit when a complete piece of work is marked done, not while the work is still half-finished.
- Avoid mixing unrelated fixes or features in the same commit.
- Write clear commit messages that describe the outcome of the change.
