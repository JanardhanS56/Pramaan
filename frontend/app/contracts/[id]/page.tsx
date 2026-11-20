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
      await generateSuggestions(newConf);
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
      <div className="py-20 text-center text-[#5A635E]">
        <div className="inline-block animate-spin rounded-full h-7 w-7 border-b-2 border-[#1F4E35] mb-3" />
        <p className="text-xs font-medium">Loading Commitment Readiness Card...</p>
      </div>
    );
  }

  if (!card) {
    return (
      <div className="py-20 text-center text-[#5A635E]">
        <p className="text-sm">Suggestion card not found.</p>
        <Link href="/" className="mt-3 inline-block text-[#1F4E35] font-semibold hover:underline text-xs">
          Return to Dashboard
        </Link>
      </div>
    );
  }

  const isGreen = card.status === "GREEN";
  const isAmber = card.status === "AMBER";
  const isRed = card.status === "RED";

  const statusColor = isGreen
    ? "bg-[#EAF2ED] border-[#C5D8CC] text-[#1F4E35]"
    : isAmber
    ? "bg-[#FFFAEB] border-[#FEDF89] text-[#B54708]"
    : "bg-[#FEF3F2] border-[#FECDCA] text-[#B42318]";

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Back button */}
      <div>
        <Link
          href="/"
          className="inline-flex items-center space-x-1.5 text-xs font-semibold text-[#5A635E] hover:text-[#1C201E] transition-colors focus:outline-none focus:ring-2 focus:ring-[#1F4E35]/20 rounded"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Open Contracts</span>
        </Link>
      </div>

      {/* Main Readiness Card Container */}
      <div className="bg-white border border-[#DCE1DD] rounded-md overflow-hidden">
        {/* Header Block */}
        <div className="p-6 border-b border-[#DCE1DD]">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <div className="flex items-center space-x-2 text-xs font-mono tabular-nums font-semibold uppercase tracking-wider text-[#5A635E]">
                <span>CONTRACT {card.contract_id}</span>
                <span>•</span>
                <span className="capitalize">{card.crop}</span>
                <span>•</span>
                <span>GRADE {card.grade || "A"}</span>
                {card.due_date && (
                  <>
                    <span>•</span>
                    <span>DUE {card.due_date}</span>
                  </>
                )}
              </div>
              <h1 className="text-2xl font-bold text-[#1C201E] mt-1">
                Buyer requires:{" "}
                <span className="font-mono tabular-nums">
                  {card.buyer_requires_t || card.contract_quantity_t} t
                </span>
              </h1>
              <p className="text-xs text-[#5A635E] mt-0.5">
                Buyer: {card.buyer_name || "Commercial Buyer"}
              </p>
            </div>

            {/* Confidence Level Selector */}
            <div className="bg-[#F0F2F0] p-0.5 rounded border border-[#DCE1DD] flex items-center space-x-1">
              <span className="text-[11px] font-semibold text-[#5A635E] px-2">Confidence:</span>
              <button
                onClick={() => handleConfidenceChange(0.80)}
                className={`px-2.5 py-1 rounded text-xs font-bold transition-all focus:outline-none focus:ring-2 focus:ring-[#1F4E35]/20 ${
                  confidence === 0.80
                    ? "bg-[#1F4E35] text-white"
                    : "text-[#5A635E] hover:text-[#1C201E]"
                }`}
              >
                80%
              </button>
              <button
                onClick={() => handleConfidenceChange(0.90)}
                className={`px-2.5 py-1 rounded text-xs font-bold transition-all focus:outline-none focus:ring-2 focus:ring-[#1F4E35]/20 ${
                  confidence === 0.90
                    ? "bg-[#1F4E35] text-white"
                    : "text-[#5A635E] hover:text-[#1C201E]"
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
            className={`mx-6 mt-6 p-3.5 rounded text-xs flex items-center space-x-2.5 border ${
              feedback.type === "success"
                ? "bg-[#EAF2ED] border-[#C5D8CC] text-[#1F4E35]"
                : "bg-[#FEF3F2] border-[#FECDCA] text-[#B42318]"
            }`}
          >
            {feedback.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-[#1F4E35]" />
            ) : (
              <XCircle className="w-4 h-4 flex-shrink-0 text-[#B42318]" />
            )}
            <span>{feedback.text}</span>
          </div>
        )}

        {/* Status Banner */}
        <div className="p-6 space-y-6">
          <div className={`p-4 rounded border ${statusColor} flex items-start space-x-3`}>
            {isGreen && <CheckCircle2 className="w-5 h-5 text-[#1F4E35] flex-shrink-0 mt-0.5" />}
            {isAmber && <AlertTriangle className="w-5 h-5 text-[#B54708] flex-shrink-0 mt-0.5" />}
            {isRed && <XCircle className="w-5 h-5 text-[#B42318] flex-shrink-0 mt-0.5" />}
            <div>
              <div className="font-bold text-sm sm:text-base flex items-center space-x-2">
                <span>
                  {isGreen && "GREEN — Safe to commit full contract."}
                  {isAmber && `AMBER — Commit ${(card.recommended_commitment_t || card.recommended_t).toFixed(0)} t now.`}
                  {isRed && `RED — Do not commit ${card.buyer_requires_t || card.contract_quantity_t} t.`}
                </span>
              </div>
              <p className="text-xs sm:text-sm mt-1 opacity-90 leading-relaxed">{card.message}</p>
            </div>
          </div>

          {/* Thin data warning banner if applicable */}
          {card.low_information && (
            <div className="p-3.5 rounded bg-[#FFFAEB] border border-[#FEDF89] text-xs text-[#B54708] flex items-center space-x-2.5">
              <ShieldAlert className="w-4 h-4 flex-shrink-0 text-[#B54708]" />
              <span>
                Caution: Calibrated interval is wide due to thin historical calibration data. Status has been automatically
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
            <div className="bg-white p-4 rounded-md border border-[#DCE1DD]">
              <span className="text-xs font-semibold text-[#5A635E] uppercase tracking-wider block mb-1">
                Point Estimate
              </span>
              <span className="text-2xl font-mono tabular-nums font-bold text-[#1C201E]">
                {(card.point_estimate_t || card.point_t).toFixed(1)} t
              </span>
              <span className="text-[11px] text-[#5A635E] block mt-1">Expected mean harvest</span>
            </div>

            <div className="bg-white p-4 rounded-md border border-[#DCE1DD]">
              <span className="text-xs font-semibold text-[#5A635E] uppercase tracking-wider block mb-1">
                Shortfall Risk at {card.buyer_requires_t || card.contract_quantity_t} t
              </span>
              <span className="text-2xl font-mono tabular-nums font-bold text-[#B54708]">
                {(card.shortfall_risk * 100).toFixed(0)}%
              </span>
              <span className="text-[11px] text-[#5A635E] block mt-1">Empirical predictive CDF</span>
            </div>

            <div className="bg-[#EAF2ED]/60 p-4 rounded-md border border-[#C5D8CC]">
              <span className="text-xs font-bold text-[#1F4E35] uppercase tracking-wider block mb-1">
                Recommended Commitment
              </span>
              <span className="text-2xl font-mono tabular-nums font-bold text-[#1F4E35]">
                {(card.recommended_commitment_t || card.recommended_t).toFixed(0)} t
              </span>
              <span className="text-[11px] text-[#1F4E35]/80 block mt-1">
                Pessimistic calibrated floor
              </span>
            </div>
          </div>

          {/* Explanatory Drivers */}
          <div className="bg-[#F9FAF8] p-4 rounded-md border border-[#DCE1DD]">
            <h3 className="text-xs font-bold text-[#1C201E] uppercase tracking-wider mb-2.5">
              Why (Top Empirical Drivers):
            </h3>
            <ul className="space-y-1.5 text-xs text-[#1C201E]">
              {card.drivers && card.drivers.length > 0 ? (
                card.drivers.map((d, idx) => (
                  <li key={idx} className="flex items-start space-x-2">
                    <span className="text-[#5A635E] font-bold">•</span>
                    <span>{d.label}</span>
                  </li>
                ))
              ) : (
                <li className="text-[#5A635E] text-xs">Standard historical yield and member performance metrics apply.</li>
              )}
            </ul>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-[#DCE1DD]">
            <button
              onClick={handleVerifyCommit}
              disabled={actionLoading}
              className="w-full sm:w-auto px-5 py-2.5 rounded bg-[#1F4E35] hover:bg-[#163A27] disabled:bg-[#DCE1DD] text-white font-semibold text-xs transition-colors flex items-center justify-center space-x-2 focus:outline-none focus:ring-2 focus:ring-[#1F4E35]/20"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Verify stock & commit {(card.recommended_commitment_t || card.recommended_t).toFixed(0)} t</span>
            </button>

            <button
              onClick={() => setShowOverride(true)}
              disabled={actionLoading}
              className="w-full sm:w-auto px-4 py-2.5 rounded bg-white hover:bg-[#FFFAEB] text-[#B54708] border border-[#FEDF89] font-semibold text-xs transition-colors flex items-center justify-center space-x-2 focus:outline-none focus:ring-2 focus:ring-[#B54708]/20"
            >
              <AlertTriangle className="w-3.5 h-3.5 text-[#B54708]" />
              <span>Override → board</span>
            </button>
          </div>
        </div>

        {/* Footer Meta Strip */}
        <div className="bg-[#F0F2F0] px-6 py-3 border-t border-[#DCE1DD] text-xs text-[#5A635E] flex flex-wrap items-center justify-between gap-3 font-mono tabular-nums">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <span>Model: <strong className="text-[#1C201E]">{card.model_version}</strong></span>
            <span>Calibration: <strong className="text-[#1C201E]">{card.calibration_version}</strong></span>
            <span>n={card.calibration_size || card.calib_size}</span>
            <span>Backtest cov: <strong className="text-[#1F4E35]">{(card.backtest_coverage || 0.81).toFixed(2)}</strong></span>
          </div>

          <button
            onClick={copyInputHash}
            className="flex items-center space-x-1.5 text-[#5A635E] hover:text-[#1C201E] transition-colors focus:outline-none focus:ring-2 focus:ring-[#1F4E35]/20 rounded px-1"
            title="SHA-256 Input Hash"
          >
            {copiedHash ? <Check className="w-3.5 h-3.5 text-[#1F4E35]" /> : <Copy className="w-3.5 h-3.5" />}
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
