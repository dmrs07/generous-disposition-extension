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
exports.GDHoverProvider = void 0;
const vscode = __importStar(require("vscode"));
const ast_1 = require("./ast");
const parser_1 = require("./parser");
const tokenCounter_1 = require("./tokenCounter");
class GDHoverProvider {
    provideHover(document, position) {
        const lineText = document.lineAt(position.line).text;
        const match = /^([A-Z_]+)\s*:/.exec(lineText);
        if (!match) {
            return undefined;
        }
        const name = match[1];
        if (!ast_1.CANONICAL_BLOCKS.includes(name)) {
            return undefined;
        }
        const meta = ast_1.BLOCK_META[name];
        const gdDoc = (0, parser_1.parseGD)(document.getText());
        const block = gdDoc.blocks.find(b => b.name === name);
        const config = vscode.workspace.getConfiguration('generousDisposition');
        const profileName = config.get('tokenProfile', tokenCounter_1.DEFAULT_PROFILE.name);
        const profile = tokenCounter_1.TOKEN_PROFILES.find(p => p.name === profileName) ?? tokenCounter_1.DEFAULT_PROFILE;
        let blockTokens = 0;
        if (block) {
            const blockText = block.name + ': ' + block.inlineValue + '\n' +
                block.bodyLines.map(l => l.text).join('\n');
            blockTokens = (0, tokenCounter_1.estimateTokens)(blockText, profile);
        }
        const md = new vscode.MarkdownString();
        md.appendMarkdown(`## ${name}\n\n`);
        md.appendMarkdown(`${meta.description}\n\n`);
        md.appendMarkdown(`**${meta.required ? 'Required' : 'Optional'}**\n\n`);
        md.appendMarkdown(`**Example:**\n\`\`\`\n${meta.hint}\n\`\`\`\n\n`);
        if (block) {
            md.appendMarkdown(`**This block:** ~${blockTokens} tokens`);
        }
        return new vscode.Hover(md);
    }
}
exports.GDHoverProvider = GDHoverProvider;
//# sourceMappingURL=hoverProvider.js.map