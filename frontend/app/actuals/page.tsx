"use client";

import React, { useState } from "react";
import { Scale, CheckCircle2, AlertTriangle, Truck } from "lucide-react";

export default function ActualsPage() {
  const [contractId, setContractId] = useState("CTR-2025-07");
  const [deliveredT, setDeliveredT] = useState("");
  const [grade, setGrade] = useState("A");
  const [status, setStatus] = useState<string | null>(null);

  const pastDeliveries = [
    { id: "CTR-2023-01", buyer: "Nashik APMC Mandi", crop: "onion", req: 75.0, delivered: 72.5, shortfall: 0.0, status: "Fulfilled" },
    { id: "CTR-2023-02", buyer: "Sahyadri Processors", crop: "tomato", req: 85.0, delivered: 61.2, shortfall: 23.8, status: "Shortfall (Default)" },
    { id: "CTR-2023-03", buyer: "Mahagrapes Cold Chain", crop: "onion", req: 110.0, delivered: 112.0, shortfall: 0.0, status: "Fulfilled" },
    { id: "CTR-2024-01", buyer: "Deccan Rice Millers", crop: "paddy", req: 45.0, delivered: 46.8, shortfall: 0.0, status: "Fulfilled" },
  ];

  const handleRecordDelivery = (e: React.FormEvent) => {
    e.preventDefault();
    setStatus(`Delivery of ${deliveredT} t (Grade ${grade}) logged for ${contractId}. Conformal calibration ledger updated.`);
    setDeliveredT("");
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-[#1C201E]">
          Actuals & Calibration Ledger
        </h1>
        <p className="text-xs text-[#5A635E] mt-1">
          Record actual harvest yields and buyer deliveries. The conformal calibration ledger depends on honest actuals.
        </p>
      </div>

      {/* Entry Form with subtle Farmer Green left accent */}
      <div className="bg-white border border-[#DCE1DD] border-l-[3px] border-l-[#1F4E35] rounded-md p-6">
        <div className="flex items-center space-x-2 mb-4">
          <Truck className="w-3.5 h-3.5 text-[#1F4E35]" />
          <h2 className="text-xs font-semibold uppercase tracking-wider text-[#1C201E]">
            Record Delivery Outcome
          </h2>
        </div>

        {status && (
          <div className="mb-4 p-3.5 rounded bg-[#EAF2ED] border border-[#C5D8CC] text-[#1F4E35] text-xs flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-[#1F4E35]" />
            <span>{status}</span>
          </div>
        )}

        <form onSubmit={handleRecordDelivery} className="grid grid-cols-1 sm:grid-cols-4 gap-4 items-end">
          <div>
            <label className="block text-xs font-semibold text-[#5A635E] mb-1.5">
              Contract ID
            </label>
            <input
              type="text"
              required
              value={contractId}
              onChange={(e) => setContractId(e.target.value)}
              className="w-full bg-white border border-[#DCE1DD] rounded px-3 py-2 text-xs text-[#1C201E] focus:outline-none focus:ring-2 focus:ring-[#1F4E35]/20 focus:border-[#1F4E35] font-mono tabular-nums transition-all"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#5A635E] mb-1.5">
              Delivered Quantity (t)
            </label>
            <input
              type="number"
              step="0.1"
              required
              placeholder="e.g. 72.5"
              value={deliveredT}
              onChange={(e) => setDeliveredT(e.target.value)}
              className="w-full bg-white border border-[#DCE1DD] rounded px-3 py-2 text-xs text-[#1C201E] focus:outline-none focus:ring-2 focus:ring-[#1F4E35]/20 focus:border-[#1F4E35] font-mono tabular-nums transition-all"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#5A635E] mb-1.5">
              Delivered Grade
            </label>
            <select
              value={grade}
              onChange={(e) => setGrade(e.target.value)}
              className="w-full bg-white border border-[#DCE1DD] rounded px-3 py-2 text-xs text-[#1C201E] focus:outline-none focus:ring-2 focus:ring-[#1F4E35]/20 focus:border-[#1F4E35] font-medium transition-all"
            >
              <option value="A">Grade A</option>
              <option value="B">Grade B</option>
              <option value="C">Grade C</option>
            </select>
          </div>

          <div>
            <button
              type="submit"
              className="w-full px-4 py-2 bg-[#1F4E35] hover:bg-[#163A27] text-white rounded font-semibold text-xs transition-colors focus:outline-none focus:ring-2 focus:ring-[#1F4E35]/20"
            >
              Log Delivery
            </button>
          </div>
        </form>
      </div>

      {/* Historical Ledger Table (High-Trust Accounting Ledger) */}
      <div className="bg-white border border-[#DCE1DD] rounded-md overflow-hidden mt-6">
        <div className="p-4 border-b border-[#DCE1DD] flex justify-between items-center bg-white">
          <div className="flex items-center space-x-2">
            <Scale className="w-3.5 h-3.5 text-[#1F4E35]" />
            <h2 className="font-semibold text-xs uppercase tracking-wider text-[#1C201E]">
              Historical Delivery Ledger (Residual Ground Truth)
            </h2>
          </div>
          <span className="text-xs text-[#5A635E] font-mono tabular-nums bg-[#F0F2F0] border border-[#DCE1DD] px-2 py-0.5 rounded">
            4 completed contracts
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-[#1C201E]">
            <thead className="bg-[#EAF2ED] text-[11px] font-semibold text-[#5A635E] uppercase tracking-wider border-b border-[#DCE1DD]">
              <tr>
                <th className="py-3 px-5">Contract</th>
                <th className="py-3 px-5">Buyer</th>
                <th className="py-3 px-5">Crop</th>
                <th className="py-3 px-5 text-right">Required</th>
                <th className="py-3 px-5 text-right">Delivered</th>
                <th className="py-3 px-5 text-right">Shortfall</th>
                <th className="py-3 px-5 text-right">Outcome</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#DCE1DD]">
              {pastDeliveries.map((d) => (
                <tr
                  key={d.id}
                  className="even:bg-[#FAFBF9] hover:bg-[#F4F7F5] transition-colors"
                >
                  <td className="py-3.5 px-5 font-mono tabular-nums font-semibold text-[#1C201E]">
                    {d.id}
                  </td>
                  <td className="py-3.5 px-5 font-sans text-[#1C201E]">{d.buyer}</td>
                  <td className="py-3.5 px-5 capitalize font-sans">{d.crop}</td>
                  <td className="py-3.5 px-5 text-right font-mono tabular-nums text-[#5A635E]">
                    {d.req.toFixed(1)} t
                  </td>
                  <td className="py-3.5 px-5 text-right font-mono tabular-nums font-bold text-[#1C201E]">
                    {d.delivered.toFixed(1)} t
                  </td>
                  <td
                    className={`py-3.5 px-5 text-right font-mono tabular-nums font-bold ${
                      d.shortfall > 0 ? "text-[#B42318]" : "text-[#5A635E]"
                    }`}
                  >
                    {d.shortfall > 0 ? `${d.shortfall.toFixed(1)} t` : "0.0 t"}
                  </td>
                  <td className="py-3.5 px-5 text-right font-sans">
                    {d.shortfall > 0 ? (
                      <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-[#FEF3F2] text-[#B42318] inline-flex items-center space-x-1">
                        <AlertTriangle className="w-3 h-3 text-[#B42318]" />
                        <span>{d.status}</span>
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-[#EAF2ED] text-[#1F4E35] inline-flex items-center space-x-1">
                        <CheckCircle2 className="w-3 h-3 text-[#1F4E35]" />
                        <span>{d.status}</span>
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
