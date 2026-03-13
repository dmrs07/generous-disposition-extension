import { GDDocument } from './ast';

export interface TokenProfile {
  name: string;
  ratio: number;
}

export const TOKEN_PROFILES: TokenProfile[] = [
  { name: 'gpt-4 / claude (default)', ratio: 1.33 },
  { name: 'gpt-3.5', ratio: 1.28 },
  { name: 'llama-3', ratio: 1.35 },
];

export const DEFAULT_PROFILE = TOKEN_PROFILES[0];

function wordCount(text: string): number {
  return text.trim().split(/\s+/).filter(w => w.length > 0).length;
}

export function estimateTokens(text: string, profile?: TokenProfile): number {
  const p = profile ?? DEFAULT_PROFILE;
  return Math.ceil(wordCount(text) * p.ratio);
}

export function estimateByBlock(doc: GDDocument, profile?: TokenProfile): Record<string, number> {
  const result: Record<string, number> = {};
  for (const block of doc.blocks) {
    const blockText = block.name + ': ' + block.inlineValue + '\n' +
      block.bodyLines.map(l => l.text).join('\n');
    result[block.name] = estimateTokens(blockText, profile);
  }
  return result;
}

export function estimateSelection(selectedText: string, profile?: TokenProfile): number {
  return estimateTokens(selectedText, profile);
}
