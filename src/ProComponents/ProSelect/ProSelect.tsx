import React from "react"
import { ProFormSelect, ProFormSelectProps } from "@ant-design/pro-components"

export interface ProSelectProps extends ProFormSelectProps {
  isFullWidth?: boolean
}

export const ProSelect: React.FC<ProSelectProps> = ({
  isFullWidth,
  fieldProps,
  ...rest
}) => {
  return (
    <ProFormSelect
      fieldProps={{
        ...fieldProps,
        style: {
          width: isFullWidth ? "100%" : fieldProps?.style?.width,
          ...fieldProps?.style,
        },
      }}
      {...rest}
    />
  )
}
