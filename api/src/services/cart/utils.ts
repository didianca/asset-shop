type CartItemWithProduct = {
  productId: string;
  createdAt: Date;
  product: {
    name: string;
    slug: string;
    price: { toString(): string } | number;
    discountPercent: number | null;
    previewUrl: string;
  };
};

type CartWithItems = {
  id: string;
  items: CartItemWithProduct[];
};

type CartItemResponse = {
  productId: string;
  name: string;
  slug: string;
  price: number;
  discountPercent: number | null;
  previewUrl: string;
  addedAt: Date;
};

type CartResponse = {
  id: string;
  items: CartItemResponse[];
  total: number;
};

function effectivePrice(price: number, discountPercent: number | null): number {
  if (!discountPercent) return price;
  return Math.round(price * (1 - discountPercent / 100) * 100) / 100;
}

export function formatCart(cart: CartWithItems): CartResponse {
  const items = cart.items.map((item) => {
    const price = Number(item.product.price);
    return {
      productId: item.productId,
      name: item.product.name,
      slug: item.product.slug,
      price,
      discountPercent: item.product.discountPercent,
      previewUrl: item.product.previewUrl,
      addedAt: item.createdAt,
    };
  });

  const total = items.reduce(
    (sum, item) => sum + effectivePrice(item.price, item.discountPercent),
    0
  );

  return {
    id: cart.id,
    items,
    total: Math.round(total * 100) / 100,
  };
}
