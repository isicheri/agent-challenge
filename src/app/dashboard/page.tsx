"use client";
import Image from "next/image";
import Link from "next/link";
import { CalendarCheck, ListTodo } from "lucide-react";
import { useState, useEffect } from "react";
import ScheduleCard from "../components/ScheduleCard";
import { Prisma } from "@prisma/client";
import LoaderOverlay from "../components/LoaderOverlay";

export type Quiz = Prisma.QuizGetPayload<{
  include: {
    questions: {
      include: {
        options: true;
      };
    };
    attempts: true;
    planItem: true;
  };
}>;

type Subtopic = { id: string; t: string; title: string; completed: boolean };

type PlanItem = {
  id: string;
  range: string;
  topic: string;
  subtopics: Subtopic[];
};

type ScheduleType = {
  id: string;
  title: string;
  remindersEnabled: boolean;
  startDate: string | null;
  createdAt: string;
  planItems: PlanItem[];
};

// Define the types for quiz history
type QuizAttempt = Prisma.QuizAttemptGetPayload<{
  include: {
    answers: {
      include: {
        question: {
          include: {
            options: true;
          };
        };
        selectedOption: true;
      };
    };
  };
}>;

type QuizHistoryStats = {
  totalAttempts: number;
  completedAttempts: number;
  incompleteAttempts: number;
  averageScore: number;
  bestScore: number;
  worstScore: number;
  passRate: number;
};

type QuizHistoryResponse = {
  attempts: QuizAttempt[];
  completed: QuizAttempt[];
  incomplete: QuizAttempt[];
  stats: QuizHistoryStats;
};

