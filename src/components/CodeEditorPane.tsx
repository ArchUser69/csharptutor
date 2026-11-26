import { Bug, Check, Copy, FileCode2, ListTree, RotateCcw } from 'lucide-react';
import { useRef, useState, type KeyboardEvent, type UIEvent } from 'react';
import { tokenizeCSharpCode } from '../utils/csharpTokenizer';
import { CODE_PRESETS } from '../utils/learningProgress';
import { getTokenColorClass } from './MarkdownRenderer';

interface CodeEditorPaneProps {
  code: string;
  onChangeCode: (nextCode: string) => void;
  highlightedLines?: number[];
  suspectLines?: number[];
  onSelectLine?: (lineNumber: number) => void;
  onTriggerExplain: () => void;
  onTriggerDebug: () => void;
  isExplaining?: boolean;
  isDebugging?: boolean;
}

export function CodeEditorPane({
  code,
  onChangeCode,
  highlightedLines = [],
  suspectLines = [],
  onSelectLine,
  onTriggerExplain,
  onTriggerDebug,
  isExplaining = false,
  isDebugging = false,
}: CodeEditorPaneProps) {
  const [copied, setCopied] = useState(false);
  // Derived from the editor contents, so the dropdown never claims a sample
  // is loaded after the code has been edited or replaced.
  const selectedPresetId = CODE_PRESETS.find((p) => p.code === code)?.id ?? '';
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const preRef = useRef<HTMLPreElement | null>(null);
  const gutterRef = useRef<HTMLDivElement | null>(null);

  const tokenizedLines = tokenizeCSharpCode(code);
  const highlightSet = new Set(highlightedLines);
  const suspectSet = new Set(suspectLines);

  const handleScroll = (e: UIEvent<HTMLTextAreaElement>) => {
    const target = e.currentTarget;
    if (preRef.current) {
      preRef.current.scrollTop = target.scrollTop;
      preRef.current.scrollLeft = target.scrollLeft;
    }
    if (gutterRef.current) {
      gutterRef.current.scrollTop = target.scrollTop;
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const el = e.currentTarget;
      const start = el.selectionStart;
      const end = el.selectionEnd;
      const next = code.slice(0, start) + '    ' + code.slice(end);
      onChangeCode(next);
      requestAnimationFrame(() => {
        if (textareaRef.current) {
          textareaRef.current.selectionStart = start + 4;
          textareaRef.current.selectionEnd = start + 4;
        }
      });
    }
  };

  const handlePresetChange = (presetId: string) => {
    const preset = CODE_PRESETS.find((p) => p.id === presetId);
    if (preset) {
      onChangeCode(preset.code);
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      // Ignore clipboard failure
    }
  };

  return (
    <section
      aria-label="C# Code Editor"
      className="flex h-full flex-col bg-[#0B0E14] border-r border-slate-800/90 min-w-0"
    >
      {/* Editor Header Toolbar */}
      <div className="flex min-h-[57px] flex-wrap items-center justify-between gap-2 border-b border-slate-800/90 bg-[#111622]/70 px-3.5 py-2">
        <div className="flex items-center gap-2 min-w-0">
          <FileCode2 className="h-4 w-4 text-sky-400 shrink-0" aria-hidden="true" />
          <span className="text-xs font-semibold text-slate-200 whitespace-nowrap shrink-0">
            Program.cs
          </span>
          <span className="text-slate-600 shrink-0" aria-hidden="true">
            /
          </span>
          <label htmlFor="csharp-preset-select" className="sr-only">
            Load C# sample snippet
          </label>
          <select
            id="csharp-preset-select"
            value={selectedPresetId}
            onChange={(e) => handlePresetChange(e.target.value)}
            className="min-w-0 max-w-[155px] truncate rounded-md border border-slate-700/80 bg-[#0B0E14] px-2 py-1 text-xs text-slate-300 focus:border-sky-400 focus:outline-none cursor-pointer"
          >
            <option value="" disabled>
              Load a sample…
            </option>
            {CODE_PRESETS.map((preset) => (
              <option key={preset.id} value={preset.id}>
                {preset.label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={handleCopy}
            className="inline-flex items-center gap-1 rounded-md border border-slate-800 bg-slate-900/60 px-2 py-1 text-xs font-medium text-slate-300 transition-colors hover:border-slate-700 hover:text-white whitespace-nowrap shrink-0 cursor-pointer"
          >
            {copied ? (
              <>
                <Check className="h-3.5 w-3.5 text-emerald-400" aria-hidden="true" />
                <span className="text-emerald-400">Copied</span>
              </>
            ) : (
              <>
                <Copy className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Copy</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={() => onChangeCode('')}
            aria-label="Clear code editor"
            className="inline-flex items-center gap-1 rounded-md border border-slate-800 bg-slate-900/60 px-2 py-1 text-xs font-medium text-slate-300 transition-colors hover:border-slate-700 hover:text-white whitespace-nowrap shrink-0 cursor-pointer"
          >
            <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Clear</span>
          </button>

          <button
            type="button"
            onClick={onTriggerExplain}
            disabled={isExplaining}
            className="inline-flex items-center gap-1 rounded-md border border-sky-500/30 bg-sky-500/10 px-2 py-1 text-xs font-medium text-sky-300 transition-colors hover:bg-sky-500/20 disabled:cursor-wait disabled:opacity-50 whitespace-nowrap shrink-0 cursor-pointer"
          >
            <ListTree className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Explain</span>
          </button>

          <button
            type="button"
            onClick={onTriggerDebug}
            disabled={isDebugging}
            className="inline-flex items-center gap-1 rounded-md border border-amber-500/30 bg-amber-500/10 px-2 py-1 text-xs font-medium text-amber-300 transition-colors hover:bg-amber-500/20 disabled:cursor-wait disabled:opacity-50 whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Bug className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Debug</span>
          </button>
        </div>
      </div>

      {/* Synchronized Gutter + Syntax Highlighted Layer + Editable Textarea */}
      <div className="relative flex flex-1 overflow-hidden bg-[#0B0E14]">
        {/* Line Numbers Gutter */}
        <div
          ref={gutterRef}
          aria-hidden="true"
          className="w-12 shrink-0 select-none overflow-hidden border-r border-slate-800/70 bg-[#0D1119] pt-4 pb-12 text-right font-mono text-[12px] leading-6 text-slate-500 tabular-nums"
        >
          {tokenizedLines.map((_, idx) => {
            const lineNum = idx + 1;
            const isHighlighted = highlightSet.has(lineNum);
            const isSuspect = suspectSet.has(lineNum);
            return (
              <button
                key={lineNum}
                type="button"
                tabIndex={-1}
                onClick={() => onSelectLine?.(lineNum)}
                className={`block w-full pr-3 text-right transition-colors cursor-pointer ${
                  isSuspect
                    ? 'bg-rose-500/15 text-rose-300 font-semibold'
                    : isHighlighted
                      ? 'bg-sky-500/15 text-sky-300 font-semibold'
                      : 'hover:text-slate-300'
                }`}
              >
                {lineNum}
              </button>
            );
          })}
        </div>

        {/* Code Viewport Container */}
        <div className="relative flex-1 overflow-hidden">
          {/* Syntax Highlighted Overlay */}
          <pre
            ref={preRef}
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 m-0 overflow-hidden whitespace-pre px-4 pt-4 pb-12 font-mono text-[13px] leading-6"
            style={{ tabSize: 4 }}
          >
            {tokenizedLines.map((tokens, idx) => {
              const lineNum = idx + 1;
              const isHighlighted = highlightSet.has(lineNum);
              const isSuspect = suspectSet.has(lineNum);
              return (
                <div
                  key={lineNum}
                  className={`min-h-[1.5rem] -mx-4 px-4 ${
                    isSuspect
                      ? 'bg-rose-500/12'
                      : isHighlighted
                        ? 'bg-sky-500/12'
                        : ''
                  }`}
                >
                  {tokens.length === 0
                    ? ' '
                    : tokens.map((tok, tokIdx) => (
                        <span key={tokIdx} className={getTokenColorClass(tok.kind)}>
                          {tok.value}
                        </span>
                      ))}
                </div>
              );
            })}
          </pre>

          {/* Transparent Editable Textarea */}
          <textarea
            ref={textareaRef}
            aria-label="C# Code Editor"
            value={code}
            onChange={(e) => onChangeCode(e.target.value)}
            onScroll={handleScroll}
            onKeyDown={handleKeyDown}
            spellCheck={false}
            autoCapitalize="off"
            autoComplete="off"
            autoCorrect="off"
            placeholder="// Paste or write your C# code here..."
            className="code-input relative z-10 h-full w-full resize-none overflow-auto whitespace-pre bg-transparent p-4 font-mono text-[13px] leading-6 text-transparent caret-sky-400 selection:bg-sky-500/30 focus:outline-none placeholder:text-slate-600"
            style={{ tabSize: 4 }}
          />
        </div>
      </div>

      {/* Quiet Footer Metadata */}
      <div className="flex items-center justify-between border-t border-slate-800/80 bg-[#111622]/50 px-3.5 py-1.5 text-[11px] text-slate-500">
        <span className="tabular-nums">
          {tokenizedLines.length} lines · {code.length} chars
        </span>
        <span>Tab inserts 4 spaces · Click a line number to focus</span>
      </div>
    </section>
  );
}
