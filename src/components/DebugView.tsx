import { AlertCircle, Bug, Check, Eye, Lightbulb, Sparkles } from 'lucide-react';
import { useState } from 'react';
import type { DebugAnalysis, Difficulty } from '../types/tutor';
import { HighlightedCSharp } from './MarkdownRenderer';

interface DebugViewProps {
  analysis: DebugAnalysis | null;
  difficulty: Difficulty;
  hintsFirst: boolean;
  isLoading: boolean;
  error: string | null;
  errorMessage: string;
  onChangeErrorMessage: (value: string) => void;
  onRunDebug: () => void;
  onApplyFixToEditor: (fixedCode: string) => void;
  onFocusLines: (lines: number[]) => void;
}

export function DebugView({
  analysis,
  difficulty,
  hintsFirst,
  isLoading,
  error,
  errorMessage,
  onChangeErrorMessage,
  onRunDebug,
  onApplyFixToEditor,
  onFocusLines,
}: DebugViewProps) {
  const [revealedHints, setRevealedHints] = useState(1);
  const [solutionRevealed, setSolutionRevealed] = useState(false);

  // Every new analysis starts with one hint and the fix hidden again, whether
  // it was started here or from the Debug button in the editor toolbar.
  // (State is adjusted during render so the old fix never flashes on screen.)
  const [shownAnalysis, setShownAnalysis] = useState(analysis);
  if (shownAnalysis !== analysis) {
    setShownAnalysis(analysis);
    setRevealedHints(1);
    setSolutionRevealed(false);
  }

  const handleAnalyze = () => {
    onRunDebug();
  };

  const showFullFix = !hintsFirst || solutionRevealed;

  return (
    <div className="flex h-full flex-col bg-[#0F131C]">
      <div className="flex min-h-[57px] items-center justify-between gap-3 border-b border-slate-800/80 px-5 py-2">
        <div>
          <h1 className="font-display text-base font-semibold text-white">Debug Pasted C# Code</h1>
          <p className="text-xs text-slate-400">
            Spot runtime &amp; compiler issues with guided hints ·{' '}
            <span className="capitalize text-slate-300">{difficulty}</span>
          </p>
        </div>
        <button
          type="button"
          onClick={handleAnalyze}
          disabled={isLoading}
          className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3.5 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-indigo-500 disabled:opacity-50 whitespace-nowrap shrink-0 cursor-pointer"
        >
          <Bug className="h-3.5 w-3.5" aria-hidden="true" />
          <span>{isLoading ? 'Inspecting...' : 'Inspect Code'}</span>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-5 space-y-4">
        {/* Optional Compiler / Stack Trace Input */}
        <div className="space-y-1.5">
          <label
            htmlFor="debug-error-input"
            className="block text-xs font-medium text-slate-400"
          >
            Optional compiler error or exception message (e.g. CS0103, NullReferenceException)
          </label>
          <input
            id="debug-error-input"
            type="text"
            value={errorMessage}
            onChange={(e) => onChangeErrorMessage(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !isLoading) handleAnalyze();
            }}
            maxLength={1000}
            placeholder="Paste compiler diagnostic or exception text if you have one..."
            className="w-full rounded-lg border border-slate-800 bg-[#0B0E14] px-3 py-2 font-mono text-xs text-slate-200 placeholder:text-slate-600 focus:border-sky-400 focus:outline-none"
          />
        </div>

        {error && (
          <div
            role="alert"
            className="flex items-start gap-2 rounded-lg border border-rose-500/40 bg-rose-950/30 px-3.5 py-2.5 text-xs text-rose-200"
          >
            <AlertCircle className="mt-0.5 h-4 w-4 text-rose-400 shrink-0" aria-hidden="true" />
            <span>{error}</span>
          </div>
        )}

        {isLoading && (
          <div className="space-y-3 animate-pulse">
            <div className="rounded-lg border border-slate-800 bg-[#151B28] p-4 space-y-2">
              <div className="h-4 w-1/3 rounded bg-slate-700/70" />
              <div className="h-3 w-full rounded bg-slate-800" />
              <div className="h-3 w-4/5 rounded bg-slate-800" />
            </div>
          </div>
        )}

        {!isLoading && !analysis && (
          <div className="rounded-lg border border-slate-800 bg-[#151B28] p-6 space-y-3">
            <h2 className="font-display text-sm font-semibold text-white">
              Hints-First C# Debugging
            </h2>
            <p className="text-sm leading-relaxed text-slate-400">
              Paste your broken C# code into the editor on the left, optionally add an exception or
              CS compiler code above, and click <strong className="text-slate-200">Inspect Code</strong>.
              CSharpTutor highlights suspect lines and gives progressive hints before revealing the
              fix.
            </p>
            <button
              type="button"
              onClick={handleAnalyze}
              className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-500 cursor-pointer"
            >
              Inspect Current Editor Code
            </button>
          </div>
        )}

        {!isLoading && analysis && (
          <div className="space-y-4">
            {/* Diagnostic Summary */}
            <div className="rounded-lg border border-slate-800 bg-[#151B28] p-4 space-y-2.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-display text-sm font-semibold text-amber-300">
                  {analysis.bugType}
                </span>
                {analysis.suspectLines.length > 0 && (
                  <button
                    type="button"
                    onClick={() => onFocusLines(analysis.suspectLines)}
                    className="font-mono text-xs text-rose-300 underline decoration-rose-400/50 hover:text-rose-200 cursor-pointer tabular-nums"
                  >
                    Suspect lines: {analysis.suspectLines.join(', ')}
                  </button>
                )}
              </div>
              <p className="text-sm leading-relaxed text-slate-200">{analysis.summary}</p>
            </div>

            {/* Progressive Hints */}
            <div className="rounded-lg border border-slate-800 bg-[#151B28] p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-300">
                  <Lightbulb className="h-4 w-4" aria-hidden="true" />
                  <span>Guided Hints</span>
                </div>
                <span className="font-mono text-xs text-slate-500 tabular-nums">
                  {Math.min(revealedHints, analysis.hints.length)} / {analysis.hints.length} shown
                </span>
              </div>

              {analysis.hints.length === 0 && (
                <p className="text-sm text-slate-400">No hints were needed for this code.</p>
              )}

              <ol className="space-y-2.5">
                {analysis.hints.slice(0, revealedHints).map((hint, idx) => (
                  <li
                    key={idx}
                    className="rounded-md border border-slate-800/90 bg-[#0B0E14] px-3.5 py-2.5 text-sm leading-relaxed text-slate-200"
                  >
                    <span className="mr-2 font-mono text-xs font-semibold text-amber-300">
                      Hint {idx + 1}:
                    </span>
                    {hint}
                  </li>
                ))}
              </ol>

              <div className="flex flex-wrap items-center gap-2 pt-1">
                {revealedHints < analysis.hints.length && (
                  <button
                    type="button"
                    onClick={() => setRevealedHints((h) => h + 1)}
                    className="inline-flex items-center gap-1.5 rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-1.5 text-xs font-medium text-amber-300 hover:bg-amber-500/20 cursor-pointer"
                  >
                    <Lightbulb className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>Show Next Hint</span>
                  </button>
                )}

                {!showFullFix && (
                  <button
                    type="button"
                    onClick={() => setSolutionRevealed(true)}
                    className="inline-flex items-center gap-1.5 rounded-md border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs font-medium text-slate-200 hover:border-sky-400/50 hover:text-white cursor-pointer"
                  >
                    <Eye className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>Reveal Root Cause &amp; Fix</span>
                  </button>
                )}
              </div>
            </div>

            {/* Revealed Root Cause & Fixed Code */}
            {showFullFix && (
              <div className="rounded-lg border border-emerald-500/30 bg-[#151B28] p-4 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-300">
                    <Sparkles className="h-4 w-4" aria-hidden="true" />
                    <span>Root Cause &amp; Corrected C# Code</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => onApplyFixToEditor(analysis.fixedCode)}
                    className="inline-flex items-center gap-1.5 rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-500 cursor-pointer"
                  >
                    <Check className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>Apply Fix to Editor</span>
                  </button>
                </div>

                <p className="text-sm leading-relaxed text-slate-200">{analysis.rootCause}</p>
                <p className="text-xs leading-relaxed text-slate-400">{analysis.explanation}</p>

                <div className="overflow-x-auto rounded-lg border border-slate-800 bg-[#0B0E14] p-3.5">
                  <HighlightedCSharp code={analysis.fixedCode} />
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
