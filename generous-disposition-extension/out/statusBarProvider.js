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
exports.StatusBarProvider = void 0;
const vscode = __importStar(require("vscode"));
const parser_1 = require("./parser");
const linter_1 = require("./linter");
const tokenCounter_1 = require("./tokenCounter");
function computeScore(text) {
    const doc = (0, parser_1.parseGD)(text);
    const diagnostics = (0, linter_1.lintGD)(doc);
    const errors = diagnostics.filter(d => d.severity === 'error').length;
    const warnings = diagnostics.filter(d => d.severity === 'warning').length;
    const blockCount = doc.blocks.length;
    let score = Math.min(blockCount * 10, 60);
    score -= errors * 20;
    score -= warnings * 5;
    return Math.max(0, Math.min(100, score));
}
class StatusBarProvider {
    constructor() {
        this.disposables = [];
        this.statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
        this.statusBarItem.command = 'gd.estimateTokens';
        this.statusBarItem.tooltip = 'Click to see token breakdown';
    }
    activate(context) {
        context.subscriptions.push(this.statusBarItem);
        const update = (editor) => {
            const config = vscode.workspace.getConfiguration('generousDisposition');
            if (!config.get('showStatusBar', true)) {
                this.statusBarItem.hide();
                return;
            }
            if (!editor || editor.document.languageId !== 'generous-disposition') {
                this.statusBarItem.hide();
                return;
            }
            this.updateStatusBar(editor.document);
        };
        this.disposables.push(vscode.window.onDidChangeActiveTextEditor(update), vscode.workspace.onDidChangeTextDocument(e => {
            if (vscode.window.activeTextEditor?.document === e.document) {
                update(vscode.window.activeTextEditor);
            }
        }));
        this.disposables.forEach(d => context.subscriptions.push(d));
        update(vscode.window.activeTextEditor);
    }
    updateStatusBar(document) {
        const text = document.getText();
        const config = vscode.workspace.getConfiguration('generousDisposition');
        const profileName = config.get('tokenProfile', tokenCounter_1.DEFAULT_PROFILE.name);
        const profile = tokenCounter_1.TOKEN_PROFILES.find(p => p.name === profileName) ?? tokenCounter_1.DEFAULT_PROFILE;
        const tokens = (0, tokenCounter_1.estimateTokens)(text, profile);
        const score = computeScore(text);
        this.statusBarItem.text = `◎ GD  ~${tokens} tokens  [${score}/100]`;
        this.statusBarItem.show();
    }
    dispose() {
        this.statusBarItem.dispose();
        this.disposables.forEach(d => d.dispose());
    }
}
exports.StatusBarProvider = StatusBarProvider;
//# sourceMappingURL=statusBarProvider.js.map