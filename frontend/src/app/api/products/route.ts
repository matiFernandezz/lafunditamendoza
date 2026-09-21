import type { NextRequest } from "next/server";
import { forwardToBackend, requireSession, unauthorized } from "@/lib/adminProxy";

export async function GET(request: NextRequest) {
  const session = await requireSession();
  if (!session) return unauthorized();

  return forwardToBackend(`/api/products${request.nextUrl.search}`);
}

export async function POST(request: NextRequest) {
  const session = await requireSession();
  if (!session) return unauthorized();

  const body = await request.text();
  return forwardToBackend("/api/products", { method: "POST", body });
}
