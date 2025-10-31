// app/api/quiz/[quizId]/start/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import z from "zod";

const startSchema = z.object({
  userId: z.string(),
});

export async function POST(
  req: Request,
  { params }: { params: Promise<{ quizId: string }> } // ← Changed to Promise
) {
  try {
    const body = await req.json();
    const parsed = startSchema.safeParse(body);
    
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid body", details: parsed.error.errors },
        { status: 400 }
      );
    }

    const { userId } = parsed.data;
    const { quizId } = await params; // ← Await params

    // Get quiz with questions
    const quiz = await prisma.quiz.findUnique({
      where: { id: quizId },
      include: {
        questions: {
          include: {
            options: true,
          },
        },
      },
    });

    if (!quiz) {
      return NextResponse.json({ error: "Quiz not found" }, { status: 404 });
    }

    // Create quiz attempt
    const attempt = await prisma.quizAttempt.create({
      data: {
        quizId,
        userId,
        score: 0,
        totalQuestions: quiz.questions.length,
        percentage: 0,
      },
      include: {
        quiz: {
          include: {
            questions: {
              include: {
                options: true,
              },
            },
          },
        },
      },
    });

    return NextResponse.json({ attempt }, { status: 201 });
  } catch (err: any) {
    console.error("Quiz start error:", err);
    return NextResponse.json(
      { error: err.message || "Internal server error" },
      { status: 500 }
    );
  }
}