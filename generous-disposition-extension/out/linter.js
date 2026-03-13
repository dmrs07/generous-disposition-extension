"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.lintGD = lintGD;
const ast_1 = require("./ast");
const DELIVERABLE_NOUNS = [
    'script', 'function', 'endpoint', 'component', 'service', 'module',
    'report', 'plan', 'prompt', 'test', 'migration', 'config', 'diagram',
    'summary', 'template', 'query', 'pipeline', 'agent', 'tool', 'file',
    'document', 'page', 'PR', 'feature',
];
const PLACEHOLDER_REGEX = /\bTBD\b|\bFIXME\b|\?\?\?|<fill-me>|<\.\.\.>/;
function computeComplexityScore(doc) {
    let score = 0;
    const intentBlock = doc.blocks.find(b => b.name === 'INTENT');
    if (intentBlock) {
        const intentText = intentBlock.inlineValue + intentBlock.bodyLines.map(l => l.text).join(' ');
        score += Math.min(intentText.split(/\s+/).length / 5, 4);
    }
    score += doc.blocks.length;
    const totalLines = doc.blocks.reduce((sum, b) => sum + b.bodyLines.length, 0);
    score += Math.min(totalLines / 3, 4);
    return Math.round(score);
}
function lintGD(doc) {
    const diagnostics = [];
    const blockNames = doc.blocks.map(b => b.name);
    // Missing INTENT
    const intentBlock = doc.blocks.find(b => b.name === 'INTENT');
    if (!intentBlock) {
        diagnostics.push({
            severity: 'error',
            message: 'Missing required INTENT block',
            lineIndex: 0,
            quickFix: {
                label: 'Insert INTENT block',
                replacement: 'INTENT: \n',
            },
        });
    }
    else {
        // Empty INTENT
        const intentText = intentBlock.inlineValue.trim() + intentBlock.bodyLines.map(l => l.text.trim()).join('');
        if (!intentText) {
            diagnostics.push({
                severity: 'error',
                message: 'INTENT block is empty',
                lineIndex: intentBlock.headerLine,
            });
        }
        else {
            // Weak INTENT
            const lower = intentText.toLowerCase();
            const hasNoun = DELIVERABLE_NOUNS.some(n => lower.includes(n.toLowerCase()));
            if (!hasNoun) {
                diagnostics.push({
                    severity: 'warning',
                    message: 'Weak INTENT: no deliverable noun found (e.g., function, endpoint, script, component)',
                    lineIndex: intentBlock.headerLine,
                });
            }
        }
    }
    // Duplicate blocks
    const seen = new Set();
    for (const block of doc.blocks) {
        if (seen.has(block.name)) {
            diagnostics.push({
                severity: 'error',
                message: `Duplicate block: ${block.name}`,
                lineIndex: block.headerLine,
            });
        }
        seen.add(block.name);
    }
    // Out of recommended order
    const presentBlocks = blockNames.filter((n, i) => blockNames.indexOf(n) === i);
    const canonicalOrder = ast_1.CANONICAL_BLOCKS.filter(n => presentBlocks.includes(n));
    for (let i = 0; i < presentBlocks.length; i++) {
        if (presentBlocks[i] !== canonicalOrder[i]) {
            const block = doc.blocks.find(b => b.name === presentBlocks[i]);
            if (block) {
                diagnostics.push({
                    severity: 'warning',
                    message: `Block ${presentBlocks[i]} is out of recommended order`,
                    lineIndex: block.headerLine,
                });
            }
        }
    }
    // Block-specific rules
    for (const block of doc.blocks) {
        const allText = block.inlineValue + '\n' + block.bodyLines.map(l => l.text).join('\n');
        // Placeholder detection
        if (PLACEHOLDER_REGEX.test(allText)) {
            diagnostics.push({
                severity: 'warning',
                message: `Unresolved placeholder in ${block.name}`,
                lineIndex: block.headerLine,
            });
        }
        if (block.name === 'CONTEXT' || block.name === 'CONSTRAINTS') {
            for (const bodyLine of block.bodyLines) {
                const trimmed = bodyLine.text.trim();
                if (trimmed && !trimmed.match(/^[\w\s\-]+:\s*.+/) && !trimmed.match(/^-\s+.+/)) {
                    diagnostics.push({
                        severity: 'warning',
                        message: `${block.name} line should be "key: value" or "- item" format`,
                        lineIndex: bodyLine.lineIndex,
                    });
                }
            }
        }
        if (block.name === 'ASSUMPTIONS') {
            for (const bodyLine of block.bodyLines) {
                const trimmed = bodyLine.text.trim();
                if (trimmed && !trimmed.startsWith('-')) {
                    diagnostics.push({
                        severity: 'warning',
                        message: 'ASSUMPTIONS items should start with "- "',
                        lineIndex: bodyLine.lineIndex,
                        quickFix: {
                            label: 'Prepend "- "',
                            replacement: bodyLine.text.replace(/^(\s*)/, '$1- '),
                        },
                    });
                }
            }
        }
        if (block.name === 'DECOMPOSE') {
            const hasStrategy = block.bodyLines.some(l => l.text.trim().startsWith('strategy:'));
            if (!hasStrategy) {
                diagnostics.push({
                    severity: 'info',
                    message: 'DECOMPOSE block missing "strategy:" field',
                    lineIndex: block.headerLine,
                    quickFix: {
                        label: 'Insert strategy: sequential',
                        replacement: '  strategy: sequential',
                    },
                });
            }
        }
    }
    // High complexity without DECOMPOSE
    const score = computeComplexityScore(doc);
    const hasDecompose = doc.blocks.some(b => b.name === 'DECOMPOSE');
    if (score >= 8 && !hasDecompose) {
        diagnostics.push({
            severity: 'warning',
            message: `High complexity prompt (score ${score}) — consider adding a DECOMPOSE block`,
            lineIndex: 0,
            quickFix: {
                label: 'Insert DECOMPOSE stub',
                replacement: 'DECOMPOSE:\n  task-1: \n  strategy: sequential\n',
            },
        });
    }
    // Missing optional blocks (info)
    if (!doc.blocks.some(b => b.name === 'CONTEXT') && doc.blocks.length > 1) {
        diagnostics.push({ severity: 'info', message: 'Consider adding a CONTEXT block', lineIndex: 0 });
    }
    if (!doc.blocks.some(b => b.name === 'CONSTRAINTS')) {
        diagnostics.push({ severity: 'info', message: 'Consider adding a CONSTRAINTS block', lineIndex: 0 });
    }
    if (!doc.blocks.some(b => b.name === 'ASSUMPTIONS')) {
        diagnostics.push({ severity: 'info', message: 'Consider adding an ASSUMPTIONS block', lineIndex: 0 });
    }
    return diagnostics;
}
//# sourceMappingURL=linter.js.map