# Grouping and Summaries Guide

The `trio-tanstack-table` package features advanced row-grouping and backend-computed data summaries. This ensures financial totals and row counts stay correct without doing client-side calculations on incomplete datasets.

---

## 1. Row Grouping

You can allow users to group the table by specific columns by enabling `groupable` in the column metadata:

```tsx
const columns = [
  {
    accessorKey: "category",
    header: "Category",
    meta: {
      groupable: true, // Allows grouping by this column
    },
  },
];
```

Users can click the grouping button in the toolbar to collapse and group rows by any groupable column. The Group By dropdown scrolls when the column list is long.

---

## 2. Group Header Content

By default, the group-header row **reuses the grouping column's own `cell` renderer**, so a grouped value looks exactly like it does in normal rows. For example, a grouped date column shows the formatted `31 Jul, 2026` instead of a raw ISO string — no extra config needed, as long as the column has a `cell` (or a `meta.valueType`).

To take full control of the group header, pass `groupHeaderRender`:

```tsx
<NoobTanstackTable
  columns={columns}
  groupHeaderRender={({ groupValue, column, row, count, total }) => (
    <strong>
      {String(groupValue)} — {count} items
      {total ? ` · ₹${total}` : ""}
    </strong>
  )}
/>
```

| `ctx` field | Description |
| :--- | :--- |
| `groupValue` | The raw value the rows are grouped by. |
| `column` | The grouping column (if resolvable). |
| `row` | The TanStack group row. |
| `count` | Item count (server summary when available). |
| `total` | Optional financial total for the group. |

> If a column's `cell` reads `row.original` (which is `undefined` on a group row), use `groupHeaderRender` for that column to avoid errors.

### Styling the group row

The group-header row is theme-tinted (from your Ant Design `colorPrimary`) and can be overridden per-slot:

```tsx
<NoobTanstackTable
  style={{ groupRow: { backgroundColor: "#eef2ff" } }}
  classNames={{ groupRow: "my-group-header" }}
/>
```

---

## 3. Server-Side Group Summaries

When grouping is active, the table calls the `groupSummaryRequest` callback. This fetches accurate row counts and financial totals (e.g. sum of debits/credits) directly from the backend for the current grouped set.

### Usage:

```tsx
<NoobTanstackTable
  columns={columns}
  groupSummaryRequest={async (params) => {
    // params contains active filters, searches, and grouping
    const result = await fetchGroupSummary(params);
    return {
      data: [
        {
          key: ["Electronics"], // The grouping key path
          label: "Electronics",
          count: 52,
          total: "14500.50",
        },
      ],
      grandTotal: {
        count: 104,
        total: "29000.00",
      },
    };
  }}
/>
```

---

## 4. Grand Totals (Sticky Footers)

You can display backend-computed grand totals in a sticky table footer that remains visible at the bottom of the table.

To set this up, return a `summary` object from your standard `request` fetcher, and read it in your column footers:

```tsx
const columns = [
  {
    accessorKey: "debit",
    header: "Debit Amount",
    // Render the grand total in the footer
    footer: ({ table }) => {
      const summary = table.options.meta?.footerSummary;
      return `Total: ₹${summary?.totalDebit ?? "0.00"}`;
    },
  },
];

return (
  <NoobTanstackTable
    columns={columns}
    request={async (params) => {
      const res = await fetchMyTransactions(params);
      return {
        data: res.items,
        total: res.totalCount,
        success: true,
        summary: {
          totalDebit: res.totalDebitSum, // Passed to footerSummary
        },
      };
    }}
  />
);
```
