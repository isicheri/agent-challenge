import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { studyPlannerAgent } from "@/mastra/agents";

type Topic = { name: string; difficulty: "easy" | "medium" | "hard"; examDate: string };
type Availability = { monday: number; tuesday: number; wednesday: number; thursday: number; friday: number; saturday: number; sunday: number };

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { userId, examDate, topics, availability } = body ?? {} as { userId: string; examDate: string; topics: Topic[]; availability: Availability };

    if (!userId || !examDate || !Array.isArray(topics) || !availability) {
      return NextResponse.json({ error: "userId, examDate, topics[], availability are required" }, { status: 400 });
    }

    // Ensure user exists
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Use the agent to generate the plan
    const result = await studyPlannerAgent.generateVNext([
      {
        role: "user",
        content: `Create a study plan with exam date: ${examDate}, topics: ${JSON.stringify(topics)}, availability: ${JSON.stringify(availability)}`
      }
    ]);

    console.log("RAW AGENT RESPONSE:", JSON.stringify(result, null, 2));

    // ✅ TEMP: Return raw response so we know where the schedule is
    return NextResponse.json({ raw: result }, { status: 200 });

  } catch (error) {
    console.log(error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
