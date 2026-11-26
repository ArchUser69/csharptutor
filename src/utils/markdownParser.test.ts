import test from 'node:test';
import assert from 'node:assert/strict';
import { parseInlineMarkdown, parseMarkdown } from './markdownParser';

test('parses inline bold, italic, and inline code safely', () => {
  const nodes = parseInlineMarkdown('Use `var` with **LINQ** and *deferred* execution.');
  assert.deepEqual(nodes, [
    { type: 'text', value: 'Use ' },
    { type: 'code', value: 'var' },
    { type: 'text', value: ' with ' },
    { type: 'bold', value: 'LINQ' },
    { type: 'text', value: ' and ' },
    { type: 'italic', value: 'deferred' },
    { type: 'text', value: ' execution.' },
  ]);
});

test('parses headings, lists, and fenced C# code blocks', () => {
  const md = `## Why Null Happens
1. First check \`profile\`
2. Use \`?.\` operator

\`\`\`cs
Console.WriteLine(profile?.Name);
\`\`\`
`;
  const blocks = parseMarkdown(md);
  assert.equal(blocks.length, 3);
  assert.equal(blocks[0].type, 'heading');
  assert.equal(blocks[1].type, 'list');
  if (blocks[1].type === 'list') {
    assert.equal(blocks[1].ordered, true);
    assert.equal(blocks[1].items.length, 2);
  }
  assert.equal(blocks[2].type, 'code');
  if (blocks[2].type === 'code') {
    assert.equal(blocks[2].language, 'csharp');
    assert.equal(blocks[2].code, 'Console.WriteLine(profile?.Name);');
  }
});

test('never hangs on a fence with an unusual info string', () => {
  const blocks = parseMarkdown('```csharp title="Program.cs"\nint x = 1;\n```\nDone.');
  assert.equal(blocks.length, 2);
  assert.deepEqual(blocks[0], { type: 'code', language: 'csharp', code: 'int x = 1;' });
  assert.equal(blocks[1].type, 'paragraph');
});

test('keeps loose and interrupted ordered lists numbered correctly', () => {
  const md = [
    '1. First step',
    '',
    '2. Second step:',
    '   ```csharp',
    '   var x = 1;',
    '   ```',
    '3. Third step',
    '',
    '---',
    '',
    'All done.',
  ].join('\n');
  const blocks = parseMarkdown(md);
  assert.deepEqual(
    blocks.map((b) => b.type),
    ['list', 'code', 'list', 'hr', 'paragraph']
  );
  if (blocks[0].type === 'list') {
    assert.equal(blocks[0].items.length, 2);
    assert.equal(blocks[0].start, undefined);
  }
  if (blocks[1].type === 'code') {
    assert.equal(blocks[1].code, 'var x = 1;');
  }
  if (blocks[2].type === 'list') {
    assert.equal(blocks[2].start, 3);
  }
});

test('leaves arithmetic asterisks alone', () => {
  assert.deepEqual(parseInlineMarkdown('a * b * c'), [{ type: 'text', value: 'a * b * c' }]);
});

test('always terminates on odd or malformed input', () => {
  const inputs = [
    '```c# example',
    '```',
    '   ```csharp {1,3}\n   x\n',
    '####### seven',
    '#',
    '>',
    '-',
    '- ',
    '1.',
    'text ```inline``` text',
    '```a```',
    '\n\n',
    '',
  ];
  for (const input of inputs) {
    assert.ok(Array.isArray(parseMarkdown(input)));
  }
  assert.deepEqual(
    parseMarkdown('* * *').map((b) => b.type),
    ['hr']
  );
});
