export type InlineNode =
  | { type: 'text'; value: string }
  | { type: 'code'; value: string }
  | { type: 'bold'; value: string }
  | { type: 'italic'; value: string };

export type MarkdownBlock =
  | { type: 'heading'; level: 1 | 2 | 3; inlines: InlineNode[] }
  | { type: 'paragraph'; inlines: InlineNode[] }
  | { type: 'list'; ordered: boolean; start?: number; items: InlineNode[][] }
  | { type: 'code'; language: string; code: string }
  | { type: 'blockquote'; inlines: InlineNode[] }
  | { type: 'hr' };

export function parseInlineMarkdown(text: string): InlineNode[] {
  const nodes: InlineNode[] = [];
  let remaining = text;

  while (remaining.length > 0) {
    // Inline code `...`
    const codeMatch = remaining.match(/`([^`]+)`/);
    // Bold **...**
    const boldMatch = remaining.match(/\*\*([^*]+)\*\*/);
    // Italic *...* (must hug its text, so "a * b * c" stays plain)
    const italicMatch = remaining.match(/(?<!\*)\*(?!\s)([^*]+?)(?<!\s)\*(?!\*)/);

    const candidates = [
      codeMatch ? { kind: 'code' as const, match: codeMatch } : null,
      boldMatch ? { kind: 'bold' as const, match: boldMatch } : null,
      italicMatch ? { kind: 'italic' as const, match: italicMatch } : null,
    ].filter((c): c is NonNullable<typeof c> => c !== null && c.match.index !== undefined);

    if (candidates.length === 0) {
      nodes.push({ type: 'text', value: remaining });
      break;
    }

    candidates.sort((a, b) => (a.match.index ?? 0) - (b.match.index ?? 0));
    const earliest = candidates[0];
    const index = earliest.match.index ?? 0;

    if (index > 0) {
      nodes.push({ type: 'text', value: remaining.slice(0, index) });
    }

    const value = earliest.match[1];
    const wrappedCode = earliest.kind !== 'code' ? value.match(/^`([^`]+)`$/) : null;
    if (wrappedCode) {
      // **`code`** or *`code`*: show it as code instead of leaking backticks
      nodes.push({ type: 'code', value: wrappedCode[1] });
    } else {
      nodes.push({ type: earliest.kind, value });
    }
    remaining = remaining.slice(index + earliest.match[0].length);
  }

  return nodes;
}

