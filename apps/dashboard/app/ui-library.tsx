import { useState } from "react";
import { View } from "react-native";
import {
  Button,
  ConfirmDialog,
  DataTable,
  DetailDrawer,
  Dialog,
  EmptyState,
  ErrorState,
  FormRow,
  Icon,
  IconButton,
  InlineAlert,
  PageHeader,
  SearchField,
  Section,
  SegmentedControl,
  Skeleton,
  SkeletonRows,
  StatusBadge,
  Stepper,
  Surface,
  Switch,
  Text,
  TextInput,
  borderWidth,
  color,
  iconNames,
  radius,
  space,
  type as typeScale,
  useToast,
} from "@odyssey/ui";

/**
 * Living documentation. Every token and every component state below is rendered
 * from the real thing, so this page cannot drift from the system the way a
 * written inventory does. CLAUDE.md calls this route the source of truth for
 * the component inventory; this is that route.
 */
export default function UiLibrary() {
  const toast = useToast();
  const [tab, setTab] = useState<"all" | "pending" | "ready">("all");
  const [text, setText] = useState("");
  const [search, setSearch] = useState("");
  const [price, setPrice] = useState("6.50");
  const [available, setAvailable] = useState(true);
  const [quantity, setQuantity] = useState(2);
  const [dialog, setDialog] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [drawer, setDrawer] = useState(false);

  return (
    <View style={{ gap: space[12] }}>
      <PageHeader
        title="UI library"
        subtitle="Every token and component state, rendered from the real components."
      />

      <Section title="Color">
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: space[3] }}>
          {(
            [
              ["surface", color.surface],
              ["surfaceSunken", color.surfaceSunken],
              ["surfaceSelected", color.surfaceSelected],
              ["foreground", color.foreground],
              ["foregroundMuted", color.foregroundMuted],
              ["foregroundSubtle", color.foregroundSubtle],
              ["border", color.border],
              ["borderStrong", color.borderStrong],
              ["accent", color.accent],
              ["danger", color.danger],
              ["successForeground", color.successForeground],
              ["warningForeground", color.warningForeground],
            ] as const
          ).map(([name, value]) => (
            <View key={name} style={{ gap: space[1], width: 132 }}>
              <View
                style={{
                  height: 44,
                  borderRadius: radius.md,
                  backgroundColor: value,
                  borderWidth: borderWidth.hairline,
                  borderColor: color.border,
                }}
              />
              <Text variant="caption">{name}</Text>
              <Text variant="caption" tone="subtle">
                {value}
              </Text>
            </View>
          ))}
        </View>
      </Section>

      <Section title="Type scale">
        <Surface>
          <View style={{ gap: space[4] }}>
            {(Object.keys(typeScale) as (keyof typeof typeScale)[]).map((name) => (
              <View key={name} style={{ flexDirection: "row", alignItems: "baseline", gap: space[6] }}>
                <Text variant="caption" tone="subtle" style={{ width: 96 }}>
                  {name}
                </Text>
                <Text variant={name}>Order #1042 · $162.00</Text>
              </View>
            ))}
          </View>
        </Surface>
      </Section>

      <Section title="Spacing">
        <View style={{ gap: space[2] }}>
          {([0.5, 1, 2, 3, 4, 6, 8, 12, 16] as const).map((step) => (
            <View key={step} style={{ flexDirection: "row", alignItems: "center", gap: space[3] }}>
              <Text variant="caption" tone="subtle" style={{ width: 40 }}>
                {step}
              </Text>
              <View style={{ height: 10, width: space[step], backgroundColor: color.accent, borderRadius: 2 }} />
              <Text variant="caption" tone="subtle">
                {space[step]}px
              </Text>
            </View>
          ))}
        </View>
      </Section>

      <Section title="Icons">
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: space[4] }}>
          {iconNames.map((name) => (
            <View key={name} style={{ alignItems: "center", gap: space[1], width: 88 }}>
              <Icon name={name} size={20} color={color.foreground} />
              <Text variant="caption" tone="subtle">
                {name}
              </Text>
            </View>
          ))}
        </View>
      </Section>

      <Section title="Button">
        <View style={{ gap: space[4] }}>
          <Row label="variants">
            <Button label="Primary" variant="primary" onPress={() => toast("Primary pressed")} />
            <Button label="Secondary" variant="secondary" />
            <Button label="Ghost" variant="ghost" />
            <Button label="Danger" variant="danger" />
          </Row>
          <Row label="sizes">
            <Button label="Small" size="sm" />
            <Button label="Medium" size="md" />
          </Row>
          <Row label="states">
            <Button label="With icon" icon="plus" />
            <Button label="Loading" loading />
            <Button label="Disabled" disabled />
          </Row>
          <Row label="icon only">
            <IconButton icon="pencil" label="Edit" />
            <IconButton icon="trash" label="Remove" tone="danger" />
            <IconButton icon="close" label="Close" />
          </Row>
        </View>
      </Section>

      <Section title="StatusBadge">
        <Row label="tones">
          <StatusBadge label="Pending" tone="warning" />
          <StatusBadge label="Confirmed" tone="info" />
          <StatusBadge label="Preparing" tone="accent" />
          <StatusBadge label="Ready" tone="success" />
          <StatusBadge label="Completed" tone="neutral" />
          <StatusBadge label="Cancelled" tone="danger" />
        </Row>
      </Section>

      <Section title="SegmentedControl">
        <SegmentedControl
          label="Order status"
          value={tab}
          onChange={setTab}
          segments={[
            { value: "all", label: "All", count: 150 },
            { value: "pending", label: "Pending", count: 13 },
            { value: "ready", label: "Ready", count: 8 },
          ]}
        />
      </Section>

      <Section title="Inputs">
        <Surface>
          <View style={{ gap: space[4], maxWidth: 420 }}>
            <FormRow label="Name" required>
              <TextInput value={text} onChangeText={setText} placeholder="Marinated olives" />
            </FormRow>
            <FormRow label="Price" hint="Shown to customers as $6.50">
              <TextInput value={price} onChangeText={setPrice} prefix="$" mono width={140} />
            </FormRow>
            <FormRow label="Name" error="Enter a name for this item.">
              <TextInput value="" onChangeText={() => {}} invalid placeholder="Required" />
            </FormRow>
            <FormRow label="Description">
              <TextInput value="" onChangeText={() => {}} multiline placeholder="Optional" />
            </FormRow>
            <FormRow label="Disabled">
              <TextInput value="Not editable" onChangeText={() => {}} disabled />
            </FormRow>
            <FormRow label="Search">
              <SearchField value={search} onChangeText={setSearch} placeholder="Search items" />
            </FormRow>
            <Row label="switch">
              <Switch value={available} onValueChange={setAvailable} label="Available" />
              <Text variant="body" tone="muted">
                {available ? "Available" : "Unavailable"}
              </Text>
            </Row>
            <Row label="stepper">
              <Stepper value={quantity} onChange={setQuantity} label="Quantity" min={1} max={9} />
            </Row>
          </View>
        </Surface>
      </Section>

      <Section title="DataTable">
        <DataTable
          caption="Example orders"
          columns={[
            { key: "n", header: "Order", width: 88, render: (r) => <Text variant="data">#{r.n}</Text> },
            { key: "who", header: "Customer", flex: 2, render: (r) => <Text variant="body">{r.who}</Text> },
            { key: "status", header: "Status", width: 130, render: (r) => <StatusBadge label={r.status} tone={r.tone} /> },
            {
              key: "total",
              header: "Total",
              width: 96,
              align: "right",
              render: (r) => <Text variant="data">{r.total}</Text>,
            },
          ]}
          rows={[
            { id: "1", n: "1142", who: "Dmitri Volkov", status: "Ready", tone: "success" as const, total: "$62.50" },
            { id: "2", n: "1035", who: "Carla Núñez", status: "Completed", tone: "neutral" as const, total: "$162.00" },
            { id: "3", n: "1118", who: "Walk-in", status: "Pending", tone: "warning" as const, total: "$24.75" },
          ]}
          keyExtractor={(row) => row.id}
          onRowPress={() => toast("Row pressed")}
        />
      </Section>

      <Section title="Feedback">
        <View style={{ gap: space[3] }}>
          <InlineAlert tone="info" message="Auto-accept is on. New orders arrive confirmed." />
          <InlineAlert tone="success" message="Order #1043 created." />
          <InlineAlert tone="warning" message="This order is completed. There is nothing left to do." />
          <InlineAlert
            tone="danger"
            message="Small plates still holds items. Move or remove them first."
            onDismiss={() => {}}
          />
          <Row label="toast">
            <Button label="Success toast" onPress={() => toast("Order #1043 created")} />
            <Button label="Error toast" variant="danger" onPress={() => toast("That didn’t save", "error")} />
          </Row>
        </View>
      </Section>

      <Section title="Overlays">
        <Row label="open">
          <Button label="Dialog" onPress={() => setDialog(true)} />
          <Button label="Confirm" variant="danger" onPress={() => setConfirm(true)} />
          <Button label="Drawer" onPress={() => setDrawer(true)} />
        </Row>

        <Dialog
          open={dialog}
          onClose={() => setDialog(false)}
          title="New menu item"
          footer={
            <>
              <Button label="Cancel" variant="ghost" onPress={() => setDialog(false)} />
              <Button label="Add item" variant="primary" onPress={() => setDialog(false)} />
            </>
          }
        >
          <FormRow label="Name" required>
            <TextInput value={text} onChangeText={setText} placeholder="Marinated olives" />
          </FormRow>
        </Dialog>

        <ConfirmDialog
          open={confirm}
          onClose={() => setConfirm(false)}
          onConfirm={() => setConfirm(false)}
          title="Remove Marinated olives?"
          consequence="It disappears from the menu straight away. Past orders keep it."
          confirmLabel="Remove from menu"
        />

        <DetailDrawer open={drawer} onClose={() => setDrawer(false)} title="Order #1142">
          <Text variant="body" tone="muted">
            A right-hand panel, route-driven so it is linkable and the back button closes it.
          </Text>
        </DetailDrawer>
      </Section>

      <Section title="States">
        <View style={{ gap: space[6] }}>
          <Surface padded={false}>
            <EmptyState
              title="No orders match these filters"
              body="Clear the search or pick a different status."
              action={{ label: "Clear filters", onPress: () => {} }}
            />
          </Surface>
          <Surface padded={false}>
            <ErrorState cause="Could not reach the server." onRetry={() => {}} />
          </Surface>
          <Surface>
            <View style={{ gap: space[3] }}>
              <Skeleton width={140} height={20} />
              <SkeletonRows rows={3} />
            </View>
          </Surface>
        </View>
      </Section>
    </View>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: space[3], flexWrap: "wrap" }}>
      <Text variant="caption" tone="subtle" style={{ width: 72 }}>
        {label}
      </Text>
      {children}
    </View>
  );
}
