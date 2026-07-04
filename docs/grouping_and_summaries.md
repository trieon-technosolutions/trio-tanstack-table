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

Users can click the grouping button in the toolbar to collapse and group rows by any groupable column.

---

## 2. Server-Side Group Summaries

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

## 3. Grand Totals (Sticky Footers)

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
