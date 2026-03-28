type ProductWithRelations = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  price: { toString(): string } | number;
  discountPercent: number | null;
  isActive: boolean;
  createdAt: Date;
  image: { previewUrl: string; assetUrl: string } | null;
  tags: { tag: { name: string } }[];
};

type ProductResponse = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  price: number;
  discountPercent: number | null;
  isActive: boolean;
  tags: string[];
  previewUrl: string | null;
  assetUrl: string | null;
  createdAt: Date;
};

export function formatProduct(product: ProductWithRelations): ProductResponse {
  return {
    id: product.id,
    name: product.name,
    slug: product.slug,
    description: product.description,
    price: Number(product.price),
    discountPercent: product.discountPercent,
    isActive: product.isActive,
    tags: product.tags.map((pt) => pt.tag.name),
    previewUrl: product.image?.previewUrl ?? null,
    assetUrl: product.image?.assetUrl ?? null,
    createdAt: product.createdAt,
  };
}

export function toTagSlug(name: string): string {
  return name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
}
