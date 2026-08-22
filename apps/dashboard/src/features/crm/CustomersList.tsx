import { useMemo, useState } from "react";
import { View } from "react-native";
import { usePathname, useRouter } from "expo-router";
import { errorMessage, type Customer } from "@odyssey/api-client";
import {
  DataTable,
  EmptyState,
  ErrorState,
  PageHeader,
  SearchField,
  SkeletonRows,
  Surface,
  Text,
  space,
} from "@odyssey/ui";
import { formatMoney, formatTime } from "../../format";
import { filterCustomers } from "./filter";
import { useAllCustomers } from "./useAllCustomers";

export function CustomersList() {
  const router = useRouter();
  // The open customer, read off the URL: the drawer is a route, so the path is
  // where that lives. Marking the row keeps the drawer anchored to its source.
  const openCustomerId = usePathname().split("/crm/")[1];
  const [search, setSearch] = useState("");

  const query = useAllCustomers();
  const customers = query.data;

  const visible = useMemo(
    () => (customers ? filterCustomers(customers, search) : undefined),
    [customers, search],
  );

  return (
    <View>
      <PageHeader
        title="Customers"
        subtitle={
          visible && customers ? `${visible.length} of ${customers.length} shown` : undefined
        }
      />

      <View style={{ gap: space[4] }}>
        <View style={{ flexDirection: "row", gap: space[3], alignItems: "center" }}>
          <View style={{ flex: 1 }} />
          <SearchField
            value={search}
            onChangeText={setSearch}
            placeholder="Name, phone or email"
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
          <DataTable<Customer>
            caption="Customers"
            rows={visible}
            keyExtractor={(customer) => customer.id}
            selectedKey={openCustomerId}
            onRowPress={(customer) => router.push(`/crm/${customer.id}` as "/crm")}
            emptyState={
              <Surface padded={false}>
                <EmptyState
                  title="No customers match that search"
                  body="Try a different name, phone number or email."
                  action={
                    search ? { label: "Clear search", onPress: () => setSearch("") } : undefined
                  }
                />
              </Surface>
            }
            columns={[
              {
                key: "name",
                header: "Customer",
                flex: 2,
                render: (customer) => <Text variant="body">{customer.name}</Text>,
              },
              {
                key: "contact",
                header: "Contact",
                flex: 2,
                render: (customer) =>
                  customer.phone ?? customer.email ? (
                    <Text variant="body" tone="muted">
                      {customer.phone ?? customer.email}
                    </Text>
                  ) : (
                    // Contact details are optional by design — see CONTEXT.md.
                    <Text variant="body" tone="subtle">
                      No contact details
                    </Text>
                  ),
              },
              {
                key: "orderCount",
                header: "Orders",
                width: 80,
                align: "right",
                render: (customer) => (
                  <Text variant="data" tone="muted">
                    {customer.orderCount}
                  </Text>
                ),
              },
              {
                key: "totalSpendCents",
                header: "Spend",
                width: 110,
                align: "right",
                render: (customer) => (
                  <Text variant="data">{formatMoney(customer.totalSpendCents)}</Text>
                ),
              },
              {
                key: "lastOrderAt",
                header: "Last visit",
                width: 150,
                align: "right",
                render: (customer) =>
                  customer.lastOrderAt ? (
                    <Text variant="caption" tone="muted">
                      {formatTime(customer.lastOrderAt)}
                    </Text>
                  ) : (
                    <Text variant="caption" tone="subtle">
                      Never
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
