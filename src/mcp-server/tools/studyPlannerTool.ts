import { createTool } from "@mastra/core";
import z from "zod";

export const studyPlannerTool = createTool({
  id: "study-planner-tool",
  description:
    "Generates a smart, balanced study schedule based on weekly availability, topic difficulty, and upcoming exams. Ensures no schedule goes beyond the exam date.",
  
  inputSchema: z.object({
    examDate: z.string(), // main exam cutoff date
    topics: z.array(
      z.object({
        name: z.string(),
        difficulty: z.enum(["easy", "medium", "hard"]),
        examDate: z.string(), // individual exam date for reminders
      })
    ),
    availability: z.object({
      monday: z.number(),
      tuesday: z.number(),
      wednesday: z.number(),
      thursday: z.number(),
      friday: z.number(),
      saturday: z.number(),
      sunday: z.number(),
    }),
  }),

  outputSchema: z.object({
    schedule: z.array(
      z.object({
        date: z.string(),
        topic: z.string(),
        duration: z.number(),
        difficulty: z.enum(["easy", "medium", "hard"]),
        examDate: z.string().optional(),
      })
    ),
    warning: z.string().optional(),
  }),

  execute: async ({ context }) => {
    const { examDate, topics, availability } = context;
    const finalExamDate = new Date(examDate);

    // ⏰ Start scheduling from tomorrow
    const today = new Date();
    const currentDate = new Date(today);
    currentDate.setDate(today.getDate() + 1);

    const schedule: any[] = [];
    const difficultyHours = { easy: 2, medium: 4, hard: 6 };

    // Sort by difficulty (hardest first) and nearest exam first
    const sortedTopics = topics.sort((a, b) => {
      const dateA = new Date(a.examDate).getTime();
      const dateB = new Date(b.examDate).getTime();
      const diffWeight = { hard: 3, medium: 2, easy: 1 };
      return (
        diffWeight[b.difficulty] - diffWeight[a.difficulty] ||
        dateA - dateB
      );
    });

    const getDayName = (date: Date) =>
      date.toLocaleDateString("en-US", { weekday: "long" }).toLowerCase();

    // Check study window
    const daysBetween = Math.ceil(
      (finalExamDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (daysBetween <= 0) {
      return {
        schedule: [],
        warning: "Exam date has already passed or no valid study window.",
      };
    }

    // Clone base weekly availability
    const dailyAvailability = { ...availability };

    // Calculate total possible study hours before the exam
    const totalAvailableHours =
      Math.floor(daysBetween / 7) *
        Object.values(availability).reduce((a, b) => a + b, 0) +
      Object.values(availability)
        .slice(0, daysBetween % 7)
        .reduce((a, b) => a + b, 0);

    const totalRequiredHours = topics.reduce(
      (sum, t) => sum + difficultyHours[t.difficulty],
      0
    );

    let warning: string | undefined;
    if (totalRequiredHours > totalAvailableHours) {
      warning = `⚠️ Not enough available time before the exam. Required: ${totalRequiredHours}h, Available: ${totalAvailableHours}h.`;
    }

    // Distribute hours across available days
    for (const topic of sortedTopics) {
      let hoursNeeded = difficultyHours[topic.difficulty];

      while (hoursNeeded > 0 && currentDate < finalExamDate) {
        const dayName = getDayName(currentDate);
        const available = dailyAvailability[dayName as keyof typeof dailyAvailability] || 0;

        if (available > 0) {
          const allocated = Math.min(available, hoursNeeded);

          schedule.push({
            date: currentDate.toISOString().split("T")[0],
            topic: topic.name,
            duration: allocated,
            difficulty: topic.difficulty,
            examDate: topic.examDate,
          });

          hoursNeeded -= allocated;
          dailyAvailability[dayName as keyof typeof dailyAvailability] -= allocated;
        }

        // Move to next day
        currentDate.setDate(currentDate.getDate() + 1);

        // Reset weekly availability
        if (getDayName(currentDate) === "monday") {
          for (const day in availability) {
            dailyAvailability[day as keyof typeof availability] = availability[day as keyof typeof availability];
          }
        }
      }
    }

    return { schedule, warning };
  },
});
