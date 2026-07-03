import React, { useEffect, useState } from "react"
import { DrawerForm, DrawerFormProps } from "@ant-design/pro-components"
import { Button, Col, Flex, Row, Tooltip, Grid } from "antd"
import { IconFilter } from "@tabler/icons-react"

import { EText } from "../../Typography"

// ShadcnFilterButton inline implementation
export function ShadcnFilterButton({ ...rest }) {
  return (
    <Tooltip title="Filter">
      <Button 
        {...rest} 
        style={{ 
          display: "flex", 
          alignItems: "center", 
          justifyContent: "center",
          ...rest?.style
        }} 
        size="middle"
      >
        <IconFilter size={14} />
      </Button>
    </Tooltip>
  )
}

// ProDrawerForm decoupled implementation
interface ProDrawerFormProps extends DrawerFormProps {}

export const ProDrawerForm: React.FC<ProDrawerFormProps> = ({
  children,
  drawerProps,
  submitter,
  ...rest
}) => {
  const { useBreakpoint } = Grid
  const screens = useBreakpoint()
  const [drawerWidth, setDrawerWidth] = useState("55%")

  useEffect(() => {
    if (screens.md) {
      setDrawerWidth("55%")
    } else {
      setDrawerWidth("75%")
    }
  }, [screens])

  return (
    <DrawerForm
      key={drawerWidth}
      autoFocusFirstInput
      preserve={false}
      drawerProps={{
        zIndex: 1006,
        destroyOnClose: true,
        ...drawerProps,
      }}
      submitter={
        submitter && {
          searchConfig: {
            submitText: "Save",
            resetText: "Cancel",
          },
          ...submitter,
        }
      }
      width={drawerWidth}
      {...rest}
    >
      {children}
    </DrawerForm>
  )
}

// FilterRow
export const FilterRow: React.FC<{
  children: React.ReactNode
}> = ({ children }) => {
  return <Row gutter={[16, 16]}>{children}</Row>
}

// FilterCol
export const FilterCol: React.FC<{
  children: React.ReactNode
}> = ({ children }) => {
  return (
    <Col lg={8} md={12} sm={24} xs={24}>
      {children}
    </Col>
  )
}

// FilterProDrawerForm
interface FilterProDrawerFormProps extends DrawerFormProps {
  onReset?: () => void
  initialValues: Record<string, unknown>
}

export const FilterProDrawerForm: React.FC<FilterProDrawerFormProps> = ({
  children,
  form,
  onReset,
  initialValues,
  ...rest
}) => {
  return (
    <ProDrawerForm
      initialValues={initialValues}
      title={
        <Flex justify="space-between" align="center">
          <EText>Apply Filter</EText>
          <Button
            onClick={() => {
              const fields = form?.getFieldsValue()
              form?.setFieldsValue({
                ...Object.keys(fields || {}).reduce<Record<string, unknown>>(
                  (acc, key) => {
                    acc[key as any] = undefined
                    return acc
                  },
                  {},
                ),
              })
              onReset?.()
            }}
            type="default"
          >
            Reset
          </Button>
        </Flex>
      }
      form={form}
      omitNil={false}
      trigger={<ShadcnFilterButton />}
      autoFocusFirstInput
      {...rest}
      drawerProps={{
        ...rest.drawerProps,
        zIndex: 1999,
      }}
      width="70%"
    >
      {children}
    </ProDrawerForm>
  )
}
