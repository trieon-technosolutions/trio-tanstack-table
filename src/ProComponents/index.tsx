// Barrel export for all required ProComponents and typography wrappers in the standalone package

export * from "./Icon"
export * from "./Button"
export * from "./Tab"
export * from "./Dropdown"
export * from "./ProSelect"
export * from "./ProFields"

// Typography exports
export * from "../Typography"

// EDividerWithNoStyle
import { Divider, DividerProps } from "antd"
import React, { useCallback, useState } from "react"
import { message } from "antd"

export interface EDividerProps extends DividerProps {
  marginTop?: number
  marginBottom?: number
}

export const EDividerWithNoStyle: React.FC<EDividerProps> = ({
  marginTop = 6,
  marginBottom = 6,
  children,
  ...rest
}) => {
  return (
    <Divider style={{ marginTop, marginBottom, ...rest?.style }} {...rest}>
      {children}
    </Divider>
  )
}

// useFilePreview Hook
export const useFilePreview = () => {
  const [loading, setLoading] = useState(false)

  const previewFile = useCallback(async (fileId: string) => {
    if (!fileId) {
      message.error("File ID is required")
      return null
    }

    setLoading(true)
    try {
      const response = await fetch(`/api/storage/presigned-url/download/${fileId}`)
      if (!response.ok) throw new Error("Failed to fetch preview URL")
      const result = await response.json()
      const { url } = result.data

      window.open(url, "_blank")
      return url
    } catch (error) {
      console.error("Failed to get preview URL:", error)
      message.error("Failed to preview file")
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  const getDownloadUrl = useCallback(async (fileId: string) => {
    if (!fileId) {
      message.error("File ID is required")
      return null
    }

    setLoading(true)
    try {
      const response = await fetch(`/api/storage/presigned-url/download/${fileId}`)
      if (!response.ok) throw new Error("Failed to fetch download URL")
      const result = await response.json()
      return result.data
    } catch (error) {
      console.error("Failed to get download URL:", error)
      message.error("Failed to get download URL")
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  const downloadFile = useCallback(
    async (fileId: string, filename?: string) => {
      const result = await getDownloadUrl(fileId)
      if (!result) return

      const link = document.createElement("a")
      link.href = result.url
      link.download = filename || result.filename
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    },
    [getDownloadUrl],
  )

  return {
    previewFile,
    getDownloadUrl,
    downloadFile,
    loading,
  }
}
