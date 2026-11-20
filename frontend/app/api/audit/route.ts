import { NextRequest, NextResponse } from "next/server";
import { auditEvents } from "@/lib/serverlessData";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const entity = searchParams.get("entity")?.toLowerCase();

  if (entity) {
    const filtered = auditEvents.filter((e) => e.entity.toLowerCase() === entity);
    return NextResponse.json(filtered);
  }

  return NextResponse.json(auditEvents);
}
