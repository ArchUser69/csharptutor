export type TokenKind =
  | 'keyword'
  | 'type'
  | 'string'
  | 'comment'
  | 'number'
  | 'attribute'
  | 'punctuation'
  | 'plain';

export interface CodeToken {
  kind: TokenKind;
  value: string;
}

const CSHARP_KEYWORDS = new Set([
  'abstract', 'as', 'base', 'bool', 'break', 'byte', 'case', 'catch', 'char',
  'checked', 'class', 'const', 'continue', 'decimal', 'default', 'delegate',
  'do', 'double', 'else', 'enum', 'event', 'explicit', 'extern', 'false',
  'finally', 'fixed', 'float', 'for', 'foreach', 'goto', 'if', 'implicit',
  'in', 'int', 'interface', 'internal', 'is', 'lock', 'long', 'namespace',
  'new', 'null', 'object', 'operator', 'out', 'override', 'params', 'private',
  'protected', 'public', 'readonly', 'ref', 'return', 'sbyte', 'sealed',
  'short', 'sizeof', 'stackalloc', 'static', 'string', 'struct', 'switch',
  'this', 'throw', 'true', 'try', 'typeof', 'uint', 'ulong', 'unchecked',
  'unsafe', 'ushort', 'using', 'virtual', 'void', 'volatile', 'while',
  // Contextual C# keywords
  'add', 'and', 'alias', 'ascending', 'async', 'await', 'by', 'descending',
  'dynamic', 'equals', 'file', 'from', 'get', 'global', 'group', 'init',
  'into', 'join', 'let', 'managed', 'nameof', 'not', 'notnull', 'on', 'or',
  'orderby', 'partial', 'record', 'remove', 'required', 'scoped', 'select',
  'set', 'unmanaged', 'value', 'var', 'when', 'where', 'with', 'yield',
]);

const CSHARP_TYPES = new Set([
  'Console', 'String', 'Int32', 'Int64', 'Double', 'Decimal', 'Boolean',
  'DateTime', 'DateOnly', 'TimeOnly', 'TimeSpan', 'Guid', 'Math', 'Convert',
  'List', 'Dictionary', 'HashSet', 'Queue', 'Stack', 'IEnumerable', 'IList',
  'ICollection', 'IReadOnlyList', 'IQueryable', 'Task', 'ValueTask',
  'CancellationToken', 'Exception', 'ArgumentException',
  'ArgumentNullException', 'InvalidOperationException',
  'NullReferenceException', 'IndexOutOfRangeException', 'StringBuilder',
  'Action', 'Func', 'Predicate', 'Span', 'ReadOnlySpan', 'Memory',
  'IDisposable', 'IAsyncDisposable', 'IEquatable', 'IComparable',
  'HttpClient', 'JsonSerializer', 'Enumerable', 'Path', 'File', 'Directory',
  'Regex', 'Random', 'Nullable', 'Option', 'Result',
]);

interface LineScanResult {
  tokens: CodeToken[];
  /** True when the line ends inside an unterminated block comment. */
  inBlockComment: boolean;
}

/**
 * Tokenizes one line. `startsInBlockComment` carries multi-line comment state
 * in from the previous line, and the result carries it out to the next one.
 * Tracking the state here (rather than searching the raw text for comment
 * markers) keeps markers that appear inside string literals, such as a URL or
 * an HTTP "Accept" wildcard header, from being mistaken for comments.
 */
