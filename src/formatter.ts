export interface Sel {
  startLine: number;  // 0-indexed (raw from VS Code)
  endLine: number;    // 0-indexed
  endChar: number;    // 0-indexed column at the end of the selection
  isEmpty: boolean;   // true when no characters are selected (cursor only)
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
