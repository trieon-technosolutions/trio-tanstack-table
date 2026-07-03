export function isGroupColumn(col: any): boolean {
  return col && !col.accessorKey && !col.id && Array.isArray(col.columns)
}

export function flattenToLeafColumns(columns: any[]): any[] {
  const leaves: any[] = []
  for (const col of columns) {
    if (isGroupColumn(col)) {
      leaves.push(...flattenToLeafColumns(col.columns))
    } else {
      leaves.push(col)
    }
  }
  return leaves
}