export default function StudyPlannerApp() {
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [userId, setUserId] = useState<string | null>(null);

  const [topicInput, setTopicInput] = useState("");
  const [durationUnit, setDurationUnit] = useState<"days" | "weeks" | "months">(
    "weeks"
  );
  const [durationValue, setDurationValue] = useState<number>(1);

  const [generatedPlan, setGeneratedPlan] = useState<PlanItem[] | []>([]);
  const [createdSchedule, setCreatedSchedule] = useState<any | null>(null);
  const [userSchedules, setUserSchedules] = useState<ScheduleType[]>([]);

  const [loading, setLoading] = useState(false);
  const [savingSchedule, setSavingSchedule] = useState(false);
  const [deletingSchedule, setDeletingSchedule] = useState(false);
  const [enablingReminder, setEnablingReminder] = useState(false);
  const [completingTask, setCompletingTask] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tabMode, setTabMode] = useState<string>("schedules");
  const [expanded, setExpanded] = useState<boolean>(false);
  const [expandedSchedules, setExpandedSchedules] = useState<Set<string>>(
    new Set()
  );
  const [userQuizzes, setUserQuizzes] = useState<QuizHistoryResponse | null>(
    null
  );

  const studyTopics = [
    "Set Theory",
    "Linear Algebra",
    "Computer Networks",
    "Data Structures",
    "Microeconomics",
    "Operating Systems",
    "Human Psychology",
    "Digital Logic Design",
    "Environmental Science",
    "Artificial Intelligence",
  ];
  const [randomTopic, setRandomTopic] = useState<string>(studyTopics[0]);

  function getRandomTopic() {
    const randomIndex = Math.floor(Math.random() * studyTopics.length);
    setRandomTopic(studyTopics[randomIndex]);
  }

  useEffect(() => {
    getRandomTopic();
  }, [generatedPlan]);

  const toggleExpand = (id: string) => {
    setExpandedSchedules((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
        setExpanded(true);
      } else {
        newSet.add(id);
        setExpanded(false);
      }
      return newSet;
    });
  };

  //Auto-logout
  useEffect(() => {
    const savedUserId = localStorage.getItem("userId");
    const savedEmail = localStorage.getItem("email");
    const savedUsername = localStorage.getItem("username");
    if (!savedUserId && !savedEmail && !savedUsername) {
      window.location.href = "/onboarding";
    }
  }, []);

  /* ------------------- Schedule ------------------- */
  async function generatePlan(e: React.FormEvent) {
    e.preventDefault();
    if (!userId) {
      setError("Create a user first");
      return;
    }
    setError(null);
    setLoading(true);
    setGeneratedPlan([]);
    try {
      const res = await fetch("/api/schedules/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic: topicInput,
          durationUnit,
          durationValue,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.plan)
        throw new Error(data.error || "Failed to generate plan");
      setGeneratedPlan(data.plan);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function saveGeneratedPlan() {
    if (!userId || !generatedPlan) return;
    setError(null);
    setSavingSchedule(true);
    try {
      const res = await fetch("/api/schedules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          title: `${topicInput} Plan`,
          plan: generatedPlan,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save schedule");
      setCreatedSchedule(data.schedule);
      setGeneratedPlan([]);
      setTopicInput("");
      setDurationValue(1);
      await fetchUserSchedules();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSavingSchedule(false);
    }
  }

  async function fetchUserSchedules() {
    if (!email || !username) return;

    try {
      const res = await fetch("/api/schedules/list", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, username }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to fetch schedules");
      setUserSchedules(data.schedules || []);
    } catch (err: any) {
      setError(err.message);
    }
  }

  async function deleteUserSchedule(scheduleId: string) {
    if (!userId || !scheduleId) return;
    try {
      setDeletingSchedule(true);
      const res = await fetch("/api/schedules/delete", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, scheduleId }),
      });
      if (!res.ok) throw new Error("Failed to delete schedule");
      await fetchUserSchedules();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setDeletingSchedule(false);
    }
  }

  async function toggleReminders(scheduleId: string, enable: boolean) {
    if (!email) return;
    setError(null);
    setEnablingReminder(true);

    try {
      let startDate = new Date().toISOString();
      if (enable) {
        startDate = new Date().toISOString();
      }

      const res = await fetch("/api/reminders/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scheduleId,
          userId: userId,
          toggleInput: enable,
          startDate: enable ? startDate : null,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to toggle reminders");

      await fetchUserSchedules();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setEnablingReminder(false);
    }
  }

  /* ------------------- Quiz ------------------- */

  async function fetchUserQuizHistory(
    userId: string,
    status?: "completed" | "incomplete"
  ) {
    const url = status
      ? `/api/users/${userId}/quiz-history?status=${status}`
      : `/api/users/${userId}/quiz-history`;

    const response = await fetch(url, {
      method: "GET",
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch quiz history: ${response.statusText}`);
    }

    const data = await response.json();
    console.log(data);
    return data;
  }

  useEffect(() => {
    console.log("GENERATED PLAN:", generatedPlan);
  }, [generatedPlan]);

  async function toggleSubtopicCompleted(
    scheduleId: string,
    range: string,
    subIdx: number,
    completed: boolean
  ): Promise<void> {
    if (!userId) return Promise.resolve();
    setCompletingTask(true);
    setError(null);

    try {
      const res = await fetch("/api/subtopic/update", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scheduleId, range, subIdx, completed }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update subtopic");

      setUserSchedules((prev) =>
        prev.map((s) => {
          if (s.id !== scheduleId) return s;
          return {
            ...s,
            planItems: s.planItems.map((item) => {
              if (item.range !== range) return item;
              return {
                ...item,
                subtopics: item.subtopics.map((sub, idx) =>
                  idx === subIdx ? { ...sub, completed } : sub
                ),
              };
            }),
          };
        })
      );
    } catch (err: any) {
      setError(err.message);
      throw err; // Re-throw so the loading state can be properly handled
    } finally {
      setCompletingTask(false);
    }
  }

  function logout() {
    localStorage.clear();
    setUserId(null);
    setEmail("");
    setUsername("");
    setUserSchedules([]);
    setCreatedSchedule(null);
    setGeneratedPlan([]);
    window.location.pathname = "/onboarding";
  }

  useEffect(() => {
    const savedUserId = localStorage.getItem("userId");
    const savedEmail = localStorage.getItem("email");
    const savedUsername = localStorage.getItem("username");
    if (savedUserId && savedEmail && savedUsername) {
      setUserId(savedUserId);
      setEmail(savedEmail);
      setUsername(savedUsername);
    }
  }, []);

  useEffect(() => {
    if (userId) fetchUserSchedules();
  }, [userId]);

  /* ------------------- Render ------------------- */

  return (
    <main className="min-h-screen --font-darker-grotesque bg-gray-100 -bg-[#191919]">
      <LoaderOverlay />
      <div className="header bg-[#18181d] text-white p-4 md:p-6 md:px-8 lg:px-16 flex justify-between max-w- mx-auto">
        <Link href="/">
          <Image src="/logo.svg" width={140} height={40} alt="" />
        </Link>
        <div className="flex items-center gap-4">
          <div className="account-panel flex items-center gap-2">
            <Image alt="" src="/profile-icon.svg" width={25} height={25} />
            <span className=" capitalize ">
              Welcome, <b>{username ? username : "Guest user"}</b>
            </span>
          </div>
          <button
            onClick={logout}
            className="p-2 pr-3  pl-4 flex gap-2 rounded-full bg-gradient-to-br from-gry/30 bg-gry/15 hover:bg-gry/20 duration-200 cursor-pointer"
          >
            Sign out
            <Image alt="" src="/logout.svg" width={20} height={20} />
          </button>
        </div>
      </div>

      <div className="body w-full mx-auto p-6 flex flex-col lg:flex-row gap-4">
        {/* Create & Preview Schedule */}
        <div className="Generate-panel lg:sticky top-4 w-full lg:w-[40%] bg-white bg-gry/3--text-white rounded-3xl p-6 h-max">
          <h2 className="New-title text-2xl pb-4 border-b border-gry/20 font-semibold mb-6 text-gray">
            New Study Plan
          </h2>
          <form onSubmit={generatePlan} className="space-y-4 text-lg">
            <input
              type="text"
              placeholder={`Topic (e.g ${randomTopic})`}
              value={topicInput}
              onChange={(e) => setTopicInput(e.target.value)}
              className="w-full p-3 text-black placeholder:text-gry bg-gry/10 bg-gradient-to-br from-gry/15 via-transparent to-gry/5 outline-none border border-transparent shadow-gry/15 focus:border-wht duration-200 focus:shadow-xl focus:bg-wht rounded-full px-5 "
              required
            />
            <div className="flex gap-2 items-center">
              <div className="text-gry w-max border-r border-gry/20 pr-6 mr-4">
                Timeframe
              </div>
              <input
                type="number"
                min={1}
                value={durationValue}
                onChange={(e) => setDurationValue(Number(e.target.value))}
                className=" bg-gry/10 bg-gradient-to-br from-gry/15 via-transparent to-gry/5 outline-none border border-transparent shadow-gry/15 focus:border-wht duration-200 focus:shadow-xl focus:bg-wht rounded-full px-6 py-1.5 w-20 text-gray"
                required
              />
              <select
                value={durationUnit}
                onChange={(e) => setDurationUnit(e.target.value as any)}
                className=" bg-gry/10 bg-gradient-to-br from-gry/15 via-transparent to-gry/5 outline-none border border-transparent shadow-gry/15 focus:border-wht duration-200 focus:shadow-xl focus:bg-wht rounded-full px-6 py-1.5 text-gray"
              >
                <option value="days">Day{durationValue > 1 ? "s" : ""}</option>
                <option value="weeks">
                  Week{durationValue > 1 ? "s" : ""}
                </option>
                <option value="months">
                  Month{durationValue > 1 ? "s" : ""}
                </option>
              </select>
            </div>
            <button
              type="submit"
              className="gradient-btn hover:shadow-2xl shadow-2xl hover:shadow-purple-500/30 duration-300 hover:brightness-110 hover:shadow-3xl w-full flex text-lg items-center justify-center gap-2 bg-purple-500 text-white p-3 rounded-full"
              disabled={loading}
            >
              {loading ? "Generating" : "Generate Plan"}
              {loading ? (
                <Image
                  alt=""
                  src="/loader.svg"
                  width={20}
                  height={20}
                  className="spinner"
                />
              ) : (
                <Image
                  alt=""
                  src="/sparkles.svg"
                  width={20}
                  height={20}
                  className=""
                />
              )}
            </button>
          </form>

          {generatedPlan.length ? (
            <div className="mt-6 border border-gry/15 p-4 bg-gray-50 rounded-xl text-gray">
              <div className="gradText uppercase text-xs">
                Schedule Generated
              </div>
              <h3 className="font-semibold text-2xl border-b border-gry/20  pb-4 mb-4 text-black">
                Preview Plan
              </h3>

              <div className="space-y-6">
                {generatedPlan?.map((item, index) => (
                  <div
                    key={index}
                    className="rounded-xl p-6 shadow-xl shadow-gry/20 bg-gradient-to-br from-white to-transparent"
                  >
                    <h2 className="text-xl font-semibold mb-1">{item.range}</h2>
                    <h3 className="text-lg text-gray-700 mb-3">{item.topic}</h3>

                    <ul className="list-disc list-inside space-y-1">
                      {item.subtopics.map((sub, i) => (
                        <li key={i}>{sub.t}</li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
              <button
                onClick={saveGeneratedPlan}
                className="mt-3 flex items-center gap-2 justify-center w-full bg-blk hover:bg-blk/90 bg-gradient-to-br from-gry/40 duration-200 hover:shadow-xl hover:shadow-blk/20 text-white py-2 rounded-2xl cursor-pointer"
                disabled={savingSchedule}
              >
                {savingSchedule ? "Saving..." : "Save Schedule"}
                <Image
                  alt=""
                  src="/loader.svg"
                  width={20}
                  height={20}
                  className="spinner"
                  hidden={!savingSchedule}
                />
              </button>
            </div>
          ) : (
            ""
          )}
        </div>

        {/* User Schedules */}
        <div className="All-Schedules-Panel h-max lg:sticky top-4 w-full bg-white bg-gry/3--text-white rounded-3xl p-6">
          <div className="tab-header flex items-center gap-2 text-lg text-gry font-semibold mb-4">
            <p
              onClick={() => {
                setTabMode("schedules");
              }}
              className={` cursor-pointer flex items-center gap-2 ${
                tabMode == "schedules"
                  ? "text-purple-500 bg-purple-300/30 "
                  : " hover:bg-gry/10"
              } p-2 px-4 rounded-xl duration-200`}
            >
              <CalendarCheck size={16} />
              My Schedules
            </p>
            <p
              onClick={() => {
                setTabMode("quizzes");
              }}
              className={` cursor-pointer flex items-center gap-2 ${
                tabMode == "quizzes"
                  ? "text-purple-500 bg-purple-300/30 "
                  : " hover:bg-gry/10"
              } p-2 px-4 rounded-xl duration-200`}
            >
              <ListTodo size={16} />
              All Quizzes
            </p>
          </div>

          {tabMode == "schedules" ? (
            <>
              {userSchedules.length === 0 ? (
                <div className="text-center text-3xl flex gap-2 flex-col items-center py-8 text-gry">
                  <Image
                    src="/cactus.png"
                    alt="cactus"
                    width={140}
                    height={140}
                  />
                  No schedules yet. Create your first plan!
                </div>
              ) : (
                <div className="space-y-4">
                  {userSchedules.map((s) => (
                    <ScheduleCard
                      key={s.id}
                      schedule={s}
                      onToggleReminders={toggleReminders}
                      onDelete={deleteUserSchedule}
                      onToggleSubtopicCompleted={toggleSubtopicCompleted}
                      userId={userId}
                    />
                  ))}
                </div>
              )}
            </>
          ) : (
            <>
              {/* Quiz history view - you can implement this later */}

              <div className="text-center text-3xl flex gap-2 flex-col items-center py-8 text-gry">
                <Image
                  src="/cactus.png"
                  alt="cactus"
                  width={140}
                  height={140}
                />
                Quiz Feature coming soon
              </div>
            </>
          )}
        </div>
      </div>
    </main>
  );
}
