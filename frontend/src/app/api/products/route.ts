import type { NextRequest } from "next/server";
import { forwardToBackend, requireSession, unauthorized } from "@/lib/adminProxy";

export async function GET(request: NextRequest) {
  const session = await requireSession();
  if (!session) return unauthorized();

  return forwardToBackend(`/api/products${request.nextUrl.search}`);
}
