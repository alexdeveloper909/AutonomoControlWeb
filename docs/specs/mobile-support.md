# Mobile Support Spec

## Goal

Make AutonomoControlWeb usable on phones and small tablets without changing the product model, API contracts, or desktop workflows.

The mobile experience should keep the current operations-console character from `docs/DESIGN.md`: compact, predictable, data-forward, and built from MUI primitives. The first release should prioritize reliable navigation, readable records, complete forms, and non-overflowing tax/balance views over a separate mobile-only product.

## Tracking

Use the phase task lists below as the source of truth while implementing this spec.

- Mark a task `[x]` only after the code is merged locally and the listed verification for that phase has been completed.
- Keep acceptance items unchecked until they are verified, even if the code change is already in place.
- If scope changes, add new checklist items to the owning phase instead of tracking them separately.

## Current State

- Stack: React, TypeScript, Vite, MUI 7, React Router, TanStack Query.
- App routes are centralized in `src/ui/app/AppRouter.tsx`.
- Authenticated workspace routes render through `src/ui/pages/WorkspaceLayoutPage.tsx`.
- Shared shell is `src/ui/components/AppShell.tsx`.
- Shared page heading is `src/ui/components/PageHeader.tsx`.
- Workspace service navigation is currently a persistent 280px left rail.
- Several pages already use responsive MUI breakpoints for form rows and filters.
- The main mobile risks are the fixed left rail, top bar crowding, rigid page headers, dense tables, and dialogs/forms with action rows that assume desktop width.

## Target Viewports

- Primary phone: 360px wide, portrait.
- Large phone: 390px to 430px wide, portrait.
- Small tablet: 600px to 900px wide.
- Desktop must remain functionally equivalent to the current layout.

## Non-Goals

- No backend, Core, API, or CDK changes.
- No rewrite to a new design system.
- No new record types or workflow changes.
- No offline mode.
- No installable PWA work in this phase.
- No full visual redesign of the landing page beyond mobile fit fixes.

## UX Principles

- One primary action per screen should be reachable without horizontal scrolling.
- Mobile navigation should expose the same workspace services as desktop.
- Desktop density stays intact; mobile can switch dense tables into cards or controlled horizontal scrollers.
- Read-only workspace behavior must remain unchanged: create/edit/delete actions hidden or blocked.
- Touch targets should be at least 44px high for tappable buttons, nav rows, and menu triggers.
- Text must wrap or truncate intentionally; no accidental body-level horizontal page scroll.
- RTL mode must continue to work for Arabic.

## Screen Inventory

### Public/Auth

- `/` landing page: responsive hero, feature grid, how-it-works, footer CTA.
- `/login`: centered auth card.
- `/auth/callback`: callback/loading state.

### Workspace List

- `/workspaces`: active/trash tabs, create action, workspace cards, details dialog.

### Workspace Shell

- `/workspaces/:workspaceId/*`: top bar, workspace/entity selector, service navigation, settings, user settings, sign out, back to workspaces.

### Autonomo Finance

- Income list/create/edit/created.
- Expenses list/create/edit/created.
- State payments list/create/edit/created.
- Summaries month/quarter/renta/iva.

### Planning

- Balance list/create/edit/created, account cards, account dialog, archive/close confirmations.
- Budget dashboard/list/create/edit/created.
- Regular spendings dashboard/list/create/edit/created.

### Business Entities

- Workspace settings business entity management.
- Business entity invoices list/create/edit.
- Business entity summary.

## Required Foundations

### Responsive App Shell

Update `src/ui/components/AppShell.tsx` and callers so:

- Desktop keeps the current left nav.
- Mobile hides the persistent left nav and uses a temporary MUI `Drawer` opened from an icon button in the top bar.
- The drawer contains the same `nav` content currently passed to `AppShell`.
- The drawer closes after a nav item is selected.
- Main content uses `Container` padding like `px: { xs: 2, sm: 3 }`, `py: { xs: 2, sm: 3 }`.
- The top bar supports wrapping or collapsing right-side controls so it does not overflow at 360px.
- The app title truncates with ellipsis when needed.

### Workspace Header Controls

Update `src/ui/pages/WorkspaceLayoutPage.tsx` so mobile top bar controls remain usable:

- Entity selector should not force a 190px minimum on phones.
- Workspace name can be hidden or truncated on phones if the title already shows it.
- Settings and back-to-workspaces should prefer icons or a compact overflow menu on phones.
- Read-only chip must remain visible when a shared workspace is open, but can move below the toolbar if necessary.

### Page Header

Update `src/ui/components/PageHeader.tsx` so:

- `title`, `description`, and `right` stack vertically on phones.
- The `right` action area becomes full width on phones.
- Multiple actions wrap with `useFlexGap` and no overflow.
- Desktop layout remains side-by-side.

### Mobile Tables

Introduce a reusable table strategy before touching individual pages.

Recommended component shape:

