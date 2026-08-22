import { useState } from "react";
import { View } from "react-native";
import { useQueryClient } from "@tanstack/react-query";
import {
  ApiError,
  getListCustomersQueryKey,
  getListOrdersQueryKey,
  useCreateOrder,
  useListCustomers,
  useListMenuItems,
  type MenuItem,
} from "@odyssey/api-client";
import { ORDER_CHANNELS, type OrderChannel } from "@odyssey/types";
import { formatMoney } from "@odyssey/shared";
import {
  Button,
  Dialog,
  EmptyState,
  FormRow,
  IconButton,
  InlineAlert,
  SearchField,
  SegmentedControl,
  Select,
  Stepper,
  Text,
  TextInput,
  color,
  space,
  useToast,
  borderWidth,
} from "@odyssey/ui";
import { channelLabel } from "./format";

type Line = { item: MenuItem; quantity: number };
/** Either an existing customer, someone new, or nobody. */
type CustomerMode = { kind: "walk-in" } | { kind: "existing"; id: string } | { kind: "new" };

export function OrderCreateDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const queryClient = useQueryClient();
  const toast = useToast();

  // The picker asks for available items only. The filter is UX; createOrder
  // re-checks at write time and the 409 is the actual guarantee.
  const itemsQuery = useListMenuItems({ available: "true" });
  const customersQuery = useListCustomers({ pageSize: 100 });

  const [customer, setCustomer] = useState<CustomerMode>({ kind: "walk-in" });
  const [newName, setNewName] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [channel, setChannel] = useState<OrderChannel>("dine_in");
  const [note, setNote] = useState("");
  const [lines, setLines] = useState<Line[]>([]);
  const [pick, setPick] = useState("");

  const createOrder = useCreateOrder({
    mutation: {
      onSuccess: async (result) => {
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: getListOrdersQueryKey() }),
          // A new customer may have been created inside the same transaction.
          queryClient.invalidateQueries({ queryKey: getListCustomersQueryKey() }),
        ]);
        if (result.status === 201) toast(`Order #${result.data.orderNumber} created`);
        reset();
        onClose();
      },
    },
  });

  const reset = () => {
    setCustomer({ kind: "walk-in" });
    setNewName("");
    setNewPhone("");
    setChannel("dine_in");
    setNote("");
    setLines([]);
    setPick("");
  };

  const items = itemsQuery.data?.status === 200 ? itemsQuery.data.data.data : [];
  const people = customersQuery.data?.status === 200 ? customersQuery.data.data.data : [];

  // Filtering a menu-sized list on each keystroke costs nothing; a memo here
  // would only add a dependency to get wrong.
  const needle = pick.trim().toLowerCase();
  const matches = needle ? items.filter((item) => item.name.toLowerCase().includes(needle)) : [];

  /** A preview only — the authoritative total comes back in the response. */
  const previewTotal = lines.reduce((sum, line) => sum + line.item.priceCents * line.quantity, 0);

  const add = (item: MenuItem) => {
    setLines((current) => {
      const existing = current.find((line) => line.item.id === item.id);
      return existing
        ? current.map((line) =>
            line.item.id === item.id ? { ...line, quantity: line.quantity + 1 } : line,
          )
        : [...current, { item, quantity: 1 }];
    });
    setPick("");
  };

  const fields = createOrder.error instanceof ApiError ? (createOrder.error.fields ?? {}) : {};
  const formError =
    createOrder.error instanceof ApiError && !createOrder.error.fields
      ? createOrder.error.message
      : undefined;

  const needsName = customer.kind === "new" && newName.trim() === "";
  const canSubmit = lines.length > 0 && !needsName && !createOrder.isPending;

  const submit = () => {
    createOrder.mutate({
      data: {
        ...(customer.kind === "existing"
          ? { customer: { id: customer.id } }
          : customer.kind === "new"
            ? {
                customer: {
                  name: newName.trim(),
                  ...(newPhone.trim() ? { phone: newPhone.trim() } : {}),
                },
              }
            : {}),
        channel,
        ...(note.trim() ? { kitchenNote: note.trim() } : {}),
        // No prices in the payload, ever. The server snapshots them.
        items: lines.map((line) => ({ menuItemId: line.item.id, quantity: line.quantity })),
      },
    });
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="New order"
      width={640}
      footer={
        <>
          <View style={{ flex: 1, justifyContent: "center" }}>
            <Text variant="body" tone="muted">
              {lines.length === 0
                ? "Add at least one item"
                : `${lines.length} ${lines.length === 1 ? "line" : "lines"} · ${formatMoney(previewTotal)}`}
            </Text>
          </View>
          <Button label="Cancel" variant="ghost" onPress={onClose} />
          <Button
            label="Place order"
            variant="primary"
            onPress={submit}
            disabled={!canSubmit}
            loading={createOrder.isPending}
          />
        </>
      }
    >
      {formError ? <InlineAlert tone="danger" message={formError} /> : null}

      <FormRow label="Customer" hint="Leave as walk-in if nobody is attached">
        <Select<string>
          label="Customer"
          placeholder="Walk-in"
          value={customer.kind === "existing" ? customer.id : customer.kind === "new" ? "__new" : null}
          options={[
            { value: "__walkin", label: "Walk-in", detail: "No customer attached" },
            ...(customer.kind === "new"
              ? [{ value: "__new", label: newName.trim() || "New customer", detail: "Created with this order" }]
              : []),
            ...people.map((person) => ({
              value: person.id,
              label: person.name,
              detail: person.phone ?? person.email ?? `${person.orderCount} orders`,
            })),
          ]}
          onChange={(next) =>
            setCustomer(
              next === "__walkin"
                ? { kind: "walk-in" }
                : next === "__new"
                  ? { kind: "new" }
                  : { kind: "existing", id: next },
            )
          }
          footer={
            <Button
              label="+ New customer"
              variant="ghost"
              size="sm"
              onPress={() => setCustomer({ kind: "new" })}
            />
          }
        />
      </FormRow>

      {customer.kind === "new" ? (
        <View style={{ gap: space[3], paddingLeft: space[3], borderLeftWidth: borderWidth.hairline, borderLeftColor: color.border }}>
          <FormRow label="Name" required error={fields["customer.name"]}>
            <TextInput
              value={newName}
              onChangeText={setNewName}
              placeholder="Amara Okafor"
              invalid={Boolean(fields["customer.name"])}
            />
          </FormRow>
          <FormRow label="Phone" hint="Optional">
            <TextInput value={newPhone} onChangeText={setNewPhone} placeholder="+44 7700 900123" />
          </FormRow>
        </View>
      ) : null}

      <FormRow label="Channel">
        <SegmentedControl
          label="Channel"
          value={channel}
          onChange={setChannel}
          segments={ORDER_CHANNELS.map((option) => ({
            value: option,
            label: channelLabel(option),
          }))}
        />
      </FormRow>

      <FormRow label="Items" required error={fields.items}>
        <View style={{ gap: space[2] }}>
          <SearchField
            value={pick}
            onChangeText={setPick}
            placeholder={itemsQuery.isPending ? "Loading the menu…" : "Search the menu to add an item"}
          />

          {needle && matches.length > 0 ? (
            <View
              style={{
                borderWidth: borderWidth.hairline,
                borderColor: color.border,
                borderRadius: 6,
                maxHeight: 190,
                overflow: "hidden",
              }}
            >
              {matches.slice(0, 6).map((item) => (
                <View
                  key={item.id}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: space[2],
                    paddingHorizontal: space[3],
                    paddingVertical: space[2],
                  }}
                >
                  <Text variant="body" style={{ flex: 1 }}>
                    {item.name}
                  </Text>
                  <Text variant="data" tone="muted">
                    {formatMoney(item.priceCents)}
                  </Text>
                  <Button label="Add" size="sm" variant="secondary" onPress={() => add(item)} />
                </View>
              ))}
            </View>
          ) : needle ? (
            <Text variant="caption" tone="subtle">
              Nothing on the menu matches that.
            </Text>
          ) : null}

          {lines.length === 0 ? (
            <EmptyState icon="inbox" title="No items yet" body="Search the menu above to build the order." />
          ) : (
            <View style={{ gap: space[1] }}>
              {lines.map((line) => (
                <View
                  key={line.item.id}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: space[3],
                    paddingVertical: space[1],
                  }}
                >
                  <Text variant="body" style={{ flex: 1 }}>
                    {line.item.name}
                  </Text>
                  <Stepper
                    label={line.item.name}
                    value={line.quantity}
                    min={1}
                    max={20}
                    onChange={(quantity) =>
                      setLines((current) =>
                        current.map((row) =>
                          row.item.id === line.item.id ? { ...row, quantity } : row,
                        ),
                      )
                    }
                  />
                  <Text variant="data" style={{ width: 80, textAlign: "right" }}>
                    {formatMoney(line.item.priceCents * line.quantity)}
                  </Text>
                  <IconButton
                    icon="close"
                    label={`Remove ${line.item.name}`}
                    onPress={() =>
                      setLines((current) => current.filter((row) => row.item.id !== line.item.id))
                    }
                  />
                </View>
              ))}
            </View>
          )}
        </View>
      </FormRow>

      <FormRow label="Kitchen note" hint="Allergies, substitutions, timing">
        <TextInput value={note} onChangeText={setNote} multiline placeholder="Nut allergy on table" />
      </FormRow>
    </Dialog>
  );
}
