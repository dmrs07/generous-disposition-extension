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
exports.GDCompletionProvider = void 0;
const vscode = __importStar(require("vscode"));
const ast_1 = require("./ast");
const parser_1 = require("./parser");
const CONTEXT_KEYS = ['language', 'framework', 'stack', 'auth', 'db', 'env', 'version', 'runtime', 'platform', 'repo', 'team'];
const CONSTRAINTS_KEYS = ['format', 'length', 'style', 'include', 'exclude', 'tone'];
const STRATEGY_VALUES = ['sequential', 'parallel', 'hybrid'];
class GDCompletionProvider {
    provideCompletionItems(document, position) {
        const lineText = document.lineAt(position.line).text;
        const textBefore = lineText.substring(0, position.character);
        // Block name completions at start of line
        if (/^\s*[A-Z]*$/.test(textBefore)) {
            return ast_1.CANONICAL_BLOCKS.map(name => {
                const meta = ast_1.BLOCK_META[name];
                const item = new vscode.CompletionItem(`${name}:`, vscode.CompletionItemKind.Keyword);
                item.detail = meta.description;
                item.documentation = new vscode.MarkdownString(`**${name}** — ${meta.description}\n\n${meta.required ? '*(required)*' : '*(optional)*'}\n\n\`\`\`\n${meta.hint}\n\`\`\``);
                item.insertText = new vscode.SnippetString(`${name}: $0`);
                return item;
            });
        }
        // Context-aware completions based on current block
        const gdDoc = (0, parser_1.parseGD)(document.getText());
        const currentBlock = gdDoc.blocks.find(b => {
            const lastLine = b.bodyLines.length > 0
                ? b.bodyLines[b.bodyLines.length - 1].lineIndex
                : b.headerLine;
            return position.line >= b.headerLine && position.line <= lastLine + 1;
        });
        if (!currentBlock) {
            return [];
        }
        if (currentBlock.name === 'DECOMPOSE') {
            // strategy: completions
            if (/strategy:\s*\S*$/.test(textBefore)) {
                return STRATEGY_VALUES.map(v => {
                    const item = new vscode.CompletionItem(v, vscode.CompletionItemKind.Value);
                    return item;
                });
            }
            // task-N: suggestions
            if (/task-\d*$/.test(textBefore.trim())) {
                const existingTasks = currentBlock.bodyLines
                    .map(l => l.text.match(/task-(\d+):/))
                    .filter(Boolean)
                    .map(m => parseInt(m[1]));
                const nextN = existingTasks.length > 0 ? Math.max(...existingTasks) + 1 : 1;
                const item = new vscode.CompletionItem(`task-${nextN}:`, vscode.CompletionItemKind.Property);
                item.insertText = new vscode.SnippetString(`task-${nextN}: $0`);
                return [item];
            }
        }
        if (currentBlock.name === 'CONTEXT') {
            if (/^\s+\w*$/.test(textBefore)) {
                return CONTEXT_KEYS.map(key => {
                    const item = new vscode.CompletionItem(`${key}:`, vscode.CompletionItemKind.Property);
                    item.insertText = new vscode.SnippetString(`${key}: $0`);
                    return item;
                });
            }
        }
        if (currentBlock.name === 'CONSTRAINTS') {
            if (/^\s+\w*$/.test(textBefore)) {
                return CONSTRAINTS_KEYS.map(key => {
                    const item = new vscode.CompletionItem(`${key}:`, vscode.CompletionItemKind.Property);
                    item.insertText = new vscode.SnippetString(`${key}: $0`);
                    return item;
                });
            }
        }
        return [];
    }
}
exports.GDCompletionProvider = GDCompletionProvider;
//# sourceMappingURL=completionProvider.js.map