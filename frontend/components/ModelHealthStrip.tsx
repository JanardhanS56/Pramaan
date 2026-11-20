"use client";

import React, { useEffect, useState } from "react";
import { CheckCircle2, XCircle, RefreshCw } from "lucide-react";
import { BacktestReport, fetchBacktestReport } from "@/lib/api";

export function ModelHealthStrip() {
  const [reports, setReports] = useState<Record<string, BacktestReport>>({});
  const [loading, setLoading] = useState(true);

  const crops = ["onion", "tomato", "paddy"];

  const loadHealth = async () => {
    try {
      setLoading(true);
      const data: Record<string, BacktestReport> = {};
      for (const crop of crops) {
        try {
          data[crop] = await fetchBacktestReport(crop);
        } catch (e) {
          // ignore if not yet calibrated
        }
      }
      setReports(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHealth();
  }, []);

  return (
    <div className="bg-white border border-[#DCE1DD] rounded-md p-4 my-6">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-3 border-b border-[#DCE1DD] pb-2.5">
        <div className="flex items-center space-x-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-[#5A635E]">
            Model Health & Backtest Coverage Gates
          </span>
          <span className="text-[11px] text-[#5A635E] font-mono tabular-nums">
            (Held-out 2024-RB Evaluation)
          </span>
        </div>
        <button
          onClick={loadHealth}
          disabled={loading}
          className="text-xs font-medium text-[#5A635E] hover:text-[#1C201E] bg-white hover:bg-[#F9FAF8] border border-[#DCE1DD] rounded px-2.5 py-1 flex items-center space-x-1.5 transition-colors"
        >
          <RefreshCw className={`w-3 h-3 ${loading ? "animate-spin text-[#1F4E35]" : ""}`} />
          <span>Refresh Gates</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {crops.map((crop) => {
          const r = reports[crop];
          const isOpen = r?.gate_status === "OPEN";
          const cov80 = r?.nominal_80?.empirical_coverage;
          const calibN = r?.calib_size || 0;

          return (
            <div
              key={crop}
              className={`p-3.5 bg-white border border-[#DCE1DD] rounded transition-colors ${
                r
                  ? isOpen
                    ? "border-t-2 border-t-[#1F4E35]"
                    : "border-t-2 border-t-[#B42318]"
                  : "border-t-2 border-t-[#DCE1DD]"
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="capitalize font-semibold text-xs text-[#1C201E]">{crop}</span>
                {r ? (
                  <span
                    className={`text-[10px] font-bold px-1.5 py-0.5 rounded font-mono ${
                      isOpen ? "bg-[#1F4E35] text-white" : "bg-[#B42318] text-white"
                    }`}
                  >
                    GATE {r.gate_status}
                  </span>
                ) : (
                  <span className="text-[10px] bg-[#F0F2F0] text-[#5A635E] border border-[#DCE1DD] px-1.5 py-0.5 rounded font-medium font-mono">
                    UNINITIALIZED
                  </span>
                )}
              </div>
              <div className="text-xs text-[#5A635E] flex items-center justify-between">
                {r ? (
                  <span>
                    Cov @0.80:{" "}
                    <strong
                      className={`font-mono tabular-nums font-bold ${
                        isOpen ? "text-[#1F4E35]" : "text-[#B42318]"
                      }`}
                    >
                      {(cov80! * 100).toFixed(0)}%
                    </strong>{" "}
                    <span className="font-mono tabular-nums text-[11px]">(n={calibN})</span>
                  </span>
                ) : (
                  <span className="text-[11px]">No backtest run recorded</span>
                )}
                {r &&
                  (isOpen ? (
                    <CheckCircle2 className="w-4 h-4 text-[#1F4E35] flex-shrink-0" />
                  ) : (
                    <XCircle className="w-4 h-4 text-[#B42318] flex-shrink-0" />
                  ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
