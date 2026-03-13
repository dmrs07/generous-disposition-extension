import * as vscode from 'vscode';
import { parseGD } from '../parser';
import { estimateByBlock, estimateTokens, TOKEN_PROFILES, DEFAULT_PROFILE } from '../tokenCounter';

export function estimateTokens_cmd(): void {
  const editor = vscode.window.activeTextEditor;
  if (!editor || editor.document.languageId !== 'generous-disposition') {
    vscode.window.showWarningMessage('Open a .gd file first');
    return;
  }

  const config = vscode.workspace.getConfiguration('generousDisposition');
  const profileName = config.get<string>('tokenProfile', DEFAULT_PROFILE.name);
  const profile = TOKEN_PROFILES.find(p => p.name === profileName) ?? DEFAULT_PROFILE;

  const output = vscode.window.createOutputChannel('GD Token Estimator');
  output.clear();
  output.show(true);

  const text = editor.document.getText();
  const doc = parseGD(text);
  const byBlock = estimateByBlock(doc, profile);
  const total = estimateTokens(text, profile);

  output.appendLine(`Token Estimate (profile: ${profile.name})`);
  output.appendLine('─'.repeat(40));
  for (const [block, count] of Object.entries(byBlock)) {
    output.appendLine(`  ${block.padEnd(12)} ${count} tokens`);
  }
  output.appendLine('─'.repeat(40));
  output.appendLine(`  TOTAL        ${total} tokens`);
}
