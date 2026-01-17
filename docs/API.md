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
- `POST /workspaces`
- `GET /workspaces/{workspaceId}/settings`
- `PUT /workspaces/{workspaceId}/settings`
- `GET /workspaces/{workspaceId}/records?month=YYYY-MM&recordType=...`
- `GET /workspaces/{workspaceId}/records?quarter=YYYY-Q1&recordType=...`
- `POST /workspaces/{workspaceId}/records`
- `POST /workspaces/{workspaceId}/summaries/months`
- `POST /workspaces/{workspaceId}/summaries/quarters`

## Record types

The API record types used in the web client are:

- `INVOICE`
- `EXPENSE`
- `STATE_PAYMENT`
- `TRANSFER`
- `BUDGET` (BudgetEntry)

## Example payloads

The MVP UI accepts raw JSON payloads. Use the examples from `../AutonomoControlApi/USAGES.md`.

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

