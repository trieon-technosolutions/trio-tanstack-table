# Inline Editable Cells Guide

The `trio-tanstack-table` package supports full inline cell editing. You can customize which columns are editable, specify the input component type, and handle data updates on change.

---

## How It Works

1. Specify which rows are active for editing using the `editable.editedRowKey` property.
2. In your columns configuration, mark the columns you want to make editable with `meta.editable: true` and specify a `meta.valueType` (e.g., `"text"`, `"select"`, `"date"`, etc.).
3. Handle datasource updates using the `editable.onDataSourceChange` handler.

---

## Example Implementation

Here is a full code example demonstrating how to set up an editable table:

```tsx
import React, { useState } from "react";
import { NoobTanstackTable } from "trio-tanstack-table";
import { ColumnDef } from "@tanstack/react-table";

interface User {
  id: string;
  name: string;
  role: string;
  joinedDate: string;
}

function EditableTable() {
  const [dataSource, setDataSource] = useState<User[]>([
    { id: "1", name: "Alice", role: "admin", joinedDate: "2024-01-15" },
    { id: "2", name: "Bob", role: "user", joinedDate: "2024-03-22" },
  ]);

  // Track which rows are currently in "Edit Mode"
  const [editedRowKey, setEditedRowKey] = useState<React.Key[]>(["1", "2"]);

  const columns: ColumnDef<User>[] = [
    {
      accessorKey: "name",
      header: "Name",
      meta: {
        editable: true,         // Enables editing for this column
        valueType: "text",      // Renders a text input field
      },
    },
    {
      accessorKey: "role",
      header: "Role",
      meta: {
        editable: true,
        valueType: "select",    // Renders an AntD Select component
        valueEnum: {
          admin: { text: "Administrator" },
          user: { text: "Standard User" },
        },
      },
    },
    {
      accessorKey: "joinedDate",
      header: "Joined Date",
      meta: {
        editable: true,
        valueType: "date",      // Renders a date picker
      },
    },
  ];

  return (
    <NoobTanstackTable
      dataSource={dataSource}
      columns={columns}
      editable={{
        editedRowKey,
        setEditedRowKey,
        onDataSourceChange: ({ record, recordList }) => {
          // Triggered when a cell is edited and saved
          setDataSource(recordList);
        },
      }}
    />
  );
}
```

---

## Available `valueType` Inputs

The `meta.valueType` supports the following input components:

| `valueType` | Component Rendered | Ideal For |
| :--- | :--- | :--- |
| `"text"` | standard input field | Names, codes, descriptions |
| `"textarea"` | multi-line text area | Long notes, remarks |
| `"select"` | dropdown select menu | Roles, statuses, categories |
| `"date"` | date picker | Birthdays, dates |
| `"date-range"` | start/end date picker | Date ranges, durations |
| `"number"` | numeric input | Counts, indexes |
| `"password"` | hidden text field | Passwords, tokens |
| `"checkbox"`| checkbox selector | Toggles, boolean configurations |
| `"radio"` | radio list | Mutually exclusive options |
