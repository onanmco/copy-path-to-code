import * as vscode from 'vscode';
import { formatCopyTarget, Sel } from './formatter';

const NO_PATH_MESSAGE = 'Copy path to code: no file path available';

export function activate(context: vscode.ExtensionContext): void {
  const disposable = vscode.commands.registerCommand('copyPathToCode.copy', async () => {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      await vscode.window.showErrorMessage(NO_PATH_MESSAGE);
      return;
    }
    const uri = editor.document.uri;
    if (uri.scheme !== 'file') {
      await vscode.window.showErrorMessage(NO_PATH_MESSAGE);
      return;
    }
    const fsPath = uri.fsPath;
    const selections: Sel[] = editor.selections.map((s) => ({
      startLine: s.start.line,
      endLine: s.end.line,
      endChar: s.end.character,
      isEmpty: s.isEmpty,
    }));
    const text = formatCopyTarget(fsPath, selections);
    await vscode.env.clipboard.writeText(text);
    await vscode.window.showInformationMessage(`Copied: ${text}`);
  });
  context.subscriptions.push(disposable);
}

export function deactivate(): void {}
