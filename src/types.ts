export interface ProConItem {
  text: string;
  description: string;
  impact: "high" | "medium" | "low";
  weight?: number; // 0 to 3 or 0 to 5 (user-adjustable slider, defaults to 1)
}

export interface OptionAnalysis {
  name: string;
  pros: ProConItem[];
  cons: ProConItem[];
}

export interface SwotAnalysis {
  strengths: string[];
  weaknesses: string[];
  opportunities: string[];
  threats: string[];
}

export interface RatingItem {
  optionName: string;
  score: number; // 1 to 10
  rationale: string;
}

export interface CriterionItem {
  criterion: string;
  description: string;
  ratings: RatingItem[];
  userWeight?: number; // 1 to 5 (user-adjustable slider, defaults to 3)
}

export interface VerdictAnalysis {
  recommendedOption: string;
  confidence: number; // 0 to 100
  explanation: string;
  actionSteps: string[];
}

export interface AnalysisResult {
  summary: string;
  options: OptionAnalysis[];
  swot: SwotAnalysis;
  comparisonTable: CriterionItem[];
  verdict: VerdictAnalysis;
}

export interface SavedDecision {
  id: string;
  decision: string;
  options: string[];
  context: string;
  createdAt: string;
  result: AnalysisResult;
  // User weights overrides for pros/cons and criteria
  customWeights?: {
    // key is optionName + "_" + (pro|con) + "_" + text
    [key: string]: number;
  };
  customCriteriaWeights?: {
    [criterionName: string]: number;
  };
}
