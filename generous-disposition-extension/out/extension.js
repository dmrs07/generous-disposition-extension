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
exports.activate = activate;
exports.deactivate = deactivate;
const vscode = __importStar(require("vscode"));
const diagnosticsProvider_1 = require("./diagnosticsProvider");
const statusBarProvider_1 = require("./statusBarProvider");
const completionProvider_1 = require("./completionProvider");
const hoverProvider_1 = require("./hoverProvider");
const createPrompt_1 = require("./commands/createPrompt");
const runLinter_1 = require("./commands/runLinter");
const estimateTokens_1 = require("./commands/estimateTokens");
const normalizePrompt_1 = require("./commands/normalizePrompt");
const convertFreeform_1 = require("./commands/convertFreeform");
const GD_LANGUAGE = 'generous-disposition';
function activate(context) {
    // Diagnostics
    const diagnosticsProvider = new diagnosticsProvider_1.DiagnosticsProvider();
    diagnosticsProvider.activate(context);
    // Code actions (quick fixes)
    context.subscriptions.push(vscode.languages.registerCodeActionsProvider(GD_LANGUAGE, new diagnosticsProvider_1.GDCodeActionProvider(), { providedCodeActionKinds: [vscode.CodeActionKind.QuickFix] }));
    // Status bar
    const statusBarProvider = new statusBarProvider_1.StatusBarProvider();
    statusBarProvider.activate(context);
    // Completions
    context.subscriptions.push(vscode.languages.registerCompletionItemProvider(GD_LANGUAGE, new completionProvider_1.GDCompletionProvider(), ' ', ':', '-'));
    // Hover
    context.subscriptions.push(vscode.languages.registerHoverProvider(GD_LANGUAGE, new hoverProvider_1.GDHoverProvider()));
    // Commands
    context.subscriptions.push(vscode.commands.registerCommand('gd.createPrompt', createPrompt_1.createPrompt), vscode.commands.registerCommand('gd.runLinter', runLinter_1.runLinter), vscode.commands.registerCommand('gd.estimateTokens', estimateTokens_1.estimateTokens_cmd), vscode.commands.registerCommand('gd.normalizePrompt', normalizePrompt_1.normalizePrompt), vscode.commands.registerCommand('gd.convertFreeform', convertFreeform_1.convertFreeform));
}
function deactivate() {
    // cleanup handled by context.subscriptions
}
//# sourceMappingURL=extension.js.map