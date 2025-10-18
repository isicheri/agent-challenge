import { createTool } from "@mastra/core";
import { z } from "zod";
import { mistral } from "@ai-sdk/mistral";
import { generateText } from "ai";

// Single shared model instance
const model = mistral("ministral-3b-latest");

export const chatWithResourceTool = createTool({
  id: "chat-with-resource-tool",
  description: "USE THIS TOOL when user asks questions about uploaded files or previous study materials.",
  
  inputSchema: z.object({
    messages: z.array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string(),
      })
    ).describe("Previous conversation history"),

    resources: z.array(
      z.object({
        name: z.string(),
        content: z.string(),
      })
    ).describe("Uploaded study materials to reference"),
    
    question: z.string().describe("The user's question to answer"),
  }),

  outputSchema: z.object({
    answer: z.string(),
    usedResources: z.array(z.string()),
  }),
  
  execute: async ({ context }) => {
    const { messages, resources, question } = context;

    try {
      if (resources.length === 0) {
        return {
          answer: "No resources available to answer this question. Please upload study materials first.",
          usedResources: [],
        };
      }

      // Combine resources (truncated)
      const resourceText = resources
        .map(r => `${r.name}: ${r.content.substring(0, 500)}`)
        .join('\n\n');
      
      const conversationContext = messages
        .slice(-3) // Last 3 messages only
        .map(m => `${m.role}: ${m.content}`)
        .join('\n');

      const prompt = `Using these study materials, answer the question concisely.

Materials:
${resourceText}

Recent conversation:
${conversationContext}

Question: ${question}

Answer (be brief and helpful):`;

      const result = await Promise.race([
        generateText({
          model,
          prompt,
          maxOutputTokens: 300,
          temperature: 0.4,
        }),
        new Promise<never>((_, reject) => 
          setTimeout(() => reject(new Error('Timeout')), 15000)
        )
      ]);

      return {
        answer: result.text.trim() || "Unable to generate an answer.",
        usedResources: resources.map(r => r.name),
      };
      
    } catch (err) {
      console.error("Chat with resource failed:", err);
      
      // Simple fallback
      const relevantResource = resources.find(r => 
        r.content.toLowerCase().includes(question.toLowerCase().split(' ')[0])
      );
      
      if (relevantResource) {
        return {
          answer: `From ${relevantResource.name}: ${relevantResource.content.substring(0, 300)}...`,
          usedResources: [relevantResource.name],
        };
      }
      
      return {
        answer: "Unable to find relevant information in the uploaded materials.",
        usedResources: [],
      };
    }
  },
});