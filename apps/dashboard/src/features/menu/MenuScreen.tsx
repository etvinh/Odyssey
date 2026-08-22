import { useState } from "react";
import { View } from "react-native";
import { errorMessage, type MenuCategory, type MenuItem } from "@odyssey/api-client";
import {
  Button,
  ConfirmDialog,
  DataTable,
  EmptyState,
  ErrorState,
  IconButton,
  InlineAlert,
  PageHeader,
  SearchField,
  Section,
  SkeletonRows,
  StatusBadge,
  Switch,
  Surface,
  Text,
  TextInput,
  space,
  useToast,
} from "@odyssey/ui";
import { formatMoney } from "../../format";
import { useMenu } from "./useMenu";
import { MenuItemDialog, type ItemDraft } from "./MenuItemDialog";

type Editing =
  | { kind: "new"; categoryId: string }
  | { kind: "edit"; item: MenuItem }
  | null;

export function MenuScreen() {
  const menu = useMenu();
  const toast = useToast();
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<Editing>(null);
  const [removing, setRemoving] = useState<MenuItem | null>(null);
  const [addingCategory, setAddingCategory] = useState(false);
  const [categoryName, setCategoryName] = useState("");
  const [notice, setNotice] = useState<string | null>(null);

  const categories = menu.categories ?? [];
  const items = menu.items ?? [];
  const needle = search.trim().toLowerCase();
  const visible = needle ? items.filter((item) => item.name.toLowerCase().includes(needle)) : items;

  const createCategory = () => {
    menu.createCategory.mutate(
      { data: { name: categoryName.trim() } },
      {
        onSuccess: () => {
          toast(`${categoryName.trim()} added`);
          setCategoryName("");
          setAddingCategory(false);
        },
        onError: (error) => setNotice(errorMessage(error)),
      },
    );
  };

  return (
    <View>
      <PageHeader
        title="Menu"
        subtitle={
          menu.items ? `${items.length} items across ${categories.length} categories` : undefined
        }
        actions={
          <Button
            label="New category"
            icon="plus"
            variant="secondary"
            onPress={() => setAddingCategory(true)}
          />
        }
      />

      <View style={{ gap: space[4] }}>
        {notice ? (
          <InlineAlert tone="danger" message={notice} onDismiss={() => setNotice(null)} />
        ) : null}

        <SearchField
          value={search}
          onChangeText={setSearch}
          placeholder="Search items by name"
          width={320}
        />

        {addingCategory ? (
          <Surface>
            <View style={{ flexDirection: "row", gap: space[2], alignItems: "flex-end" }}>
              <View style={{ flex: 1, maxWidth: 320 }}>
                <TextInput
                  value={categoryName}
                  onChangeText={setCategoryName}
                  placeholder="Aperitivo"
                  accessibilityLabel="New category name"
                  onSubmitEditing={() => categoryName.trim() && createCategory()}
                />
              </View>
              <Button
                label="Add"
                variant="primary"
                onPress={createCategory}
                disabled={categoryName.trim() === ""}
                loading={menu.createCategory.isPending}
              />
              <Button
                label="Cancel"
                variant="ghost"
                onPress={() => {
                  setAddingCategory(false);
                  setCategoryName("");
                }}
              />
            </View>
          </Surface>
        ) : null}

        {menu.isPending ? (
          <Surface>
            <SkeletonRows rows={8} />
          </Surface>
        ) : menu.isError ? (
          <Surface padded={false}>
            <ErrorState cause={errorMessage(menu.error)} onRetry={menu.retry} />
          </Surface>
        ) : categories.length === 0 ? (
          <Surface padded={false}>
            <EmptyState
              title="Nothing on the menu yet"
              body="Add a category first, then the items that belong in it."
              action={{ label: "New category", onPress: () => setAddingCategory(true) }}
            />
          </Surface>
        ) : (
          <View style={{ gap: space[8] }}>
            {categories.map((category) => (
              <CategorySection
                key={category.id}
                category={category}
                items={visible.filter((item) => item.categoryId === category.id)}
                isFiltered={needle !== ""}
                menu={menu}
                onAdd={() => setEditing({ kind: "new", categoryId: category.id })}
                onEdit={(item) => setEditing({ kind: "edit", item })}
                onRemove={setRemoving}
                onNotice={setNotice}
              />
            ))}
          </View>
        )}
      </View>

      {editing ? (
        <MenuItemDialog
          open
          // Remounts per target, so the fields open with the right values.
          key={editing.kind === "edit" ? editing.item.id : `new-${editing.categoryId}`}
          initial={editing.kind === "edit" ? editing.item : undefined}
          isSaving={menu.createItem.isPending || menu.updateItem.isPending}
          error={editing.kind === "edit" ? menu.updateItem.error : menu.createItem.error}
          onClose={() => setEditing(null)}
          onSubmit={(draft) => {
            if (editing.kind === "edit") {
              menu.updateItem.mutate(
                { id: editing.item.id, data: changedFields(editing.item, draft) },
                {
                  onSuccess: () => {
                    toast(`${draft.name} saved`);
                    setEditing(null);
                  },
                },
              );
            } else {
              menu.createItem.mutate(
                {
                  data: {
                    categoryId: editing.categoryId,
                    name: draft.name,
                    ...(draft.description ? { description: draft.description } : {}),
                    priceCents: draft.priceCents,
                    isAvailable: draft.isAvailable,
                  },
                },
                {
                  onSuccess: () => {
                    toast(`${draft.name} added`);
                    setEditing(null);
                  },
                },
              );
            }
          }}
        />
      ) : null}

      <ConfirmDialog
        open={removing !== null}
        onClose={() => setRemoving(null)}
        onConfirm={() => {
          const target = removing;
          if (!target) return;
          menu.deleteItem.mutate(
            { id: target.id },
            {
              onSuccess: () => {
                toast(`${target.name} removed from the menu`);
                setRemoving(null);
              },
              onError: (error) => {
                setNotice(errorMessage(error));
                setRemoving(null);
              },
            },
          );
        }}
        title={removing ? `Remove ${removing.name}?` : "Remove this item?"}
        consequence="It disappears from the menu straight away. Past orders keep it exactly as it was priced."
        confirmLabel="Remove from menu"
        isWorking={menu.deleteItem.isPending}
      />
    </View>
  );
}

function CategorySection({
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

/** Only what actually changed goes in the PATCH. */
function changedFields(item: MenuItem, draft: ItemDraft) {
  const data: Record<string, unknown> = {};
  if (draft.name !== item.name) data.name = draft.name;
  if (draft.description !== (item.description ?? "")) {
    // Cleared means null, not "": the API rejects a blank string on purpose.
    data.description = draft.description === "" ? null : draft.description;
  }
  if (draft.priceCents !== item.priceCents) data.priceCents = draft.priceCents;
  if (draft.isAvailable !== item.isAvailable) data.isAvailable = draft.isAvailable;
  return data;
}
