import { statuses, type OrderInput } from "./order-types";
export class InputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InputError";
  }
}
const editable = [
  "customerName",
  "phone",
  "productName",
  "quantity",
  "unitPrice",
  "status",
] as const;
export function parseInput(
  body: unknown,
  partial: boolean,
): Partial<OrderInput> {
  if (typeof body !== "object" || body === null || Array.isArray(body))
    throw new InputError("Send a JSON object with order fields.");
  const input = body as Record<string, unknown>;
  for (const key of Object.keys(input))
    if (
      ![...editable, "id", "total"].includes(key as (typeof editable)[number])
    )
      throw new InputError(`Unknown field: ${key}.`);
  const result: Partial<OrderInput> = {};
  for (const key of ["customerName", "phone", "productName"] as const) {
    if (partial && !Object.hasOwn(input, key)) continue;
    const value = input[key];
    if (typeof value !== "string" || !value.trim())
      throw new InputError(`${key} must be nonblank text.`);
    result[key] = value.trim();
  }
  if (!partial || Object.hasOwn(input, "quantity")) {
    if (
      typeof input.quantity !== "number" ||
      !Number.isSafeInteger(input.quantity) ||
      input.quantity < 1
    )
      throw new InputError(
        "quantity must be a positive safe integer (at least 1).",
      );
    result.quantity = input.quantity;
  }
  if (!partial || Object.hasOwn(input, "unitPrice")) {
    const value = input.unitPrice;
    if (
      typeof value !== "number" ||
      !Number.isFinite(value) ||
      value < 0 ||
      Number(value.toFixed(2)) !== value ||
      !Number.isSafeInteger(Math.round(value * 100))
    )
      throw new InputError(
        "unitPrice must be a finite nonnegative number with at most two decimal places.",
      );
    result.unitPrice = value;
  }
  if (Object.hasOwn(input, "status")) {
    if (
      typeof input.status !== "string" ||
      !statuses.includes(input.status as (typeof statuses)[number])
    )
      throw new InputError("status must be Pending, Preparing, or Delivered.");
    if (!partial && input.status !== "Pending")
      throw new InputError("New orders must start Pending.");
    result.status = input.status as (typeof statuses)[number];
  }
  if (partial && Object.keys(result).length === 0)
    throw new InputError("Provide at least one editable order field.");
  // id and total are intentionally ignored; neither can enter the candidate.
  return result;
}
export function calculateTotal(quantity: number, unitPrice: number): number {
  const cents = Math.round(unitPrice * 100) * quantity;
  if (!Number.isSafeInteger(cents))
    throw new InputError(
      "The order total exceeds the supported exact-cent range.",
    );
  return cents / 100;
}
export async function readBody(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    throw new InputError("Malformed JSON. Send a valid JSON object.");
  }
}
