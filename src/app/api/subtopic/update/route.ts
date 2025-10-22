import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
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
    if (!parsed.success) return NextResponse.json({ error: "Invalid body", details: parsed.error.errors }, { status: 400 });

    const { scheduleId, range, subIdx, completed } = parsed.data;

    // Transaction to ensure atomicity
    const updated = await prisma.$transaction(async (tx) => {
      // 1️⃣ Find the PlanItem by scheduleId + range
      const planItem = await tx.planItem.findFirst({
        where: { scheduleId, range },
        include: { subtopics: true }
      });
      if (!planItem) throw new Error("PlanItem not found for the given range");

      // 2️⃣ Check the subtopic exists
      const subtopic = planItem.subtopics[subIdx];
      if (!subtopic) throw new Error("Subtopic index out of range");

      // 3️⃣ Update the completed field
      return tx.subtopic.update({
        where: { id: subtopic.id },
        data: { completed }
      });
    });

    return NextResponse.json({ updated }, { status: 200 });

  } catch (err: any) {
    console.error("subtopic update error:", err);
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}
