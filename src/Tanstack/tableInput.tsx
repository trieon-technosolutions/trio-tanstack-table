import {
  ProFormDigit,
  ProFormDigitProps,
  ProFormItemProps,
  ProFormRadio,
  ProFormRadioGroupProps,
  ProFormText,
} from "@ant-design/pro-components"
import { InputProps } from "antd"
import React from "react"
import {
  PreInputFormField,
  ProAmount,
  ProDatePicker,
  ProDateRangePicker,
  ProSelect,
  ProSelectProps,
} from "../ProComponents"

import { DatePickerProps } from "antd/lib"
import { RangePickerProps } from "antd/lib/date-picker"
import { WEIGHT_INPUT_PRECISION } from "~/form-constants"
import { OPTIONS_FOR_NUMERIC_QUANTITY } from "./tableConstant"

// NOTE: Defining the combined props type for the custom input component
export type BaseInputProps = InputProps & ProFormDigitProps & ProSelectProps

export type TableInputFieldTypes =
  | "select"
  | "digit"
  | "text"
  | "amount"
  | "quantity"
  | "date"
  | "radio"
  | "date-range"
  | "multi-select"
  | "mobile"
  | "attachment"
  | "dynamic-select"
  | "code"
  | "textarea"
  | "email"
  | "password"
  | "url"
  | "number"
  | "percentage"
  | "weight"
  | "km"
  | "pincode"
  | "datetime"
  | "time"
  | "google-location"
  | "pan"
  | "gst"
  | "latitude"
  | "longitude"
  | "presigned-upload"
  | "checkbox"
  | "modal-table-select"
  | "nestedEditableTable"
  | "serial-number-select"

export interface TableInputProps extends BaseInputProps {
  type?: TableInputFieldTypes | string
}

// NOTE: Functional component for the custom input element
export const TableInput: React.FC<TableInputProps> = ({
  type = "text",
  ...rest
}) => {
  // NOTE: Rendering different input components based on the specified type
  switch (type) {
    case "digit":
      return (
        <PreInputFormField
          {...(rest as ProFormDigitProps)}
          inputType="number"
          selectProps={{
            options: OPTIONS_FOR_NUMERIC_QUANTITY,
          }}
          style={{ width: "100%", ...rest?.style }}
        />
      )
    case "select":
      return (
        <ProSelect
          fieldProps={{
            labelInValue: true,
            dropdownStyle: {
              zIndex: 9999,
            },
          }}
          isFullWidth
          {...(rest as ProSelectProps)}
        />
      )
    case "multi-select":
      return (
        <ProSelect
          mode="multiple"
          fieldProps={{
            labelInValue: true,
            dropdownStyle: {
              zIndex: 9999,
            },
          }}
          isFullWidth
          {...(rest as ProSelectProps)}
        />
      )
    case "amount":
      return <ProAmount {...(rest as ProFormDigitProps)} noStyle={false} />
    case "quantity":
      return (
        <ProFormDigit
          {...(rest as ProFormDigitProps)}
          fieldProps={{
            ...rest.fieldProps,
            precision: WEIGHT_INPUT_PRECISION,
          }}
          style={{ width: "100%", ...rest?.style }}
        />
      )
    case "date":
      return (
        <ProDatePicker
          {...(rest as ProFormItemProps)}
          fieldProps={{
            format: "DD-MMM-YYYY",
            style: { width: "100%" },
            ...(rest.fieldProps as ProFormItemProps<DatePickerProps>["fieldProps"]),
          }}
        />
      )

    case "date-range":
      return (
        <ProDateRangePicker
          {...(rest as ProFormItemProps)}
          fieldProps={{
            style: { width: "100%" },
            ...(rest.fieldProps as ProFormItemProps<RangePickerProps>["fieldProps"]),
          }}
        />
      )
    case "radio":
      return (
        <ProFormRadio.Group
          {...(rest as ProFormRadioGroupProps)}
          fieldProps={{
            ...(rest.fieldProps as ProFormRadioGroupProps["fieldProps"]),
            style: { width: "100%" },
          }}
        />
      )

    default:
      return (
        // NOTE: Default Input component with themed styles
        <ProFormText {...(rest as ProFormItemProps)} />
      )
  }
}
