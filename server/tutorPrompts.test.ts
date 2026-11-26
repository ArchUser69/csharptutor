import test from 'node:test';
import assert from 'node:assert/strict';
import { buildChatSystemInstruction, buildDifficultyGuidance } from './tutorPrompts';

test('system instruction enforces C#-only boundary and hints-first mode', () => {
  const hintsPrompt = buildChatSystemInstruction('beginner', true, 'Console.WriteLine("Hi");');
  assert.match(hintsPrompt, /EXCLUSIVELY to C#/i);
  assert.match(hintsPrompt, /HINTS-FIRST PEDAGOGY/i);
  assert.match(hintsPrompt, /Console\.WriteLine/);

  const directPrompt = buildChatSystemInstruction('advanced', false);
  assert.match(directPrompt, /Direct Explanation Mode/i);
  assert.match(directPrompt, /Span<T>/);
});

test('difficulty guidance distinguishes beginner, intermediate, and advanced', () => {
  assert.match(buildDifficultyGuidance('beginner'), /Beginner C# learner/);
  assert.match(buildDifficultyGuidance('intermediate'), /Intermediate C# developer/);
  assert.match(buildDifficultyGuidance('advanced'), /Advanced C# \/ \.NET engineer/);
});
