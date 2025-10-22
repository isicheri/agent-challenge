import { createTool } from "@mastra/core";
import { generateText } from "ai";
import { mistral } from "@ai-sdk/mistral";
import z from "zod";

const model = mistral("mistral-small-latest");

// 🧩 Define output schema separately
const studyPlannerOutputSchema = z.array(
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
);

// 🧠 Prompt generator
const generatePrompt = (topic: string, durationUnit: string, durationValue: number) => {
  const breakdownMap = {
    days: "hours",
    weeks: "days",
    months: "weeks"
  };

  const breakdown = breakdownMap[durationUnit as keyof typeof breakdownMap];

  return `
You are an expert study planner and subject matter specialist.
Your task is to create a structured, step-by-step study plan that helps a student *master* the topic "${topic}" within ${durationValue} ${durationUnit}.

You must:
1. Break the total study duration into smaller ${breakdown} intervals that logically progress from fundamentals to advanced understanding.
2. For each ${breakdown}, include:
   - "range": A human-readable label like "Day 1 - Day 3" or "Week 2 - Week 3".
   - "topic": A clear focus or milestone topic for that period.
   - "subtopics": An array of 3–6 subtopics. Each subtopic must be an object with the keys:
       • "t": the name of the subtopic (string)
       • "completed": a boolean, always set to false

📘 Important formatting rules:
- The response must be **pure valid JSON**, with no markdown, no comments, no extra text.
- Do not include explanations or reasoning.
- Do not wrap the JSON in code fences.

✅ Example output:

[
  {
    "range": "Day 1 - Day 3",
    "topic": "Foundations of Linear Differentiation",
    "subtopics": [
      { "t": "Understand functions and slopes", "completed": false },
      { "t": "Explore the concept of limits", "completed": false },
      { "t": "Learn how derivatives are defined", "completed": false },
      { "t": "Basic derivative rules", "completed": false }
    ]
  },
  {
    "range": "Day 4 - Day 7",
    "topic": "Differentiation Techniques",
    "subtopics": [
      { "t": "Power rule, product rule, quotient rule", "completed": false },
      { "t": "Chain rule and implicit differentiation", "completed": false },
      { "t": "Practice differentiation with complex functions", "completed": false }
    ]
  }
]

Remember: output **only** JSON following this exact structure.
  `;
};


// 🛠️ Tool definition
export const studyPlannerTool = createTool({
  id: "study-planner-tool",
  description: "Generates a structured study plan for a given topic and time span.",
  inputSchema: z.object({
    topic: z.string().min(1, "Topic is required"),
    durationUnit: z.enum(["days", "weeks", "months"]),
    durationValue: z.number().min(1, "Duration must be at least 1")
  }),
  outputSchema: studyPlannerOutputSchema,
  execute: async ({ context }) => {
    const { topic, durationUnit, durationValue } = context;

    const prompt = generatePrompt(topic, durationUnit, durationValue);

    const aiResult = await generateText({
      model,
      prompt,
      maxOutputTokens: 800,
      temperature: 0.5
    });

    let parsed: unknown;

    try {
      parsed = JSON.parse(aiResult.text);
    } catch {
      try {
        const cleaned = aiResult.text
          .replace(/```json|```/g, "")
          .replace(/[\u0000-\u001F]+/g, "")
          .trim();
        parsed = JSON.parse(cleaned);
      } catch (finalErr) {
        console.error("❌ Failed to parse AI output:", aiResult.text);
        throw new Error("Invalid AI response: could not parse JSON");
      }
    }

    const validated = studyPlannerOutputSchema.parse(parsed);
    console.log("✅ Study Plan Generated:", validated);
    return validated;
  }
});
