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
const tokenCounter_1 = require("../tokenCounter");
const parser_1 = require("../parser");
suite('Token Counter Tests', () => {
    test('returns 0 for empty string', () => {
        assert.strictEqual((0, tokenCounter_1.estimateTokens)(''), 0);
    });
    test('returns expected count for known string', () => {
        // "hello world" = 2 words, ratio 1.33 → ceil(2.66) = 3
        const result = (0, tokenCounter_1.estimateTokens)('hello world');
        assert.strictEqual(result, 3);
    });
    test('per-block breakdown sums to approximately full document count', () => {
        const input = `INTENT: Build a REST endpoint for user registration
WHY: New signup flow for mobile app
CONTEXT:
  stack: NestJS
  auth: JWT`;
        const doc = (0, parser_1.parseGD)(input);
        const byBlock = (0, tokenCounter_1.estimateByBlock)(doc);
        const blockSum = Object.values(byBlock).reduce((a, b) => a + b, 0);
        const total = (0, tokenCounter_1.estimateTokens)(input);
        // Block sum should be within 20% of total (slight variance due to header repetition)
        assert.ok(Math.abs(blockSum - total) / total < 0.3, `blockSum=${blockSum} total=${total}`);
    });
    test('respects custom token profile ratio', () => {
        const text = 'one two three four five';
        const profile35 = tokenCounter_1.TOKEN_PROFILES.find((p) => p.name === 'gpt-3.5');
        const profileLlama = tokenCounter_1.TOKEN_PROFILES.find((p) => p.name === 'llama-3');
        const count35 = (0, tokenCounter_1.estimateTokens)(text, profile35);
        const countLlama = (0, tokenCounter_1.estimateTokens)(text, profileLlama);
        // llama ratio (1.35) > gpt-3.5 ratio (1.28), so llama count should be >= gpt-3.5
        assert.ok(countLlama >= count35);
    });
});
//# sourceMappingURL=tokenCounter.test.js.map