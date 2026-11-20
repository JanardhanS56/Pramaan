"use client";

import React, { useState } from "react";
import { Upload, FileSpreadsheet, CheckCircle2, AlertCircle } from "lucide-react";

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

      const res = await fetch(`http://127.0.0.1:8000/ingest/csv?entity_type=${fileType}`, {
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
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-[#1C201E]">
          FPO Member & Plot Registry
        </h1>
        <p className="text-xs text-[#5A635E] mt-1">
          Upload and validate member farmers, surveyed plot polygons, and seasonal sowing declarations.
        </p>
      </div>

      {/* Upload Box */}
      <div className="bg-white border border-[#DCE1DD] rounded-md p-6">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-[#1C201E] mb-4 flex items-center space-x-2">
          <Upload className="w-3.5 h-3.5 text-[#1F4E35]" />
          <span>Upload Canonical CSV</span>
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
          <div>
            <label className="block text-xs font-semibold text-[#5A635E] mb-1">Target Entity Table</label>
            <select
              value={fileType}
              onChange={(e) => setFileType(e.target.value)}
              className="w-full bg-white border border-[#DCE1DD] rounded px-3 py-2 text-xs text-[#1C201E] focus:outline-none focus:border-[#1F4E35]"
            >
              <option value="farmers">farmers.csv</option>
              <option value="plots">plots.csv</option>
              <option value="sowing">sowing.csv</option>
              <option value="harvest">harvest.csv</option>
              <option value="signals">signals.csv</option>
              <option value="contracts">contracts.csv</option>
              <option value="deliveries">deliveries.csv</option>
            </select>
          </div>

          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-[#5A635E] mb-1">Select CSV File</label>
            <input
              type="file"
              accept=".csv"
              onChange={handleFileUpload}
              disabled={loading}
              className="w-full text-xs text-[#5A635E] file:mr-4 file:py-1.5 file:px-3 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-[#1F4E35] file:text-white hover:file:bg-[#163A27] cursor-pointer"
            />
          </div>
        </div>

        {uploadStatus && (
          <div
            className={`mt-4 p-3.5 rounded text-xs border flex items-start space-x-2.5 ${
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

      {/* Registry Summary Tables */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white border border-[#DCE1DD] rounded-md p-5">
          <div className="flex items-center space-x-3">
            <FileSpreadsheet className="w-6 h-6 text-[#1F4E35]" />
            <div>
              <span className="text-xs text-[#5A635E] uppercase font-semibold block">Active Farmers</span>
              <span className="text-2xl font-bold font-mono tabular-nums text-[#1C201E]">60</span>
            </div>
          </div>
          <p className="text-[11px] text-[#5A635E] mt-3">Sahyadri Farmer Producer Co (Maharashtra)</p>
        </div>

        <div className="bg-white border border-[#DCE1DD] rounded-md p-5">
          <div className="flex items-center space-x-3">
            <FileSpreadsheet className="w-6 h-6 text-[#1F4E35]" />
            <div>
              <span className="text-xs text-[#5A635E] uppercase font-semibold block">Registered Plots</span>
              <span className="text-2xl font-bold font-mono tabular-nums text-[#1C201E]">150</span>
            </div>
          </div>
          <p className="text-[11px] text-[#5A635E] mt-3">65 onion, 60 tomato, 25 paddy</p>
        </div>

        <div className="bg-white border border-[#DCE1DD] rounded-md p-5">
          <div className="flex items-center space-x-3">
            <FileSpreadsheet className="w-6 h-6 text-[#1F4E35]" />
            <div>
              <span className="text-xs text-[#5A635E] uppercase font-semibold block">Historical Seasons</span>
              <span className="text-2xl font-bold font-mono tabular-nums text-[#1C201E]">5</span>
            </div>
          </div>
          <p className="text-[11px] text-[#5A635E] mt-3">2022-KH through 2024-RB</p>
        </div>
      </div>
    </div>
  );
}
