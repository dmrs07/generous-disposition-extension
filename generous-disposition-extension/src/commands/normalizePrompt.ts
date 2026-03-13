import * as vscode from 'vscode';
import { parseGD } from '../parser';
import { CANONICAL_BLOCKS } from '../ast';

export async function normalizePrompt(): Promise<void> {
  const editor = vscode.window.activeTextEditor;
  if (!editor || editor.document.languageId !== 'generous-disposition') {
    vscode.window.showWarningMessage('Open a .gd file first');
    return;
  }

  const text = editor.document.getText();
  const doc = parseGD(text);

  // Reorder blocks to canonical order
  const orderedBlocks = CANONICAL_BLOCKS
    .map(name => doc.blocks.find(b => b.name === name))
    .filter((b): b is NonNullable<typeof b> => b !== undefined);

  // Reconstruct the document
  const lines: string[] = [];
  for (const block of orderedBlocks) {
    const headerText = block.inlineValue
      ? `${block.name}: ${block.inlineValue}`
      : `${block.name}:`;
    lines.push(headerText);
    for (const bodyLine of block.bodyLines) {
      lines.push(bodyLine.text);
    }
    lines.push('');
  }

  // Append freeform section if present
  if (doc.freeformStartLine !== null) {
    const freeformLines = doc.lines.slice(doc.freeformStartLine);
    lines.push(...freeformLines);
  }

  const normalized = lines.join('\n').replace(/\n{3,}/g, '\n\n');

  await editor.edit(editBuilder => {
    const fullRange = new vscode.Range(
      editor.document.positionAt(0),
      editor.document.positionAt(text.length)
    );
    editBuilder.replace(fullRange, normalized);
  });

  vscode.window.showInformationMessage('Prompt normalized to canonical block order');
}
