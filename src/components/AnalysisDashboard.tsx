import React, { useState, useMemo } from "react";
import { AnalysisResult, OptionAnalysis, ProConItem, CriterionItem } from "../types";
import { 
  Scale, 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle, 
  Shield, 
  HelpCircle, 
  Sliders, 
  Check, 
  Bookmark,
  Share2,
  ThumbsUp,
  RotateCcw
} from "lucide-react";

interface AnalysisDashboardProps {
  result: AnalysisResult;
  decision: string;
  context: string;
  onSave: (customWeights: { [key: string]: number }, customCriteriaWeights: { [criterion: string]: number }) => void;
  isSaved: boolean;
  initialCustomWeights?: { [key: string]: number };
  initialCustomCriteriaWeights?: { [criterion: string]: number };
}

type TabType = "pros_cons" | "matrix" | "swot";

export default function AnalysisDashboard({
  result,
  decision,
  context,
  onSave,
  isSaved,
  initialCustomWeights = {},
  initialCustomCriteriaWeights = {},
}: AnalysisDashboardProps) {
  const [activeTab, setActiveTab] = useState<TabType>("pros_cons");
  const [copied, setCopied] = useState(false);

  // User Weight Overrides State
  const [customWeights, setCustomWeights] = useState<{ [key: string]: number }>(initialCustomWeights);
  const [customCriteriaWeights, setCustomCriteriaWeights] = useState<{ [criterion: string]: number }>(initialCustomCriteriaWeights);

  const getWeightKey = (optionName: string, type: "pro" | "con", text: string) => {
    return `${optionName}_${type}_${text}`;
  };

  const handleWeightChange = (optionName: string, type: "pro" | "con", text: string, val: number) => {
    const key = getWeightKey(optionName, type, text);
    setCustomWeights(prev => ({ ...prev, [key]: val }));
  };

  const handleCriteriaWeightChange = (criterion: string, val: number) => {
    setCustomCriteriaWeights(prev => ({ ...prev, [criterion]: val }));
  };

  const resetWeights = () => {
    setCustomWeights({});
    setCustomCriteriaWeights({});
  };

  // 1. Math engine for Interactive Pros & Cons
  const impactValues = { high: 3, medium: 2, low: 1 };

  const prosConsScores = useMemo(() => {
    return result.options.map((option) => {
      let score = 0;
      
      option.pros.forEach((pro) => {
        const key = getWeightKey(option.name, "pro", pro.text);
        const userWeight = customWeights[key] !== undefined ? customWeights[key] : 1;
        score += impactValues[pro.impact] * userWeight;
      });

      option.cons.forEach((con) => {
        const key = getWeightKey(option.name, "con", con.text);
        const userWeight = customWeights[key] !== undefined ? customWeights[key] : 1;
        score -= impactValues[con.impact] * userWeight;
      });

      return {
        optionName: option.name,
        score: score
      };
    });
  }, [result, customWeights]);

  // Find winner and lead relative percentage based on Interactive Pros/Cons
  const interactiveVerdict = useMemo(() => {
    if (prosConsScores.length === 0) return { winner: "", margin: 0, relativeShares: [] };
    
    const minScore = Math.min(...prosConsScores.map(s => s.score));
    const offset = minScore < 0 ? Math.abs(minScore) + 5 : 5;
    
    const positiveScores = prosConsScores.map(s => ({
      name: s.optionName,
      rawScore: s.score,
      adjustedScore: s.score + offset
    }));

    const totalAdjusted = positiveScores.reduce((sum, item) => sum + item.adjustedScore, 0);
    
    const relativeShares = positiveScores.map(item => ({
      name: item.name,
      rawScore: item.rawScore,
      percentage: totalAdjusted > 0 ? Math.round((item.adjustedScore / totalAdjusted) * 100) : 50
    }));

    const sorted = [...prosConsScores].sort((a, b) => b.score - a.score);
    const winner = sorted[0].optionName;
    const runnerUpScore = sorted[1] ? sorted[1].score : 0;
    const margin = sorted[0].score - runnerUpScore;

    return {
      winner,
      margin,
      relativeShares,
      sortedScores: sorted
    };
  }, [prosConsScores]);

  // 2. Math engine for Interactive Criteria Matrix
  const criteriaScores = useMemo(() => {
    const scores = result.options.map(opt => ({ name: opt.name, weightedSum: 0, totalWeight: 0 }));

    result.comparisonTable.forEach((row) => {
      const userImportance = customCriteriaWeights[row.criterion] !== undefined 
        ? customCriteriaWeights[row.criterion] 
        : 3;

      row.ratings.forEach((rating) => {
        const optScore = scores.find(s => s.name === rating.optionName);
        if (optScore) {
          optScore.weightedSum += rating.score * userImportance;
          optScore.totalWeight += userImportance;
        }
      });
    });

    return scores.map(s => ({
      name: s.name,
      rating: s.totalWeight > 0 ? Number((s.weightedSum / s.totalWeight).toFixed(1)) : 0
    })).sort((a, b) => b.rating - a.rating);
  }, [result, customCriteriaWeights]);

  const criteriaWinner = criteriaScores[0]?.name || "";

  // Trigger Save callback
  const handleSaveClick = () => {
    onSave(customWeights, customCriteriaWeights);
  };

  const handleCopyReport = () => {
    const formatWeight = (val: number) => {
      if (val === 0) return "Excluded";
      if (val === 1) return "Standard";
      if (val === 2) return "Important";
      if (val >= 3) return "Critical";
      return "Standard";
    };

    let report = `THE TIEBREAKER - DECISION ANALYSIS REPORT\n`;
    report += `==========================================\n\n`;
    report += `Dilemma: ${decision}\n`;
    if (context) report += `Context: ${context}\n`;
    report += `Date: ${new Date().toLocaleDateString()}\n\n`;
    report += `AI OVERVIEW\n`;
    report += `------------------------------------------\n`;
    report += `${result.summary}\n\n`;
    
    report += `DECISION VERDICT & OUTCOME\n`;
    report += `------------------------------------------\n`;
    report += `Recommended Option: ${result.verdict.recommendedOption} (Confidence: ${result.verdict.confidence}%)\n`;
    report += `Explanation:\n${result.verdict.explanation}\n\n`;
    report += `Immediate Action Steps:\n`;
    result.verdict.actionSteps.forEach((step, i) => {
      report += `${i + 1}. [ ] ${step}\n`;
    });
    report += `\n`;

    report += `INTERACTIVE PROS & CONS EVALUATION\n`;
    report += `------------------------------------------\n`;
    result.options.forEach((opt) => {
      report += `\nOption: ${opt.name} (Calculated Priority Score: ${prosConsScores.find(s => s.optionName === opt.name)?.score || 0})\n`;
      report += `  Pros:\n`;
      opt.pros.forEach((p) => {
        const wKey = getWeightKey(opt.name, "pro", p.text);
        const wVal = customWeights[wKey] !== undefined ? customWeights[wKey] : 1;
        report += `    + ${p.text} [Impact: ${p.impact.toUpperCase()}, Weight Multiplier: x${wVal} (${formatWeight(wVal)})]\n`;
        report += `      "${p.description}"\n`;
      });
      report += `  Cons:\n`;
      opt.cons.forEach((c) => {
        const wKey = getWeightKey(opt.name, "con", c.text);
        const wVal = customWeights[wKey] !== undefined ? customWeights[wKey] : 1;
        report += `    - ${c.text} [Impact: ${c.impact.toUpperCase()}, Weight Multiplier: x${wVal} (${formatWeight(wVal)})]\n`;
        report += `      "${c.description}"\n`;
      });
    });
    report += `\n`;

    report += `SWOT ANALYSIS SUMMARY\n`;
    report += `------------------------------------------\n`;
    report += `Strengths:\n` + result.swot.strengths.map(s => `  • ${s}`).join("\n") + "\n";
    report += `Weaknesses:\n` + result.swot.weaknesses.map(w => `  • ${w}`).join("\n") + "\n";
    report += `Opportunities:\n` + result.swot.opportunities.map(o => `  • ${o}`).join("\n") + "\n";
    report += `Threats:\n` + result.swot.threats.map(t => `  • ${t}`).join("\n") + "\n\n";

    report += `==========================================\n`;
    report += `Analyzed via The Tiebreaker Decision Assistant.`;

    navigator.clipboard.writeText(report);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const getImpactColor = (impact: "high" | "medium" | "low", isPro: boolean) => {
    if (isPro) {
      if (impact === "high") return "bg-emerald-950/40 text-emerald-400 border-emerald-900/60";
      if (impact === "medium") return "bg-teal-950/20 text-teal-300 border-teal-900/40";
      return "bg-editorial-card-light text-editorial-text-muted border-editorial-border";
    } else {
      if (impact === "high") return "bg-red-950/40 text-red-400 border-red-900/60";
      if (impact === "medium") return "bg-rose-950/20 text-rose-300 border-rose-900/40";
      return "bg-editorial-card-light text-editorial-text-muted border-editorial-border";
    }
  };

  return (
    <div className="space-y-8">
      {/* 1. Header & Summary Section (Editorial Style layout) */}
      <div className="bg-editorial-card rounded-lg border border-editorial-border shadow-2xl p-6 md:p-8 space-y-6">
        <div className="flex flex-col md:flex-row md:items-baseline justify-between gap-4 border-b border-editorial-border pb-6">
          <div className="space-y-1">
            <span className="editorial-label text-editorial-gold">
              DECISION SPACE SPECIFICATION
            </span>
            <h2 className="text-2xl md:text-3xl font-serif-editorial italic font-medium text-editorial-white tracking-tight leading-tight">
              {decision}
            </h2>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleSaveClick}
              disabled={isSaved}
              className={`flex items-center gap-2 px-3 py-1.5 rounded text-xs font-mono uppercase tracking-widest transition-all cursor-pointer ${
                isSaved 
                  ? "bg-emerald-950/20 text-emerald-400 border border-emerald-800/60" 
                  : "bg-editorial-card-light text-editorial-white border border-editorial-border hover:border-editorial-gold hover:text-editorial-gold"
              }`}
            >
              <Bookmark className={`w-3.5 h-3.5 ${isSaved ? "fill-emerald-400" : ""}`} />
              <span>{isSaved ? "Saved" : "Save Choice"}</span>
            </button>
            <button
              onClick={handleCopyReport}
              className="flex items-center gap-2 px-3 py-1.5 rounded text-xs font-mono uppercase tracking-widest bg-editorial-card-light text-editorial-white border border-editorial-border hover:border-editorial-gold hover:text-editorial-gold transition-all cursor-pointer"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Share2 className="w-3.5 h-3.5" />}
              <span>{copied ? "Copied" : "Export Report"}</span>
            </button>
          </div>
        </div>

        <div>
          <h4 className="editorial-label text-editorial-gold flex items-center gap-1.5 mb-3">
            <TrendingUp className="w-3.5 h-3.5 text-editorial-gold" />
            01 / STRATEGIC DILEMMA SYNTHESIS
          </h4>
          <p className="text-editorial-white text-sm md:text-base leading-relaxed font-light font-serif-editorial">
            {result.summary}
          </p>
        </div>
      </div>

      {/* 2. Comparative Balance Beam */}
      <div className="bg-editorial-card rounded-lg border border-editorial-border shadow-lg p-6 md:p-8 space-y-6">
        <div className="flex justify-between items-baseline border-b border-editorial-border pb-4">
          <h3 className="editorial-label text-editorial-gold flex items-center gap-2">
            <Scale className="w-3.5 h-3.5 text-editorial-gold" />
            02 / DYNAMIC STOCHASTIC BALANCE BEAM
          </h3>
          {(Object.keys(customWeights).length > 0 || Object.keys(customCriteriaWeights).length > 0) && (
            <button 
              onClick={resetWeights}
              className="text-[10px] text-editorial-text-muted hover:text-editorial-gold flex items-center gap-1 transition-colors font-mono font-medium uppercase tracking-wider cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset Overrides
            </button>
          )}
        </div>
        
        {/* Balance Level Indicator */}
        <div className="bg-editorial-bg border border-editorial-border rounded p-6 md:p-8 relative overflow-hidden">
          {/* Options labels and percentages */}
          <div className="grid grid-cols-2 gap-6 mb-6 relative z-10">
            {interactiveVerdict.relativeShares.map((share, idx) => {
              return (
                <div key={share.name} className={`flex flex-col ${idx === 1 ? "items-end text-right" : "items-start text-left"}`}>
                  <span className="editorial-label text-editorial-text-muted text-[9px]">
                    ALTERNATIVE {idx + 1}
                  </span>
                  <span className="text-base md:text-xl font-serif-editorial italic font-medium text-editorial-white mt-1 truncate max-w-full">
                    {share.name}
                  </span>
                  <span className="text-3xl md:text-4xl font-serif-editorial font-light tracking-tight text-editorial-gold mt-1.5 flex items-baseline gap-2">
                    {share.percentage}%
                    <span className="text-xs font-mono text-editorial-text-muted font-normal">
                      (S: {share.rawScore > 0 ? `+${share.rawScore}` : share.rawScore})
                    </span>
                  </span>
                </div>
              );
            })}
          </div>

          {/* Balance beam level slider */}
          <div className="relative h-2 bg-editorial-card border border-editorial-border rounded my-6 flex items-center px-1">
            {/* Center deadpoint marker */}
            <div className="absolute left-1/2 top-0 bottom-0 w-[1px] bg-editorial-border -translate-x-1/2" />
            
            {/* Level gauges */}
            <div 
              className="absolute top-0 bottom-0 left-0 bg-editorial-white/10 transition-all duration-300"
              style={{ width: `${interactiveVerdict.relativeShares[0]?.percentage || 50}%` }}
            />
            <div 
              className="absolute top-0 bottom-0 right-0 bg-editorial-gold/10 transition-all duration-300"
              style={{ width: `${interactiveVerdict.relativeShares[1]?.percentage || 50}%` }}
            />

            {/* Brass / Gold indicator block */}
            <div 
              className="absolute w-6 h-6 rounded bg-editorial-gold shadow-2xl flex items-center justify-center transition-all duration-500"
              style={{ 
                left: `calc(${interactiveVerdict.relativeShares[0]?.percentage || 50}% - 12px)`,
              }}
            >
              <div className="w-1.5 h-1.5 rounded-full bg-black animate-ping" />
            </div>
          </div>

          <p className="text-center text-xs text-editorial-text-muted leading-relaxed font-light mt-3 max-w-lg mx-auto">
            💡 Adjust the importance sliders inside the tabs below. Altering weights live-recalculates option scores and pivots the balance indicator instantly.
          </p>
        </div>
      </div>

      {/* 3. Comparative Tabs */}
      <div className="bg-editorial-card rounded-lg border border-editorial-border shadow-2xl overflow-hidden">
        {/* Navigation Tabs */}
        <div className="flex border-b border-editorial-border bg-editorial-bg p-2 gap-2">
          <button
            onClick={() => setActiveTab("pros_cons")}
            className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded text-xs font-mono uppercase tracking-wider transition-all cursor-pointer ${
              activeTab === "pros_cons"
                ? "bg-editorial-card text-editorial-gold border border-editorial-border"
                : "text-editorial-text-muted hover:text-editorial-white hover:bg-editorial-card-light/40"
            }`}
          >
            <Scale className="w-3.5 h-3.5" />
            <span>⚖️ Pros &amp; Cons</span>
          </button>
          <button
            onClick={() => setActiveTab("matrix")}
            className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded text-xs font-mono uppercase tracking-wider transition-all cursor-pointer ${
              activeTab === "matrix"
                ? "bg-editorial-card text-editorial-gold border border-editorial-border"
                : "text-editorial-text-muted hover:text-editorial-white hover:bg-editorial-card-light/40"
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>📊 Criteria Matrix</span>
          </button>
          <button
            onClick={() => setActiveTab("swot")}
            className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded text-xs font-mono uppercase tracking-wider transition-all cursor-pointer ${
              activeTab === "swot"
                ? "bg-editorial-card text-editorial-gold border border-editorial-border"
                : "text-editorial-text-muted hover:text-editorial-white hover:bg-editorial-card-light/40"
            }`}
          >
            <Shield className="w-3.5 h-3.5" />
            <span>🧭 SWOT Analysis</span>
          </button>
        </div>

        {/* Tab Contents */}
        <div className="p-6 md:p-8">
          {/* TAB 1: Pros & Cons Weighting */}
          {activeTab === "pros_cons" && (
            <div className="space-y-8 animate-fade-in">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {result.options.map((option, optIdx) => {
                  const optScore = prosConsScores.find(s => s.optionName === option.name)?.score || 0;
                  const isWinningPC = option.name === interactiveVerdict.winner;

                  return (
                    <div 
                      key={option.name} 
                      className={`space-y-6 rounded border p-6 transition-all bg-editorial-bg/35 ${
                        isWinningPC 
                          ? "border-editorial-gold/40 shadow-xl" 
                          : "border-editorial-border"
                      }`}
                    >
                      {/* Option Header */}
                      <div className="flex justify-between items-baseline gap-4 pb-4 border-b border-editorial-border">
                        <div>
                          <span className="editorial-label text-editorial-gold text-[9px]">
                            OPTION 0{optIdx + 1}
                          </span>
                          <h3 className="text-lg font-serif-editorial italic font-medium text-editorial-white mt-1">
                            {option.name}
                          </h3>
                        </div>
                        <div className="text-right">
                          <span className="editorial-label text-editorial-text-muted text-[8px] block">PRIORITY VALUE</span>
                          <span className={`text-xl font-mono font-bold ${isWinningPC ? "text-editorial-gold" : "text-editorial-white"}`}>
                            {optScore > 0 ? `+${optScore}` : optScore}
                          </span>
                        </div>
                      </div>

                      {/* Pros List */}
                      <div className="space-y-4">
                        <h4 className="editorial-label text-editorial-white font-bold flex items-center gap-1.5">
                          🟢 ADVANTAGES / PROS
                        </h4>
                        
                        {option.pros.length === 0 ? (
                          <p className="text-xs text-editorial-text-muted italic">No advantages noted.</p>
                        ) : (
                          option.pros.map((pro) => {
                            const wKey = getWeightKey(option.name, "pro", pro.text);
                            const currentWeight = customWeights[wKey] !== undefined ? customWeights[wKey] : 1;

                            return (
                              <div key={pro.text} className="bg-editorial-card border border-editorial-border rounded p-4 space-y-3 border-t-4 border-t-editorial-white">
                                <div className="space-y-1">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <span className="text-sm font-semibold text-editorial-white">
                                      {pro.text}
                                    </span>
                                    <span className={`text-[9px] font-bold font-mono uppercase px-1.5 py-0.5 rounded border ${getImpactColor(pro.impact, true)}`}>
                                      {pro.impact}
                                    </span>
                                  </div>
                                  <p className="text-xs text-editorial-text-muted leading-relaxed font-light">
                                    {pro.description}
                                  </p>
                                </div>

                                {/* Slider Control */}
                                <div className="pt-2 border-t border-editorial-border flex items-center justify-between gap-4">
                                  <span className="text-[10px] text-editorial-text-muted font-mono flex items-center gap-1">
                                    Importance multiplier: 
                                    <span className="font-bold text-editorial-gold font-mono">
                                      {currentWeight === 0 ? "Excluded" : `x${currentWeight}`}
                                    </span>
                                  </span>
                                  <input
                                    type="range"
                                    min="0"
                                    max="4"
                                    step="1"
                                    value={currentWeight}
                                    onChange={(e) => handleWeightChange(option.name, "pro", pro.text, parseInt(e.target.value))}
                                    className="w-1/2 h-1 bg-editorial-border rounded-lg appearance-none cursor-pointer accent-editorial-gold"
                                  />
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>

                      {/* Cons List */}
                      <div className="space-y-4 pt-4 border-t border-editorial-border">
                        <h4 className="editorial-label text-editorial-gold font-bold flex items-center gap-1.5">
                          🔴 EXPOSURES / CONS
                        </h4>

                        {option.cons.length === 0 ? (
                          <p className="text-xs text-editorial-text-muted italic">No risks noted.</p>
                        ) : (
                          option.cons.map((con) => {
                            const wKey = getWeightKey(option.name, "con", con.text);
                            const currentWeight = customWeights[wKey] !== undefined ? customWeights[wKey] : 1;

                            return (
                              <div key={con.text} className="bg-editorial-card border border-editorial-border rounded p-4 space-y-3 border-t-4 border-t-editorial-gold">
                                <div className="space-y-1">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <span className="text-sm font-semibold text-editorial-white">
                                      {con.text}
                                    </span>
                                    <span className={`text-[9px] font-bold font-mono uppercase px-1.5 py-0.5 rounded border ${getImpactColor(con.impact, false)}`}>
                                      {con.impact}
                                    </span>
                                  </div>
                                  <p className="text-xs text-editorial-text-muted leading-relaxed font-light">
                                    {con.description}
                                  </p>
                                </div>

                                {/* Slider Control */}
                                <div className="pt-2 border-t border-editorial-border flex items-center justify-between gap-4">
                                  <span className="text-[10px] text-editorial-text-muted font-mono flex items-center gap-1">
                                    Importance multiplier: 
                                    <span className="font-bold text-editorial-gold font-mono">
                                      {currentWeight === 0 ? "Excluded" : `x${currentWeight}`}
                                    </span>
                                  </span>
                                  <input
                                    type="range"
                                    min="0"
                                    max="4"
                                    step="1"
                                    value={currentWeight}
                                    onChange={(e) => handleWeightChange(option.name, "con", con.text, parseInt(e.target.value))}
                                    className="w-1/2 h-1 bg-editorial-border rounded-lg appearance-none cursor-pointer accent-editorial-gold"
                                  />
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 2: Criteria Evaluation Matrix */}
          {activeTab === "matrix" && (
            <div className="space-y-6 animate-fade-in">
              <div className="bg-editorial-bg rounded border border-editorial-border p-5 mb-6">
                <h4 className="editorial-label text-editorial-gold mb-3">
                  03 / WEIGHTED CRITERIA RATINGS OVERVIEW
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {criteriaScores.map((score, idx) => {
                    const isWinner = score.name === criteriaWinner;
                    return (
                      <div key={score.name} className="bg-editorial-card border border-editorial-border p-4 flex items-center justify-between">
                        <div>
                          <span className="editorial-label text-editorial-text-muted text-[8px] block">RATED RANK 0{idx + 1}</span>
                          <span className="text-sm font-serif-editorial italic text-editorial-white mt-1 block">
                            {score.name}
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="editorial-label text-editorial-text-muted text-[8px] block">RATING SCORE</span>
                          <span className={`text-xl font-mono font-bold ${isWinner ? "text-editorial-gold" : "text-editorial-white"}`}>
                            {score.rating} / 10
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Matrix List with Sliders */}
              <div className="space-y-6">
                {result.comparisonTable.map((row) => {
                  const currentImportance = customCriteriaWeights[row.criterion] !== undefined 
                    ? customCriteriaWeights[row.criterion] 
                    : 3;

                  return (
                    <div key={row.criterion} className="border border-editorial-border p-6 bg-editorial-bg hover:border-editorial-gold/30 transition-all space-y-5">
                      {/* Criterion info & Slider */}
                      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 pb-4 border-b border-editorial-border">
                        <div className="space-y-1">
                          <h4 className="text-base font-serif-editorial italic font-medium text-editorial-white">
                            {row.criterion}
                          </h4>
                          <p className="text-xs text-editorial-text-muted leading-relaxed font-light max-w-xl">
                            {row.description}
                          </p>
                        </div>

                        {/* Slide Weight of Criterion */}
                        <div className="bg-editorial-card border border-editorial-border rounded p-3 flex flex-col gap-1.5 shrink-0 min-w-[200px]">
                          <div className="flex justify-between items-center text-[10px] font-mono">
                            <span className="text-editorial-text-muted uppercase font-semibold">IMPORTANCE</span>
                            <span className="text-editorial-gold font-bold">
                              {currentImportance === 1 ? "Low" : currentImportance === 2 ? "Normal" : currentImportance === 3 ? "Important" : currentImportance === 4 ? "High" : "Critical"}
                            </span>
                          </div>
                          <input
                            type="range"
                            min="1"
                            max="5"
                            step="1"
                            value={currentImportance}
                            onChange={(e) => handleCriteriaWeightChange(row.criterion, parseInt(e.target.value))}
                            className="w-full h-1 bg-editorial-border rounded-lg appearance-none cursor-pointer accent-editorial-gold"
                          />
                        </div>
                      </div>

                      {/* Options Ratings Grid */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {row.ratings.map((rating) => {
                          return (
                            <div key={rating.optionName} className="bg-editorial-card/65 border border-editorial-border p-4 flex items-start gap-4">
                              <div className="w-9 h-9 bg-editorial-bg border border-editorial-gold/30 rounded flex items-center justify-center shrink-0">
                                <span className="font-mono text-xs font-bold text-editorial-gold">
                                  {rating.score}
                                </span>
                              </div>
                              <div className="space-y-1">
                                <span className="editorial-label text-editorial-text-muted text-[8px] block">
                                  {rating.optionName}
                                </span>
                                <p className="text-xs text-editorial-white/90 font-light leading-relaxed">
                                  {rating.rationale}
                                </p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 3: SWOT Analysis Bento Grid */}
          {activeTab === "swot" && (
            <div className="space-y-6 animate-fade-in">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* STRENGTHS */}
                <div className="bg-editorial-bg border border-editorial-border p-6 space-y-4">
                  <div className="flex items-center gap-3 border-b border-editorial-border pb-3">
                    <div className="p-2 bg-editorial-card border border-editorial-border rounded">
                      <ThumbsUp className="w-4 h-4 text-editorial-white" />
                    </div>
                    <div>
                      <h4 className="editorial-label text-editorial-white">
                        Strengths (S)
                      </h4>
                      <p className="text-[10px] text-editorial-text-muted">Inherent attributes & advantages</p>
                    </div>
                  </div>
                  <ul className="space-y-2.5">
                    {result.swot.strengths.map((str, idx) => (
                      <li key={idx} className="flex gap-2.5 items-start text-xs text-editorial-white font-light leading-relaxed">
                        <span className="w-1.5 h-1.5 bg-editorial-white shrink-0 mt-1.5" />
                        <span>{str}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* WEAKNESSES */}
                <div className="bg-editorial-bg border border-editorial-border p-6 space-y-4">
                  <div className="flex items-center gap-3 border-b border-editorial-border pb-3">
                    <div className="p-2 bg-editorial-card border border-editorial-border rounded">
                      <AlertTriangle className="w-4 h-4 text-editorial-gold" />
                    </div>
                    <div>
                      <h4 className="editorial-label text-editorial-gold">
                        Weaknesses (W)
                      </h4>
                      <p className="text-[10px] text-editorial-text-muted">Inherent risks & constraints</p>
                    </div>
                  </div>
                  <ul className="space-y-2.5">
                    {result.swot.weaknesses.map((weak, idx) => (
                      <li key={idx} className="flex gap-2.5 items-start text-xs text-editorial-white font-light leading-relaxed">
                        <span className="w-1.5 h-1.5 bg-editorial-gold shrink-0 mt-1.5" />
                        <span>{weak}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* OPPORTUNITIES */}
                <div className="bg-editorial-bg border border-editorial-border p-6 space-y-4">
                  <div className="flex items-center gap-3 border-b border-editorial-border pb-3">
                    <div className="p-2 bg-editorial-card border border-editorial-border rounded">
                      <TrendingUp className="w-4 h-4 text-editorial-white" />
                    </div>
                    <div>
                      <h4 className="editorial-label text-editorial-white">
                        Opportunities (O)
                      </h4>
                      <p className="text-[10px] text-editorial-text-muted">Leverages & strategic upsides</p>
                    </div>
                  </div>
                  <ul className="space-y-2.5">
                    {result.swot.opportunities.map((opp, idx) => (
                      <li key={idx} className="flex gap-2.5 items-start text-xs text-editorial-white font-light leading-relaxed">
                        <span className="w-1.5 h-1.5 bg-editorial-white shrink-0 mt-1.5" />
                        <span>{opp}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* THREATS */}
                <div className="bg-editorial-bg border border-editorial-border p-6 space-y-4">
                  <div className="flex items-center gap-3 border-b border-editorial-border pb-3">
                    <div className="p-2 bg-editorial-card border border-editorial-border rounded">
                      <Shield className="w-4 h-4 text-editorial-gold" />
                    </div>
                    <div>
                      <h4 className="editorial-label text-editorial-gold">
                        Threats (T)
                      </h4>
                      <p className="text-[10px] text-editorial-text-muted">Vulnerabilities & structural risks</p>
                    </div>
                  </div>
                  <ul className="space-y-2.5">
                    {result.swot.threats.map((thr, idx) => (
                      <li key={idx} className="flex gap-2.5 items-start text-xs text-editorial-white font-light leading-relaxed">
                        <span className="w-1.5 h-1.5 bg-editorial-gold shrink-0 mt-1.5" />
                        <span>{thr}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 4. Strategic AI Verdict & Action Plan (Newspaper-Frontpage Style block) */}
      <div className="bg-editorial-card border border-editorial-border rounded-lg shadow-2xl p-6 md:p-10 space-y-8 relative overflow-hidden">
        {/* Subtle top decoration */}
        <div className="absolute top-0 left-0 right-0 h-[4px] bg-editorial-gold" />

        <div className="flex flex-col md:flex-row md:items-baseline justify-between gap-6 border-b border-editorial-border pb-6">
          <div className="space-y-1">
            <span className="editorial-label text-editorial-text-muted">
              DECISION CONFLICT RESOLUTION VERDICT
            </span>
            <h3 className="text-xl md:text-3xl font-serif-editorial italic font-medium text-editorial-white">
              Recommended Course: {result.verdict.recommendedOption}
            </h3>
          </div>
          <div className="flex items-center gap-4 shrink-0">
            <div className="text-right">
              <span className="editorial-label text-editorial-text-muted text-[8px] block">CONFIDENCE INDEX</span>
              <span className="text-3xl font-serif-editorial font-light text-editorial-gold font-mono">{result.verdict.confidence}%</span>
            </div>
            {/* custom brass badge */}
            <div className="px-3 py-1.5 border border-editorial-gold/30 bg-editorial-bg text-editorial-gold text-[10px] font-mono tracking-widest uppercase rounded">
              VERIFIED
            </div>
          </div>
        </div>

        {/* Big Large Number Metric Visual */}
        <div className="flex flex-col md:flex-row md:items-start gap-8">
          <div className="shrink-0 flex flex-col items-center justify-center p-6 bg-editorial-bg border border-editorial-border rounded min-w-[140px]">
            <span className="editorial-label text-editorial-text-muted text-[8px] mb-2 block">CHOICE ALPHA</span>
            <div className="font-serif-editorial text-6xl font-light text-editorial-gold leading-none">
              YES
            </div>
            <span className="text-[10px] text-editorial-text-muted mt-2 font-mono">RECOMMENDED</span>
          </div>

          <div className="space-y-3">
            <h4 className="editorial-label text-editorial-gold">
              04 / CLINICAL STRATEGIC ELUCIDATION
            </h4>
            <p className="text-editorial-white text-sm md:text-base leading-relaxed font-light font-serif-editorial">
              {result.verdict.explanation}
            </p>
          </div>
        </div>

        {/* Immediate Checklist Action Steps */}
        <div className="space-y-4 pt-6 border-t border-editorial-border">
          <h4 className="editorial-label text-editorial-text-muted">
            05 / OPERATIONAL NEXT STEPS
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {result.verdict.actionSteps.map((step, idx) => (
              <label 
                key={idx} 
                className="flex items-start gap-3.5 p-4 bg-editorial-bg border border-editorial-border hover:border-editorial-gold/30 cursor-pointer transition-all text-sm font-light select-none group rounded"
              >
                <input 
                  type="checkbox" 
                  className="rounded border-editorial-border text-black focus:ring-editorial-gold shrink-0 mt-0.5 accent-editorial-gold cursor-pointer h-4 w-4"
                />
                <span className="text-editorial-white group-hover:text-editorial-gold transition-colors font-serif-editorial italic font-medium">
                  {step}
                </span>
              </label>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
