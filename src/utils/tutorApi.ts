import type {
  ChatMessage,
  DebugAnalysis,
  Difficulty,
  ExplainCodeResult,
  PracticeEvaluation,
  PracticeExercise,
  QuizQuestion,
} from '../types/tutor';

async function postJson<T>(url: string, body: unknown): Promise<T> {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data?.error || `Request failed with status ${response.status}`);
  }
  return data as T;
}

export async function sendTutorChat(params: {
  message: string;
  history: ChatMessage[];
  difficulty: Difficulty;
  hintsFirst: boolean;
  editorCode?: string;
}): Promise<{ reply: string }> {
  return postJson<{ reply: string }>('/api/tutor/chat', params);
}

export async function explainCSharpCode(params: {
  code: string;
  difficulty: Difficulty;
}): Promise<ExplainCodeResult> {
  return postJson<ExplainCodeResult>('/api/tutor/explain', params);
}

export async function debugCSharpCode(params: {
  code: string;
  difficulty: Difficulty;
  errorMessage?: string;
}): Promise<DebugAnalysis> {
  return postJson<DebugAnalysis>('/api/tutor/debug', params);
}

export async function generatePracticeExercise(params: {
  difficulty: Difficulty;
  topic: string;
}): Promise<PracticeExercise> {
  return postJson<PracticeExercise>('/api/tutor/practice', params);
}

export async function checkPracticeSolution(params: {
  exercise: PracticeExercise;
  userCode: string;
  difficulty: Difficulty;
  hintsFirst: boolean;
}): Promise<PracticeEvaluation> {
  return postJson<PracticeEvaluation>('/api/tutor/practice/check', params);
}

export async function generateQuizQuestions(params: {
  difficulty: Difficulty;
  topic: string;
}): Promise<{ questions: QuizQuestion[] }> {
  return postJson<{ questions: QuizQuestion[] }>('/api/tutor/quiz', params);
}
