"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseGD = parseGD;
const ast_1 = require("./ast");
const HEADER_REGEX = /^([A-Z_]+)\s*:\s*(.*)/;
const SEPARATOR = '---';
function parseGD(text) {
    const lines = text.split('\n');
    const blocks = [];
    let currentBlock = null;
    let freeformStartLine = null;
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
            const name = match[1];
            if (ast_1.CANONICAL_BLOCKS.includes(name)) {
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
            const gdLine = { lineIndex: i, text: line };
            currentBlock.bodyLines.push(gdLine);
        }
    }
    if (currentBlock) {
        blocks.push(currentBlock);
    }
    return { blocks, freeformStartLine, raw: text, lines };
}
//# sourceMappingURL=parser.js.map