"use client";

import React from "react";

interface RangeVisualizerProps {
  lower: number;
  upper: number;
  point: number;
  targetQ: number;
  confidence: number;
  crop: string;
}

export function RangeVisualizer({
  lower,
  upper,
  point,
  targetQ,
  confidence,
  crop,
}: RangeVisualizerProps) {
  // Determine scale domain with 15% padding
  const minVal = Math.max(0, Math.min(lower, point, targetQ) * 0.8);
  const maxVal = Math.max(upper, point, targetQ) * 1.2;
  const range = maxVal - minVal || 1.0;

  const toPct = (val: number) => {
    const clamped = Math.max(minVal, Math.min(maxVal, val));
    return ((clamped - minVal) / range) * 100;
  };

  const lowerPct = toPct(lower);
  const upperPct = toPct(upper);
  const pointPct = toPct(point);
  const targetPct = toPct(targetQ);
  const bandWidthPct = Math.max(2, upperPct - lowerPct);

  const isQOutside = targetQ > upper || targetQ < lower;

  return (
    <div className="w-full bg-slate-900/40 p-5 rounded-xl border border-slate-800">
      <div className="flex justify-between items-center mb-3">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
          Calibrated Range ({Math.round(confidence * 100)}% Confidence)
        </span>
        <span className="text-xs font-mono text-slate-300">
          {lower.toFixed(1)} t ─────── {upper.toFixed(1)} t
        </span>
      </div>

      {/* Visual Chart Band */}
      <div className="relative h-20 w-full bg-slate-950 rounded-lg border border-slate-800/80 px-2 py-4 flex items-center overflow-hidden">
        {/* Grid lines */}
        <div className="absolute inset-0 flex justify-between px-6 pointer-events-none opacity-20">
          <div className="w-px h-full bg-slate-500" />
          <div className="w-px h-full bg-slate-500" />
          <div className="w-px h-full bg-slate-500" />
          <div className="w-px h-full bg-slate-500" />
        </div>

        {/* Confidence Interval Band */}
        <div
          className="absolute h-9 rounded-md bg-emerald-500/20 border border-emerald-500/60 transition-all duration-500 flex items-center justify-between px-2"
          style={{
            left: `${lowerPct}%`,
            width: `${bandWidthPct}%`,
          }}
        >
          <span className="text-[10px] font-mono text-emerald-400 font-bold">{lower.toFixed(1)}t</span>
          <span className="text-[10px] font-mono text-emerald-400 font-bold">{upper.toFixed(1)}t</span>
        </div>

        {/* Point Estimate Marker */}
        <div
          className="absolute top-2 bottom-2 w-1 bg-sky-400 rounded-full z-10 -ml-0.5 transition-all duration-500 shadow-sm"
          style={{ left: `${pointPct}%` }}
        >
          <div className="absolute -top-3.5 -left-4 px-1 bg-sky-950 border border-sky-600 rounded text-[9px] font-mono text-sky-300 whitespace-nowrap">
            Pt: {point.toFixed(1)}t
          </div>
        </div>

        {/* Contract Quantity Q Marker */}
        <div
          className={`absolute top-1 bottom-1 w-1.5 z-20 -ml-0.5 rounded-full transition-all duration-500 shadow-md ${
            isQOutside ? "bg-amber-400" : "bg-emerald-400"
          }`}
          style={{ left: `${targetPct}%` }}
        >
          <div
            className={`absolute -bottom-3.5 -left-6 px-1.5 py-0.5 rounded text-[10px] font-mono font-bold whitespace-nowrap ${
              isQOutside
                ? "bg-amber-950 text-amber-300 border border-amber-700"
                : "bg-emerald-950 text-emerald-300 border border-emerald-700"
            }`}
          >
            Buyer Q: {targetQ.toFixed(0)}t
          </div>
        </div>
      </div>

      {/* Legend & Meta */}
      <div className="flex flex-wrap items-center justify-between mt-3 text-xs text-slate-400 gap-2">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-1.5">
            <span className="w-3 h-3 rounded bg-emerald-500/30 border border-emerald-500/80" />
            <span>Calibrated Interval [{lower}t – {upper}t]</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-sky-400" />
            <span>Point Estimate ({point}t)</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <span className={`w-2.5 h-2.5 rounded-full ${isQOutside ? "bg-amber-400" : "bg-emerald-400"}`} />
            <span>Buyer Requirement ({targetQ}t)</span>
          </div>
        </div>
        {isQOutside && (
          <span className="text-amber-400 font-medium text-[11px]">
            ⚠️ Buyer requires {targetQ}t, which sits outside the empirical {Math.round(confidence * 100)}% interval.
          </span>
        )}
      </div>
    </div>
  );
}
