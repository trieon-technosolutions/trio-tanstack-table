import React, { ReactNode } from "react"
import { Typography } from "antd"
import { TextProps } from "antd/es/typography/Text"
import { ParagraphProps } from "antd/es/typography/Paragraph"
import { TitleProps } from "antd/es/typography/Title"
import { LinkProps } from "antd/es/typography/Link"
import { Link } from "react-router-dom"

export interface TextTypographyProps extends TextProps {
  children: ReactNode
  color?: string
  fontWeight?:
    | "100"
    | "200"
    | "300"
    | "400"
    | "500"
    | "600"
    | "700"
    | "800"
    | "900"
  textAlign?: "center" | "left" | "right"
  fontSize?: string
}

export const EText: React.FC<TextTypographyProps> = ({
  children,
  fontWeight = "400",
  textAlign = "left",
  fontSize = "14px",
  color,
  ...rest
}) => {
  return (
    <Typography.Text
      {...rest}
      style={{
        color,
        fontWeight,
        textAlign,
        fontSize,
        ...rest?.style,
      }}
    >
      {children}
    </Typography.Text>
  )
}

export interface ParagraphTypographyProps extends ParagraphProps {
  children: ReactNode
  color?: string
  fontWeight?:
    | "100"
    | "200"
    | "300"
    | "400"
    | "500"
    | "600"
    | "700"
    | "800"
    | "900"
  textAlign?: "center" | "left" | "right"
}

export const EParagraph: React.FC<ParagraphTypographyProps> = ({
  children,
  fontWeight = "400",
  textAlign = "left",
  color,
  ...rest
}) => {
  return (
    <Typography.Paragraph
      {...rest}
      style={{
        color,
        fontSize: "14px",
        fontWeight,
        textAlign,
        ...rest.style,
      }}
    >
      {children}
    </Typography.Paragraph>
  )
}

interface TitleTypographyProps extends TitleProps {
  children: ReactNode
  color?: string
  fontWeight?:
    | "100"
    | "200"
    | "300"
    | "400"
    | "500"
    | "600"
    | "700"
    | "800"
    | "900"
  textAlign?: "center" | "left" | "right"
}

export const EHeading: React.FC<TitleTypographyProps> = ({
  children,
  fontWeight = "400",
  textAlign = "left",
  color,
  ...rest
}) => {
  return (
    <Typography.Title
      {...rest}
      style={{
        color,
        fontSize: "1.4rem",
        fontWeight,
        textAlign,
        ...rest.style,
      }}
    >
      {children}
    </Typography.Title>
  )
}

interface LinkTypographyProps extends LinkProps {
  children: ReactNode
  color?: string
  fontWeight?:
    | "100"
    | "200"
    | "300"
    | "400"
    | "500"
    | "600"
    | "700"
    | "800"
    | "900"
  textAlign?: "center" | "left" | "right"
  fontSize?: string
  linkColor?: string
}

export const ELink: React.FC<LinkTypographyProps> = ({
  children,
  fontWeight = "400",
  textAlign = "left",
  fontSize = "14px",
  color,
  linkColor,
  onClick,
  ...rest
}) => {
  const style = {
    color: linkColor || color,
    fontWeight,
    textAlign,
    fontSize,
    cursor: "pointer",
    ...rest.style,
  }

  if (rest.href) {
    return (
      <Typography.Text {...rest} style={style}>
        <Link to={rest.href} style={{ color: linkColor }} onClick={onClick} {...(rest as any)}>
          {children}
        </Link>
      </Typography.Text>
    )
  }

  return (
    <Typography.Link {...rest} onClick={onClick} style={style}>
      {children}
    </Typography.Link>
  )
}
