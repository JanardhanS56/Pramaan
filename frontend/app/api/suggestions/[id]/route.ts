import { NextRequest, NextResponse } from "next/server";
import { initialSuggestions } from "@/lib/serverlessData";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const suggestion = initialSuggestions.find(
    (s) => s.id === params.id || s.contract_id === params.id || s.suggestion_id === params.id
  );

  if (!suggestion) {
    return NextResponse.json(
      { error: `Suggestion '${params.id}' not found` },
      { status: 404 }
    );
  }

  return NextResponse.json(suggestion);
}
