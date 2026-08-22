import { useState } from "react";
import { View } from "react-native";
import { errorMessage, type MenuCategory, type MenuItem } from "@odyssey/api-client";
import { formatMoney } from "@odyssey/shared";
import {
  Button,
  ConfirmDialog,
  DataTable,
  EmptyState,
  IconButton,
  Section,
  StatusBadge,
  Switch,
  Surface,
  Text,
  TextInput,
  space,
} from "@odyssey/ui";
import type { useMenu } from "./useMenu";

/**
 * One category and the items in it, with the category's own rename and delete.
 *
 * Split from MenuScreen because it owns state the screen does not care about —
 * whether this heading is being renamed — and lifting that up would make the
 * screen re-render every keystroke in any of its sections.
 */
export function CategorySection({
  category,
  items,
  isFiltered,
  menu,
  onAdd,
  onEdit,
  onRemove,
  onNotice,
}: {
  category: MenuCategory;
  items: MenuItem[];
  isFiltered: boolean;
  menu: ReturnType<typeof useMenu>;
  onAdd: () => void;
  onEdit: (item: MenuItem) => void;
  onRemove: (item: MenuItem) => void;
  onNotice: (message: string) => void;
}) {
  const [renaming, setRenaming] = useState(false);
  const [name, setName] = useState(category.name);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  return (
    <Section
      title={renaming ? "" : `${category.name}`}
      actions={
        renaming ? null : (
          <>
            <Text variant="caption" tone="subtle">
              {category.itemCount} {category.itemCount === 1 ? "item" : "items"}
            </Text>
            <IconButton icon="pencil" label={`Rename ${category.name}`} onPress={() => setRenaming(true)} />
            <IconButton
              icon="trash"
              label={`Delete ${category.name}`}
              tone="danger"
              onPress={() => setConfirmingDelete(true)}
            />
            <Button label="Add item" icon="plus" size="sm" variant="secondary" onPress={onAdd} />
          </>
        )
      }
    >
      {renaming ? (
        <View style={{ flexDirection: "row", gap: space[2], alignItems: "center" }}>
          <View style={{ width: 260 }}>
            <TextInput
              value={name}
              onChangeText={setName}
              accessibilityLabel={`Rename ${category.name}`}
              onSubmitEditing={() => saveName()}
            />
          </View>
          <Button label="Save" variant="primary" size="sm" onPress={() => saveName()} />
          <Button
            label="Cancel"
            variant="ghost"
            size="sm"
            onPress={() => {
              setName(category.name);
              setRenaming(false);
            }}
          />
        </View>
      ) : null}

      <DataTable<MenuItem>
        caption={category.name}
        rows={items}
        keyExtractor={(item) => item.id}
        emptyState={
          <Surface padded={false}>
            <EmptyState
              icon="book"
              title={isFiltered ? "Nothing here matches that search" : `Nothing in ${category.name} yet`}
              body={isFiltered ? undefined : "Add the first item to this category."}
              action={isFiltered ? undefined : { label: "Add item", onPress: onAdd }}
            />
          </Surface>
        }
        columns={[
          {
            key: "name",
            header: "Item",
            flex: 3,
            render: (item) => (
              <View style={{ gap: 1 }}>
                <Text variant="body">{item.name}</Text>
                {item.description ? (
                  <Text variant="caption" tone="subtle" numberOfLines={1}>
                    {item.description}
                  </Text>
                ) : null}
              </View>
            ),
          },
          {
            key: "price",
            header: "Price",
            width: 90,
            align: "right",
            render: (item) => <Text variant="data">{formatMoney(item.priceCents)}</Text>,
          },
          {
            key: "availability",
            header: "Availability",
            width: 150,
            render: (item) => (
              <View style={{ flexDirection: "row", alignItems: "center", gap: space[2] }}>
                {/* Temporary and reversible, unlike removal. */}
                <Switch
                  value={item.isAvailable}
                  label={`${item.name} available`}
                  onValueChange={(next) =>
                    menu.updateItem.mutate(
                      { id: item.id, data: { isAvailable: next } },
                      { onError: (error) => onNotice(errorMessage(error)) },
                    )
                  }
                />
                <StatusBadge
                  label={item.isAvailable ? "Available" : "Off"}
                  tone={item.isAvailable ? "success" : "neutral"}
                  dot={false}
                />
              </View>
            ),
          },
          {
            key: "actions",
            header: "",
            width: 76,
            align: "right",
            render: (item) => (
              <View style={{ flexDirection: "row", gap: space[1] }}>
                <IconButton icon="pencil" label={`Edit ${item.name}`} onPress={() => onEdit(item)} />
                <IconButton
                  icon="trash"
                  label={`Remove ${item.name}`}
                  tone="danger"
                  onPress={() => onRemove(item)}
                />
              </View>
            ),
          },
        ]}
      />

      <ConfirmDialog
        open={confirmingDelete}
        onClose={() => setConfirmingDelete(false)}
        onConfirm={() => {
          menu.deleteCategory.mutate(
            { id: category.id },
            {
              onSuccess: () => setConfirmingDelete(false),
              onError: (error) => {
                onNotice(errorMessage(error));
                setConfirmingDelete(false);
              },
            },
          );
        }}
        title={`Delete ${category.name}?`}
        consequence="A category holding items cannot be deleted — move or remove them first."
        confirmLabel="Delete category"
        isWorking={menu.deleteCategory.isPending}
      />
    </Section>
  );

  function saveName() {
    menu.updateCategory.mutate(
      { id: category.id, data: { name: name.trim() } },
      {
        onSuccess: () => setRenaming(false),
        onError: (error) => onNotice(errorMessage(error)),
      },
    );
  }
}
