import { Button, ButtonProps } from "antd"
import { RefObject } from "react"

export interface EButtonProps extends Omit<ButtonProps, "variant"> {
  ref?: RefObject<any>
}

export const EButton: React.FC<EButtonProps> = (props) => {
  return (
    <Button
      ref={{ ...(props?.ref as unknown as RefObject<any>) }}
      {...props}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        ...props?.style,
      }}
    />
  )
}

export interface TableDeleteButtonProps extends ButtonProps {
  indicator?: number
}

export const TableClearButton: React.FC<TableDeleteButtonProps> = ({
  indicator,
  ...rest
}) => {
  return (
    <EButton
      type="link"
      style={{ fontWeight: "500", display: "flex", alignItems: "center" }}
      {...rest}
    >
      Clear({indicator})
    </EButton>
  )
}
