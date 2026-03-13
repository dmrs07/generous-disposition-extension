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
exports.convertFreeform = convertFreeform;
const vscode = __importStar(require("vscode"));
function heuristicConvert(text) {
    const lines = text.trim().split('\n');
    const result = [];
    // Try to detect if first line looks like an intent
    const firstLine = lines[0]?.trim() ?? '';
    result.push(`INTENT: ${firstLine}`);
    result.push('');
    // Remaining content goes into CONTEXT as freeform
    if (lines.length > 1) {
        const rest = lines.slice(1).map(l => l.trim()).filter(l => l.length > 0);
        if (rest.length > 0) {
            result.push('CONTEXT:');
            for (const line of rest) {
                result.push(`  ${line}`);
            }
            result.push('');
        }
    }
    result.push('WHY: ');
    result.push('');
    result.push('FOR: ');
    result.push('');
    result.push('CONSTRAINTS:');
    result.push('  format: ');
    result.push('');
    result.push('ASSUMPTIONS:');
    result.push('  - ');
    return result.join('\n');
}
async function convertFreeform() {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
        vscode.window.showWarningMessage('No active editor');
        return;
    }
    const selection = editor.selection;
    const selectedText = editor.document.getText(selection.isEmpty ? undefined : selection);
    if (!selectedText.trim()) {
        vscode.window.showWarningMessage('Select text to convert, or open a document with content');
        return;
    }
    const converted = heuristicConvert(selectedText);
    const newDoc = await vscode.workspace.openTextDocument({
        content: converted,
        language: 'generous-disposition',
    });
    await vscode.window.showTextDocument(newDoc, vscode.ViewColumn.Beside);
}
//# sourceMappingURL=convertFreeform.js.map