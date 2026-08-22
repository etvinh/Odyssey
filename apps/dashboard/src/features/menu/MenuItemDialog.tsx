import { useState } from "react";
import { View } from "react-native";
import { ApiError, type MenuItem } from "@odyssey/api-client";
import { Button, Dialog, FormRow, Switch, Text, TextInput, space } from "@odyssey/ui";

export type ItemDraft = {
  name: string;
  description: string;
  priceCents: number;
  isAvailable: boolean;
};

/**
 * Create and edit share this dialog: the only difference is what it opens with
 * and which mutation the caller runs.
 *
 * Prices are typed in currency and held in cents. The field keeps its own text
 * so a half-typed "12." survives a re-render — parsing every keystroke would
 * snap the caret and make the input unusable.
 */
export function MenuItemDialog({
  open,
  initial,
  onClose,
  onSubmit,
  isSaving,
  error,
}: {
  open: boolean;
  initial?: MenuItem;
  onClose: () => void;
  onSubmit: (draft: ItemDraft) => void;
  isSaving: boolean;
  error?: unknown;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [price, setPrice] = useState(initial ? (initial.priceCents / 100).toFixed(2) : "");
  const [isAvailable, setIsAvailable] = useState(initial?.isAvailable ?? true);

  // Server field errors land under the input they belong to.
  const fields = error instanceof ApiError ? (error.fields ?? {}) : {};
  const formError = error instanceof ApiError && !error.fields ? error.message : undefined;

  const priceCents = Math.round(Number(price.replace(/[^0-9.]/g, "")) * 100);
  const priceIsValid = price.trim() !== "" && Number.isFinite(priceCents) && priceCents >= 0;
  const canSubmit = name.trim() !== "" && priceIsValid && !isSaving;

  const submit = () =>
    onSubmit({
      name: name.trim(),
      description: description.trim(),
      priceCents,
      isAvailable,
    });

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={initial ? `Edit ${initial.name}` : "New menu item"}
      footer={
        <>
          <Button label="Cancel" variant="ghost" onPress={onClose} />
          <Button
            label={initial ? "Save changes" : "Add item"}
            variant="primary"
            onPress={submit}
            disabled={!canSubmit}
            loading={isSaving}
          />
        </>
      }
    >
      <FormRow label="Name" required error={fields.name}>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="Marinated olives"
          invalid={Boolean(fields.name)}
          onSubmitEditing={() => canSubmit && submit()}
        />
      </FormRow>

      <FormRow label="Description" hint="Optional" error={fields.description}>
        <TextInput
          value={description}
          onChangeText={setDescription}
          placeholder="Castelvetrano, orange zest, thyme"
          multiline
          invalid={Boolean(fields.description)}
        />
      </FormRow>

      <FormRow label="Price" required error={fields.priceCents}>
        <TextInput
          value={price}
          onChangeText={setPrice}
          placeholder="6.50"
          prefix="$"
          mono
          width={150}
          invalid={Boolean(fields.priceCents)}
        />
      </FormRow>

      <View style={{ flexDirection: "row", alignItems: "center", gap: space[2] }}>
        <Switch value={isAvailable} onValueChange={setIsAvailable} label="Available to order" />
        <Text variant="body" tone="muted">
          {isAvailable ? "Available to order" : "Unavailable right now"}
        </Text>
      </View>

      {formError ? (
        <Text variant="body" tone="danger">
          {formError}
        </Text>
      ) : null}
    </Dialog>
  );
}
