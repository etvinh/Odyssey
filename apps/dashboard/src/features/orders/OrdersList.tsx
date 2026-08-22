import { useMemo, useState } from "react";
import { View } from "react-native";
import { usePathname, useRouter } from "expo-router";
import { errorMessage, type OrderRow } from "@odyssey/api-client";
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
import { filterOrders, tallyStatuses } from "./filter";
import { channelLabel, statusLabel, statusTone } from "./format";
import { OrderCreateDialog } from "./OrderCreateDialog";
import { useAllOrders } from "./useAllOrders";

export function OrdersList() {
  const router = useRouter();
  // The open order, read off the URL: the drawer is a route, so the path is
  // where that lives. Marking the row keeps the drawer anchored to its source.
  const openOrderId = usePathname().split("/orders/")[1];
  const [status, setStatus] = useState<OrderStatus | "all">("all");
  const [search, setSearch] = useState("");
  const [creating, setCreating] = useState(false);

  // Every order, fetched once. Typing in the search box or moving between
  // status chips is now a re-render, not a request.
  const query = useAllOrders();
  const orders = query.data;

  /**
   * The search applied but not the status filter. The chips are counted off
   * this, so they narrow with the search yet stay whole while a status is
   * selected — pick "Ready", and "Pending 4" is still there to go back to.
   */
  const searched = useMemo(
    () => (orders ? filterOrders(orders, { status: "all", search }) : undefined),
    [orders, search],
  );

  const visible = useMemo(
    () => (searched ? filterOrders(searched, { status, search: "" }) : undefined),
    [searched, status],
  );

  const counts = useMemo(() => (searched ? tallyStatuses(searched) : undefined), [searched]);

  return (
    <View>
      <PageHeader
        title="Orders"
        subtitle={visible && orders ? `${visible.length} of ${orders.length} shown` : undefined}
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
              { value: "all" as const, label: "All", count: searched?.length },
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
        ) : visible ? (
          <DataTable<OrderRow>
            caption="Orders"
            rows={visible}
            keyExtractor={(order) => order.id}
            selectedKey={openOrderId}
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
