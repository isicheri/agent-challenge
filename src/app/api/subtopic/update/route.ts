import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { studyPlannerAgent } from "@/mastra/agents";
import z from "zod";

const updateSchema = z.object({
  scheduleId: z.string(),
  range: z.string(),      // PlanItem.range
  subIdx: z.number(),     // index of subtopic inside PlanItem
  completed: z.boolean()
});

export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid body", details: parsed.error.errors }, { status: 400 });
    }

    const { scheduleId, range, subIdx, completed } = parsed.data;

    // Transaction to ensure atomicity
    const result = await prisma.$transaction(async (tx) => {
      // ⿡ Find the PlanItem by scheduleId + range
      const planItem = await tx.planItem.findFirst({
        where: { scheduleId, range },
        include: { 
          subtopics: true,
          quiz: true // Check if quiz already exists
        }
      });
      if (!planItem) throw new Error("PlanItem not found for the given range");

      // Check the subtopic exists
      const subtopic = planItem.subtopics[subIdx];
      if (!subtopic) throw new Error("Subtopic index out of range");

      // Update the completed field
      const updatedSubtopic = await tx.subtopic.update({
        where: { id: subtopic.id },
        data: { completed }
      });

      // Check if ALL subtopics are now completed
      const allSubtopics = await tx.subtopic.findMany({
        where: { planItemId: planItem.id }
      });

      const allCompleted = allSubtopics.every(st => st.completed);

      return {
        updatedSubtopic,
        planItem,
        allCompleted,
        hasQuiz: !!planItem.quiz
      };
    });

    // If all completed AND no quiz exists, generate quiz
    let generatedQuiz = null;
    if (result.allCompleted && !result.hasQuiz) {
      console.log("🎯 All subtopics completed! Generating quiz...");

      try {
        // Prepare subtopics array
        const completedSubTopics = result.planItem.subtopics.map(st => st.title);
        const completedTopic = result.planItem.topic;

        // Call the agent to generate quiz
        const agentResponse = await studyPlannerAgent.generateVNext([
          {
            role: "user",
            content: `Call the "quiz-generator-tool" with this exact JSON input:
        {
          "completedTopic": "${completedTopic}",
          "completedSubTopics": ${JSON.stringify(completedSubTopics)}
        }
        
        Return ONLY the pure JSON output from the tool. Do not add text, markdown, or explanation. The final response must match this format:
        {
          "title": "string",
          "questions": [
            {
              "question": "string",
              "options": ["string", "string", "string", "string"],
              "answer": "A"
            }
          ]
        }`
          }
        ]);

        // Parse the quiz result from agent
        const quizData = JSON.parse(agentResponse.text);

        // Save quiz to database
        generatedQuiz = await prisma.quiz.create({
          data: {
            planItemId: result.planItem.id,
            title: quizData.title,
            questions: {
              create: quizData.questions.map((q: any) => ({
                question: q.question,
                correctAnswer: q.answer,
                options: {
                  create: q.options.map((opt: string, i: number) => ({
                    label: String.fromCharCode(65 + i), // A, B, C, D
                    content: opt
                  }))
                }
              }))
            }
          },
          include: {
            questions: {
              include: {
                options: true
              }
            }
          }
        });

        console.log("✅ Quiz generated successfully!");
        console.log("GENERATED QUIZ: ", generatedQuiz)

      } catch (quizError) {
        console.error("❌ Quiz generation failed:", quizError);
        // Don't fail the whole request if quiz generation fails
        // Just log the error and continue
      }
    }

    return NextResponse.json({ 
      updated: result.updatedSubtopic,
      allCompleted: result.allCompleted,
      quizGenerated: !!generatedQuiz,
      quiz: generatedQuiz
    }, { status: 200 });

  } catch (err: any) {
    console.error("subtopic update error:", err);
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}
