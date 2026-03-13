import * as vscode from 'vscode';
import { parseGD } from '../parser';
import { lintGD } from '../linter';

export function runLinter(): void {
  const editor = vscode.window.activeTextEditor;
  if (!editor || editor.document.languageId !== 'generous-disposition') {
    vscode.window.showWarningMessage('Open a .gd file first');
    return;
  }

  const output = vscode.window.createOutputChannel('GD Linter');
  output.clear();
  output.show(true);

  const doc = parseGD(editor.document.getText());
  const diagnostics = lintGD(doc);

  if (diagnostics.length === 0) {
    output.appendLine('✓ No issues found');
    return;
  }

  for (const d of diagnostics) {
    const icon = d.severity === 'error' ? '✘' : d.severity === 'warning' ? '⚠' : 'ℹ';
    output.appendLine(`${icon} [${d.severity.toUpperCase()}] Line ${d.lineIndex + 1}: ${d.message}`);
  }
  output.appendLine(`\n${diagnostics.length} issue(s) found`);
}
