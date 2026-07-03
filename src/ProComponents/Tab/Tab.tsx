import { Tabs, TabsProps } from "antd"
import React from "react"
import { createStyles } from "antd-style"

const useStyles = createStyles(() => ({
  tabWrapper: {
    "& .ant-tabs-tab-btn": {
      fontWeight: 500,
    },
  },
}))

export interface ETabProps extends TabsProps {
  enableKeyboardNavigation?: boolean
}

export const ETab: React.FC<ETabProps> = ({
  enableKeyboardNavigation = false,
  ...rest
}) => {
  const { styles } = useStyles()

  return (
    <Tabs
      className={styles.tabWrapper}
      {...rest}
      items={rest.items?.map((item, index) => ({
        ...item,
        children: (
          <div data-tab-key={item.key} data-tab-index={index}>
            {item.children}
          </div>
        ),
      }))}
    />
  )
}
