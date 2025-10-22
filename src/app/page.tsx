"use client";
import { useState, useEffect } from "react";

type Plan = { range: string; topic: string; subtopics: { t: string; completed: boolean }[] };

export default function StudyPlannerApp() {
  const [currentStep, setCurrentStep] = useState<"onboarding" | "dashboard">("onboarding");
  const [authMode, setAuthMode] = useState<"login" | "signup">("signup");
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [userId, setUserId] = useState<string | null>(null);

  const [topicInput, setTopicInput] = useState("");
  const [durationUnit, setDurationUnit] = useState<"days" | "weeks" | "months">("weeks");
  const [durationValue, setDurationValue] = useState<number>(1);

  const [generatedPlan, setGeneratedPlan] = useState<Plan[] | null>(null);
  const [createdSchedule, setCreatedSchedule] = useState<any | null>(null);
  const [userSchedules, setUserSchedules] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /* ------------------- Auth ------------------- */
  async function createUser(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/users", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, username }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create user");
      setUserId(data.user.id);
      setCurrentStep("dashboard");
      localStorage.setItem("userId", data.user.id);
      localStorage.setItem("email", email);
      localStorage.setItem("username", username);
    } catch (err: any) { setError(err.message); } finally { setLoading(false); }
  }

  async function loginUser(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, username }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Login failed");
      setUserId(data.user.id);
      setUsername(data.user.username);
      setEmail(data.user.email);
      setCurrentStep("dashboard");
      localStorage.setItem("userId", data.user.id);
      localStorage.setItem("email", data.user.email);
      localStorage.setItem("username", data.user.username);
      await fetchUserSchedules();
    } catch (err: any) { setError(err.message); } finally { setLoading(false); }
  }

  /* ------------------- Schedule ------------------- */
  async function generatePlan(e: React.FormEvent) {
    e.preventDefault();
    if (!userId) { setError("Create a user first"); return; }
    setError(null);
    setLoading(true);
    setGeneratedPlan(null);
    try {
      const res = await fetch("/api/schedules/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic: topicInput, durationUnit, durationValue })
      });
      const data = await res.json();
      if (!res.ok || !data.plan) throw new Error(data.error || "Failed to generate plan");
      setGeneratedPlan(data.plan);
    } catch (err: any) { setError(err.message); } finally { setLoading(false); }
  }

  async function saveGeneratedPlan() {
    if (!userId || !generatedPlan) return;
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/schedules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, title: `${topicInput} Plan`, plan: generatedPlan })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save schedule");
      setCreatedSchedule(data.schedule);
      setGeneratedPlan(null);
      setTopicInput("");
      setDurationValue(1);
      await fetchUserSchedules();
    } catch (err: any) { setError(err.message); } finally { setLoading(false); }
  }

  async function fetchUserSchedules() {
    if (!userId) return;
    try {
      const res = await fetch("/api/schedules/list", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to fetch schedules");
      setUserSchedules(data.schedules || []);
    } catch (err: any) { setError(err.message); }
  }

  async function deleteUserSchedule(scheduleId: string) {
    if (!userId || !scheduleId) return;
    try {
      setLoading(true);
      const res = await fetch("/api/schedules/delete", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, scheduleId }),
      });
      if (!res.ok) throw new Error("Failed to delete schedule");
      await fetchUserSchedules();
    } catch (err: any) { setError(err.message); } finally { setLoading(false); }
  }

  async function toggleReminders(scheduleId: string, enable: boolean) {
    if (!email) return;
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/reminders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scheduleId,
          enable,
          to: email,
          subject: enable ? "Study Reminder" : "Reminders Disabled",
          message: enable ? "Time to study!" : "Reminders have been disabled."
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to toggle reminders");
      await fetchUserSchedules();
    } catch (err: any) { setError(err.message); } finally { setLoading(false); }
  }

  function logout() {
    localStorage.clear();
    setUserId(null);
    setEmail("");
    setUsername("");
    setCurrentStep("onboarding");
    setUserSchedules([]);
    setCreatedSchedule(null);
    setGeneratedPlan(null);
  }

  useEffect(() => {
    const savedUserId = localStorage.getItem("userId");
    const savedEmail = localStorage.getItem("email");
    const savedUsername = localStorage.getItem("username");
    if (savedUserId && savedEmail && savedUsername) {
      setUserId(savedUserId);
      setEmail(savedEmail);
      setUsername(savedUsername);
      setCurrentStep("dashboard");
    }
  }, []);

  useEffect(() => { if (userId) fetchUserSchedules(); }, [userId]);

  /* ------------------- Render ------------------- */
  if (currentStep === "onboarding") {
    return (
      <main className="min-h-screen bg-gradient-to-br from-orange-500 to-orange-700 flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Study Planner</h1>
            <p className="text-gray-600">Create your personalized study schedule</p>
          </div>

          <div className="flex bg-gray-100 rounded-lg p-1 mb-6">
            <button type="button" onClick={() => setAuthMode("signup")} className={`flex-1 py-2 px-4 rounded-md text-sm font-medium ${authMode==="signup"?"bg-white text-orange-600 shadow-sm":"text-gray-600 hover:text-gray-900"}`}>Sign Up</button>
            <button type="button" onClick={() => setAuthMode("login")} className={`flex-1 py-2 px-4 rounded-md text-sm font-medium ${authMode==="login"?"bg-white text-orange-600 shadow-sm":"text-gray-600 hover:text-gray-900"}`}>Login</button>
          </div>

          {error && <div className="mb-4 p-3 rounded bg-red-100 text-red-800 text-sm">{error}</div>}

          <form onSubmit={authMode==="signup"?createUser:loginUser} className="space-y-4">
            <input className="w-full border border-gray-300 rounded-lg px-3 py-2 text-black" type="email" placeholder="Email" value={email} onChange={e=>setEmail(e.target.value)} required />
            <input className="w-full border border-gray-300 rounded-lg px-3 py-2 text-black" type="text" placeholder="Username" value={username} onChange={e=>setUsername(e.target.value)} required />
            <button className="w-full bg-orange-600 text-white py-2 px-4 rounded-lg" disabled={loading} type="submit">{loading? "Processing...": authMode==="signup"? "Get Started":"Login"}</button>
          </form>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-100">
      <div className="bg-orange-600 text-white py-4 px-6 flex justify-between max-w-6xl mx-auto">
        <h1 className="text-2xl font-bold">Study Planner Dashboard</h1>
        <div className="flex items-center gap-4">
          <span className="text-sm">Welcome, <b>{username}</b></span>
          <button onClick={logout} className="px-3 py-1 bg-white/20 rounded-lg">Logout</button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-6 grid grid-cols-1 lg:grid-cols-2 gap-8">

        {/* Create & Preview Schedule */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Create Study Plan</h2>
          <form onSubmit={generatePlan} className="space-y-4">
            <input type="text" placeholder="Topic" value={topicInput} onChange={e=>setTopicInput(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-black" required />
            <div className="flex gap-2">
              <input type="number" min={1} value={durationValue} onChange={e=>setDurationValue(Number(e.target.value))} className="border border-gray-300 rounded-lg px-2 py-1 w-20 text-black" required />
              <select value={durationUnit} onChange={e=>setDurationUnit(e.target.value as any)} className="border border-gray-300 rounded-lg px-2 py-1 text-black">
                <option value="days">Days</option>
                <option value="weeks">Weeks</option>
                <option value="months">Months</option>
              </select>
            </div>
            <button type="submit" className="w-full bg-orange-600 text-white py-2 rounded-lg" disabled={loading}>{loading?"Generating...":"Generate Plan"}</button>
          </form>

          {generatedPlan && (
            <div className="mt-6 border p-4 bg-gray-50 rounded-lg">
              <h3 className="font-semibold mb-2">📄 Preview Plan</h3>
              <pre className="text-xs overflow-x-auto">{JSON.stringify(generatedPlan, null, 2)}</pre>
              <button onClick={saveGeneratedPlan} className="mt-3 w-full bg-green-600 text-white py-2 rounded-lg" disabled={loading}>{loading?"Saving...":"Save Schedule"}</button>
            </div>
          )}

          {createdSchedule && (
            <div className="mt-6 border p-4 bg-gray-50 rounded-lg">
              <h3 className="font-semibold mb-2">✅ Schedule Created!</h3>
              <pre className="text-xs overflow-x-auto">{JSON.stringify(createdSchedule, null, 2)}</pre>
            </div>
          )}
        </div>

        {/* User Schedules */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h2 className="text-xl font-semibold mb-4">My Schedules</h2>
          {userSchedules.length === 0 ? (
            <div className="text-center py-8 text-gray-500">No schedules yet. Create your first plan!</div>
          ) : (
            <div className="space-y-4">
              {userSchedules.map(s => (
                <div key={s.id} className="border p-4 rounded bg-gray-50">
                  <div className="flex justify-between mb-2">
                    <div>
                      <div className="text-sm text-gray-600">Created: {new Date(s.createdAt).toLocaleDateString()}</div>
                      <div className="font-medium">{s.title}</div>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={()=>toggleReminders(s.id, true)} className="px-3 py-1 bg-green-100 text-green-700 rounded text-sm">Enable Reminders</button>
                      <button onClick={()=>deleteUserSchedule(s.id)} className="px-3 py-1 bg-red-100 text-red-700 rounded text-sm">Delete</button>
                    </div>
                  </div>
                  <details>
                    <summary className="cursor-pointer text-gray-600">View Details</summary>
                    <pre className="text-xs mt-2 bg-white p-2 rounded border overflow-x-auto">{JSON.stringify(s.data, null, 2)}</pre>
                  </details>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </main>
  );
}
