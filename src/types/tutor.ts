export type Difficulty = 'beginner' | 'intermediate' | 'advanced';

export type TutorMode = 'chat' | 'explain' | 'debug' | 'practice' | 'quiz';

export type CSharpTopic =
  | 'Fundamentals & Types'
  | 'OOP & Interfaces'
  | 'LINQ & Collections'
  | 'Async & Concurrency'
  | 'Nullability & Errors'
  | 'Modern C# (Records & Patterns)';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  hintsFirstUsed?: boolean;
}

export interface ChatSession {
  id: string;
  title: string;
  difficulty: Difficulty;
  createdAt: number;
  updatedAt: number;
  messages: ChatMessage[];
}

export interface LineExplanation {
  lineStart: number;
  lineEnd: number;
  codeSnippet: string;
  title: string;
  explanation: string;
  concept: string;
}

export interface ExplainCodeResult {
  summary: string;
  concepts: string[];
  lines: LineExplanation[];
}

export interface DebugAnalysis {
  summary: string;
  bugType: string;
  suspectLines: number[];
  hints: string[];
  rootCause: string;
  fixedCode: string;
  explanation: string;
}

export interface PracticeExercise {
  id: string;
  title: string;
  difficulty: Difficulty;
  topic: CSharpTopic;
  prompt: string;
  requirements: string[];
  starterCode: string;
  hints: string[];
  solutionCode: string;
  isStarter?: boolean;
}

export interface PracticeEvaluation {
  passed: boolean;
  summary: string;
  strengths: string[];
  hints: string[];
  nextStep: string;
}

export interface QuizQuestion {
  id: string;
  question: string;
  codeSnippet?: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  topic: string;
}

export interface LearningProgress {
  messagesSent: number;
  codeExplainedCount: number;
  bugsDebuggedCount: number;
  exercisesCompletedIds: string[];
  quizzesCompleted: number;
  quizQuestionsAnswered: number;
  quizCorrectAnswers: number;
  topicsExplored: string[];
}

export interface CodePreset {
  id: string;
  label: string;
  difficulty: Difficulty;
  description: string;
  code: string;
}
