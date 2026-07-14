import React, { useState, useEffect } from "react";
import { SavedDecision, AnalysisResult } from "./types";
import DecisionForm from "./components/DecisionForm";
import AnalysisDashboard from "./components/AnalysisDashboard";
import SavedDecisionsModal from "./components/SavedDecisionsModal";
import { History, GitCompare, Plus, AlertCircle, ArrowLeft } from "lucide-react";

const STORAGE_KEY = "the_tiebreaker_saved_decisions";

export default function App() {
  const [savedDecisions, setSavedDecisions] = useState<SavedDecision[]>([]);
  const [activeDecision, setActiveDecision] = useState<SavedDecision | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  // Diagnostics state
  const [diagnostic, setDiagnostic] = useState<{
    loading: boolean;
    data: {
      configured: boolean;
      status: "HEALTHY" | "DEGRADED" | "ERROR" | "MISSING" | "CHECKING";
      message: string;
      keyLength?: number;
      lastFour?: string;
      modelUsed?: string;
      statusText?: string;
      code?: number;
      timestamp?: string;
    } | null;
  }>({
    loading: false,
    data: null,
  });

  const runDiagnostics = async () => {
    setDiagnostic(prev => ({ ...prev, loading: true }));
    try {
      const res = await fetch("/api/diagnostic");
      const data = await res.json();
      setDiagnostic({ loading: false, data });
    } catch (err: any) {
      setDiagnostic({
        loading: false,
        data: {
          configured: false,
          status: "ERROR",
          message: err.message || "Could not connect to backend diagnostics endpoint."
        }
      });
    }
  };

  // Load saved decisions from localStorage on mount and trigger diagnostics check
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setSavedDecisions(JSON.parse(stored));
      }
    } catch (err) {
      console.error("Failed to load saved decisions:", err);
    }
    
    runDiagnostics();
  }, []);

  // Save decisions helper
  const saveToStorage = (decisionsList: SavedDecision[]) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(decisionsList));
      setSavedDecisions(decisionsList);
    } catch (err) {
      console.error("Failed to save decisions to storage:", err);
    }
  };

  // Run AI analysis
  const handleAnalyze = async (decision: string, options: string[], context: string) => {
    setIsLoading(true);
    setError(null);
    setActiveDecision(null);

    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision, options, context }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `Server responded with status code ${res.status}`);
      }

      const resultData: AnalysisResult = await res.json();

      const newDecision: SavedDecision = {
        id: Math.random().toString(36).substring(2, 11),
        decision,
        options,
        context,
        createdAt: new Date().toISOString(),
        result: resultData,
      };

      // Set as active
      setActiveDecision(newDecision);

      // Auto-save to history
      const updatedList = [newDecision, ...savedDecisions];
      saveToStorage(updatedList);
    } catch (err: any) {
      console.error("Analysis failed:", err);
      setError(
        err.message || 
        "The analysis request failed. This might be due to a missing Gemini API Key. Please verify your settings."
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Save weights overrides back into localStorage
  const handleSaveWeights = (
    customWeights: { [key: string]: number },
    customCriteriaWeights: { [criterion: string]: number }
  ) => {
    if (!activeDecision) return;

    const updatedDecision: SavedDecision = {
      ...activeDecision,
      customWeights,
      customCriteriaWeights,
    };

    setActiveDecision(updatedDecision);

    const updatedList = savedDecisions.map((d) => 
      d.id === activeDecision.id ? updatedDecision : d
    );
    saveToStorage(updatedList);
  };

  // Delete decision
  const handleDeleteDecision = (id: string) => {
    const updatedList = savedDecisions.filter((d) => d.id !== id);
    saveToStorage(updatedList);
    
    if (activeDecision && activeDecision.id === id) {
      setActiveDecision(null);
    }
  };

  // Select a past decision from modal
  const handleSelectDecision = (decision: SavedDecision) => {
    setActiveDecision(decision);
    setIsHistoryOpen(false);
    setError(null);
  };

  // Clear current active and return to form
  const handleNewDecision = () => {
    setActiveDecision(null);
    setError(null);
  };

  // Check if active decision has any overrides saved
  const isDecisionSaved = activeDecision 
    ? savedDecisions.some(
        (d) => 
          d.id === activeDecision.id && 
          JSON.stringify(d.customWeights) === JSON.stringify(activeDecision.customWeights) &&
          JSON.stringify(d.customCriteriaWeights) === JSON.stringify(activeDecision.customCriteriaWeights)
      )
    : false;

  const getStatusBadge = () => {
    if (diagnostic.loading) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[9px] font-mono uppercase bg-neutral-900 border border-neutral-800 text-neutral-400">
          <span className="w-1.5 h-1.5 rounded-full bg-neutral-500 animate-pulse" />
          Checking System...
        </span>
      );
    }

    if (!diagnostic.data) return null;

    const { status } = diagnostic.data;
    if (status === "HEALTHY") {
      return (
        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[9px] font-mono uppercase bg-emerald-950/30 border border-emerald-900/50 text-emerald-400">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.5)] animate-pulse" />
          Core: Online
        </span>
      );
    }
    if (status === "DEGRADED" || status === "CHECKING") {
      return (
        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[9px] font-mono uppercase bg-amber-950/30 border border-amber-900/50 text-amber-400">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
          Core: Overloaded
        </span>
      );
    }
    if (status === "MISSING") {
      return (
        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[9px] font-mono uppercase bg-red-950/30 border border-red-900/50 text-red-400">
          <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
          Key Missing
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[9px] font-mono uppercase bg-rose-950/30 border border-rose-900/50 text-rose-400">
        <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
        Core Blocked
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-editorial-bg flex flex-col text-editorial-white selection:bg-editorial-gold selection:text-black antialiased">
      {/* 1. Header Bar */}
      <header className="sticky top-0 z-40 bg-editorial-bg/95 backdrop-blur-md border-b border-editorial-border py-5 px-6 md:px-12 flex items-center justify-between">
        <div className="flex items-center gap-4 cursor-pointer" onClick={handleNewDecision}>
          <div className="w-10 h-10 rounded border border-editorial-gold flex items-center justify-center text-editorial-gold hover:bg-editorial-gold hover:text-black transition-all">
            <GitCompare className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-serif-editorial italic tracking-tight font-medium text-editorial-white">
              The Tiebreaker
            </h1>
            <div className="flex items-center gap-2 mt-0.5">
              <p className="editorial-label text-[9px] text-editorial-text-muted">
                DECISION INTELLIGENCE CORE
              </p>
              {getStatusBadge()}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {activeDecision && (
            <button
              onClick={handleNewDecision}
              className="flex items-center gap-2 px-4 py-2 border border-editorial-border hover:border-editorial-gold hover:text-editorial-gold text-editorial-white text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer rounded"
            >
              <Plus className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">New Analysis</span>
            </button>
          )}

          <button
            onClick={() => setIsHistoryOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-editorial-card border border-editorial-border hover:border-editorial-gold text-editorial-white text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer rounded"
          >
            <History className="w-3.5 h-3.5 text-editorial-gold" />
            <span>History</span>
            {savedDecisions.length > 0 && (
              <span className="bg-editorial-gold text-black text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center font-mono shrink-0">
                {savedDecisions.length}
              </span>
            )}
          </button>
        </div>
      </header>

      {/* 2. Main Content Frame */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-10 md:py-16 space-y-12 animate-fade-in">
        
        {/* Error Notification banner */}
        {error && (
          <div className="bg-neutral-900/40 border border-red-900/50 rounded p-6 flex flex-col gap-4 max-w-3xl mx-auto">
            <div className="flex items-start gap-4">
              <AlertCircle className="w-6 h-6 text-red-500 shrink-0 mt-0.5" />
              <div className="space-y-1.5 flex-1">
                <h3 className="text-base font-serif-editorial italic font-semibold text-red-400">Analysis Interrupted</h3>
                <p className="text-sm text-red-300 leading-relaxed font-light">
                  {error}
                </p>
              </div>
            </div>

            {/* Injected Live Diagnostic Assistant */}
            <div className="border-t border-neutral-800 pt-4 mt-2 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-mono uppercase tracking-wider text-neutral-400">Live API Key & Server Connection Diagnostic</h4>
                <button 
                  onClick={runDiagnostics}
                  disabled={diagnostic.loading}
                  className="text-xs font-mono text-editorial-gold hover:underline disabled:opacity-50"
                >
                  {diagnostic.loading ? "Running diagnostics..." : "Re-Run Diagnostics ↻"}
                </button>
              </div>

              {diagnostic.loading ? (
                <div className="bg-neutral-950 p-4 rounded border border-neutral-800 text-xs font-mono text-neutral-400 animate-pulse">
                  Querying backend configuration and running a lightweight end-to-end ping check with Gemini servers...
                </div>
              ) : diagnostic.data ? (
                <div className="bg-neutral-950 p-4 rounded border border-neutral-800 space-y-3 text-xs font-mono">
                  <div className="grid grid-cols-2 gap-2 text-[11px]">
                    <div className="text-neutral-500 font-mono">API KEY CONFIGURED:</div>
                    <div className={diagnostic.data.configured ? "text-emerald-400 font-bold" : "text-rose-400 font-bold"}>
                      {diagnostic.data.configured ? `YES (Verified, ${diagnostic.data.keyLength || "unknown"} chars)` : "NO"}
                    </div>
                    
                    {diagnostic.data.configured && (
                      <>
                        <div className="text-neutral-500 font-mono">KEY SUFFIX:</div>
                        <div className="text-neutral-300">••••••••{diagnostic.data.lastFour || "N/A"}</div>
                      </>
                    )}

                    <div className="text-neutral-500 font-mono">CONNECTION STATUS:</div>
                    <div className={`font-bold uppercase ${
                      diagnostic.data.status === "HEALTHY" ? "text-emerald-400" :
                      diagnostic.data.status === "DEGRADED" ? "text-amber-400" : "text-rose-400"
                    }`}>
                      {diagnostic.data.status}
                    </div>

                    <div className="text-neutral-500 font-mono">LAST ATTEMPT:</div>
                    <div className="text-neutral-400">{diagnostic.data.timestamp ? new Date(diagnostic.data.timestamp).toLocaleTimeString() : "N/A"}</div>
                  </div>

                  <div className="p-3 bg-neutral-900/60 rounded text-[11px] leading-relaxed border-l-2 border-editorial-gold">
                    <span className="text-editorial-gold font-bold uppercase block mb-1">🔍 Diagnostic Findings:</span>
                    {diagnostic.data.status === "HEALTHY" ? (
                      <span className="text-neutral-300">
                        Your API key is active, properly connected, and responsive. The previous failure was likely due to a temporary, transient network spike or a brief model overload. You should try your analysis request again now.
                      </span>
                    ) : diagnostic.data.status === "MISSING" ? (
                      <span className="text-rose-300">
                        Your API Key is missing. Click on the <strong>Settings</strong> gear icon in the top header, choose <strong>Secrets</strong>, and add a secret named <strong>GEMINI_API_KEY</strong> with your Google AI Studio API key as the value.
                      </span>
                    ) : diagnostic.data.status === "ERROR" && (diagnostic.data.code === 503 || String(diagnostic.data.message).includes("503") || String(diagnostic.data.statusText).includes("UNAVAILABLE")) ? (
                      <span className="text-amber-300">
                        <strong>API Key Verified successfully!</strong> However, the Google Gemini API servers are currently experiencing an unusually high volume of requests (503 Service Temporarily Unavailable). Your key is correct, but Google's server load is too high right now. We have already enabled automatic model switching and backoff retries to bypass this. Please click "Analyze Dilemma" again in a moment.
                      </span>
                    ) : (
                      <span className="text-neutral-300">
                        {diagnostic.data.message}
                      </span>
                    )}
                  </div>
                </div>
              ) : (
                <div className="bg-neutral-950 p-4 rounded border border-neutral-800 text-xs text-neutral-400 flex justify-between items-center">
                  <span>Diagnostic results pending. Run a scan to check key connection.</span>
                  <button 
                    onClick={runDiagnostics}
                    className="px-3 py-1 bg-neutral-800 hover:bg-neutral-700 text-editorial-white rounded border border-neutral-700 text-[11px] font-mono transition-colors"
                  >
                    Run Scan
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* View switching logic */}
        {activeDecision ? (
          <div className="space-y-8">
            <button
              onClick={handleNewDecision}
              className="flex items-center gap-2 text-xs uppercase tracking-wider text-editorial-text-muted hover:text-editorial-gold transition-colors font-medium cursor-pointer self-start"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Workshop</span>
            </button>

            <AnalysisDashboard
              result={activeDecision.result}
              decision={activeDecision.decision}
              context={activeDecision.context}
              onSave={handleSaveWeights}
              isSaved={isDecisionSaved}
              initialCustomWeights={activeDecision.customWeights}
              initialCustomCriteriaWeights={activeDecision.customCriteriaWeights}
            />
          </div>
        ) : (
          <div className="max-w-3xl mx-auto space-y-12">
            {/* Introductory Hero block */}
            <div className="text-center space-y-4 pb-4">
              <span className="editorial-label text-editorial-gold px-3 py-1.5 border border-editorial-border bg-editorial-card rounded-full">
                STOCHASTIC DECISION WEIGHTING
              </span>
              <h2 className="text-3xl md:text-5xl font-serif-editorial italic font-medium tracking-tight text-editorial-white leading-tight">
                Decide Smarter, Weigh Better
              </h2>
              <p className="text-editorial-text-muted max-w-lg mx-auto text-sm md:text-base leading-relaxed font-light">
                Input your dilemma and competing alternatives below. Our intelligence core builds structured criteria ratings, SWOT matrices, and weighted balance beams to solve any deadlock.
              </p>
            </div>

            {/* Main input form */}
            <DecisionForm onSubmit={handleAnalyze} isLoading={isLoading} />

            {/* Info guidelines row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-6 border-t border-editorial-border">
              <div className="bg-editorial-card border border-editorial-border p-6 rounded flex flex-col gap-3">
                <span className="editorial-label text-editorial-gold">METHOD 01</span>
                <h4 className="text-sm font-semibold font-serif-editorial italic text-editorial-white">
                  Dynamic Balance Beams
                </h4>
                <p className="text-xs text-editorial-text-muted leading-relaxed font-light">
                  Contrast raw advantages and risks side-by-side. Customize personal importance multipliers to witness real-time recommendation swings.
                </p>
              </div>

              <div className="bg-editorial-card border border-editorial-border p-6 rounded flex flex-col gap-3">
                <span className="editorial-label text-editorial-gold">METHOD 02</span>
                <h4 className="text-sm font-semibold font-serif-editorial italic text-editorial-white">
                  Multi-Criteria Matrix
                </h4>
                <p className="text-xs text-editorial-text-muted leading-relaxed font-light">
                  Score dimensions like Capex, Risk, or Fulfillment on an absolute 10-point scale. Tailor parameter priorities as they shift.
                </p>
              </div>

              <div className="bg-editorial-card border border-editorial-border p-6 rounded flex flex-col gap-3">
                <span className="editorial-label text-editorial-gold">METHOD 03</span>
                <h4 className="text-sm font-semibold font-serif-editorial italic text-editorial-white">
                  SWOT Framework
                </h4>
                <p className="text-xs text-editorial-text-muted leading-relaxed font-light">
                  Synthesize immediate strengths, latent weaknesses, future opportunities, and strategic threats as a unified systemic view.
                </p>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* 3. History Overlay Drawer / Modal */}
      <SavedDecisionsModal
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        savedDecisions={savedDecisions}
        onSelect={handleSelectDecision}
        onDelete={handleDeleteDecision}
      />

      {/* 4. Elegant Footer */}
      <footer className="border-t border-editorial-border py-8 text-center mt-16 bg-editorial-card">
        <div className="max-w-6xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="editorial-label text-editorial-text-muted">
            THE TIEBREAKER / DECISION INTELLIGENCE / © 2026
          </div>
          <div className="text-[10px] text-editorial-text-muted/60 font-mono tracking-wider uppercase">
            DATA SOURCE: REAL-TIME GEMINI CORE REASONING
          </div>
        </div>
      </footer>
    </div>
  );
}
