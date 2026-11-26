import { GoogleGenAI, Type } from '@google/genai';
import express from 'express';
import type { Request, Response } from 'express';
import type { ChatMessage, Difficulty } from '../src/types/tutor.ts';
import { buildChatSystemInstruction, buildDifficultyGuidance } from './tutorPrompts.ts';

const DEFAULT_GEMINI_MODEL = 'gemini-4-hydrogen';
const MAX_CODE_LENGTH = 15000;
const MAX_MESSAGE_LENGTH = 8000;

/** An error whose message is safe to show to the learner as-is. */
class HttpError extends Error {
  statusCode: number;

  constructor(statusCode: number, message: string) {
    super(message);
    this.name = 'HttpError';
    this.statusCode = statusCode;
  }
}

// Read lazily (not at import time) so values from .env are already loaded.
function getModelName(): string {
  return process.env.GEMINI_MODEL?.trim() || DEFAULT_GEMINI_MODEL;
}

function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    throw new HttpError(
      503,
      'GEMINI_API_KEY is not configured. Add your Gemini API key in Secrets or your local .env file.'
    );
  }

  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

function normalizeDifficulty(value: unknown): Difficulty {
  if (value === 'beginner' || value === 'intermediate' || value === 'advanced') {
    return value;
  }
  return 'beginner';
}

function describeError(error: unknown): { status: number; message: string } {
  if (error instanceof HttpError) {
    return { status: error.statusCode, message: error.message };
  }

  const errObj = error as { statusCode?: unknown; status?: unknown; message?: unknown };
  const rawStatus = typeof errObj?.statusCode === 'number' ? errObj.statusCode : errObj?.status;
  const status =
    typeof rawStatus === 'number' && rawStatus >= 400 && rawStatus < 600 ? rawStatus : 500;
  const rawMessage =
    typeof errObj?.message === 'string' && errObj.message.length > 0
      ? errObj.message
      : 'An unexpected error occurred while contacting Gemini.';

  // Provide helpful, non-secret error messaging
  if (rawMessage.includes('API_KEY_INVALID') || rawMessage.includes('PERMISSION_DENIED')) {
    return {
      status,
      message:
        'The configured GEMINI_API_KEY was rejected by the Gemini API. Please verify your key in Settings > Secrets or your local .env file.',
    };
  }
  if (status === 429 || rawMessage.includes('RESOURCE_EXHAUSTED')) {
    return {
      status: 429,
      message:
        'The Gemini API rate limit or quota was reached. Wait a moment and try again, or check the usage limits for your API key.',
    };
  }
  if (status === 404 || rawMessage.includes('NOT_FOUND')) {
    return {
      status: 502,
      message: `The Gemini model "${getModelName()}" is not available for this API key. Set GEMINI_MODEL in your .env file to a model you can use.`,
    };
  }
  if (status === 503 || rawMessage.includes('UNAVAILABLE')) {
    return {
      status: 503,
      message: 'Gemini is temporarily overloaded. Please try again in a few seconds.',
    };
  }

  // The SDK often wraps the API's JSON error body inside the message string.
  let message = rawMessage;
  const jsonStart = rawMessage.indexOf('{');
  if (jsonStart !== -1) {
    try {
      const payload = JSON.parse(rawMessage.slice(jsonStart)) as {
        error?: { message?: unknown };
      };
      if (typeof payload?.error?.message === 'string' && payload.error.message.length > 0) {
        message = payload.error.message;
      }
    } catch {
      // Not JSON after all: keep the raw message.
    }
  }

  return { status, message };
}

function sendError(res: Response, error: unknown): void {
  const { status, message } = describeError(error);
  if (status >= 500) {
    console.error(`[tutor] Request failed (${status}):`, message);
  }
  res.status(status).json({ error: message });
}

function splitLines(code: string): string[] {
  return code.split(/\r?\n/);
}

function numberLines(code: string): string {
  return splitLines(code)
    .map((line, index) => `${index + 1}: ${line}`)
    .join('\n');
}

