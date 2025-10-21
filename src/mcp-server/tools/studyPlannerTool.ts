import { createTool } from "@mastra/core";
import z from "zod";


export const studyPlannerTool = createTool({
    id: "study-planner-tool",
    description: "Generates a personalized study schedule based on exam dates, topic difficulty, and weekly availability.",
    inputSchema: z.object({
        examDate: z.string(),
        topics: z.array(z.object({
            name: z.string(),
            difficulty: z.enum(["easy","medium","hard"]),
            examDate: z.string()
        })),
       availability: z.object({
  monday: z.number(),
  tuesday: z.number(),
  wednesday: z.number(),
  thursday: z.number(),
  friday: z.number(),
  saturday: z.number(),
  sunday: z.number(),
})
    }),
    outputSchema: z.object({
       schedule: z.array(
           z.object({
            date: z.string(),
            topic: z.string(),
            duration: z.number(),   // hours allocated
            difficulty: z.enum(["easy", "medium", "hard"]),
    })
  ) 
    }),
    execute: async({context}) =>  {
        const {examDate,topics,availability} = context;

        // Convert exam date
const finalExamDate = new Date(examDate);

// Sort topics by examDate first, then difficulty
const sortedTopics = topics.sort((a, b) => {
  const dateA = new Date(a.examDate);
  const dateB = new Date(b.examDate);

  if (dateA.getTime() !== dateB.getTime()) {
    return dateA.getTime() - dateB.getTime(); // earlier exams first
  }

  // Difficulty ranking
  const difficultyWeight = { hard: 3, medium: 2, easy: 1 };
  return difficultyWeight[b.difficulty] - difficultyWeight[a.difficulty];
});

const difficultyHours = { easy: 2, medium: 4, hard: 6 };

const topicPlans = sortedTopics.map(topic => ({
  ...topic,
  hoursNeeded: difficultyHours[topic.difficulty]
}));

const today = new Date();
const currentDate = new Date(today);

const getDayName = (date: Date) =>
  date.toLocaleDateString("en-US", { weekday: "long" }).toLowerCase();

const schedule: any[] = [];

for (const topic of topicPlans) {
  let remainingHours = topic.hoursNeeded;

  while (remainingHours > 0 && currentDate <= finalExamDate) {
    const dayName = getDayName(currentDate);
    const availableHours = availability[dayName as keyof typeof availability] || 0;

    if (availableHours > 0) {
      const allocatedHours = Math.min(remainingHours, availableHours);

      schedule.push({
        date: currentDate.toISOString().split("T")[0],
        topic: topic.name,
        duration: allocatedHours,
        difficulty: topic.difficulty,
      });

      remainingHours -= allocatedHours;
      availability[dayName as keyof typeof availability] -= allocatedHours;
    }

    // Move to next day
    currentDate.setDate(currentDate.getDate() + 1);
  }
}

        return {
            schedule
        }
    },
})