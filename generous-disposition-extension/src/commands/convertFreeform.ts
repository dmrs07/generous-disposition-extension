import * as vscode from 'vscode';

function heuristicConvert(text: string): string {
  const lines = text.trim().split('\n');
  const result: string[] = [];

  // Try to detect if first line looks like an intent
  const firstLine = lines[0]?.trim() ?? '';
  result.push(`INTENT: ${firstLine}`);
  result.push('');

  // Remaining content goes into CONTEXT as freeform
  if (lines.length > 1) {
    const rest = lines.slice(1).map(l => l.trim()).filter(l => l.length > 0);
    if (rest.length > 0) {
      result.push('CONTEXT:');
      for (const line of rest) {
        result.push(`  ${line}`);
      }
      result.push('');
    }
  }

  result.push('WHY: ');
  result.push('');
  result.push('FOR: ');
  result.push('');
  result.push('CONSTRAINTS:');
  result.push('  format: ');
  result.push('');
  result.push('ASSUMPTIONS:');
  result.push('  - ');

  return result.join('\n');
}

export async function convertFreeform(): Promise<void> {
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    vscode.window.showWarningMessage('No active editor');
    return;
  }

  const selection = editor.selection;
  const selectedText = editor.document.getText(selection.isEmpty ? undefined : selection);

  if (!selectedText.trim()) {
    vscode.window.showWarningMessage('Select text to convert, or open a document with content');
    return;
  }

  const converted = heuristicConvert(selectedText);

  const newDoc = await vscode.workspace.openTextDocument({
    content: converted,
    language: 'generous-disposition',
  });
  await vscode.window.showTextDocument(newDoc, vscode.ViewColumn.Beside);
}
