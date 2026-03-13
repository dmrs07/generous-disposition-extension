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
exports.estimateTokens_cmd = estimateTokens_cmd;
const vscode = __importStar(require("vscode"));
const parser_1 = require("../parser");
const tokenCounter_1 = require("../tokenCounter");
function estimateTokens_cmd() {
    const editor = vscode.window.activeTextEditor;
    if (!editor || editor.document.languageId !== 'generous-disposition') {
        vscode.window.showWarningMessage('Open a .gd file first');
        return;
    }
    const config = vscode.workspace.getConfiguration('generousDisposition');
    const profileName = config.get('tokenProfile', tokenCounter_1.DEFAULT_PROFILE.name);
    const profile = tokenCounter_1.TOKEN_PROFILES.find(p => p.name === profileName) ?? tokenCounter_1.DEFAULT_PROFILE;
    const output = vscode.window.createOutputChannel('GD Token Estimator');
    output.clear();
    output.show(true);
    const text = editor.document.getText();
    const doc = (0, parser_1.parseGD)(text);
    const byBlock = (0, tokenCounter_1.estimateByBlock)(doc, profile);
    const total = (0, tokenCounter_1.estimateTokens)(text, profile);
    output.appendLine(`Token Estimate (profile: ${profile.name})`);
    output.appendLine('─'.repeat(40));
    for (const [block, count] of Object.entries(byBlock)) {
        output.appendLine(`  ${block.padEnd(12)} ${count} tokens`);
    }
    output.appendLine('─'.repeat(40));
    output.appendLine(`  TOTAL        ${total} tokens`);
}
//# sourceMappingURL=estimateTokens.js.map