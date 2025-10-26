import { createTool } from "@mastra/core";
import { generateText } from "ai";
import { mistral } from "@ai-sdk/mistral";
import z from "zod";

const model = mistral("mistral-small-latest");

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

const generatePrompt = (topic: string, durationUnit: string, durationValue: number) => {
  const breakdownMap = {
    days: "hours",
    weeks: "days",
    months: "weeks",
  };
  const breakdown = breakdownMap[durationUnit as keyof typeof breakdownMap];

  return `
You are an expert study planner and subject matter specialist with deep knowledge of effective learning pace.
Create a structured, step-by-step study plan that helps a student master the topic "${topic}" within ${durationValue} ${durationUnit}.

Requirements:
1. Break the total study duration into smaller ${breakdown} intervals, progressing logically from fundamentals to advanced understanding.

2. TIME RANGE CALCULATION - VERY IMPORTANT:
   - Each subtopic requires approximately 25-40 minutes of focused study
   - Calculate session duration based on number of subtopics: 
     * 3 subtopics = 1.5-2 hours
     * 4 subtopics = 2-3 hours  
     * 5 subtopics = 2.5-3.5 hours
     * 6 subtopics = 3-4 hours
   - Format: "Day X: HH:MMam/pm - HH:MMam/pm" (e.g., "Day 1: 10:00am - 1:00pm")
   - Typical study sessions: morning (9am-12pm or 10am-1pm), afternoon (2pm-5pm or 2pm-6pm)
   - Allow at least 1 hour break between sessions

3. For each interval, include:
   - "range": Calculated realistic study period based on subtopic count
   - "topic": Specific focused aspect of ${topic} (NOT just "${topic}")
   - "subtopics": An array of 3-6 concrete, actionable subtopics
       • "t": the name of the subtopic (string)
       • "completed": boolean, always false

4. TOPIC NAMING:
   - Each topic should be a SPECIFIC area, not generic
   - Example: Instead of "calculus", use "Limits and Continuity", "Derivative Techniques", "Integration Methods"

IMPORTANT:
- Return **pure JSON only** — no markdown, no explanations, no comments
- Do not wrap JSON in code fences
- Calculate time ranges realistically based on subtopic complexity and count
- Distribute sessions logically across ${durationValue} ${durationUnit}
- Ensure topics are specific and diverse

EXAMPLE (showing proper time calculation):

[
  {
    "range": "Day 1: 10:00am - 1:00pm",
    "topic": "Foundations of Limits and Continuity",
    "subtopics": [
      { "t": "Understanding limits through graphs and tables", "completed": false },
      { "t": "One-sided limits and limit laws", "completed": false },
      { "t": "Continuity and types of discontinuities", "completed": false },
      { "t": "Limits at infinity", "completed": false }
    ]
  },
  {
    "range": "Day 1: 2:00pm - 4:30pm",
    "topic": "Introduction to Derivatives",
    "subtopics": [
      { "t": "Definition of derivative using limits", "completed": false },
      { "t": "Geometric interpretation of derivatives", "completed": false },
      { "t": "Basic differentiation rules", "completed": false }
    ]
  },
  {
    "range": "Day 2: 10:00am - 1:30pm",
    "topic": "Advanced Differentiation Techniques",
    "subtopics": [
      { "t": "Product rule and quotient rule", "completed": false },
      { "t": "Chain rule and its applications", "completed": false },
      { "t": "Implicit differentiation", "completed": false },
      { "t": "Higher order derivatives", "completed": false },
      { "t": "Practice complex differentiation problems", "completed": false }
    ]
  }
]

Note: First session has 4 subtopics = 3 hours. Second has 3 subtopics = 2.5 hours. Third has 5 subtopics = 3.5 hours.

Now generate the complete study plan for "${topic}" over ${durationValue} ${durationUnit}:
  `;
};


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
        maxOutputTokens: 2000, // Increased token limit
        temperature: 0.3, // Lower temperature for more consistent output
      });

      console.log("Raw AI output:", aiResult.text);
      // Clean the output more aggressively
      let cleaned = aiResult.text.trim();
      
      // Remove markdown code fences
      cleaned = cleaned.replace(/```json\s*/g, "").replace(/```\s*/g, "");
      
      // Remove any leading/trailing whitespace
      cleaned = cleaned.trim();
      
      // Remove control characters but preserve valid JSON structure
      cleaned = cleaned.replace(/[\u0000-\u001F]+/g, " ");
      
      // Fix common JSON issues
      cleaned = cleaned.replace(/,\s*([}\]])/g, "$1"); // Remove trailing commas
      
      console.log("Cleaned output:", cleaned);

      let parsed: unknown;
      try {
        parsed = JSON.parse(cleaned);
      } catch (parseError) {
        console.error("JSON parse error:", parseError);
        console.error("Attempted to parse:", cleaned);
        
        // Fallback: try to extract JSON array from the text
        const arrayMatch = cleaned.match(/\[[\s\S]*\]/);
        if (arrayMatch) {
          parsed = JSON.parse(arrayMatch[0]);
        } else {
          throw new Error(`Failed to parse AI output as JSON: ${parseError}`);
        }
      }

      // Validate the structure
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

      console.log("Validated plan:", validated);

      return { plan: validated };
  },
});