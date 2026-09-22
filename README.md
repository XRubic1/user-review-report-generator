# User Review Report Generator

React + TypeScript app for evaluating verification workload from `.xls` reports.

## Setup

```
npm install
npm run dev
```

Client list is stored in the browser (`localStorage`) for now. Supabase schema is in [`supabase/schema.sql`](supabase/schema.sql) for later.

## Usage

- **Report** — upload a verification `.xls` (not stored). Filter by month. View workload table, charts, and P-VER list. Outside = batches on clients not assigned to that user.
- **Clients** — upload matrix: column A = client, B/C/D… = users. Saved locally. New clients from reports are auto-added (without user assignment).
