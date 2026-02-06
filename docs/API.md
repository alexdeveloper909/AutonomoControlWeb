# AutonomoControlWeb — API integration

Source of truth:

- `../AutonomoControlApi/README.md`
- `../AutonomoControlApi/USAGES.md`

Client implementation:

- `src/infrastructure/api/autonomoControlApi.ts`

## Auth header

All authenticated requests include:

- `Authorization: Bearer <id_token>`

## Endpoints used by the web MVP

- `GET /health`
- `GET /workspaces`
- `GET /workspaces?includeDeleted=true` (Trash view)
- `POST /workspaces`
- `DELETE /workspaces/{workspaceId}`
- `POST /workspaces/{workspaceId}/restore`
- `POST /workspaces/{workspaceId}/share` (share workspace read-only by email)
- `GET /workspaces/{workspaceId}/settings`
- `PUT /workspaces/{workspaceId}/settings`
- `GET /workspaces/{workspaceId}/records?month=YYYY-MM&recordType=...&sort=eventDateDesc&limit=20&nextToken=...`
- `GET /workspaces/{workspaceId}/records?quarter=YYYY-Q1&recordType=...&sort=eventDateDesc&limit=20&nextToken=...`
- `GET /workspaces/{workspaceId}/records?year=YYYY&recordType=...&sort=eventDateDesc&limit=20&nextToken=...`
- `POST /workspaces/{workspaceId}/records`
- `POST /workspaces/{workspaceId}/summaries/months`
- `POST /workspaces/{workspaceId}/summaries/quarters`
- `POST /workspaces/{workspaceId}/summaries/renta`

## Read-only shared workspaces

When a workspace is shared with a user, the UI switches to read-only mode:

- Hide “Add …” buttons and block navigation to `.../new` routes.
- The API enforces read-only as well (write attempts return `403`).

## Record types

The API record types used in the web client are:

- `INVOICE`
- `EXPENSE`
- `STATE_PAYMENT`
- `TRANSFER`
- `BUDGET` (BudgetEntry)

## Example payloads

The MVP UI accepts raw JSON payloads. Use the examples from `../AutonomoControlApi/USAGES.md`.

## Add income (INVOICE)

The Income screen uses a dedicated form (not the raw JSON editor) and submits:

- `POST /workspaces/{workspaceId}/records`
- Body:
  - `recordType: "INVOICE"`
  - `payload` fields: `invoiceDate`, `number`, `client`, `baseExclVat`, `ivaRate`, `retencion`, optional `paymentDate`, `amountReceivedOverride`

## List income (INVOICE) with sorting + pagination

The Income screen lists year-scoped invoice records using:

- `GET /workspaces/{workspaceId}/records?year=YYYY&recordType=INVOICE&sort=eventDateDesc&limit=20&nextToken=...`

Notes:

- Sorting: `sort=eventDateDesc` (server-side).
- Pagination: `limit` controls page size (UI uses `20`). If the response includes `nextToken`, pass it back to fetch the next page (when `nextToken` is provided, `limit` is required).
- Response shape:
  ```json
  { "items": [ /* RecordResponse */ ], "nextToken": "optional-opaque" }
  ```

## Client-side caching and invalidation

The web client caches list/summaries responses using TanStack Query to avoid refetching when switching tabs.

- Record lists are cached per `workspaceId` + `recordType` + `year`.
- Summaries are cached per `workspaceId`.

When creating records, the UI invalidates caches so the next navigation refetches fresh data:

- `INVOICE` / `EXPENSE` / `STATE_PAYMENT`: invalidate the matching record list cache and `Summaries`.
- `TRANSFER` / `BUDGET`: invalidate the matching record list cache; do **not** invalidate `Summaries`.

## Add expense (EXPENSE)

The Expenses screen uses a dedicated form and submits:

- `POST /workspaces/{workspaceId}/records`
- Body:
  - `recordType: "EXPENSE"`
  - `payload` fields: `documentDate`, `vendor`, `category`, `baseExclVat`, `ivaRate`, `vatRecoverableFlag`, `deductibleShare`, optional `paymentDate`, `amountPaidOverride`

## List expenses (EXPENSE) with sorting + pagination

The Expenses screen lists year-scoped expense records using:

- `GET /workspaces/{workspaceId}/records?year=YYYY&recordType=EXPENSE&sort=eventDateDesc&limit=20&nextToken=...`

## Add state payment (STATE_PAYMENT)

The State payments screen uses a dedicated form and submits:

- `POST /workspaces/{workspaceId}/records`
- Body:
  - `recordType: "STATE_PAYMENT"`
  - `payload` fields: `paymentDate`, `type` (`Modelo303` | `Modelo130` | `SeguridadSocial` | `RentaAnual` | `Other`), `amount`

## List state payments (STATE_PAYMENT) with sorting + pagination

The State payments screen lists year-scoped state payment records using:

- `GET /workspaces/{workspaceId}/records?year=YYYY&recordType=STATE_PAYMENT&sort=eventDateDesc&limit=20&nextToken=...`

## Add budget entry (BUDGET)

The Budget screen uses a dedicated form and submits:

- `POST /workspaces/{workspaceId}/records`
- Body:
  - `recordType: "BUDGET"`
  - `payload` fields: `monthKey` (YYYY-MM), `plannedSpend`, `earned`, optional `description`, `budgetGoal`

## List budget entries (BUDGET) with sorting + pagination

The Budget screen lists year-scoped budget records using:

- `GET /workspaces/{workspaceId}/records?year=YYYY&recordType=BUDGET&sort=eventDateDesc&limit=20&nextToken=...`

## Add transfer (TRANSFER)

The Transfers screen uses a dedicated form and submits:

- `POST /workspaces/{workspaceId}/records`
- Body:
  - `recordType: "TRANSFER"`
  - `payload` fields: `date`, `operation` (`Inflow` | `Outflow`), `amount`, optional `note`

## List transfers (TRANSFER) with sorting + pagination

The Transfers screen lists year-scoped transfer records using:

- `GET /workspaces/{workspaceId}/records?year=YYYY&recordType=TRANSFER&sort=eventDateDesc&limit=20&nextToken=...`

Invoice example:

```json
{
  "invoiceDate": "2024-06-10",
  "number": "INV-42",
  "client": "Acme",
  "baseExclVat": 1000.0,
  "ivaRate": "STANDARD",
  "retencion": "STANDARD",
  "paymentDate": "2024-06-20"
}
```

BudgetEntry example:

```json
{
  "monthKey": "2024-07",
  "plannedSpend": 2000.0,
  "earned": 2500.0,
  "description": "Summer budget",
  "budgetGoal": "Save for tax"
}
```

## Event date derivation

Important for record keys and summaries: the backend derives `eventDate` per record type.
See `../AutonomoControlApi/USAGES.md`.
