import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";

const app = express();
const PORT = 3000;

app.use(express.json());

// Lazy-loaded Gemini Client to prevent startup crashes if key is missing initially
let aiClient: GoogleGenAI | null = null;

function getGemini(): GoogleGenAI {
  if (!aiClient) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      throw new Error("GEMINI_API_KEY environment variable is missing. Please configure it in Settings > Secrets.");
    }
    aiClient = new GoogleGenAI({
      apiKey: key,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiClient;
}

// Helper to handle API retries with exponential backoff for high reliability
async function generateWithRetry(ai: GoogleGenAI, params: any, maxRetries = 4) {
  let delay = 1000;
  const modelsToTry = ["gemini-3.5-flash", "gemini-3.1-flash-lite"];
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    // Select model based on attempt index (fallback if needed)
    const currentModel = modelsToTry[(attempt - 1) % modelsToTry.length];
    const currentParams = { ...params, model: currentModel };
    
    try {
      console.log(`Invoking Gemini model: ${currentModel} (Attempt ${attempt}/${maxRetries})...`);
      return await ai.models.generateContent(currentParams);
    } catch (error: any) {
      console.warn(`Gemini API attempt ${attempt} with model ${currentModel} failed:`, error);
      
      if (attempt === maxRetries) {
        throw error;
      }

      const errorMsg = String(error.message || "").toUpperCase();
      const errorStatus = String(error.status || "").toUpperCase();
      const isRetryable = 
        errorMsg.includes("503") || 
        errorMsg.includes("429") || 
        errorMsg.includes("UNAVAILABLE") || 
        errorMsg.includes("OVERLOADED") || 
        errorMsg.includes("HIGH DEMAND") ||
        errorMsg.includes("RESOURCE_EXHAUSTED") ||
        errorStatus.includes("UNAVAILABLE") ||
        errorStatus.includes("RESOURCE_EXHAUSTED") ||
        errorMsg.includes("FETCH") ||
        errorMsg.includes("SOCKET") ||
        errorMsg.includes("TIMEOUT");

      if (isRetryable) {
        console.log(`Retryable error detected (status: ${error.status || "N/A"}). Waiting ${delay}ms before retry ${attempt + 1}...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        delay *= 1.5; // exponential backoff
      } else {
        throw error;
      }
    }
  }
  throw new Error("Failed to reach Gemini services after several retries.");
}

// Decision analysis endpoint
app.post("/api/analyze", async (req, res) => {
  try {
    const { decision, options, context } = req.body;

    if (!decision || !options || !Array.isArray(options) || options.length === 0) {
      return res.status(400).json({ error: "Missing required fields: decision and options (array)." });
    }

    const ai = getGemini();

    const systemInstruction = `You are "The Tiebreaker", an elite strategic decision-making analyst and objective consultant. Your purpose is to help individuals and teams break deadlocks and make highly informed, logical decisions.
You must be completely impartial, analytically rigorous, and deeply empathetic to the user's dilemma.

Given:
1. A core decision / dilemma.
2. The options under consideration.
3. Relevant user context and preferences.

You will perform three separate professional analyses and output them in a structured JSON schema:
1. **Detailed Pros & Cons** for each option, with structured text, deep-dive descriptions, and impact levels ('high', 'medium', or 'low').
2. **SWOT Analysis** of the decision space / overall dilemma.
3. **Structured Comparison Table / Matrix** that evaluates the options across 4-6 custom-crafted, highly context-relevant criteria (e.g., long-term cost, daily friction, emotional reward). Each option gets a score out of 10 for each criterion and a detailed rationale.
4. **The Tiebreaker Verdict**: A definitive recommendation (cannot be a tie!) with a recommendation confidence (0-100), a thorough explanation that acknowledges the merits of the runner-up while explaining why the recommended option ultimately wins, and immediate actionable next steps.

Ensure all advice is specific, highly contextualized, and does not use generic filler.`;

    const prompt = `Decision to make: "${decision}"
Options under consideration: ${options.map(o => `"${o}"`).join(", ")}
User context and preferences: "${context || "None provided"}"`;

    const response = await generateWithRetry(ai, {
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        systemInstruction,
        temperature: 0.7,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            summary: {
              type: Type.STRING,
              description: "A professional, objective summary of the decision dilemma, the key friction points, and what is at stake."
            },
            options: {
              type: Type.ARRAY,
              description: "The options being compared.",
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING, description: "Name of the option." },
                  pros: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        text: { type: Type.STRING, description: "A concise pro point title." },
                        description: { type: Type.STRING, description: "A one-sentence explanation/evidence." },
                        impact: { type: Type.STRING, description: "Must be 'high', 'medium', or 'low'." }
                      },
                      required: ["text", "description", "impact"]
                    }
                  },
                  cons: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        text: { type: Type.STRING, description: "A concise con point title." },
                        description: { type: Type.STRING, description: "A one-sentence explanation/evidence." },
                        impact: { type: Type.STRING, description: "Must be 'high', 'medium', or 'low'." }
                      },
                      required: ["text", "description", "impact"]
                    }
                  }
                },
                required: ["name", "pros", "cons"]
              }
            },
            swot: {
              type: Type.OBJECT,
              description: "A high-level SWOT analysis of the decision as a whole.",
              properties: {
                strengths: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Strengths of proceeding or key advantages." },
                weaknesses: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Weaknesses, vulnerabilities, or internal limitations." },
                opportunities: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Opportunities, potential positive side effects, or future growth." },
                threats: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Threats, risks, external pressures, or negative consequences." }
              },
              required: ["strengths", "weaknesses", "opportunities", "threats"]
            },
            comparisonTable: {
              type: Type.ARRAY,
              description: "A structured evaluation matrix of specific criteria.",
              items: {
                type: Type.OBJECT,
                properties: {
                  criterion: { type: Type.STRING, description: "Evaluation criterion, e.g. Cost, Time, Effort, Risk, Long-term satisfaction." },
                  description: { type: Type.STRING, description: "What this criterion represents in this context." },
                  ratings: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        optionName: { type: Type.STRING, description: "The name of the option." },
                        score: { type: Type.INTEGER, description: "Score out of 10 (1 is worst, 10 is best)." },
                        rationale: { type: Type.STRING, description: "Brief justification for this score." }
                      },
                      required: ["optionName", "score", "rationale"]
                    }
                  }
                },
                required: ["criterion", "description", "ratings"]
              }
            },
            verdict: {
              type: Type.OBJECT,
              description: "The AI's objective decision recommendation and strategic guidance.",
              properties: {
                recommendedOption: { type: Type.STRING, description: "The name of the option that is recommended in this context." },
                confidence: { type: Type.INTEGER, description: "A confidence percentage (0 to 100) based on context and criteria alignment." },
                explanation: { type: Type.STRING, description: "A highly thoughtful explanation of why this option is recommended and how to mitigate the major cons of this choice." },
                actionSteps: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Actionable, concrete immediate steps the user should take next." }
              },
              required: ["recommendedOption", "confidence", "explanation", "actionSteps"]
            }
          },
          required: ["summary", "options", "swot", "comparisonTable", "verdict"]
        }
      }
    });

    const text = response.text;
    if (!text) {
      throw new Error("Empty response received from Gemini model.");
    }

    const data = JSON.parse(text.trim());
    return res.json(data);
  } catch (error: any) {
    console.error("Analysis Error:", error);
    return res.status(500).json({ error: error.message || "An unexpected error occurred during analysis." });
  }
});

// System diagnostic endpoint to check API key presence and validity
app.get("/api/diagnostic", async (req, res) => {
  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    return res.json({
      configured: false,
      status: "MISSING",
      message: "GEMINI_API_KEY environment variable is not defined in your Secrets panel.",
      timestamp: new Date().toISOString()
    });
  }

  try {
    const ai = getGemini();
    // Test connection with a lightweight request to gemini-3.5-flash
    const testResponse = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: "Return only the word 'OK'."
    });

    const isWorking = testResponse.text?.trim().toUpperCase().includes("OK");

    return res.json({
      configured: true,
      status: isWorking ? "HEALTHY" : "DEGRADED",
      message: isWorking 
        ? "API Key is fully configured and successfully authenticated with Google Gemini services." 
        : `API authenticated but returned unexpected test response: ${testResponse.text}`,
      keyLength: key.length,
      lastFour: key.slice(-4),
      modelUsed: "gemini-3.5-flash",
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error("Diagnostic endpoint error:", error);
    return res.json({
      configured: true,
      status: "ERROR",
      message: error.message || "An error occurred while calling the Gemini API.",
      statusText: error.status || "UNAVAILABLE",
      code: error.code || 500,
      timestamp: new Date().toISOString()
    });
  }
});

// Serve frontend assets
async function setupVite() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

setupVite().catch((err) => {
  console.error("Failed to start server:", err);
});
