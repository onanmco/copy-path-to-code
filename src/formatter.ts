export interface Sel {
  startLine: number;  // 0-indexed (raw from VS Code)
  endLine: number;    // 0-indexed
  endChar: number;    // 0-indexed column at the end of the selection
  isEmpty: boolean;   // true when no characters are selected (cursor only)
}

const NOTIFICATION_LINE_LIMIT = 60;
const INDENT = '  ';

export function formatNotificationText(fsPath: string, selections: Sel[]): string {
  const content = formatCopyTarget(fsPath, selections);

  const single = `Copied: ${content}`;
  if (single.length <= NOTIFICATION_LINE_LIMIT) {
    return single;
  }

  const sep = content.includes('\\') ? '\\' : '/';

  if (content.includes(', @')) {
    const parts = content.split(', @');
    const wrapped = parts.map((p) => wrapSingleRef(p, sep));
    return `Copied:\n${INDENT}${wrapped.join(',\n  @')}`;
  }

  return `Copied:\n${INDENT}${wrapSingleRef(content, sep)}`;
}

function wrapSingleRef(ref: string, sep: string): string {
  const limit = NOTIFICATION_LINE_LIMIT - INDENT.length;
  const lines: string[] = [];
  let start = 0;

  while (start < ref.length) {
    let end = Math.min(start + limit, ref.length);

    if (end < ref.length) {
      const breakPos = ref.lastIndexOf(sep, end);
      if (breakPos > start + 1) {
        end = breakPos + 1;
      } else {
        end = ref.length;
      }
    }

    lines.push(ref.slice(start, end));
    start = end;
  }

  return lines.join('\n' + INDENT);
}

export function formatCopyTarget(fsPath: string, selections: Sel[]): string {
  if (selections.length === 0) return `@${fsPath}`;
  if (selections.length === 1 && selections[0].isEmpty) return `@${fsPath}`;

  const ordered = selections.slice().sort((a, b) => a.startLine - b.startLine);
  return ordered.map((s) => `@${fsPath}${renderRange(s)}`).join(', ');
}

function renderRange(s: Sel): string {
  const startLine = s.startLine + 1;
  let endLine = s.endLine + 1;
  if (s.endChar === 0 && s.endLine > s.startLine) {
    endLine -= 1;
  }
  return startLine === endLine ? `#L${startLine}` : `#L${startLine}-L${endLine}`;
}
