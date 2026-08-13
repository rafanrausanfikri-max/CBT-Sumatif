import React from 'react';
import katex from 'katex';

interface MathTextProps {
  text: string;
  className?: string;
  as?: React.ElementType;
}

/**
 * Normalizes Unicode math/geometry symbols inside text or math formulas
 */
function normalizeSymbols(str: string): string {
  let s = str;
  s = s.replace(/°/g, '^\\circ ');
  s = s.replace(/±/g, '\\pm ');
  s = s.replace(/≤/g, '\\le ');
  s = s.replace(/≥/g, '\\ge ');
  s = s.replace(/≠/g, '\\neq ');
  s = s.replace(/≈/g, '\\approx ');
  s = s.replace(/×/g, '\\times ');
  s = s.replace(/÷/g, '\\div ');
  s = s.replace(/∞/g, '\\infty ');
  s = s.replace(/π/g, '\\pi ');
  s = s.replace(/θ/g, '\\theta ');
  s = s.replace(/α/g, '\\alpha ');
  s = s.replace(/β/g, '\\beta ');
  s = s.replace(/Δ/g, '\\Delta ');
  s = s.replace(/∠/g, '\\angle ');
  s = s.replace(/△|▲/g, '\\triangle ');
  s = s.replace(/∥/g, '\\parallel ');
  s = s.replace(/⊥/g, '\\perp ');
  return s;
}

/**
 * Process a math block that is already wrapped in $ ... $ or $$ ... $$
 */
function processMathBlock(mathStr: string): string {
  let content = mathStr;

  if (content.startsWith('$$') && content.endsWith('$$')) {
    const inner = content.slice(2, -2).trim();
    content = `$$${normalizeSymbols(inner)}$$`;
  } else if (content.startsWith('$') && content.endsWith('$')) {
    const inner = content.slice(1, -1).trim();
    content = `$${normalizeSymbols(inner)}$`;
  } else if (content.startsWith('\\[') && content.endsWith('\\]')) {
    const inner = content.slice(2, -2).trim();
    content = `\\[${normalizeSymbols(inner)}\\]`;
  } else if (content.startsWith('\\(') && content.endsWith('\\)')) {
    const inner = content.slice(2, -2).trim();
    content = `\\(${normalizeSymbols(inner)}\\)`;
  }

  return content;
}

/**
 * Process plain text outside math blocks.
 * Converts unicode math symbols and auto-wraps standalone un-delimited LaTeX commands.
 */
function processPlainText(plainStr: string): string {
  let text = plainStr;

  // Convert standalone unicode symbols to inline math
  text = text.replace(/°/g, '$^\\circ$');
  text = text.replace(/±/g, '$\\pm$');
  text = text.replace(/≤/g, '$\\le$');
  text = text.replace(/≥/g, '$\\ge$');
  text = text.replace(/≠/g, '$\\neq$');
  text = text.replace(/≈/g, '$\\approx$');
  text = text.replace(/×/g, '$\\times$');
  text = text.replace(/÷/g, '$\\div$');
  text = text.replace(/∞/g, '$\\infty$');
  text = text.replace(/π/g, '$\\pi$');
  text = text.replace(/θ/g, '$\\theta$');
  text = text.replace(/α/g, '$\\alpha$');
  text = text.replace(/β/g, '$\\beta$');
  text = text.replace(/Δ/g, '$\\Delta$');
  text = text.replace(/∠/g, '$\\angle$');
  text = text.replace(/△|▲/g, '$\\triangle$');
  text = text.replace(/∥/g, '$\\parallel$');
  text = text.replace(/⊥/g, '$\\perp$');

  // Auto-wrap standalone un-delimited LaTeX commands
  const untaggedLatexRegex = /(\\(begin\{[a-z]+\}[\s\S]*?\\end\{[a-z]+\}|frac\{[^{}]*\}\{[^{}]*\}|sqrt(\[[^{}]*\])?\{[^{}]*\}|sum_\{[^{}]*\}\^\{[^{}]*\}|int_\{[^{}]*\}\^\{[^{}]*\}|lim_\{[^{}]*\}|vec\{[^{}]*\}|hat\{[^{}]*\}|overline\{[^{}]*\}|triangle\s*[A-Z]{1,4}|Delta\s*[A-Z]{1,4}|angle\s*[A-Z0-9^\circ]{1,8}|parallel|perp|square|circle|alpha|beta|gamma|delta|epsilon|theta|lambda|mu|pi|sigma|phi|omega|infty|partial|nabla|cdot|times|div|pm|le|leq|ge|geq|neq|approx|equiv|sim|implies|rightarrow|log_?[0-9]*))/gi;

  text = text.replace(untaggedLatexRegex, (m) => `$${m}$`);

  return text;
}

/**
 * Pre-processes input text into clean LaTeX blocks and plain text tokens
 */
