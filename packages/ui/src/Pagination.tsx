import { View } from "react-native";
import { Button } from "./Button";
import { Text } from "./Text";
import { space } from "./tokens";

/**
 * The footer of a paged table.
 *
 * Reads "1–25 of 240" rather than "page 1 of 10", because the count someone is
 * actually looking for is how many rows there are — the page number is a means
 * of getting to them, not the thing being reported.
 *
 * `total` must be the count of everything the filter matches, not the length of
 * the current page: a page past the end has no rows to count and would strand
 * this footer at "0 of 0" with no way back.
 */
export function Pagination({
  page,
  pageSize,
  total,
  onPageChange,
  noun = "rows",
}: {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (next: number) => void;
  /** Plural, for the summary line — "customers", "orders". */
  noun?: string;
}) {
  const lastPage = Math.max(1, Math.ceil(total / pageSize));
  const first = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const last = Math.min(page * pageSize, total);

  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: space[3],
        paddingTop: space[1],
      }}
    >
      <Text variant="caption" tone="muted">
        {total === 0 ? `No ${noun}` : `${first}–${last} of ${total} ${noun}`}
      </Text>

      <View style={{ flex: 1 }} />

      <Button
        label="Previous"
        variant="secondary"
        icon="chevronLeft"
        onPress={() => onPageChange(page - 1)}
        disabled={page <= 1}
      />
      <Text variant="caption" tone="subtle">
        Page {page} of {lastPage}
      </Text>
      <Button
        label="Next"
        variant="secondary"
        onPress={() => onPageChange(page + 1)}
        disabled={page >= lastPage}
      />
    </View>
  );
}
