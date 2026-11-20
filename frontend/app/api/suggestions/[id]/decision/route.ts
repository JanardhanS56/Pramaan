import { NextRequest, NextResponse } from "next/server";
import { initialSuggestions, auditEvents } from "@/lib/serverlessData";

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { action, committed_t, reason, actor } = body;

    const suggestion = initialSuggestions.find(
      (s) => s.id === params.id || s.contract_id === params.id || s.suggestion_id === params.id
    );

    if (!suggestion) {
      return NextResponse.json(
        { detail: { error: { message: `Suggestion '${params.id}' not found` } } },
        { status: 404 }
      );
    }

    if (!actor || !actor.trim()) {
      return NextResponse.json(
        { detail: { error: { message: "Actor identifier is required for board audit governance" } } },
        { status: 422 }
      );
    }

    // Server-Side Firewall: Overriding AMBER or RED requires a mandatory non-empty reason
    if (action === "override") {
      if (!reason || !reason.trim()) {
        return NextResponse.json(
          { detail: { error: { message: "Override requires a non-empty reason and actor" } } },
          { status: 422 }
        );
      }
    }

    // Record immutable audit event
    const newEvent = {
      id: auditEvents.length + 1,
      entity: "contract",
      entity_id: suggestion.contract_id,
      event: action === "override" ? "BOARD_OVERRIDE" : "CONTRACT_ACCEPTED",
      payload: {
        action,
        committed_t,
        reason: reason || "Standard board acceptance of pessimistic lower bound",
        actor,
        status: suggestion.status,
        interval: [suggestion.lower_t, suggestion.upper_t],
      },
      created_at: new Date().toISOString(),
    };
    auditEvents.unshift(newEvent);

    return NextResponse.json({
      status: "recorded",
      action,
      committed_t,
      contract_id: suggestion.contract_id,
      actor,
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    return NextResponse.json(
      { detail: { error: { message: err?.message || "Invalid payload" } } },
      { status: 400 }
    );
  }
}
