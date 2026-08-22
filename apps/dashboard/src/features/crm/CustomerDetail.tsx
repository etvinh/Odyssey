import { View } from "react-native";
import { useRouter } from "expo-router";
import { errorMessage, useGetCustomer } from "@odyssey/api-client";
import {
  DetailDrawer,
  ErrorState,
  Interactive,
  Section,
  Skeleton,
  StatusBadge,
  Text,
  color,
  radius,
  space,
} from "@odyssey/ui";
import { formatMoney, formatTime } from "../../format";
import { statusLabel, statusTone } from "../orders/format";

export function CustomerDetail({ id }: { id: string }) {
  const router = useRouter();

  const query = useGetCustomer(id);
  const customer = query.data?.status === 200 ? query.data.data : undefined;

  /**
   * Prefer popping history so the drawer behaves like the panel it looks like.
   * A deep link straight to a customer has nothing to pop, so that case
   * navigates to the list instead.
   */
  const close = () => (router.canGoBack() ? router.back() : router.replace("/crm"));

  return (
    <DetailDrawer open onClose={close} title={customer ? customer.name : "Customer"}>
      {query.isPending ? (
        <View style={{ gap: space[3] }}>
          <Skeleton width={180} height={22} />
          <Skeleton width="60%" />
          <Skeleton width="80%" />
        </View>
      ) : query.isError ? (
        <ErrorState cause={errorMessage(query.error)} onRetry={() => void query.refetch()} />
      ) : customer ? (
        <>
          <Section title="Derived totals">
            {/* Recomputed on every read, never stored — see CONTEXT.md. */}
            <View style={{ flexDirection: "row", gap: space[4], flexWrap: "wrap" }}>
              <Stat label="Orders" value={String(customer.orderCount)} />
              <Stat label="Total spend" value={formatMoney(customer.totalSpendCents)} />
              <Stat
                label="Last visit"
                value={customer.lastOrderAt ? formatTime(customer.lastOrderAt) : "Never"}
              />
            </View>
          </Section>

          {customer.phone ?? customer.email ? (
            <Section title="Contact">
              <View style={{ gap: space[0.5] }}>
                {customer.phone ? <Text variant="body">{customer.phone}</Text> : null}
                {customer.email ? (
                  <Text variant="body" tone="muted">
                    {customer.email}
                  </Text>
                ) : null}
              </View>
            </Section>
          ) : null}

          <Section title="Preferences">
            {customer.preferences.length > 0 ? (
              <View style={{ flexDirection: "row", gap: space[2], flexWrap: "wrap" }}>
                {/* Display only: there is no customer edit endpoint in this build. */}
                {customer.preferences.map((preference) => (
                  <StatusBadge key={preference} label={preference} tone="neutral" />
                ))}
              </View>
            ) : (
              <Text variant="body" tone="subtle">
                Nothing noted yet.
              </Text>
            )}
          </Section>

          <Section title="Recent orders">
            {customer.recentOrders.length > 0 ? (
              <View style={{ gap: space[2] }}>
                {customer.recentOrders.map((order) => (
                  <Interactive
                    key={order.id}
                    onPress={() => router.push(`/orders/${order.id}` as "/orders")}
                    accessibilityRole="link"
                    accessibilityLabel={`Order ${order.orderNumber}`}
                    style={({ hovered }) => ({
                      flexDirection: "row",
                      alignItems: "center",
                      gap: space[3],
                      padding: space[2],
                      borderRadius: radius.md,
                      backgroundColor: hovered ? color.surfaceHover : "transparent",
                    })}
                  >
                    {() => (
                      <>
                      <Text variant="data" tone="muted" style={{ width: 56 }}>
                        #{order.orderNumber}
                      </Text>
                      <View style={{ flex: 1, gap: space[0.5] }}>
                        <StatusBadge
                          label={statusLabel(order.status)}
                          tone={statusTone(order.status)}
                        />
                        <Text variant="caption" tone="subtle">
                          {formatTime(order.placedAt)}
                        </Text>
                      </View>
                        <Text variant="data">{formatMoney(order.totalCents)}</Text>
                      </>
                    )}
                  </Interactive>
                ))}
              </View>
            ) : (
              <Text variant="body" tone="subtle">
                No orders yet.
              </Text>
            )}
          </Section>
        </>
      ) : null}
    </DetailDrawer>
  );
}

/** One of the stat trio at the top of the drawer. */
function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ gap: space[0.5] }}>
      <Text variant="overline" tone="subtle">
        {label}
      </Text>
      <Text variant="data" style={{ fontSize: 15 }}>
        {value}
      </Text>
    </View>
  );
}
