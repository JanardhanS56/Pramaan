import { NextRequest, NextResponse } from "next/server";
import { initialSuggestions } from "@/lib/serverlessData";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status")?.toUpperCase();

  if (status) {
    const filtered = initialSuggestions.filter((s) => s.status === status);
    return NextResponse.json(filtered);
  }

  return NextResponse.json(initialSuggestions);
}
