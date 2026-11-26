import {
  AlertCircle,
  CheckCircle2,
  Code2,
  Eye,
  Lightbulb,
  Play,
  RefreshCw,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import type {
  CSharpTopic,
  Difficulty,
  PracticeEvaluation,
  PracticeExercise,
} from '../types/tutor';
import { CSHARP_TOPICS } from '../utils/learningProgress';
import { HighlightedCSharp } from './MarkdownRenderer';

interface PracticeViewProps {
  exercise: PracticeExercise;
  difficulty: Difficulty;
  hintsFirst: boolean;
  editorCode: string;
  evaluation: PracticeEvaluation | null;
  completedIds: string[];
  isGenerating: boolean;
  isChecking: boolean;
  error: string | null;
  onGenerateExercise: (topic: CSharpTopic) => void;
  onCheckCode: () => void;
  onLoadCodeInEditor: (code: string) => void;
}

export function PracticeView({
  exercise,
  difficulty,
  hintsFirst,
  evaluation,
  completedIds,
  isGenerating,
  isChecking,
  error,
  onGenerateExercise,
  onCheckCode,
  onLoadCodeInEditor,
}: PracticeViewProps) {
  const [selectedTopic, setSelectedTopic] = useState<CSharpTopic>(exercise.topic);
  const [revealedHints, setRevealedHints] = useState(0);
  const [solutionVisible, setSolutionVisible] = useState(false);

  useEffect(() => {
    setSelectedTopic(exercise.topic);
    setRevealedHints(0);
    setSolutionVisible(false);
  }, [exercise.id, exercise.topic]);

  const isCompleted = completedIds.includes(exercise.id);

  const handleGenerate = () => {
    setRevealedHints(0);
    setSolutionVisible(false);
    onGenerateExercise(selectedTopic);
  };

  return (
    <div className="flex h-full flex-col bg-[#0F131C]">
      {/* Toolbar */}
      <div className="flex min-h-[57px] flex-wrap sm:flex-nowrap items-center justify-between gap-2 border-b border-slate-800/80 px-5 py-2">
        <div className="min-w-0">
          <h1 className="font-display text-base font-semibold text-white truncate">Practice Mode</h1>
          <p className="text-xs text-slate-400 truncate">
            Hands-on C# challenges · <span className="capitalize text-slate-300">{difficulty}</span>
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <label htmlFor="practice-topic-select" className="sr-only">
            Select C# practice topic
          </label>
          <select
            id="practice-topic-select"
            value={selectedTopic}
            onChange={(e) => setSelectedTopic(e.target.value as CSharpTopic)}
            className="max-w-[165px] truncate rounded-md border border-slate-700/80 bg-[#0B0E14] px-2.5 py-1.5 text-xs text-slate-200 focus:border-sky-400 focus:outline-none cursor-pointer"
          >
            {CSHARP_TOPICS.map((topic) => (
              <option key={topic} value={topic}>
                {topic}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={handleGenerate}
            disabled={isGenerating}
            className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3.5 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-indigo-500 disabled:opacity-50 whitespace-nowrap shrink-0 cursor-pointer"
          >
            <RefreshCw
              className={`h-3.5 w-3.5 ${isGenerating ? 'animate-spin' : ''}`}
              aria-hidden="true"
            />
            <span>{isGenerating ? 'Generating...' : 'New Exercise'}</span>
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-5 space-y-4">
        {error && (
          <div
            role="alert"
            className="flex items-start gap-2 rounded-lg border border-rose-500/40 bg-rose-950/30 px-3.5 py-2.5 text-xs text-rose-200"
          >
            <AlertCircle className="mt-0.5 h-4 w-4 text-rose-400 shrink-0" aria-hidden="true" />
            <span>{error}</span>
          </div>
        )}

        {/* Exercise Brief */}
        <div className="rounded-lg border border-slate-800 bg-[#151B28] p-4 space-y-3">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="space-y-1">
              <div className="text-xs text-slate-400">
                <span className="capitalize">{exercise.difficulty}</span>
                <span aria-hidden="true"> · </span>
                <span>{exercise.topic}</span>
                {isCompleted && (
                  <>
                    <span aria-hidden="true"> · </span>
                    <span className="inline-flex items-center gap-1 font-medium text-emerald-400">
                      <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                      Completed
                    </span>
                  </>
                )}
              </div>
              <h2 className="font-display text-base font-semibold text-white">{exercise.title}</h2>
            </div>

            <button
              type="button"
              onClick={() => onLoadCodeInEditor(exercise.starterCode)}
              className="inline-flex items-center gap-1.5 rounded-md border border-slate-700 bg-slate-900/70 px-2.5 py-1.5 text-xs font-medium text-sky-300 hover:border-sky-400/50 hover:text-white whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Code2 className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Reset Starter Code</span>
            </button>
          </div>

          <p className="text-sm leading-relaxed text-slate-200">{exercise.prompt}</p>

          <div className="space-y-1.5 pt-1">
            <h3 className="text-xs font-semibold text-slate-400">Requirements</h3>
            <ul className="list-disc space-y-1 pl-5 text-xs leading-relaxed text-slate-300">
              {exercise.requirements.map((req, idx) => (
                <li key={idx}>{req}</li>
              ))}
            </ul>
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-800/80">
            <button
              type="button"
              onClick={onCheckCode}
              disabled={isChecking || isGenerating}
              className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 py-2 text-xs font-semibold text-white transition-colors hover:bg-emerald-500 disabled:opacity-50 whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Play className="h-3.5 w-3.5" aria-hidden="true" />
              <span>{isChecking ? 'Checking...' : 'Check My Code'}</span>
            </button>

            {revealedHints < exercise.hints.length && (
              <button
                type="button"
                onClick={() => setRevealedHints((n) => n + 1)}
                className="inline-flex items-center gap-1.5 rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs font-medium text-amber-300 hover:bg-amber-500/20 whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Lightbulb className="h-3.5 w-3.5" aria-hidden="true" />
                <span>
                  Show Hint ({revealedHints + 1}/{exercise.hints.length})
                </span>
              </button>
            )}

            {!solutionVisible && (
              <button
                type="button"
                onClick={() => setSolutionVisible(true)}
                className="inline-flex items-center gap-1.5 rounded-md border border-slate-700 bg-slate-900/70 px-3 py-2 text-xs font-medium text-slate-300 hover:text-white whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Eye className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Reveal Solution</span>
              </button>
            )}
          </div>
        </div>

        {/* Progressive Hints */}
        {revealedHints > 0 && (
          <div className="rounded-lg border border-slate-800 bg-[#151B28] p-4 space-y-2.5">
            <h3 className="text-xs font-semibold text-amber-300">Hints</h3>
            <ol className="space-y-2">
              {exercise.hints.slice(0, revealedHints).map((hint, idx) => (
                <li
                  key={idx}
                  className="rounded-md border border-slate-800 bg-[#0B0E14] px-3 py-2 text-xs leading-relaxed text-slate-200"
                >
                  <span className="mr-1.5 font-mono font-semibold text-amber-300">
                    #{idx + 1}
                  </span>
                  {hint}
                </li>
              ))}
            </ol>
          </div>
        )}

        {/* Evaluation Feedback */}
        {evaluation && (
          <div
            className={`rounded-lg border p-4 space-y-3 ${
              evaluation.passed
                ? 'border-emerald-500/40 bg-emerald-950/20'
                : 'border-amber-500/40 bg-amber-950/15'
            }`}
          >
            <div className="flex items-center gap-2 text-sm font-semibold">
              {evaluation.passed ? (
                <>
                  <CheckCircle2 className="h-4 w-4 text-emerald-400" aria-hidden="true" />
                  <span className="text-emerald-300">Passed — Solid C# Solution</span>
                </>
              ) : (
                <>
                  <Lightbulb className="h-4 w-4 text-amber-400" aria-hidden="true" />
                  <span className="text-amber-300">
                    {hintsFirst ? 'Keep Going — Hints-First Feedback' : 'Review Feedback'}
                  </span>
                </>
              )}
            </div>
            <p className="text-sm leading-relaxed text-slate-200">{evaluation.summary}</p>

            {evaluation.strengths.length > 0 && (
              <div className="space-y-1">
                <h4 className="text-xs font-semibold text-slate-400">What Works Well</h4>
                <ul className="list-disc space-y-1 pl-5 text-xs text-slate-300">
                  {evaluation.strengths.map((s, idx) => (
                    <li key={idx}>{s}</li>
                  ))}
                </ul>
              </div>
            )}

            {evaluation.hints.length > 0 && (
              <div className="space-y-1">
                <h4 className="text-xs font-semibold text-amber-300">Next Hints</h4>
                <ul className="list-disc space-y-1 pl-5 text-xs text-slate-200">
                  {evaluation.hints.map((h, idx) => (
                    <li key={idx}>{h}</li>
                  ))}
                </ul>
              </div>
            )}

            <p className="text-xs text-slate-400">
              <strong className="text-slate-200">Next step: </strong>
              {evaluation.nextStep}
            </p>
          </div>
        )}

        {/* Explicit Solution Reveal */}
        {solutionVisible && (
          <div className="rounded-lg border border-slate-800 bg-[#151B28] p-4 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-xs font-semibold text-sky-300">Reference C# Solution</h3>
              <button
                type="button"
                onClick={() => onLoadCodeInEditor(exercise.solutionCode)}
                className="text-xs font-medium text-sky-300 underline hover:text-sky-200 cursor-pointer"
              >
                Load into Editor
              </button>
            </div>
            <div className="overflow-x-auto rounded-lg border border-slate-800 bg-[#0B0E14] p-3.5">
              <HighlightedCSharp code={exercise.solutionCode} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
