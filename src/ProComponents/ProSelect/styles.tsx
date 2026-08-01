import { createStyles } from "antd-style"
import { useAppTheme } from "~/theme"

export const useStyles = () => {
  const token = useAppTheme()
  return createStyles((_) => ({
    loader: {
      width: 25,
      padding: 4,
      aspectRatio: 1,
      borderRadius: "50%",
      background: `${token.neutral8}`,
      "--_m": `
        conic-gradient(#0000 10%, #000),
        linear-gradient(#000 0 0) content-box
      `,
      WebkitMask: "var(--_m)",
      mask: "var(--_m)",
      WebkitMaskComposite: "source-out",
      maskComposite: "subtract",
      animation: "l3 1s infinite linear",
      "@keyframes l3": {
        to: { transform: "rotate(1turn)" },
      },
    },
    uploadWrapper: {
      display: "flex !important",
      flex: "1 !important",
      width: "100% !important",
      flexDirection: "column",
      height: "220px !important",
      minWidth: "300px !important",

      ".ant-upload": {
        display: "flex !important",
        flex: "1 !important",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        cursor: "pointer",
        padding: 0,
        border: "1px dashed grey !important",
      },
      ".ant-upload-select": {
        "& .ant-upload": {
          border: "0 !important",
        },
      },
    },
    formWrapper: {
      ".ant-form-item-explain-error": {
        fontSize: "11px",
      },
    },
  }))()
}
