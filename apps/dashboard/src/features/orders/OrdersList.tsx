import { useState } from "react";
import { View } from "react-native";
import { useRouter } from "expo-router";
import { errorMessage, useListOrders, type OrderRow } from "@odyssey/api-client";
import { ORDER_STATUSES, type OrderStatus } from "@odyssey/types";
import {
  Button,
  DataTable,
  EmptyState,
  ErrorState,
  PageHeader,
  SearchField,
  SegmentedControl,
  SkeletonRows,
  StatusBadge,
  Surface,
  Text,
  space,
} from "@odyssey/ui";
import { formatMoney, formatTime } from "../../format";
import { channelLabel, statusLabel, statusTone } from "./format";
import { OrderCreateDialog } from "./OrderCreateDialog";

export function OrdersList() {
  const router = useRouter();
  const [status, setStatus] = useState<OrderStatus | "all">("all");
  const [search, setSearch] = useState("");
  const [creating, setCreating] = useState(false);

  // Not destructured: TanStack Query v5 narrows `data` through the result
  // object's discriminated union, and destructuring throws that away.
  const query = useListOrders({
    ...(status === "all" ? {} : { status }),
    ...(search.trim() ? { search: search.trim() } : {}),
    pageSize: 25,
  });

  const page = query.data?.status === 200 ? query.data.data : undefined;
  const counts = page?.meta.statusCounts;

  return (
    <View>
      <PageHeader
        title="Orders"
        subtitle={page ? `${page.data.length} of ${page.meta.total} shown` : undefined}
        actions={
          <Button label="New order" icon="plus" variant="primary" onPress={() => setCreating(true)} />
        }
      />

      <OrderCreateDialog open={creating} onClose={() => setCreating(false)} />

      <View style={{ gap: space[4] }}>
        <View style={{ flexDirection: "row", gap: space[3], flexWrap: "wrap", alignItems: "center" }}>
          <SegmentedControl
            label="Filter by status"
            value={status}
            onChange={setStatus}
            segments={[
              { value: "all" as const, label: "All", count: counts ? totalOf(counts) : undefined },
              ...ORDER_STATUSES.map((option) => ({
                value: option,
                label: statusLabel(option),
                count: counts?.[option],
              })),
            ]}
          />
          <View style={{ flex: 1 }} />
          <SearchField
            value={search}
            onChangeText={setSearch}
            placeholder="Order number or customer"
            width={280}
          />
        </View>

        {query.isPending ? (
          <Surface>
            <SkeletonRows rows={8} />
          </Surface>
        ) : query.isError ? (
          <Surface padded={false}>
            <ErrorState cause={errorMessage(query.error)} onRetry={() => void query.refetch()} />
          </Surface>
        ) : page ? (
          <DataTable<OrderRow>
            caption="Orders"
            rows={page.data}
            keyExtractor={(order) => order.id}
            onRowPress={(order) => router.push(`/orders/${order.id}` as "/orders")}
            emptyState={
              <Surface padded={false}>
                <EmptyState
                  title="No orders match these filters"
                  body="Clear the search or choose a different status."
                  action={
                    status !== "all" || search
                      ? {
                          label: "Clear filters",
                          onPress: () => {
                            setStatus("all");
                            setSearch("");
                          },
                        }
                      : undefined
                  }
                />
              </Surface>
            }
            columns={[
              {
                key: "orderNumber",
                header: "Order",
                width: 84,
                render: (order) => <Text variant="data">#{order.orderNumber}</Text>,
              },
              {
                key: "customer",
                header: "Customer",
                flex: 2,
                render: (order) =>
                  order.customer ? (
                    <Text variant="body">{order.customer.name}</Text>
                  ) : (
                    // An ordinary case, not missing data.
                    <Text variant="body" tone="subtle">
                      Walk-in
                    </Text>
                  ),
              },
              {
                key: "channel",
                header: "Channel",
                width: 110,
                render: (order) => (
                  <Text variant="body" tone="muted">
                    {channelLabel(order.channel)}
                  </Text>
                ),
              },
              {
                key: "status",
                header: "Status",
                width: 132,
                render: (order) => (
                  <StatusBadge label={statusLabel(order.status)} tone={statusTone(order.status)} />
                ),
              },
              {
                key: "items",
                header: "Items",
                width: 64,
                align: "right",
                render: (order) => <Text variant="data" tone="muted">{order.itemCount}</Text>,
              },
              {
                key: "total",
                header: "Total",
                width: 96,
                align: "right",
                render: (order) => <Text variant="data">{formatMoney(order.totalCents)}</Text>,
              },
              {
                key: "placedAt",
                header: "Placed",
                width: 140,
                align: "right",
                render: (order) => (
                  <Text variant="caption" tone="muted">
                    {formatTime(order.placedAt)}
                  </Text>
                ),
              },
            ]}
          />
        ) : null}
      </View>
    </View>
  );
}

/** Every status counted. The server zero-fills, so summing is total. */
function totalOf(counts: Record<OrderStatus, number>): number {
  return ORDER_STATUSES.reduce((sum, status) => sum + counts[status], 0);
}
