import { AlertCircle, ArrowUp, Lightbulb, Sparkles } from 'lucide-react';
import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import type { ChatMessage, Difficulty } from '../types/tutor';
import { STARTER_PROMPTS } from '../utils/learningProgress';
import { MarkdownRenderer } from './MarkdownRenderer';

interface TutorChatViewProps {
  messages: ChatMessage[];
  difficulty: Difficulty;
  hintsFirst: boolean;
  /** True while any reply is in flight: blocks sending another message. */
  isLoading: boolean;
  /** True when the reply in flight belongs to the session shown here. */
  isAwaitingReply: boolean;
  error: string | null;
  onSendMessage: (message: string) => void;
  onLoadCodeInEditor: (code: string) => void;
  onClearError: () => void;
}

export function TutorChatView({
  messages,
  difficulty,
  hintsFirst,
  isLoading,
  isAwaitingReply,
  error,
  onSendMessage,
  onLoadCodeInEditor,
  onClearError,
}: TutorChatViewProps) {
  const [input, setInput] = useState('');
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length, isAwaitingReply]);

  const handleSubmit = (e?: FormEvent) => {
    e?.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || isLoading) return;
    setInput('');
    onSendMessage(trimmed);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const starters = STARTER_PROMPTS[difficulty];

  return (
    <div className="flex h-full flex-col bg-[#0F131C]">
      {/* Sub-header context strip */}
      <div className="flex min-h-[57px] items-center justify-between border-b border-slate-800/80 px-5 py-2">
        <div>
          <h1 className="font-display text-base font-semibold text-white">C# Tutor Chat</h1>
          <p className="text-xs text-slate-400">
            Dedicated C# &amp; .NET mentor ·{' '}
            <span className="capitalize text-slate-300">{difficulty}</span> ·{' '}
            <span>{hintsFirst ? 'Hints-First active' : 'Direct solutions'}</span>
          </p>
        </div>
      </div>

      {/* Scrollable Message Stream */}
      <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5">
        {messages.length === 0 ? (
          <div className="mx-auto max-w-2xl space-y-6 py-6">
            <div className="space-y-2">
              <h2 className="font-display text-xl font-semibold tracking-tight text-white">
                Ask anything about C# and .NET
              </h2>
              <p className="text-sm leading-relaxed text-slate-400">
                Explore types, LINQ, async/await, OOP, or paste C# code in the editor to discuss it
                together. Non-C# topics stay out of scope so every session stays focused.
              </p>
            </div>

            <div className="space-y-2">
              <p className="text-xs font-semibold text-slate-400">
                Suggested {difficulty} prompts
              </p>
              <div className="grid gap-2 sm:grid-cols-2">
                {starters.map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    onClick={() => onSendMessage(prompt)}
                    disabled={isLoading}
                    className="rounded-lg border border-slate-800 bg-[#151B28] p-3.5 text-left text-xs leading-relaxed text-slate-300 transition-colors duration-150 hover:border-sky-500/40 hover:bg-[#192030] hover:text-white disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-5">
            {messages.map((msg) => {
              const isUser = msg.role === 'user';
              return (
                <article
                  key={msg.id}
                  className={`rounded-lg border px-4 py-3.5 ${
                    isUser
                      ? 'ml-6 border-indigo-500/25 bg-indigo-950/25'
                      : 'border-slate-800/90 bg-[#151B28]'
                  }`}
                >
                  <div className="mb-2 flex items-center justify-between text-xs text-slate-400">
                    <span className="font-semibold text-slate-200">
                      {isUser ? 'You' : 'CSharpTutor'}
                    </span>
                    <span className="font-mono text-[11px] text-slate-500 tabular-nums">
                      {new Date(msg.timestamp).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                  {isUser ? (
                    <p className="whitespace-pre-wrap text-[14.5px] leading-relaxed text-slate-100">
                      {msg.content}
                    </p>
                  ) : (
                    <MarkdownRenderer
                      content={msg.content}
                      onLoadInEditor={onLoadCodeInEditor}
                    />
                  )}
                </article>
              );
            })}

            {isAwaitingReply && (
              <div
                role="status"
                aria-label="CSharpTutor is thinking"
                className="rounded-lg border border-slate-800/90 bg-[#151B28] px-4 py-3.5 space-y-2.5 animate-pulse"
              >
                <div className="h-3 w-24 rounded bg-slate-700/70" />
                <div className="h-3 w-11/12 rounded bg-slate-800" />
                <div className="h-3 w-4/5 rounded bg-slate-800" />
              </div>
            )}
            <div ref={bottomRef} />
          </div>
        )}
      </div>

      {/* Error Banner */}
      {error && (
        <div
          role="alert"
          className="mx-5 mb-3 flex items-start justify-between gap-3 rounded-lg border border-rose-500/40 bg-rose-950/30 px-3.5 py-2.5 text-xs text-rose-200"
        >
          <div className="flex items-start gap-2">
            <AlertCircle className="mt-0.5 h-4 w-4 text-rose-400 shrink-0" aria-hidden="true" />
            <span>{error}</span>
          </div>
          <button
            type="button"
            onClick={onClearError}
            className="text-xs font-medium text-rose-300 underline hover:text-white shrink-0 cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Composer */}
      <form
        onSubmit={handleSubmit}
        className="border-t border-slate-800/90 bg-[#111622]/70 px-5 py-3.5"
      >
        {messages.length > 0 && hintsFirst && (
          <div className="mb-2.5 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => onSendMessage('Give me a subtle hint for my current code without showing the full answer.')}
              disabled={isLoading}
              className="inline-flex items-center gap-1.5 rounded-md border border-slate-700/80 bg-slate-900/70 px-2.5 py-1 text-xs font-medium text-amber-300 transition-colors hover:border-amber-500/40 hover:bg-slate-800 disabled:opacity-50 whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Lightbulb className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Ask for a Hint</span>
            </button>
            <button
              type="button"
              onClick={() => onSendMessage('I am ready—please reveal the full C# solution and explain why it works.')}
              disabled={isLoading}
              className="inline-flex items-center gap-1.5 rounded-md border border-slate-700/80 bg-slate-900/70 px-2.5 py-1 text-xs font-medium text-sky-300 transition-colors hover:border-sky-500/40 hover:bg-slate-800 disabled:opacity-50 whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Reveal Solution</span>
            </button>
          </div>
        )}

        <div className="flex items-end gap-2.5 rounded-lg border border-slate-700/80 bg-[#0B0E14] p-2 focus-within:border-sky-400/70">
          <label htmlFor="tutor-chat-input" className="sr-only">
            Ask a C# programming question
          </label>
          <textarea
            id="tutor-chat-input"
            rows={2}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            maxLength={8000}
            placeholder="Ask a C# question, paste a compiler error, or ask about the code in your editor..."
            className="flex-1 resize-none bg-transparent px-2 py-1 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none"
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            aria-label="Send C# question"
            className="inline-flex h-9 items-center gap-1.5 rounded-md bg-indigo-600 px-3.5 text-xs font-semibold text-white transition-colors hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-40 whitespace-nowrap shrink-0 cursor-pointer"
          >
            <span>Send</span>
            <ArrowUp className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        </div>
      </form>
    </div>
  );
}
