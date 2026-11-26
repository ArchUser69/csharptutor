import { Menu, Plus } from 'lucide-react';
import type { TutorMode } from '../types/tutor';

interface TopBarProps {
  activeMode: TutorMode;
  onSelectMode: (mode: TutorMode) => void;
  onNewSession: () => void;
  onToggleMobileSidebar: () => void;
}

const MODES: { id: TutorMode; label: string }[] = [
  { id: 'chat', label: 'Tutor Chat' },
  { id: 'explain', label: 'Line-by-Line' },
  { id: 'debug', label: 'Debug Code' },
  { id: 'practice', label: 'Practice' },
  { id: 'quiz', label: 'Quiz' },
];

export function TopBar({
  activeMode,
  onSelectMode,
  onNewSession,
  onToggleMobileSidebar,
}: TopBarProps) {
  return (
    <header className="flex h-14 shrink-0 items-center justify-between gap-4 border-b border-slate-800/90 bg-[#111622] px-4 lg:gap-8 lg:px-6">
      {/* Zone 1: Brand Wordmark */}
      <div className="flex items-center gap-3 shrink-0">
        <button
          type="button"
          onClick={onToggleMobileSidebar}
          aria-label="Toggle workspace sidebar"
          className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-slate-700/70 bg-slate-900/70 text-slate-300 hover:text-white lg:hidden cursor-pointer"
        >
          <Menu className="h-4 w-4" aria-hidden="true" />
        </button>
        <span className="font-display text-lg font-bold tracking-tight text-white whitespace-nowrap shrink-0">
          CSharpTutor
        </span>
      </div>

      {/* Zone 2: Concise single-line mode links */}
      <nav
        aria-label="Tutor modes"
        className="hidden md:flex h-full items-center gap-1 overflow-x-auto"
      >
        {MODES.map((mode) => {
          const isActive = activeMode === mode.id;
          return (
            <button
              key={mode.id}
              type="button"
              onClick={() => onSelectMode(mode.id)}
              aria-current={isActive ? 'page' : undefined}
              className={`relative flex h-full items-center px-3 text-sm font-medium transition-colors duration-150 whitespace-nowrap shrink-0 cursor-pointer ${
                isActive
                  ? 'text-white'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {mode.label}
              {isActive && (
                <span
                  aria-hidden="true"
                  className="absolute inset-x-2 bottom-0 h-[2px] bg-sky-400"
                />
              )}
            </button>
          );
        })}
      </nav>

      {/* Zone 3: Primary Action */}
      <div className="flex items-center shrink-0">
        <button
          type="button"
          onClick={onNewSession}
          className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3.5 py-1.5 text-xs font-semibold text-white transition-colors duration-150 hover:bg-indigo-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-400 whitespace-nowrap shrink-0 cursor-pointer"
        >
          <Plus className="h-3.5 w-3.5" aria-hidden="true" />
          <span>New Session</span>
        </button>
      </div>
    </header>
  );
}
