import { View } from "react-native";
import { Button } from "./Button";
import { Text } from "./Text";
import { color, radius, space, borderWidth } from "./tokens";

/**
 * The footer of an editable card: says whether there is anything to save, and
 * offers the two ways out.
 *
 * Clean is not hidden — a bar that appears only once a field changes moves the
 * card's contents under the pointer at the moment someone is aiming at it. It
 * stays put and goes quiet instead.
 */
export function SaveBar({
  dirty,
  saving,
  onSave,
  onReset,
  saveLabel = "Save changes",
  cleanLabel = "No unsaved changes",
}: {
  dirty: boolean;
  saving?: boolean;
  onSave: () => void;
  onReset: () => void;
  saveLabel?: string;
  cleanLabel?: string;
}) {
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: space[3],
        marginTop: space[4],
        paddingTop: space[3],
        borderTopWidth: borderWidth.hairline,
        borderTopColor: color.border,
        borderBottomLeftRadius: radius.md,
        borderBottomRightRadius: radius.md,
      }}
    >
      <Text variant="caption" tone={dirty ? "muted" : "subtle"}>
        {dirty ? "Unsaved changes" : cleanLabel}
      </Text>
      <View style={{ flex: 1 }} />
      <Button label="Discard" variant="ghost" onPress={onReset} disabled={!dirty || saving} />
      <Button
        label={saveLabel}
        variant="primary"
        onPress={onSave}
        disabled={!dirty}
        loading={saving}
      />
    </View>
  );
}
