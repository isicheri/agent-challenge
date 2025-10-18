import { createTool } from "@mastra/core";
import { z } from "zod";
import { mistral } from "@ai-sdk/mistral";
import {generateText} from "ai";

// Single shared model instance
const model = mistral("ministral-3b-latest");

export const generateFlashcardsTool = createTool({
  id: "generate-flashcards-tool",
  description: "USE THIS TOOL when user says 'flashcards', 'flash cards', 'quiz me', 'test me', 'create cards'. Generates Q&A flashcards from text.",
  inputSchema: z.object({
    content: z.string().describe("The text to create flashcards from"),
    style: z.enum(["general", "exam", "exam_prep", "definitions", "conceptual", "beginner"])
      .default("general")
      .describe("Type of flashcards to generate"),
  }),
  outputSchema: z.object({
    flashcards: z.array(z.object({
      question: z.string(),
      answer: z.string(),
    })),
    style: z.string(),
  }),
  execute: async ({ context }) => {
    const { content, style } = context;

    if (!content.trim()) {
      return { flashcards: [], style };
    }

    try {
      // Truncate content
      const MAX_LENGTH = 1200;
      const trimmedContent = content.length > MAX_LENGTH ? content.slice(0, MAX_LENGTH) : content;
      
      const prompt = `Create 5-7 ${style} flashcards from this text. Return ONLY a JSON array like this:
[{"question": "...", "answer": "..."}, {"question": "...", "answer": "..."}]

Text:
${trimmedContent}

JSON array:`;

      // Direct AI call with timeout
      const result = await Promise.race([
        generateText({
          model,
          prompt,
          maxOutputTokens: 600,
          temperature: 0.3,
        }),
        new Promise<never>((_, reject) => 
          setTimeout(() => reject(new Error('Timeout')), 20000)
        )
      ]);
      
      // Try to parse JSON
      try {
        // Extract JSON from response (in case model adds extra text)
        const jsonMatch = result.text.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          const validated = z.array(z.object({
            question: z.string(),
            answer: z.string(),
          })).safeParse(parsed);
          
          if (validated.success && validated.data.length > 0) {
            return { flashcards: validated.data.slice(0, 10), style };
          }
        }
      } catch (parseErr) {
        console.error("JSON parse failed:", parseErr);
      }
      
      // Fallback: Generate basic flashcards from sentences
      const sentences = trimmedContent.split(/[.!?]+/).filter(s => s.trim().length > 20);
      const fallbackCards = sentences.slice(0, 5).map((s, i) => ({
        question: `Question ${i + 1}: What is mentioned about the topic?`,
        answer: s.trim()
      }));
      
      return { flashcards: fallbackCards, style };
      
    } catch (err) {
      console.error("Flashcard generation failed:", err);
      
      // Emergency fallback
      const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 20);
      return { 
        flashcards: [
          {
            question: "What is the main topic discussed?",
            answer: sentences[0]?.trim() || "Content unavailable"
          }
        ], 
        style 
      };
    }
  }
});