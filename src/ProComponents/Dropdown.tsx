import { Dropdown, DropdownProps } from "antd"
import React from "react"
import { createStyles } from "antd-style"
import { useAppTheme } from "../theme"

const useStyles = () => {
  const token = useAppTheme()
  return createStyles(() => ({
    container: {
      zIndex: 1001,
      ".ant-dropdown-menu-item": {
        width: 196,
      },
      ".ant-dropdown-menu-item-icon": {
        color: token.colorPrimary,
        fontSize: `18px !important`,
        minWidth: `18px !important`,
      },
      ".ant-dropdown-menu-item-divider": {
        color: token.colorPrimary,
        backgroundColor: `${token.primary2} !important`,
        marginInline: `-${token.sizeUnit}px !important`,
      },
    },
  }))()
}

export interface EDropdownProps extends DropdownProps {
  width?: string | number
}

export const EDropdown: React.FC<EDropdownProps> = ({
  width = 196,
  ...rest
}) => {
  const { styles } = useStyles()
  return (
    <div>
      <Dropdown
        trigger={["click"]}
        overlayStyle={{ width, ...rest?.overlayStyle }}
        className={styles.container}
        overlayClassName={styles.container}
        {...rest}
      />
    </div>
  )
}
