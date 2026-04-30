import * as assert from 'assert';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import * as vscode from 'vscode';

function captureErrorMessages(): { messages: string[]; restore: () => void } {
  const messages: string[] = [];
  const original = vscode.window.showErrorMessage;
  // Cast through unknown because VS Code's overloaded signature is hard to match exactly.
  (vscode.window as unknown as { showErrorMessage: typeof vscode.window.showErrorMessage }).showErrorMessage =
    (async (msg: string) => {
      messages.push(msg);
      return undefined;
    }) as unknown as typeof vscode.window.showErrorMessage;
  return {
    messages,
    restore: () => {
      (vscode.window as unknown as { showErrorMessage: typeof vscode.window.showErrorMessage }).showErrorMessage = original;
    },
  };
}

function captureInfoMessages(): { messages: string[]; restore: () => void } {
  const messages: string[] = [];
  const original = vscode.window.showInformationMessage;
  (vscode.window as unknown as { showInformationMessage: typeof vscode.window.showInformationMessage }).showInformationMessage =
    (async (msg: string) => {
      messages.push(msg);
      return undefined;
    }) as unknown as typeof vscode.window.showInformationMessage;
  return {
    messages,
    restore: () => {
      (vscode.window as unknown as { showInformationMessage: typeof vscode.window.showInformationMessage }).showInformationMessage = original;
    },
  };
}

function makeTempFile(name: string, content: string): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cpc-'));
  const file = path.join(dir, name);
  fs.writeFileSync(file, content);
  return file;
}

suite('Copy path to code — integration', () => {
  let errorStub: { messages: string[]; restore: () => void };
  let infoStub: { messages: string[]; restore: () => void };

  setup(async () => {
    errorStub = captureErrorMessages();
    infoStub = captureInfoMessages();
    await vscode.commands.executeCommand('workbench.action.closeAllEditors');
    await vscode.env.clipboard.writeText('__pre__');
  });

  test('command copyPathToCode.copy is registered', async () => {
    await vscode.commands
      .executeCommand('copyPathToCode.copy')
      .then(undefined, () => undefined);
    const cmds = await vscode.commands.getCommands(true);
    assert.ok(
      cmds.includes('copyPathToCode.copy'),
      'copyPathToCode.copy should be registered'
    );
  });

  test('copies @<path> when there is no selection', async () => {
    const tmpFile = makeTempFile('alpha.txt', 'a\nb\nc\nd\ne\n');
    const doc = await vscode.workspace.openTextDocument(tmpFile);
    const editor = await vscode.window.showTextDocument(doc);
    editor.selection = new vscode.Selection(2, 0, 2, 0);
    await vscode.commands.executeCommand('copyPathToCode.copy');
    const text = await vscode.env.clipboard.readText();
    assert.strictEqual(text, `@${editor.document.uri.fsPath}`);
  });

  test('copies @<path>#L<a>-L<b> for a multi-line selection', async () => {
    const tmpFile = makeTempFile('beta.txt', 'a\nb\nc\nd\ne\n');
    const doc = await vscode.workspace.openTextDocument(tmpFile);
    const editor = await vscode.window.showTextDocument(doc);
    editor.selection = new vscode.Selection(1, 0, 3, 1); // lines 2..4 (0-indexed 1..3)
    await vscode.commands.executeCommand('copyPathToCode.copy');
    const text = await vscode.env.clipboard.readText();
    assert.strictEqual(text, `@${editor.document.uri.fsPath}#L2-L4`);
  });

  test('shows an error and leaves clipboard unchanged when no editor is active', async () => {
    await vscode.commands.executeCommand('workbench.action.closeAllEditors');
    await vscode.env.clipboard.writeText('__sentinel__');
    const cap = captureErrorMessages();
    try {
      await vscode.commands.executeCommand('copyPathToCode.copy');
    } finally {
      cap.restore();
    }
    const text = await vscode.env.clipboard.readText();
    assert.strictEqual(text, '__sentinel__', 'clipboard must not be modified');
    assert.deepStrictEqual(cap.messages, ['Copy path to code: no file path available']);
  });

  test('shows an error and leaves clipboard unchanged for an untitled buffer', async () => {
    const doc = await vscode.workspace.openTextDocument({ content: 'untitled body' });
    await vscode.window.showTextDocument(doc);
    await vscode.env.clipboard.writeText('__sentinel__');
    const cap = captureErrorMessages();
    try {
      await vscode.commands.executeCommand('copyPathToCode.copy');
    } finally {
      cap.restore();
    }
    const text = await vscode.env.clipboard.readText();
    assert.strictEqual(text, '__sentinel__', 'clipboard must not be modified');
    assert.deepStrictEqual(cap.messages, ['Copy path to code: no file path available']);
  });

  test('shows a success info notification with the copied path', async () => {
    const tmpFile = makeTempFile('gamma.txt', 'one\ntwo\nthree\n');
    const doc = await vscode.workspace.openTextDocument(tmpFile);
    const editor = await vscode.window.showTextDocument(doc);
    editor.selection = new vscode.Selection(0, 0, 0, 0);
    const cap = captureInfoMessages();
    try {
      await vscode.commands.executeCommand('copyPathToCode.copy');
    } finally {
      cap.restore();
    }
    const expectedPath = editor.document.uri.fsPath;
    assert.deepStrictEqual(cap.messages, [`Copied: ${expectedPath}`]);
  });

  test('shows copied path with line range in notification', async () => {
    const tmpFile = makeTempFile('delta.txt', 'a\nb\nc\nd\ne\n');
    const doc = await vscode.workspace.openTextDocument(tmpFile);
    const editor = await vscode.window.showTextDocument(doc);
    editor.selection = new vscode.Selection(1, 0, 3, 1);
    const cap = captureInfoMessages();
    try {
      await vscode.commands.executeCommand('copyPathToCode.copy');
    } finally {
      cap.restore();
    }
    const expectedPath = editor.document.uri.fsPath;
    assert.deepStrictEqual(cap.messages, [`Copied: ${expectedPath}#L2-L4`]);
  });
});
