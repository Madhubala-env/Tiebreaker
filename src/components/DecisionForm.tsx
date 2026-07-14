import React, { useState } from "react";
import { Plus, Trash2, AlertCircle, Sparkles } from "lucide-react";

interface DecisionFormProps {
  onSubmit: (decision: string, options: string[], context: string) => void;
  isLoading: boolean;
}

const TEMPLATES = [
  {
    title: "🚗 Electric vs Hybrid",
    decision: "Should I buy a Tesla Model Y or a Honda CR-V Hybrid?",
    options: ["Tesla Model Y", "Honda CR-V Hybrid"],
    context: "I drive 40 miles daily, care about long-term fuel costs, and have public charging at my office but no home charger. I have kids and need solid cargo space."
  },
  {
    title: "💼 Startup vs Corporate Job",
    decision: "Which job offer should I accept?",
    options: ["Series A Startup (Core Engineer)", "Big Tech Corporate (MTS)"],
    context: "Startup offers $120k base + 0.5% equity, high work speed, and full remote. Big Tech offers $175k total compensation, great benefits, but hybrid office (3 days/wk) and slower pace."
  },
  {
    title: "🏙️ Relocate to NYC",
    decision: "Should I move to New York City or stay in Austin, Texas?",
    options: ["Move to New York City", "Stay in Austin, TX"],
    context: "I am single, work in marketing, love public transit, theater, and energy. Austin is warm and has my friends, but NYC feels like a once-in-a-lifetime career opportunity."
  }
];

