import { createTool } from "@mastra/core";
import { generateText } from "ai";
import { mistral } from "@ai-sdk/mistral";
import z from "zod";

const model = mistral("mistral-small-latest");

// ✅ Output schema must be an object at the top level
const studyPlannerOutputSchema = z.object({
  plan: z.array(
    z.object({
      range: z.string(),
      topic: z.string(),
      subtopics: z.array(
        z.object({
          t: z.string(),
          completed: z.boolean().default(false),
        })
      ),
    })
  ),
});

// 🧠 Prompt generator
// const generatePrompt = (topic: string, durationUnit: string, durationValue: number) => {
//   const breakdownMap = {
//     days: "hours",
//     weeks: "days",
//     months: "weeks",
//   };
//   const breakdown = breakdownMap[durationUnit as keyof typeof breakdownMap];

//   return `
// You are an expert study planner and subject matter specialist.
// Your task is to create a structured, step-by-step study plan that helps a student *master* the topic "${topic}" within ${durationValue} ${durationUnit}.

// You must:
// 1. Break the total study duration into smaller ${breakdown} intervals that logically progress from fundamentals to advanced understanding.
// 2. For each ${breakdown}, include:
//    - "range": A human-readable label like "Day 1 - Day 3" or "Week 2 - Week 3".
//    - "topic": A clear focus or milestone topic for that period.
//    - "subtopics": An array of 3–6 subtopics. Each subtopic must be an object with:
//        • "t": the name of the subtopic (string)
//        • "completed": a boolean, always false

// 📘 Important:
// - Return **pure JSON only** — no markdown, no explanations, no comments.
// - Do not wrap JSON in code fences.

// ✅ Example:

// [
//   {
//     "range": "Day 1 - Day 3",
//     "topic": "Foundations of Linear Differentiation",
//     "subtopics": [
//       { "t": "Understand functions and slopes", "completed": false },
//       { "t": "Explore the concept of limits", "completed": false },
//       { "t": "Learn how derivatives are defined", "completed": false },
//       { "t": "Basic derivative rules", "completed": false }
//     ]
//   },
//   {
//     "range": "Day 4 - Day 7",
//     "topic": "Differentiation Techniques",
//     "subtopics": [
//       { "t": "Power rule, product rule, quotient rule", "completed": false },
//       { "t": "Chain rule and implicit differentiation", "completed": false },
//       { "t": "Practice differentiation with complex functions", "completed": false }
//     ]
//   }
// ]
//   `;
// };
const generatePrompt = (topic: string, durationUnit: string, durationValue: number) => {
  const breakdownMap = {
    days: "hours",
    weeks: "days",
    months: "weeks",
  };
  const breakdown = breakdownMap[durationUnit as keyof typeof breakdownMap];

  return `
You are an expert study planner and subject matter specialist.
Create a structured, step-by-step study plan that helps a student *master* the topic "${topic}" within ${durationValue} ${durationUnit}.

Requirements:
1. Break the total study duration into smaller ${breakdown} intervals, progressing logically from fundamentals to advanced understanding.
2. Assign **realistic, human-readable time ranges** for each interval, e.g. "10am - 1pm", "2pm - 5pm". Make it practical so a student can follow it day by day.
3. For each interval, include:
   - "range": The realistic study period (e.g., "Day 1: 10am - 1pm", or "Week 1: Mon-Wed").
   - "topic": The main focus for that interval.
   - "subtopics": An array of 3–6 subtopics. Each subtopic must be an object with:
       • "t": the name of the subtopic (string)
       • "completed": boolean, always false

📘 Important:
- Return **pure JSON only** — no markdown, no explanations, no comments.
- Do not wrap JSON in code fences.
- Make the ranges intuitive, achievable, and distributed reasonably across the total duration.
- Total hours or days should not exceed the input duration.

✅ Example:

[
  {
    "range": "Day 1: 10am - 1pm",
    "topic": "Foundations of Linear Differentiation",
    "subtopics": [
      { "t": "Understand functions and slopes", "completed": false },
      { "t": "Explore the concept of limits", "completed": false },
      { "t": "Learn how derivatives are defined", "completed": false },
      { "t": "Basic derivative rules", "completed": false }
    ]
  },
  {
    "range": "Day 1: 2pm - 5pm",
    "topic": "Differentiation Techniques",
    "subtopics": [
      { "t": "Power rule, product rule, quotient rule", "completed": false },
      { "t": "Chain rule and implicit differentiation", "completed": false },
      { "t": "Practice differentiation with complex functions", "completed": false }
    ]
  }
]
  `;
};


// 🛠️ Tool definition
export const studyPlannerTool = createTool({
  id: "study-planner-tool",
  description: "Generates a structured study plan for a given topic and time span.",
  inputSchema: z.object({
    topic: z.string().min(1, "Topic is required"),
    durationUnit: z.enum(["days", "weeks", "months"]),
    durationValue: z.number().min(1, "Duration must be at least 1"),
  }),
  outputSchema: studyPlannerOutputSchema,
  execute: async ({ context }) => {
    const { topic, durationUnit, durationValue } = context;

    const prompt = generatePrompt(topic, durationUnit, durationValue);

    const aiResult = await generateText({
      model,
      prompt,
      maxOutputTokens: 800,
      temperature: 0.5,
    });

    let parsed: unknown;
    try {
      parsed = JSON.parse(aiResult.text);
    } catch {
      const cleaned = aiResult.text
        .replace(/```json|```/g, "")
        .replace(/[\u0000-\u001F]+/g, "")
        .trim();
      parsed = JSON.parse(cleaned);
    }

    const validated = z
      .array(
        z.object({
          range: z.string(),
          topic: z.string(),
          subtopics: z.array(
            z.object({
              t: z.string(),
              completed: z.boolean(),
            })
          ),
        })
      )
      .parse(parsed);

      console.log(validated);

    return { plan: validated };
  },
});
