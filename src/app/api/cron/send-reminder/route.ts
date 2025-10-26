// app/api/cron/send-reminders/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { studyPlannerAgent } from "@/mastra/agents";

// Helper function to parse range: "Day 1: 10:00am - 1:00pm"
function parseRange(range: string): { dayNumber: number } | null {
  const match = range.match(/Day (\d+):/i);
  if (!match) return null;
  
  return {
    dayNumber: parseInt(match[1])
  };
}

// Helper function to convert "10:00am" to 24-hour format
function convertTo24Hour(time: string): { hours: number; minutes: number } {
  const match = time.match(/(\d{1,2}):(\d{2})(am|pm)/i);
  if (!match) return { hours: 0, minutes: 0 };
  
  let hours = parseInt(match[1]);
  const minutes = parseInt(match[2]);
  const period = match[3].toLowerCase();
  
  if (period === 'pm' && hours !== 12) hours += 12;
  if (period === 'am' && hours === 12) hours = 0;
  
  return { hours, minutes };
}

// Helper function to check if current time is within the plan item's time range
function isWithinTimeRange(range: string, currentDate: Date): boolean {
  // Parse "Day 1: 10:00am - 1:00pm" to get start and end times
  const match = range.match(/(\d{1,2}:\d{2}(?:am|pm))\s*-\s*(\d{1,2}:\d{2}(?:am|pm))/i);
  if (!match) return false;
  
  const startTime = match[1].toLowerCase();
  const endTime = match[2].toLowerCase();
  
  const start = convertTo24Hour(startTime);
  const end = convertTo24Hour(endTime);
  const currentHours = currentDate.getHours();
  const currentMinutes = currentDate.getMinutes();
  
  const startMinutes = start.hours * 60 + start.minutes;
  const endMinutes = end.hours * 60 + end.minutes;
  const currentTotalMinutes = currentHours * 60 + currentMinutes;
  
  return currentTotalMinutes >= startMinutes && currentTotalMinutes <= endMinutes;
}

// Helper function to check if we should send a reminder (every hour on the hour, within 15-min window)
function shouldSendReminderNow(currentDate: Date): boolean {
  const minutes = currentDate.getMinutes();
  // Send reminders at the top of each hour (within 0-15 minute window)
  return minutes >= 0 && minutes < 15;
}

export async function GET() {
  try {
    const now = new Date();
    
    // Find all schedules with reminders enabled
    const schedulesWithReminders = await prisma.schedule.findMany({
      where: {
        remindersEnabled: true,
        startDate: { not: null }
      },
      include: {
        user: true,
        planItems: {
          include: {
            subtopics: true
          }
        }
      }
    });

    const remindersToSend = [];

    for (const schedule of schedulesWithReminders) {
      if (!schedule.startDate) continue;

      // Calculate which day we're on
      const startDate = new Date(schedule.startDate);
      const daysSinceStart = Math.floor((now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
      const currentDayNumber = daysSinceStart + 1; // Day 1, Day 2, etc.

      // Filter plan items for today
      const todaysPlanItems = schedule.planItems.filter(item => {
        const parsed = parseRange(item.range);
        return parsed && parsed.dayNumber === currentDayNumber;
      });

      // Check each plan item
      for (const planItem of todaysPlanItems) {
        const parsed = parseRange(planItem.range);
        if (!parsed) continue;

        // Check if current time is within this plan item's time range
        // AND if it's time to send a reminder (top of the hour)
        if (isWithinTimeRange(planItem.range, now) && shouldSendReminderNow(now)) {
          // Find the first incomplete subtopic
          const incompleteSubtopic = planItem.subtopics.find(s => !s.completed);
          
          if (incompleteSubtopic) {
            remindersToSend.push({
              username: schedule.user.username,
              email: schedule.user.email,
              currentSubTopic: incompleteSubtopic.title,
              scheduleTitle: schedule.title,
              topic: planItem.topic,
              range: planItem.range
            });
          }
        }
      }
    }

    // Send all reminders
    const results = [];
    for (const reminder of remindersToSend) {
      try {
        const result = await studyPlannerAgent.generateVNext([
          {
            role: "user",
            content: `Call the "study-reminder-tool" with this exact JSON input:
            {
              "username": "${reminder.username}",
              "email": "${reminder.email}",
              "currentSubTopic": "${reminder.currentSubTopic}"
            }

            Execute the tool call and return its result.`
          }
        ]);

        console.log(`✅ Reminder sent to ${reminder.email}:`, result.text);
        
        results.push({ 
          success: true, 
          email: reminder.email,
          subtopic: reminder.currentSubTopic,
          agentResponse: result.text
        });
      } catch (error) {
        console.error(`Failed to send reminder to ${reminder.email}:`, error);
        results.push({ 
          success: false, 
          email: reminder.email, 
          error: String(error) 
        });
      }
    }

    return NextResponse.json({ 
      success: true,
      remindersSent: results.length,
      results 
    }, { status: 200 });

  } catch (error) {
    console.error("Cron job error:", error);
    return NextResponse.json({ 
      error: "Internal server error",
      details: String(error)
    }, { status: 500 });
  }
}