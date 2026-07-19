import { NextRequest, NextResponse } from "next/server";
import { requireBranchManager } from "@/lib/auth";
import { getAuthorizedGoogleClient } from "@/lib/google";

export async function GET(request: NextRequest) {
  const branchId = request.nextUrl.searchParams.get("branchId");
  if (!branchId) return NextResponse.json({ error: "branchId mancante" }, { status: 400 });
  await requireBranchManager(branchId);
  try {
    const { client } = await getAuthorizedGoogleClient(branchId);
    const token = await client.getAccessToken();
    return NextResponse.json({ accessToken: token.token });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Google non disponibile" }, { status: 503 });
  }
}
