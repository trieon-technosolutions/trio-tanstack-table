import React, { useCallback, useEffect } from "react"
import {
  ProForm,
  ProFormDatePicker,
  ProFormDateRangePicker,
  ProFormDigit,
  ProFormDigitProps,
  ProFormFieldProps,
} from "@ant-design/pro-components"
import { IconCurrencyRupee } from "@tabler/icons-react"
import {
  DatePickerProps,
  Flex,
  FormInstance,
  Input,
  InputNumber,
  InputNumberProps,
  Popover,
  PopoverProps,
  Select,
  SelectProps,
} from "antd"
import { InputProps } from "antd/lib"
import { CalendarTwoTone, InfoCircleOutlined } from "@ant-design/icons"
import { useWatch } from "antd/es/form/Form"
import useFormInstance from "antd/es/form/hooks/useFormInstance"
import dayjs from "dayjs"

import { useAppTheme } from "../theme"
import { EText, TextTypographyProps } from "../Typography"

// Constants
export const DEFAULT_DATE_FORMAT = "DD-MM-YYYY"
export const DEFAULT_BACKEND_DATE_FORMAT = "YYYY-MM-DD"
export const DEFAULT_DATE_MONTH_FORMAT = "DD MMM, YYYY"
export const DEFAULT_DATE_TIME_FORMAT = "DD-MM-YYYY h:mm A"
export const VIEW_DATE_TIME_FORMAT = "DD MMM, YYYY h:mm A"
export const FullColumnWIdth = "100%" as "xl"

// parseDateTime local helper using dayjs
export const parseDateTime = (str: Date | string) => {
  if (str instanceof Date) return str
  const parsed = dayjs(str)
  return parsed.isValid() ? parsed.toDate() : null
}

// 1. ProAmount Component
export const ProAmount: React.FC<ProFormDigitProps> = ({
  fieldProps,
  ...rest
}) => {
  const token = useAppTheme()

  const amountFormatter = (value: string | number | undefined) => {
    if (value) {
      const numValue =
        typeof value === "string"
          ? parseFloat(value.replace(/[^0-9.-]+/g, ""))
          : value
      return Number(numValue).toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })
    }
    return ""
  }

  return (
    <ProFormDigit
      {...rest}
      fieldProps={{
        precision: 2,
        prefix: <IconCurrencyRupee color={token.neutral6 || "#bfbfbf"} size={18} />,
        controls: false,
        formatter: amountFormatter,
        ...fieldProps,
      }}
      style={{ width: "100%", ...rest?.style }}
    />
  )
}

// 2. ProDatePicker Component
interface ProDatePickerProps extends ProFormFieldProps<any, DatePickerProps> {
  name?: string | number
}

export const ProDatePicker: React.FC<ProDatePickerProps> = ({
  name,
  width = FullColumnWIdth,
  fieldProps,
  ...rest
}) => {
  const isControlled = fieldProps?.value !== undefined
  const form = useFormInstance()
  const antdFieldValue = useWatch(name as string, form)

  const displayDate = isControlled
    ? fieldProps?.value
      ? dayjs(fieldProps.value)
      : undefined
    : antdFieldValue
    ? dayjs(antdFieldValue)
    : undefined

  const handleChange = useCallback(
    (date: dayjs.Dayjs | null) => {
      if (isControlled) {
        fieldProps?.onChange?.(date as any)
      } else {
        const backendValue = date
          ? date.format(DEFAULT_BACKEND_DATE_FORMAT)
          : undefined
        form.setFieldValue(name as string, backendValue)
        fieldProps?.onChange?.(date as any)
      }
    },
    [isControlled, form, name, fieldProps?.onChange],
  )

  const handleBlur = useCallback(
    (e: React.FocusEvent<HTMLInputElement>) => {
      const inputValue = e?.target?.value
      if (inputValue?.length > 0) {
        const parts = inputValue.split("-")
        const parsedDateTime = parseDateTime(
          parts.length === 3
            ? `${parseInt(parts[2], 10)}-${parseInt(parts[1], 10)}-${parseInt(
                parts[0],
                10,
              )}`
            : inputValue,
        )
        if (parsedDateTime) {
          const parsedDayjs = dayjs(parsedDateTime)
          const isDisabled = fieldProps?.disabledDate?.(parsedDayjs)
          if (!isDisabled) {
            if (isControlled) {
              fieldProps?.onChange?.(parsedDayjs as any)
            } else {
              const backendValue = parsedDayjs.format(
                DEFAULT_BACKEND_DATE_FORMAT,
              )
              form.setFieldValue(name as string, backendValue)
              fieldProps?.onChange?.(parsedDayjs as any)
            }
          }
        }
      }
      fieldProps?.onBlur?.(e as any)
    },
    [
      isControlled,
      form,
      name,
      fieldProps?.onChange,
      fieldProps?.onBlur,
      fieldProps?.disabledDate,
    ],
  )

  const handleFocus = useCallback(
    (e: React.FocusEvent<HTMLInputElement>) => {
      setTimeout(() => e?.target?.select(), 0)
      fieldProps?.onFocus?.(e as any)
    },
    [fieldProps?.onFocus],
  )

  return (
    <ProFormDatePicker
      name={name}
      width={width}
      {...rest}
      fieldProps={{
        ...fieldProps,
        format: DEFAULT_DATE_FORMAT,
        picker: "date",
        value: displayDate,
        onChange: handleChange,
        onBlur: handleBlur,
        onFocus: handleFocus,
        size: "md" as any,
      }}
      transform={(value: any) => {
        const dateValue = value || antdFieldValue
        if (dateValue) {
          const dayjsDate = dayjs.isDayjs(dateValue)
            ? dateValue
            : dayjs(dateValue, DEFAULT_DATE_FORMAT, true).isValid()
            ? dayjs(dateValue, DEFAULT_DATE_FORMAT)
            : dayjs(dateValue)
          return {
            [name as string]: dayjsDate.format(DEFAULT_BACKEND_DATE_FORMAT),
          }
        }
        return ""
      }}
    />
  )
}