/** Parses a JSON-mode model response and guarantees a plain object back. */
function parseModelJson(text: string | undefined): Record<string, unknown> {
  const raw = (text ?? '').trim();
  if (!raw) {
    throw new HttpError(502, 'Gemini returned an empty response. Please try again.');
  }

  // Tolerate a response wrapped in a ```json fence.
  const unfenced = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');

  let parsed: unknown;
  try {
    parsed = JSON.parse(unfenced);
  } catch {
    throw new HttpError(502, 'Gemini returned a response that could not be read. Please try again.');
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new HttpError(502, 'Gemini returned a response in an unexpected shape. Please try again.');
  }
  return parsed as Record<string, unknown>;
}

function asString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

function asStringArray(value: unknown, maxItems = 12): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
    .slice(0, maxItems);
}

function asInteger(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return Math.trunc(value);
  if (typeof value === 'string' && /^-?\d+$/.test(value.trim())) return Number(value.trim());
  return null;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function validateCode(code: unknown, emptyMessage: string): string {
  if (typeof code !== 'string' || code.trim().length === 0) {
    throw new HttpError(400, emptyMessage);
  }
  if (code.length > MAX_CODE_LENGTH) {
    throw new HttpError(400, 'Code snippet is too long (max 15,000 characters).');
  }
  return code;
}

export function createTutorRouter() {
  const router = express.Router();

  router.get('/health', (_req: Request, res: Response) => {
    res.json({
      ok: true,
      configured: Boolean(process.env.GEMINI_API_KEY?.trim()),
    });
  });

  router.post('/tutor/chat', async (req: Request, res: Response) => {
    try {
      const { message, history, difficulty, hintsFirst, editorCode } = req.body ?? {};
      if (typeof message !== 'string' || message.trim().length === 0) {
        res.status(400).json({ error: 'Please enter a C# question or message.' });
        return;
      }
      if (message.length > MAX_MESSAGE_LENGTH) {
        res.status(400).json({ error: 'Message is too long (max 8,000 characters).' });
        return;
      }

      const ai = getGeminiClient();
      const level = normalizeDifficulty(difficulty);
      const useHintsFirst = hintsFirst !== false;
      const safeEditorCode = typeof editorCode === 'string' ? editorCode : undefined;

      const safeHistory = Array.isArray(history)
        ? (history as ChatMessage[])
            .filter(
              (m) =>
                m &&
                (m.role === 'user' || m.role === 'assistant') &&
                typeof m.content === 'string' &&
                m.content.trim().length > 0
            )
            .slice(-14)
        : [];

      const contents = [
        ...safeHistory.map((m) => ({
          role: m.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: m.content.slice(0, MAX_MESSAGE_LENGTH) }],
        })),
        {
          role: 'user',
          parts: [{ text: message.trim() }],
        },
      ];

      const response = await ai.models.generateContent({
        model: getModelName(),
        contents,
        config: {
          systemInstruction: buildChatSystemInstruction(level, useHintsFirst, safeEditorCode),
        },
      });

      const reply = response.text?.trim();
      if (!reply) {
        res.status(502).json({ error: 'Gemini returned an empty response. Please try again.' });
        return;
      }

      res.json({ reply });
    } catch (error) {
      sendError(res, error);
    }
  });

  router.post('/tutor/explain', async (req: Request, res: Response) => {
    try {
      const { code: rawCode, difficulty } = req.body ?? {};
      const code = validateCode(rawCode, 'Paste or write C# code in the editor to explain it.');

      const ai = getGeminiClient();
      const level = normalizeDifficulty(difficulty);
      const numbered = numberLines(code);

      const response = await ai.models.generateContent({
        model: getModelName(),
        contents: `Explain this C# code line-by-line (grouping closely related trivial lines like braces when appropriate, while keeping lineStart and lineEnd exact 1-based line numbers from the numbered listing):\n\n${numbered}`,
        config: {
          systemInstruction: [
            'You are CSharpTutor, an expert C# educator.',
            buildDifficultyGuidance(level),
            'If the input is clearly not C# code, set summary to explain that CSharpTutor only analyzes C# code and leave lines empty.',
            'Keep every explanation clear, accurate, and anchored to exact 1-based lineStart and lineEnd values.',
          ].join('\n'),
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              summary: { type: Type.STRING, description: 'Concise 1-2 sentence overview of what this C# code does.' },
              concepts: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: '3 to 6 key C# language concepts illustrated by this snippet.',
              },
              lines: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    lineStart: { type: Type.INTEGER },
                    lineEnd: { type: Type.INTEGER },
                    codeSnippet: { type: Type.STRING },
                    title: { type: Type.STRING },
                    explanation: { type: Type.STRING },
                    concept: { type: Type.STRING },
                  },
                  required: ['lineStart', 'lineEnd', 'codeSnippet', 'title', 'explanation', 'concept'],
                },
              },
            },
            required: ['summary', 'concepts', 'lines'],
          },
        },
      });

      const parsed = parseModelJson(response.text);
      const lineCount = splitLines(code).length;

      // Never trust model-supplied line numbers: clamp them to the real file.
      const lines = (Array.isArray(parsed.lines) ? parsed.lines : [])
        .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === 'object')
        .map((item) => {
          const lineStart = clamp(asInteger(item.lineStart) ?? 1, 1, lineCount);
          const lineEnd = clamp(asInteger(item.lineEnd) ?? lineStart, lineStart, lineCount);
          return {
            lineStart,
            lineEnd,
            codeSnippet: asString(item.codeSnippet),
            title: asString(item.title, `Line ${lineStart}`),
            explanation: asString(item.explanation),
            concept: asString(item.concept),
          };
        })
        .filter((item) => item.explanation.trim().length > 0);

      res.json({
        summary: asString(parsed.summary, 'Here is a walkthrough of your C# code.'),
        concepts: asStringArray(parsed.concepts, 8),
        lines,
      });
    } catch (error) {
      sendError(res, error);
    }
  });

  router.post('/tutor/debug', async (req: Request, res: Response) => {
    try {
      const { code: rawCode, difficulty, errorMessage } = req.body ?? {};
      const code = validateCode(rawCode, 'Paste C# code in the editor before running Debug.');

      const ai = getGeminiClient();
      const level = normalizeDifficulty(difficulty);
      const numbered = numberLines(code);
      const errorCtx =
        typeof errorMessage === 'string' && errorMessage.trim().length > 0
          ? `\n\nCompiler/Runtime Error reported by learner:\n${errorMessage.trim().slice(0, 1000)}`
          : '';

      const response = await ai.models.generateContent({
        model: getModelName(),
        contents: `Analyze this C# code for bugs, compiler errors, null-safety hazards, async pitfalls, or logic issues:\n\n${numbered}${errorCtx}`,
        config: {
          systemInstruction: [
            'You are CSharpTutor, a C# debugging mentor.',
            buildDifficultyGuidance(level),
            'Provide 3 progressive hints that guide the learner toward spotting and fixing the issue WITHOUT revealing the exact fixed code inside the hints array.',
            'Also provide the exact suspectLines (1-based line numbers), rootCause, fixedCode (complete corrected C# code, without line-number prefixes), and explanation so the UI can keep the fix hidden behind a Hints-First reveal gate.',
          ].join('\n'),
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              summary: { type: Type.STRING },
              bugType: { type: Type.STRING, description: 'Short C# issue category, e.g. NullReferenceException, Async Void, Off-by-One, or No Bugs Found.' },
              suspectLines: {
                type: Type.ARRAY,
                items: { type: Type.INTEGER },
              },
              hints: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: '3 progressive Socratic hints from gentle nudge to specific check, without spoiling the full solution.',
              },
              rootCause: { type: Type.STRING },
              fixedCode: { type: Type.STRING },
              explanation: { type: Type.STRING },
            },
            required: ['summary', 'bugType', 'suspectLines', 'hints', 'rootCause', 'fixedCode', 'explanation'],
          },
        },
      });

      const parsed = parseModelJson(response.text);
      const lineCount = splitLines(code).length;

      const suspectLines = Array.from(
        new Set(
          (Array.isArray(parsed.suspectLines) ? parsed.suspectLines : [])
            .map((value) => asInteger(value))
            .filter((value): value is number => value !== null && value >= 1 && value <= lineCount)
        )
      ).sort((a, b) => a - b);

      // If the model omits the fix, fall back to the learner's own code so
      // "Apply Fix to Editor" can never wipe the editor.
      const fixedCode = asString(parsed.fixedCode);

      res.json({
        summary: asString(parsed.summary, 'Analysis complete.'),
        bugType: asString(parsed.bugType, 'Code Review'),
        suspectLines,
        hints: asStringArray(parsed.hints, 6),
        rootCause: asString(parsed.rootCause),
        fixedCode: fixedCode.trim().length > 0 ? fixedCode : code,
        explanation: asString(parsed.explanation),
      });
    } catch (error) {
      sendError(res, error);
    }
  });

  router.post('/tutor/practice', async (req: Request, res: Response) => {
    try {
      const { difficulty, topic } = req.body ?? {};
      const level = normalizeDifficulty(difficulty);
      const safeTopic =
        typeof topic === 'string' && topic.trim().length > 0
          ? topic.trim().slice(0, 80)
          : 'Fundamentals & Types';

      const ai = getGeminiClient();

      const response = await ai.models.generateContent({
        model: getModelName(),
        contents: `Generate a fresh, focused C# coding exercise for difficulty "${level}" on topic "${safeTopic}".`,
        config: {
          systemInstruction: [
            'You are CSharpTutor creating a practical, self-contained C# coding exercise.',
            buildDifficultyGuidance(level),
            'Include clear requirements, clean starterCode with TODO comments, 3 progressive hints (without giving away the full code), and a clean idiomatic solutionCode.',
          ].join('\n'),
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              prompt: { type: Type.STRING },
              requirements: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
              },
              starterCode: { type: Type.STRING },
              hints: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
              },
              solutionCode: { type: Type.STRING },
            },
            required: ['title', 'prompt', 'requirements', 'starterCode', 'hints', 'solutionCode'],
          },
        },
      });

      const parsed = parseModelJson(response.text);
      const prompt = asString(parsed.prompt);
      const starterCode = asString(parsed.starterCode);
      if (prompt.trim().length === 0 || starterCode.trim().length === 0) {
        throw new HttpError(502, 'Gemini returned an incomplete exercise. Please try again.');
      }

      res.json({
        id: `prac-${Date.now()}`,
        title: asString(parsed.title, 'C# Practice Exercise'),
        difficulty: level,
        topic: safeTopic,
        prompt,
        requirements: asStringArray(parsed.requirements),
        starterCode,
        hints: asStringArray(parsed.hints, 6),
        solutionCode: asString(parsed.solutionCode),
      });
    } catch (error) {
      sendError(res, error);
    }
  });

  router.post('/tutor/practice/check', async (req: Request, res: Response) => {
    try {
      const { exercise, userCode, difficulty, hintsFirst } = req.body ?? {};
      if (!exercise || typeof exercise !== 'object' || typeof exercise.prompt !== 'string') {
        res.status(400).json({ error: 'Missing exercise context.' });
        return;
      }
      if (typeof userCode !== 'string' || userCode.trim().length === 0) {
        res.status(400).json({ error: 'Write your C# solution in the editor before checking.' });
        return;
      }
      if (userCode.length > MAX_CODE_LENGTH) {
        res.status(400).json({ error: 'Code snippet is too long (max 15,000 characters).' });
        return;
      }

      const ai = getGeminiClient();
      const level = normalizeDifficulty(difficulty);
      const useHintsFirst = hintsFirst !== false;
      const exerciseTitle = asString(exercise.title, 'C# Practice Exercise').slice(0, 200);
      const exercisePrompt = asString(exercise.prompt).slice(0, 4000);
      const requirements = asStringArray(exercise.requirements).map((r) => r.slice(0, 500));

      const response = await ai.models.generateContent({
        model: getModelName(),
        contents: [
          `Exercise Title: ${exerciseTitle}`,
          `Prompt: ${exercisePrompt}`,
          requirements.length > 0
            ? `Requirements:\n- ${requirements.join('\n- ')}`
            : 'Requirements: (none listed beyond the prompt)',
          `\nLearner's C# Code:\n\`\`\`csharp\n${userCode}\n\`\`\``,
        ].join('\n'),
        config: {
          systemInstruction: [
            'You are CSharpTutor evaluating a learner’s C# exercise submission.',
            buildDifficultyGuidance(level),
            useHintsFirst
              ? 'Use hints-first feedback: if the code is incomplete or buggy, praise what works and give 1-3 targeted hints without writing out the full corrected solution.'
              : 'Provide clear feedback and specific guidance on how to make the solution idiomatic.',
            'Mark passed=true only if the C# code compiles mentally and satisfies all listed requirements cleanly.',
          ].join('\n'),
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              passed: { type: Type.BOOLEAN },
              summary: { type: Type.STRING },
              strengths: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
              },
              hints: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
              },
              nextStep: { type: Type.STRING },
            },
            required: ['passed', 'summary', 'strengths', 'hints', 'nextStep'],
          },
        },
      });

      const parsed = parseModelJson(response.text);
      res.json({
        passed: parsed.passed === true,
        summary: asString(parsed.summary, 'Evaluation complete.'),
        strengths: asStringArray(parsed.strengths),
        hints: asStringArray(parsed.hints),
        nextStep: asString(parsed.nextStep),
      });
    } catch (error) {
      sendError(res, error);
    }
  });

  router.post('/tutor/quiz', async (req: Request, res: Response) => {
    try {
      const { difficulty, topic } = req.body ?? {};
      const level = normalizeDifficulty(difficulty);
      const safeTopic =
        typeof topic === 'string' && topic.trim().length > 0
          ? topic.trim().slice(0, 80)
          : 'Mixed C# Fundamentals';

      const ai = getGeminiClient();

      const response = await ai.models.generateContent({
        model: getModelName(),
        contents: `Create a 5-question multiple-choice C# quiz at "${level}" difficulty focusing on "${safeTopic}". Include short C# code output or bug-spotting snippets where helpful.`,
        config: {
          systemInstruction: [
            'You are CSharpTutor creating a rigorous C# multiple-choice quiz.',
            buildDifficultyGuidance(level),
            'Every question must have exactly 4 plausible options, 1 unambiguous correctIndex (0-3), and a crisp C# explanation.',
          ].join('\n'),
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              questions: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    question: { type: Type.STRING },
                    codeSnippet: { type: Type.STRING },
                    options: {
                      type: Type.ARRAY,
                      items: { type: Type.STRING },
                    },
                    correctIndex: { type: Type.INTEGER },
                    explanation: { type: Type.STRING },
                    topic: { type: Type.STRING },
                  },
                  required: ['question', 'options', 'correctIndex', 'explanation', 'topic'],
                },
              },
            },
            required: ['questions'],
          },
        },
      });

      const parsed = parseModelJson(response.text);
      const stamp = Date.now();

      // Drop any question the UI could not grade (missing options or an
      // answer index that does not point at one of them).
      const questions = (Array.isArray(parsed.questions) ? parsed.questions : [])
        .filter((q): q is Record<string, unknown> => Boolean(q) && typeof q === 'object')
        .map((q) => {
          const rawOptions = Array.isArray(q.options) ? q.options : [];
          const options = asStringArray(rawOptions, 6);
          const correctIndex = asInteger(q.correctIndex);
          const question = asString(q.question).trim();
          if (
            question.length === 0 ||
            options.length < 2 ||
            // A blank or non-text option would shift the answer index
            options.length !== rawOptions.length ||
            correctIndex === null ||
            correctIndex < 0 ||
            correctIndex >= options.length
          ) {
            return null;
          }
          const codeSnippet = asString(q.codeSnippet);
          return {
            question,
            ...(codeSnippet.trim().length > 0 ? { codeSnippet } : {}),
            options,
            correctIndex,
            explanation: asString(q.explanation),
            topic: asString(q.topic, safeTopic),
          };
        })
        .filter((q): q is NonNullable<typeof q> => q !== null)
        .map((q, idx) => ({ id: `ai-q-${stamp}-${idx}`, ...q }));

      if (questions.length === 0) {
        throw new HttpError(502, 'Gemini did not return any usable quiz questions. Please try again.');
      }

      res.json({ questions });
    } catch (error) {
      sendError(res, error);
    }
  });

  return router;
}
