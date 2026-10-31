import { createOrder, listOrders } from "@/lib/orders-store";
import { readBody } from "@/lib/order-validation";
import { errorResponse, jsonHeaders } from "@/lib/api-response";
export const runtime = "nodejs";
export function GET() {
  return Response.json(listOrders(), { headers: jsonHeaders });
}
export async function POST(request: Request) {
  try {
    const order = createOrder(await readBody(request));
    return Response.json(order, { status: 201, headers: jsonHeaders });
  } catch (error) {
    return errorResponse(error);
  }
}
