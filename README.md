# trio-tanstack-table

A high-performance, feature-rich React data table built on **@tanstack/react-table** (v8) and styled with **Ant Design** theme tokens.

It ships virtualization, live URL sync, inline editing, grouping with server summaries, config-driven toolbar actions (export/import/print/…), saved views, and a fully theme-able, slot-based styling API.

---

## Features

* ⚡ **Virtualized rendering** — tens of thousands of rows via `@tanstack/react-virtual`.
* 🔗 **Live URL state sync** — paging, sorting, filtering, search. [URL Sync Guide](docs/url_sync.md).
* ✏️ **Inline cell editing** — text, select, date, and more. [Editable Cells Guide](docs/editable_cells.md).
* 📊 **Grouping & server summaries** — collapsible group headers with accurate server-side counts/totals. [Grouping Guide](docs/grouping_and_summaries.md).
* 🔄 **Flexible pagination** — virtual scroll, cursor, and traditional paging.
* 💾 **Saved Views** — built-in `localStorage` control (zero backend) or bring your own via a render hook; supports an auto-applied default view.
* 🧰 **Config-driven toolbar actions** — `options.export` and `options.actions`; you decide what happens on click (the package injects table state + selection + apiClient).
* 🎨 **Slot-based styling** — per-slot `style` and `classNames` overrides, plus full Ant Design token theming and CSS variables.
* 📐 **Density & row height** — Standard / Comfortable / Compact, plus a fixed `rowHeight`.

---

## Installation

```bash
pnpm add trio-tanstack-table
# or
npm install trio-tanstack-table
```

Install the peer dependencies (note **`@tanstack/react-query`** is now required):

```bash
pnpm add react react-dom antd react-router-dom @tanstack/react-query
```

Import the CSS once in your entry file:

```ts
import "trio-tanstack-table/dist/index.css";
```

---

## Setup: `TableConfigProvider`

The package does **not** bundle its own HTTP client or React Query instance — you provide them. Wrap your app (or at least the tables) once:

```tsx
import axios from "axios";
import { TableConfigProvider } from "trio-tanstack-table";

const apiClient = axios.create({
  baseURL: "https://api.yourapp.com",
  withCredentials: true,
});

export default function AppRoot() {
  return (
    <TableConfigProvider
      config={{
        apiClient,                                  // required — used by dynamic selects & action ctx
        // queryClient,                             // optional — defaults to a built-in one
        selectParams: { pageSizeKey: "limit" },     // optional — map pagination param names
      }}
    >
      <YourTables />
    </TableConfigProvider>
  );
}
```

| `config` field | Purpose |
|---|---|
| `apiClient` | **Required.** Your Axios instance. Powers `ProSelect` dynamic dropdowns and is passed into every action handler. Injecting your own client is what avoids CORS to a backend you don't control. |
| `queryClient` | Optional React Query client. A `QueryClientProvider` is built in; pass your own only to share your app's cache. |
| `selectParams` | Maps the package's pagination concepts to your API's query-param names: `pageKey` (`"page"`), `pageSizeKey` (`"pageSize"`), `searchKey` (`"search"`), `filtersKey` (`"filters"`). |

> `useTableConfig()` throws if a provider is missing (so misconfig fails loudly). Features that don't need a client use `useTableConfigSafe()` internally, so a provider is only required when you use dynamic selects.

---

## Quick Start

```tsx
import { NoobTanstackTable } from "trio-tanstack-table";
import type { ColumnDef } from "@tanstack/react-table";

interface Txn { id: string; amount: number; status: string }

const columns: ColumnDef<Txn>[] = [
  { accessorKey: "id", header: "Transaction ID" },
  { accessorKey: "amount", header: "Amount", meta: { valueType: "number", decimalPlaces: 2 } },
  { accessorKey: "status", header: "Status", meta: { groupable: true } },
];

function MyTable() {
  return (
    <NoobTanstackTable
      columns={columns}
      manualFiltering
      request={async (params) => {
        const res = await fetch(`/api/transactions?page=${params.page}`);
        const result = await res.json();
        return { data: result.data, total: result.total, success: true };
      }}
      paginationType="pagination"
      bordered
    />
  );
}
```

---

## Toolbar actions (Export / Import / Print / …)

Actions are **config-driven**: you declare menu items; the package renders a button (1 item) or dropdown (multiple), manages loading, and hands your `onClick` the runtime context. You decide what happens.

