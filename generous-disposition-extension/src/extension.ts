import * as vscode from 'vscode';
import { DiagnosticsProvider, GDCodeActionProvider } from './diagnosticsProvider';
import { StatusBarProvider } from './statusBarProvider';
import { GDCompletionProvider } from './completionProvider';
import { GDHoverProvider } from './hoverProvider';
import { createPrompt } from './commands/createPrompt';
import { runLinter } from './commands/runLinter';
import { estimateTokens_cmd } from './commands/estimateTokens';
import { normalizePrompt } from './commands/normalizePrompt';
import { convertFreeform } from './commands/convertFreeform';

const GD_LANGUAGE = 'generous-disposition';

export function activate(context: vscode.ExtensionContext): void {
  // Diagnostics
  const diagnosticsProvider = new DiagnosticsProvider();
  diagnosticsProvider.activate(context);

  // Code actions (quick fixes)
  context.subscriptions.push(
    vscode.languages.registerCodeActionsProvider(
      GD_LANGUAGE,
      new GDCodeActionProvider(),
      { providedCodeActionKinds: [vscode.CodeActionKind.QuickFix] }
    )
  );

  // Status bar
  const statusBarProvider = new StatusBarProvider();
  statusBarProvider.activate(context);

  // Completions
  context.subscriptions.push(
    vscode.languages.registerCompletionItemProvider(
      GD_LANGUAGE,
      new GDCompletionProvider(),
      ' ', ':', '-'
    )
  );

  // Hover
  context.subscriptions.push(
    vscode.languages.registerHoverProvider(GD_LANGUAGE, new GDHoverProvider())
  );

  // Commands
  context.subscriptions.push(
    vscode.commands.registerCommand('gd.createPrompt', createPrompt),
    vscode.commands.registerCommand('gd.runLinter', runLinter),
    vscode.commands.registerCommand('gd.estimateTokens', estimateTokens_cmd),
    vscode.commands.registerCommand('gd.normalizePrompt', normalizePrompt),
    vscode.commands.registerCommand('gd.convertFreeform', convertFreeform),
  );
}

export function deactivate(): void {
  // cleanup handled by context.subscriptions
}
