import type { NextRequest } from "next/server";
import { forwardMultipartToBackend, requireSession, unauthorized } from "@/lib/adminProxy";

export async function POST(
  request: NextRequest,
  ctx: RouteContext<"/api/products/[id]/images">,
) {
  const session = await requireSession();
  if (!session) return unauthorized();

  const { id } = await ctx.params;
  return forwardMultipartToBackend(`/api/products/${id}/images`, request);
}
