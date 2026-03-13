import * as vscode from 'vscode';
import { BLOCK_META, BlockName, CANONICAL_BLOCKS } from './ast';
import { parseGD } from './parser';
import { estimateTokens, TOKEN_PROFILES, DEFAULT_PROFILE } from './tokenCounter';

export class GDHoverProvider implements vscode.HoverProvider {
  provideHover(
    document: vscode.TextDocument,
    position: vscode.Position,
  ): vscode.Hover | undefined {
    const lineText = document.lineAt(position.line).text;
    const match = /^([A-Z_]+)\s*:/.exec(lineText);
    if (!match) { return undefined; }

    const name = match[1] as BlockName;
    if (!CANONICAL_BLOCKS.includes(name)) { return undefined; }

    const meta = BLOCK_META[name];
    const gdDoc = parseGD(document.getText());
    const block = gdDoc.blocks.find(b => b.name === name);

    const config = vscode.workspace.getConfiguration('generousDisposition');
    const profileName = config.get<string>('tokenProfile', DEFAULT_PROFILE.name);
    const profile = TOKEN_PROFILES.find(p => p.name === profileName) ?? DEFAULT_PROFILE;

    let blockTokens = 0;
    if (block) {
      const blockText = block.name + ': ' + block.inlineValue + '\n' +
        block.bodyLines.map(l => l.text).join('\n');
      blockTokens = estimateTokens(blockText, profile);
    }

    const md = new vscode.MarkdownString();
    md.appendMarkdown(`## ${name}\n\n`);
    md.appendMarkdown(`${meta.description}\n\n`);
    md.appendMarkdown(`**${meta.required ? 'Required' : 'Optional'}**\n\n`);
    md.appendMarkdown(`**Example:**\n\`\`\`\n${meta.hint}\n\`\`\`\n\n`);
    if (block) {
      md.appendMarkdown(`**This block:** ~${blockTokens} tokens`);
    }

    return new vscode.Hover(md);
  }
}
