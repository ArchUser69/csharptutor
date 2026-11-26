import { Lightbulb, MessageSquare, Trash2, X } from 'lucide-react';
import type { ChatSession, Difficulty, LearningProgress, TutorMode } from '../types/tutor';
import { calculateMasteryPercent, calculateQuizAccuracy } from '../utils/learningProgress';

interface SidebarProps {
  difficulty: Difficulty;
  onChangeDifficulty: (level: Difficulty) => void;
  hintsFirst: boolean;
  onToggleHintsFirst: () => void;
  sessions: ChatSession[];
  activeSessionId: string;
  onSelectSession: (id: string) => void;
  onDeleteSession: (id: string) => void;
  progress: LearningProgress;
  activeMode: TutorMode;
  onSelectMode: (mode: TutorMode) => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

const DIFFICULTIES: { id: Difficulty; label: string }[] = [
  { id: 'beginner', label: 'Beginner' },
  { id: 'intermediate', label: 'Intermediate' },
  { id: 'advanced', label: 'Advanced' },
];

const MODES: { id: TutorMode; label: string }[] = [
  { id: 'chat', label: 'Tutor Chat' },
  { id: 'explain', label: 'Line-by-Line' },
  { id: 'debug', label: 'Debug Code' },
  { id: 'practice', label: 'Practice' },
  { id: 'quiz', label: 'Quiz' },
];

// Shows the time for sessions updated today and the date for older ones.
function formatRelativeDate(timestamp: number): string {
  const date = new Date(timestamp);
  const isToday = date.toDateString() === new Date().toDateString();
  return isToday
    ? date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : date.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

export function Sidebar({
  difficulty,
  onChangeDifficulty,
  hintsFirst,
  onToggleHintsFirst,
  sessions,
  activeSessionId,
  onSelectSession,
  onDeleteSession,
  progress,
  activeMode,
  onSelectMode,
  mobileOpen,
  onCloseMobile,
}: SidebarProps) {
  const mastery = calculateMasteryPercent(progress);
  const accuracy = calculateQuizAccuracy(progress);

  const sidebarBody = (
    <aside className="flex h-full w-[268px] flex-col border-r border-slate-800/90 bg-[#111622] text-slate-200">
      {/* Mobile Header + Mode Switcher */}
      <div className="flex items-center justify-between border-b border-slate-800/80 px-4 py-3 lg:hidden">
        <span className="font-display text-sm font-semibold text-white">Workspace Controls</span>
        <button
          type="button"
          onClick={onCloseMobile}
          aria-label="Close workspace sidebar"
          className="rounded-md p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white cursor-pointer"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-6">
        {/* Mobile Mode Navigation */}
        <section className="md:hidden space-y-2">
          <h2 className="text-xs font-semibold text-slate-400">Learning Mode</h2>
          <div className="grid grid-cols-2 gap-1.5">
            {MODES.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => {
                  onSelectMode(m.id);
                  onCloseMobile();
                }}
                className={`rounded-md px-2.5 py-2 text-xs font-medium text-left transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  activeMode === m.id
                    ? 'bg-indigo-600 text-white'
                    : 'bg-slate-900/70 text-slate-300 hover:bg-slate-800'
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>
        </section>

        {/* Difficulty Selection */}
        <section className="space-y-2">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-semibold text-slate-400">Difficulty Level</h2>
            <span className="text-xs text-slate-500 capitalize">{difficulty}</span>
          </div>
          <div
            role="group"
            aria-label="C# difficulty level"
            className="grid grid-cols-3 gap-1 rounded-lg border border-slate-800 bg-[#0B0E14] p-1"
          >
            {DIFFICULTIES.map((d) => {
              const selected = difficulty === d.id;
              return (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => onChangeDifficulty(d.id)}
                  aria-pressed={selected}
                  className={`rounded-md px-2 py-1.5 text-xs font-medium transition-colors duration-150 whitespace-nowrap shrink-0 cursor-pointer ${
                    selected
                      ? 'bg-slate-800 text-white shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {d.label === 'Intermediate' ? 'Interm.' : d.label}
                </button>
              );
            })}
          </div>
        </section>

        {/* Hints-First Teaching Approach */}
        <section className="space-y-2 border-t border-slate-800/80 pt-4">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-0.5">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-200">
                <Lightbulb className="h-3.5 w-3.5 text-amber-400 shrink-0" aria-hidden="true" />
                <span>Hints-First Mode</span>
              </div>
              <p className="text-xs leading-relaxed text-slate-400">
                Guides with hints before showing full solutions.
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={hintsFirst}
              aria-label="Toggle Hints-First teaching approach"
              onClick={onToggleHintsFirst}
              className={`relative mt-0.5 inline-flex h-5 w-9 shrink-0 items-center rounded-full border transition-colors duration-150 cursor-pointer ${
                hintsFirst
                  ? 'border-indigo-500 bg-indigo-600'
                  : 'border-slate-700 bg-slate-800'
              }`}
            >
              <span
                className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform duration-150 ${
                  hintsFirst ? 'translate-x-4' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </section>

        {/* Learning Progress */}
        <section className="space-y-3 border-t border-slate-800/80 pt-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-semibold text-slate-400">Learning Progress</h2>
            <span className="font-mono text-xs font-medium text-sky-300 tabular-nums">
              {mastery}%
            </span>
          </div>

          <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
            <div
              className="h-full bg-sky-400 transition-all duration-300"
              style={{ width: `${mastery}%` }}
            />
          </div>

          <dl className="grid grid-cols-2 gap-x-3 gap-y-2 text-xs">
            <div className="flex items-center justify-between border-b border-slate-800/60 pb-1.5">
              <dt className="text-slate-400">Explained</dt>
              <dd className="font-mono font-medium text-slate-200 tabular-nums">
                {progress.codeExplainedCount}
              </dd>
            </div>
            <div className="flex items-center justify-between border-b border-slate-800/60 pb-1.5">
              <dt className="text-slate-400">Debugged</dt>
              <dd className="font-mono font-medium text-slate-200 tabular-nums">
                {progress.bugsDebuggedCount}
              </dd>
            </div>
            <div className="flex items-center justify-between border-b border-slate-800/60 pb-1.5">
              <dt className="text-slate-400">Exercises</dt>
              <dd className="font-mono font-medium text-slate-200 tabular-nums">
                {progress.exercisesCompletedIds.length}
              </dd>
            </div>
            <div className="flex items-center justify-between border-b border-slate-800/60 pb-1.5">
              <dt className="text-slate-400">Quiz Acc.</dt>
              <dd className="font-mono font-medium text-slate-200 tabular-nums">
                {accuracy !== null ? `${accuracy}%` : '—'}
              </dd>
            </div>
          </dl>

          {progress.topicsExplored.length > 0 && (
            <p className="text-xs leading-relaxed text-slate-400">
              <span className="text-slate-500">Topics: </span>
              {progress.topicsExplored.slice(0, 5).join(' · ')}
            </p>
          )}
        </section>

        {/* Chat History */}
        <section className="space-y-2 border-t border-slate-800/80 pt-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-semibold text-slate-400">Chat History</h2>
            <span className="font-mono text-xs text-slate-500 tabular-nums">
              {sessions.length}
            </span>
          </div>

          <ul className="space-y-1">
            {sessions.map((session) => {
              const isActive = session.id === activeSessionId;
              return (
                <li
                  key={session.id}
                  className={`group flex items-center justify-between gap-1 rounded-md border transition-colors ${
                    isActive
                      ? 'border-slate-700/80 bg-[#151B28] text-white'
                      : 'border-transparent text-slate-300 hover:bg-slate-800/50'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => {
                      onSelectSession(session.id);
                      onSelectMode('chat');
                      onCloseMobile();
                    }}
                    className="flex min-w-0 flex-1 items-start gap-2 px-2.5 py-2 text-left cursor-pointer"
                  >
                    <MessageSquare
                      className={`mt-0.5 h-3.5 w-3.5 shrink-0 ${
                        isActive ? 'text-sky-400' : 'text-slate-500'
                      }`}
                      aria-hidden="true"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-xs font-medium">{session.title}</div>
                      <div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-slate-500">
                        <span className="capitalize">{session.difficulty}</span>
                        <span aria-hidden="true">·</span>
                        <span className="tabular-nums">{session.messages.length} msgs</span>
                        <span aria-hidden="true">·</span>
                        <span className="tabular-nums">{formatRelativeDate(session.updatedAt)}</span>
                      </div>
                    </div>
                  </button>
                  {sessions.length > 1 && (
                    <button
                      type="button"
                      onClick={() => onDeleteSession(session.id)}
                      aria-label={`Delete session ${session.title}`}
                      className="mr-1.5 rounded p-1 text-slate-500 opacity-70 transition-opacity hover:bg-slate-800 hover:text-rose-400 group-hover:opacity-100 cursor-pointer"
                    >
                      <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      </div>
    </aside>
  );

  return (
    <>
      {/* Desktop persistent sidebar */}
      <div className="hidden lg:block h-full shrink-0">{sidebarBody}</div>

      {/* Mobile slide-over drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs"
            onClick={onCloseMobile}
            aria-hidden="true"
          />
          <div className="relative z-10 h-full">{sidebarBody}</div>
        </div>
      )}
    </>
  );
}
