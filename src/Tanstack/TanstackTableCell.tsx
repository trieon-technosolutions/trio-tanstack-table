import { ProField } from "@ant-design/pro-components"
import { Column } from "@tanstack/react-table"
import { ProDateField } from "../ProComponents"
import { FilePreviewCell } from "./tableComponents"

export const TanstackTableCell = ({
  value,
  valueType,
  column,
}: {
  value: string | number | boolean | null | undefined
  valueType: string
  column: Column<unknown, unknown>
}) => {
  const getComponent = () => {
    switch (valueType) {
      case "date":
        return <ProDateField date={value as any} format="DD MMM, YYYY" />
      case "dateTime":
        return <ProDateField date={value as any} format="DD MMM, YYYY h:mm A" />
      case "enum":
        return (
          <ProField
            value={value}
            mode="read"
            valueEnum={(column as any)?.meta?.inputItemProps()?.valueEnum}
          />
        )
      case "boolean":
        return <div>{value === true || value === "true" ? "Yes" : "No"}</div>
      case "number": {
        const decimalPlaces = (column?.columnDef?.meta as any)?.decimalPlaces
        const numberValue = Number(value)

        if (
          typeof decimalPlaces === "number" &&
          value !== null &&
          value !== undefined &&
          value !== "" &&
          Number.isFinite(numberValue)
        ) {
          return <div>{numberValue.toFixed(decimalPlaces)}</div>
        }

        return <div>{value}</div>
      }
      case "file": {
        if (!value || typeof value !== "string") return <div>-</div>
        return <FilePreviewCell fileId={value} filename="View" />
      }
      default:
        return <div>{value}</div>
    }
  }
  return getComponent()
}
