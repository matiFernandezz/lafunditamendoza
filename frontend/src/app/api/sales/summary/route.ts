import type { NextRequest } from "next/server";
import { forwardToBackend, requireSession, unauthorized } from "@/lib/adminProxy";

export async function GET(request: NextRequest) {
  const session = await requireSession();
  if (!session) return unauthorized();

  const query = request.nextUrl.searchParams.toString();
  return forwardToBackend(`/api/sales/summary${query ? `?${query}` : ""}`);
}
