import { deleteOrder, getOrder, updateOrder } from "@/lib/orders-store";
import { readBody } from "@/lib/order-validation";
import { errorResponse, jsonHeaders, missingOrder } from "@/lib/api-response";
export const runtime = "nodejs";
type Context = { params: Promise<{ id: string }> };
export async function GET(_request: Request, { params }: Context) {
  const { id } = await params;
  const order = getOrder(id);
  return order
    ? Response.json(order, { headers: jsonHeaders })
    : missingOrder();
}
export async function PATCH(request: Request, { params }: Context) {
  const { id } = await params;
  if (!getOrder(id)) return missingOrder();
  try {
    const order = updateOrder(id, await readBody(request));
    return order
      ? Response.json(order, { headers: jsonHeaders })
      : missingOrder();
  } catch (error) {
    return errorResponse(error);
  }
}
export async function DELETE(_request: Request, { params }: Context) {
  const { id } = await params;
  return deleteOrder(id)
    ? new Response(null, { status: 204, headers: jsonHeaders })
    : missingOrder();
}
