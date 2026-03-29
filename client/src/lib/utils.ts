import clsx, { type ClassValue } from "clsx";

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

export function formatPrice(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
}

export function calculateEffectivePrice(
  price: number,
  discountPercent: number | null,
): number {
  if (!discountPercent) return price;
  return Math.round(price * (1 - discountPercent / 100) * 100) / 100;
}
