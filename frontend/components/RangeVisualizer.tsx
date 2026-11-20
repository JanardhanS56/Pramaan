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
    <div className="w-full bg-[#F9FAF8] p-4 sm:p-5 rounded-md border border-[#DCE1DD]">
      <div className="flex justify-between items-center mb-3">
        <span className="text-xs font-semibold uppercase tracking-wider text-[#5A635E]">
          Calibrated Range ({Math.round(confidence * 100)}% Confidence)
        </span>
        <span className="text-xs font-mono tabular-nums font-semibold text-[#1C201E]">
          {lower.toFixed(1)} t ─────── {upper.toFixed(1)} t
        </span>
      </div>

      {/* Visual Chart Band */}
      <div className="relative h-16 w-full bg-white rounded border border-[#DCE1DD] px-2 py-3 flex items-center overflow-hidden">
        {/* Crisp Hairline Grid lines */}
        <div className="absolute inset-0 flex justify-between px-6 pointer-events-none opacity-40">
          <div className="w-px h-full bg-[#DCE1DD]" />
          <div className="w-px h-full bg-[#DCE1DD]" />
          <div className="w-px h-full bg-[#DCE1DD]" />
          <div className="w-px h-full bg-[#DCE1DD]" />
        </div>

        {/* Confidence Interval Band */}
        <div
          className="absolute h-8 rounded bg-[#EAF2ED] border-y border-[#1F4E35]/40 transition-all duration-300 flex items-center justify-between px-2"
          style={{
            left: `${lowerPct}%`,
            width: `${bandWidthPct}%`,
          }}
        >
          <span className="text-[10px] font-mono tabular-nums text-[#1F4E35] font-bold">
            {lower.toFixed(1)}t
          </span>
          <span className="text-[10px] font-mono tabular-nums text-[#1F4E35] font-bold">
            {upper.toFixed(1)}t
          </span>
        </div>

        {/* Point Estimate Marker */}
        <div
          className="absolute top-1.5 bottom-1.5 w-0.5 bg-[#1C201E] z-10 -ml-[1px] transition-all duration-300"
          style={{ left: `${pointPct}%` }}
        >
          <div className="absolute -top-3.5 -left-4 px-1 bg-white border border-[#DCE1DD] rounded text-[9px] font-mono tabular-nums text-[#1C201E] font-medium whitespace-nowrap shadow-sm">
            Pt: {point.toFixed(1)}t
          </div>
        </div>

        {/* Contract Quantity Q Marker */}
        <div
          className={`absolute top-1 bottom-1 w-1 z-20 -ml-0.5 rounded transition-all duration-300 ${
            isQOutside ? "bg-[#B54708]" : "bg-[#1F4E35]"
          }`}
          style={{ left: `${targetPct}%` }}
        >
          <div
            className={`absolute -bottom-3.5 -left-6 px-1.5 py-0.5 rounded text-[10px] font-mono tabular-nums font-bold whitespace-nowrap ${
              isQOutside
                ? "bg-[#FFFAEB] text-[#B54708] border border-[#FEDF89]"
                : "bg-[#EAF2ED] text-[#1F4E35] border border-[#C5D8CC]"
            }`}
          >
            Buyer Q: {targetQ.toFixed(0)}t
          </div>
        </div>
      </div>

      {/* Legend & Meta */}
      <div className="flex flex-wrap items-center justify-between mt-3 text-xs text-[#5A635E] gap-2">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-1.5">
            <span className="w-3 h-2 rounded bg-[#EAF2ED] border border-[#1F4E35]/40 inline-block" />
            <span>Calibrated [{lower.toFixed(1)}t – {upper.toFixed(1)}t]</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <span className="w-2 h-2 rounded-full bg-[#1C201E] inline-block" />
            <span>Point ({point.toFixed(1)}t)</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <span
              className={`w-2 h-2 rounded-full inline-block ${
                isQOutside ? "bg-[#B54708]" : "bg-[#1F4E35]"
              }`}
            />
            <span>Buyer Req ({targetQ.toFixed(0)}t)</span>
          </div>
        </div>
        {isQOutside && (
          <span className="text-[#B54708] bg-[#FFFAEB] border border-[#FEDF89] px-2 py-0.5 rounded font-medium text-[11px]">
            Buyer requires {targetQ}t, which exceeds calibrated {Math.round(confidence * 100)}% bound.
          </span>
        )}
      </div>
    </div>
  );
}
