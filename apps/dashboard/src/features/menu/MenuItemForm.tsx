import { useState } from "react";
import { Pressable, Switch, Text, TextInput, View } from "react-native";
import { ApiError, type MenuItem } from "@odyssey/api-client";

const input = {
  borderWidth: 1,
  borderColor: "#d4d4d8",
  borderRadius: 6,
  paddingHorizontal: 10,
  paddingVertical: 7,
} as const;

export type ItemDraft = {
  name: string;
  description: string;
  priceCents: number;
  isAvailable: boolean;
};

/**
 * Create and edit share this form: the only difference is what it opens with
 * and which mutation the caller runs.
 *
 * Prices are typed in currency and held in cents. The input keeps its own text
 * so a half-typed "12." survives a re-render — parsing on every keystroke would
 * snap the caret and make the field unusable.
 */
export function MenuItemForm({
  initial,
  submitLabel,
  error,
  isSaving,
  onSubmit,
  onCancel,
}: {
  initial?: MenuItem;
  submitLabel: string;
  error?: unknown;
  isSaving: boolean;
  onSubmit: (draft: ItemDraft) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [price, setPrice] = useState(
    initial ? (initial.priceCents / 100).toFixed(2) : "",
  );
  const [isAvailable, setIsAvailable] = useState(initial?.isAvailable ?? true);

  // Server field errors land under the input they belong to.
  const fields = error instanceof ApiError ? (error.fields ?? {}) : {};
  const message = error instanceof ApiError && !error.fields ? error.message : undefined;

  const priceCents = Math.round(Number(price.replace(/[^0-9.]/g, "")) * 100);
  const priceIsValid = price.trim() !== "" && Number.isFinite(priceCents) && priceCents >= 0;
  const canSubmit = name.trim() !== "" && priceIsValid && !isSaving;

  return (
    <View
      style={{
        gap: 8,
        padding: 12,
        borderWidth: 1,
        borderColor: "#d4d4d8",
        borderRadius: 8,
        backgroundColor: "#fafafa",
      }}
    >
      <Field label="Name" error={fields.name}>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="Marinated olives"
          style={input}
        />
      </Field>

      <Field label="Description" error={fields.description} hint="Optional">
        <TextInput
          value={description}
          onChangeText={setDescription}
          placeholder="Castelvetrano, orange zest, thyme"
          style={input}
        />
      </Field>

      <Field label="Price" error={fields.priceCents}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <Text style={{ color: "#52525b" }}>$</Text>
          <TextInput
            value={price}
            onChangeText={setPrice}
            placeholder="6.50"
            inputMode="decimal"
            style={{ ...input, width: 110, fontFamily: "monospace" }}
          />
        </View>
      </Field>

      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        <Switch value={isAvailable} onValueChange={setIsAvailable} />
        <Text>{isAvailable ? "Available to order" : "Unavailable right now"}</Text>
      </View>

      {message ? <Text style={{ color: "#b91c1c" }}>{message}</Text> : null}

      <View style={{ flexDirection: "row", gap: 8, paddingTop: 4 }}>
        <Pressable
          disabled={!canSubmit}
          onPress={() =>
            onSubmit({
              name: name.trim(),
              description: description.trim(),
              priceCents,
              isAvailable,
            })
          }
          style={{
            paddingHorizontal: 14,
            paddingVertical: 8,
            borderRadius: 6,
            borderWidth: 1,
            borderColor: "#2563eb",
            opacity: canSubmit ? 1 : 0.4,
          }}
        >
          <Text style={{ color: "#2563eb" }}>{isSaving ? "Saving…" : submitLabel}</Text>
        </Pressable>
        <Pressable onPress={onCancel} style={{ paddingHorizontal: 14, paddingVertical: 8 }}>
          <Text style={{ color: "#52525b" }}>Cancel</Text>
        </Pressable>
      </View>
    </View>
  );
}

function Field({
  label,
  error,
  hint,
  children,
}: {
  label: string;
  error?: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <View style={{ gap: 3 }}>
      <Text style={{ fontSize: 13, color: "#3f3f46" }}>
        {label}
        {hint ? <Text style={{ color: "#a1a1aa" }}> · {hint}</Text> : null}
      </Text>
      {children}
      {error ? <Text style={{ color: "#b91c1c", fontSize: 12 }}>{error}</Text> : null}
    </View>
  );
}
