import katex from 'katex';

export interface NoteSegment {
  type: 'text' | 'math';
  content: string;
  displayMode: boolean;
}

const SEGMENT_PATTERN = /\$\$([^$]+?)\$\$|\$([^$\n]+?)\$/g;

// Splits note text into plain-text and math segments.
// $$...$$ renders as display (block) math, $...$ as inline math.
export function parseNoteSegments(source: string): NoteSegment[] {
  const segments: NoteSegment[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  SEGMENT_PATTERN.lastIndex = 0;
  while ((match = SEGMENT_PATTERN.exec(source))) {
    if (match.index > lastIndex) {
      segments.push({ type: 'text', content: source.slice(lastIndex, match.index), displayMode: false });
    }
    if (match[1] !== undefined) {
      segments.push({ type: 'math', content: match[1].trim(), displayMode: true });
    } else {
      segments.push({ type: 'math', content: match[2].trim(), displayMode: false });
    }
    lastIndex = SEGMENT_PATTERN.lastIndex;
  }
  if (lastIndex < source.length) {
    segments.push({ type: 'text', content: source.slice(lastIndex), displayMode: false });
  }
  return segments;
}

export function renderMath(expr: string, displayMode: boolean): string {
  try {
    return katex.renderToString(expr, { throwOnError: false, displayMode, strict: 'ignore' });
  } catch {
    return expr;
  }
}
