import { BlockName, CANONICAL_BLOCKS, GDBlock, GDDocument, GDLine } from './ast';

const HEADER_REGEX = /^([A-Z_]+)\s*:\s*(.*)/;
const SEPARATOR = '---';

export function parseGD(text: string): GDDocument {
  const lines = text.split('\n');
  const blocks: GDBlock[] = [];
  let currentBlock: GDBlock | null = null;
  let freeformStartLine: number | null = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (line.trim() === SEPARATOR) {
      freeformStartLine = i + 1;
      if (currentBlock) {
        blocks.push(currentBlock);
        currentBlock = null;
      }
      break;
    }

    const match = HEADER_REGEX.exec(line);
    if (match) {
      const name = match[1] as BlockName;
      if (CANONICAL_BLOCKS.includes(name)) {
        if (currentBlock) {
          blocks.push(currentBlock);
        }
        currentBlock = {
          name,
          headerLine: i,
          inlineValue: match[2].trim(),
          bodyLines: [],
        };
        continue;
      }
    }

    if (currentBlock && line.match(/^\s{2,}/)) {
      const gdLine: GDLine = { lineIndex: i, text: line };
      currentBlock.bodyLines.push(gdLine);
    }
  }

  if (currentBlock) {
    blocks.push(currentBlock);
  }

  return { blocks, freeformStartLine, raw: text, lines };
}
