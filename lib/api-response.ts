import { InputError } from "./order-validation";
export const jsonHeaders = { "Cache-Control": "no-store" };
export function errorResponse(error: unknown): Response {
  if (error instanceof InputError)
    return Response.json(
      { message: error.message },
      { status: 400, headers: jsonHeaders },
    );
  console.error("Unexpected order request failure", error);
  return Response.json(
    { message: "The order request could not be completed. Please try again." },
    { status: 500, headers: jsonHeaders },
  );
}
export function missingOrder() {
  return Response.json(
    { message: "Order not found. Refresh the list to see current orders." },
    { status: 404, headers: jsonHeaders },
  );
}
