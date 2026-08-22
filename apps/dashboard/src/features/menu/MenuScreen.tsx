import { useState } from "react";
import { Pressable, ScrollView, Switch, Text, TextInput, View } from "react-native";
import { Link } from "expo-router";
import { errorMessage, type MenuCategory, type MenuItem } from "@odyssey/api-client";
import { formatMoney } from "../../format";
import { useMenu } from "./useMenu";
import { MenuItemForm, type ItemDraft } from "./MenuItemForm";

/**
 * Stage 0 idiom: React Native primitives and inline styles, matching the orders
 * screens. The design system lands in packages/ui later.
 */
export function MenuScreen() {
  const menu = useMenu();
  const [search, setSearch] = useState("");
  /** Which inline form is open. Only ever one at a time. */
  const [editing, setEditing] = useState<
    { kind: "new"; categoryId: string } | { kind: "edit"; item: MenuItem } | null
  >(null);
  const [newCategory, setNewCategory] = useState("");
  const [notice, setNotice] = useState<string | null>(null);

  if (menu.isPending) return <Text style={{ padding: 24 }}>Loading…</Text>;

  if (menu.isError) {
    return (
      <View style={{ padding: 24, gap: 8 }}>
        <Text style={{ color: "#b91c1c" }}>{errorMessage(menu.error)}</Text>
        <Pressable onPress={menu.retry}>
          <Text style={{ color: "#2563eb" }}>Retry</Text>
        </Pressable>
      </View>
    );
  }

  const categories = menu.categories ?? [];
  const items = menu.items ?? [];
  const needle = search.trim().toLowerCase();
  const visible = needle
    ? items.filter((item) => item.name.toLowerCase().includes(needle))
    : items;

  return (
    <ScrollView contentContainerStyle={{ padding: 24, gap: 16 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
        <Text style={{ fontSize: 22, fontWeight: "600" }}>Menu</Text>
        <Link href="/orders" style={{ color: "#2563eb" }}>
          Orders
        </Link>
      </View>

      <TextInput
        value={search}
        onChangeText={setSearch}
        placeholder="Search items by name"
        style={{
          borderWidth: 1,
          borderColor: "#d4d4d8",
          borderRadius: 6,
          paddingHorizontal: 12,
          paddingVertical: 8,
        }}
      />

      {/* Refusals the server owns — CATEGORY_NOT_EMPTY above all — surface here. */}
      {notice ? (
        <View
          style={{
            borderWidth: 1,
            borderColor: "#fca5a5",
            backgroundColor: "#fef2f2",
            borderRadius: 6,
            padding: 10,
            flexDirection: "row",
            justifyContent: "space-between",
            gap: 12,
          }}
        >
          <Text style={{ color: "#b91c1c", flex: 1 }}>{notice}</Text>
          <Pressable onPress={() => setNotice(null)}>
            <Text style={{ color: "#b91c1c" }}>Dismiss</Text>
          </Pressable>
        </View>
      ) : null}

      <View style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
        <TextInput
          value={newCategory}
          onChangeText={setNewCategory}
          placeholder="New category name"
          style={{
            borderWidth: 1,
            borderColor: "#d4d4d8",
            borderRadius: 6,
            paddingHorizontal: 10,
            paddingVertical: 7,
            flex: 1,
            maxWidth: 280,
          }}
        />
        <Pressable
          disabled={newCategory.trim() === "" || menu.createCategory.isPending}
          onPress={() => {
            menu.createCategory.mutate(
              { data: { name: newCategory.trim() } },
              {
                onSuccess: () => setNewCategory(""),
                onError: (error) => setNotice(errorMessage(error)),
              },
            );
          }}
          style={{
            paddingHorizontal: 14,
            paddingVertical: 8,
            borderRadius: 6,
            borderWidth: 1,
            borderColor: "#2563eb",
            opacity: newCategory.trim() === "" ? 0.4 : 1,
          }}
        >
          <Text style={{ color: "#2563eb" }}>Add category</Text>
        </Pressable>
      </View>

      {categories.map((category) => (
        <CategorySection
          key={category.id}
          category={category}
          items={visible.filter((item) => item.categoryId === category.id)}
          isFiltered={needle !== ""}
          editing={editing}
          setEditing={setEditing}
          setNotice={setNotice}
          menu={menu}
        />
      ))}
    </ScrollView>
  );
}

function CategorySection({
  category,
  items,
  isFiltered,
  editing,
  setEditing,
  setNotice,
  menu,
}: {
  category: MenuCategory;
  items: MenuItem[];
  isFiltered: boolean;
  editing: { kind: "new"; categoryId: string } | { kind: "edit"; item: MenuItem } | null;
  setEditing: (
    value: { kind: "new"; categoryId: string } | { kind: "edit"; item: MenuItem } | null,
  ) => void;
  setNotice: (value: string | null) => void;
  menu: ReturnType<typeof useMenu>;
}) {
  const [renaming, setRenaming] = useState(false);
  const [name, setName] = useState(category.name);

  const addingHere = editing?.kind === "new" && editing.categoryId === category.id;

  return (
    <View style={{ gap: 6, paddingTop: 8 }}>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 10,
          borderBottomWidth: 2,
          borderBottomColor: "#e4e4e7",
          paddingBottom: 6,
        }}
      >
        {renaming ? (
          <>
            <TextInput
              value={name}
              onChangeText={setName}
              style={{
                borderWidth: 1,
                borderColor: "#d4d4d8",
                borderRadius: 6,
                paddingHorizontal: 8,
                paddingVertical: 5,
                minWidth: 180,
              }}
            />
            <Pressable
              onPress={() =>
                menu.updateCategory.mutate(
                  { id: category.id, data: { name: name.trim() } },
                  {
                    onSuccess: () => setRenaming(false),
                    onError: (error) => setNotice(errorMessage(error)),
                  },
                )
              }
            >
              <Text style={{ color: "#2563eb" }}>Save</Text>
            </Pressable>
            <Pressable
              onPress={() => {
                setName(category.name);
                setRenaming(false);
              }}
            >
              <Text style={{ color: "#52525b" }}>Cancel</Text>
            </Pressable>
          </>
        ) : (
          <>
            <Text style={{ fontSize: 17, fontWeight: "600" }}>{category.name}</Text>
            <Text style={{ color: "#71717a" }}>
              {category.itemCount} {category.itemCount === 1 ? "item" : "items"}
            </Text>
            <View style={{ flex: 1 }} />
            <Pressable onPress={() => setRenaming(true)}>
              <Text style={{ color: "#2563eb", fontSize: 13 }}>Rename</Text>
            </Pressable>
            <Pressable
              onPress={() =>
                menu.deleteCategory.mutate(
                  { id: category.id },
                  { onError: (error) => setNotice(errorMessage(error)) },
                )
              }
            >
              <Text style={{ color: "#b91c1c", fontSize: 13 }}>Delete</Text>
            </Pressable>
          </>
        )}
      </View>

      {items.map((item) =>
        editing?.kind === "edit" && editing.item.id === item.id ? (
          <MenuItemForm
            key={item.id}
            initial={item}
            submitLabel="Save item"
            isSaving={menu.updateItem.isPending}
            error={menu.updateItem.error}
            onCancel={() => setEditing(null)}
            onSubmit={(draft) => submitEdit(menu, item, draft, () => setEditing(null))}
          />
        ) : (
          <ItemRow
            key={item.id}
            item={item}
            menu={menu}
            setNotice={setNotice}
            onEdit={() => setEditing({ kind: "edit", item })}
          />
        ),
      )}

      {items.length === 0 ? (
        <Text style={{ color: "#a1a1aa", paddingVertical: 6 }}>
          {isFiltered ? "No items here match that search." : "Nothing on the menu here yet."}
        </Text>
      ) : null}

      {addingHere ? (
        <MenuItemForm
          submitLabel="Add item"
          isSaving={menu.createItem.isPending}
          error={menu.createItem.error}
          onCancel={() => setEditing(null)}
          onSubmit={(draft) =>
            menu.createItem.mutate(
              {
                data: {
                  categoryId: category.id,
                  name: draft.name,
                  ...(draft.description ? { description: draft.description } : {}),
                  priceCents: draft.priceCents,
                  isAvailable: draft.isAvailable,
                },
              },
              { onSuccess: () => setEditing(null) },
            )
          }
        />
      ) : (
        <Pressable onPress={() => setEditing({ kind: "new", categoryId: category.id })}>
          <Text style={{ color: "#2563eb", fontSize: 13, paddingVertical: 4 }}>+ Add item</Text>
        </Pressable>
      )}
    </View>
  );
}

