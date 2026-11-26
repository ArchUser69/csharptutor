import { AlertCircle, ListTree, RefreshCw } from 'lucide-react';
import type { Difficulty, ExplainCodeResult } from '../types/tutor';

interface LineByLineViewProps {
  result: ExplainCodeResult | null;
  difficulty: Difficulty;
  isLoading: boolean;
  error: string | null;
  activeLines: number[];
  onHoverLines: (lines: number[]) => void;
  onExplainCode: () => void;
}

function expandRange(start: number, end: number): number[] {
  const safeStart = Math.max(1, Math.floor(start) || 1);
  // Cap the span so a bad range can never build a huge array
  const safeEnd = Math.min(Math.max(safeStart, Math.floor(end) || safeStart), safeStart + 2000);
  const nums: number[] = [];
  for (let i = safeStart; i <= safeEnd; i++) {
    nums.push(i);
  }
  return nums;
}

export function LineByLineView({
  result,
  difficulty,
  isLoading,
  error,
  activeLines,
  onHoverLines,
  onExplainCode,
}: LineByLineViewProps) {
  const activeSet = new Set(activeLines);

  return (
    <div className="flex h-full flex-col bg-[#0F131C]">
      <div className="flex min-h-[57px] items-center justify-between gap-3 border-b border-slate-800/80 px-5 py-2">
        <div>
          <h1 className="font-display text-base font-semibold text-white">
            Line-by-Line Explanation
          </h1>
          <p className="text-xs text-slate-400">
            Hover or click any step to highlight lines in your editor ·{' '}
            <span className="capitalize text-slate-300">{difficulty}</span>
          </p>
        </div>
        <button
          type="button"
          onClick={onExplainCode}
          disabled={isLoading}
          className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3.5 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-indigo-500 disabled:opacity-50 whitespace-nowrap shrink-0 cursor-pointer"
        >
          <RefreshCw
            className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`}
            aria-hidden="true"
          />
          <span>{result ? 'Re-Analyze Code' : 'Explain Code'}</span>
        </button>
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

        {isLoading && (
          <div className="space-y-3 animate-pulse">
            {[1, 2, 3].map((n) => (
              <div
                key={n}
                className="rounded-lg border border-slate-800 bg-[#151B28] p-4 space-y-2"
              >
                <div className="h-3.5 w-1/3 rounded bg-slate-700/70" />
                <div className="h-3 w-full rounded bg-slate-800" />
                <div className="h-3 w-5/6 rounded bg-slate-800" />
              </div>
            ))}
          </div>
        )}

        {!isLoading && !result && (
          <div className="mx-auto max-w-lg rounded-lg border border-slate-800 bg-[#151B28] p-6 space-y-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-white">
              <ListTree className="h-4 w-4 text-sky-400" aria-hidden="true" />
              <span>Walk through your C# code step by step</span>
            </div>
            <p className="text-sm leading-relaxed text-slate-400">
              Click <strong className="text-slate-200">Explain Code</strong> to break down every
              statement, type, and runtime behavior in the editor on the left.
            </p>
            <button
              type="button"
              onClick={onExplainCode}
              className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-500 cursor-pointer"
            >
              Explain Current Editor Code
            </button>
          </div>
        )}

        {!isLoading && result && (
          <div className="space-y-5">
            <div className="rounded-lg border border-slate-800 bg-[#151B28] p-4 space-y-2">
              <h2 className="text-xs font-semibold text-slate-400">Code Summary</h2>
              <p className="text-sm leading-relaxed text-slate-200">{result.summary}</p>
              {result.concepts.length > 0 && (
                <p className="pt-1 text-xs text-slate-400">
                  <span className="text-slate-500">Key Concepts: </span>
                  <span className="text-sky-300">{result.concepts.join(' · ')}</span>
                </p>
              )}
            </div>

            <div className="space-y-2.5">
              {result.lines.map((item, idx) => {
                const range = expandRange(item.lineStart, item.lineEnd);
                const isActive = range.some((l) => activeSet.has(l));
                const lineLabel =
                  item.lineStart === item.lineEnd
                    ? `Line ${item.lineStart}`
                    : `Lines ${item.lineStart}–${item.lineEnd}`;

                return (
                  <button
                    key={`${item.lineStart}-${item.lineEnd}-${idx}`}
                    type="button"
                    onMouseEnter={() => onHoverLines(range)}
                    onFocus={() => onHoverLines(range)}
                    onClick={() => onHoverLines(range)}
                    className={`w-full rounded-lg border p-4 text-left transition-colors duration-150 cursor-pointer ${
                      isActive
                        ? 'border-sky-400/60 bg-[#172133]'
                        : 'border-slate-800 bg-[#151B28] hover:border-slate-700'
                    }`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-display text-sm font-semibold text-white">
                        {item.title}
                      </span>
                      <span className="font-mono text-xs text-sky-300 tabular-nums">
                        {lineLabel} · {item.concept}
                      </span>
                    </div>
                    {item.codeSnippet && (
                      <pre className="mt-2 overflow-x-auto rounded bg-[#0B0E14] px-3 py-1.5 font-mono text-xs text-slate-300 border border-slate-800/80">
                        {item.codeSnippet}
                      </pre>
                    )}
                    <p className="mt-2 text-[13.5px] leading-relaxed text-slate-300">
                      {item.explanation}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
