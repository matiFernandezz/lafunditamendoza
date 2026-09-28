export type PaymentMethod = "efectivo" | "transferencia";

export type CartItem = {
  variantId: string;
  productName: string;
  variantLabel: string;
  price: number;
  quantity: number;
  stockQuantity: number;
};

/** Descuento elegido en el carrito: ninguno, uno de los atajos, u otro a mano. */
export type DiscountChoice =
  | { kind: "none" }
  | { kind: "preset"; percent: number }
  | { kind: "custom"; text: string };
