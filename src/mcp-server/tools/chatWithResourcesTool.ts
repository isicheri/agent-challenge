import { createTool } from "@mastra/core";
import { z } from "zod";
import { textSummarizeAgent } from "../agents/textSummarizeAgent.js";

export const chatWithResourceTool = createTool({
  id: "chat-with-resource-tool",
  description: "Chat with study materials directly — uses conversation history and uploaded text resources for context.",

  inputSchema: z.object({
    messages: z.array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string(),
      })
    ).describe("Previous conversation history."),

    resources: z.array(
      z.object({
        name: z.string(),
        content: z.string(),
      })
    ).describe("List of resources to use for answering."),
    
    question: z.string().describe("The new question to answer."),
  }),

  outputSchema: z.object({
    answer: z.string(),
    usedResources: z.array(z.string()),
  }),
execute: async ({ context }) => {
  const { messages, resources, question } = context;

  const conversationHistory = messages
    .map((m) => `${m.role === "user" ? "👤" : "🤖"}: ${m.content}`)
    .join("\n");

  const resourceTexts = resources
    .map((r) => `📘 ${r.name}:\n${r.content.substring(0, 2000)}\n`)
    .join("\n\n");

  const prompt = `
You are a helpful and knowledgeable AI study assistant.

Use the following conversation history and study materials to answer the user's question clearly and helpfully.

--- Conversation History ---
${conversationHistory}

--- Study Materials ---
${resourceTexts}

--- Question ---
${question}

Please list the study materials you used at the end of your answer, like:
Used resources: Resource1, Resource2

Guidelines:
- If unsure, say so but provide related context.
- Be concise but helpful.
`;

  const result = await textSummarizeAgent.generate([
    { role: "user", content: prompt },
  ]);

  const answerText = result.text ?? "";
  const match = answerText.match(/Used resources:\s*(.*)$/i);

  const usedResources = match && match[1]
    ? match[1].split(",").map((s) => s.trim())
    : [];

  const cleanAnswer = match
    ? answerText.replace(/Used resources:.*$/i, "").trim()
    : answerText.trim();

  return {
    answer: cleanAnswer,
    usedResources,
  };
},
});