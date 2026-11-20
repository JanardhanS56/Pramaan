"use client";

import React, { useState } from "react";
import { Upload, FileSpreadsheet, CheckCircle, AlertCircle } from "lucide-react";

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
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
          FPO Member & Plot Registry
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          Upload and validate member farmers, surveyed plot polygons, and seasonal sowing declarations.
        </p>
      </div>

      {/* Upload Box */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl">
        <h2 className="text-base font-bold text-white mb-4 flex items-center space-x-2">
          <Upload className="w-4 h-4 text-emerald-400" />
          <span>Upload Canonical CSV</span>
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1">Target Entity Table</label>
            <select
              value={fileType}
              onChange={(e) => setFileType(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
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
            <label className="block text-xs font-semibold text-slate-400 mb-1">Select CSV File</label>
            <input
              type="file"
              accept=".csv"
              onChange={handleFileUpload}
              disabled={loading}
              className="w-full text-sm text-slate-300 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-emerald-600 file:text-white hover:file:bg-emerald-500 cursor-pointer"
            />
          </div>
        </div>

        {uploadStatus && (
          <div
            className={`mt-4 p-4 rounded-xl text-sm border flex items-start space-x-3 ${
              errorDetails && errorDetails.length > 0
                ? "bg-red-950/40 border-red-800 text-red-200"
                : "bg-emerald-950/40 border-emerald-800 text-emerald-200"
            }`}
          >
            {errorDetails && errorDetails.length > 0 ? (
              <AlertCircle className="w-5 h-5 flex-shrink-0 text-red-400 mt-0.5" />
            ) : (
              <CheckCircle className="w-5 h-5 flex-shrink-0 text-emerald-400 mt-0.5" />
            )}
            <div>
              <p className="font-semibold">{uploadStatus}</p>
              {errorDetails && errorDetails.length > 0 && (
                <ul className="mt-2 text-xs space-y-1 list-disc list-inside text-red-300 font-mono">
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
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <div className="flex items-center space-x-3">
            <FileSpreadsheet className="w-8 h-8 text-emerald-400" />
            <div>
              <span className="text-xs text-slate-400 uppercase font-semibold block">Active Farmers</span>
              <span className="text-2xl font-bold font-mono text-white">60</span>
            </div>
          </div>
          <p className="text-xs text-slate-500 mt-3">Sahyadri Farmer Producer Co (Maharashtra)</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <div className="flex items-center space-x-3">
            <FileSpreadsheet className="w-8 h-8 text-sky-400" />
            <div>
              <span className="text-xs text-slate-400 uppercase font-semibold block">Registered Plots</span>
              <span className="text-2xl font-bold font-mono text-white">150</span>
            </div>
          </div>
          <p className="text-xs text-slate-500 mt-3">65 onion, 60 tomato, 25 paddy</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <div className="flex items-center space-x-3">
            <FileSpreadsheet className="w-8 h-8 text-amber-400" />
            <div>
              <span className="text-xs text-slate-400 uppercase font-semibold block">Historical Seasons</span>
              <span className="text-2xl font-bold font-mono text-white">5</span>
            </div>
          </div>
          <p className="text-xs text-slate-500 mt-3">2022-KH through 2024-RB</p>
        </div>
      </div>
    </div>
  );
}
