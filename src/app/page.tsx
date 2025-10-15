"use client";

import { useCoAgent, useCopilotAction } from "@copilotkit/react-core";
import { CopilotKitCSSProperties, CopilotSidebar } from "@copilotkit/react-ui";
import { useState } from "react";
import { AgentState as AgentStateSchema } from "@/mastra/agents";
import { z } from "zod";

type AgentState = z.infer<typeof AgentStateSchema>;

export default function CopilotKitPage() {
  const [themeColor, setThemeColor] = useState("#10b981");

  // 🪁 Frontend Actions: https://docs.copilotkit.ai/guides/frontend-actions
  useCopilotAction({
    name: "setThemeColor",
    parameters: [{
      name: "themeColor",
      description: "The theme color to set. Make sure to pick nice colors.",
      required: true,
    }],
    handler({ themeColor }) {
      setThemeColor(themeColor);
    },
  });

  return (
    <main style={{ "--copilot-kit-primary-color": themeColor } as CopilotKitCSSProperties}>
      <StudyAssistantContent themeColor={themeColor} />
      <CopilotSidebar
        clickOutsideToClose={false}
        defaultOpen={true}
        labels={{
          title: "Study Assistant",
          initial: "👋 Hi! I'm your AI study assistant. I can help you learn better by:\n\n📚 **Summarizing content** - Paste any text and I'll summarize it in your preferred style\n🎯 **Creating flashcards** - Turn summaries into study flashcards\n💬 **Answering questions** - Ask me anything about your study materials\n\nTry saying:\n- \"Summarize this text: [paste your content]\"\n- \"Create flashcards from this summary\"\n- \"What does this concept mean?\"\n\nI'll remember your preferences and adapt to your learning style!"
        }}
      />
    </main>
  );
}

