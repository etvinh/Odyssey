import { useMemo } from "react";
import { View } from "react-native";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import {
  errorMessage,
  getGetSummaryQueryKey,
  getListOrdersQueryKey,
  useApplyOrderAction,
  useGetSummary,
  type OrderRow,
  type PopularItem,
} from "@odyssey/api-client";
import { formatMoney, formatTime } from "@odyssey/shared";
import {
  Button,
  DataTable,
  EmptyState,
  ErrorState,
  Interactive,
  KpiStat,
  PageHeader,
  ProgressBar,
  Section,
  Skeleton,
  StatusBadge,
  Surface,
  Text,
  space,
  useToast,
} from "@odyssey/ui";
import { filterOrders, tallyStatuses } from "../orders/filter";
import { useAllOrders } from "../orders/useAllOrders";
import { actionLabel, statusLabel, statusTone } from "../orders/format";

/** How many orders the needs-attention table shows before it stops being a glance. */
const NEEDS_ATTENTION_LIMIT = 5;

export function HomeScreen() {
  const summaryQuery = useGetSummary();
  const ordersQuery = useAllOrders();

  const summary = summaryQuery.data?.status === 200 ? summaryQuery.data.data : undefined;
  const orders = ordersQuery.data;

  /**
   * Pending comes from the orders read, not from the summary.
   *
   * planning/API.md deliberately keeps a `pendingCount` off `GET /summary`:
   * one number, one source, one invalidation. The source moved from
   * `meta.statusCounts` to this client-side tally when filtering moved to the
   * dashboard, but the rule it protects is unchanged.
   */
  const pendingCount = useMemo(() => (orders ? tallyStatuses(orders).pending : undefined), [orders]);

  const needsAttention = useMemo(
    () =>
      orders
        ? filterOrders(orders, { status: "pending", search: "" }).slice(0, NEEDS_ATTENTION_LIMIT)
        : undefined,
    [orders],
  );

  const isPending = summaryQuery.isPending || ordersQuery.isPending;
  const isError = summaryQuery.isError || ordersQuery.isError;

  return (
    <View>
      <PageHeader title="Today" subtitle="The state of the day at a glance." />

      {isError ? (
        <Surface padded={false}>
          <ErrorState
            cause={errorMessage(summaryQuery.error ?? ordersQuery.error)}
            onRetry={() => {
              void summaryQuery.refetch();
              void ordersQuery.refetch();
            }}
          />
        </Surface>
      ) : (
        <View style={{ gap: space[4] }}>
          <KpiRow summary={summary} pendingCount={pendingCount} loading={isPending} />

          <Surface>
            <Section title="Needs attention">
              <NeedsAttention orders={needsAttention} loading={ordersQuery.isPending} />
            </Section>
          </Surface>

          <Surface>
            <Section title="Popular this week">
              <PopularItems items={summary?.popularItems} loading={summaryQuery.isPending} />
            </Section>
          </Surface>
        </View>
      )}
    </View>
  );
}

/* -------------------------------------------------------------------------- */

function KpiRow({
  summary,
  pendingCount,
  loading,
}: {
  summary: { today: Day; yesterday: Day } | undefined;
  pendingCount: number | undefined;
  loading: boolean;
}) {
  if (loading || !summary) {
    return (
      <View style={{ flexDirection: "row", gap: space[4], flexWrap: "wrap" }}>
        {[0, 1, 2].map((key) => (
          <Surface key={key} style={{ flex: 1, minWidth: 200 }}>
            <View style={{ gap: space[2] }}>
              <Skeleton width={80} height={10} />
              <Skeleton width={120} height={28} />
              <Skeleton width={100} height={10} />
            </View>
          </Surface>
        ))}
      </View>
    );
  }

  const orders = compare(summary.today.orderCount, summary.yesterday.orderCount);
  const revenue = compare(summary.today.revenueCents, summary.yesterday.revenueCents);

  return (
    <View style={{ flexDirection: "row", gap: space[4], flexWrap: "wrap" }}>
      <KpiStat
        label="Orders today"
        value={String(summary.today.orderCount)}
        context={`vs ${summary.yesterday.orderCount} yesterday`}
        trend={orders.trend}
        tone={orders.tone}
      />
      <KpiStat
        label="Revenue today"
        value={formatMoney(summary.today.revenueCents)}
        context={`vs ${formatMoney(summary.yesterday.revenueCents)} yesterday`}
        trend={revenue.trend}
        tone={revenue.tone}
      />
      <KpiStat
        label="Pending"
        value={pendingCount === undefined ? "—" : String(pendingCount)}
        context={pendingCount === 0 ? "Nothing waiting on you" : "Waiting to be accepted"}
        // Not a movement: pending is a standing figure, so it gets no arrow and
        // no colour. More pending is not "up" in any sense worth painting.
        trend="flat"
      />
    </View>
  );
}

type Day = { orderCount: number; revenueCents: number };

/**
 * Today against yesterday. Revenue and order count both read as better when
 * they rise, which is why one helper serves both — a figure where up is bad
 * would need its own mapping rather than this one inverted at the call site.
 */
