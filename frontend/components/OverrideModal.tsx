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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-amber-600/60 rounded-2xl max-w-lg w-full p-6 text-white shadow-2xl animate-in fade-in zoom-in-95">
        <div className="flex justify-between items-start pb-4 border-b border-slate-800">
          <div className="flex items-center space-x-2 text-amber-400">
            <AlertTriangle className="w-5 h-5 flex-shrink-0" />
            <h3 className="font-bold text-lg">Board Override — {contractId}</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="my-4 p-4 rounded-xl bg-amber-950/30 border border-amber-800/60 text-xs space-y-2">
          <p className="text-amber-300 font-semibold">
            Liability Warning: You are overriding an engine recommendation.
          </p>
          <p className="text-slate-300">
            • Recommended commitment: <span className="font-bold text-white">{recommendedT} t</span>
          </p>
          <p className="text-slate-300">
            • Requested commitment: <span className="font-bold text-white">{requestedT} t</span>
          </p>
          <p className="text-slate-300">
            • Stated shortfall risk: <span className="font-bold text-amber-400">{(shortfallRisk * 100).toFixed(0)}%</span>
          </p>
          <p className="text-slate-400 text-[11px] pt-1">
            This action is permanently recorded in the append-only audit trail with actor name, timestamp, and SHA-256 state hash.
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-950/60 border border-red-700/80 rounded-lg text-xs text-red-200">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Actor / Authorized Board Member <span className="text-amber-400">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. board_chairperson, director_ops"
              value={actor}
              onChange={(e) => setActor(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Mandatory Override Reason <span className="text-amber-400">*</span>
            </label>
            <textarea
              required
              rows={3}
              placeholder="State explicit justification (e.g. verified 25t buffer stock in local cold storage warehouse; board resolution #42)."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
            />
          </div>

          <div className="flex justify-end space-x-3 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 text-xs font-bold text-slate-950 bg-amber-400 hover:bg-amber-300 rounded-lg transition-colors flex items-center space-x-1.5"
            >
              {loading ? "Recording..." : "Record Board Override"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
