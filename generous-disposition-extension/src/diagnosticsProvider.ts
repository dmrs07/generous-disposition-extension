import * as vscode from 'vscode';
import { parseGD } from './parser';
import { lintGD, GDDiagnostic } from './linter';

const DIAGNOSTIC_SOURCE = 'generous-disposition';

export class DiagnosticsProvider {
  private collection: vscode.DiagnosticCollection;
  private disposables: vscode.Disposable[] = [];

  constructor() {
    this.collection = vscode.languages.createDiagnosticCollection(DIAGNOSTIC_SOURCE);
  }

  activate(context: vscode.ExtensionContext): void {
    context.subscriptions.push(this.collection);

    const updateDiagnostics = (document: vscode.TextDocument) => {
      if (document.languageId !== 'generous-disposition') {
        return;
      }
      const config = vscode.workspace.getConfiguration('generousDisposition');
      if (!config.get<boolean>('enableLinting', true)) {
        this.collection.clear();
        return;
      }
      this.updateDiagnostics(document);
    };

    this.disposables.push(
      vscode.workspace.onDidChangeTextDocument(e => updateDiagnostics(e.document)),
      vscode.workspace.onDidOpenTextDocument(updateDiagnostics),
    );

    this.disposables.forEach(d => context.subscriptions.push(d));

    // Update for already-open documents
    if (vscode.window.activeTextEditor) {
      updateDiagnostics(vscode.window.activeTextEditor.document);
    }
  }

  private updateDiagnostics(document: vscode.TextDocument): void {
    const gdDoc = parseGD(document.getText());
    const gdDiagnostics = lintGD(gdDoc);
    const vsDiagnostics = gdDiagnostics.map(d => this.toVSDiagnostic(document, d));
    this.collection.set(document.uri, vsDiagnostics);
  }

  private toVSDiagnostic(document: vscode.TextDocument, d: GDDiagnostic): vscode.Diagnostic {
    const line = Math.min(d.lineIndex, document.lineCount - 1);
    const endLine = d.endLineIndex !== undefined
      ? Math.min(d.endLineIndex, document.lineCount - 1)
      : line;
    const lineText = document.lineAt(line).text;
    const range = new vscode.Range(line, 0, endLine, lineText.length);

    const severity =
      d.severity === 'error' ? vscode.DiagnosticSeverity.Error :
      d.severity === 'warning' ? vscode.DiagnosticSeverity.Warning :
      vscode.DiagnosticSeverity.Information;

    const diagnostic = new vscode.Diagnostic(range, d.message, severity);
    diagnostic.source = DIAGNOSTIC_SOURCE;
    if (d.quickFix) {
      diagnostic.code = JSON.stringify(d.quickFix);
    }
    return diagnostic;
  }

  dispose(): void {
    this.collection.dispose();
    this.disposables.forEach(d => d.dispose());
  }
}

export class GDCodeActionProvider implements vscode.CodeActionProvider {
  provideCodeActions(
    document: vscode.TextDocument,
    _range: vscode.Range,
    context: vscode.CodeActionContext,
  ): vscode.CodeAction[] {
    const actions: vscode.CodeAction[] = [];

    for (const diagnostic of context.diagnostics) {
      if (diagnostic.source !== DIAGNOSTIC_SOURCE || !diagnostic.code) {
        continue;
      }
      try {
        const quickFix = JSON.parse(diagnostic.code as string) as { label: string; replacement: string };
        const action = new vscode.CodeAction(quickFix.label, vscode.CodeActionKind.QuickFix);
        action.diagnostics = [diagnostic];
        action.edit = new vscode.WorkspaceEdit();
        action.edit.replace(document.uri, diagnostic.range, quickFix.replacement);
        actions.push(action);
      } catch {
        // not a quick-fix diagnostic
      }
    }

    return actions;
  }
}
