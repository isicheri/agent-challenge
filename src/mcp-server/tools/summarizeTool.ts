import { createTool } from "@mastra/core";
import { z } from "zod";
import { textSummarizeAgent } from "../agents/textSummarizeAgent.js";
import {generateText} from "ai";
import { mistral } from "@ai-sdk/mistral";


// Single shared model instance
const model = mistral("ministral-3b-latest");

// ============= SUMMARIZE TOOL (USING MAIN MODEL DIRECTLY) =============
export const summarizeContentTool = createTool({
  id: "summarize-content-tool",
  description: "USE THIS TOOL when user says 'summarize', 'summary', 'explain this text', or pastes long text. Creates summaries in different styles.",
  inputSchema: z.object({
    content: z.string().describe("The full text the user wants summarized"),
    style: z.enum(["concise", "detailed", "exam_prep", "beginner_friendly", "bullet_points"])
            .default("detailed")
            .describe("How to format the summary"),
  }),
  outputSchema: z.object({
    summary: z.string().max(3000),
    style: z.string(),
  }),
  execute: async ({ context }) => {
    const { content, style } = context;
    
    try {
      // Truncate to prevent long processing
      const MAX_CHARS = 1500;
      const truncatedContent = content.substring(0, MAX_CHARS);
      
      // Build simple prompt based on style
      let prompt = "";
      switch (style) {
        case "concise":
          prompt = `Summarize in 3-4 sentences:\n\n${truncatedContent}`;
          break;
        case "bullet_points":
          prompt = `Create 6-8 bullet points summarizing:\n\n${truncatedContent}`;
          break;
        case "exam_prep":
          prompt = `List 8 key facts for exam revision:\n\n${truncatedContent}`;
          break;
        case "beginner_friendly":
          prompt = `Explain simply for beginners:\n\n${truncatedContent}`;
          break;
        default: // detailed
          prompt = `Summarize with examples and explanations:\n\n${truncatedContent}`;
      }
      
      // Direct AI call with aggressive timeout
      const result = await Promise.race([
        generateText({
          model,
          prompt,
          maxOutputTokens: 500, // Limit output to speed up
          temperature: 0.3, // Lower = faster, more focused
        }),
        new Promise<never>((_, reject) => 
          setTimeout(() => reject(new Error('Timeout')), 20000) // 20 second timeout
        )
      ]);
      
      return {
        summary: result.text.trim() || "Unable to generate summary.",
        style
      };
    } catch (err) {
      console.error("Summarization failed:", err);
      
      // Fallback to basic extraction
      const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 20);
      const fallback = sentences.slice(0, 4).join('. ') + '.';
      
      return {
        summary: `Quick summary: ${fallback}\n\n(Full AI summary unavailable - using fallback)`,
        style
      };
    }
  }
});