# trio-tanstack-table

A high-performance, feature-rich React data table component built on top of **@tanstack/react-table** (v8) and styled with **Ant Design (AntD)** tokens.

It provides powerful features out-of-the-box like virtualization, live URL synchronization, inline cell editing, server-side group summaries, and customizable view settings.

---

## Features

* ⚡ **High Performance Virtualization**: Row virtualization via `@tanstack/react-virtual` lets you render tens of thousands of rows smoothly.
* 🔗 **Live URL State Sync**: Sync paging, sorting, filtering, and searches with the browser URL. [Read the URL Sync Guide](docs/url_sync.md).
* ✏️ **Inline Cell Editing**: Enable editing on any column with text fields, selectors, date pickers, and more. [Read the Editable Cells Guide](docs/editable_cells.md).
* 📊 **Grouping & Group Summaries**: Support collapsing group headers with accurate server-side sums. [Read the Grouping & Summaries Guide](docs/grouping_and_summaries.md).
* 🔄 **Flexible Pagination Modes**: Supports virtual scroll, cursor-based pagination, and traditional paging.
* 💾 **Saved Views**: Allow users to save their customized column orders, visibility settings, and filters.
* 📤 **Server-side Exports**: Built-in toolbar export button for generating CSV/Excel reports from the server.
* 📐 **Density Controls**: Toggles between Standard, Comfortable, and Compact layouts.

---

## Installation

Install the package and its peer dependencies in your project:

```bash
pnpm add trio-tanstack-table
# or
npm install trio-tanstack-table
```

Make sure you also have the following peer dependencies installed:

```bash
pnpm add react react-dom antd react-router-dom
```

---

## Quick Start

1. **Import the CSS styles** in your main entry file (e.g., `main.tsx` or `App.tsx`):

   ```typescript
   import "trio-tanstack-table/dist/index.css";
   ```

2. **Add the Component** to your page:

   ```tsx
   import React from "react";
   import { NoobTanstackTable } from "trio-tanstack-table";
   import { ColumnDef } from "@tanstack/react-table";

   interface Transaction {
     id: string;
     amount: number;
     status: string;
   }

   const columns: ColumnDef<Transaction>[] = [
     {
       accessorKey: "id",
       header: "Transaction ID",
     },
     {
       accessorKey: "amount",
       header: "Amount ($)",
     },
     {
       accessorKey: "status",
       header: "Status",
     },
   ];

   function MyTable() {
     return (
       <NoobTanstackTable
         columns={columns}
         request={async (params) => {
           // Fetch data from your backend API
           const response = await fetch(`/api/transactions?page=${params.page}`);
           const result = await response.json();
           return {
             data: result.data,
             total: result.total,
             success: true,
           };
         }}
         paginationType="pagination"
         bordered
       />
     );
   }

   export default MyTable;
   ```

---

## Raising Issues

If you find a bug or have a feature request, please open an issue on our GitHub repository:

1. Go to the [Issues page](https://github.com/trieon-technosolutions/trio-tanstack-table/issues).
2. Check if a similar issue already exists.
3. If not, click **New Issue**.
4. Provide a clear description, steps to reproduce, and any error logs or screenshots.

---

## Contributing

We welcome contributions from the community! To contribute:

1. **Fork** the repository on GitHub.
2. **Clone** your fork locally:
   ```bash
   git clone https://github.com/your-username/trio-tanstack-table.git
   ```
3. Create a **feature branch**:
   ```bash
   git checkout -b feature/my-new-feature
   ```
4. Install dependencies:
   ```bash
   pnpm install
   ```
5. Run the **typecheck** and **build** locally to verify your setup:
   ```bash
   pnpm typecheck
   pnpm build
   ```
6. Make your changes and commit them with descriptive commit messages.
7. Push your branch and open a **Pull Request** against the `main` branch.
