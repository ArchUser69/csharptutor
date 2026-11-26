import { Code2, PanelRight } from 'lucide-react';
import { useEffect, useState } from 'react';
import { CodeEditorPane } from './components/CodeEditorPane';
import { DebugView } from './components/DebugView';
import { LineByLineView } from './components/LineByLineView';
import { PracticeView } from './components/PracticeView';
import { QuizView } from './components/QuizView';
import { Sidebar } from './components/Sidebar';
import { TopBar } from './components/TopBar';
import { TutorChatView } from './components/TutorChatView';
import type {
  ChatMessage,
  ChatSession,
  CSharpTopic,
  DebugAnalysis,
  Difficulty,
  ExplainCodeResult,
  LearningProgress,
  PracticeEvaluation,
  PracticeExercise,
  QuizQuestion,
  TutorMode,
} from './types/tutor';
import {
  CODE_PRESETS,
  createSession,
  deriveSessionTitle,
  recordBugDebugged,
  recordCodeExplained,
  recordExerciseCompleted,
  recordMessageSent,
  recordQuizResult,
  STARTER_EXERCISES,
  STARTER_QUIZZES,
} from './utils/learningProgress';
import {
  loadBoolean,
  loadDifficulty,
  loadProgress,
  loadSessions,
  loadString,
  saveJson,
  STORAGE_KEYS,
} from './utils/storage';
import {
  checkPracticeSolution,
  debugCSharpCode,
  explainCSharpCode,
  generatePracticeExercise,
  generateQuizQuestions,
  sendTutorChat,
} from './utils/tutorApi';

function lineRange(start: number, end: number): number[] {
  const safeStart = Math.max(1, Math.floor(start) || 1);
  // Cap the span so a bad range can never build a huge array
  const safeEnd = Math.min(Math.max(safeStart, Math.floor(end) || safeStart), safeStart + 2000);
  const range: number[] = [];
  for (let i = safeStart; i <= safeEnd; i++) range.push(i);
  return range;
}

