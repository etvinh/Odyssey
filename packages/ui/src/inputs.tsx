import { useState } from "react";
import { TextInput as RNTextInput, Switch as RNSwitch, View, type ViewStyle } from "react-native";
import { Icon } from "./Icon";
import { Interactive, focusRing } from "./Pressable";
import { Text } from "./Text";
import { color, radius, space, type as typeScale, borderWidth } from "./tokens";
import { web } from "./web";

/** Label above, helper below, error replacing helper. One shape for every form. */
export function FormRow({
  label,
  error,
  hint,
  required,
  children,
}: {
  label: string;
  error?: string;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <View style={{ gap: space[1] }}>
      <Text variant="caption" tone="muted">
        {label}
        {required ? <Text variant="caption" tone="danger"> *</Text> : null}
      </Text>
      {children}
      {error ? (
        <Text variant="caption" tone="danger">
          {error}
        </Text>
      ) : hint ? (
        <Text variant="caption" tone="subtle">
          {hint}
        </Text>
      ) : null}
    </View>
  );
}

export function TextInput({
  value,
  onChangeText,
  placeholder,
  invalid,
  disabled,
  multiline,
  prefix,
  mono,
  width,
  onSubmitEditing,
  accessibilityLabel,
}: {
  value: string;
  onChangeText: (next: string) => void;
  placeholder?: string;
  invalid?: boolean;
  disabled?: boolean;
  multiline?: boolean;
  /** A fixed adornment inside the field, e.g. the currency sign on a price. */
  prefix?: string;
  mono?: boolean;
  width?: number;
  onSubmitEditing?: () => void;
  accessibilityLabel?: string;
}) {
  const [focused, setFocused] = useState(false);

  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: space[1],
        width,
        paddingHorizontal: space[3],
        minHeight: multiline ? 76 : 36,
        backgroundColor: disabled ? color.surfaceSunken : color.surface,
        borderRadius: radius.md,
        borderWidth: borderWidth.hairline,
        borderColor: invalid ? color.danger : focused ? color.accent : color.borderStrong,
        ...focusRing(focused && !invalid, color.focus),
      }}
    >
      {prefix ? (
        <Text variant="body" tone="subtle">
          {prefix}
        </Text>
      ) : null}
      <RNTextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={color.foregroundSubtle}
        editable={!disabled}
        multiline={multiline}
        onSubmitEditing={onSubmitEditing}
        accessibilityLabel={accessibilityLabel}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={[
          mono ? typeScale.data : typeScale.body,
          {
            flex: 1,
            color: color.foreground,
            paddingVertical: multiline ? space[2] : 0,
            textAlignVertical: multiline ? "top" : "center",
          },
          // The inner input's own outline is suppressed: the ring belongs to
          // the bordered wrapper, which is what the user actually sees.
          web({ outlineStyle: "none" }),
        ]}
      />
    </View>
  );
}

export function SearchField({
  value,
  onChangeText,
  placeholder = "Search",
  width,
}: {
  value: string;
  onChangeText: (next: string) => void;
  placeholder?: string;
  width?: number;
}) {
  const [focused, setFocused] = useState(false);

  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: space[2],
        width,
        height: 36,
        paddingHorizontal: space[3],
        backgroundColor: color.surface,
        borderRadius: radius.md,
        borderWidth: borderWidth.hairline,
        borderColor: focused ? color.accent : color.borderStrong,
        ...focusRing(focused, color.focus),
      }}
    >
      <Icon name="search" size={15} color={color.foregroundSubtle} />
      <RNTextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={color.foregroundSubtle}
        accessibilityLabel={placeholder}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={[typeScale.body, { flex: 1, color: color.foreground }, web({ outlineStyle: "none" })]}
      />
      {value ? (
        <Interactive
          onPress={() => onChangeText("")}
          accessibilityRole="button"
          accessibilityLabel="Clear search"
          style={() => ({ padding: space[0.5] })}
        >
          {() => <Icon name="close" size={14} color={color.foregroundSubtle} />}
        </Interactive>
      ) : null}
    </View>
  );
}

export function Switch({
  value,
  onValueChange,
  label,
  disabled,
}: {
  value: boolean;
  onValueChange: (next: boolean) => void;
  /** Required: the switch needs an accessible name even when shown bare. */
  label: string;
  disabled?: boolean;
}) {
  return (
    <RNSwitch
      value={value}
      onValueChange={onValueChange}
      disabled={disabled}
      accessibilityLabel={label}
      trackColor={{ false: color.borderStrong, true: color.toggleOn }}
      thumbColor={color.surface}
      // RNW renders the track from activeThumbColor/ios_backgroundColor too.
      ios_backgroundColor={color.borderStrong}
    />
  );
}

export function Stepper({
  value,
  onChange,
  min = 1,
  max = 99,
  label,
}: {
  value: number;
  onChange: (next: number) => void;
  min?: number;
  max?: number;
  label: string;
}) {
  const step = (delta: number) => onChange(Math.min(max, Math.max(min, value + delta)));

  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        alignSelf: "flex-start",
        borderRadius: radius.md,
        borderWidth: borderWidth.hairline,
        borderColor: color.borderStrong,
        overflow: "hidden",
      }}
    >
      <StepButton icon="close" disabled={value <= min} onPress={() => step(-1)} label={`Decrease ${label}`} minus />
      <View style={{ minWidth: 40, alignItems: "center" }}>
        <Text variant="data" accessibilityLabel={`${label}: ${value}`}>
          {value}
        </Text>
      </View>
      <StepButton icon="plus" disabled={value >= max} onPress={() => step(1)} label={`Increase ${label}`} />
    </View>
  );
}

function StepButton({
  icon,
  onPress,
  disabled,
  label,
  minus,
}: {
  icon: "plus" | "close";
  onPress: () => void;
  disabled: boolean;
  label: string;
  minus?: boolean;
}) {
  return (
    <Interactive
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      style={({ hovered, pressed, focused }): ViewStyle => ({
        width: 32,
        height: 34,
        alignItems: "center",
        justifyContent: "center",
        opacity: disabled ? 0.35 : 1,
        backgroundColor: pressed ? color.surfaceSunken : hovered && !disabled ? color.surfaceHover : "transparent",
        ...focusRing(focused, color.focus),
      })}
    >
      {() =>
        minus ? (
          // A minus is the plus without its vertical stroke; drawn rather than typed.
          <View style={{ width: 11, height: 1.75, backgroundColor: color.foregroundMuted, borderRadius: 1 }} />
        ) : (
          <Icon name={icon} size={14} color={color.foregroundMuted} />
        )
      }
    </Interactive>
  );
}
