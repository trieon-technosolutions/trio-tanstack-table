import React from "react"
import { Icon } from "@iconify/react"
import { useAppTheme } from "../../theme"

export interface EIconProps extends Omit<React.HTMLAttributes<HTMLElement>, "color"> {
  icon: string | any
  color?: string
  width?: string | number
  height?: string | number
  size?: string | number
  title?: string
  style?: React.CSSProperties
  className?: string
}

export const EIcon: React.FC<EIconProps> = ({ size, width, height, ...rest }) => {
  const finalWidth = width || size
  const finalHeight = height || size
  return <Icon width={finalWidth} height={finalHeight} {...(rest as any)} />
}

export interface EPrimaryIconProps extends EIconProps {
  child?: boolean
  isActive?: boolean
}

export const EPrimaryIcon: React.FC<EPrimaryIconProps> = ({
  child = false,
  isActive = false,
  ...rest
}) => {
  const token = useAppTheme()
  return (
    <EIcon
      color={isActive ? token.primary7 : token.neutral7}
      size={16}
      {...rest}
      style={{ ...rest?.style }}
    />
  )
}
