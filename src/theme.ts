import { theme } from "antd"

export const useAppTheme = () => {
  const { token } = theme.useToken()
  // Add fallback or custom token attributes if they are accessed by code
  // E.g., if token.primary7 or token.neutral7 is used, they are standard Ant Design tokens
  // but if some custom names like lightBorderWinterWhisper are used, we can add fallbacks.
  const customToken = {
    ...token,
    primary7: (token as any).primary7 || token.colorPrimaryActive || token.colorPrimary,
    neutral7: (token as any).neutral7 || token.colorTextSecondary || token.colorText,
    neutral3: (token as any).neutral3 || token.colorBorderSecondary || token.colorBorder,
    neutral4: (token as any).neutral4 || token.colorBorder,
    primary1: (token as any).primary1 || token.colorPrimaryBg,
    primary2: (token as any).primary2 || token.colorPrimaryBgHover,
    primary8: (token as any).primary8 || token.colorPrimaryText,
    primary4: (token as any).primary4 || token.colorPrimaryBorderHover,
    success1: (token as any).success1 || token.colorSuccessBg,
    success2: (token as any).success2 || token.colorSuccessBgHover,
    success7: (token as any).success7 || token.colorSuccess,
    success4: (token as any).success4 || token.colorSuccessBorderHover,
    error1: (token as any).error1 || token.colorErrorBg,
    error2: (token as any).error2 || token.colorErrorBgHover,
    error7: (token as any).error7 || token.colorError,
    error4: (token as any).error4 || token.colorErrorBorderHover,
    warning1: (token as any).warning1 || token.colorWarningBg,
    warning2: (token as any).warning2 || token.colorWarningBgHover,
    warning7: (token as any).warning7 || token.colorWarning,
    warning4: (token as any).warning4 || token.colorWarningBorderHover,
    info1: (token as any).info1 || token.colorInfoBg,
    info2: (token as any).info2 || token.colorInfoBgHover,
    info7: (token as any).info7 || token.colorInfo,
    info4: (token as any).info4 || token.colorInfoBorderHover,
    lightBorderWinterWhisper: (token as any).lightBorderWinterWhisper || "#e8e8e8",
  }
  return customToken as any
}
