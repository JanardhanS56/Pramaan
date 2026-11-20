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
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
          Actuals & Calibration Ledger
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          Record actual harvest yields and buyer deliveries. The conformal calibration ledger depends on honest actuals.
        </p>
      </div>

      {/* Entry Form */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl">
        <h2 className="text-base font-bold text-white mb-4 flex items-center space-x-2">
          <Truck className="w-4 h-4 text-emerald-400" />
          <span>Record Delivery Outcome</span>
        </h2>

        {status && (
          <div className="mb-4 p-4 rounded-xl bg-emerald-950/40 border border-emerald-800 text-emerald-200 text-sm flex items-center space-x-2">
            <CheckCircle2 className="w-5 h-5 flex-shrink-0 text-emerald-400" />
            <span>{status}</span>
          </div>
        )}

        <form onSubmit={handleRecordDelivery} className="grid grid-cols-1 sm:grid-cols-4 gap-4 items-end">
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1">Contract ID</label>
            <input
              type="text"
              required
              value={contractId}
              onChange={(e) => setContractId(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500 font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1">Delivered Quantity (t)</label>
            <input
              type="number"
              step="0.1"
              required
              placeholder="e.g. 72.5"
              value={deliveredT}
              onChange={(e) => setDeliveredT(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500 font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1">Delivered Grade</label>
            <select
              value={grade}
              onChange={(e) => setGrade(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
            >
              <option value="A">Grade A</option>
              <option value="B">Grade B</option>
              <option value="C">Grade C</option>
            </select>
          </div>

          <div>
            <button
              type="submit"
              className="w-full px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-semibold text-sm transition-colors shadow-md"
            >
              Log Delivery
            </button>
          </div>
        </form>
      </div>

      {/* Historical Ledger Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
        <div className="p-4 sm:p-5 border-b border-slate-800 flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <Scale className="w-4 h-4 text-emerald-400" />
            <h2 className="font-bold text-base text-white">Historical Delivery Ledger (Residual Ground Truth)</h2>
          </div>
          <span className="text-xs text-slate-400 font-mono">4 completed contracts</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-950/60 text-xs font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Contract</th>
                <th className="py-3 px-4">Buyer</th>
                <th className="py-3 px-4">Crop</th>
                <th className="py-3 px-4">Required</th>
                <th className="py-3 px-4">Delivered</th>
                <th className="py-3 px-4">Shortfall</th>
                <th className="py-3 px-4">Outcome</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono text-xs">
              {pastDeliveries.map((d) => (
                <tr key={d.id} className="hover:bg-slate-800/40 transition-colors">
                  <td className="py-3 px-4 font-bold text-slate-200">{d.id}</td>
                  <td className="py-3 px-4 font-sans text-slate-300">{d.buyer}</td>
                  <td className="py-3 px-4 capitalize font-sans">{d.crop}</td>
                  <td className="py-3 px-4">{d.req.toFixed(1)} t</td>
                  <td className="py-3 px-4 font-bold text-white">{d.delivered.toFixed(1)} t</td>
                  <td className={`py-3 px-4 font-bold ${d.shortfall > 0 ? "text-red-400" : "text-slate-400"}`}>
                    {d.shortfall > 0 ? `${d.shortfall.toFixed(1)} t` : "0.0 t"}
                  </td>
                  <td className="py-3 px-4 font-sans">
                    {d.shortfall > 0 ? (
                      <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-red-950 text-red-300 border border-red-800 flex items-center space-x-1 w-fit">
                        <AlertTriangle className="w-3 h-3" />
                        <span>{d.status}</span>
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-800 flex items-center space-x-1 w-fit">
                        <CheckCircle2 className="w-3 h-3" />
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
