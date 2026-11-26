import { AlertCircle, ArrowRight, CheckCircle2, RefreshCw, RotateCcw, XCircle } from 'lucide-react';
import { useState } from 'react';
import type { CSharpTopic, Difficulty, QuizQuestion } from '../types/tutor';
import { CSHARP_TOPICS } from '../utils/learningProgress';
import { HighlightedCSharp } from './MarkdownRenderer';

interface QuizViewProps {
  questions: QuizQuestion[];
  difficulty: Difficulty;
  isGenerating: boolean;
  error: string | null;
  onGenerateQuiz: (topic: CSharpTopic) => void;
  onRecordQuizCompleted: (answered: number, correct: number, topics: string[]) => void;
}

export function QuizView({
  questions,
  difficulty,
  isGenerating,
  error,
  onGenerateQuiz,
  onRecordQuizCompleted,
}: QuizViewProps) {
  const [selectedTopic, setSelectedTopic] = useState<CSharpTopic>('Fundamentals & Types');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [score, setScore] = useState(0);
  const [finished, setFinished] = useState(false);

  const currentQuestion = questions[currentIndex];

  const handleResetQuiz = () => {
    setCurrentIndex(0);
    setSelectedOption(null);
    setSubmitted(false);
    setScore(0);
    setFinished(false);
  };

  // A different set of questions (a new AI quiz, or the starter quiz swapping
  // when the difficulty changes) always starts from question 1 with a clean
  // score, so answers from the previous quiz never carry over.
  // (State is adjusted during render so stale answers never flash on screen.)
  const [shownQuestions, setShownQuestions] = useState(questions);
  if (shownQuestions !== questions) {
    setShownQuestions(questions);
    handleResetQuiz();
  }

  const handleGenerate = () => {
    handleResetQuiz();
    onGenerateQuiz(selectedTopic);
  };

  const handleSubmitAnswer = () => {
    if (selectedOption === null || submitted || !currentQuestion) return;
    setSubmitted(true);
    if (selectedOption === currentQuestion.correctIndex) {
      setScore((s) => s + 1);
    }
  };

  const handleNext = () => {
    if (!currentQuestion || !submitted) return;
    if (currentIndex + 1 >= questions.length) {
      setFinished(true);
      const topics = Array.from(new Set(questions.map((q) => q.topic)));
      onRecordQuizCompleted(questions.length, score, topics);
    } else {
      setCurrentIndex((i) => i + 1);
      setSelectedOption(null);
      setSubmitted(false);
    }
  };

  return (
    <div className="flex h-full flex-col bg-[#0F131C]">
      {/* Toolbar */}
      <div className="flex min-h-[57px] flex-wrap sm:flex-nowrap items-center justify-between gap-2 border-b border-slate-800/80 px-5 py-2">
        <div className="min-w-0">
          <h1 className="font-display text-base font-semibold text-white truncate">C# Knowledge Quiz</h1>
          <p className="text-xs text-slate-400 truncate">
            Test C# syntax &amp; runtime idioms ·{' '}
            <span className="capitalize text-slate-300">{difficulty}</span>
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <label htmlFor="quiz-topic-select" className="sr-only">
            Select C# quiz topic
          </label>
          <select
            id="quiz-topic-select"
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
            <span>{isGenerating ? 'Generating...' : 'New AI Quiz'}</span>
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

        {isGenerating ? (
          <div className="rounded-lg border border-slate-800 bg-[#151B28] p-5 space-y-3 animate-pulse">
            <div className="h-4 w-2/3 rounded bg-slate-700/70" />
            <div className="h-20 w-full rounded bg-slate-800" />
            <div className="h-10 w-full rounded bg-slate-800" />
            <div className="h-10 w-full rounded bg-slate-800" />
          </div>
        ) : finished ? (
          <div className="rounded-lg border border-slate-800 bg-[#151B28] p-6 space-y-4">
            <div className="space-y-1">
              <p className="text-xs font-semibold text-sky-300">Quiz Complete</p>
              <h2 className="font-display text-2xl font-bold text-white tabular-nums">
                {score} / {questions.length} Correct (
                {questions.length > 0 ? Math.round((score / questions.length) * 100) : 0}%)
              </h2>
              <p className="text-sm text-slate-400">
                Your score has been added to your CSharpTutor learning progress.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <button
                type="button"
                onClick={handleResetQuiz}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-900 px-3.5 py-2 text-xs font-semibold text-slate-200 hover:text-white cursor-pointer"
              >
                <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Retake Quiz</span>
              </button>
              <button
                type="button"
                onClick={handleGenerate}
                className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-500 cursor-pointer"
              >
                <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Generate Fresh AI Quiz</span>
              </button>
            </div>
          </div>
        ) : currentQuestion ? (
          <div className="space-y-4">
            {/* Progress Row */}
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span className="font-mono tabular-nums">
                Question {currentIndex + 1} of {questions.length} · {currentQuestion.topic}
              </span>
              <span className="font-mono text-sky-300 tabular-nums">
                Score: {score}
              </span>
            </div>

            <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
              <div
                className="h-full bg-indigo-500 transition-all duration-200"
                style={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }}
              />
            </div>

            {/* Question Card */}
            <div className="rounded-lg border border-slate-800 bg-[#151B28] p-5 space-y-4">
              <h2 className="font-display text-base font-semibold leading-snug text-white">
                {currentQuestion.question}
              </h2>

              {currentQuestion.codeSnippet && (
                <div className="overflow-x-auto rounded-lg border border-slate-800 bg-[#0B0E14] p-3.5">
                  <HighlightedCSharp code={currentQuestion.codeSnippet} />
                </div>
              )}

              <div role="radiogroup" aria-label="Quiz answer choices" className="space-y-2">
                {currentQuestion.options.map((opt, idx) => {
                  const isSelected = selectedOption === idx;
                  const isCorrect = idx === currentQuestion.correctIndex;

                  let borderStyle = 'border-slate-800 bg-[#0B0E14] hover:border-slate-700';
                  if (submitted) {
                    if (isCorrect) {
                      borderStyle = 'border-emerald-500/60 bg-emerald-950/25';
                    } else if (isSelected && !isCorrect) {
                      borderStyle = 'border-rose-500/60 bg-rose-950/25';
                    }
                  } else if (isSelected) {
                    borderStyle = 'border-sky-400 bg-sky-950/25';
                  }

                  return (
                    <button
                      key={idx}
                      type="button"
                      role="radio"
                      aria-checked={isSelected}
                      disabled={submitted}
                      onClick={() => setSelectedOption(idx)}
                      className={`flex w-full items-center justify-between gap-3 rounded-lg border px-4 py-3 text-left text-sm transition-colors duration-150 cursor-pointer disabled:cursor-default ${borderStyle}`}
                    >
                      <span className="text-slate-100">
                        <span className="mr-2.5 font-mono text-xs text-slate-400">
                          {String.fromCharCode(65 + idx)}.{' '}
                        </span>
                        {opt}
                      </span>
                      {submitted && isCorrect && (
                        <CheckCircle2
                          className="h-4 w-4 text-emerald-400 shrink-0"
                          aria-hidden="true"
                        />
                      )}
                      {submitted && isSelected && !isCorrect && (
                        <XCircle className="h-4 w-4 text-rose-400 shrink-0" aria-hidden="true" />
                      )}
                    </button>
                  );
                })}
              </div>

              {submitted && (
                <div className="rounded-md border border-slate-800 bg-[#0B0E14] p-3.5 space-y-1">
                  <p className="text-xs font-semibold text-sky-300">
                    {selectedOption === currentQuestion.correctIndex
                      ? 'Correct!'
                      : 'Not quite — here is why:'}
                  </p>
                  <p className="text-xs leading-relaxed text-slate-300">
                    {currentQuestion.explanation}
                  </p>
                </div>
              )}

              <div className="flex justify-end pt-1">
                {!submitted ? (
                  <button
                    type="button"
                    disabled={selectedOption === null}
                    onClick={handleSubmitAnswer}
                    className="rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer"
                  >
                    Submit Answer
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleNext}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-indigo-500 cursor-pointer"
                  >
                    <span>
                      {currentIndex + 1 >= questions.length ? 'Finish Quiz' : 'Next Question'}
                    </span>
                    <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                  </button>
                )}
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
