/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  ProFieldRequestData,
  ProFieldValueEnumType,
  ProFormCheckbox,
  ProFormSelect,
  ProFormSelectProps,
} from "@ant-design/pro-components";
import { IconClockPause } from "@tabler/icons-react";
import { Empty, Flex, SelectProps } from "antd";
import useFormInstance from "antd/es/form/hooks/useFormInstance";
import { DefaultOptionType } from "antd/es/select";
import { CheckboxProps } from "antd/lib";
import { useEffect, useRef, useState } from "react";
import { useAppTheme } from "~/theme";
import { EText } from "../../Typography";
import { FullColumnWIdth } from "./select-constant";
import { useStyles } from "./styles";
import { useInfiniteSelectOptions } from "./useInfiniteSelectOptions";

type SelectVariantType = "DYNAMIC" | "STATIC";
export interface ProSelectProps extends ProFormSelectProps {
  isFullWidth?: boolean;
  width?: number | "sm" | "md" | "xl" | "xs" | "lg" | undefined;
  fieldProps?: SelectProps;
  valueEnum?: ProFieldValueEnumType;
  options?: DefaultOptionType[];
  showSearch?: boolean;
  loading?: boolean;
  dataKey?: "data" | "rows";

  fetchMoreDataLoading?: boolean;
  hasMoreData?: boolean;
  apiToCall?: any;
  defaultExtraOptions?: Record<string, any>;
  emptyDescription?: string;
  selectVariant?: SelectVariantType;
  autoSelectIfSingle?: boolean;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  request?: ProFieldRequestData<any>;
}

export const ProSelect: React.FC<ProSelectProps> = ({
  isFullWidth,
  selectVariant = "STATIC",
  width = isFullWidth ? FullColumnWIdth : "md",
  showSearch = true,
  fieldProps,
  valueEnum,
  request,
  apiToCall,
  hasMoreData,
  defaultExtraOptions,
  fetchMoreDataLoading = false,
  emptyDescription,
  autoSelectIfSingle,
  ...rest
}) => {
  const token = useAppTheme();
  const { styles } = useStyles();
  const form = useFormInstance();
  const autoSelectedRef = useRef(false);

  const {
    loading,
    options: selectOptions,
    onClear,
    onPopupScroll,
    onDropdownVisibleChange,
    onSearch,
  } = useInfiniteSelectOptions({
    endpoint: apiToCall,
    queryKey: `query-${apiToCall}`,
    dataKey: "data",
    limit: 10,
    defaultExtraOptions,
    fetchOnMount: autoSelectIfSingle,
  });

  useEffect(() => {
    if (
      autoSelectIfSingle &&
      selectVariant === "DYNAMIC" &&
      !loading &&
      selectOptions.length === 1 &&
      !autoSelectedRef.current
    ) {
      autoSelectedRef.current = true;
      const option = selectOptions[0];
      const labelField = fieldProps?.fieldNames?.label || "label";
      const valueField = fieldProps?.fieldNames?.value || "value";
      const syntheticValue = {
        label: option[labelField],
        value: option[valueField],
        id: option[valueField],
        ...option,
      };
      if (rest.name && form) {
        form.setFieldValue(rest.name, syntheticValue);
      }
      fieldProps?.onSelect?.(syntheticValue, syntheticValue);
      fieldProps?.onChange?.(syntheticValue, syntheticValue);
    }
  }, [autoSelectIfSingle, selectVariant, loading, selectOptions, fieldProps]);

  return selectVariant === "DYNAMIC" ? (
    <ProFormSelect
      width={width}
      request={request}
      showSearch={showSearch}
      addonWarpStyle={{
        flexWrap: "nowrap",
      }}
      options={selectOptions}
      fieldProps={{
        onKeyDown: (e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            fieldProps?.onClick?.({} as any);
          }
        },
        loading,
        labelInValue: true,
        filterOption: false,
        virtual: false,
        onPopupScroll,
        onDropdownVisibleChange,
        onSearch,
        menuItemSelectedIcon: true,
        allowClear: true,
        notFoundContent: loading ? (
          <Flex justify="center" align="center" style={{ height: 75 }}>
            <Empty
              image={<IconClockPause color={token.neutral8} />}
              imageStyle={{ height: 25 }}
              description={
                <EText color={token.neutral8}>Please wait, Loading data</EText>
              }
            />
          </Flex>
        ) : (
          <Flex justify="center" align="center" style={{ height: 75 }}>
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              imageStyle={{ height: 25 }}
              description={emptyDescription || "No Data"}
            />
          </Flex>
        ),
        dropdownRender(menu) {
          return (
            <div
              style={{
                opacity: loading ? 0.5 : 1,
              }}
            >
              {menu}
              <Flex align="center" justify="center">
                {loading && selectOptions.length > 0 && (
                  <div className={styles.loader} />
                )}
              </Flex>
            </div>
          );
        },
        ...fieldProps,
        onClear: () => {
          onClear();
          fieldProps?.onClear?.();
        },
      }}
      {...rest}
      placeholder="Please Select"
      style={{ width, ...rest?.style }}
    />
  ) : (
    <ProFormSelect
      width={width}
      request={request}
      valueEnum={valueEnum}
      showSearch={showSearch}
      addonWarpStyle={{
        flexWrap: "nowrap",
      }}
      fieldProps={{
        onKeyDown: (e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            fieldProps?.onClick?.({} as any);
          }
        },
        loading,
        menuItemSelectedIcon: true,
        allowClear: true,

        notFoundContent: loading ? (
          <Flex justify="center" align="center" style={{ height: 75 }}>
            <Empty
              image={<IconClockPause color={token.neutral8} />}
              imageStyle={{ height: 25 }}
              description={
                <EText color={token.neutral8}>Please wait, Loading data</EText>
              }
            />
          </Flex>
        ) : (
          <Flex justify="center" align="center" style={{ height: 75 }}>
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              imageStyle={{ height: 25 }}
              description={emptyDescription || "No Data"}
            />
          </Flex>
        ),
        dropdownRender(menu) {
          return (
            <div
              style={{
                opacity: loading ? 0.5 : 1,
              }}
            >
              {menu}
              <Flex align="center" justify="center">
                {fetchMoreDataLoading && <div className={styles.loader} />}
              </Flex>
            </div>
          );
        },
        ...fieldProps,
      }}
      {...rest}
      placeholder="Please Select"
      style={{ width, ...rest?.style }}
    />
  );
};

interface TagSelectCheckboxProps extends ProSelectProps {
  checkboxProps?: CheckboxProps;
  defaultDisableCondition?: boolean;
}

export const TagSelectWithCheckbox: React.FC<TagSelectCheckboxProps> = ({
  name,
  checkboxProps,
  defaultDisableCondition = true,
  ...rest
}) => {
  const [disable, setDisable] = useState(defaultDisableCondition);

  return (
    <ProSelect
      mode="multiple"
      disabled={disable}
      name={name}
      addonBefore={
        <ProFormCheckbox
          fieldProps={{
            onChange: (e) => {
              setDisable(!e.target.checked);
            },
          }}
          {...checkboxProps}
        />
      }
      transform={(value) => {
        if (disable) {
          return { [name]: undefined };
        } else {
          return { [name]: value };
        }
      }}
      {...rest}
    />
  );
};
