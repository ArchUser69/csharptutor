import { Check, Code2, Copy } from 'lucide-react';
import { useState } from 'react';
import { tokenizeCSharpCode, type CodeToken } from '../utils/csharpTokenizer';
import { parseMarkdown, type InlineNode } from '../utils/markdownParser';

export function getTokenColorClass(kind: CodeToken['kind']): string {
  switch (kind) {
    case 'keyword':
      return 'text-sky-300 font-medium';
    case 'type':
      return 'text-amber-300';
    case 'string':
      return 'text-emerald-300';
    case 'comment':
      return 'text-slate-500 italic';
    case 'number':
      return 'text-rose-300';
    case 'attribute':
      return 'text-indigo-300';
    case 'punctuation':
      return 'text-slate-400';
    default:
      return 'text-slate-100';
  }
}

export function HighlightedCSharp({ code }: { code: string }) {
  const tokenizedLines = tokenizeCSharpCode(code);
  return (
    <code className="block font-mono text-[13px] leading-6">
      {tokenizedLines.map((tokens, lineIdx) => (
        <span key={lineIdx} className="block min-h-[1.5rem]">
          {tokens.length === 0
            ? '\n'
            : tokens.map((tok, tokIdx) => (
                <span key={tokIdx} className={getTokenColorClass(tok.kind)}>
                  {tok.value}
                </span>
              ))}
        </span>
      ))}
    </code>
  );
}

function renderInlineNodes(nodes: InlineNode[]) {
  return nodes.map((node, idx) => {
    switch (node.type) {
      case 'code':
        return (
          <code
            key={idx}
            className="mx-0.5 rounded bg-slate-800/90 px-1.5 py-0.5 font-mono text-[12.5px] text-sky-300 border border-slate-700/60"
          >
            {node.value}
          </code>
        );
      case 'bold':
        return (
          <strong key={idx} className="font-semibold text-slate-100">
            {node.value}
          </strong>
        );
      case 'italic':
        return (
          <em key={idx} className="italic text-slate-200">
            {node.value}
          </em>
        );
      default:
        return <span key={idx}>{node.value}</span>;
    }
  });
}

function CodeBlock({
  language,
  code,
  onLoadInEditor,
}: {
  language: string;
  code: string;
  onLoadInEditor?: (code: string) => void;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      // Ignore clipboard failures in restricted frames
    }
  };

  return (
    <div className="my-3 overflow-hidden rounded-lg border border-slate-700/60 bg-[#0B0E14]">
      <div className="flex items-center justify-between border-b border-slate-800 bg-[#111622] px-3 py-1.5 text-xs text-slate-400">
        <span className="font-mono">{language === 'csharp' ? 'C#' : language}</span>
        <div className="flex items-center gap-2">
          {onLoadInEditor && language === 'csharp' && (
            <button
              type="button"
              onClick={() => onLoadInEditor(code)}
              className="inline-flex items-center gap-1 rounded px-2 py-1 text-xs font-medium text-sky-300 transition-colors hover:bg-slate-800 hover:text-sky-200 whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Code2 className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Load in Editor</span>
            </button>
          )}
          <button
            type="button"
            onClick={handleCopy}
            className="inline-flex items-center gap-1 rounded px-2 py-1 text-xs font-medium text-slate-300 transition-colors hover:bg-slate-800 hover:text-white whitespace-nowrap shrink-0 cursor-pointer"
          >
            {copied ? (
              <>
                <Check className="h-3.5 w-3.5 text-emerald-400" aria-hidden="true" />
                <span className="text-emerald-400">Copied</span>
              </>
            ) : (
              <>
                <Copy className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Copy</span>
              </>
            )}
          </button>
        </div>
      </div>
      <div className="overflow-x-auto p-3.5">
        {language === 'csharp' ? (
          <HighlightedCSharp code={code} />
        ) : (
          <pre className="font-mono text-[13px] leading-6 text-slate-200">{code}</pre>
        )}
      </div>
    </div>
  );
}

export function MarkdownRenderer({
  content,
  onLoadInEditor,
}: {
  content: string;
  onLoadInEditor?: (code: string) => void;
}) {
  const blocks = parseMarkdown(content);

  return (
    <div className="space-y-3 text-[14.5px] leading-relaxed text-slate-200">
      {blocks.map((block, idx) => {
        if (block.type === 'heading') {
          const sizeClass =
            block.level === 1
              ? 'text-lg font-semibold text-white'
              : block.level === 2
                ? 'text-base font-semibold text-white'
                : 'text-sm font-semibold text-slate-100';
          return (
            <h4 key={idx} className={`font-display tracking-tight pt-1 ${sizeClass}`}>
              {renderInlineNodes(block.inlines)}
            </h4>
          );
        }

        if (block.type === 'paragraph') {
          return (
            <p key={idx} className="text-slate-200">
              {renderInlineNodes(block.inlines)}
            </p>
          );
        }

        if (block.type === 'blockquote') {
          return (
            <blockquote
              key={idx}
              className="rounded-md border border-slate-700/60 bg-slate-900/60 px-3.5 py-2.5 text-sm text-slate-300"
            >
              {renderInlineNodes(block.inlines)}
            </blockquote>
          );
        }

        if (block.type === 'hr') {
          return <hr key={idx} className="border-slate-800" />;
        }

        if (block.type === 'list') {
          const ListTag = block.ordered ? 'ol' : 'ul';
          return (
            <ListTag
              key={idx}
              start={block.ordered ? block.start : undefined}
              className={`space-y-1.5 pl-5 ${block.ordered ? 'list-decimal' : 'list-disc'} marker:text-slate-500`}
            >
              {block.items.map((item, itemIdx) => (
                <li key={itemIdx} className="text-slate-200">
                  {renderInlineNodes(item)}
                </li>
              ))}
            </ListTag>
          );
        }

        return (
          <CodeBlock
            key={idx}
            language={block.language}
            code={block.code}
            onLoadInEditor={onLoadInEditor}
          />
        );
      })}
    </div>
  );
}
