import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";

export async function DELETE(request: Request) {
  try {
    const body = await request.json();
    const { userId, scheduleId } = body ?? {} as {
      userId: string;
     scheduleId: string;
    };

    if (!userId || !scheduleId) {
      return NextResponse.json({ error: "userId, scheduleId are required" }, { status: 400 });
    }

    // Ensure user exists
    const user = await prisma.user.findUnique({ where: { id: userId } });
    const schedule = await prisma.schedule.findUnique({where: {id: scheduleId}})
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    if(!schedule) {
       return NextResponse.json({ error: "Schedule not found" }, { status: 404 });    
    }

    try {
        await prisma.schedule.delete({where :{
          id: scheduleId
        }})
    } catch (err) {
      console.error("❌ Failed to parse agent JSON:", err);
      return NextResponse.json({ error: "Agent returned invalid JSON" }, { status: 502 });
    }


    return NextResponse.json({ message: "schedule successfully deleted" }, { status: 200 });

  } catch (error) {
    console.error("❌ Internal server error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
