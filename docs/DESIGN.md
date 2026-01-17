# UI Design + Theming Guidelines (Google Cloud Console-style)

This app is an operations UI for managing complex systems. We optimize for **clarity**, **speed**, and **high information density**, using patterns commonly found in the Google Cloud Console (resource-centric navigation, consistent page templates, strong status signaling).

## Goals

- Make critical state obvious (status, health, errors, warnings, pending actions)
- Keep common workflows fast (keyboard-friendly, minimal clicks, good defaults)
- Maintain consistent structure across pages (predictable scanning)
- Use MUI components and tokens (avoid one-off styling)

## Layout patterns

- **App shell**: persistent top bar + left navigation; content uses a consistent max width and page padding.
- **Page template** (recommended):
  - Title + short description
  - Primary actions on the right (e.g. Create, Deploy, Restart)
  - Tabs for major sub-views (Details / Records / Budgets / Summaries)
  - Main body: either a resource list (table) or a detail view (cards/sections)
- **Resource list pages**:
  - Filters/search at the top (always visible)
  - Table as the primary surface (sortable columns, compact rows)
  - Inline status chips/badges and last-updated timestamps
- **Detail pages**:
  - Summary header (name/id, key status, quick actions)
  - Sections as cards/accordions with clear headings
  - Related resources shown as tables

## Typography

- **Font**: sans-serif “Roboto-style” stack via MUI theme:
  - `Roboto, system-ui, -apple-system, Segoe UI, Helvetica, Arial, sans-serif`
- Prefer MUI typography variants (avoid raw `font-size` overrides).
- Use concise headings and short helper text; avoid long paragraphs in the UI.

## Color, status, and affordances

- Use color primarily for **status** and **severity** (success/warning/error/info), not decoration.
- Prefer MUI `Alert`, `Chip`, and `Tooltip` for status signaling and explanations.
- Reserve destructive actions for clearly labeled buttons with confirmation.

## Dark + light theme

- Support **light** and **dark** modes.
- Default mode follows the browser/OS preference (`prefers-color-scheme`).
- UI must remain readable in both modes (contrast, disabled states, borders, dividers).
- Add `meta name="color-scheme" content="light dark"` in `index.html` so native controls render correctly.

## Information density

- Default to **compact** tables and forms (small/medium component sizes).
- Keep spacing consistent; use MUI spacing (avoid arbitrary pixel values).
- Prefer structured surfaces (tables, lists, cards) over free-form text layouts.

## Loading, empty, and error states

- **Loading**: show skeletons or progress indicators within the affected region.
- **Empty**: explain what’s missing and offer the next action (e.g. “Create workspace”).
- **Errors**: show actionable messages and recovery steps; include request ids when available.

## Forms and validation

- Group related fields; keep labels short and consistent.
- Validate on blur/submit; show errors inline with clear instructions.
- Use helper text to show expected formats (JSON, ids, URLs), not long docs.

## Consistency rules

- Don’t introduce new colors, spacing rules, or typography scales outside the theme.
- Prefer composition of MUI components over custom CSS.
- Reuse existing page templates and components; if a new pattern is needed, document it here.

