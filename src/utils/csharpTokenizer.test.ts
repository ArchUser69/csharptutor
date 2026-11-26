import test from 'node:test';
import assert from 'node:assert/strict';
import { tokenizeCSharpCode, tokenizeCSharpLine } from './csharpTokenizer';

test('tokenizes C# keywords, types, strings, numbers, and comments', () => {
  const tokens = tokenizeCSharpLine('public async Task<string> GetAsync() // fetch');
  assert.ok(tokens.some((t) => t.kind === 'keyword' && t.value === 'public'));
  assert.ok(tokens.some((t) => t.kind === 'keyword' && t.value === 'async'));
  assert.ok(tokens.some((t) => t.kind === 'type' && t.value === 'Task'));
  assert.ok(tokens.some((t) => t.kind === 'keyword' && t.value === 'string'));
  assert.ok(tokens.some((t) => t.kind === 'comment' && t.value === '// fetch'));
});

test('tokenizes interpolated and verbatim C# strings properly', () => {
  const tokens = tokenizeCSharpLine('var path = $@"C:\\Users\\{name}\\data.json";');
  assert.ok(tokens.some((t) => t.kind === 'keyword' && t.value === 'var'));
  assert.ok(
    tokens.some((t) => t.kind === 'string' && t.value === '$@"C:\\Users\\{name}\\data.json"')
  );
});

test('handles multi-line block comments across lines', () => {
  const lines = tokenizeCSharpCode('/* start\n   middle\n   end */ int x = 42;');
  assert.equal(lines.length, 3);
  assert.equal(lines[0][0].kind, 'comment');
  assert.equal(lines[1][0].kind, 'comment');
  assert.ok(lines[2].some((t) => t.kind === 'comment' && t.value.includes('end */')));
  assert.ok(lines[2].some((t) => t.kind === 'keyword' && t.value === 'int'));
  assert.ok(lines[2].some((t) => t.kind === 'number' && t.value === '42'));
});

test('does not treat comment markers inside strings as comments', () => {
  const lines = tokenizeCSharpCode(
    'client.DefaultRequestHeaders.Add("Accept", "*/*");\nvar url = "https://example.com/*";\nint y = 7; // done'
  );
  assert.equal(lines.length, 3);
  assert.ok(lines[0].some((t) => t.kind === 'string' && t.value === '"*/*"'));
  assert.ok(!lines[0].some((t) => t.kind === 'comment'));
  assert.ok(lines[1].some((t) => t.kind === 'string' && t.value === '"https://example.com/*"'));
  assert.ok(!lines[1].some((t) => t.kind === 'comment'));
  assert.ok(lines[2].some((t) => t.kind === 'keyword' && t.value === 'int'));
  assert.ok(lines[2].some((t) => t.kind === 'comment' && t.value === '// done'));
});

test('keeps an unterminated block comment open until it is closed', () => {
  const lines = tokenizeCSharpCode('int a = 1; /* open\n\nstill comment\n*/ int b = 2;');
  assert.ok(lines[0].some((t) => t.kind === 'keyword' && t.value === 'int'));
  assert.ok(lines[0].some((t) => t.kind === 'comment' && t.value === '/* open'));
  assert.deepEqual(lines[1], []);
  assert.deepEqual(lines[2], [{ kind: 'comment', value: 'still comment' }]);
  assert.ok(lines[3].some((t) => t.kind === 'comment' && t.value === '*/'));
  assert.ok(lines[3].some((t) => t.kind === 'keyword' && t.value === 'int'));
});

test('token values always rebuild the original source exactly', () => {
  const source = [
    'public async Task<string> GetAsync() /* a */ { // b',
    '    var s = $"{x} /* not a comment */"; char c = \'a\';',
    '#nullable enable',
    '  /* open',
    ' still */ int z = 0x1F + 1_000.5m;',
  ];
  const rebuilt = tokenizeCSharpCode(source.join('\n')).map((line) =>
    line.map((t) => t.value).join('')
  );
  assert.deepEqual(rebuilt, source);
});
