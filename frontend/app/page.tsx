"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, Sparkles, AlertCircle } from "lucide-react";
import { ModelHealthStrip } from "@/components/ModelHealthStrip";
import { SuggestionCard, fetchSuggestions, generateSuggestions } from "@/lib/api";

export default function DashboardPage() {
  const [suggestions, setSuggestions] = useState<SuggestionCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchSuggestions();
      setSuggestions(data);
    } catch (e: any) {
      setError(e?.message || "Failed to load contracts");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleGenerate = async () => {
    try {
      setGenerating(true);
      setError(null);
      await generateSuggestions(0.80);
      await loadData();
    } catch (e: any) {
      setError(e?.message || "Failed to generate suggestions. Verify backtest gates.");
    } finally {
      setGenerating(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "GREEN":
        return (
          <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-[#EAF2ED] text-[#1F4E35] border border-[#C5D8CC] inline-flex items-center space-x-1">
            <span>●</span>
            <span>GREEN</span>
          </span>
        );
      case "AMBER":
        return (
          <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-[#FFFAEB] text-[#B54708] border border-[#FEDF89] inline-flex items-center space-x-1">
            <span>●</span>
            <span>AMBER</span>
          </span>
        );
      case "RED":
        return (
          <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-[#FEF3F2] text-[#B42318] border border-[#FECDCA] inline-flex items-center space-x-1">
            <span>●</span>
            <span>RED</span>
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-[#F0F2F0] text-[#5A635E] border border-[#DCE1DD]">
            PENDING
          </span>
        );
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#1C201E]">
            Commitment Dashboard
          </h1>
          <p className="text-xs text-[#5A635E] mt-1">
            Empirical confidence intervals and rule-gated commitment readiness for open buyer contracts.
          </p>
        </div>

        <button
          onClick={handleGenerate}
          disabled={generating}
          className="px-3.5 py-2 bg-[#1F4E35] hover:bg-[#163A27] disabled:bg-[#DCE1DD] text-white rounded font-semibold text-xs transition-colors flex items-center space-x-2"
        >
          <Sparkles className={`w-3.5 h-3.5 ${generating ? "animate-spin text-[#EAF2ED]" : ""}`} />
          <span>{generating ? "Evaluating Gates..." : "Generate Suggestions"}</span>
        </button>
      </div>

      {error && (
        <div className="mb-6 p-3 bg-[#FEF3F2] border border-[#FECDCA] rounded text-xs text-[#B42318] flex items-center space-x-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0 text-[#B42318]" />
          <span>{error}</span>
        </div>
      )}

      {/* Model Health Strip */}
      <ModelHealthStrip />

      {/* Contracts Table */}
      <div className="bg-white border border-[#DCE1DD] rounded-md overflow-hidden mt-6">
        <div className="p-4 border-b border-[#DCE1DD] flex justify-between items-center bg-white">
          <h2 className="font-semibold text-xs uppercase tracking-wider text-[#1C201E]">
            Open Contracts & Readiness Cards
          </h2>
          <span className="text-xs text-[#5A635E] font-mono tabular-nums bg-[#F0F2F0] border border-[#DCE1DD] px-2 py-0.5 rounded">
            {suggestions.length} active suggestions
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-[#1C201E]">
            <thead className="bg-[#EAF2ED]/60 text-[11px] font-semibold text-[#5A635E] uppercase tracking-wider border-b border-[#DCE1DD]">
              <tr>
                <th className="py-2.5 px-4">Contract</th>
                <th className="py-2.5 px-4">Buyer</th>
                <th className="py-2.5 px-4">Crop & Grade</th>
                <th className="py-2.5 px-4">Required Q</th>
                <th className="py-2.5 px-4">Calibrated [L, U]</th>
                <th className="py-2.5 px-4">Recommended</th>
                <th className="py-2.5 px-4">Status</th>
                <th className="py-2.5 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#DCE1DD]">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-[#5A635E]">
                    Loading contracts and calibrated suggestions...
                  </td>
                </tr>
              ) : suggestions.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-[#5A635E]">
                    No active suggestions found. Click &quot;Generate Suggestions&quot; above to run the conformal pipeline.
                  </td>
                </tr>
              ) : (
                suggestions.map((s) => (
                  <tr key={s.id} className="hover:bg-[#EAF2ED]/25 transition-colors">
                    <td className="py-3 px-4 font-mono tabular-nums font-semibold text-[#1C201E]">
                      {s.contract_id}
                    </td>
                    <td className="py-3 px-4 text-[#1C201E]">
                      {s.buyer_name || "Commercial Buyer"}
                    </td>
                    <td className="py-3 px-4">
                      <span className="capitalize font-medium text-[#1C201E]">{s.crop}</span>
                      <span className="ml-1.5 text-[11px] font-mono tabular-nums text-[#5A635E] px-1 py-0.5 rounded bg-[#F0F2F0] border border-[#DCE1DD]">
                        Grade {s.grade || "A"}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono tabular-nums font-semibold text-[#1C201E]">
                      {s.buyer_requires_t || s.contract_quantity_t} t
                    </td>
                    <td className="py-3 px-4 font-mono tabular-nums text-xs text-[#5A635E]">
                      [{s.lower_t.toFixed(1)}t – {s.upper_t.toFixed(1)}t]
                    </td>
                    <td className="py-3 px-4 font-mono tabular-nums font-bold text-[#1F4E35]">
                      {s.recommended_commitment_t || s.recommended_t} t
                    </td>
                    <td className="py-3 px-4">{getStatusBadge(s.status)}</td>
                    <td className="py-3 px-4 text-right">
                      <Link
                        href={`/contracts/${s.id}`}
                        className="inline-flex items-center space-x-1 text-xs font-semibold px-2.5 py-1 rounded bg-white hover:bg-[#F0F2F0] text-[#1F4E35] border border-[#DCE1DD] transition-colors"
                      >
                        <span>View Card</span>
                        <ArrowUpRight className="w-3.5 h-3.5" />
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
