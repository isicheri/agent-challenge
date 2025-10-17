import { createTool } from "@mastra/core";
import { z } from "zod";
import { flashcardAgent } from "../agents/flashcardAgent.js";

function getFlashcardPrompt(content: string, style: string) {
  return `
Hey there, brainiac 🧠✨

Let’s turn this into a batch of ${style} flashcards! Your job is to help someone learn in a fun, helpful way.

Here’s what I need:
- Flashcards in the format: [{"question": "...", "answer": "..."}, ...]
- Each one should make them *think* — even a little!
- Keep it clear, helpful, and friendly (not robotic).

Here's the text to work from:
${content}
  `;
}

export const generateFlashcardsTool = createTool({
  id: "generate-flashcards-tool",
  description: "Generates study flashcards (Q&A) from any text or extracted PDF content with flexible style options.",
  inputSchema: z.object({
    content: z.string().describe("The study text or content to generate flashcards from."),
    style: z.enum(["general", "exam", "definitions", "conceptual", "beginner"])
      .default("general")
      .describe("The desired flashcard style."),
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

    const MAX_LENGTH = 3000;
    const trimmedContent = content.length > MAX_LENGTH ? content.slice(0, MAX_LENGTH) : content;
    const prompt = getFlashcardPrompt(trimmedContent, style);

    const result = await flashcardAgent.generateVNext([
      { role: "user", content: prompt }
    ]);

    try {
      const parsed = JSON.parse(result.text);
      const validated = z.array(z.object({
        question: z.string(),
        answer: z.string(),
      })).safeParse(parsed);
      if (validated.success) {
        return { flashcards: validated.data.slice(0, 15), style };
      }
    } catch {
      // fallback parsing: alternate lines as Q/A
      const lines = result.text.split("\n").filter(Boolean);
      const flashcards = [];
      for (let i = 0; i < lines.length; i += 2) {
        flashcards.push({
          question: lines[i] || "Question missing",
          answer: lines[i + 1] || "Answer missing",
        });
      }
      return { flashcards, style };
    }

    return { flashcards: [], style };
  }
});