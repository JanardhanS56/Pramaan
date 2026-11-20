"use client";

import React, { useEffect, useState } from "react";
import { History, Shield, Filter, RefreshCw } from "lucide-react";
import { AuditEvent, fetchAuditLogs } from "@/lib/api";

export default function AuditPage() {
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [entityFilter, setEntityFilter] = useState<string>("");
  const [loading, setLoading] = useState(true);

  const loadAudit = async () => {
    try {
      setLoading(true);
      const data = await fetchAuditLogs(entityFilter || undefined);
      setEvents(data);
    } catch (e) {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAudit();
  }, [entityFilter]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white flex items-center space-x-2">
            <Shield className="w-6 h-6 text-emerald-400" />
            <span>Immutable Audit Trail</span>
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Tamper-proof append-only ledger of all suggestions, board decisions, calibrations, and backtest gate executions.
          </p>
        </div>

        <button
          onClick={loadAudit}
          disabled={loading}
          className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-colors border border-slate-700"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          <span>Refresh Log</span>
        </button>
      </div>

      {/* Filter Strip */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex items-center space-x-3 text-xs">
        <Filter className="w-4 h-4 text-slate-400" />
        <span className="font-semibold text-slate-400">Filter Entity:</span>
        <select
          value={entityFilter}
          onChange={(e) => setEntityFilter(e.target.value)}
          className="bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1 text-white focus:outline-none focus:border-emerald-500 font-mono"
        >
          <option value="">All Entities</option>
          <option value="decision">decision</option>
          <option value="suggestion">suggestion</option>
          <option value="model_run">model_run</option>
          <option value="calibration_run">calibration_run</option>
          <option value="seed">seed</option>
        </select>
        <span className="text-slate-500 font-mono ml-auto">{events.length} audit records</span>
      </div>

      {/* Audit Log Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono text-slate-300">
            <thead className="bg-slate-950 text-slate-400 uppercase tracking-wider border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Event ID</th>
                <th className="py-3 px-4">Entity</th>
                <th className="py-3 px-4">Entity ID</th>
                <th className="py-3 px-4">Action / Event</th>
                <th className="py-3 px-4">Payload Details</th>
                <th className="py-3 px-4 text-right">Timestamp (UTC)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500 font-sans">
                    Loading audit trail...
                  </td>
                </tr>
              ) : events.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400 font-sans">
                    No audit records found matching filter.
                  </td>
                </tr>
              ) : (
                events.map((ev) => (
                  <tr key={ev.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-4 text-slate-400 font-bold">#{ev.id}</td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                        {ev.entity}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-bold text-slate-200">{ev.entity_id}</td>
                    <td className="py-3 px-4 font-semibold text-emerald-400">{ev.event}</td>
                    <td className="py-3 px-4 max-w-md truncate text-slate-400">
                      {JSON.stringify(ev.payload)}
                    </td>
                    <td className="py-3 px-4 text-right text-slate-400 whitespace-nowrap">
                      {new Date(ev.created_at).toLocaleString()}
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