function ItemRow({
  item,
  menu,
  setNotice,
  onEdit,
}: {
  item: MenuItem;
  menu: ReturnType<typeof useMenu>;
  setNotice: (value: string | null) => void;
  onEdit: () => void;
}) {
  const [confirming, setConfirming] = useState(false);

  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        paddingVertical: 7,
        borderBottomWidth: 1,
        borderBottomColor: "#f4f4f5",
        opacity: item.isAvailable ? 1 : 0.55,
      }}
    >
      <View style={{ flex: 1 }}>
        <Text>{item.name}</Text>
        {item.description ? (
          <Text style={{ color: "#a1a1aa", fontSize: 12 }}>{item.description}</Text>
        ) : null}
      </View>

      <Text style={{ fontFamily: "monospace", width: 80, textAlign: "right" }}>
        {formatMoney(item.priceCents)}
      </Text>

      {/* Availability is temporary and reversible, unlike removal. */}
      <View style={{ flexDirection: "row", alignItems: "center", gap: 6, width: 150 }}>
        <Switch
          value={item.isAvailable}
          onValueChange={(next) =>
            menu.updateItem.mutate(
              { id: item.id, data: { isAvailable: next } },
              { onError: (error) => setNotice(errorMessage(error)) },
            )
          }
        />
        <Text style={{ fontSize: 12, color: "#52525b" }}>
          {item.isAvailable ? "Available" : "Unavailable"}
        </Text>
      </View>

      {confirming ? (
        <View style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
          <Text style={{ fontSize: 12, color: "#52525b" }}>Remove from menu?</Text>
          <Pressable
            onPress={() =>
              menu.deleteItem.mutate(
                { id: item.id },
                {
                  onSuccess: () => setConfirming(false),
                  onError: (error) => setNotice(errorMessage(error)),
                },
              )
            }
          >
            <Text style={{ color: "#b91c1c", fontSize: 13 }}>Remove</Text>
          </Pressable>
          <Pressable onPress={() => setConfirming(false)}>
            <Text style={{ color: "#52525b", fontSize: 13 }}>Keep</Text>
          </Pressable>
        </View>
      ) : (
        <View style={{ flexDirection: "row", gap: 10 }}>
          <Pressable onPress={onEdit}>
            <Text style={{ color: "#2563eb", fontSize: 13 }}>Edit</Text>
          </Pressable>
          <Pressable onPress={() => setConfirming(true)}>
            <Text style={{ color: "#b91c1c", fontSize: 13 }}>Remove</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

/** Only the fields that actually changed go in the PATCH. */
function submitEdit(
  menu: ReturnType<typeof useMenu>,
  item: MenuItem,
  draft: ItemDraft,
  done: () => void,
) {
  const data: Record<string, unknown> = {};
  if (draft.name !== item.name) data.name = draft.name;
  // Cleared means null, not "": the API rejects a blank string on purpose.
  if (draft.description !== (item.description ?? "")) {
    data.description = draft.description === "" ? null : draft.description;
  }
  if (draft.priceCents !== item.priceCents) data.priceCents = draft.priceCents;
  if (draft.isAvailable !== item.isAvailable) data.isAvailable = draft.isAvailable;

  menu.updateItem.mutate({ id: item.id, data }, { onSuccess: done });
}
