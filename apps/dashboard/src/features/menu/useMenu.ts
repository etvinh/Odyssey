import { useQueryClient } from "@tanstack/react-query";
import {
  getListMenuCategoriesQueryKey,
  getListMenuItemsQueryKey,
  useCreateMenuCategory,
  useCreateMenuItem,
  useDeleteMenuCategory,
  useDeleteMenuItem,
  useListMenuCategories,
  useListMenuItems,
  useUpdateMenuCategory,
  useUpdateMenuItem,
} from "@odyssey/api-client";

/**
 * The menu's data layer. Every mutation here invalidates both reads, because
 * they are two views of one thing: adding, moving or removing an item changes
 * the item list *and* the category's itemCount, which the server derives.
 * Invalidating only the list leaves a stale count in the section header.
 */
export function useMenu() {
  const queryClient = useQueryClient();

  const categoriesQuery = useListMenuCategories();
  const itemsQuery = useListMenuItems();

  const refresh = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: getListMenuCategoriesQueryKey() }),
      // No params: the paramless key is a prefix, so every filtered variant goes too.
      queryClient.invalidateQueries({ queryKey: getListMenuItemsQueryKey() }),
    ]);

  const onSuccess = { onSuccess: () => refresh() };

  return {
    categories:
      categoriesQuery.data?.status === 200 ? categoriesQuery.data.data.data : undefined,
    items: itemsQuery.data?.status === 200 ? itemsQuery.data.data.data : undefined,
    isPending: categoriesQuery.isPending || itemsQuery.isPending,
    isError: categoriesQuery.isError || itemsQuery.isError,
    error: categoriesQuery.error ?? itemsQuery.error,
    retry: () => {
      void categoriesQuery.refetch();
      void itemsQuery.refetch();
    },

    createItem: useCreateMenuItem({ mutation: onSuccess }),
    updateItem: useUpdateMenuItem({ mutation: onSuccess }),
    deleteItem: useDeleteMenuItem({ mutation: onSuccess }),
    createCategory: useCreateMenuCategory({ mutation: onSuccess }),
    updateCategory: useUpdateMenuCategory({ mutation: onSuccess }),
    deleteCategory: useDeleteMenuCategory({ mutation: onSuccess }),
  };
}
