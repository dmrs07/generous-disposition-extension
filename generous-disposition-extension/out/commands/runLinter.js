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
exports.runLinter = runLinter;
const vscode = __importStar(require("vscode"));
const parser_1 = require("../parser");
const linter_1 = require("../linter");
function runLinter() {
    const editor = vscode.window.activeTextEditor;
    if (!editor || editor.document.languageId !== 'generous-disposition') {
        vscode.window.showWarningMessage('Open a .gd file first');
        return;
    }
    const output = vscode.window.createOutputChannel('GD Linter');
    output.clear();
    output.show(true);
    const doc = (0, parser_1.parseGD)(editor.document.getText());
    const diagnostics = (0, linter_1.lintGD)(doc);
    if (diagnostics.length === 0) {
        output.appendLine('✓ No issues found');
        return;
    }
    for (const d of diagnostics) {
        const icon = d.severity === 'error' ? '✘' : d.severity === 'warning' ? '⚠' : 'ℹ';
        output.appendLine(`${icon} [${d.severity.toUpperCase()}] Line ${d.lineIndex + 1}: ${d.message}`);
    }
    output.appendLine(`\n${diagnostics.length} issue(s) found`);
}
//# sourceMappingURL=runLinter.js.map