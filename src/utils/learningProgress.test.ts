import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateMasteryPercent,
  calculateQuizAccuracy,
  createInitialProgress,
  deriveSessionTitle,
  recordBugDebugged,
  recordCodeExplained,
  recordExerciseCompleted,
  recordMessageSent,
  recordQuizResult,
} from './learningProgress';

test('derives concise session title from first user message', () => {
  const title = deriveSessionTitle([
    { id: '1', role: 'assistant', content: 'Hi!', timestamp: 1 },
    {
      id: '2',
      role: 'user',
      content: '   How do C# records handle equality when nested lists are present?  ',
      timestamp: 2,
    },
  ]);
  assert.equal(title, 'How do C# records handle equality when nes...');
});

test('progress updates accumulate accurately without duplicates', () => {
  let progress = createInitialProgress();
  assert.equal(calculateQuizAccuracy(progress), null);
  assert.equal(calculateMasteryPercent(progress), 0);

  progress = recordMessageSent(progress);
  progress = recordCodeExplained(progress, ['LINQ', 'Records']);
  progress = recordBugDebugged(progress, 'NullReferenceException');
  progress = recordExerciseCompleted(progress, 'ex-1', 'LINQ');
  progress = recordExerciseCompleted(progress, 'ex-1', 'LINQ'); // duplicate ID ignored
  progress = recordQuizResult(progress, 4, 3, ['Async/Await']);

  assert.equal(progress.messagesSent, 1);
  assert.equal(progress.codeExplainedCount, 1);
  assert.equal(progress.bugsDebuggedCount, 1);
  assert.equal(progress.exercisesCompletedIds.length, 1);
  assert.equal(progress.quizzesCompleted, 1);
  assert.equal(calculateQuizAccuracy(progress), 75);
  assert.ok(progress.topicsExplored.includes('LINQ'));
  assert.ok(progress.topicsExplored.includes('NullReferenceException'));
  assert.ok(calculateMasteryPercent(progress) > 0);
});
