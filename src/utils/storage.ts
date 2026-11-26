import type { ChatMessage, ChatSession, Difficulty, LearningProgress } from '../types/tutor';
import { createInitialProgress } from './learningProgress';

/**
 * Helpers for reading saved workspace state back out of localStorage.
 *
 * Saved data can be missing, corrupted, hand-edited, or written by an older
 * version of the app, so every loader validates what it reads and falls back
 * to a safe default instead of letting a bad value crash the UI.
 */

export const STORAGE_KEYS = {
  sessions: 'csharptutor_sessions_v1',
  activeSessionId: 'csharptutor_active_session_v1',
  difficulty: 'csharptutor_difficulty_v1',
  hintsFirst: 'csharptutor_hints_first_v1',
  progress: 'csharptutor_progress_v1',
  editorCode: 'csharptutor_editor_code_v1',
};

function readJson(key: string): unknown {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return undefined;
    return JSON.parse(raw);
  } catch {
    return undefined;
  }
}

export function saveJson(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Ignore storage quota or privacy-mode errors
  }
}

export function isDifficulty(value: unknown): value is Difficulty {
  return value === 'beginner' || value === 'intermediate' || value === 'advanced';
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function toCount(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? Math.floor(value) : 0;
}

function toStringList(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string')
    : [];
}

export function loadDifficulty(): Difficulty {
  const value = readJson(STORAGE_KEYS.difficulty);
  return isDifficulty(value) ? value : 'beginner';
}

export function loadBoolean(key: string, fallback: boolean): boolean {
  const value = readJson(key);
  return typeof value === 'boolean' ? value : fallback;
}

export function loadString(key: string, fallback: string): string {
  const value = readJson(key);
  return typeof value === 'string' ? value : fallback;
}

function sanitizeMessage(value: unknown): ChatMessage | null {
  if (!isRecord(value)) return null;
  if (value.role !== 'user' && value.role !== 'assistant') return null;
  if (typeof value.content !== 'string' || typeof value.id !== 'string') return null;
  return {
    id: value.id,
    role: value.role,
    content: value.content,
    timestamp: typeof value.timestamp === 'number' ? value.timestamp : Date.now(),
    ...(typeof value.hintsFirstUsed === 'boolean' ? { hintsFirstUsed: value.hintsFirstUsed } : {}),
  };
}

export function loadSessions(): ChatSession[] {
  const value = readJson(STORAGE_KEYS.sessions);
  if (!Array.isArray(value)) return [];

  const seenIds = new Set<string>();
  const sessions: ChatSession[] = [];
  for (const item of value) {
    if (!isRecord(item) || typeof item.id !== 'string' || seenIds.has(item.id)) continue;
    seenIds.add(item.id);
    const now = Date.now();
    sessions.push({
      id: item.id,
      title: typeof item.title === 'string' && item.title.trim() ? item.title : 'New C# Session',
      difficulty: isDifficulty(item.difficulty) ? item.difficulty : 'beginner',
      createdAt: typeof item.createdAt === 'number' ? item.createdAt : now,
      updatedAt: typeof item.updatedAt === 'number' ? item.updatedAt : now,
      messages: Array.isArray(item.messages)
        ? item.messages
            .map(sanitizeMessage)
            .filter((message): message is ChatMessage => message !== null)
        : [],
    });
  }
  return sessions;
}

export function loadProgress(): LearningProgress {
  const defaults = createInitialProgress();
  const value = readJson(STORAGE_KEYS.progress);
  if (!isRecord(value)) return defaults;

  const answered = toCount(value.quizQuestionsAnswered);
  return {
    messagesSent: toCount(value.messagesSent),
    codeExplainedCount: toCount(value.codeExplainedCount),
    bugsDebuggedCount: toCount(value.bugsDebuggedCount),
    exercisesCompletedIds: Array.from(new Set(toStringList(value.exercisesCompletedIds))),
    quizzesCompleted: toCount(value.quizzesCompleted),
    quizQuestionsAnswered: answered,
    quizCorrectAnswers: Math.min(answered, toCount(value.quizCorrectAnswers)),
    topicsExplored: toStringList(value.topicsExplored).slice(0, 24),
  };
}
