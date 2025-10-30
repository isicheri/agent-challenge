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

You have access to two main tools:
1. "study-planner-tool" - for generating study plans
2. "study-reminder-tool" - for sending motivational emails

## When to use study-planner-tool:
- When a user requests a study plan with a topic and timeframe
- Required parameters:
  * topic: the subject to study (string)
  * durationUnit: "days", "weeks", or "months"
  * durationValue: number (e.g., 1, 2, 3)

## When to use study-reminder-tool:
- When you receive a user's email, username, and currentSubTopic in the context
- Required parameters:
  * username: the user's name
  * email: the user's email address
  * currentSubTopic: the topic they're currently studying

## Response Format:
Always return the tool output directly as JSON. Do not add explanations.
If any error occurs, respond with: { "error": "description of the issue" }
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