function compare(today: number, yesterday: number) {
  if (today === yesterday) return { trend: "flat" as const, tone: "neutral" as const };
  return today > yesterday
    ? { trend: "up" as const, tone: "positive" as const }
    : { trend: "down" as const, tone: "negative" as const };
}

/* -------------------------------------------------------------------------- */

function NeedsAttention({ orders, loading }: { orders: OrderRow[] | undefined; loading: boolean }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const toast = useToast();

  const applyAction = useApplyOrderAction({
    mutation: {
      onSuccess: async (result) => {
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: getListOrdersQueryKey() }),
          // Accepting an order does not change today's count, but completing
          // one from here would move revenue.
          queryClient.invalidateQueries({ queryKey: getGetSummaryQueryKey() }),
        ]);
        if (result.status === 200) {
          toast(`Order #${result.data.orderNumber} ${statusLabel(result.data.status).toLowerCase()}`);
        }
      },
      onError: (error) => toast(errorMessage(error), "error"),
    },
  });

  if (loading || !orders) {
    return (
      <View style={{ gap: space[2] }}>
        {[0, 1, 2].map((key) => (
          <Skeleton key={key} height={16} />
        ))}
      </View>
    );
  }

  if (orders.length === 0) {
    return (
      <EmptyState
        title="Nothing is waiting on you"
        body="Every order has been accepted. New ones will appear here."
      />
    );
  }

  return (
    <DataTable<OrderRow>
      caption="Orders needing attention"
      rows={orders}
      keyExtractor={(order) => order.id}
      /**
       * Deliberately no `onRowPress` here, unlike the Orders table.
       *
       * These rows carry an action button, and a pressable row renders as a
       * <button> — nesting one inside the other is invalid HTML and leaves the
       * inner control unreachable. The order number is the link instead, so the
       * two controls are siblings.
       */
      columns={[
        {
          key: "orderNumber",
          header: "Order",
          width: 84,
          render: (order) => (
            <Interactive
              onPress={() => router.push(`/orders/${order.id}` as "/orders")}
              accessibilityRole="link"
              accessibilityLabel={`Open order ${order.orderNumber}`}
              style={({ hovered }) => ({ alignSelf: "flex-start", opacity: hovered ? 0.7 : 1 })}
            >
              {() => (
                <Text variant="data" tone="accent">
                  #{order.orderNumber}
                </Text>
              )}
            </Interactive>
          ),
        },
        {
          key: "customer",
          header: "Customer",
          flex: 2,
          render: (order) =>
            order.customer ? (
              <Text variant="body">{order.customer.name}</Text>
            ) : (
              <Text variant="body" tone="subtle">
                Walk-in
              </Text>
            ),
        },
        {
          key: "status",
          header: "Status",
          width: 120,
          render: (order) => (
            <StatusBadge label={statusLabel(order.status)} tone={statusTone(order.status)} />
          ),
        },
        {
          key: "placedAt",
          header: "Placed",
          width: 140,
          render: (order) => (
            <Text variant="caption" tone="muted">
              {formatTime(order.placedAt)}
            </Text>
          ),
        },
        {
          key: "action",
          header: "",
          width: 130,
          align: "right",
          // Rendered from the row's own allowedActions, never re-derived here:
          // the server owns the transition table. See ADR-0003.
          render: (order) => {
            const next = order.allowedActions[0];
            if (!next) return null;
            return (
              <Button
                label={actionLabel(next)}
                variant="primary"
                onPress={() => applyAction.mutate({ id: order.id, data: { action: next } })}
                loading={applyAction.isPending && applyAction.variables?.id === order.id}
                disabled={applyAction.isPending}
              />
            );
          },
        },
      ]}
    />
  );
}

/* -------------------------------------------------------------------------- */

function PopularItems({ items, loading }: { items: PopularItem[] | undefined; loading: boolean }) {
  if (loading || !items) {
    return (
      <View style={{ gap: space[3] }}>
        {[0, 1, 2].map((key) => (
          <Skeleton key={key} height={16} />
        ))}
      </View>
    );
  }

  if (items.length === 0) {
    return (
      <EmptyState
        title="Nothing sold yet this week"
        body="Popular items appear once orders start coming in."
      />
    );
  }

  return (
    <View style={{ gap: space[3] }}>
      {items.map((item) => (
        <View key={item.menuItemId} style={{ gap: space[1] }}>
          <View style={{ flexDirection: "row", alignItems: "baseline", gap: space[3] }}>
            <Text variant="body" style={{ flex: 1 }}>
              {item.name}
            </Text>
            {/* The bar is always paired with its number — a proportion nobody
                can read the value of is decoration. */}
            <Text variant="data" tone="muted">
              {Math.round(item.shareOfOrders * 100)}%
            </Text>
            <Text variant="caption" tone="subtle" style={{ width: 72, textAlign: "right" }}>
              {item.orderCount} {item.orderCount === 1 ? "order" : "orders"}
            </Text>
          </View>
          <ProgressBar
            value={item.shareOfOrders}
            label={`${item.name}: ${Math.round(item.shareOfOrders * 100)} percent of orders this week`}
          />
        </View>
      ))}
    </View>
  );
}
