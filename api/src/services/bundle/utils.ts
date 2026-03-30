import { getPublicUrl } from "../upload/s3.js";

type BundleProduct = {
  id: string;
  name: string;
  slug: string;
  price: { toString(): string } | number;
  discountPercent: number | null;
  previewKey: string;
};

type BundleWithRelations = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  discountPercent: number | null;
  isActive: boolean;
  createdAt: Date;
  products: BundleProduct[];
};

type BundleProductResponse = {
  id: string;
  name: string;
  slug: string;
  price: number;
  discountPercent: number | null;
  previewKey: string;
  previewUrl: string;
};

type BundleResponse = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  discountPercent: number | null;
  isActive: boolean;
  products: BundleProductResponse[];
  createdAt: Date;
};

export function formatBundle(bundle: BundleWithRelations): BundleResponse {
  return {
    id: bundle.id,
    name: bundle.name,
    slug: bundle.slug,
    description: bundle.description,
    discountPercent: bundle.discountPercent,
    isActive: bundle.isActive,
    products: bundle.products.map((p) => ({
      id: p.id,
      name: p.name,
      slug: p.slug,
      price: Number(p.price),
      discountPercent: p.discountPercent,
      previewKey: p.previewKey,
      previewUrl: getPublicUrl(p.previewKey),
    })),
    createdAt: bundle.createdAt,
  };
}
