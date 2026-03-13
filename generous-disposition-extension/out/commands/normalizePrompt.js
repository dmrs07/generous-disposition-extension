"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.normalizePrompt = normalizePrompt;
const vscode = __importStar(require("vscode"));
const parser_1 = require("../parser");
const ast_1 = require("../ast");
async function normalizePrompt() {
    const editor = vscode.window.activeTextEditor;
    if (!editor || editor.document.languageId !== 'generous-disposition') {
        vscode.window.showWarningMessage('Open a .gd file first');
        return;
    }
    const text = editor.document.getText();
    const doc = (0, parser_1.parseGD)(text);
    // Reorder blocks to canonical order
    const orderedBlocks = ast_1.CANONICAL_BLOCKS
        .map(name => doc.blocks.find(b => b.name === name))
        .filter((b) => b !== undefined);
    // Reconstruct the document
    const lines = [];
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
        const fullRange = new vscode.Range(editor.document.positionAt(0), editor.document.positionAt(text.length));
        editBuilder.replace(fullRange, normalized);
    });
    vscode.window.showInformationMessage('Prompt normalized to canonical block order');
}
//# sourceMappingURL=normalizePrompt.js.map