- `ResponsiveDataView` or equivalent in `src/ui/components/`.
- Desktop/tablet: render current `Table` surface.
- Phone: render a compact card/list representation for common record lists.
- For very dense analytic tables where cards would hide too much context, keep a horizontal scroller but constrain it to the table container only.

Minimum behavior:

- No page-level horizontal scroll at 360px.
- Row actions remain available through `MoreActionsMenu`.
- Empty/loading/error states remain visible in both table and card modes.
- Numeric values use tabular/nowrap treatment inside cards where useful.

### Forms and Dialogs

Audit create/edit pages and dialogs so:

- Field rows stack at `xs`.
- Final action rows stack or wrap on phones.
- Dialogs use `fullScreen` or mobile-appropriate margins at `xs`.
- Long helper text and validation messages wrap.
- Date, amount, select, multiline fields remain full width on phones.

## Per-Screen Requirements

### Landing Page

- Keep existing content and CTA.
- Ensure hero text, feature cards, and how-it-works rows do not overflow on 360px.
- Use existing MUI layout and theme; no new marketing redesign.

### Login Page

- Keep card centered.
- Ensure the provider button fits long provider labels and translated text.

### Workspaces Page

- Workspace cards already use responsive grid; verify 1-column phone layout.
- Top-right create action must not overflow the app bar.
- Tabs must fit or scroll horizontally if translated labels are long.
- Details and create dialogs need mobile-friendly layout.

### Workspace Shell

- Mobile must provide access to Income, Expenses, State payments, Summaries, Balance, Budget, Regular spendings.
- When a business entity is selected, mobile nav must switch to Invoices and Summary like desktop.
- Entity selector changes must route exactly as desktop does.
- Back to workspace list, workspace settings, user settings, and sign out remain reachable.

### Income, Expenses, State Payments

- Year filter and pagination controls should stack or wrap on phones.
- Record list should use mobile cards on phones:
  - primary line: event date plus amount/base value.
  - secondary lines: invoice/payment/state payment identifiers and party/category.
  - action menu on the right when writable.
- Desktop table behavior stays unchanged.

### Balance

- Header actions `Create account` and `Add entry` wrap or stack.
- Account filter and year selector already stack; verify no overflow.
- Account summary cards should remain one per row on phones.
- Ledger should use mobile cards on phones:
  - date, account, operation, amount, impact, running balance.
  - note shown after the financial summary.
  - action menu retained when writable.
- Account create/rename dialog must be comfortable on phones.

### Budget

- Summary metric grid should be 1 column on phones.
- Trend chart already has an internal scroller; verify the page itself does not scroll horizontally.
- Monthly budget table should become cards or a constrained table scroller:
  - month, status, spent, target, saved, savings rate, notes.
  - duplicate and exceptional-spend chips remain visible.

### Regular Spendings

- Dashboard action buttons wrap.
- Totals already stack; verify chart range toggle fits or wraps.
- Chart can keep internal horizontal scrolling.
- Upcoming list remains readable with amount chips.
- Definitions list should use cards on phones with name, schedule, start date, amount, and actions.

### Summaries

- Tabs should be scrollable on phones.
- Renta form-like estimate panels already stack; verify long translated labels.
- Month, quarter, and IVA tables may keep horizontal table scrolling because they are analytic comparison grids.
- The scroll must be local to the table container, not the whole page.
- Details dialogs should be `fullScreen` or otherwise fit phones.

### Business Entity Invoices

- Year filter and pagination controls wrap.
- Invoice list should use mobile cards:
  - received date, invoice date, invoice number, client, amount, tax base.
  - actions retained for writable active entities.
- Archived/read-only states remain visible.

### Business Entity Summary

- Year controls stack.
- Effective settings and year totals should become compact key/value sections.
- Month and quarter summary tables can be card lists on phones because each row is self-contained.

### Workspace Settings

- Main settings dialog should be mobile-friendly.
- Business entity section currently contains many horizontal form stacks; keep them stacked at `xs`.
- Renta planning, IVA planning, balance-account settings, sharing, delete/restore flows must remain reachable.
- Confirm destructive dialogs fit phones and keep the confirm button visible.

## Implementation Phases

### Phase 1 - Shell and Shared Primitives

Tasks:

- [ ] Add responsive `AppShell` drawer behavior.
- [ ] Make `PageHeader` responsive.
- [ ] Add reusable mobile action wrapping helpers if needed.
- [ ] Add the shared table/card strategy component or equivalent documented pattern.
- [ ] Update `WorkspaceLayoutPage` mobile header behavior for entity selector, workspace actions, and read-only visibility.
- [ ] Run `npm run typecheck`.

Acceptance:

- [ ] `/workspaces` fits at 360px without page-level horizontal scrolling.
- [ ] A workspace route fits at 360px without page-level horizontal scrolling.
- [ ] All workspace nav destinations are reachable from mobile.
- [ ] Desktop left nav still renders at `md` and above.

### Phase 2 - Core Record Lists and Forms

Tasks:

