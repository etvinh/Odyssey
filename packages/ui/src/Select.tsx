import { useState } from "react";
import { Modal, Pressable, ScrollView, View, type ViewStyle } from "react-native";
import { Icon } from "./Icon";
import { Interactive, focusRing } from "./Pressable";
import { SearchField } from "./inputs";
import { Text } from "./Text";
import { color, radius, shadow, space, borderWidth } from "./tokens";
import { transition } from "./web";

export type SelectOption<T extends string> = {
  value: T;
  label: string;
  /** A second line under the label — a phone number, a price. */
  detail?: string;
};

/**
 * React Native has no `<select>`, so this is a Pressable that opens a sheet.
 * The sheet gains a filter once the list is long enough that scanning it beats
 * scrolling it; below that the field is just a menu.
 */
export function Select<T extends string>({
  value,
  options,
  onChange,
  placeholder = "Choose…",
  label,
  invalid,
  disabled,
  emptyText = "Nothing to choose from",
  footer,
  searchable = true,
}: {
  value: T | null;
  options: SelectOption<T>[];
  onChange: (next: T) => void;
  placeholder?: string;
  label: string;
  invalid?: boolean;
  disabled?: boolean;
  emptyText?: string;
  /** An action pinned under the list — "+ New customer" and the like. */
  footer?: React.ReactNode;
  searchable?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState("");

  const selected = options.find((option) => option.value === value) ?? null;
  const needle = filter.trim().toLowerCase();
  const shown = needle
    ? options.filter(
        (option) =>
          option.label.toLowerCase().includes(needle) ||
          option.detail?.toLowerCase().includes(needle),
      )
    : options;

  const close = () => {
    setOpen(false);
    setFilter("");
  };

  return (
    <>
      <Interactive
        onPress={() => setOpen(true)}
        disabled={disabled}
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityValue={{ text: selected?.label ?? placeholder }}
        accessibilityState={{ expanded: open, disabled: Boolean(disabled) }}
        style={({ hovered, focused }): ViewStyle => ({
          flexDirection: "row",
          alignItems: "center",
          gap: space[2],
          minHeight: 36,
          paddingHorizontal: space[3],
          backgroundColor: disabled ? color.surfaceSunken : hovered ? color.surfaceHover : color.surface,
          borderRadius: radius.md,
          borderWidth: borderWidth.hairline,
          borderColor: invalid ? color.danger : color.borderStrong,
          opacity: disabled ? 0.6 : 1,
          ...transition("background-color", 120),
          ...focusRing(focused, color.focus),
        })}
      >
        {() => (
          <>
            <Text variant="body" tone={selected ? "default" : "subtle"} style={{ flex: 1 }}>
              {selected?.label ?? placeholder}
            </Text>
            <Icon name="chevronDown" size={15} color={color.foregroundSubtle} />
          </>
        )}
      </Interactive>

      <Modal visible={open} transparent animationType="fade" onRequestClose={close}>
        <Pressable
          onPress={close}
          accessibilityLabel="Close menu"
          style={{
            flex: 1,
            backgroundColor: color.scrim,
            alignItems: "center",
            justifyContent: "center",
            padding: space[4],
          }}
        >
          <Pressable
            onPress={(event) => event.stopPropagation()}
            style={{
              width: "100%",
              maxWidth: 420,
              maxHeight: 460,
              backgroundColor: color.surfaceRaised,
              borderRadius: radius.lg,
              ...shadow.overlay,
            }}
          >
            <View
              style={{
                padding: space[3],
                gap: space[2],
                borderBottomWidth: borderWidth.hairline,
                borderBottomColor: color.border,
              }}
            >
              <Text variant="subheading">{label}</Text>
              {searchable && options.length > 7 ? (
                <SearchField value={filter} onChangeText={setFilter} placeholder="Filter" />
              ) : null}
            </View>

            <ScrollView>
              {shown.length === 0 ? (
                <View style={{ padding: space[6], alignItems: "center" }}>
                  <Text variant="body" tone="subtle">
                    {needle ? "Nothing matches that" : emptyText}
                  </Text>
                </View>
              ) : (
                shown.map((option) => {
                  const isSelected = option.value === value;
                  return (
                    <Interactive
                      key={option.value}
                      onPress={() => {
                        onChange(option.value);
                        close();
                      }}
                      accessibilityRole="button"
                      accessibilityState={{ selected: isSelected }}
                      style={({ hovered, pressed, focused }): ViewStyle => ({
                        flexDirection: "row",
                        alignItems: "center",
                        gap: space[2],
                        paddingHorizontal: space[3],
                        paddingVertical: space[2],
                        backgroundColor: isSelected
                          ? color.surfaceSelected
                          : pressed
                            ? color.surfaceSunken
                            : hovered
                              ? color.surfaceHover
                              : "transparent",
                        ...focusRing(focused, color.focus),
                      })}
                    >
                      {() => (
                        <>
                          <View style={{ flex: 1 }}>
                            <Text variant="body">{option.label}</Text>
                            {option.detail ? (
                              <Text variant="caption" tone="subtle">
                                {option.detail}
                              </Text>
                            ) : null}
                          </View>
                          {isSelected ? <Icon name="check" size={15} color={color.accent} /> : null}
                        </>
                      )}
                    </Interactive>
                  );
                })
              )}
            </ScrollView>

            {footer ? (
              <View
                style={{
                  padding: space[3],
                  borderTopWidth: borderWidth.hairline,
                  borderTopColor: color.border,
                }}
              >
                {footer}
              </View>
            ) : null}
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}