// Opening fence: optional indentation, three or more backticks, then an
// optional info string ("csharp", "c# example", "csharp {1,3}", ...).
const FENCE_OPEN = /^(\s*)`{3,}\s*([^\s`]*)[^`]*$/;
const FENCE_CLOSE = /^\s*`{3,}\s*$/;
const HEADING = /^(#{1,6})\s+(.+)$/;
const BLOCKQUOTE = /^>\s?/;
const HORIZONTAL_RULE = /^\s{0,3}([-*_])(?:\s*\1){2,}\s*$/;
const UNORDERED_ITEM = /^\s*[-*+]\s+/;
const ORDERED_ITEM = /^\s*(\d+)[.)]\s+/;

function isHorizontalRule(line: string): boolean {
  return HORIZONTAL_RULE.test(line);
}

function isUnorderedItem(line: string): boolean {
  return UNORDERED_ITEM.test(line) && !isHorizontalRule(line);
}

function isOrderedItem(line: string): boolean {
  return ORDERED_ITEM.test(line);
}

function startsNewBlock(line: string): boolean {
  return (
    FENCE_OPEN.test(line) ||
    HEADING.test(line) ||
    BLOCKQUOTE.test(line) ||
    isHorizontalRule(line) ||
    isUnorderedItem(line) ||
    isOrderedItem(line)
  );
}

function normalizeLanguage(raw: string): string {
  const language = (raw || 'csharp').toLowerCase();
  return language === 'cs' || language === 'c#' ? 'csharp' : language;
}

export function parseMarkdown(markdown: string): MarkdownBlock[] {
  const lines = markdown.replace(/\r\n/g, '\n').split('\n');
  const blocks: MarkdownBlock[] = [];
  let i = 0;

  // Collects one list. Items may be separated by blank lines ("loose" lists)
  // and may continue on indented follow-up lines.
  const collectList = (isItem: (line: string) => boolean, marker: RegExp): string[] => {
    const rawItems: string[] = [];
    while (i < lines.length) {
      const current = lines[i];

      if (isItem(current)) {
        rawItems.push(current.replace(marker, '').trim());
        i++;
        continue;
      }

      if (current.trim() === '') {
        let next = i + 1;
        while (next < lines.length && lines[next].trim() === '') next++;
        if (next < lines.length && isItem(lines[next])) {
          i = next;
          continue;
        }
        break;
      }

      if (rawItems.length > 0 && /^\s{2,}\S/.test(current) && !startsNewBlock(current)) {
        rawItems[rawItems.length - 1] += ` ${current.trim()}`;
        i++;
        continue;
      }

      break;
    }
    return rawItems;
  };

  while (i < lines.length) {
    const line = lines[i];

    // Fenced code block ```lang
    const fenceMatch = line.match(FENCE_OPEN);
    if (fenceMatch) {
      const indent = fenceMatch[1].length;
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !FENCE_CLOSE.test(lines[i])) {
        // Fences nested in a list are indented: remove that shared indent
        let codeLine = lines[i];
        let removed = 0;
        while (removed < indent && (codeLine[0] === ' ' || codeLine[0] === '\t')) {
          codeLine = codeLine.slice(1);
          removed++;
        }
        codeLines.push(codeLine);
        i++;
      }
      if (i < lines.length) {
        i++; // skip the closing fence
      }
      blocks.push({
        type: 'code',
        language: normalizeLanguage(fenceMatch[2]),
        code: codeLines.join('\n'),
      });
      continue;
    }

    // Blank line
    if (line.trim() === '') {
      i++;
      continue;
    }

    // Heading (levels deeper than 3 render as level 3)
    const headingMatch = line.match(HEADING);
    if (headingMatch) {
      const level = Math.min(3, headingMatch[1].length) as 1 | 2 | 3;
      blocks.push({
        type: 'heading',
        level,
        inlines: parseInlineMarkdown(headingMatch[2].trim()),
      });
      i++;
      continue;
    }

    // Horizontal rule (---, ***, ___)
    if (isHorizontalRule(line)) {
      blocks.push({ type: 'hr' });
      i++;
      continue;
    }

    // Blockquote
    if (BLOCKQUOTE.test(line)) {
      const quoteLines: string[] = [];
      while (i < lines.length && BLOCKQUOTE.test(lines[i])) {
        quoteLines.push(lines[i].replace(BLOCKQUOTE, ''));
        i++;
      }
      blocks.push({
        type: 'blockquote',
        inlines: parseInlineMarkdown(quoteLines.join(' ').trim()),
      });
      continue;
    }

    // Unordered list
    if (isUnorderedItem(line)) {
      const rawItems = collectList(isUnorderedItem, UNORDERED_ITEM);
      blocks.push({ type: 'list', ordered: false, items: rawItems.map(parseInlineMarkdown) });
      continue;
    }

    // Ordered list (keeps its first number so a list that resumes after a
    // code block continues counting instead of restarting at 1)
    const orderedMatch = line.match(ORDERED_ITEM);
    if (orderedMatch) {
      const start = Number(orderedMatch[1]);
      const rawItems = collectList(isOrderedItem, ORDERED_ITEM);
      blocks.push({
        type: 'list',
        ordered: true,
        ...(start !== 1 ? { start } : {}),
        items: rawItems.map(parseInlineMarkdown),
      });
      continue;
    }

    // Paragraph (collect contiguous non-empty, non-special lines)
    const paraLines: string[] = [line.trim()];
    i++;
    while (i < lines.length && lines[i].trim() !== '' && !startsNewBlock(lines[i])) {
      paraLines.push(lines[i].trim());
      i++;
    }
    blocks.push({
      type: 'paragraph',
      inlines: parseInlineMarkdown(paraLines.join(' ')),
    });
  }

  return blocks;
}
