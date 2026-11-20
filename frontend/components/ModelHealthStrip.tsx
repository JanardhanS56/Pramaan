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
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 my-6 text-white">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-3 border-b border-slate-800 pb-3">
        <div className="flex items-center space-x-2">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Model Health & Backtest Coverage Gates
          </span>
          <span className="text-[11px] text-slate-500 font-mono">(Held-out 2024-RB Evaluation)</span>
        </div>
        <button
          onClick={loadHealth}
          disabled={loading}
          className="text-xs text-slate-400 hover:text-white flex items-center space-x-1 transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
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
              className={`p-3 rounded-lg border flex items-center justify-between ${
                r
                  ? isOpen
                    ? "bg-emerald-950/20 border-emerald-800/60"
                    : "bg-red-950/20 border-red-800/60"
                  : "bg-slate-950/40 border-slate-800 text-slate-500"
              }`}
            >
              <div>
                <div className="flex items-center space-x-1.5">
                  <span className="capitalize font-bold text-sm text-slate-200">{crop}</span>
                  {r ? (
                    <span
                      className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                        isOpen ? "bg-emerald-900 text-emerald-300" : "bg-red-900 text-red-300"
                      }`}
                    >
                      GATE {r.gate_status}
                    </span>
                  ) : (
                    <span className="text-[10px] bg-slate-800 px-1.5 py-0.5 rounded text-slate-400">UNINITIALIZED</span>
                  )}
                </div>
                <div className="text-xs text-slate-400 mt-1">
                  {r ? (
                    <span>
                      Cov @0.80: <strong className="text-white">{(cov80! * 100).toFixed(0)}%</strong> (n={calibN})
                    </span>
                  ) : (
                    <span>No backtest run recorded</span>
                  )}
                </div>
              </div>

              {r ? (
                isOpen ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                ) : (
                  <XCircle className="w-5 h-5 text-red-400" />
                )
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
