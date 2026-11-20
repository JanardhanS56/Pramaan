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
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-950 text-emerald-400 border border-emerald-800">🟢 GREEN</span>;
      case "AMBER":
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-950 text-amber-300 border border-amber-800">🟡 AMBER</span>;
      case "RED":
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-red-950 text-red-400 border border-red-800">🔴 RED</span>;
      default:
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-slate-800 text-slate-400">PENDING</span>;
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
            Commitment Dashboard
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Empirical confidence intervals and rule-gated commitment readiness for open buyer contracts.
          </p>
        </div>

        <button
          onClick={handleGenerate}
          disabled={generating}
          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 text-white rounded-lg font-semibold text-sm transition-all shadow-lg flex items-center space-x-2"
        >
          <Sparkles className={`w-4 h-4 ${generating ? "animate-spin" : ""}`} />
          <span>{generating ? "Evaluating Gates..." : "Generate Suggestions"}</span>
        </button>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-950/60 border border-red-800 rounded-xl text-sm text-red-200 flex items-center space-x-3">
          <AlertCircle className="w-5 h-5 flex-shrink-0 text-red-400" />
          <span>{error}</span>
        </div>
      )}

      {/* Model Health Strip */}
      <ModelHealthStrip />

      {/* Contracts Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl mt-6">
        <div className="p-4 sm:p-5 border-b border-slate-800 flex justify-between items-center">
          <h2 className="font-bold text-base text-white">Open Contracts & Readiness Cards</h2>
          <span className="text-xs text-slate-400 font-mono">{suggestions.length} active suggestions</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-950/60 text-xs font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Contract</th>
                <th className="py-3 px-4">Buyer</th>
                <th className="py-3 px-4">Crop & Grade</th>
                <th className="py-3 px-4">Required Q</th>
                <th className="py-3 px-4">Calibrated [L, U]</th>
                <th className="py-3 px-4">Recommended</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-500">
                    Loading contracts and calibrated suggestions...
                  </td>
                </tr>
              ) : suggestions.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    No active suggestions found. Click &quot;Generate Suggestions&quot; above to run the conformal pipeline.
                  </td>
                </tr>
              ) : (
                suggestions.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-200">
                      {s.contract_id}
                    </td>
                    <td className="py-3.5 px-4 text-slate-300">{s.buyer_name || "Commercial Buyer"}</td>
                    <td className="py-3.5 px-4">
                      <span className="capitalize font-semibold text-slate-200">{s.crop}</span>
                      <span className="ml-1.5 text-xs font-mono text-slate-400 px-1.5 py-0.5 rounded bg-slate-800">
                        Grade {s.grade || "A"}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-mono font-bold text-white">
                      {s.buyer_requires_t || s.contract_quantity_t} t
                    </td>
                    <td className="py-3.5 px-4 font-mono text-xs text-slate-300">
                      [{s.lower_t.toFixed(1)}t – {s.upper_t.toFixed(1)}t]
                    </td>
                    <td className="py-3.5 px-4 font-mono font-bold text-emerald-400">
                      {s.recommended_commitment_t || s.recommended_t} t
                    </td>
                    <td className="py-3.5 px-4">{getStatusBadge(s.status)}</td>
                    <td className="py-3.5 px-4 text-right">
                      <Link
                        href={`/contracts/${s.id}`}
                        className="inline-flex items-center space-x-1 text-xs font-semibold px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-emerald-400 hover:text-emerald-300 border border-slate-700 transition-colors"
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
