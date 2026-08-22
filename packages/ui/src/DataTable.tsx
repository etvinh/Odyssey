import { FlatList, View, type ViewStyle } from "react-native";
import { Interactive, focusRing } from "./Pressable";
import { Text } from "./Text";
import { color, radius, space, borderWidth } from "./tokens";
import { transition } from "./web";

export type Column<Row> = {
  key: string;
  header: string;
  width?: number;
  /** Numerics right-align so they compare down the column. */
  align?: "left" | "right";
  flex?: number;
  render: (row: Row) => React.ReactNode;
};

/**
 * React Native has no table, so this is a FlatList carrying the ARIA roles
 * React Native Web turns into real table semantics — see ADR-0002. Screen
 * readers announce it as a table; sighted users get a hoverable row.
 */
export function DataTable<Row>({
  columns,
  rows,
  keyExtractor,
  onRowPress,
  selectedKey,
  emptyState,
  caption,
}: {
  columns: Column<Row>[];
  rows: Row[];
  keyExtractor: (row: Row) => string;
  onRowPress?: (row: Row) => void;
  selectedKey?: string;
  emptyState?: React.ReactNode;
  caption?: string;
}) {
  if (rows.length === 0 && emptyState) return <>{emptyState}</>;

  return (
    <View
      accessibilityRole={"table" as "none"}
      accessibilityLabel={caption}
      style={{
        borderWidth: borderWidth.hairline,
        borderColor: color.border,
        borderRadius: radius.lg,
        overflow: "hidden",
        backgroundColor: color.surfaceRaised,
      }}
    >
      <View
        accessibilityRole={"row" as "none"}
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: space[4],
          paddingHorizontal: space[4],
          height: 38,
          backgroundColor: color.surfaceSunken,
          borderBottomWidth: borderWidth.hairline,
          borderBottomColor: color.border,
        }}
      >
        {columns.map((column) => (
          <View
            key={column.key}
            accessibilityRole={"columnheader" as "none"}
            style={cellStyle(column)}
          >
            <Text variant="overline" tone="subtle">
              {column.header}
            </Text>
          </View>
        ))}
      </View>

      <FlatList
        data={rows}
        keyExtractor={keyExtractor}
        scrollEnabled={false}
        renderItem={({ item, index }) => {
          const key = keyExtractor(item);
          const selected = key === selectedKey;
          const last = index === rows.length - 1;

          const body = (state?: { hovered: boolean; pressed: boolean }) => (
            <View
              accessibilityRole={"row" as "none"}
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: space[4],
                paddingHorizontal: space[4],
                minHeight: 46,
                borderBottomWidth: last ? 0 : borderWidth.hairline,
                borderBottomColor: color.border,
                backgroundColor: selected
                  ? color.surfaceSelected
                  : state?.pressed
                    ? color.surfaceSunken
                    : state?.hovered
                      ? color.surfaceHover
                      : "transparent",
                ...transition("background-color", 120),
              }}
            >
              {columns.map((column) => (
                <View key={column.key} accessibilityRole={"cell" as "none"} style={cellStyle(column)}>
                  {column.render(item)}
                </View>
              ))}
            </View>
          );

          if (!onRowPress) return body();

          return (
            <Interactive
              onPress={() => onRowPress(item)}
              accessibilityRole="button"
              style={({ focused }): ViewStyle => focusRing(focused, color.focus)}
            >
              {(state) => body(state)}
            </Interactive>
          );
        }}
      />
    </View>
  );
}

function cellStyle<Row>(column: Column<Row>): ViewStyle {
  return {
    width: column.width,
    flex: column.width ? undefined : (column.flex ?? 1),
    alignItems: column.align === "right" ? "flex-end" : "flex-start",
  };
}