function scanCSharpLine(line: string, startsInBlockComment: boolean): LineScanResult {
  const tokens: CodeToken[] = [];
  let i = 0;
  const len = line.length;
  let inBlockComment = startsInBlockComment;

  const pushPlain = (val: string) => {
    if (!val) return;
    const prev = tokens[tokens.length - 1];
    if (prev && prev.kind === 'plain') {
      prev.value += val;
    } else {
      tokens.push({ kind: 'plain', value: val });
    }
  };

  // Continue a block comment that was opened on an earlier line
  if (inBlockComment) {
    const endIdx = line.indexOf('*/');
    if (endIdx === -1) {
      if (len > 0) {
        tokens.push({ kind: 'comment', value: line });
      }
      return { tokens, inBlockComment: true };
    }
    tokens.push({ kind: 'comment', value: line.slice(0, endIdx + 2) });
    i = endIdx + 2;
    inBlockComment = false;
  }

  while (i < len) {
    const ch = line[i];
    const next = line[i + 1];

    // Line comment //
    if (ch === '/' && next === '/') {
      tokens.push({ kind: 'comment', value: line.slice(i) });
      break;
    }

    // Block comment /* ... */ (may stay open past the end of this line)
    if (ch === '/' && next === '*') {
      const endIdx = line.indexOf('*/', i + 2);
      if (endIdx !== -1) {
        tokens.push({ kind: 'comment', value: line.slice(i, endIdx + 2) });
        i = endIdx + 2;
      } else {
        tokens.push({ kind: 'comment', value: line.slice(i) });
        inBlockComment = true;
        break;
      }
      continue;
    }

    // Preprocessor directive (#nullable, #region, #if, etc.)
    if (ch === '#' && line.slice(0, i).trim() === '') {
      tokens.push({ kind: 'attribute', value: line.slice(i) });
      break;
    }

    // Interpolated / verbatim / regular strings: $"...", @"...", $@"...", "..."
    if (
      ch === '"' ||
      ((ch === '$' || ch === '@') && (next === '"' || ((next === '@' || next === '$') && line[i + 2] === '"')))
    ) {
      let start = i;
      if (ch === '$' || ch === '@') {
        i++;
        if (line[i] === '$' || line[i] === '@') {
          i++;
        }
      }
      const isVerbatim = line.slice(start, i).includes('@');
      i++; // skip opening quote
      while (i < len) {
        if (isVerbatim) {
          if (line[i] === '"' && line[i + 1] === '"') {
            i += 2;
            continue;
          }
          if (line[i] === '"') {
            i++;
            break;
          }
          i++;
        } else {
          if (line[i] === '\\' && i + 1 < len) {
            i += 2;
            continue;
          }
          if (line[i] === '"') {
            i++;
            break;
          }
          i++;
        }
      }
      tokens.push({ kind: 'string', value: line.slice(start, i) });
      continue;
    }

    // Char literal 'a'
    if (ch === "'") {
      const start = i;
      i++;
      while (i < len) {
        if (line[i] === '\\' && i + 1 < len) {
          i += 2;
          continue;
        }
        if (line[i] === "'") {
          i++;
          break;
        }
        i++;
      }
      tokens.push({ kind: 'string', value: line.slice(start, i) });
      continue;
    }

    // Numbers
    if (/[0-9]/.test(ch) && (i === 0 || !/[A-Za-z0-9_]/.test(line[i - 1]))) {
      const match = line.slice(i).match(/^(?:0x[0-9a-fA-F_]+|0b[01_]+|[0-9][0-9_]*(?:\.[0-9_]+)?(?:[eE][+-]?[0-9_]+)?[fFdDmMuUlL]*)/);
      if (match) {
        tokens.push({ kind: 'number', value: match[0] });
        i += match[0].length;
        continue;
      }
    }

    // Identifiers / Keywords / Known Types / PascalCase Types
    if (/[A-Za-z_]/.test(ch)) {
      const match = line.slice(i).match(/^[A-Za-z_][A-Za-z0-9_]*/);
      if (match) {
        const word = match[0];
        if (CSHARP_KEYWORDS.has(word)) {
          tokens.push({ kind: 'keyword', value: word });
        } else if (CSHARP_TYPES.has(word)) {
          tokens.push({ kind: 'type', value: word });
        } else {
          pushPlain(word);
        }
        i += word.length;
        continue;
      }
    }

    // Punctuation & operators
    if (/[{}()[\].,:;+\-*/%=!<>&|^~?]/.test(ch)) {
      tokens.push({ kind: 'punctuation', value: ch });
      i++;
      continue;
    }

    // Whitespace or other characters
    pushPlain(ch);
    i++;
  }

  return { tokens, inBlockComment };
}

export function tokenizeCSharpLine(line: string): CodeToken[] {
  return scanCSharpLine(line, false).tokens;
}

export function tokenizeCSharpCode(code: string): CodeToken[][] {
  let inBlockComment = false;

  return code.split(/\r?\n/).map((line) => {
    const result = scanCSharpLine(line, inBlockComment);
    inBlockComment = result.inBlockComment;
    return result.tokens;
  });
}
