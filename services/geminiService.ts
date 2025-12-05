import { GoogleGenAI } from "@google/genai";
import { Load } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const analyzeFleetPerformance = async (loads: Load[]) => {
  try {
    const dataSummary = JSON.stringify(loads);
    
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `
        Analyze the following trucking load data provided in JSON format.
        
        Data: ${dataSummary}
        
        Please provide a concise strategic report including:
        1. **Top Performing Dispatcher**: Who is generating the most gross revenue?
        2. **Rate Per Mile Analysis**: What is the average rate per mile? Which specific load had the best rate?
        3. **Revenue Forecast**: Based on these dates, provide a brief trend analysis.
        4. **Optimization Tip**: One specific actionable tip to increase profitability based on this data.

        Format the output as simple Markdown. Do not include introductory text like "Here is the analysis". Just give the report.
      `,
    });

    return response.text;
  } catch (error) {
    console.error("Error analyzing fleet performance:", error);
    return "Unable to generate AI analysis at this time. Please check your API key.";
  }
};