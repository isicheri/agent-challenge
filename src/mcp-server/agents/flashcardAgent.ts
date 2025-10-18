import { Agent } from "@mastra/core/agent";
import {mistral} from  "@ai-sdk/mistral";
// import { createOllama } from "ollama-ai-provider-v2";
// const ollama = createOllama({
//   baseURL: process.env.NOS_OLLAMA_API_URL || process.env.OLLAMA_API_URL,
// })


// ============= FLASHCARD AGENT (OPTIMIZED) =============
export const flashcardAgent = new Agent({
  name: "flashcardAgent",
  description: "Generates flashcards from study content",
  model: mistral("ministral-3b-latest"),
  instructions: `Create 5-15 flashcards from the given text.

Return ONLY valid JSON array format:
[
  {"question": "...", "answer": "..."},
  {"question": "...", "answer": "..."}
]

STYLE ADJUSTMENTS:
- general: Balanced academic questions
- exam: Test-style assessment questions
- exam_prep: Focus on key facts and definitions
- definitions: Term-definition pairs
- conceptual: Deeper reasoning questions
- beginner: Simple wording, avoid jargon

RULES:
- Questions must be self-contained
- Answers: 1-2 sentences max
- NO markdown, NO backticks, NO code blocks
- Output pure JSON array only
- No explanations outside JSON

Start your response with [ and end with ]`,
});