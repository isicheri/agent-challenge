"use client";

import { ConsoleLogger } from "@mastra/core/logger";
import { useState, useEffect } from "react";

type Topic = { name: string; difficulty: "easy" | "medium" | "hard"; examDate: string };
type Availability = { monday: number; tuesday: number; wednesday: number; thursday: number; friday: number; saturday: number; sunday: number };

export default function StudyPlannerApp() {
  const [currentStep, setCurrentStep] = useState<"onboarding" | "dashboard">("onboarding");
  const [authMode, setAuthMode] = useState<"login" | "signup">("signup");
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [userId, setUserId] = useState<string | null>(null);

  const [examDate, setExamDate] = useState("");
  const [topics, setTopics] = useState<Topic[]>([{ name: "", difficulty: "medium", examDate: "" }]);
  const [availability, setAvailability] = useState<Availability>({ monday: 2, tuesday: 2, wednesday: 2, thursday: 2, friday: 2, saturday: 3, sunday: 0 });

  const [createdSchedule, setCreatedSchedule] = useState<any | null>(null);
  const [userSchedules, setUserSchedules] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      
      // Save to localStorage for persistence
      localStorage.setItem('userId', data.user.id);
      localStorage.setItem('email', email);
      localStorage.setItem('username', username);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
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
      
      // Save to localStorage for persistence
      localStorage.setItem('userId', data.user.id);
      localStorage.setItem('email', data.user.email);
      localStorage.setItem('username', data.user.username);
      
      // Fetch user schedules after login
      await fetchUserSchedules();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function createSchedule(e: React.FormEvent) {
    e.preventDefault();
    if (!userId) { setError("Create a user first"); return; }
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/schedules", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId, examDate, topics, availability }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create schedule");
      setCreatedSchedule(data.schedule);
      // Fetch updated schedules
      await fetchUserSchedules();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function fetchUserSchedules() {
    if (!email || !username) return;
    
    try {
      const res = await fetch("/api/schedules/list", { 
        method: "POST", 
        headers: { "Content-Type": "application/json" }, 
        body: JSON.stringify({ email, username }) 
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to fetch schedules");
      console.log(data.schedules)
      setUserSchedules(data.schedules || []);
    } catch (err: any) {
      setError(err.message);
    }
  }

 async function deleteUserSchedule(userId: string, scheduleId: string) {
  if (!userId || !scheduleId) return;
  try {
    setLoading(true);
    const res = await fetch("/api/schedules/delete", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, scheduleId }),
    });
    if (!res.ok) throw new Error("Failed to delete schedule");
    await fetchUserSchedules(); // 👈 refresh list
  } catch (error: any) {
    setError(error.message);
  } finally {
    setLoading(false);
  }
}


  async function toggleReminders(scheduleId: string, enable: boolean) {
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
          message: enable ? "Time to study!" : "Reminders have been disabled for this schedule."
        }) 
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to toggle reminders");
      
      // Refresh schedules after toggle
      await fetchUserSchedules();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function updateTopic(index: number, field: keyof Topic, value: any) {
    setTopics(prev => prev.map((t, i) => i === index ? { ...t, [field]: value } : t));
  }

  function addTopic() {
    setTopics(prev => [...prev, { name: "", difficulty: "medium", examDate: "" }]);
  }

  function removeTopic(index: number) {
    setTopics(prev => prev.filter((_, i) => i !== index));
  }

  function updateAvailability(day: keyof Availability, value: number) {
    setAvailability(prev => ({ ...prev, [day]: value }));
  }

  function logout() {
    // Clear localStorage
    localStorage.removeItem('userId');
    localStorage.removeItem('email');
    localStorage.removeItem('username');
    
    // Reset state
    setUserId(null);
    setEmail("");
    setUsername("");
    setCurrentStep("onboarding");
    setUserSchedules([]);
    setCreatedSchedule(null);
  }

  // Load user session from localStorage on component mount
  useEffect(() => {
    const savedUserId = localStorage.getItem('userId');
    const savedEmail = localStorage.getItem('email');
    const savedUsername = localStorage.getItem('username');
    
    if (savedUserId && savedEmail && savedUsername) {
      setUserId(savedUserId);
      setEmail(savedEmail);
      setUsername(savedUsername);
      setCurrentStep("dashboard");
    }
  }, []);

  // Fetch schedules when user is logged in
  useEffect(() => {
    if (userId && email && username) {
      fetchUserSchedules();
    }
  }, [userId, email, username]);

  if (currentStep === "onboarding") {
  return (
      <main className="min-h-screen bg-gradient-to-br from-orange-500 to-orange-700 flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Study Planner</h1>
            <p className="text-gray-600">Create your personalized study schedule</p>
        </div>

          {/* Auth Mode Toggle */}
          <div className="flex bg-gray-100 rounded-lg p-1 mb-6">
            <button
              type="button"
              onClick={() => setAuthMode("signup")}
              className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                authMode === "signup"
                  ? "bg-white text-orange-600 shadow-sm"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              Sign Up
            </button>
            <button
              type="button"
              onClick={() => setAuthMode("login")}
              className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                authMode === "login"
                  ? "bg-white text-orange-600 shadow-sm"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              Login
            </button>
          </div>

          {error && <div className="mb-4 p-3 rounded bg-red-100 text-red-800 text-sm">{error}</div>}

          <form onSubmit={authMode === "signup" ? createUser : loginUser} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input 
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500 text-black" 
                type="email" 
                placeholder="your@email.com" 
                value={email} 
                onChange={(e) => setEmail(e.target.value)} 
                required 
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
              <input 
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500 text-black" 
                type="text" 
                placeholder="Your username" 
                value={username} 
                onChange={(e) => setUsername(e.target.value)} 
                required 
              />
            </div>
            <button 
              className="w-full bg-orange-600 hover:bg-orange-700 text-white font-medium py-2 px-4 rounded-lg disabled:opacity-50 transition-colors" 
              disabled={loading} 
              type="submit"
            >
              {loading 
                ? (authMode === "signup" ? "Creating..." : "Logging in...") 
                : (authMode === "signup" ? "Get Started" : "Login")
              }
            </button>
          </form>

          <div className="mt-4 text-center text-sm text-gray-600">
            {authMode === "signup" ? (
              <>Already have an account? <button onClick={() => setAuthMode("login")} className="text-orange-600 hover:text-orange-700 font-medium">Login here</button></>
            ) : (
              <>Don't have an account? <button onClick={() => setAuthMode("signup")} className="text-orange-600 hover:text-orange-700 font-medium">Sign up here</button></>
            )}
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-100">
      <div className="bg-orange-600 text-white py-4 px-6">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <h1 className="text-2xl font-bold">Study Planner Dashboard</h1>
          <div className="flex items-center gap-4">
            <div className="text-sm">
              Welcome, <span className="font-medium">{username}</span>
            </div>
            <button
              onClick={logout}
              className="px-3 py-1 bg-white/20 hover:bg-white/30 rounded-lg text-sm transition-colors"
            >
              Logout
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-6">
        {error && <div className="mb-6 p-4 rounded-lg bg-red-100 text-red-800">{error}</div>}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Create Study Plan */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Create Study Plan</h2>
            <form onSubmit={createSchedule} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Final exam date</label>
                <input 
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500 text-black" 
                  type="date" 
                  value={examDate} 
                  onChange={(e) => setExamDate(e.target.value)} 
                  required 
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-gray-700">Topics</label>
                  <button 
                    type="button" 
                    onClick={addTopic} 
                    className="text-sm bg-orange-100 text-orange-700 px-3 py-1 rounded-lg hover:bg-orange-200 transition-colors"
                  >
                    + Add topic
                  </button>
        </div>
        <div className="space-y-3">
                  {topics.map((t, i) => (
                    <div key={i} className="grid grid-cols-1 md:grid-cols-4 gap-2 items-center">
                      <input 
                        className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500 text-black" 
                        placeholder="Topic name" 
                        value={t.name} 
                        onChange={(e) => updateTopic(i, "name", e.target.value)} 
                        required 
                      />
                      <select 
                        className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500 text-black" 
                        value={t.difficulty} 
                        onChange={(e) => updateTopic(i, "difficulty", e.target.value)}
                      >
                        <option value="easy">Easy</option>
                        <option value="medium">Medium</option>
                        <option value="hard">Hard</option>
                      </select>
                      <input 
                        className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500 text-black" 
                        type="date" 
                        value={t.examDate} 
                        onChange={(e) => updateTopic(i, "examDate", e.target.value)} 
                        required 
                      />
                      <button 
                        type="button" 
                        onClick={() => removeTopic(i)} 
                        className="text-sm bg-red-100 text-red-700 px-3 py-1 rounded-lg hover:bg-red-200 transition-colors"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Weekly availability (hours per day)</label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {(["monday","tuesday","wednesday","thursday","friday","saturday","sunday"] as (keyof Availability)[]).map((day) => (
                    <div key={day} className="flex items-center gap-2">
                      <span className="w-20 capitalize text-sm text-gray-600">{day}</span>
                      <input 
                        className="border border-gray-300 rounded-lg px-2 py-1 w-16 focus:outline-none focus:ring-2 focus:ring-orange-500 text-black" 
                        type="number" 
                        min={0} 
                        max={24} 
                        value={availability[day]} 
                        onChange={(e) => updateAvailability(day, Number(e.target.value))} 
                      />
            </div>
          ))}
        </div>
      </div>

              <button 
                className="w-full bg-orange-600 hover:bg-orange-700 text-white font-medium py-2 px-4 rounded-lg disabled:opacity-50 transition-colors" 
                disabled={loading} 
                type="submit"
              >
                {loading ? "Generating..." : "Generate & Save Schedule"}
              </button>
            </form>

            {createdSchedule && (
              <div className="mt-6 border border-gray-200 rounded-lg p-4 bg-gray-50">
                <h3 className="font-semibold text-gray-900 mb-2">✅ Schedule Created!</h3>
                <pre className="text-xs text-gray-600 overflow-x-auto bg-white p-2 rounded border">
                  {JSON.stringify(createdSchedule.data, null, 2)}
                </pre>
              </div>
            )}
        </div>
        
          {/* My Schedules */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">My Schedules</h2>
            
            {userSchedules.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <p>No schedules created yet.</p>
                <p className="text-sm mt-1">Create your first study plan to get started!</p>
        </div>
            ) : (
              <div className="space-y-4">
                {userSchedules.map((schedule) => {
                  const scheduleData = schedule.data;
                  const topics = scheduleData?.schedule || [];
                 const uniqueTopics = [...new Set(topics.map((item: any) => item.topic || item.subject))];
                  const difficulties = [...new Set(topics.map((item: any) => item.difficulty))];
                  
                  return (
                    <div key={schedule.id} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h3 className="font-semibold text-gray-900 mb-1">
                            Topics: {uniqueTopics.join(", ")}
                          </h3>
                          <div className="flex items-center gap-4 text-sm text-gray-600">
                            <span>Difficulties: {difficulties.join(", ")}</span>
                            <span>Created: {new Date(schedule.createdAt).toLocaleDateString()}</span>
                          </div>
                        </div>
                     <div className="flex gap-2">
  <button
    onClick={() => toggleReminders(schedule.id, true)}
    className="
      px-3 py-1
      bg-green-100 text-green-700
      rounded-lg text-sm
      hover:bg-green-200 hover:scale-105
      transition-all duration-200 ease-out
      focus:outline-none focus:ring-2 focus:ring-green-500
    "
    disabled={loading}
  >
    Enable Reminders
  </button>

  <button
    onClick={() => deleteUserSchedule(userId!, schedule.id)}
    className="
      px-3 py-1
      bg-red-100 text-red-700
      rounded-lg text-sm
      hover:bg-red-200 hover:scale-105
      transition-all duration-200 ease-out
      focus:outline-none focus:ring-2 focus:ring-red-500
    "
    disabled={loading}
  >
    Delete Schedule
  </button>
</div>

        </div>
        
                      <details className="text-sm">
                        <summary className="cursor-pointer text-gray-600 hover:text-gray-800">
                          View Schedule Details
                        </summary>
                        <pre className="mt-2 text-xs text-gray-600 overflow-x-auto bg-white p-2 rounded border">
                          {JSON.stringify(scheduleData, null, 2)}
                        </pre>
                      </details>
            </div>
                  );
                })}
          </div>
        )}
      </div>
    </div>
      </div>
    </main>
  );
}
