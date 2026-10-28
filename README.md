# trio-tanstack-table

A high-performance, feature-rich React data table built on **@tanstack/react-table** (v8) and styled with **Ant Design** theme tokens.

It ships virtualization, live URL sync, inline editing, grouping with server summaries, config-driven toolbar actions (export/import/print/…), saved views, and a fully theme-able, slot-based styling API.

---

## Contents

- [Installation](#installation) and [provider setup](#setup-tableconfigprovider)
- [Server-data example](#quick-start-server-data)
- [Local repository setup](#set-up-this-repository-locally)
- [Use the package locally](#use-your-local-package-in-another-app)
- [Request contract](#request-contract-and-behavior-to-know)
- [Update and publish](#update-the-package)
- [Troubleshooting](#troubleshooting-and-current-limitations)

## Features

* ⚡ **Virtualized rendering** — tens of thousands of rows via `@tanstack/react-virtual`.
* 🔗 **Live URL state sync** — filters and global search (opt-in). [URL Sync Guide](docs/url_sync.md).
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
pnpm add react@^18.2.0 react-dom@^18.2.0 antd@^5 react-router-dom@^6 @tanstack/react-query@^5
# Direct imports used by the examples:
pnpm add axios @tanstack/react-table@^8.20.5
```

Import the CSS once in your entry file:

```ts
import "trio-tanstack-table/dist/index.css";
```

---

## Setup: `TableConfigProvider`

You provide a configured Axios client. The provider supplies a React Query provider and a default singleton query client; pass your own to share the application cache.

**Every table requires a React Router ancestor**, even with URL sync disabled: the URL hook calls `useSearchParams()` unconditionally. Reuse your existing router; for a standalone app, wrap the following provider in `<BrowserRouter>` imported from `react-router-dom`.

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
| `apiClient` | **Required.** Your Axios instance. Powers `ProSelect` dynamic dropdowns and is passed into every action handler. Configure authentication and base URL in your app; your backend must still permit cross-origin requests when applicable. |
| `queryClient` | Optional React Query client. A `QueryClientProvider` is built in; pass your own only to share your app's cache. |
| `selectParams` | Maps the package's pagination concepts to your API's query-param names: `pageKey` (`"page"`), `pageSizeKey` (`"pageSize"`), `searchKey` (`"search"`), `filtersKey` (`"filters"`). |

> `useTableConfig()` throws if a provider is missing (so misconfig fails loudly). Features that don't need a client use `useTableConfigSafe()` internally, so a provider is only required when you use dynamic selects.

---

## Quick Start: server data

Render this inside the router described above. The endpoint and response shape below are an example: implement them in your application.

```tsx
import { NoobTanstackTable } from "trio-tanstack-table";
import type { ColumnDef } from "@tanstack/react-table";

interface Txn { id: string; amount: number; status: string }

const columns: ColumnDef<Txn>[] = [
  { accessorKey: "id", header: "Transaction ID" },
  { accessorKey: "amount", header: "Amount", meta: { valueType: "number" } },
  { accessorKey: "status", header: "Status", meta: { groupable: true } },
];

function MyTable() {
  return (
    <NoobTanstackTable
      columns={columns}
      manualFiltering
      manualPagination
      manualSorting
      tableProps={{ getRowId: (row) => row.id }}
      request={async (params) => {
        const res = await fetch("/api/transactions/search", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(params),
        });
        if (!res.ok) throw new Error(`Request failed: ${res.status}`);
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
The control requires `manualFiltering`. Built-in storage is scoped to the browser origin and `listKey`, not automatically to an authenticated user; include a user ID in the key when needed. Users can save/apply/delete views and **pin one as the default** ("Apply automatically when I open this page"). The default auto-applies on page open — unless the URL already carries filter state, which takes precedence.

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

## Project structure and public API

This repository is a React component **library**, not a standalone application. There is no app server, demo runner, test runner, lint script, or automated release script configured in `package.json`. `src/Tanstack/test.tsx` contains sample data, not an automated test suite.

| Location | Purpose |
|---|---|
| `src/index.ts` | Public package exports; add new public APIs through the appropriate barrel. |
| `src/Tanstack/TanstackTable.tsx` | Main `NoobTanstackTable` component, fetching, state, pagination, persistence. |
| `src/Tanstack/InternalTable.tsx` | Rendering and virtualization. |
| `src/Tanstack/table.types.tsx` | Props, request/response types, actions, column metadata. |
| `src/Tanstack/table.css`, `style.tsx` | Table styles. |
| `src/Tanstack/useTableUrlSync.ts` | Filter/search URL synchronization. |
| `src/ProComponents/` | Exported buttons, icons, tabs, selects, and field wrappers. |
| `src/lib/TableConfigProvider.tsx` | Application-owned HTTP client and React Query configuration. |
| `src/SavedViewsMock.tsx` | Compatibility shim for legacy host integrations. |
| `docs/` | Editing, grouping, and URL examples. |
| `tsup.config.ts` | Build configuration (ESM, CommonJS, declarations, CSS, source maps). |
| `dist/` | Generated package output; never edit directly. |

Import public components and types from `trio-tanstack-table`, not `src/` paths. Useful exports include `NoobTanstackTable`, `TableConfigProvider`, `TableRef`, `TanstackTableProps`, `RequestResponse`, `TableAction`, and `LocalSavedViews`. TanStack's `ColumnDef` comes from `@tanstack/react-table`; declare that as a direct dependency in apps that import it.

## Set up this repository locally

Install Node.js and pnpm first. The repository does not pin either version (`engines` and `packageManager` are absent); the installed tsup tool requires Node 18 or newer, and the lockfile uses format 9.0. Use a team-agreed, supported Node release and pnpm version that reads that lockfile.

```bash
git clone https://github.com/trieon-technosolutions/trio-tanstack-table.git
cd trio-tanstack-table
pnpm install --frozen-lockfile
pnpm typecheck
pnpm build
```

| Command | What it does |
|---|---|
| `pnpm install --frozen-lockfile` | Installs the committed dependency resolution without rewriting it. |
| `pnpm typecheck` | Runs TypeScript validation without emitting files. |
| `pnpm build` | Cleans and regenerates `dist/`, including type declarations and CSS. |
| `pnpm dev` | Watches library source and rebuilds output; does **not** serve a page. |

The build targets ES2022. Consumers need a bundler that handles CSS imports and the emitted JavaScript. The package points CommonJS to `dist/index.js`, ESM to `dist/index.mjs`, and types to `dist/index.d.ts`.

## Use your local package in another app

### Option 1: packed archive (recommended for release verification)

From the library directory:

```bash
pnpm typecheck
pnpm build
pnpm pack --pack-destination /tmp
```

Install the exact archive path printed by `pnpm pack` from your React application's directory. For the current repository version:

```bash
pnpm add /tmp/trio-tanstack-table-2.8.0.tgz
```

The archive filename changes with `package.json`'s version. A previously generated `.tgz` does not include later source edits: build and pack again. Restart your application's dev server after reinstalling. This verifies the files a registry consumer will receive.

### Option 2: link for iterative development

From the library directory, build once and start the watcher:

```bash
pnpm build
pnpm dev
```

In another terminal, from the consuming app:

```bash
pnpm link /absolute/path/to/trio-tanstack-table
```

Replace that path with your clone's directory. Start the consuming app using its own development command. The package entry points resolve to `dist/`, so source changes appear only after the watcher rebuilds. Some app bundlers require a restart or cache refresh for linked dependencies.

Install the peer dependencies in the app as described above. Linking can cause duplicate React installations and invalid-hook-call errors; use the app bundler's deduplication settings for `react` and `react-dom`, or switch to the packed archive workflow.

To return to the registry package, remove the link and explicitly reinstall the intended published version:

```bash
pnpm unlink trio-tanstack-table
pnpm add trio-tanstack-table@<published-version>
```

Replace `<published-version>` before running. Check the app's manifest and lockfile to ensure no temporary local path remains.

### Minimal local-data example

This complete component needs no backend or `TableConfigProvider`. If your app already has a router, remove the `BrowserRouter` wrapper below.

```tsx
import { BrowserRouter } from "react-router-dom";
import type { ColumnDef } from "@tanstack/react-table";
import { NoobTanstackTable } from "trio-tanstack-table";
import "trio-tanstack-table/dist/index.css";

type Person = { id: string; name: string };
const columns: ColumnDef<Person>[] = [
  { accessorKey: "name", header: "Name" },
];
const people: Person[] = [
  { id: "1", name: "Alice" },
  { id: "2", name: "Bob" },
];

export default function App() {
  return (
    <BrowserRouter>
      <NoobTanstackTable
        columns={columns}
        dataSource={people}
        tableProps={{ getRowId: (row) => row.id }}
        pagination={{ pageIndex: 0, pageSize: 10 }}
        columnsState={{ persistenceKey: "people" }}
      />
    </BrowserRouter>
  );
}
```

Keep columns stable (module-level or memoized). Supply stable row IDs for selection and editing; otherwise TanStack uses index-based IDs. Use distinct persistence keys for unrelated tables. Avoid supplying both `dataSource` and `request`: the standard request success handler prefers `dataSource`.

## Request contract and behavior to know

The app owns the table endpoint, authentication, request serialization, response mapping, and error UI. `TableConfigProvider.apiClient` does not automatically fetch table rows; your `request` callback does that. Throw on failed requests: `success: false` alone does not stop the standard handler from reading `response.data`.

| Request field | Meaning |
|---|---|
| `page` | One-based server page; the UI's `pagination.pageIndex` is zero-based. |
| `limit` | Page size, not `pageSize`. |
| `cursor` | Cursor mode: initially `null`, then the previous response's `nextCursor`. |
| `sort` | TanStack sorting array when supplied. |
| `global_search_text` | Global search text. |
| `visible_columns` | Column visibility state when supplied. |
| `grouping` | Grouping column IDs on applicable requests. |
| Filter fields | Current filters are spread into the request object; do not assume a nested `filters` field. Inspect your filter UI's payload when adapting the API. |

The initial standard request sends `page: 1` and `limit`, plus initial URL filters/search when enabled. Not every field is present on every request. The callback accepts `Record<string, unknown>`; inspect implementation when extending the protocol rather than relying only on the exported `TanstackTableParams` interface.

| Pagination mode | Backend expectations |
|---|---|
| `"pagination"` (default) | For server paging, enable `manualPagination` and return the full filtered `total`. |
| `"virtual"` | With `request`, fetches successive numbered pages while scrolling; return `data` and preferably `total`. |
| `"cursor"` | With `request`, fetches using backend cursors; return `nextCursor` and `hasNextPage`, with `hasNextPage: false` at the end. |

All responses require `data` and `success`. Optional `summary` holds backend totals for the whole filtered result, available as `table.options.meta.footerSummary`. Whole-result totals should not be calculated from only the rows loaded so far.

`manualPagination`, `manualSorting`, `manualFiltering`, and `syncWithUrl` default to false; `manualGrouping` defaults to true. Enable manual flags when the backend owns the relevant operations. URL synchronization requires both `manualFiltering` and `syncWithUrl`; the current hook synchronizes filters and global search, not paging or sorting.

Inline editing calls `editable.onDataSourceChange`; persistence to your backend remains your responsibility. See the [editing guide](docs/editable_cells.md). Export/import/print actions likewise require application handlers; the package does not implement those workflows for you. Helper names such as `downloadBlob` in examples represent functions you must supply.

## Update the package

### Change library code

1. Edit `src/`, not `dist/` or an existing archive.
2. Update public exports and types if the API changes.
3. Update this README and relevant guides for changed behavior.
4. Run `pnpm typecheck` and `pnpm build`.
5. Test the packed package in a consuming app: rendering, CSS, filtering, sorting, paging, selection, editing, and any changed feature.

### Update dependencies

Use pnpm consistently and commit both `package.json` and `pnpm-lock.yaml`:

```bash
pnpm outdated
# Example: update one dependency within the currently declared range.
pnpm update @tanstack/react-table
pnpm typecheck
pnpm build
```

For an intentional major upgrade, choose an explicit version after checking its migration requirements (`pnpm add <package>@<version>` or `pnpm add -D <package>@<version>` for build tools). Update peer ranges only after testing compatibility. React, React DOM, Ant Design, React Router, and React Query must be compatible with the host app; they are not private runtime copies to upgrade independently.

### Publish a new registry version

Publishing requires access to the `trio-tanstack-table` npm package. No `prepack`, `prepare`, or `prepublishOnly` hook builds automatically, so always build explicitly. These are maintainer instructions, not actions performed by reading this README.

1. Review the Git diff and finish the source changes you intend to ship.
2. Bump `package.json` using one of the commands below. Patch = compatible fix, minor = compatible feature, major = breaking API or compatibility change.

   ```bash
   npm version patch --no-git-tag-version
   # Alternatively: npm version minor --no-git-tag-version
   # Alternatively: npm version major --no-git-tag-version
   pnpm install --lockfile-only
   pnpm typecheck
   pnpm build
   npm pack --dry-run
   pnpm pack --pack-destination /tmp
   ```

3. Inspect the dry-run file list and test the resulting archive in a host app. Confirm it contains JavaScript, declarations, and `dist/index.css`. The `files` setting includes `dist`; npm also includes standard metadata such as `package.json` and README. The `docs/` guides are repository files, not part of the declared distribution.
4. Confirm the intended registry and account:

   ```bash
   npm config get registry
   npm whoami
   # If authentication is required:
   npm login
   ```

5. Commit the version, lockfile, source, and documentation changes. Publish only after validation:

   ```bash
   pnpm publish --access public
   ```

6. Tag the release using the actual version (`git tag vX.Y.Z`), then push the release commit and tag through your normal repository workflow. Verify the published version and install it in the consuming app.

A published version cannot be overwritten; a correction needs a new version. Do not publish stale `dist/` output. Source maps are shipped by the current build, so inspect their contents as part of the package review. The manifest currently has no `license` field or root license file; maintainers should establish the intended license before distributing to others.

### Upgrade an app to the new release

From the consuming app, select the intended published version:

```bash
pnpm add trio-tanstack-table@<published-version>
```

Review migration notes for breaking changes, check peer compatibility, run the app's checks, and commit its manifest and lockfile. If testing a local link/archive, replace that dependency with the registry version before shipping the app.

## Troubleshooting and current limitations

| Symptom | Check |
|---|---|
| `useSearchParams` router error | Wrap the table in the app's React Router, even when URL sync is off. |
| Missing table styles | Import `trio-tanstack-table/dist/index.css` once and confirm the build emitted it. |
| `useTableConfig` error / dynamic selects fail | Provide a configured Axios instance through `TableConfigProvider`. |
| Old code after an edit | Rebuild `dist/`; repack/reinstall archives; restart the consumer if its dependency cache is stale. |
| Invalid hook call with a local link | Check for multiple React copies; deduplicate or use an archive. |
| Server page controls do not fetch | Enable `manualPagination`; return `total`; map `page` and `limit` correctly. |
| Saved Views control is absent | Supply `savedViews` and enable `manualFiltering`. |
| Saved layout seems wrong | Check the table's persistence key and clear only that table's stored state, rather than all application storage. |
| URL does not update | Enable both `syncWithUrl` and `manualFiltering`; only filters/search are synchronized. |

The code uses browser APIs such as localStorage and document; server-side rendering is not verified. In SSR apps, render the table on the client. The legacy `serverExport` integration points to a compatibility shim; use `options.export` for real handlers. The exported file-preview helper assumes `/api/storage/presigned-url/download/:fileId` and uses `fetch` directly, so it requires that host endpoint and does not inherit your Axios interceptors.

Validation for this README update: `pnpm typecheck`, `pnpm build`, and a package-content dry run passed against the local working tree. No browser integration test or actual registry publication was performed. The repository has no automated test script; a successful build alone does not establish runtime behavior in every host app.
