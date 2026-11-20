"use client";

import React, { useEffect, useState } from "react";
import { Filter, RefreshCw } from "lucide-react";
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
      {/* Clean Page Header (No shield icon) */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#1C201E]">
            Immutable Audit Trail
          </h1>
          <p className="text-xs text-[#5A635E] mt-1">
            Tamper-proof append-only ledger of all suggestions, board decisions, calibrations, and backtest gate executions.
          </p>
        </div>

        <button
          onClick={loadAudit}
          disabled={loading}
          className="px-3 py-1.5 bg-white hover:bg-[#F9FAF8] text-[#5A635E] hover:text-[#1C201E] border border-[#DCE1DD] rounded text-xs font-semibold flex items-center space-x-1.5 transition-colors focus:outline-none focus:ring-2 focus:ring-[#1F4E35]/20"
        >
          <RefreshCw className={`w-3 h-3 ${loading ? "animate-spin text-[#1F4E35]" : ""}`} />
          <span>Refresh Log</span>
        </button>
      </div>

      {/* Audit Log Table with Integrated Toolbar */}
      <div className="bg-white border border-[#DCE1DD] rounded-md overflow-hidden mt-6">
        {/* Integrated Toolbar Header */}
        <div className="p-4 border-b border-[#DCE1DD] flex flex-wrap items-center justify-between gap-3 bg-white">
          <div className="flex items-center space-x-3 text-xs">
            <div className="flex items-center space-x-1.5 text-[#5A635E] font-medium">
              <Filter className="w-3.5 h-3.5" />
              <span>Filter Entity:</span>
            </div>
            <select
              value={entityFilter}
              onChange={(e) => setEntityFilter(e.target.value)}
              className="bg-[#F9FAF8] border border-[#DCE1DD] rounded px-2.5 py-1 text-xs text-[#1C201E] focus:outline-none focus:ring-2 focus:ring-[#1F4E35]/20 focus:border-[#1F4E35] font-mono tabular-nums font-medium"
            >
              <option value="">All Entities</option>
              <option value="decision">decision</option>
              <option value="suggestion">suggestion</option>
              <option value="model_run">model_run</option>
              <option value="calibration_run">calibration_run</option>
              <option value="seed">seed</option>
            </select>
          </div>

          <span className="text-xs text-[#5A635E] font-mono tabular-nums bg-[#F0F2F0] border border-[#DCE1DD] px-2 py-0.5 rounded">
            {events.length} audit records
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono tabular-nums text-[#1C201E]">
            <thead className="bg-[#EAF2ED] text-[11px] font-semibold text-[#5A635E] uppercase tracking-wider border-b border-[#DCE1DD]">
              <tr>
                <th className="py-3 px-5">Event ID</th>
                <th className="py-3 px-5">Entity</th>
                <th className="py-3 px-5">Entity ID</th>
                <th className="py-3 px-5">Action / Event</th>
                <th className="py-3 px-5">Payload Details</th>
                <th className="py-3 px-5 text-right">Timestamp (UTC)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#DCE1DD]">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-[#5A635E] font-sans">
                    Loading audit trail...
                  </td>
                </tr>
              ) : events.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-[#5A635E] font-sans">
                    No audit records found matching filter.
                  </td>
                </tr>
              ) : (
                events.map((ev) => (
                  <tr
                    key={ev.id}
                    className="even:bg-[#FAFBF9] hover:bg-[#F4F7F5] transition-colors"
                  >
                    <td className="py-3.5 px-5 text-[#5A635E] font-bold">#{ev.id}</td>
                    <td className="py-3.5 px-5">
                      <span className="px-1.5 py-0.5 rounded bg-[#F0F2F0] text-[#5A635E] border border-[#DCE1DD] text-[11px]">
                        {ev.entity}
                      </span>
                    </td>
                    <td className="py-3.5 px-5 font-semibold text-[#1C201E]">{ev.entity_id}</td>
                    <td className="py-3.5 px-5">
                      <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-[#EAF2ED] text-[#1F4E35]">
                        {ev.event}
                      </span>
                    </td>
                    <td className="py-3.5 px-5 max-w-sm sm:max-w-md">
                      <span
                        title={JSON.stringify(ev.payload, null, 2)}
                        className="cursor-help bg-[#F0F2F0] border border-[#DCE1DD] text-[#5A635E] px-1.5 py-0.5 rounded text-[11px] block truncate"
                      >
                        {JSON.stringify(ev.payload)}
                      </span>
                    </td>
                    <td className="py-3.5 px-5 text-right text-[#5A635E] whitespace-nowrap">
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
