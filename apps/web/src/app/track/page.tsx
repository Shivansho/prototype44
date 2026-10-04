"use client";

import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  Shield,
  CheckCircle2,
  Clock,
  MapPin,
  AlertTriangle,
  ArrowRight,
  RefreshCw,
  Search,
  ExternalLink,
  Info,
} from "lucide-react";
import { PublicTrackingReport } from "../../../../../packages/shared-types";

function TrackingContent() {
  const searchParams = useSearchParams();
  const queryId = searchParams.get("id") || "";
  const [reportIdInput, setReportIdInput] = useState(queryId || "REP-R17-001");
  const [trackingData, setTrackingData] = useState<PublicTrackingReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTracking = async (id: string) => {
    if (!id.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/v1/reports/${encodeURIComponent(id.trim())}/tracking`);
      if (!res.ok) {
        throw new Error(`Report not found (${res.status})`);
      }
      const data = await res.json();
      setTrackingData(data);
    } catch (err: any) {
      setError(err.message || "Failed to load report tracking");
      setTrackingData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (queryId) {
      fetchTracking(queryId);
    } else {
      // Default to known demo flagship report
      fetchTracking("REP-R17-001");
    }
  }, [queryId]);

  return (
    <div className="min-h-screen bg-space-950 text-slate-100 flex flex-col">
      {/* Public Header */}
      <header className="border-b border-surface-border bg-surface-base/90 backdrop-blur sticky top-0 z-30 px-6 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center gap-2 hover:opacity-85 transition-opacity">
            <div className="w-8 h-8 rounded-lg bg-blue-600/20 border border-blue-500/40 flex items-center justify-center text-blue-400 font-bold">
              N
            </div>
            <span className="font-extrabold tracking-wider text-base bg-gradient-to-r from-blue-400 via-cyan-300 to-indigo-300 bg-clip-text text-transparent">
              NEXUS
            </span>
          </Link>
          <span className="text-slate-600">/</span>
          <span className="text-xs font-mono uppercase tracking-wider text-slate-400">
            Citizen Response Transparency
          </span>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/report"
            className="text-xs font-mono text-cyan-400 hover:text-cyan-300 px-3 py-1.5 rounded border border-cyan-700/50 bg-cyan-950/40 transition-colors flex items-center gap-1.5"
          >
            <span>+ Submit Observation</span>
          </Link>
          <Link
            href="/world"
            className="text-xs font-mono text-slate-300 hover:text-white px-3 py-1.5 rounded border border-surface-border bg-surface-card hover:bg-surface-elevated transition-colors flex items-center gap-1.5"
          >
            <span>Public Live Map</span>
            <ExternalLink className="w-3 h-3 text-slate-400" />
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-4xl w-full mx-auto p-6 md:p-8 space-y-6">
        {/* Search / Lookup Bar */}
        <div className="p-4 rounded-xl border border-surface-border bg-surface-card/60 backdrop-blur-sm space-y-3">
          <div className="flex items-center justify-between">
            <h1 className="text-sm font-bold text-slate-200 uppercase tracking-wider font-mono">
              Track Your Report Progress
            </h1>
            <span className="text-[11px] text-emerald-400 font-mono flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              Connected to Command Stream
            </span>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              fetchTracking(reportIdInput);
            }}
            className="flex gap-2"
          >
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
              <input
                type="text"
                value={reportIdInput}
                onChange={(e) => setReportIdInput(e.target.value)}
                placeholder="Enter Report ID (e.g. REP-R17-001)"
                className="w-full pl-9 pr-4 py-2 bg-surface-elevated/70 border border-surface-border rounded-lg text-xs font-mono text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-cyan-500 transition-colors"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-bold text-xs rounded-lg transition-colors flex items-center gap-1.5 disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
              <span>Track</span>
            </button>
          </form>

          {/* Quick preset links */}
          <div className="flex items-center gap-2 text-[11px] text-slate-400 font-mono">
            <span>Demo reports:</span>
            <button
              type="button"
              onClick={() => {
                setReportIdInput("REP-R17-001");
                fetchTracking("REP-R17-001");
              }}
              className="text-cyan-400 hover:underline"
            >
              REP-R17-001 (R17 Corridor Flooding)
            </button>
          </div>
        </div>

        {error && (
          <div className="p-4 rounded-xl border border-rose-800/60 bg-rose-950/30 text-rose-300 text-xs font-mono flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Tracking Details Card */}
        {trackingData && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-3 duration-300">
            {/* Top Overview Banner */}
            <div className="p-6 rounded-xl border border-cyan-500/30 bg-gradient-to-br from-surface-card to-cyan-950/20 backdrop-blur-sm space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-surface-border/80">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-cyan-950 border border-cyan-700/60 text-cyan-300">
                      #{trackingData.reportId}
                    </span>
                    <span className="text-xs font-mono px-2 py-0.5 rounded bg-surface-elevated text-slate-300 border border-surface-border">
                      {trackingData.category}
                    </span>
                  </div>
                  <h2 className="text-base font-bold text-slate-100 mt-2">{trackingData.title}</h2>
                </div>

                <div className="text-right">
                  <div className="text-[10px] text-slate-400 font-mono">Current Stage</div>
                  <span
                    className={`inline-block mt-1 text-xs font-bold font-mono px-2.5 py-1 rounded ${
                      trackingData.isResolved
                        ? "bg-emerald-950 text-emerald-300 border border-emerald-700"
                        : "bg-amber-950 text-amber-300 border border-amber-700 animate-pulse"
                    }`}
                  >
                    {trackingData.currentStage.replace(/_/g, " ")}
                  </span>
                </div>
              </div>

              {/* Location & Metadata */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs font-mono">
                <div className="p-3 rounded-lg bg-surface-elevated/40 border border-surface-border">
                  <span className="text-slate-400 text-[10px] block">District</span>
                  <div className="flex items-center gap-1.5 text-slate-200 mt-1">
                    <MapPin className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                    <span className="truncate">{trackingData.district}</span>
                  </div>
                </div>
                <div className="p-3 rounded-lg bg-surface-elevated/40 border border-surface-border">
                  <span className="text-slate-400 text-[10px] block">Submitted At</span>
                  <span className="text-slate-200 block mt-1">
                    {new Date(trackingData.submittedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <div className="p-3 rounded-lg bg-surface-elevated/40 border border-surface-border">
                  <span className="text-slate-400 text-[10px] block">Resolution Status</span>
                  <span className={`font-bold block mt-1 ${trackingData.isResolved ? "text-emerald-400" : "text-amber-400"}`}>
                    {trackingData.isResolved ? "Fully Resolved" : "Operational Mitigation Active"}
                  </span>
                </div>
              </div>

              {/* Public Safety Message */}
              {trackingData.publicSafetyMessage && (
                <div className="p-3.5 rounded-lg bg-amber-950/30 border border-amber-800/40 text-xs text-amber-200 flex items-start gap-2.5">
                  <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <strong className="font-semibold block font-mono text-[11px] uppercase tracking-wider text-amber-300">
                      Public Advisory
                    </strong>
                    <p className="mt-0.5 leading-relaxed">{trackingData.publicSafetyMessage}</p>
                  </div>
                </div>
              )}
            </div>

            {/* 9-Stage Milestone Stepper */}
            <div className="p-6 rounded-xl border border-surface-border bg-surface-card/60 backdrop-blur-sm space-y-5">
              <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider font-mono flex items-center justify-between">
                <span>Verification & Operational Progress Lifecycle</span>
                <span className="text-[11px] text-cyan-400">
                  Step {trackingData.timeline.filter((item: any) => item.status === "COMPLETED").length} of{" "}
                  {trackingData.timeline.length} Complete
                </span>
              </h3>

              <div className="space-y-3 relative before:absolute before:left-3.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-surface-border">
                {trackingData.timeline.map((item: any, idx: number) => {
                  const isCompleted = item.status === "COMPLETED";
                  const isInProgress = item.status === "IN_PROGRESS";
                  return (
                    <div key={idx} className="relative flex items-start gap-3.5 pl-1">
                      {/* Step Icon */}
                      <div
                        className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-mono font-bold z-10 shrink-0 transition-colors ${
                          isCompleted
                            ? "bg-emerald-500 text-slate-950 shadow-[0_0_8px_rgba(16,185,129,0.4)]"
                            : isInProgress
                            ? "bg-amber-500 text-slate-950 shadow-[0_0_8px_rgba(245,158,11,0.4)] animate-pulse"
                            : "bg-surface-elevated text-slate-500 border border-surface-border"
                        }`}
                      >
                        {isCompleted ? "✓" : idx + 1}
                      </div>

                      {/* Step Body */}
                      <div
                        className={`flex-1 p-3 rounded-lg border transition-all ${
                          isCompleted
                            ? "bg-surface-elevated/40 border-surface-borderHover"
                            : isInProgress
                            ? "bg-amber-950/20 border-amber-600/50"
                            : "bg-surface-card/30 border-surface-border/40 opacity-50"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span
                            className={`text-xs font-bold font-mono ${
                              isCompleted ? "text-slate-100" : isInProgress ? "text-amber-300" : "text-slate-400"
                            }`}
                          >
                            {item.label}
                          </span>
                          {item.time && (
                            <span className="text-[10px] font-mono text-slate-500">{item.time}</span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">{item.description}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Direct Action Link */}
            <div className="flex items-center justify-between p-4 rounded-xl border border-surface-border bg-surface-elevated/30">
              <div className="text-xs text-slate-400">
                View this corridor and city status on the real-time public spatial map.
              </div>
              <Link
                href="/world"
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-lg transition-colors flex items-center gap-1.5"
              >
                <span>Open Public Map</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default function TrackPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-space-950 text-slate-100 flex items-center justify-center font-mono text-xs">
          Loading report tracker...
        </div>
      }
    >
      <TrackingContent />
    </Suspense>
  );
}
