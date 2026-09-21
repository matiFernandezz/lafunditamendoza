export type PaymentMethod = "efectivo" | "transferencia";

export type CartItem = {
  variantId: string;
  productName: string;
  variantLabel: string;
  price: number;
  quantity: number;
  stockQuantity: number;
};