export default function App() {
  const [difficulty, setDifficulty] = useState<Difficulty>(loadDifficulty);
  const [hintsFirst, setHintsFirst] = useState<boolean>(() =>
    loadBoolean(STORAGE_KEYS.hintsFirst, true)
  );
  const [sessions, setSessions] = useState<ChatSession[]>(() => {
    const saved = loadSessions();
    return saved.length > 0 ? saved : [createSession(difficulty)];
  });
  const [activeSessionId, setActiveSessionId] = useState<string>(() =>
    loadString(STORAGE_KEYS.activeSessionId, '')
  );
  const [progress, setProgress] = useState<LearningProgress>(loadProgress);
  const [editorCode, setEditorCode] = useState<string>(() =>
    loadString(STORAGE_KEYS.editorCode, CODE_PRESETS[0].code)
  );

  const [activeMode, setActiveMode] = useState<TutorMode>('chat');
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [mobilePane, setMobilePane] = useState<'tutor' | 'editor'>('tutor');

  // Highlighted / suspect lines in Code Editor
  const [highlightedLines, setHighlightedLines] = useState<number[]>([]);
  const [suspectLines, setSuspectLines] = useState<number[]>([]);

  // Mode states
  // Id of the session that is waiting on a tutor reply (null when idle)
  const [chatPendingSessionId, setChatPendingSessionId] = useState<string | null>(null);
  const [chatError, setChatError] = useState<string | null>(null);

  const [explainResult, setExplainResult] = useState<ExplainCodeResult | null>(null);
  const [explainLoading, setExplainLoading] = useState(false);
  const [explainError, setExplainError] = useState<string | null>(null);

  const [debugResult, setDebugResult] = useState<DebugAnalysis | null>(null);
  const [debugLoading, setDebugLoading] = useState(false);
  const [debugError, setDebugError] = useState<string | null>(null);
  // Optional compiler/exception text typed in the Debug view. Kept here so the
  // editor toolbar's Debug button sends it too.
  const [debugErrorMessage, setDebugErrorMessage] = useState('');

  const [practiceExercise, setPracticeExercise] = useState<PracticeExercise>(
    () => STARTER_EXERCISES[difficulty]
  );
  const [practiceEval, setPracticeEval] = useState<PracticeEvaluation | null>(null);
  const [practiceGenerating, setPracticeGenerating] = useState(false);
  const [practiceChecking, setPracticeChecking] = useState(false);
  const [practiceError, setPracticeError] = useState<string | null>(null);

  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>(
    () => STARTER_QUIZZES[difficulty]
  );
  const [quizGenerating, setQuizGenerating] = useState(false);
  const [quizError, setQuizError] = useState<string | null>(null);

  // Ensure activeSessionId always resolves to an existing session
  const activeSession =
    sessions.find((s) => s.id === activeSessionId) ?? sessions[0];

  // Persist core user workspace state. Each value saves on its own so typing
  // in the editor does not re-serialize every chat session on each keystroke.
  useEffect(() => saveJson(STORAGE_KEYS.sessions, sessions), [sessions]);
  useEffect(() => saveJson(STORAGE_KEYS.activeSessionId, activeSession.id), [activeSession.id]);
  useEffect(() => saveJson(STORAGE_KEYS.difficulty, difficulty), [difficulty]);
  useEffect(() => saveJson(STORAGE_KEYS.hintsFirst, hintsFirst), [hintsFirst]);
  useEffect(() => saveJson(STORAGE_KEYS.progress, progress), [progress]);
  useEffect(() => saveJson(STORAGE_KEYS.editorCode, editorCode), [editorCode]);

  const handleChangeDifficulty = (nextLevel: Difficulty) => {
    if (nextLevel === difficulty) return;
    setDifficulty(nextLevel);
    setSessions((prev) =>
      prev.map((s) => (s.id === activeSession.id ? { ...s, difficulty: nextLevel } : s))
    );
    if (practiceExercise.isStarter) {
      const nextEx = STARTER_EXERCISES[nextLevel];
      setPracticeExercise(nextEx);
      setPracticeEval(null);
      // Only swap the editor contents if the learner has not started typing,
      // so changing difficulty never throws away their work.
      const editorIsUntouched =
        !editorCode.trim() || editorCode === practiceExercise.starterCode;
      if (activeMode === 'practice' && editorIsUntouched) {
        setEditorCode(nextEx.starterCode);
        setHighlightedLines([]);
        setSuspectLines([]);
      }
    }
    if (quizQuestions.every((q) => q.id.startsWith('q-'))) {
      setQuizQuestions(STARTER_QUIZZES[nextLevel]);
    }
  };

  const handleSelectMode = (mode: TutorMode) => {
    setActiveMode(mode);
    setMobilePane('tutor');
    if (mode === 'practice') {
      const isCurrentlyShowingPreset = CODE_PRESETS.some((p) => p.code === editorCode);
      if (isCurrentlyShowingPreset || !editorCode.trim()) {
        setEditorCode(practiceExercise.starterCode);
        setHighlightedLines([]);
        setSuspectLines([]);
      }
    }
  };

  const handleNewSession = () => {
    const fresh = createSession(difficulty);
    setSessions((prev) => [fresh, ...prev]);
    setActiveSessionId(fresh.id);
    setActiveMode('chat');
    setChatError(null);
  };

  const handleDeleteSession = (id: string) => {
    // If the active session is removed, `activeSession` falls back to the
    // first remaining one automatically, so no id bookkeeping is needed here.
    setSessions((prev) => {
      const remaining = prev.filter((s) => s.id !== id);
      return remaining.length > 0 ? remaining : [createSession(difficulty)];
    });
  };

  const handleSendChatMessage = async (text: string) => {
    if (chatPendingSessionId !== null) return;
    const targetSessionId = activeSession.id;
    const userMsg: ChatMessage = {
      id: `msg-${Date.now()}-u`,
      role: 'user',
      content: text,
      timestamp: Date.now(),
      hintsFirstUsed: hintsFirst,
    };

    const updatedHistory = [...activeSession.messages, userMsg];

    setSessions((prev) =>
      prev.map((s) =>
        s.id === targetSessionId
          ? {
              ...s,
              title: deriveSessionTitle(updatedHistory, s.title),
              updatedAt: Date.now(),
              messages: updatedHistory,
            }
          : s
      )
    );
    setProgress((p) => recordMessageSent(p));
    setChatPendingSessionId(targetSessionId);
    setChatError(null);

    try {
      const { reply } = await sendTutorChat({
        message: text,
        history: activeSession.messages,
        difficulty,
        hintsFirst,
        editorCode,
      });

      const assistantMsg: ChatMessage = {
        id: `msg-${Date.now()}-a`,
        role: 'assistant',
        content: reply,
        timestamp: Date.now(),
        hintsFirstUsed: hintsFirst,
      };

      setSessions((prev) =>
        prev.map((s) =>
          s.id === targetSessionId
            ? {
                ...s,
                updatedAt: Date.now(),
                messages: [...s.messages, assistantMsg],
              }
            : s
        )
      );
    } catch (err) {
      setChatError(err instanceof Error ? err.message : 'Failed to contact CSharpTutor.');
    } finally {
      setChatPendingSessionId(null);
    }
  };

  const handleExplainCode = async () => {
    setActiveMode('explain');
    setMobilePane('tutor');
    if (explainLoading) return;
    setExplainLoading(true);
    setExplainError(null);
    setSuspectLines([]);

    try {
      const result = await explainCSharpCode({ code: editorCode, difficulty });
      setExplainResult(result);
      if (result.lines.length > 0) {
        const first = result.lines[0];
        setHighlightedLines(lineRange(first.lineStart, first.lineEnd));
      } else {
        setHighlightedLines([]);
      }
      setProgress((p) => recordCodeExplained(p, result.concepts));
    } catch (err) {
      setExplainError(err instanceof Error ? err.message : 'Failed to analyze C# code.');
    } finally {
      setExplainLoading(false);
    }
  };

  const handleDebugCode = async () => {
    setActiveMode('debug');
    setMobilePane('tutor');
    if (debugLoading) return;
    setDebugLoading(true);
    setDebugError(null);
    setHighlightedLines([]);

    try {
      const result = await debugCSharpCode({
        code: editorCode,
        difficulty,
        errorMessage: debugErrorMessage.trim() || undefined,
      });
      setDebugResult(result);
      setSuspectLines(result.suspectLines || []);
      setProgress((p) => recordBugDebugged(p, result.bugType));
    } catch (err) {
      setDebugError(err instanceof Error ? err.message : 'Failed to debug C# code.');
    } finally {
      setDebugLoading(false);
    }
  };

  const handleGenerateExercise = async (topic: CSharpTopic) => {
    setPracticeGenerating(true);
    setPracticeError(null);
    setPracticeEval(null);

    try {
      const generated = await generatePracticeExercise({ difficulty, topic });
      setPracticeExercise(generated);
      setEditorCode(generated.starterCode);
      setHighlightedLines([]);
      setSuspectLines([]);
    } catch (err) {
      setPracticeError(err instanceof Error ? err.message : 'Failed to generate C# exercise.');
    } finally {
      setPracticeGenerating(false);
    }
  };

  const handleCheckPractice = async () => {
    setPracticeChecking(true);
    setPracticeError(null);

    try {
      const result = await checkPracticeSolution({
        exercise: practiceExercise,
        userCode: editorCode,
        difficulty,
        hintsFirst,
      });
      setPracticeEval(result);
      if (result.passed) {
        setProgress((p) =>
          recordExerciseCompleted(p, practiceExercise.id, practiceExercise.topic)
        );
      }
    } catch (err) {
      setPracticeError(err instanceof Error ? err.message : 'Failed to evaluate your solution.');
    } finally {
      setPracticeChecking(false);
    }
  };

  const handleGenerateQuiz = async (topic: CSharpTopic) => {
    setQuizGenerating(true);
    setQuizError(null);

    try {
      const { questions } = await generateQuizQuestions({ difficulty, topic });
      if (questions.length > 0) {
        setQuizQuestions(questions);
      } else {
        setQuizError('No quiz questions came back. Please try again.');
      }
    } catch (err) {
      setQuizError(err instanceof Error ? err.message : 'Failed to generate C# quiz.');
    } finally {
      setQuizGenerating(false);
    }
  };

  const handleLoadCodeInEditor = (code: string) => {
    setEditorCode(code);
    setHighlightedLines([]);
    setSuspectLines([]);
  };

  return (
    <div className="flex h-screen w-full flex-col overflow-hidden bg-[#0B0E14] text-[#E6EDF3]">
      <TopBar
        activeMode={activeMode}
        onSelectMode={handleSelectMode}
        onNewSession={handleNewSession}
        onToggleMobileSidebar={() => setMobileSidebarOpen((v) => !v)}
      />

      {/* Mobile Pane Switcher (< md) */}
      <div className="flex border-b border-slate-800 bg-[#111622] px-3 py-1.5 md:hidden">
        <div className="grid w-full grid-cols-2 gap-1 rounded-md bg-[#0B0E14] p-1">
          <button
            type="button"
            onClick={() => setMobilePane('tutor')}
            className={`inline-flex items-center justify-center gap-1.5 rounded px-3 py-1.5 text-xs font-medium cursor-pointer ${
              mobilePane === 'tutor' ? 'bg-slate-800 text-white' : 'text-slate-400'
            }`}
          >
            <PanelRight className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Tutor Workspace</span>
          </button>
          <button
            type="button"
            onClick={() => setMobilePane('editor')}
            className={`inline-flex items-center justify-center gap-1.5 rounded px-3 py-1.5 text-xs font-medium cursor-pointer ${
              mobilePane === 'editor' ? 'bg-slate-800 text-white' : 'text-slate-400'
            }`}
          >
            <Code2 className="h-3.5 w-3.5" aria-hidden="true" />
            <span>C# Editor</span>
          </button>
        </div>
      </div>

      {/* Main Workspace: Sidebar + Code Editor + Active Tutor View */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        <Sidebar
          difficulty={difficulty}
          onChangeDifficulty={handleChangeDifficulty}
          hintsFirst={hintsFirst}
          onToggleHintsFirst={() => setHintsFirst((h) => !h)}
          sessions={sessions}
          activeSessionId={activeSession.id}
          onSelectSession={(id) => setActiveSessionId(id)}
          onDeleteSession={handleDeleteSession}
          progress={progress}
          activeMode={activeMode}
          onSelectMode={handleSelectMode}
          mobileOpen={mobileSidebarOpen}
          onCloseMobile={() => setMobileSidebarOpen(false)}
        />

        <main className="grid flex-1 min-w-0 min-h-0 grid-cols-1 md:grid-cols-12">
          {/* Code Editor Pane */}
          <div
            className={`min-h-0 md:col-span-5 xl:col-span-6 ${
              mobilePane === 'editor' ? 'flex flex-col h-full' : 'hidden md:flex md:flex-col md:h-full'
            }`}
          >
            <CodeEditorPane
              code={editorCode}
              onChangeCode={setEditorCode}
              highlightedLines={highlightedLines}
              suspectLines={suspectLines}
              onSelectLine={(line) => setHighlightedLines([line])}
              onTriggerExplain={handleExplainCode}
              onTriggerDebug={handleDebugCode}
              isExplaining={explainLoading}
              isDebugging={debugLoading}
            />
          </div>

          {/* Contextual Tutor Pane */}
          <div
            className={`min-h-0 md:col-span-7 xl:col-span-6 ${
              mobilePane === 'tutor' ? 'flex flex-col h-full' : 'hidden md:flex md:flex-col md:h-full'
            }`}
          >
            {activeMode === 'chat' && (
              <TutorChatView
                messages={activeSession.messages}
                difficulty={difficulty}
                hintsFirst={hintsFirst}
                isLoading={chatPendingSessionId !== null}
                isAwaitingReply={chatPendingSessionId === activeSession.id}
                error={chatError}
                onSendMessage={handleSendChatMessage}
                onLoadCodeInEditor={handleLoadCodeInEditor}
                onClearError={() => setChatError(null)}
              />
            )}

            {activeMode === 'explain' && (
              <LineByLineView
                result={explainResult}
                difficulty={difficulty}
                isLoading={explainLoading}
                error={explainError}
                activeLines={highlightedLines}
                onHoverLines={(lines) => {
                  // The explanation highlight replaces any debug highlight
                  setSuspectLines([]);
                  setHighlightedLines(lines);
                }}
                onExplainCode={handleExplainCode}
              />
            )}

            {activeMode === 'debug' && (
              <DebugView
                analysis={debugResult}
                difficulty={difficulty}
                hintsFirst={hintsFirst}
                isLoading={debugLoading}
                error={debugError}
                errorMessage={debugErrorMessage}
                onChangeErrorMessage={setDebugErrorMessage}
                onRunDebug={handleDebugCode}
                onApplyFixToEditor={handleLoadCodeInEditor}
                onFocusLines={(lines) => setSuspectLines(lines)}
              />
            )}

            {activeMode === 'practice' && (
              <PracticeView
                exercise={practiceExercise}
                difficulty={difficulty}
                hintsFirst={hintsFirst}
                editorCode={editorCode}
                evaluation={practiceEval}
                completedIds={progress.exercisesCompletedIds}
                isGenerating={practiceGenerating}
                isChecking={practiceChecking}
                error={practiceError}
                onGenerateExercise={handleGenerateExercise}
                onCheckCode={handleCheckPractice}
                onLoadCodeInEditor={handleLoadCodeInEditor}
              />
            )}

            {activeMode === 'quiz' && (
              <QuizView
                questions={quizQuestions}
                difficulty={difficulty}
                isGenerating={quizGenerating}
                error={quizError}
                onGenerateQuiz={handleGenerateQuiz}
                onRecordQuizCompleted={(answered, correct, topics) =>
                  setProgress((p) => recordQuizResult(p, answered, correct, topics))
                }
              />
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
