import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";

export async function DELETE(request: Request) {
  try {
    const body = await request.json();
    const { userId, scheduleId } = body ?? ({} as {
      userId: string;
      scheduleId: string;
    });

    if (!userId || !scheduleId) {
      return NextResponse.json(
        { error: "userId and scheduleId are required" },
        { status: 400 }
      );
    }

    // ✅ Ensure user exists
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // ✅ Ensure schedule exists and belongs to this user
    const schedule = await prisma.schedule.findUnique({
      where: { id: scheduleId },
    });
    if (!schedule) {
      return NextResponse.json(
        { error: "Schedule not found" },
        { status: 404 }
      );
    }

    try {
      // 🧹 Step 1: Delete subtopics (deepest level first)
      await prisma.subtopic.deleteMany({
        where: {
          planItem: {
            scheduleId: schedule.id,
          },
        },
      });

      // 🧹 Step 2: Delete plan items for this schedule
      await prisma.planItem.deleteMany({
        where: { scheduleId: schedule.id },
      });

      // 🧹 Step 3: Delete the schedule itself
      await prisma.schedule.delete({
        where: {
          id: schedule.id,
        },
      });

      return NextResponse.json(
        { message: "Schedule successfully deleted" },
        { status: 200 }
      );
    } catch (err) {
      console.error("❌ Prisma delete error:", err);
      return NextResponse.json(
        { error: "Failed to delete schedule properly" },
        { status: 502 }
      );
    }
  } catch (error) {
    console.error("❌ Internal server error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
