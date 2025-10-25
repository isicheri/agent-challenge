import "dotenv/config";
import {mistral} from "@ai-sdk/mistral";
import { Agent } from "@mastra/core/agent";
import { LibSQLStore } from "@mastra/libsql";
import { z } from "zod";
import { Memory } from "@mastra/memory";
import { mcpClient } from "../mcp/client";

export const AgentState = z.object({
  user: z.object({
    email: z.string().optional(),
    username: z.string().optional(),
  }).optional(),
  currentSchedule: z
    .array(
      z.object({
        range: z.string(), 
        topic: z.string(), 
       subtopics: z.array(z.object({
        title: z.string(),
        completed: z.boolean()
       }))
      })
    )
    .optional(),
  studyPlan: z
    .array(
      z.object({
        range: z.string(),
        topic: z.string(),
        subtopics: z.array(
          z.object({
            t: z.string(),
            completed: z.boolean().default(false)
          })
        )
      })
    )
    .optional(),
});

export const studyPlannerAgent = new Agent({
  name: "Study Planner Agent",
  tools: await mcpClient.getTools(),
  model: mistral("mistral-small-latest"),
  description: `
An autonomous agent that generates structured study plans using MCP tools.
It executes deterministically and returns only JSON output.
  `,
 instructions: `
You are a deterministic study planner agent.

When invoked, do not converse or explain. 
Your only job is to call the "study-planner-tool" with the provided input context and return the tool's JSON output directly.

Do not generate natural language responses, summaries, or markdown.
Return only the raw JSON data from the tool.
If any error occurs, respond with a valid JSON error object:
{ "error": "description of the issue" }
`,
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
