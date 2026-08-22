import { useListMenuCategories } from "@odyssey/api-client";
import { Text, View } from "react-native";

/**
 * Stage 0 walking skeleton. Deliberately unstyled: this screen exists to prove
 * Drizzle -> drizzle-zod -> OpenAPI -> Orval -> React Query renders real rows
 * out of Postgres. The design system lands in Stage 1.
 */
export default function MenuScreen() {
  // Not destructured: TanStack Query v5 narrows `data` through the result
  // object's discriminated union, and destructuring throws that away.
  const query = useListMenuCategories();

  if (query.isPending) return <Text>Loading…</Text>;
  if (query.isError) return <Text>Failed: {String(query.error)}</Text>;

  const { data: categories, meta } = query.data.data;

  return (
    <View style={{ padding: 24, gap: 8 }}>
      <Text style={{ fontSize: 20, fontWeight: "600" }}>
        Menu categories ({meta.total})
      </Text>
      {categories.map((c) => (
        <Text key={c.id}>
          {c.sortOrder} · {c.name} · {c.itemCount} items
        </Text>
      ))}
    </View>
  );
}
