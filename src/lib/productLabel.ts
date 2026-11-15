export function productLabel(product: { name?: string | null; deletedAt?: string | null } | null | undefined, fallback = '-'): string {
  if (!product?.name) return fallback;
  return product.deletedAt ? `${product.name} (produto excluído)` : product.name;
}