function preprocessMathText(rawInput: string): string {
  if (!rawInput) return '';

  let str = rawInput;

  // 1. Unescape double backslashes from JSON serialization (e.g. \\frac -> \frac)
  str = str.replace(/\\\\([a-zA-Z]+|\[|\]|\(|\))/g, (_, p1) => '\\' + p1);

  // 2. Tokenize string into existing math blocks vs plain text
  const mathBlockRegex = /(\$\$.*?\$\$|\$.*?\$|\\\[.*?\\\]|\\\([^\)]+\\\))/gs;

  const tokens: string[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = mathBlockRegex.exec(str)) !== null) {
    if (match.index > lastIndex) {
      tokens.push(processPlainText(str.substring(lastIndex, match.index)));
    }
    tokens.push(processMathBlock(match[0]));
    lastIndex = mathBlockRegex.lastIndex;
  }

  if (lastIndex < str.length) {
    tokens.push(processPlainText(str.substring(lastIndex)));
  }

  return tokens.join('');
}

export const MathText: React.FC<MathTextProps> = ({
  text,
  className = '',
  as: Component = 'span'
}) => {
  if (!text) return null;

  const processedText = preprocessMathText(text);

  // Function to parse text into text, math, and image segments
  const parseParts = (input: string) => {
    type Part =
      | { type: 'text'; content: string }
      | { type: 'math'; content: string; displayMode?: boolean }
      | { type: 'image'; src: string; alt?: string };

    const parts: Part[] = [];

    // Master Regex for image tags and math expressions
    const masterRegex = /(?:!\[(.*?)\]\((data:image\/[^\)]+|https?:\/\/[^\)]+)\))|(?:\[IMG:(data:image\/[^\]]+|https?:\/\/[^\]]+)\])|(?:<img\s+[^>]*src=["'](data:image\/[^"']+|https?:\/\/[^"']+)["'][^>]*\/?>)|(\$\$.*?\$\$|\$.*?\$|\\\[.*?\\\]|\\\(.*?\\\))/gis;

    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = masterRegex.exec(input)) !== null) {
      if (match.index > lastIndex) {
        parts.push({
          type: 'text',
          content: input.substring(lastIndex, match.index)
        });
      }

      if (match[2]) {
        // Markdown image: ![alt](url)
        parts.push({
          type: 'image',
          src: match[2],
          alt: match[1] || 'Gambar Soal'
        });
      } else if (match[3]) {
        // [IMG:url] tag
        parts.push({
          type: 'image',
          src: match[3],
          alt: 'Gambar Soal'
        });
      } else if (match[4]) {
        // <img src="url" /> tag
        parts.push({
          type: 'image',
          src: match[4],
          alt: 'Gambar Soal'
        });
      } else if (match[5]) {
        // Math expression
        const rawMatch = match[5];
        let content = rawMatch;
        let displayMode = false;

        if (rawMatch.startsWith('$$') && rawMatch.endsWith('$$')) {
          content = rawMatch.slice(2, -2);
          displayMode = true;
        } else if (rawMatch.startsWith('$') && rawMatch.endsWith('$')) {
          content = rawMatch.slice(1, -1);
        } else if (rawMatch.startsWith('\\[') && rawMatch.endsWith('\\]')) {
          content = rawMatch.slice(2, -2);
          displayMode = true;
        } else if (rawMatch.startsWith('\\(') && rawMatch.endsWith('\\)')) {
          content = rawMatch.slice(2, -2);
        }

        parts.push({
          type: 'math',
          content: content.trim(),
          displayMode
        });
      }

      lastIndex = masterRegex.lastIndex;
    }

    if (lastIndex < input.length) {
      parts.push({
        type: 'text',
        content: input.substring(lastIndex)
      });
    }

    return parts;
  };

  const parts = parseParts(processedText);

  return (
    <Component className={className}>
      {parts.map((part, index) => {
        if (part.type === 'text') {
          return <span key={index}>{part.content}</span>;
        }

        if (part.type === 'image') {
          return (
            <span key={index} className="block my-3 text-center">
              <img
                src={part.src}
                alt={part.alt || 'Gambar Soal'}
                className="max-h-72 sm:max-h-96 w-auto max-w-full rounded-xl border border-slate-700 mx-auto shadow-lg object-contain bg-slate-900/40 p-1"
              />
            </span>
          );
        }

        try {
          const mathContent = part.content;
          const html = katex.renderToString(mathContent, {
            displayMode: part.displayMode,
            throwOnError: false,
            strict: false
          });

          return (
            <span
              key={index}
              className={part.displayMode ? 'block my-3 text-center overflow-x-auto py-1' : 'inline-block mx-0.5 align-middle'}
              dangerouslySetInnerHTML={{ __html: html }}
            />
          );
        } catch (err) {
          return (
            <span key={index} className="text-amber-300 font-mono text-xs px-1 bg-slate-800 rounded">
              {part.content}
            </span>
          );
        }
      })}
    </Component>
  );
};
