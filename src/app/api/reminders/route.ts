import { NextResponse } from "next/server";
import { studyPlannerAgent } from "@/mastra/agents";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { to, subject, message } = body ?? {};

    if (!to || !subject || !message) {
      return NextResponse.json({ error: "to, subject, message are required" }, { status: 400 });
    }

    // Use the agent to send reminder
     await studyPlannerAgent.generate([
      {
        role: "user",
        content: `Send a reminder email to ${to} with subject: ${subject} and message: ${message}`
      }
    ]);

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}