// 3. ProDateRangePicker Component
export const ProDateRangePicker: React.FC<ProDatePickerProps> = ({
  name,
  fieldProps,
  ...rest
}) => {
  return (
    <ProFormDateRangePicker
      name={name}
      width={FullColumnWIdth}
      {...rest}
      fieldProps={{
        format: DEFAULT_DATE_FORMAT,
        ...fieldProps,
      }}
      transform={(value: any) => {
        if (value && Array.isArray(value) && value.length === 2) {
          const [start, end] = value
          const formatDate = (v: string) => {
            const isValid = dayjs(v, DEFAULT_DATE_FORMAT, true).isValid()
            const formatted = isValid ? v : dayjs(v).format(DEFAULT_DATE_FORMAT)
            return dayjs(formatted, DEFAULT_DATE_FORMAT).format(
              DEFAULT_BACKEND_DATE_FORMAT,
            )
          }
          return {
            [name as string]: [formatDate(start), formatDate(end)],
          }
        }
        return { [name as string]: value }
      }}
    />
  )
}

// 4. ProDateField Component
export type dateFormat =
  | "default"
  | "DD-MMM-YYYY  h:mm A"
  | "DD MMM, YYYY"
  | "DD MMM, YYYY h:mm A"
  | "no_of_hours"

interface ProDateFieldProps {
  date?: number | string
  format?: dateFormat
  iconColor?: string
  textProps?: TextTypographyProps
  popoverProps?: PopoverProps
  info?: React.ReactNode
  infoTitle?: string
  suffix?: React.ReactNode | string
}

export const ProDateField: React.FC<ProDateFieldProps> = ({
  date,
  format = DEFAULT_DATE_FORMAT,
  iconColor,
  textProps,
  info,
  suffix,
  infoTitle,
  popoverProps,
}) => {
  const token = useAppTheme()
  iconColor = iconColor || token.neutral7

  const getDateFormat = (format: dateFormat) => {
    switch (format) {
      case "default":
        return DEFAULT_DATE_FORMAT
      case "DD MMM, YYYY h:mm A":
        return VIEW_DATE_TIME_FORMAT
      case "DD MMM, YYYY":
        return DEFAULT_DATE_MONTH_FORMAT
      case "DD-MMM-YYYY  h:mm A":
        return DEFAULT_DATE_TIME_FORMAT
      case "no_of_hours":
        return "HH:mm:ss"
      default:
        return DEFAULT_DATE_FORMAT
    }
  }

  const isDateValid = dayjs(
    date,
    getDateFormat(format as dateFormat),
    true,
  ).isValid()

  const formatValue = isDateValid
    ? dayjs(date).format(
        format === "no_of_hours"
          ? "HH:mm:ss"
          : getDateFormat(format as dateFormat),
      )
    : date
    ? dayjs(date).format(
        format === "no_of_hours"
          ? "HH:mm:ss"
          : getDateFormat(format as dateFormat),
      )
    : undefined

  return formatValue ? (
    <Flex align="center" gap={4}>
      <CalendarTwoTone twoToneColor={iconColor} />
      <Flex flex={1} align="center">
        <EText {...textProps}>{formatValue}</EText>
        {typeof suffix === "string" ? (
          <EText {...textProps} color={token.neutral7}>
            &nbsp;
            {suffix}
          </EText>
        ) : (
          suffix
        )}
      </Flex>
      {info && (
        <Popover
          title={infoTitle}
          showArrow
          content={info}
          trigger={["hover"]}
          {...popoverProps}
        >
          <InfoCircleOutlined style={{ color: token.neutral8 }} />
        </Popover>
      )}
    </Flex>
  ) : (
    "-"
  )
}

