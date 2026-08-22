import { useState } from "react";
import { View } from "react-native";
import { formatMoney, formatTime } from "@odyssey/shared";
import { usePathname, useRouter } from "expo-router";
import { errorMessage, useListCustomers, type Customer } from "@odyssey/api-client";
import {
  DataTable,
  EmptyState,
  ErrorState,
  PageHeader,
  Pagination,
  SearchField,
  SkeletonRows,
  Surface,
  Text,
  space,
} from "@odyssey/ui";
import { useDebounced } from "../useDebounced";

/** One screenful. The server caps a page at 100. */
const PAGE_SIZE = 25;

export function CustomersList() {
  const router = useRouter();
  // The open customer, read off the URL: the drawer is a route, so the path is
  // where that lives. Marking the row keeps the drawer anchored to its source.
  const openCustomerId = usePathname().split("/crm/")[1];
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  /**
   * Searched and paged on the server. The customer list is a comprehensive
   * history of everyone who has ever ordered and only grows, so it is not a set
   * the dashboard can hold in memory to filter — unlike the menu, which is
   * bounded by what a kitchen can cook.
   */
  const settledSearch = useDebounced(search.trim());

  const query = useListCustomers({
    ...(settledSearch ? { search: settledSearch } : {}),
    page,
    pageSize: PAGE_SIZE,
  });

  const result = query.data?.status === 200 ? query.data.data : undefined;
  const customers = result?.data;

  return (
    <View>
      <PageHeader
        title="Customers"
        subtitle={result ? `${result.meta.total} in total` : undefined}
      />

      <View style={{ gap: space[4] }}>
        <View style={{ flexDirection: "row", gap: space[3], alignItems: "center" }}>
          <SearchField
            value={search}
            // Back to page one on every edit: a narrower search can leave the
            // current page past the end of the results, where there is nothing
            // to show and no obvious way back.
            onChangeText={(next) => {
              setSearch(next);
              setPage(1);
            }}
            placeholder="Name, phone or email"
            width={280}
          />
          <View style={{ flex: 1 }} />
        </View>

        {query.isPending ? (
          <Surface>
            <SkeletonRows rows={8} />
          </Surface>
        ) : query.isError ? (
          <Surface padded={false}>
            <ErrorState cause={errorMessage(query.error)} onRetry={() => void query.refetch()} />
          </Surface>
        ) : customers ? (
          <DataTable<Customer>
            caption="Customers"
            rows={customers}
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

        {result && result.meta.total > 0 ? (
          <Pagination
            page={result.meta.page}
            pageSize={result.meta.pageSize}
            total={result.meta.total}
            onPageChange={setPage}
            noun="customers"
          />
        ) : null}
      </View>
    </View>
  );
}