function StudyAssistantContent({ themeColor }: { themeColor: string }) {
  // 🪁 Shared State: https://docs.copilotkit.ai/coagents/shared-state

  
  const { state } = useCoAgent<AgentState>({
    name: "studyAssistantAgent",
    initialState: {
      userName: "",
      userPreferences: {
        preferredSummaryStyle: "detailed",
        preferredFlashcardStyle: "general",
        learningLevel: "intermediate",
      },
      currentSession: {
        topics: [],
        sessionStartTime: new Date().toISOString(),
      },
      studyHistory: [],
      currentResources: [],
    },
  })

  //🪁 Generative UI: https://docs.copilotkit.ai/coagents/generative-ui
  useCopilotAction({
    name: "summarizeContentTool",
    description: "Summarize study content with different styles.",
    available: "frontend",
    parameters: [
      { name: "content", type: "string", required: true },
      { name: "style", type: "string", required: false },
    ],
    render: ({ args, result, status }: { args: any, result: any, status: "inProgress" | "executing" | "complete" }) => {
      return <SummaryCard
        content={args.content}
        style={args.style}
        themeColor={themeColor}
        result={result}
        status={status}
      />
    },
  });

  useCopilotAction({
    name: "generateFlashcardsTool",
    description: "Generate flashcards from study content.",
    available: "frontend",
    parameters: [
      { name: "content", type: "string", required: true },
      { name: "style", type: "string", required: false },
    ],
    render: ({ args, result, status }: { args: any, result: any, status: "inProgress" | "executing" | "complete" }) => {
      return <FlashcardCard
        content={args.content}
        style={args.style}
        themeColor={themeColor}
        result={result}
        status={status}
      />
    },
  });

  useCopilotAction({
    name: "chatWithResourceTool",
    description: "Answer questions about study materials.",
    available: "frontend",
    parameters: [
      { name: "question", type: "string", required: true },
      { name: "messages", type: "object[]", required: false },
      { name: "resources", type: "object[]", required: false },
    ],
    render: ({ args, result, status }: { args: any, result: any, status: "inProgress" | "executing" | "complete" }) => {
      return <AnswerCard
        question={args.question}
        themeColor={themeColor}
        result={result}
        status={status}
      />
    },
  });

  useCopilotAction({
    name: "updateWorkingMemory",
    available: "frontend",
    render: ({ args }) => {
      return <div style={{ backgroundColor: themeColor }} className="rounded-2xl max-w-md w-full text-white p-4">
        <p>✨ Memory updated</p>
        <details className="mt-2">
          <summary className="cursor-pointer text-white">See updates</summary>
          <pre style={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }} className="overflow-x-auto text-sm bg-white/20 p-4 rounded-lg mt-2">
            {JSON.stringify(args, null, 2)}
          </pre>
        </details>
      </div>
    },
  });

  return (
    <div
      style={{ backgroundColor: themeColor }}
      className="h-screen w-screen flex justify-center items-center flex-col transition-colors duration-300"
    >
      <div className="bg-white/20 backdrop-blur-md p-8 rounded-2xl shadow-xl max-w-4xl w-full">
        <h1 className="text-4xl font-bold text-white mb-2 text-center">Study Assistant</h1>
        <p className="text-gray-200 text-center italic mb-6">Your AI-powered learning companion 📚</p>
        
        {/* User Info */}
        <div className="bg-white/15 p-4 rounded-xl text-white mb-6">
          <h3 className="text-lg font-semibold mb-2">👤 Your Profile</h3>
          {state.userName ? (
            <p>Welcome back, <strong>{state.userName}</strong>!</p>
          ) : (
            <p>Tell me your name to personalize your experience</p>
          )}
          {state.userPreferences?.learningLevel && (
            <p className="text-sm opacity-80">Learning Level: {state.userPreferences.learningLevel}</p>
          )}
        </div>

        {/* Current Session */}
        {state.currentSession?.topics && state.currentSession.topics.length > 0 && (
          <div className="bg-white/15 p-4 rounded-xl text-white mb-6">
            <h3 className="text-lg font-semibold mb-2">📖 Current Session</h3>
            <div className="flex flex-wrap gap-2">
              {state.currentSession.topics.map((topic, index) => (
                <span key={index} className="bg-white/20 px-3 py-1 rounded-full text-sm">
                  {topic}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Study History */}
        {state.studyHistory && state.studyHistory.length > 0 && (
          <div className="bg-white/15 p-4 rounded-xl text-white mb-6">
            <h3 className="text-lg font-semibold mb-2">📊 Study History</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {state.studyHistory.slice(0, 4).map((item, index) => (
                <div key={index} className="bg-white/10 p-2 rounded text-sm">
                  <div className="font-medium">{item.topic}</div>
                  <div className="text-xs opacity-80">
                    {item.summaryCount} summaries, {item.flashcardCount} flashcards
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Resources */}
        {state.currentResources && state.currentResources.length > 0 && (
          <div className="bg-white/15 p-4 rounded-xl text-white mb-6">
            <h3 className="text-lg font-semibold mb-2">📄 Current Resources</h3>
            <div className="space-y-2">
              {state.currentResources.map((resource, index) => (
                <div key={index} className="bg-white/10 p-2 rounded text-sm">
                  <div className="font-medium">{resource.name}</div>
                  <div className="text-xs opacity-80">
                    {resource.content.length > 100 
                      ? `${resource.content.substring(0, 100)}...` 
                      : resource.content}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="text-center text-white/80 italic">
          <p>💡 Try asking me to:</p>
          <p className="text-sm mt-2">
            "Summarize this text: [paste your content]"<br/>
            "Create flashcards from this summary"<br/>
            "What does this concept mean?"
          </p>
        </div>
      </div>
    </div>
  );
}

// Summary card component for displaying summarized content
function SummaryCard({
  content,
  style,
  themeColor,
  result,
  status
}: {
  content?: string,
  style?: string,
  themeColor: string,
  result: any,
  status: "inProgress" | "executing" | "complete"
}) {
  if (status !== "complete") {
    return (
      <div
        className="rounded-xl shadow-xl mt-6 mb-4 max-w-2xl w-full"
        style={{ backgroundColor: themeColor }}
      >
        <div className="bg-white/20 p-4 w-full">
          <p className="text-white animate-pulse">📚 Summarizing content...</p>
        </div>
      </div>
    )
  }

  return (
    <div
      style={{ backgroundColor: themeColor }}
      className="rounded-xl shadow-xl mt-6 mb-4 max-w-2xl w-full"
    >
      <div className="bg-white/20 p-4 w-full">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xl font-bold text-white">📚 Summary</h3>
          <span className="text-sm text-white/80 bg-white/20 px-2 py-1 rounded">
            {style || "detailed"}
          </span>
        </div>
        
        <div className="text-white whitespace-pre-wrap">
          {result?.summary || "Summary not available"}
        </div>
      </div>
    </div>
  );
}

// Flashcard card component for displaying generated flashcards
function FlashcardCard({
  content,
  style,
  themeColor,
  result,
  status
}: {
  content?: string,
  style?: string,
  themeColor: string,
  result: any,
  status: "inProgress" | "executing" | "complete"
}) {
  if (status !== "complete") {
    return (
      <div
        className="rounded-xl shadow-xl mt-6 mb-4 max-w-2xl w-full"
        style={{ backgroundColor: themeColor }}
      >
        <div className="bg-white/20 p-4 w-full">
          <p className="text-white animate-pulse">🎯 Generating flashcards...</p>
        </div>
      </div>
    )
  }

  const flashcards = result?.flashcards || [];

  return (
    <div
      style={{ backgroundColor: themeColor }}
      className="rounded-xl shadow-xl mt-6 mb-4 max-w-2xl w-full"
    >
      <div className="bg-white/20 p-4 w-full">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xl font-bold text-white">🎯 Flashcards</h3>
          <span className="text-sm text-white/80 bg-white/20 px-2 py-1 rounded">
            {style || "general"}
          </span>
        </div>
        
        <div className="space-y-3">
          {flashcards.map((card: any, index: number) => (
            <div key={index} className="bg-white/10 p-3 rounded-lg">
              <div className="text-white">
                <div className="font-semibold mb-2">Q: {card.question}</div>
                <div className="text-sm opacity-90">A: {card.answer}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Answer card component for displaying Q&A responses
function AnswerCard({
  question,
  themeColor,
  result,
  status
}: {
  question?: string,
  themeColor: string,
  result: any,
  status: "inProgress" | "executing" | "complete"
}) {
  if (status !== "complete") {
    return (
      <div
        className="rounded-xl shadow-xl mt-6 mb-4 max-w-2xl w-full"
        style={{ backgroundColor: themeColor }}
      >
        <div className="bg-white/20 p-4 w-full">
          <p className="text-white animate-pulse">💬 Thinking about your question...</p>
        </div>
      </div>
    )
  }

  return (
    <div
      style={{ backgroundColor: themeColor }}
      className="rounded-xl shadow-xl mt-6 mb-4 max-w-2xl w-full"
    >
      <div className="bg-white/20 p-4 w-full">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xl font-bold text-white">💬 Answer</h3>
        </div>
        
        <div className="text-white mb-3">
          <div className="font-semibold">Q: {question}</div>
        </div>
        
        <div className="text-white whitespace-pre-wrap">
          {result?.answer || "Answer not available"}
        </div>
        
        {result?.usedResources && result.usedResources.length > 0 && (
          <div className="mt-3 pt-3 border-t border-white/20">
            <div className="text-sm text-white/80">
              📄 Used resources: {result.usedResources.join(", ")}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