// 5. PreInputFormField Component
interface BasePreInputFormFieldProps
  extends Omit<ProFormFieldProps<any, InputProps>, "addonBefore"> {
  selectProps?: SelectProps
  form?: FormInstance<any>
}

interface TextPreInputFormFieldProps extends BasePreInputFormFieldProps {
  inputType?: "text"
  inputProps?: InputProps
  inputNumberProps?: never
}

interface NumberPreInputFormFieldProps extends BasePreInputFormFieldProps {
  inputType: "number"
  inputNumberProps?: InputNumberProps
  inputProps?: never
}

export type PreInputFormFieldProps =
  | TextPreInputFormFieldProps
  | NumberPreInputFormFieldProps

export const PreInputFormField: React.FC<PreInputFormFieldProps> = ({
  label,
  name,
  fieldProps,
  required = true,
  selectProps,
  inputNumberProps,
  inputProps,
  inputType = "text",
  width = "100%",
  form,
  ...rest
}) => {
  const defaultSelectedValue = selectProps?.options?.find(
    (item) => item.label === selectProps?.defaultValue,
  )

  const selectBefore = (
    <ProForm.Item
      noStyle
      name={`${name}-selected-option`}
      transform={(value: any) => {
        return {
          [name as string]: {
            selectedOption: value,
            value: form?.getFieldValue(name)?.value ?? 0,
          },
          [`${name}-selected-option`]: undefined,
        }
      }}
    >
      <Select
        styles={{
          root: {
            minWidth: 60,
            fontSize: 12,
            background: "white",
            borderBlock: "1px solid #d9d9d9",
            borderTopLeftRadius: "6px",
            borderBottomLeftRadius: "6px",
          },
        }}
        {...selectProps}
        defaultValue={selectProps?.defaultValue}
        onChange={(value) => {
          if (value) {
            form?.setFieldsValue({
              [name as string]: {
                selectedOption: value,
                value: form?.getFieldValue(name)?.value ?? 0,
              },
            })
          }
        }}
      />
    </ProForm.Item>
  )

  useEffect(() => {
    if (form?.getFieldValue(name)?.selectedOption) {
      form?.setFieldsValue({
        [`${name}-selected-option`]:
          form?.getFieldValue(name)?.selectedOption ||
          defaultSelectedValue?.value,
      })
    } else {
      form?.setFieldsValue({
        [`${name}-selected-option`]:
          (defaultSelectedValue?.value as string) || undefined,
      })
      form?.setFieldsValue({
        [name as string]: {
          selectedOption: (defaultSelectedValue?.value as string) || undefined,
          value: form?.getFieldValue(name)?.value ?? 0,
        },
      })
    }
  }, [form])

  return (
    <ProForm.Item
      {...rest}
      label={label}
      name={name}
      dependencies={[`${name}-selected-option`]}
      convertValue={(value: any) => {
        if (typeof value !== "object") {
          return value
        }
        return value?.value
      }}
      transform={(value: any) => {
        if (typeof value !== "object") {
          return {
            [name as string]: {
              selectedOption: form?.getFieldValue(`${name}-selected-option`),
              value,
            },
          }
        }
        return {
          [name as string]: {
            selectedOption: form?.getFieldValue(`${name}-selected-option`),
            value: value?.value,
          },
        }
      }}
    >
      {inputType === "number" ? (
        <InputNumber
          addonBefore={selectBefore}
          {...(inputNumberProps as InputNumberProps)}
          style={{
            width,
          }}
          onChange={(value) => {
            if (value) {
              form?.setFieldsValue({
                [name as string]: {
                  selectedOption: form?.getFieldValue(
                    `${name}-selected-option`,
                  ),
                  value,
                },
              })
            } else {
              form?.setFieldsValue({
                [name as string]: {
                  selectedOption: undefined,
                  value: 0,
                },
                [`${name}-selected-option`]: undefined,
              })
            }
          }}
          defaultValue={form?.getFieldValue(name)?.value || 0}
        />
      ) : (
        <Input
          addonBefore={selectBefore}
          {...(inputProps as InputProps)}
          style={{
            width,
          }}
        />
      )}
    </ProForm.Item>
  )
}
