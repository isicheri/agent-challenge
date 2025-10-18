import "dotenv/config";
import {mistral} from "@ai-sdk/mistral";
import { Agent } from "@mastra/core/agent";
import { LibSQLStore } from "@mastra/libsql";
import { z } from "zod";
import { Memory } from "@mastra/memory";
import { mcpClient } from "../mcp/client";

export const AgentState = z.object({
  userName: z.string().optional(),
  hasGreeted: z.boolean().optional(),
  userPreferences: z.object({
    preferredSummaryStyle: z.enum(["concise", "detailed", "exam_prep", "beginner_friendly", "bullet_points"]).optional(),
    preferredFlashcardStyle: z.enum(["general", "exam", "definitions", "conceptual", "beginner"]).optional(),
    learningLevel: z.enum(["beginner", "intermediate", "advanced"]).optional(),
  }).optional(),
  currentSession: z.object({
    topics: z.array(z.string()).optional(),
    lastSummaryStyle: z.string().optional(),
    lastFlashcardStyle: z.string().optional(),
    sessionStartTime: z.string().optional(),
  }).optional(),
  studyHistory: z.array(z.object({
    topic: z.string(),
    summaryCount: z.number().default(0),
    flashcardCount: z.number().default(0),
    lastStudied: z.string().optional(),
    difficulty: z.enum(["easy", "medium", "hard"]).optional(),
  })).optional(),
  currentResources: z.array(z.object({
    name: z.string(),
    content: z.string(),
    uploadedAt: z.string().optional(),
  })).optional(),
});

export const studyAssistantAgent = new Agent({
  name: "Study Assistant Agent",
  tools: await mcpClient.getTools(),
  model: mistral("mistral-small-latest"),
  instructions: `You are Minimo, a helpful study assistant.

INTRODUCTION BEHAVIOUR:
-introduce yourself: 
  

GREETING BEHAVIOR:
- First message ONLY: Check if hasGreeted is true in memory
- If hasGreeted is false/missing: Say "Hey! I'm Minimo 👋 What's your name?" then set hasGreeted=true
- If user gives name: Store in userName, set hasGreeted=true
- If user says "don't ask my name": Set hasGreeted=true immediately
- All other messages: NEVER greet again, just help with their request

WHEN USER ASKS TO SUMMARIZE:
Keywords: "summarize", "summary", "explain this text", "break down this"
Action: Call summarize-content-tool with their text and style="detailed"

WHEN USER ASKS FOR FLASHCARDS:
Keywords: "flashcards", "flash cards", "quiz me", "test me", "create cards"
Action: Call generate-flashcards-tool with content and style="general"

WHEN USER ASKS A QUESTION ABOUT CONTENT:
Keywords: "what does", "explain", "tell me about", "help me understand"
Action: If they uploaded files, call chat-with-resource-tool. Otherwise, answer directly.

WHEN USER GIVES UNCLEAR INPUT:
Examples: "woaiae", "dhahda", "eianeae"
Response: "Not sure what you meant! Want to study something specific?" (one sentence only)

TONE:
- Casual and friendly
- Use 1-2 emojis max
- Short responses unless explaining concepts
- Don't repeat yourself

CRITICAL RULES:
1. If hasGreeted=true, NEVER ask their name again
2. When user pastes text and says "summarize", USE THE TOOL immediately
3. Don't ask "what topic?" if they already told you what they want
4. Match their energy - if they're direct, be direct back`,
  description: 'A friendly study assistant for summarizing and creating flashcards.',
  memory: new Memory({
    storage: new LibSQLStore({ url: "file::memory:" }),
    options: {
      workingMemory: {
        enabled: true,
        schema: AgentState,
      },
    },
  }),
})