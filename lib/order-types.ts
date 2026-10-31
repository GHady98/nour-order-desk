export const statuses = ["Pending", "Preparing", "Delivered"] as const;
export type OrderStatus = (typeof statuses)[number];
export type Order = {
  id: string;
  customerName: string;
  phone: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  total: number;
  status: OrderStatus;
};
export type OrderInput = Omit<Order, "id" | "total">;
export const catalogue = [
  { name: "Vanilla Candle", price: 8 },
  { name: "Cedar Candle", price: 10 },
  { name: "Mini Gift Candle", price: 6 },
] as const;
export const money = (value: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(
    value,
  );
