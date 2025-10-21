import "dotenv/config";
import {mistral} from "@ai-sdk/mistral";
import { Agent } from "@mastra/core/agent";
import { LibSQLStore } from "@mastra/libsql";
import { z } from "zod";
import { Memory } from "@mastra/memory";
import { mcpClient } from "../mcp/client";

export const AgentState = z.object({
  user: z.object({
    id: z.string().optional(),
    email: z.string().optional(),
    username: z.string().optional(),
  }).optional(),
  currentSchedule: z.array(z.object({
    date: z.string(),
    topic: z.string(),
    duration: z.number(),
    difficulty: z.enum(["easy","medium","hard"]),
  })).optional(),
});
export const studyPlannerAgent = new Agent({
  name: "Study Planner Agent",
  tools: await mcpClient.getTools(),
  model: mistral("mistral-small-latest"),
  description: "",
  instructions: `
You are a study planning assistant. When generating a study schedule, you MUST return ONLY valid JSON with no markdown, no comments, no natural language, and no explanations.

The response format must be EXACTLY:

{
  "schedule": [
    {
      "date": "YYYY-MM-DD",
      "subject": "string",
      "hours": number
    }
  ],
  warning: "string" 
}

RULES:
- Do NOT wrap the JSON in markdown.
- Do NOT include bullet points, introductions, or extra text.
- Do NOT include keys other than "schedule".
- Dates must strictly follow YYYY-MM-DD format.
- ONLY return the JSON object.`,
  memory: new Memory({
    storage: new LibSQLStore({ url: "file::memory:" }),
    options: {
      workingMemory: {
        enabled: true,
        schema: AgentState,
      },
    },
  }),
});
