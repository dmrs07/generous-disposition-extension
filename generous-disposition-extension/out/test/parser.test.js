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
const assert = __importStar(require("assert"));
const parser_1 = require("../parser");
suite('Parser Tests', () => {
    test('parses all 8 canonical blocks', () => {
        const input = `INTENT: Build a REST endpoint
WHY: New signup flow
FOR: Senior dev
CONTEXT:
  stack: NestJS
CONSTRAINTS:
  format: single file
EXAMPLE:
  @Post("/register")
ASSUMPTIONS:
  - DB configured
DECOMPOSE:
  task-1: Generate schema
  strategy: sequential`;
        const doc = (0, parser_1.parseGD)(input);
        assert.strictEqual(doc.blocks.length, 8);
        const names = doc.blocks.map((b) => b.name);
        assert.ok(names.includes('INTENT'));
        assert.ok(names.includes('WHY'));
        assert.ok(names.includes('FOR'));
        assert.ok(names.includes('CONTEXT'));
        assert.ok(names.includes('CONSTRAINTS'));
        assert.ok(names.includes('EXAMPLE'));
        assert.ok(names.includes('ASSUMPTIONS'));
        assert.ok(names.includes('DECOMPOSE'));
    });
    test('returns empty blocks for empty string', () => {
        const doc = (0, parser_1.parseGD)('');
        assert.strictEqual(doc.blocks.length, 0);
        assert.strictEqual(doc.freeformStartLine, null);
    });
    test('stops at --- separator', () => {
        const input = `INTENT: Build something
WHY: Because
---
This is freeform content
CONTEXT: This should not be parsed`;
        const doc = (0, parser_1.parseGD)(input);
        assert.strictEqual(doc.blocks.length, 2);
        assert.strictEqual(doc.freeformStartLine, 3);
    });
    test('handles missing optional blocks', () => {
        const input = `INTENT: Write a function that sorts an array`;
        const doc = (0, parser_1.parseGD)(input);
        assert.strictEqual(doc.blocks.length, 1);
        assert.strictEqual(doc.blocks[0].name, 'INTENT');
        assert.strictEqual(doc.blocks[0].inlineValue, 'Write a function that sorts an array');
    });
    test('handles inline vs multi-line block bodies', () => {
        const input = `INTENT: Inline value here
CONTEXT:
  key1: value1
  key2: value2`;
        const doc = (0, parser_1.parseGD)(input);
        const intent = doc.blocks.find((b) => b.name === 'INTENT');
        const context = doc.blocks.find((b) => b.name === 'CONTEXT');
        assert.strictEqual(intent?.inlineValue, 'Inline value here');
        assert.strictEqual(intent?.bodyLines.length, 0);
        assert.strictEqual(context?.bodyLines.length, 2);
    });
    test('ignores non-canonical ALL_CAPS headers', () => {
        const input = `INTENT: Do something
CUSTOM: This is not canonical
WHY: Because`;
        const doc = (0, parser_1.parseGD)(input);
        assert.strictEqual(doc.blocks.length, 2);
        const names = doc.blocks.map((b) => b.name);
        assert.ok(!names.includes('CUSTOM'));
    });
});
//# sourceMappingURL=parser.test.js.map