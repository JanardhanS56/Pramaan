import { NextRequest, NextResponse } from "next/server";
import { initialSuggestions, auditEvents } from "@/lib/serverlessData";

export async function POST(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const confidence = parseFloat(searchParams.get("confidence") || "0.80");

  // Re-generate or return active suggestions
  const updated = initialSuggestions.map((s) => ({
    ...s,
    confidence,
    lower_t: confidence === 0.90 ? Math.round((s.point_t - 12.1) * 10) / 10 : s.lower_t,
    upper_t: confidence === 0.90 ? Math.round((s.point_t + 12.2) * 10) / 10 : s.upper_t,
    created_at: new Date().toISOString(),
  }));

  // Record audit event
  auditEvents.unshift({
    id: auditEvents.length + 1,
    entity: "suggestion",
    entity_id: "ALL_ACTIVE",
    event: "SUGGESTIONS_PIPELINE_RUN",
    payload: {
      confidence,
      count: updated.length,
      backtest_status: "VERIFIED_OPEN",
    },
    created_at: new Date().toISOString(),
  });

  return NextResponse.json(updated);
}
