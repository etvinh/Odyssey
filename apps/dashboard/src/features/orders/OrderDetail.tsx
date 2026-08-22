import { useQueryClient } from "@tanstack/react-query";
import { Pressable, ScrollView, Text, View } from "react-native";
import { Link } from "expo-router";
import {
  errorMessage,
  getGetOrderQueryKey,
  getListOrdersQueryKey,
  useApplyOrderAction,
  useGetOrder,
} from "@odyssey/api-client";
import { actionLabel, channelLabel, formatMoney, formatTime, statusLabel } from "./format";

export function OrderDetail({ id }: { id: string }) {
  const queryClient = useQueryClient();
  const query = useGetOrder(id);

  const applyAction = useApplyOrderAction({
    mutation: {
      onSuccess: async () => {
        // Both the row and the drawer carry status and allowedActions, so both
        // are stale the moment an action lands.
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: getListOrdersQueryKey() }),
          queryClient.invalidateQueries({ queryKey: getGetOrderQueryKey(id) }),
        ]);
      },
    },
  });

  const order = query.data?.status === 200 ? query.data.data : undefined;

  return (
    <ScrollView contentContainerStyle={{ padding: 24, gap: 16 }}>
      <Link href="/orders" style={{ color: "#2563eb" }}>
        ← Orders
      </Link>

      {query.isPending ? <Text>Loading…</Text> : null}

      {query.isError ? (
        <View style={{ gap: 8 }}>
          <Text style={{ color: "#b91c1c" }}>{errorMessage(query.error)}</Text>
          <Pressable onPress={() => void query.refetch()}>
            <Text style={{ color: "#2563eb" }}>Retry</Text>
          </Pressable>
        </View>
      ) : null}

      {order ? (
        <>
          <View style={{ flexDirection: "row", alignItems: "baseline", gap: 12 }}>
            <Text style={{ fontSize: 22, fontWeight: "600", fontFamily: "monospace" }}>
              #{order.orderNumber}
            </Text>
            <Text style={{ fontSize: 16 }}>{statusLabel(order.status)}</Text>
            <Text style={{ color: "#52525b" }}>{channelLabel(order.channel)}</Text>
          </View>

          <Text>{order.customer ? order.customer.name : "Walk-in"}</Text>
          {order.customer?.phone ? (
            <Text style={{ color: "#52525b" }}>{order.customer.phone}</Text>
          ) : null}

          <View style={{ gap: 4 }}>
            <Text style={{ fontWeight: "600" }}>Items</Text>
            {order.items.map((item) => (
              <View key={item.id} style={{ flexDirection: "row", gap: 12 }}>
                <Text style={{ width: 40, fontFamily: "monospace" }}>{item.quantity}×</Text>
                <Text style={{ flex: 1 }}>{item.name}</Text>
                <Text style={{ fontFamily: "monospace", color: "#52525b" }}>
                  {formatMoney(item.unitPriceCents)}
                </Text>
                <Text style={{ fontFamily: "monospace", width: 90, textAlign: "right" }}>
                  {formatMoney(item.lineTotalCents)}
                </Text>
              </View>
            ))}
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                borderTopWidth: 1,
                borderTopColor: "#e4e4e7",
                paddingTop: 6,
              }}
            >
              <Text style={{ fontWeight: "600" }}>Total</Text>
              <Text style={{ fontWeight: "600", fontFamily: "monospace" }}>
                {formatMoney(order.totalCents)}
              </Text>
            </View>
          </View>

          {order.kitchenNote ? (
            <View style={{ gap: 4 }}>
              <Text style={{ fontWeight: "600" }}>Kitchen note</Text>
              <Text>{order.kitchenNote}</Text>
            </View>
          ) : null}

          <View style={{ gap: 4 }}>
            <Text style={{ fontWeight: "600" }}>Timeline</Text>
            {order.timeline.map((entry, index) => (
              <Text key={`${entry.status}-${index}`} style={{ color: "#52525b" }}>
                {statusLabel(entry.status)} · {formatTime(entry.changedAt)}
              </Text>
            ))}
          </View>

          {applyAction.isError ? (
            <Text style={{ color: "#b91c1c" }}>{errorMessage(applyAction.error)}</Text>
          ) : null}

          {/**
           * Buttons come only from the server's allowedActions. The dashboard
           * has no copy of the transition table and must never grow one —
           * see ADR-0003.
           */}
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {order.allowedActions.length === 0 ? (
              <Text style={{ color: "#52525b" }}>
                This order is {statusLabel(order.status).toLowerCase()}. There is nothing left to do.
              </Text>
            ) : null}
            {order.allowedActions.map((action) => (
              <Pressable
                key={action}
                disabled={applyAction.isPending}
                onPress={() =>
                  applyAction.mutate({ id, data: { action } })
                }
                style={{
                  paddingHorizontal: 14,
                  paddingVertical: 8,
                  borderRadius: 6,
                  borderWidth: 1,
                  borderColor: action === "cancel" ? "#b91c1c" : "#2563eb",
                  opacity: applyAction.isPending ? 0.5 : 1,
                }}
              >
                <Text style={{ color: action === "cancel" ? "#b91c1c" : "#2563eb" }}>
                  {actionLabel(action)}
                </Text>
              </Pressable>
            ))}
          </View>
        </>
      ) : null}
    </ScrollView>
  );
}
