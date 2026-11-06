export type Category = {
  id: number;
  name: string;
  description: string | null;
  parent_id: number | null;
  user_id?: number | null;
  username?: string | null;
  is_public?: boolean;
  hidden?: boolean;
  created_at: string;
};

export type CategoryNode = Category & { children: CategoryNode[] };

export function buildCategoryTree(categories: Category[]): CategoryNode[] {
  const map = new Map<number, CategoryNode>();
  categories.forEach((category) => map.set(category.id, { ...category, children: [] }));

  const roots: CategoryNode[] = [];
  categories.forEach((category) => {
    const node = map.get(category.id)!;
    const parent = category.parent_id ? map.get(category.parent_id) : undefined;
    if (parent) parent.children.push(node);
    else if (!category.parent_id) roots.push(node);
  });
  return roots;
}

// The category itself plus every nested child category
export function getDescendantCategoryIds(categoryId: number, categories: Category[]): number[] {
  const ids = [categoryId];
  categories
    .filter((category) => category.parent_id === categoryId)
    .forEach((child) => ids.push(...getDescendantCategoryIds(child.id, categories)));
  return ids;
}
