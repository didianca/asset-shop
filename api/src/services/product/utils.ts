import { getPublicUrl, findKeyByPrefix } from "../upload/s3.js";

type ProductWithRelations = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  price: { toString(): string } | number;
  discountPercent: number | null;
  isActive: boolean;
  createdAt: Date;
  previewKey: string;
  assetKey: string;
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
  previewKey: string;
  assetKey: string;
  previewUrl: string;
  assetUrl: string;
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
    previewKey: product.previewKey,
    assetKey: product.assetKey,
    previewUrl: getPublicUrl(product.previewKey),
    assetUrl: getPublicUrl(product.assetKey),
    createdAt: product.createdAt,
  };
}

export async function resolveKeysFromSlug(slug: string): Promise<{ previewKey: string; assetKey: string } | null> {
  const [previewKey, assetKey] = await Promise.all([
    findKeyByPrefix(`previews/${slug}`),
    findKeyByPrefix(`assets/${slug}`),
  ]);

  if (!previewKey || !assetKey) return null;
  return { previewKey, assetKey };
}

export function toTagSlug(name: string): string {
  return name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
}
