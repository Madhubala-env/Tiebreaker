## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`
🎨 Visual & Aesthetic Design
Aesthetic Pairings: Styled with negative space, high-contrast typography, and a modern light background with slate border framing.
Inter & Space Grotesk Typography: Leveraged Inter for legible data grids and instructions, paired with Space Grotesk for clean display headings.
Micro-Transitions: Integrated entry animations and dynamic state transitions to give immediate feedback when making adjustments.
🧭 Key Functional Modules
Dilemma Workshop: Features a dynamic input center where you can describe your decision, list up to 5 custom options, and specify your context and priorities.
Quick-Start Templates: Preloaded with realistic decision templates—such as comparing an electric vehicle to a hybrid, accepting a tech corporate vs. startup job offer, or relocating to a new city—enabling instant evaluation.
Weighted Priority Balance Beam: Converts Gemini’s multi-perspective pros and cons list into interactive slider cards. You can adjust the importance of individual pros or cons from 0 (ignore) to 4 (dealbreaker), causing the weighted priority balance indicator to shift real-time between the options.
Structured Criteria Matrix: Evaluates options against 4–6 context-aware criteria (e.g., upfront costs, friction, career longevity) scored on a 10-point scale. Includes importance sliders to let you prioritize what matters most to you.
SWOT Analysis Bento Grid: Displays a structured strengths, weaknesses, opportunities, and threats analysis for the overall decision space.
Strategic AI Verdict: Houses the recommended choice, a confidence percentage index, a detailed explanation of major trade-offs, and an interactive checklist of immediate action steps.
Durable Local History & Exporting: Preserves your analyzed decisions and weight overrides within your browser's local storage. Includes a history modal to re-evaluate past options and an export button to copy a beautifully formatted markdown report.
 Aesthetic Implementation
Sophisticated Dark Palette: Shifted the entire layout to an immersive, elegant dark color space featuring a clean near-black canvas (#0d0d0d), metallic gold accents (#d4af37), and off-white typography for optimal readability.
Premium Serif Pairings: Integrated the gorgeous Lora italic serif font family for central dilemmas, headers, and strategic verdicts, complemented by high-contrast Plus Jakarta Sans labels set in tracking-spaced uppercase to resemble an agency research brief.
Classic Print Framing: Constructed the page layout using fine structural borders (border-editorial-border) and signature top-accent bars—highlighting advantages with soft-silver highlights and risk factors with metallic gold lines.
Dynamic Balance Level: Restyled the real-time weight evaluation engine with a custom level gauge and brass tracking sphere, keeping calculations smooth and interactive.
Integrated Architecture: Redesigned all elements—including form templates, input boxes, comparative sliders, SWOT bento grids, and the historical archives overlay—to reflect this premium editorial style.
