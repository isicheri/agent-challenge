Quiz System API Documentation
Overview
We built a complete quiz generation and tracking system that automatically creates quizzes when users complete all subtopics in a study plan, tracks their attempts, scores, and provides detailed history.

📋 API Endpoints Summary
1. Update Subtopic Completion (Triggers Quiz Generation)
Endpoint: PATCH /api/subtopics/complete
Purpose: Mark a subtopic as complete. When ALL subtopics in a PlanItem are completed, automatically generates a quiz.
Request Body:{
  "scheduleId": "uuid",
  "range": "Day 1: 9:00am - 11:30am",
  "subIdx": 0,
  "completed": true
}
Response:{
  "updated": { /* subtopic object */ },
  "allCompleted": true,
  "quizGenerated": true,
  "quiz": {
    "id": "uuid",
    "title": "Quiz: Introduction to Sets",
    "questions": [
      {
        "id": "uuid",
        "question": "What is a set?",
        "correctAnswer": "A",
        "options": [
          { "id": "uuid", "label": "A", "content": "..." },
          { "id": "uuid", "label": "B", "content": "..." },
          { "id": "uuid", "label": "C", "content": "..." },
          { "id": "uuid", "label": "D", "content": "..." }
        ]
      }
    ]
  }
}


2. Start Quiz
Endpoint: POST /api/quiz/[quizId]/start
Purpose: Create a new quiz attempt for a user. Call this when user clicks "Start Quiz".
Request Body:{
  "userId": "uuid"
}
Response: {
  "attempt": {
    "id": "uuid",
    "quizId": "uuid",
    "userId": "uuid",
    "score": 0,
    "totalQuestions": 8,
    "percentage": 0,
    "startedAt": "2025-10-31T01:00:00Z",
    "completedAt": null,
    "quiz": {
      "title": "Quiz: Introduction to Sets",
      "questions": [ /* full questions with options */ ]
    }
  }
}



3. Submit Quiz
Endpoint: POST /api/quiz/[quizId]/submit
Purpose: Submit quiz answers and calculate score.
Request Body: {
  "attemptId": "uuid",
  "answers": [
    {
      "questionId": "uuid",
      "selectedOptionId": "uuid"  // null if skipped
    }
  ],
  "timeTaken": 900  // seconds (optional)
}
Resonse: {
  "attempt": { /* full attempt with answers */ },
  "score": 7,
  "totalQuestions": 8,
  "percentage": 87.5,
  "passed": true  // true if >= 70%
}


4. Get Quiz Results
Endpoint: GET /api/quiz/attempts/[attemptId]
Purpose: Get detailed results for a specific quiz attempt (for review page).
Response:{
  "attempt": {
    "id": "uuid",
    "score": 7,
    "totalQuestions": 8,
    "percentage": 87.5,
    "completedAt": "2025-10-31T01:15:00Z",
    "timeTaken": 900,
    "quiz": {
      "title": "Quiz: Introduction to Sets",
      "questions": [ /* all questions with options */ ]
    },
    "answers": [
      {
        "questionId": "uuid",
        "selectedOptionId": "uuid",
        "isCorrect": true,
        "question": { /* question details */ },
        "selectedOption": { /* selected option details */ }
      }
    ],
    "user": {
      "id": "uuid",
      "username": "John Doe",
      "email": "john@example.com"
    }
  }
}


5. Get Quiz History
Endpoint: GET /api/users/[userId]/quiz-history
Query Parameters:

status (optional): "completed" | "incomplete" | omit for all

Examples:

/api/users/123/quiz-history - Get all attempts
/api/users/123/quiz-history?status=completed - Only completed
/api/users/123/quiz-history?status=incomplete - Only in-progress

Response:
json{
  "attempts": [ /* all attempts */ ],
  "completed": [ /* only completed attempts */ ],
  "incomplete": [ /* only incomplete/in-progress attempts */ ],
  "stats": {
    "totalAttempts": 5,
    "completedAttempts": 3,
    "incompleteAttempts": 2,
    "averageScore": 82.5,
    "bestScore": 95.0,
    "worstScore": 70.0,
    "passRate": 100  // percentage of completed quizzes that passed (>= 70%)
  }
}

6. Resume Incomplete Quiz
Endpoint: GET /api/quiz/attempts/[attemptId]/resume
Purpose: Get data to resume an incomplete quiz attempt.
Response:
json{
  "attempt": { /* attempt with quiz questions */ },
  "answeredQuestionIds": ["uuid1", "uuid2"],
  "remainingQuestions": 6
}