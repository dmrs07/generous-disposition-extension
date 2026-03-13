import * as vscode from 'vscode';
import { parseGD } from './parser';
import { lintGD } from './linter';
import { estimateTokens, TOKEN_PROFILES, DEFAULT_PROFILE } from './tokenCounter';

function computeScore(text: string): number {
  const doc = parseGD(text);
  const diagnostics = lintGD(doc);
  const errors = diagnostics.filter(d => d.severity === 'error').length;
  const warnings = diagnostics.filter(d => d.severity === 'warning').length;
  const blockCount = doc.blocks.length;
  let score = Math.min(blockCount * 10, 60);
  score -= errors * 20;
  score -= warnings * 5;
  return Math.max(0, Math.min(100, score));
}

export class StatusBarProvider {
  private statusBarItem: vscode.StatusBarItem;
  private disposables: vscode.Disposable[] = [];

  constructor() {
    this.statusBarItem = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Right,
      100
    );
    this.statusBarItem.command = 'gd.estimateTokens';
    this.statusBarItem.tooltip = 'Click to see token breakdown';
  }

  activate(context: vscode.ExtensionContext): void {
    context.subscriptions.push(this.statusBarItem);

    const update = (editor?: vscode.TextEditor) => {
      const config = vscode.workspace.getConfiguration('generousDisposition');
      if (!config.get<boolean>('showStatusBar', true)) {
        this.statusBarItem.hide();
        return;
      }
      if (!editor || editor.document.languageId !== 'generous-disposition') {
        this.statusBarItem.hide();
        return;
      }
      this.updateStatusBar(editor.document);
    };

    this.disposables.push(
      vscode.window.onDidChangeActiveTextEditor(update),
      vscode.workspace.onDidChangeTextDocument(e => {
        if (vscode.window.activeTextEditor?.document === e.document) {
          update(vscode.window.activeTextEditor);
        }
      }),
    );

    this.disposables.forEach(d => context.subscriptions.push(d));
    update(vscode.window.activeTextEditor);
  }

  private updateStatusBar(document: vscode.TextDocument): void {
    const text = document.getText();
    const config = vscode.workspace.getConfiguration('generousDisposition');
    const profileName = config.get<string>('tokenProfile', DEFAULT_PROFILE.name);
    const profile = TOKEN_PROFILES.find(p => p.name === profileName) ?? DEFAULT_PROFILE;

    const tokens = estimateTokens(text, profile);
    const score = computeScore(text);

    this.statusBarItem.text = `◎ GD  ~${tokens} tokens  [${score}/100]`;
    this.statusBarItem.show();
  }

  dispose(): void {
    this.statusBarItem.dispose();
    this.disposables.forEach(d => d.dispose());
  }
}
