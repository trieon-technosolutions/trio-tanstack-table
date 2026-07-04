# URL State Synchronization Guide

The `trio-tanstack-table` package supports synchronizing its active state (sorting, filtering, pagination, grouping, and search params) directly with the browser's URL query parameters. This allows users to share links that preserve the exact view of the table they are looking at.

---

## How It Works

When `syncWithUrl` is set to `true`, the `NoobTanstackTable` automatically updates the URL query string whenever:
1. A column header is clicked to **Sort**.
2. A **Filter** is applied or cleared.
3. The **Pagination** page index or page size changes.
4. Rows are **Grouped** by a column.
5. A toolbar **Global Search** is executed.

Upon initial mount, the table reads the query parameters from the URL and applies them as the initial state of the table.

---

## Configuration

To enable URL synchronization, simply pass the `syncWithUrl` prop:

```tsx
import { NoobTanstackTable } from "trio-tanstack-table";

function MyPage() {
  return (
    <NoobTanstackTable
      syncWithUrl={true}
      request={async (params) => {
        // params will automatically contain url-parsed states:
        // page, limit, sorting, filtering, etc.
        return fetchMyData(params);
      }}
      // ... columns definition
    />
  );
}
```

---

## Query Parameter Mappings

The table synchronizes state using the following query parameters:

| Table State | URL Query Parameter | Example Value |
| :--- | :--- | :--- |
| **Page Index** | `page` | `page=2` |
| **Page Size** | `limit` | `limit=20` |
| **Sorting State** | `sort` | `sort=[{"id":"name","desc":true}]` |
| **Column Filters** | `columnFilters` | `columnFilters=[{"id":"status","value":["active"]}]` |
| **Grouping State** | `grouping` | `grouping=["category"]` |
| **Global Search** | `global_search_text` | `global_search_text=john` |

---

## Benefits of URL Sync

1. **Shareable Views**: Users can copy-paste the URL from their browser and send it to coworkers. When opened, the table will display identical pages, filters, and sorts.
2. **Persistent Reloads**: If a user refreshes the page, their position, sort order, and active filters are not lost.
3. **Browser History Integration**: Users can use the browser's Back and Forward buttons to navigate through table states.
