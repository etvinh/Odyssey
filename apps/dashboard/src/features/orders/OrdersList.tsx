import { useState } from "react";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { Link } from "expo-router";
import { errorMessage, useListOrders, type OrderRow } from "@odyssey/api-client";
import { ORDER_STATUSES, type OrderStatus } from "@odyssey/types";
import { channelLabel, formatMoney, formatTime, statusLabel } from "./format";

/**
 * Stage 0 idiom, deliberately: React Native primitives and inline styles. The
 * design system lands in packages/ui later, and this screen is here to prove
 * the orders contract renders, not to be the finished Orders page.
 */
export function OrdersList() {
  const [status, setStatus] = useState<OrderStatus | undefined>(undefined);
  const [search, setSearch] = useState("");

  // Not destructured: TanStack Query v5 narrows `data` through the result
  // object's discriminated union, and destructuring throws that away.
  const query = useListOrders({
    ...(status ? { status } : {}),
    ...(search.trim() ? { search: search.trim() } : {}),
    pageSize: 25,
  });

  /**
   * The generated response type is a union discriminated on `status`, because
   * the route documents its 422. apiFetch throws on any non-2xx, so the error
   * arm never actually arrives here — this narrowing is what tells TypeScript
   * that, in one place instead of at every use site.
   */
  const page = query.data?.status === 200 ? query.data.data : undefined;

  return (
    <ScrollView contentContainerStyle={{ padding: 24, gap: 16 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
        <Text style={{ fontSize: 22, fontWeight: "600" }}>Orders</Text>
        <Link href="/menu" style={{ color: "#2563eb" }}>
          Menu
        </Link>
      </View>

      <TextInput
        value={search}
        onChangeText={setSearch}
        placeholder="Search by order number or customer"
        style={{
          borderWidth: 1,
          borderColor: "#d4d4d8",
          borderRadius: 6,
          paddingHorizontal: 12,
          paddingVertical: 8,
        }}
      />

      {/* Counts come from meta.statusCounts, which honours the search and
          ignores the status filter — so they stay whole while filtering. */}
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        <FilterChip label="All" active={!status} onPress={() => setStatus(undefined)} />
        {ORDER_STATUSES.map((option) => (
          <FilterChip
            key={option}
            label={`${statusLabel(option)} ${page?.meta.statusCounts[option] ?? 0}`}
            active={status === option}
            onPress={() => setStatus(option)}
          />
        ))}
      </View>

      {query.isPending ? <Text>Loading…</Text> : null}

      {query.isError ? (
        <View style={{ gap: 8 }}>
          <Text style={{ color: "#b91c1c" }}>{errorMessage(query.error)}</Text>
          <Pressable onPress={() => void query.refetch()}>
            <Text style={{ color: "#2563eb" }}>Retry</Text>
          </Pressable>
        </View>
      ) : null}

      {page ? (
        <OrderRows
          rows={page.data}
          total={page.meta.total}
          filtered={Boolean(status) || search.trim().length > 0}
        />
      ) : null}
    </ScrollView>
  );
}

function OrderRows({
  rows,
  total,
  filtered,
}: {
  rows: OrderRow[];
  total: number;
  filtered: boolean;
}) {
  if (rows.length === 0) {
    return (
      <Text>
        {filtered ? "No orders match these filters." : "No orders yet."}
      </Text>
    );
  }

  return (
    <View style={{ gap: 4 }}>
      <Text style={{ color: "#52525b" }}>
        {rows.length} of {total} orders
      </Text>
      {rows.map((order) => (
        <Link key={order.id} href={`/orders/${order.id}`} asChild>
          <Pressable
            style={{
              flexDirection: "row",
              gap: 12,
              paddingVertical: 10,
              borderBottomWidth: 1,
              borderBottomColor: "#e4e4e7",
            }}
          >
            <Text style={{ fontFamily: "monospace", width: 64 }}>#{order.orderNumber}</Text>
            <Text style={{ width: 160 }}>{order.customer?.name ?? "Walk-in"}</Text>
            <Text style={{ width: 100 }}>{channelLabel(order.channel)}</Text>
            <Text style={{ width: 100 }}>{statusLabel(order.status)}</Text>
            <Text style={{ width: 70 }}>{order.itemCount} items</Text>
            <Text style={{ fontFamily: "monospace", width: 90, textAlign: "right" }}>
              {formatMoney(order.totalCents)}
            </Text>
            <Text style={{ color: "#52525b" }}>{formatTime(order.placedAt)}</Text>
          </Pressable>
        </Link>
      ))}
    </View>
  );
}

function FilterChip({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 999,
        borderWidth: 1,
        borderColor: active ? "#2563eb" : "#d4d4d8",
        backgroundColor: active ? "#eff6ff" : "transparent",
      }}
    >
      <Text style={{ color: active ? "#2563eb" : "#3f3f46" }}>{label}</Text>
    </Pressable>
  );
}
