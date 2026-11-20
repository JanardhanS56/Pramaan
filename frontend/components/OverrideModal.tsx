"use client";

import React, { useState } from "react";
import { AlertTriangle, X } from "lucide-react";

interface OverrideModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (reason: string, actor: string) => Promise<void>;
  contractId: string;
  recommendedT: number;
  requestedT: number;
  shortfallRisk: number;
  status: string;
}

export function OverrideModal({
  isOpen,
  onClose,
  onSubmit,
  contractId,
  recommendedT,
  requestedT,
  shortfallRisk,
  status,
}: OverrideModalProps) {
  const [reason, setReason] = useState("");
  const [actor, setActor] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) {
      setError("Overriding an AMBER/RED recommendation requires a non-empty reason.");
      return;
    }
    if (!actor.trim()) {
      setError("Actor name or board role is mandatory for liability audit.");
      return;
    }

    try {
      setLoading(true);
      setError(null);
      await onSubmit(reason.trim(), actor.trim());
      onClose();
    } catch (err: any) {
      setError(err?.message || "Failed to submit decision override.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#1C201E]/40 backdrop-blur-none p-4">
      <div className="bg-white border border-[#DCE1DD] rounded-md max-w-lg w-full p-6 text-[#1C201E] shadow-xl">
        <div className="flex justify-between items-start pb-3 border-b border-[#DCE1DD]">
          <div className="flex items-center space-x-2 text-[#B54708]">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            <h3 className="font-semibold text-sm text-[#1C201E]">
              Board Override — <span className="font-mono tabular-nums">{contractId}</span>
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-[#5A635E] hover:text-[#1C201E] transition-colors focus:outline-none focus:ring-2 focus:ring-[#1F4E35]/20 rounded"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="my-4 p-3.5 rounded bg-[#FFFAEB] border border-[#FEDF89] text-xs space-y-1.5">
          <p className="text-[#B54708] font-semibold">
            Liability Warning: You are overriding the engine&apos;s empirical recommendation.
          </p>
          <p className="text-[#1C201E]">
            • Recommended commitment:{" "}
            <span className="font-mono tabular-nums font-semibold">{recommendedT} t</span>
          </p>
          <p className="text-[#1C201E]">
            • Requested commitment:{" "}
            <span className="font-mono tabular-nums font-semibold">{requestedT} t</span>
          </p>
          <p className="text-[#1C201E]">
            • Stated shortfall risk:{" "}
            <span className="font-mono tabular-nums font-semibold text-[#B54708]">
              {(shortfallRisk * 100).toFixed(0)}%
            </span>
          </p>
          <p className="text-[#5A635E] text-[11px] pt-1.5 border-t border-[#FEDF89]">
            This action is permanently recorded in the append-only audit trail with actor identity, timestamp, and SHA-256 state hash.
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-[#FEF3F2] border border-[#FECDCA] rounded text-xs text-[#B42318]">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[#1C201E] mb-1">
              Actor / Authorized Board Member <span className="text-[#B54708]">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. board_chairperson, director_ops"
              value={actor}
              onChange={(e) => setActor(e.target.value)}
              className="w-full bg-white border border-[#DCE1DD] rounded px-3 py-2 text-xs text-[#1C201E] focus:outline-none focus:ring-2 focus:ring-[#1F4E35]/20 focus:border-[#1F4E35] transition-all"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#1C201E] mb-1">
              Mandatory Override Reason <span className="text-[#B54708]">*</span>
            </label>
            <textarea
              required
              rows={3}
              placeholder="State explicit justification (e.g. verified 25t buffer stock in local cold storage warehouse; board resolution #42)."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full bg-white border border-[#DCE1DD] rounded px-3 py-2 text-xs text-[#1C201E] focus:outline-none focus:ring-2 focus:ring-[#1F4E35]/20 focus:border-[#1F4E35] transition-all"
            />
          </div>

          <div className="flex justify-end space-x-2.5 pt-3 border-t border-[#DCE1DD]">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 text-xs font-medium text-[#1C201E] bg-[#F0F2F0] hover:bg-[#E2E6E2] border border-[#DCE1DD] rounded transition-colors focus:outline-none focus:ring-2 focus:ring-[#1F4E35]/20"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 text-xs font-semibold text-white bg-[#B54708] hover:bg-[#93370D] rounded transition-colors flex items-center space-x-1.5 focus:outline-none focus:ring-2 focus:ring-[#B54708]/30"
            >
              {loading ? "Recording..." : "Record Board Override"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
