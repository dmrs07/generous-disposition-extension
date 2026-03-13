"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_PROFILE = exports.TOKEN_PROFILES = void 0;
exports.estimateTokens = estimateTokens;
exports.estimateByBlock = estimateByBlock;
exports.estimateSelection = estimateSelection;
exports.TOKEN_PROFILES = [
    { name: 'gpt-4 / claude (default)', ratio: 1.33 },
    { name: 'gpt-3.5', ratio: 1.28 },
    { name: 'llama-3', ratio: 1.35 },
];
exports.DEFAULT_PROFILE = exports.TOKEN_PROFILES[0];
function wordCount(text) {
    return text.trim().split(/\s+/).filter(w => w.length > 0).length;
}
function estimateTokens(text, profile) {
    const p = profile ?? exports.DEFAULT_PROFILE;
    return Math.ceil(wordCount(text) * p.ratio);
}
function estimateByBlock(doc, profile) {
    const result = {};
    for (const block of doc.blocks) {
        const blockText = block.name + ': ' + block.inlineValue + '\n' +
            block.bodyLines.map(l => l.text).join('\n');
        result[block.name] = estimateTokens(blockText, profile);
    }
    return result;
}
function estimateSelection(selectedText, profile) {
    return estimateTokens(selectedText, profile);
}
//# sourceMappingURL=tokenCounter.js.map