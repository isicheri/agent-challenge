import { createTool } from "@mastra/core";
import { z } from "zod";
import { textSummarizeAgent } from "../agents/textSummarizeAgent.js";

async function getSummaryPrompt(content: string, style: string) {
  const finalText = cleanText(content);

  switch (style) {
    case "detailed":
      return `Give a detailed academic-style summary with explanations and examples:\n\n${finalText}`;
    case "exam_prep":
      return `Summarize this as if preparing exam revision notes — focus on key facts and definitions:\n\n${finalText}`;
    case "beginner_friendly":
      return `Explain this in simple, beginner-friendly language, like teaching a student:\n\n${finalText}`;
    case "bullet_points":
      return `Summarize this text as clean bullet points, no intro or commentary:\n\n${finalText}`;
    default:
      return `Summarize this text concisely and clearly:\n\n${finalText}`;
  }
}
function cleanText(raw: string): string {
  return raw
    .replace(/[^\x00-\x7F]/g, "") 
    .replace(/\s+/g, " ")    
    .trim();
}



export const summarizeContentTool = createTool({
  id: "summarize-content-tool",
  description: "Summarizes any uploaded or pasted text with flexible styles.",
  inputSchema: z.object({
    content: z.string().describe("The study text or content to summarize."),
    style: z.enum(["concise", "detailed", "exam_prep", "beginner_friendly", "bullet_points"])
            .default("detailed")
            .describe("The desired style of summary."),
  }),
  outputSchema: z.object({
    summary: z.string().max(3000),
    style: z.string(),
  }),
  execute: async ({ context }) => {
    const { content, style } = context;
    const prompt = await getSummaryPrompt(content, style);
   try {
  const result = await textSummarizeAgent.generateVNext([
    { role: "user", content: prompt }
  ])
  return {
    summary: result.text.trim(),
    style
  };
} catch (err) {
  console.error("Summarization failed:", err);
  return {
    summary: "The summarization model timed out or failed. Try simplifying the input or using a different style.",
    style
  };
}
  }
});