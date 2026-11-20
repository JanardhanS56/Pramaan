import { NextRequest, NextResponse } from "next/server";
import { backtestReports } from "@/lib/serverlessData";

export async function GET(
  request: NextRequest,
  { params }: { params: { crop: string } }
) {
  const crop = params.crop?.toLowerCase();
  const report = backtestReports[crop];
  if (!report) {
    return NextResponse.json(
      { error: `Crop '${crop}' not found in backtest ledger` },
      { status: 404 }
    );
  }
  return NextResponse.json(report);
}
