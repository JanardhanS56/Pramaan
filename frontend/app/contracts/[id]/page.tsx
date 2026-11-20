"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ShieldAlert,
  Info,
  Copy,
  Check,
} from "lucide-react";
import { RangeVisualizer } from "@/components/RangeVisualizer";
import { OverrideModal } from "@/components/OverrideModal";
import {
  SuggestionCard,
  fetchSuggestionById,
  recordDecision,
  generateSuggestions,
} from "@/lib/api";

export default function ReadinessCardPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const [card, setCard] = useState<SuggestionCard | null>(null);
  const [confidence, setConfidence] = useState<number>(0.80);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [showOverride, setShowOverride] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [copiedHash, setCopiedHash] = useState(false);

  const loadCard = async (conf: number = confidence) => {
    try {
      setLoading(true);
      const data = await fetchSuggestionById(id);
      setCard(data);
      setConfidence(data.confidence || 0.80);
    } catch (e: any) {
      setFeedback({ type: "error", text: e?.message || "Failed to load card" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) {
      loadCard();
    }
  }, [id]);

  const handleConfidenceChange = async (newConf: number) => {
    setConfidence(newConf);
    try {
      setLoading(true);
      // Generate suggestion at new confidence level
      await generateSuggestions(newConf);
      // Reload card list or latest
      await loadCard(newConf);
    } catch (e: any) {
      // If generate fails, keep current
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCommit = async () => {
    if (!card) return;
    try {
      setActionLoading(true);
      setFeedback(null);
      await recordDecision(card.id, {
        action: "verify",
        committed_t: card.recommended_commitment_t || card.recommended_t,
        actor: "fpo_manager",
      });
      setFeedback({
        type: "success",
        text: `Verified stock and recorded commitment of ${card.recommended_commitment_t || card.recommended_t} t in audit log.`,
      });
    } catch (e: any) {
      setFeedback({ type: "error", text: e?.message || "Failed to record commitment." });
    } finally {
      setActionLoading(false);
    }
  };

  const handleOverrideSubmit = async (reason: string, actor: string) => {
    if (!card) return;
    await recordDecision(card.id, {
      action: "override",
      committed_t: card.buyer_requires_t || card.contract_quantity_t,
      reason,
      actor,
    });
    setFeedback({
      type: "success",
      text: `Board override recorded for ${card.buyer_requires_t || card.contract_quantity_t} t by ${actor}. Audit event saved.`,
    });
    setShowOverride(false);
  };

  const copyInputHash = () => {
    if (card?.input_hash) {
      navigator.clipboard.writeText(card.input_hash);
      setCopiedHash(true);
      setTimeout(() => setCopiedHash(false), 2000);
    }
  };

  if (loading && !card) {
    return (
      <div className="py-20 text-center text-slate-400">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500 mb-3" />
        <p>Loading Commitment Readiness Card...</p>
      </div>
    );
  }

  if (!card) {
    return (
      <div className="py-20 text-center text-slate-400">
        <p>Suggestion card not found.</p>
        <Link href="/" className="mt-4 inline-block text-emerald-400 font-semibold hover:underline">
          Return to Dashboard
        </Link>
      </div>
    );
  }

  const isGreen = card.status === "GREEN";
  const isAmber = card.status === "AMBER";
  const isRed = card.status === "RED";

  const statusColor = isGreen
    ? "bg-emerald-950/40 border-emerald-600 text-emerald-300"
    : isAmber
    ? "bg-amber-950/40 border-amber-600 text-amber-300"
    : "bg-red-950/40 border-red-600 text-red-300";

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Back button */}
      <div>
        <Link
          href="/"
          className="inline-flex items-center space-x-1.5 text-xs font-semibold text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Open Contracts</span>
        </Link>
      </div>

      {/* Main Readiness Card Container */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
        {/* Header Block */}
        <div className="p-6 sm:p-8 border-b border-slate-800">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <div className="flex items-center space-x-2 text-xs font-mono font-bold uppercase tracking-wider text-slate-400">
                <span>CONTRACT {card.contract_id}</span>
                <span>•</span>
                <span className="capitalize text-slate-300">{card.crop}</span>
                <span>•</span>
                <span>GRADE {card.grade || "A"}</span>
                {card.due_date && (
                  <>
                    <span>•</span>
                    <span>DUE {card.due_date}</span>
                  </>
                )}
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white mt-1">
                Buyer requires: <span className="text-white">{card.buyer_requires_t || card.contract_quantity_t} t</span>
              </h1>
              <p className="text-xs text-slate-400 mt-1">Buyer: {card.buyer_name || "Commercial Buyer"}</p>
            </div>

            {/* Confidence Level Selector */}
            <div className="bg-slate-950 p-1 rounded-xl border border-slate-800 flex items-center space-x-1">
              <span className="text-[11px] font-semibold text-slate-400 px-2">Confidence:</span>
              <button
                onClick={() => handleConfidenceChange(0.80)}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                  confidence === 0.80
                    ? "bg-emerald-600 text-white shadow-sm"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                80%
              </button>
              <button
                onClick={() => handleConfidenceChange(0.90)}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                  confidence === 0.90
                    ? "bg-emerald-600 text-white shadow-sm"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                90%
              </button>
            </div>
          </div>
        </div>

        {/* Feedback Alert */}
        {feedback && (
          <div
            className={`mx-6 mt-6 p-4 rounded-xl text-sm flex items-center space-x-3 border ${
              feedback.type === "success"
                ? "bg-emerald-950/40 border-emerald-700 text-emerald-200"
                : "bg-red-950/40 border-red-700 text-red-200"
            }`}
          >
            {feedback.type === "success" ? (
              <CheckCircle2 className="w-5 h-5 flex-shrink-0 text-emerald-400" />
            ) : (
              <XCircle className="w-5 h-5 flex-shrink-0 text-red-400" />
            )}
            <span>{feedback.text}</span>
          </div>
        )}

        {/* Status Banner */}
        <div className="p-6 sm:p-8 space-y-6">
          <div className={`p-5 rounded-xl border ${statusColor} flex items-start space-x-4 shadow-inner`}>
            {isGreen && <CheckCircle2 className="w-6 h-6 text-emerald-400 flex-shrink-0 mt-0.5" />}
            {isAmber && <AlertTriangle className="w-6 h-6 text-amber-400 flex-shrink-0 mt-0.5" />}
            {isRed && <XCircle className="w-6 h-6 text-red-400 flex-shrink-0 mt-0.5" />}
            <div>
              <div className="font-extrabold text-base sm:text-lg flex items-center space-x-2">
                <span>
                  {isGreen && "🟢 GREEN — Safe to commit full contract."}
                  {isAmber && `🟡 AMBER — Commit ${card.recommended_commitment_t || card.recommended_t} t now.`}
                  {isRed && `🔴 RED — Do not commit ${card.buyer_requires_t || card.contract_quantity_t} t.`}
                </span>
              </div>
              <p className="text-xs sm:text-sm mt-1 opacity-90 leading-relaxed">{card.message}</p>
            </div>
          </div>

          {/* Thin data warning banner if applicable */}
          {card.low_information && (
            <div className="p-4 rounded-xl bg-amber-950/20 border border-amber-800/60 text-xs text-amber-300 flex items-center space-x-3">
              <ShieldAlert className="w-5 h-5 flex-shrink-0 text-amber-400" />
              <span>
                Caution: Interval is wide due to thin historical calibration data. Status has been automatically
                downgraded for risk protection.
              </span>
            </div>
          )}

          {/* Range Visualizer (Horizontal Band Chart) */}
          <RangeVisualizer
            lower={card.lower_t}
            upper={card.upper_t}
            point={card.point_estimate_t || card.point_t}
            targetQ={card.buyer_requires_t || card.contract_quantity_t}
            confidence={confidence}
            crop={card.crop}
          />

          {/* Key Metrics Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                Point Estimate
              </span>
              <span className="text-2xl font-mono font-extrabold text-white">
                {(card.point_estimate_t || card.point_t).toFixed(1)} t
              </span>
              <span className="text-[11px] text-slate-500 block mt-1">Expected mean harvest</span>
            </div>

            <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                Shortfall Risk at {card.buyer_requires_t || card.contract_quantity_t} t
              </span>
              <span className={`text-2xl font-mono font-extrabold ${card.shortfall_risk > 0.5 ? "text-amber-400" : "text-emerald-400"}`}>
                {(card.shortfall_risk * 100).toFixed(0)}%
              </span>
              <span className="text-[11px] text-slate-500 block mt-1">Empirical predictive CDF</span>
            </div>

            <div className="bg-emerald-950/30 p-4 rounded-xl border border-emerald-800/80">
              <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider block mb-1">
                Recommended Commitment
              </span>
              <span className="text-3xl font-mono font-extrabold text-emerald-300">
                {(card.recommended_commitment_t || card.recommended_t).toFixed(0)} t
              </span>
              <span className="text-[11px] text-emerald-400/80 block mt-1">
                Pessimistic calibrated floor
              </span>
            </div>
          </div>

          {/* Explanatory Drivers */}
          <div className="bg-slate-950/40 p-5 rounded-xl border border-slate-800">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
              Why (Top Empirical Drivers):
            </h3>
            <ul className="space-y-2 text-sm text-slate-300">
              {card.drivers && card.drivers.length > 0 ? (
                card.drivers.map((d, idx) => (
                  <li key={idx} className="flex items-start space-x-2.5">
                    <span className="text-slate-500 font-bold">•</span>
                    <span>{d.label}</span>
                  </li>
                ))
              ) : (
                <li className="text-slate-500 text-xs">Standard historical yield and member performance metrics apply.</li>
              )}
            </ul>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-slate-800">
            <button
              onClick={handleVerifyCommit}
              disabled={actionLoading}
              className="w-full sm:w-auto px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 text-white font-bold text-sm transition-all shadow-lg flex items-center justify-center space-x-2"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Verify stock & commit {(card.recommended_commitment_t || card.recommended_t).toFixed(0)} t</span>
            </button>

            <button
              onClick={() => setShowOverride(true)}
              disabled={actionLoading}
              className="w-full sm:w-auto px-5 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-400 hover:text-amber-300 border border-slate-700 font-semibold text-sm transition-all flex items-center justify-center space-x-2"
            >
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              <span>Override → board</span>
            </button>
          </div>
        </div>

        {/* Footer Meta Strip */}
        <div className="bg-slate-950 px-6 py-4 border-t border-slate-800 text-xs text-slate-400 flex flex-wrap items-center justify-between gap-3 font-mono">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <span>Model: <strong className="text-slate-300">{card.model_version}</strong></span>
            <span>Calibration: <strong className="text-slate-300">{card.calibration_version}</strong></span>
            <span>n={card.calibration_size || card.calib_size}</span>
            <span>Backtest coverage: <strong className="text-emerald-400">{(card.backtest_coverage || 0.81).toFixed(2)}</strong></span>
          </div>

          <button
            onClick={copyInputHash}
            className="flex items-center space-x-1.5 text-slate-500 hover:text-slate-300 transition-colors"
            title="SHA-256 Input Hash"
          >
            {copiedHash ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>Hash: {card.input_hash.substring(0, 10)}...</span>
          </button>
        </div>
      </div>

      {/* Override Modal */}
      <OverrideModal
        isOpen={showOverride}
        onClose={() => setShowOverride(false)}
        onSubmit={handleOverrideSubmit}
        contractId={card.contract_id}
        recommendedT={card.recommended_commitment_t || card.recommended_t}
        requestedT={card.buyer_requires_t || card.contract_quantity_t}
        shortfallRisk={card.shortfall_risk}
        status={card.status}
      />
    </div>
  );
}
