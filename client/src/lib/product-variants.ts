import type { SelectProduct } from "@db/schema";

export function hasPhysicalVariant(product: Pick<SelectProduct, "has_physical_variant" | "physical_price">): boolean {
  return product.has_physical_variant === true && Number(product.physical_price || 0) > 0;
}
