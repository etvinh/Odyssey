import { useState } from "react";
import { View } from "react-native";
import { errorMessage, type MenuItem } from "@odyssey/api-client";
import {
  Button,
  ConfirmDialog,
  EmptyState,
  ErrorState,
  InlineAlert,
  PageHeader,
  SearchField,
  SkeletonRows,
  Surface,
  TextInput,
  space,
  useToast,
} from "@odyssey/ui";
import { useMenu } from "./useMenu";
import { CategorySection } from "./CategorySection";
import { changedFields } from "./changed-fields";
import { MenuItemDialog } from "./MenuItemDialog";

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
