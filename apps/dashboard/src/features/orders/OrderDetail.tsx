import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { View } from "react-native";
import { useRouter } from "expo-router";
import {
  errorMessage,
  getGetOrderQueryKey,
  getListOrdersQueryKey,
  useApplyOrderAction,
  useGetOrder,
} from "@odyssey/api-client";
import type { OrderAction } from "@odyssey/types";
import { formatMoney, formatTime } from "@odyssey/shared";
import {
  Button,
  ConfirmDialog,
  DetailDrawer,
  ErrorState,
  InlineAlert,
  Section,
  Skeleton,
  StatusBadge,
  Text,
  color,
  space,
  useToast,
  borderWidth,
} from "@odyssey/ui";
import { actionLabel, channelLabel, statusLabel, statusTone } from "./format";

export function OrderDetail({ id }: { id: string }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const toast = useToast();
  const [confirmingCancel, setConfirmingCancel] = useState(false);

  const query = useGetOrder(id);
  const order = query.data?.status === 200 ? query.data.data : undefined;

  const applyAction = useApplyOrderAction({
    mutation: {
      onSuccess: async (result) => {
        // Both the row and the drawer carry status and allowedActions, so both
        // are stale the moment an action lands.
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: getListOrdersQueryKey() }),
          queryClient.invalidateQueries({ queryKey: getGetOrderQueryKey(id) }),
        ]);
        if (result.status === 200) {
          toast(`Order #${result.data.orderNumber} is now ${statusLabel(result.data.status).toLowerCase()}`);
        }
      },
      onError: (error) => toast(errorMessage(error), "error"),
    },
  });

  /**
   * Prefer popping history so the drawer behaves like the panel it looks like:
   * back and forward stay meaningful. A deep link straight to an order has
   * nothing to pop, so that case navigates to the list instead.
   */
  const close = () => (router.canGoBack() ? router.back() : router.replace("/orders"));

  const run = (action: OrderAction) => {
    if (action === "cancel") return setConfirmingCancel(true);
    applyAction.mutate({ id, data: { action } });
  };

  return (
    <>
      <DetailDrawer
        open
        onClose={close}
        title={order ? `Order #${order.orderNumber}` : "Order"}
        footer={
          order && order.allowedActions.length > 0 ? (
            <View style={{ flexDirection: "row", gap: space[2], flexWrap: "wrap" }}>
              {order.allowedActions.map((action, index) => (
                <Button
                  key={action}
                  label={actionLabel(action)}
                  // The server puts the advancing action first, so the primary
                  // button is whatever it says comes next.
                  variant={index === 0 ? "primary" : action === "cancel" ? "danger" : "secondary"}
                  onPress={() => run(action)}
                  loading={applyAction.isPending && applyAction.variables?.data.action === action}
                  disabled={applyAction.isPending}
                />
              ))}
            </View>
          ) : null
        }
      >
        {query.isPending ? (
          <View style={{ gap: space[3] }}>
            <Skeleton width={180} height={22} />
            <Skeleton width="60%" />
            <Skeleton width="80%" />
          </View>
        ) : query.isError ? (
          <ErrorState cause={errorMessage(query.error)} onRetry={() => void query.refetch()} />
        ) : order ? (
          <>
            <View style={{ flexDirection: "row", alignItems: "center", gap: space[2], flexWrap: "wrap" }}>
              <StatusBadge label={statusLabel(order.status)} tone={statusTone(order.status)} />
              <Text variant="body" tone="muted">
                {channelLabel(order.channel)}
              </Text>
            </View>

            {order.allowedActions.length === 0 ? (
              <InlineAlert
                tone="info"
                message={`This order is ${statusLabel(order.status).toLowerCase()}. There is nothing left to do.`}
              />
            ) : null}

            <Section title="Customer">
              {order.customer ? (
                <View style={{ gap: space[0.5] }}>
                  <Text variant="body">{order.customer.name}</Text>
                  {order.customer.phone ? (
                    <Text variant="body" tone="muted">
                      {order.customer.phone}
                    </Text>
                  ) : null}
                </View>
              ) : (
                <Text variant="body" tone="subtle">
                  Walk-in
                </Text>
              )}
            </Section>

            <Section title="Items">
              <View style={{ gap: space[2] }}>
                {order.items.map((item) => (
                  <View key={item.id} style={{ flexDirection: "row", alignItems: "baseline", gap: space[3] }}>
                    <Text variant="data" tone="muted" style={{ width: 32 }}>
                      {item.quantity}×
                    </Text>
                    <View style={{ flex: 1 }}>
                      <Text variant="body">{item.name}</Text>
                      <Text variant="caption" tone="subtle">
                        {formatMoney(item.unitPriceCents)} each
                      </Text>
                    </View>
                    <Text variant="data">{formatMoney(item.lineTotalCents)}</Text>
                  </View>
                ))}

                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    paddingTop: space[2],
                    borderTopWidth: borderWidth.hairline,
                    borderTopColor: color.border,
                  }}
                >
                  <Text variant="bodyStrong">Total</Text>
                  <Text variant="data" style={{ fontSize: 15 }}>
                    {formatMoney(order.totalCents)}
                  </Text>
                </View>
              </View>
            </Section>

            {order.kitchenNote ? (
              <Section title="Kitchen note">
                <Text variant="body">{order.kitchenNote}</Text>
              </Section>
            ) : null}

            <Section title="Timeline">
              <View style={{ gap: space[2] }}>
                {order.timeline.map((entry, index) => (
                  <View key={`${entry.status}-${index}`} style={{ flexDirection: "row", alignItems: "center", gap: space[3] }}>
                    <View
                      style={{
                        width: 7,
                        height: 7,
                        borderRadius: 999,
                        backgroundColor: index === order.timeline.length - 1 ? color.accent : color.borderStrong,
                      }}
                    />
                    <Text variant="body" style={{ flex: 1 }}>
                      {statusLabel(entry.status)}
                    </Text>
                    <Text variant="caption" tone="subtle">
                      {formatTime(entry.changedAt)}
                    </Text>
                  </View>
                ))}
              </View>
            </Section>
          </>
        ) : null}
      </DetailDrawer>

      <ConfirmDialog
        open={confirmingCancel}
        onClose={() => setConfirmingCancel(false)}
        onConfirm={() => {
          setConfirmingCancel(false);
          applyAction.mutate({ id, data: { action: "cancel" } });
        }}
        title={order ? `Cancel order #${order.orderNumber}?` : "Cancel this order?"}
        consequence="Cancelled is final — the order cannot be reopened afterwards."
        confirmLabel="Cancel order"
        isWorking={applyAction.isPending}
      />
    </>
  );
}
