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
exports.GDCodeActionProvider = exports.DiagnosticsProvider = void 0;
const vscode = __importStar(require("vscode"));
const parser_1 = require("./parser");
const linter_1 = require("./linter");
const DIAGNOSTIC_SOURCE = 'generous-disposition';
class DiagnosticsProvider {
    constructor() {
        this.disposables = [];
        this.collection = vscode.languages.createDiagnosticCollection(DIAGNOSTIC_SOURCE);
    }
    activate(context) {
        context.subscriptions.push(this.collection);
        const updateDiagnostics = (document) => {
            if (document.languageId !== 'generous-disposition') {
                return;
            }
            const config = vscode.workspace.getConfiguration('generousDisposition');
            if (!config.get('enableLinting', true)) {
                this.collection.clear();
                return;
            }
            this.updateDiagnostics(document);
        };
        this.disposables.push(vscode.workspace.onDidChangeTextDocument(e => updateDiagnostics(e.document)), vscode.workspace.onDidOpenTextDocument(updateDiagnostics));
        this.disposables.forEach(d => context.subscriptions.push(d));
        // Update for already-open documents
        if (vscode.window.activeTextEditor) {
            updateDiagnostics(vscode.window.activeTextEditor.document);
        }
    }
    updateDiagnostics(document) {
        const gdDoc = (0, parser_1.parseGD)(document.getText());
        const gdDiagnostics = (0, linter_1.lintGD)(gdDoc);
        const vsDiagnostics = gdDiagnostics.map(d => this.toVSDiagnostic(document, d));
        this.collection.set(document.uri, vsDiagnostics);
    }
    toVSDiagnostic(document, d) {
        const line = Math.min(d.lineIndex, document.lineCount - 1);
        const endLine = d.endLineIndex !== undefined
            ? Math.min(d.endLineIndex, document.lineCount - 1)
            : line;
        const lineText = document.lineAt(line).text;
        const range = new vscode.Range(line, 0, endLine, lineText.length);
        const severity = d.severity === 'error' ? vscode.DiagnosticSeverity.Error :
            d.severity === 'warning' ? vscode.DiagnosticSeverity.Warning :
                vscode.DiagnosticSeverity.Information;
        const diagnostic = new vscode.Diagnostic(range, d.message, severity);
        diagnostic.source = DIAGNOSTIC_SOURCE;
        if (d.quickFix) {
            diagnostic.code = JSON.stringify(d.quickFix);
        }
        return diagnostic;
    }
    dispose() {
        this.collection.dispose();
        this.disposables.forEach(d => d.dispose());
    }
}
exports.DiagnosticsProvider = DiagnosticsProvider;
class GDCodeActionProvider {
    provideCodeActions(document, _range, context) {
        const actions = [];
        for (const diagnostic of context.diagnostics) {
            if (diagnostic.source !== DIAGNOSTIC_SOURCE || !diagnostic.code) {
                continue;
            }
            try {
                const quickFix = JSON.parse(diagnostic.code);
                const action = new vscode.CodeAction(quickFix.label, vscode.CodeActionKind.QuickFix);
                action.diagnostics = [diagnostic];
                action.edit = new vscode.WorkspaceEdit();
                action.edit.replace(document.uri, diagnostic.range, quickFix.replacement);
                actions.push(action);
            }
            catch {
                // not a quick-fix diagnostic
            }
        }
        return actions;
    }
}
exports.GDCodeActionProvider = GDCodeActionProvider;
//# sourceMappingURL=diagnosticsProvider.js.map