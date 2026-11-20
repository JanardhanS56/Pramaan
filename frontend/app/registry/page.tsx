"use client";

import React, { useState } from "react";
import { Upload, CheckCircle2, AlertCircle } from "lucide-react";
import { API_BASE } from "@/lib/api";

export default function RegistryPage() {
  const [fileType, setFileType] = useState("farmers");
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);
  const [errorDetails, setErrorDetails] = useState<any[] | null>(null);
  const [loading, setLoading] = useState(false);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setLoading(true);
      setUploadStatus(null);
      setErrorDetails(null);

      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch(`${API_BASE}/ingest/csv?entity_type=${fileType}`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        const details = errJson?.detail?.error?.details || [];
        setErrorDetails(details);
        setUploadStatus(errJson?.detail?.error?.message || "CSV validation failed.");
      } else {
        const data = await res.json();
        setUploadStatus(`Successfully validated and ingested ${data.rows_ingested || 0} rows into ${fileType}.`);
      }
    } catch (e: any) {
      setUploadStatus(e?.message || "Failed to upload file.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-[#1C201E]">
          FPO Member & Plot Registry
        </h1>
        <p className="text-xs text-[#5A635E] mt-1">
          Upload and validate member farmers, surveyed plot polygons, and seasonal sowing declarations.
        </p>
      </div>

      {/* Top 3 KPI Summary Metrics Bar */}
      <div className="bg-white border border-[#DCE1DD] rounded-md grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-[#DCE1DD] overflow-hidden">
        <div className="p-5 text-left">
          <span className="text-xs text-[#5A635E] uppercase font-semibold tracking-wider block mb-1">
            Active Farmers
          </span>
          <span className="text-3xl font-bold font-mono tabular-nums text-[#1F4E35] block">
            60
          </span>
          <span className="text-xs text-[#5A635E] mt-1.5 block">
            Sahyadri Farmer Producer Co (Maharashtra)
          </span>
        </div>

        <div className="p-5 text-left">
          <span className="text-xs text-[#5A635E] uppercase font-semibold tracking-wider block mb-1">
            Registered Plots
          </span>
          <span className="text-3xl font-bold font-mono tabular-nums text-[#1F4E35] block">
            150
          </span>
          <span className="text-xs text-[#5A635E] mt-1.5 block">
            65 onion, 60 tomato, 25 paddy
          </span>
        </div>

        <div className="p-5 text-left">
          <span className="text-xs text-[#5A635E] uppercase font-semibold tracking-wider block mb-1">
            Historical Seasons
          </span>
          <span className="text-3xl font-bold font-mono tabular-nums text-[#1F4E35] block">
            5
          </span>
          <span className="text-xs text-[#5A635E] mt-1.5 block">
            2022-KH through 2024-RB
          </span>
        </div>
      </div>

      {/* Structured Two-Step CSV Ingestion Card */}
      <div className="bg-white border border-[#DCE1DD] rounded-md p-6">
        <div className="border-b border-[#DCE1DD] pb-3 mb-6">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-[#1C201E]">
            Upload Canonical CSV
          </h2>
          <p className="text-xs text-[#5A635E] mt-0.5">
            Ingest normalized tabular records for member registry, surveyed plots, or seasonal operations.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
          {/* Step 1: Target Entity Table */}
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <span className="w-5 h-5 rounded-full bg-[#1F4E35] text-white text-[10px] font-bold flex items-center justify-center font-mono">
                1
              </span>
              <label className="text-xs font-semibold text-[#1C201E]">
                Select Target Entity Table
              </label>
            </div>
            <p className="text-xs text-[#5A635E]">
              Select the canonical destination schema to validate headers, types, and referential constraints.
            </p>
            <select
              value={fileType}
              onChange={(e) => setFileType(e.target.value)}
              className="w-full bg-[#F9FAF8] border border-[#DCE1DD] rounded px-3 py-2.5 text-xs text-[#1C201E] focus:outline-none focus:ring-2 focus:ring-[#1F4E35]/20 focus:border-[#1F4E35] focus:bg-white font-medium transition-all"
            >
              <option value="farmers">farmers.csv (Member Farmers)</option>
              <option value="plots">plots.csv (Surveyed Geo Plots)</option>
              <option value="sowing">sowing.csv (Seasonal Sowing Declarations)</option>
              <option value="harvest">harvest.csv (Harvest Yield Actuals)</option>
              <option value="signals">signals.csv (Agronomic & Satellite Signals)</option>
              <option value="contracts">contracts.csv (Buyer Forward Contracts)</option>
              <option value="deliveries">deliveries.csv (Historical Fulfillment Ledger)</option>
            </select>
            <div className="bg-[#F0F2F0] border border-[#DCE1DD] rounded p-2.5 text-[11px] text-[#5A635E]">
              Strict row-level validation: invalid rows reject the full batch atomically.
            </div>
          </div>

          {/* Step 2: Clean Dashed File Dropzone */}
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <span className="w-5 h-5 rounded-full bg-[#1F4E35] text-white text-[10px] font-bold flex items-center justify-center font-mono">
                2
              </span>
              <span className="text-xs font-semibold text-[#1C201E]">
                Select or Drop CSV File
              </span>
            </div>
            <label className="flex flex-col items-center justify-center border-2 border-dashed border-[#DCE1DD] hover:border-[#1F4E35] focus-within:border-[#1F4E35] focus-within:ring-2 focus-within:ring-[#1F4E35]/20 bg-[#F9FAF8] hover:bg-[#EAF2ED]/30 rounded p-6 cursor-pointer transition-all text-center group">
              <Upload className="w-6 h-6 text-[#1F4E35] group-hover:scale-105 transition-transform mb-2" />
              <span className="text-xs font-semibold text-[#1C201E]">
                {loading ? "Validating & Ingesting..." : "Click to select or drag and drop CSV"}
              </span>
              <span className="text-[11px] text-[#5A635E] mt-1 font-mono">
                Target: {fileType}.csv (UTF-8 encoded)
              </span>
              <input
                type="file"
                accept=".csv"
                onChange={handleFileUpload}
                disabled={loading}
                className="hidden"
              />
            </label>
          </div>
        </div>

        {/* Validation Status & Error Reporting */}
        {uploadStatus && (
          <div
            className={`mt-6 p-3.5 rounded text-xs border flex items-start space-x-2.5 ${
              errorDetails && errorDetails.length > 0
                ? "bg-[#FEF3F2] border-[#FECDCA] text-[#B42318]"
                : "bg-[#EAF2ED] border-[#C5D8CC] text-[#1F4E35]"
            }`}
          >
            {errorDetails && errorDetails.length > 0 ? (
              <AlertCircle className="w-4 h-4 flex-shrink-0 text-[#B42318] mt-0.5" />
            ) : (
              <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-[#1F4E35] mt-0.5" />
            )}
            <div>
              <p className="font-semibold">{uploadStatus}</p>
              {errorDetails && errorDetails.length > 0 && (
                <ul className="mt-2 text-xs space-y-1 list-disc list-inside text-[#B42318] font-mono tabular-nums">
                  {errorDetails.map((d, i) => (
                    <li key={i}>
                      Row {d.row}: {d.field} — {d.error}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
