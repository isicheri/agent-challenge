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
  instructions: ``,
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