```tsx
<NoobTanstackTable
  options={{
    reload: true,
    search: true,
    export: {
      items: [
        { key: "csv",  label: "Export CSV",
          onClick: async (ctx) => {
            const res = await ctx.apiClient!.post("/txns/export", ctx.getPayload(),
              { responseType: "blob" });
            downloadBlob(res.data, "transactions.csv");
          } },
        { key: "selected", label: "Export selected",
          disabled: (ctx) => ctx.selectedRows.length === 0,
          onClick: (ctx) => exportRows(ctx.selectedRows) },
      ],
    },
    actions: [
      { key: "import", items: [{ key: "imp", label: "Import", onClick: (ctx) => openImport(ctx.table) }] },
    ],
  }}
/>
```

**Action context** passed to every `onClick(ctx)` / `onAction(item, ctx)`:

| Field | Description |
|---|---|
| `table` | Full TanStack `Table` instance (state, row models, columns, selection). |
| `selectedRows` / `selectedKeys` | Current row selection. |
| `getPayload()` | Convenience: `{ columns, filters, search, sort }` from current table state. |
| `apiClient` | Your Axios instance (from `TableConfigProvider`), if present. |

Item options: `key`, `label`, `icon`, `hidden` (permission gate), `disabled` (`boolean | (ctx) => boolean`), `danger`, `onClick`. If an `onClick` returns a Promise, the trigger shows a spinner automatically.

> `serverExport` is **deprecated** — use `options.export`.

---

## Saved Views

A saved view is a named snapshot of filters, sort, grouping, column visibility/order/sizing/pinning, and search.

**Built-in (localStorage, no backend):**
```tsx
<NoobTanstackTable manualFiltering savedViews={{ listKey: "transactions" }} />
```
Users can save/apply/delete views and **pin one as the default** ("Apply automatically when I open this page"). The default auto-applies on page open — unless the URL already carries filter state, which takes precedence.

**Bring your own (backend-backed):**
```tsx
<NoobTanstackTable
  savedViews={{ listKey: "transactions", render: (api) => <MySavedViews {...api} /> }}
/>
```
Your control receives `{ listKey, getViewState, applyViewState, resetViewState, hasInitialUrlState }`. Store the opaque `getViewState()` blob on your backend; call `applyViewState(state)` to restore (it handles the refetch + URL sync). Your backend only needs to persist the blob plus an `isDefault` flag (one default per user + `listKey`) — it never interprets the state.

---

## Styling & theming

The table is theme-able through three independent levers.

**1. Ant Design tokens (global).** Colors, borders, group-row tints, and accents derive from your `ConfigProvider` theme:
```tsx
<ConfigProvider theme={{ token: { colorPrimary: "#0ea5e9", borderRadius: 8 } }}>
  <NoobTanstackTable ... />
</ConfigProvider>
```

**2. Per-slot `style` and `classNames`.** Inline styles and class names for each structural slot (overrides are merged *after* the defaults, so they win):
```tsx
<NoobTanstackTable
  style={{
    header: {}, headerCell: {}, tableBody: {}, rows: {},
    bodyCell: {}, footer: {}, groupRow: {},
  }}
  classNames={{
    header: "my-thead", headerCell: "my-th", rows: "my-row", bodyCell: "my-td",
  }}
/>
```
> To restyle the header's *appearance*, use `headerCell` — the `<thead>` (`header` slot) sits behind the cells.

**3. CSS variables** (defaults preserved; set to retheme resizer / hover / cards, e.g. for dark mode):
```css
:root {
  --trio-resizer-color: #d9d9d9;  --trio-resizer-hover: #8c8c8c;  --trio-resizer-active: #595959;
  --trio-row-hover: #f5f5f5;      --trio-card-border: #e5e7eb;    --trio-card-bg: #fff;
  --trio-label-color: #6b7280;
}
```

Structural surfaces (pinned cells, footer, expansion rows) now use theme tokens, so they follow light/dark themes automatically.

---

## Other props

| Prop | Description |
|---|---|
| `groupHeaderRender(ctx)` | Custom group-header content. Omit it and the group cell **reuses the grouping column's own `cell` renderer** (so a grouped date shows formatted, not raw ISO). |
| `emptyState` | Override the empty state: a `ReactNode`, or `{ text?, render? }`. |
| `rowHeight` | Fixed data-row height (px). |
| `density` | `"small" \| "middle" \| "large"`. |
| `bordered` | Table borders. |

> `style` / `classNames` / `rowHeight` are applied at mount (rows are memoized on layout version); they're intended for static styling, not per-render dynamic changes.

---

## Raising Issues

Open an issue at the [Issues page](https://github.com/trieon-technosolutions/trio-tanstack-table/issues) — check for duplicates first, then include a clear description, repro steps, and logs/screenshots.

---

## Contributing

This project uses **pnpm**.

1. **Fork** and **clone** your fork.
2. Create a feature branch: `git checkout -b feature/my-feature`.
3. `pnpm install`
4. Verify: `pnpm typecheck && pnpm build`
5. Commit with clear messages, push, and open a PR against `main`.
