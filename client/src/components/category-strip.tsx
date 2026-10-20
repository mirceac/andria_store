import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { cn } from "@/lib/utils";

type Category = {
  id: number;
  name: string;
  parent_id: number | null;
};

type Node = Category & { children: Node[] };

function buildTree(categories: Category[]): Node[] {
  const map = new Map<number, Node>();
  categories.forEach((c) => map.set(c.id, { ...c, children: [] }));
  const roots: Node[] = [];
  map.forEach((node) => {
    const parent = node.parent_id !== null ? map.get(node.parent_id) : undefined;
    if (parent) parent.children.push(node);
    else roots.push(node);
  });
  return roots;
}

const chip = (active: boolean) =>
  cn(
    "shrink-0 whitespace-nowrap rounded-full border px-3 py-1 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
    active
      ? "border-primary bg-primary text-primary-foreground"
      : "border-primary/20 bg-white/70 text-foreground hover:border-primary/50 hover:bg-white"
  );

const rowClass = "flex gap-2 overflow-x-auto scrollbar-hide";

// Category quick-filter shown under the navbar on the home page.
// The home page owns the selection; it is synced through window events.
export default function CategoryStrip() {
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const { data: categories } = useQuery<Category[]>({
    queryKey: ["/api/categories/tree"],
  });

  useEffect(() => {
    const onChanged = (e: Event) =>
      setSelectedId((e as CustomEvent<{ categoryId: number | null }>).detail.categoryId);
    window.addEventListener("categorySelected", onChanged);
    window.dispatchEvent(new Event("requestCategorySelection"));
    return () => window.removeEventListener("categorySelected", onChanged);
  }, []);

  const roots = useMemo(() => buildTree(categories || []), [categories]);

  const path = useMemo(() => {
    const result: Node[] = [];
    const find = (nodes: Node[]): boolean =>
      nodes.some((node) => {
        result.push(node);
        if (node.id === selectedId || find(node.children)) return true;
        result.pop();
        return false;
      });
    if (selectedId !== null) find(roots);
    return result;
  }, [roots, selectedId]);

  if (roots.length === 0) return null;

  const select = (categoryId: number | null) =>
    window.dispatchEvent(new CustomEvent("selectCategory", { detail: { categoryId } }));

  const activeRoot = path[0];

  return (
    <div className="border-b border-border bg-chrome/60 px-3 py-2 md:ml-16 md:px-4">
      <div className="flex items-center gap-4">
        <p className="hidden shrink-0 font-serif text-sm italic text-muted-foreground lg:block">
          A considered collection
        </p>
        <div className="min-w-0 flex-1 space-y-2">
          <div className={rowClass} role="tablist" aria-label="Categories">
            <button type="button" className={chip(selectedId === null)} onClick={() => select(null)}>
              All
            </button>
            {roots.map((root) => (
              <button
                key={root.id}
                type="button"
                className={chip(activeRoot?.id === root.id)}
                onClick={() => select(root.id)}
              >
                {root.name}
              </button>
            ))}
          </div>
          {activeRoot && activeRoot.children.length > 0 && (
            <div className={cn(rowClass, "border-t border-primary/10 pt-2")}>
              <button
                type="button"
                className={chip(selectedId === activeRoot.id)}
                onClick={() => select(activeRoot.id)}
              >
                All {activeRoot.name}
              </button>
              {activeRoot.children.map((child) => (
                <button
                  key={child.id}
                  type="button"
                  className={chip(path.some((p) => p.id === child.id))}
                  onClick={() => select(child.id)}
                >
                  {child.name}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
