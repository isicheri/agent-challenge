import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, username } = body ?? {};

    if (!email || !username) {
      return NextResponse.json({ error: "Email and username are required" }, { status: 400 });
    }

    // Find user by both email and username to ensure they match
    const user = await prisma.user.findFirst({
      where: {
        AND: [
          { email: email },
          { username: username }
        ]
      }
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Fetch all schedules for this user
    const schedules = await prisma.schedule.findMany({
      where: {
        userId: user.id
      }
      // orderBy: {
      //   createdAt: 'desc'
      // }
    });

    return NextResponse.json({ schedules }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
