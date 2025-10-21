import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { studyPlannerAgent } from "@/mastra/agents";

type Topic = { name: string; difficulty: "easy" | "medium" | "hard"; examDate: string };
type Availability = {
  monday: number; tuesday: number; wednesday: number; thursday: number;
  friday: number; saturday: number; sunday: number;
};

function extractJSON(raw: string) {
  const match = raw.match(/\{[\s\S]*\}/); // matches first { ... } block
  if (!match) throw new Error("No JSON found in agent output");
  return JSON.parse(match[0]);
}


export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { userId, examDate, topics, availability } = body ?? {} as {
      userId: string;
      examDate: string;
      topics: Topic[];
      availability: Availability;
    };

    if (!userId || !examDate || !Array.isArray(topics) || !availability) {
      return NextResponse.json({ error: "userId, examDate, topics[], availability are required" }, { status: 400 });
    }

    // Ensure user exists
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // 🧠 Use the agent to generate the plan
    const result = await studyPlannerAgent.generateVNext([
      {
        role: "user",
        content: `Create a structured study plan (JSON only) with exam date: ${examDate}, topics: ${JSON.stringify(topics)}, availability: ${JSON.stringify(availability)}. Format:
        {
          "schedule": [
            { "date": "YYYY-MM-DD", "subject": "string", "hours": number, "difficulty": "easy|medium|hard" }
          ]
        }`
      }
    ]);

    console.log("RAW AGENT RESPONSE:", JSON.stringify(result, null, 2));

    // 🧩 Extract clean text (Mastra returns text directly)
    const rawText = result.text?.trim();
    if (!rawText) {
      return NextResponse.json({ error: "Invalid agent response (no text found)" }, { status: 502 });
    }

    // 🧠 Parse the JSON safely
    let scheduleData;
    try {
      scheduleData = extractJSON(rawText);
    } catch (err) {
      console.error("❌ Failed to parse agent JSON:", err);
      return NextResponse.json({ error: "Agent returned invalid JSON" }, { status: 502 });
    }

    if (!scheduleData.schedule || !Array.isArray(scheduleData.schedule)) {
      return NextResponse.json({ error: "Agent response missing schedule array" }, { status: 502 });
    }

    // 💾 Save to database
    const created = await prisma.schedule.create({
      data: {
        userId,
        data: scheduleData,
      },
    });

    console.log("✅ Schedule saved:", created.id);

    return NextResponse.json({ schedule: created }, { status: 201 });

  } catch (error) {
    console.error("❌ Internal server error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
