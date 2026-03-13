import * as vscode from 'vscode';
import { CANONICAL_BLOCKS, BLOCK_META } from './ast';
import { parseGD } from './parser';

const CONTEXT_KEYS = ['language', 'framework', 'stack', 'auth', 'db', 'env', 'version', 'runtime', 'platform', 'repo', 'team'];
const CONSTRAINTS_KEYS = ['format', 'length', 'style', 'include', 'exclude', 'tone'];
const STRATEGY_VALUES = ['sequential', 'parallel', 'hybrid'];

export class GDCompletionProvider implements vscode.CompletionItemProvider {
  provideCompletionItems(
    document: vscode.TextDocument,
    position: vscode.Position,
  ): vscode.CompletionItem[] {
    const lineText = document.lineAt(position.line).text;
    const textBefore = lineText.substring(0, position.character);

    // Block name completions at start of line
    if (/^\s*[A-Z]*$/.test(textBefore)) {
      return CANONICAL_BLOCKS.map(name => {
        const meta = BLOCK_META[name];
        const item = new vscode.CompletionItem(`${name}:`, vscode.CompletionItemKind.Keyword);
        item.detail = meta.description;
        item.documentation = new vscode.MarkdownString(
          `**${name}** — ${meta.description}\n\n${meta.required ? '*(required)*' : '*(optional)*'}\n\n\`\`\`\n${meta.hint}\n\`\`\``
        );
        item.insertText = new vscode.SnippetString(`${name}: $0`);
        return item;
      });
    }

    // Context-aware completions based on current block
    const gdDoc = parseGD(document.getText());
    const currentBlock = gdDoc.blocks.find(b => {
      const lastLine = b.bodyLines.length > 0
        ? b.bodyLines[b.bodyLines.length - 1].lineIndex
        : b.headerLine;
      return position.line >= b.headerLine && position.line <= lastLine + 1;
    });

    if (!currentBlock) { return []; }

    if (currentBlock.name === 'DECOMPOSE') {
      // strategy: completions
      if (/strategy:\s*\S*$/.test(textBefore)) {
        return STRATEGY_VALUES.map(v => {
          const item = new vscode.CompletionItem(v, vscode.CompletionItemKind.Value);
          return item;
        });
      }
      // task-N: suggestions
      if (/task-\d*$/.test(textBefore.trim())) {
        const existingTasks = currentBlock.bodyLines
          .map(l => l.text.match(/task-(\d+):/))
          .filter(Boolean)
          .map(m => parseInt(m![1]));
        const nextN = existingTasks.length > 0 ? Math.max(...existingTasks) + 1 : 1;
        const item = new vscode.CompletionItem(`task-${nextN}:`, vscode.CompletionItemKind.Property);
        item.insertText = new vscode.SnippetString(`task-${nextN}: $0`);
        return [item];
      }
    }

    if (currentBlock.name === 'CONTEXT') {
      if (/^\s+\w*$/.test(textBefore)) {
        return CONTEXT_KEYS.map(key => {
          const item = new vscode.CompletionItem(`${key}:`, vscode.CompletionItemKind.Property);
          item.insertText = new vscode.SnippetString(`${key}: $0`);
          return item;
        });
      }
    }

    if (currentBlock.name === 'CONSTRAINTS') {
      if (/^\s+\w*$/.test(textBefore)) {
        return CONSTRAINTS_KEYS.map(key => {
          const item = new vscode.CompletionItem(`${key}:`, vscode.CompletionItemKind.Property);
          item.insertText = new vscode.SnippetString(`${key}: $0`);
          return item;
        });
      }
    }

    return [];
  }
}