export default function DecisionForm({ onSubmit, isLoading }: DecisionFormProps) {
  const [decision, setDecision] = useState("");
  const [options, setOptions] = useState<string[]>(["", ""]);
  const [context, setContext] = useState("");
  const [error, setError] = useState("");
  const [loadingStep, setLoadingStep] = useState(0);

  // Rotate loading text messages for a super professional experience
  React.useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isLoading) {
      setLoadingStep(0);
      interval = setInterval(() => {
        setLoadingStep((prev) => (prev + 1) % 4);
      }, 3000);
    }
    return () => clearInterval(interval);
  }, [isLoading]);

  const loadingMessages = [
    "Consulting analytical decision frameworks...",
    "Drafting detailed pros and cons for each option...",
    "Conducting SWOT vulnerability analysis...",
    "Constructing comparison criteria & final verdict..."
  ];

  const handleAddOption = () => {
    if (options.length < 5) {
      setOptions([...options, ""]);
    }
  };

  const handleRemoveOption = (index: number) => {
    if (options.length > 2) {
      const newOptions = options.filter((_, i) => i !== index);
      setOptions(newOptions);
    }
  };

  const handleOptionChange = (index: number, value: string) => {
    const newOptions = [...options];
    newOptions[index] = value;
    setOptions(newOptions);
  };

  const applyTemplate = (tpl: typeof TEMPLATES[0]) => {
    setDecision(tpl.decision);
    setOptions(tpl.options);
    setContext(tpl.context);
    setError("");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!decision.trim()) {
      setError("Please enter the decision you need to make.");
      return;
    }

    const filteredOptions = options.map((o) => o.trim()).filter((o) => o !== "");
    if (filteredOptions.length < 2) {
      setError("Please provide at least two distinct options to compare.");
      return;
    }

    onSubmit(decision, filteredOptions, context);
  };

  return (
    <div className="bg-editorial-card rounded-lg border border-editorial-border shadow-2xl overflow-hidden p-6 md:p-8">
      {/* Templates Section */}
      <div className="mb-8">
        <span className="editorial-label text-editorial-text-muted block mb-3 font-semibold">
          DECISION TEMPLATE SELECTION
        </span>
        <div className="flex flex-wrap gap-2.5">
          {TEMPLATES.map((tpl, i) => (
            <button
              key={i}
              type="button"
              disabled={isLoading}
              onClick={() => applyTemplate(tpl)}
              className="text-xs font-serif-editorial italic font-medium px-4 py-2.5 rounded border border-editorial-border bg-editorial-card-light hover:border-editorial-gold hover:text-editorial-gold text-editorial-white transition-all cursor-pointer disabled:opacity-40 disabled:pointer-events-none"
            >
              {tpl.title}
            </button>
          ))}
        </div>
      </div>

      <hr className="border-editorial-border my-6" />

      {/* Main Form */}
      <form onSubmit={handleSubmit} className="space-y-7">
        {/* Core Decision */}
        <div>
          <label className="editorial-label text-editorial-text-muted mb-2 block font-semibold flex items-center gap-1.5">
            01 / THE CORE DILEMMA
            <span className="text-editorial-gold">*</span>
          </label>
          <input
            type="text"
            required
            disabled={isLoading}
            placeholder="e.g. Which career trajectory offer should I accept?"
            value={decision}
            onChange={(e) => setDecision(e.target.value)}
            className="w-full px-4 py-3.5 bg-editorial-bg border border-editorial-border rounded text-editorial-white focus:outline-none focus:ring-1 focus:ring-editorial-gold focus:border-editorial-gold transition-all text-sm placeholder-editorial-text-muted/50"
          />
        </div>

        {/* Options */}
        <div>
          <div className="flex justify-between items-center mb-2">
            <label className="editorial-label text-editorial-text-muted block font-semibold flex items-center gap-1.5">
              02 / COMPETING ALTERNATIVES
              <span className="text-editorial-gold">*</span>
            </label>
            {options.length < 5 && (
              <button
                type="button"
                disabled={isLoading}
                onClick={handleAddOption}
                className="text-[10px] text-editorial-gold hover:text-editorial-gold-dark font-mono uppercase tracking-widest flex items-center gap-1 transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Alternative
              </button>
            )}
          </div>

          <div className="space-y-3">
            {options.map((option, index) => (
              <div key={index} className="flex gap-2">
                <div className="relative flex-1">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] font-mono font-medium text-editorial-gold bg-editorial-bg px-2 py-0.5 rounded border border-editorial-border">
                    OPT {index + 1}
                  </span>
                  <input
                    type="text"
                    required
                    disabled={isLoading}
                    placeholder={`Alternative Option ${index + 1}`}
                    value={option}
                    onChange={(e) => handleOptionChange(index, e.target.value)}
                    className="w-full pl-22 pr-4 py-3 bg-editorial-bg border border-editorial-border rounded text-editorial-white focus:outline-none focus:ring-1 focus:ring-editorial-gold focus:border-editorial-gold transition-all text-sm placeholder-editorial-text-muted/50"
                  />
                </div>
                {options.length > 2 && (
                  <button
                    type="button"
                    disabled={isLoading}
                    onClick={() => handleRemoveOption(index)}
                    className="p-3 text-editorial-text-muted hover:text-red-400 hover:bg-red-950/20 border border-editorial-border rounded transition-all cursor-pointer"
                    title="Remove alternative"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Context / Priorities */}
        <div>
          <label className="editorial-label text-editorial-text-muted mb-2 block font-semibold">
            03 / CONTEXT &amp; VALUE MULTIPLIERS
            <span className="text-[10px] font-normal text-editorial-text-muted/60 lowercase ml-1">(optional specification)</span>
          </label>
          <textarea
            disabled={isLoading}
            rows={4}
            placeholder="Introduce constraints, personal goals, budgets, timeline considerations, or emotional factors. The AI core weighs these explicitly during synthesis."
            value={context}
            onChange={(e) => setContext(e.target.value)}
            className="w-full px-4 py-3 bg-editorial-bg border border-editorial-border rounded text-editorial-white focus:outline-none focus:ring-1 focus:ring-editorial-gold focus:border-editorial-gold transition-all text-sm placeholder-editorial-text-muted/50 resize-none leading-relaxed"
          />
        </div>

        {error && (
          <div className="flex items-start gap-2.5 text-sm text-red-400 bg-red-950/20 p-4 border border-red-900/40 rounded animate-fade-in">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Submit */}
        <button
          type="submit"
          disabled={isLoading}
          className="w-full bg-editorial-gold hover:bg-editorial-gold-dark text-black font-semibold py-4 px-6 rounded transition-all hover:shadow-lg hover:shadow-editorial-gold/10 active:scale-[0.99] flex items-center justify-center gap-2 cursor-pointer disabled:bg-editorial-gold/50 disabled:pointer-events-none text-xs uppercase tracking-widest font-mono"
        >
          {isLoading ? (
            <div className="flex flex-col items-center py-0.5">
              <div className="flex items-center gap-2">
                <svg className="animate-spin h-4 w-4 text-black" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                <span>Evaluating...</span>
              </div>
            </div>
          ) : (
            <>
              <Sparkles className="w-4 h-4 text-black" />
              <span>Initiate Strategic Analysis</span>
            </>
          )}
        </button>

        {isLoading && (
          <div className="text-center animate-pulse pt-2">
            <p className="text-[10px] font-semibold text-editorial-gold uppercase tracking-widest font-mono">
              {loadingMessages[loadingStep]}
            </p>
          </div>
        )}
      </form>
    </div>
  );
}
