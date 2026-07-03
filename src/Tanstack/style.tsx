import { createStyles } from "antd-style"
import { useAppTheme } from "~/theme"

export const useTableStyles = () => {
  const token = useAppTheme()
  return createStyles((_) => ({
    body: {
      ".ant-form-item": {
        marginBottom: "0px !important",
      },
    },
    dropDown: {
      ".ant-dropdown-menu": {
        padding: 0,
        borderRadius: "none",
        "&:hover": {
          backgroundColor: "white !important",
        },
      },
      ".ant-dropdown-menu-item": {
        padding: "8px 12px",
        "&:hover": {
          backgroundColor: "white !important",
        },
      },
    },
    tableHead: {
      backgroundColor: token.neutral10,
      color: token.neutral9,
      textAlign: "left",
      fontWeight: 600,
      margin: 0,
      maxWidth: "50%",
    },
  }))()
}
