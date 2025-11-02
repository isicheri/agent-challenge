import {  NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { studyPlannerAgent } from "@/mastra/agents";
import z from "zod";


const createSchema = z.object({})

export async function POSR(req:Request) {
    
      const body = await req.json();
        const parsed = createSchema.safeParse(body);
        if (!parsed.success) {
          return NextResponse.json({ error: "Invalid body", details: parsed.error.errors }, { status: 400 });
        }

        

}