- [ ] Update Income list page for mobile filters, pagination, and row presentation.
- [ ] Update Expenses list page for mobile filters, pagination, and row presentation.
- [ ] Update State payments list page for mobile filters, pagination, and row presentation.
- [ ] Update create/edit/created pages for Income flows.
- [ ] Update create/edit/created pages for Expenses flows.
- [ ] Update create/edit/created pages for State payments flows.
- [ ] Update shared dialogs used by these flows for mobile sizing and action layout.
- [ ] Run `npm run typecheck`.
- [ ] Run `npm run lint`.

Acceptance:

- [ ] Record filters work on phone and desktop.
- [ ] Pagination works on phone and desktop.
- [ ] Empty states work on phone and desktop.
- [ ] Row actions work on phone and desktop.
- [ ] Create/edit navigation works on phone and desktop.
- [ ] No page-level horizontal scroll in core record pages.

### Phase 3 - Planning Screens

Tasks:

- [ ] Update Balance page mobile header actions, account cards, and ledger presentation.
- [ ] Update Balance create/edit/account dialogs for phones.
- [ ] Update Budget page summary grid, trend chart container, and monthly rows for phones.
- [ ] Update Regular spendings dashboard for mobile actions, totals, and chart controls.
- [ ] Update Regular spendings definitions list for phones.
- [ ] Keep analytic charts and table scrollers local to their own containers.
- [ ] Verify account dialogs and action menus on phones.
- [ ] Run `npm run typecheck`.
- [ ] Run `npm run lint`.

Acceptance:

- [ ] Balance account cards are usable on phones.
- [ ] Balance ledger is usable on phones.
- [ ] Budget analytics remain inspectable without body overflow.
- [ ] Regular-spending analytics remain inspectable without body overflow.
- [ ] Writable/read-only differences remain intact.

### Phase 4 - Tax and Business Entity Screens

Tasks:

- [ ] Update Summaries tabs for mobile behavior.
- [ ] Update Summaries tables and dialogs for phone-sized viewports.
- [ ] Update Business entity invoices list for phones.
- [ ] Update Business entity summary page for phones.
- [ ] Update Workspace Settings dialog for phones.
- [ ] Update the business entity settings section for phones.
- [ ] Run `npm run typecheck`.
- [ ] Run `npm run lint`.

Acceptance:

- [ ] Spanish tax summaries fit phones.
- [ ] Ukrainian FOP entity workflows fit phones.
- [ ] Dense analytic tables either have mobile cards or local horizontal scrolling.
- [ ] Entity selector plus entity-mode navigation works on phone.

### Phase 5 - Browser QA and Documentation

Tasks:

- [ ] Use the `docs/AI_BROWSER_TESTING.md` flow for real app smoke testing.
- [ ] Add mobile QA notes to `docs/DESIGN.md` after implementation decisions are settled.
- [ ] Capture follow-up bugs as separate tasks or spec additions.

Acceptance:

- [ ] Browser smoke test covers 360px width.
- [ ] Browser smoke test covers 390px width.
- [ ] Browser smoke test covers 768px width.
- [ ] Browser smoke test covers desktop width.
- [ ] Smoke test uses only the approved dev workspace unless the user explicitly approves mutations elsewhere.

## Verification Checklist

- [ ] `npm run typecheck`
- [ ] `npm run lint`
- [ ] Local browser smoke test at 360x800
- [ ] Local browser smoke test at 390x844
- [ ] Local browser smoke test at 768x1024
- [ ] Local browser smoke test at desktop width
- [ ] Check light mode
- [ ] Check dark mode
- [ ] Check LTR layout direction
- [ ] Check RTL layout direction
- [ ] Check read-only shared workspace mode
- [ ] Check no page-level horizontal scroll with a long workspace name
- [ ] Check no page-level horizontal scroll with a long business entity name
- [ ] Check no page-level horizontal scroll with long translated labels
- [ ] Check no page-level horizontal scroll with long client/category/note values

## Risks and Design Decisions

- Dense financial tables are not all equally suited to mobile cards. Transaction lists should become cards; analytic comparison tables can keep local scrollers.
- The app bar currently mixes title, entity selector, workspace name, settings, back link, user settings, and sign out. Mobile likely needs an overflow menu rather than trying to display every control inline.
- MUI `Dialog` defaults may be cramped on phones; use responsive `fullScreen` selectively for settings-heavy dialogs.
- RTL plus drawer anchoring must be tested, not assumed.
- Existing pages use many local table implementations. A reusable mobile view pattern should be introduced early to avoid drift.

## Open Questions

- Should mobile show a bottom navigation for the most-used workspace services, or is a drawer enough for the first release?
- Should mobile record cards show all row fields by default, or hide secondary details behind an expand action?
- Should `Sign out`, `User settings`, `Workspace settings`, and `Back to workspaces` be grouped into one account/workspace menu on phones?
- Do we want screenshots committed as QA artifacts, or only a written smoke-test note?
