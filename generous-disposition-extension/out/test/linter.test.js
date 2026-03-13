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
const linter_1 = require("../linter");
suite('Linter Tests', () => {
    test('reports error for missing INTENT', () => {
        const doc = (0, parser_1.parseGD)('WHY: Some reason');
        const diags = (0, linter_1.lintGD)(doc);
        const errors = diags.filter((d) => d.severity === 'error' && d.message.includes('INTENT'));
        assert.ok(errors.length > 0);
    });
    test('reports error for empty INTENT', () => {
        const doc = (0, parser_1.parseGD)('INTENT: ');
        const diags = (0, linter_1.lintGD)(doc);
        const errors = diags.filter((d) => d.severity === 'error' && d.message.toLowerCase().includes('empty'));
        assert.ok(errors.length > 0);
    });
    test('reports error for duplicate block', () => {
        const doc = (0, parser_1.parseGD)('INTENT: Build a script\nINTENT: Build another script');
        const diags = (0, linter_1.lintGD)(doc);
        const errors = diags.filter((d) => d.severity === 'error' && d.message.includes('Duplicate'));
        assert.ok(errors.length > 0);
    });
    test('reports warning for out-of-order block', () => {
        const doc = (0, parser_1.parseGD)('INTENT: Build a function\nCONTEXT:\n  stack: Node\nWHY: Because');
        const diags = (0, linter_1.lintGD)(doc);
        const warnings = diags.filter((d) => d.severity === 'warning' && d.message.includes('order'));
        assert.ok(warnings.length > 0);
    });
    test('reports warning for placeholder text', () => {
        const doc = (0, parser_1.parseGD)('INTENT: Build a TBD component');
        const diags = (0, linter_1.lintGD)(doc);
        const warnings = diags.filter((d) => d.severity === 'warning' && d.message.includes('placeholder'));
        assert.ok(warnings.length > 0);
    });
    test('reports warning for weak INTENT (no deliverable noun)', () => {
        const doc = (0, parser_1.parseGD)('INTENT: Make it better somehow');
        const diags = (0, linter_1.lintGD)(doc);
        const warnings = diags.filter((d) => d.severity === 'warning' && d.message.includes('Weak INTENT'));
        assert.ok(warnings.length > 0);
    });
    test('reports info for missing CONSTRAINTS', () => {
        const doc = (0, parser_1.parseGD)('INTENT: Build a function that sorts');
        const diags = (0, linter_1.lintGD)(doc);
        const infos = diags.filter((d) => d.severity === 'info' && d.message.includes('CONSTRAINTS'));
        assert.ok(infos.length > 0);
    });
    test('reports warning for high-complexity prompt without DECOMPOSE', () => {
        const longIntent = 'Build a complex distributed microservice system with authentication and authorization';
        const input = `INTENT: ${longIntent}
WHY: Enterprise needs
FOR: Senior architect
CONTEXT:
  stack: Kubernetes
  auth: OAuth2
  db: PostgreSQL
  cache: Redis
CONSTRAINTS:
  format: multi-file
  style: enterprise patterns
  length: production-ready
EXAMPLE:
  apiVersion: apps/v1
ASSUMPTIONS:
  - Cloud infra available
  - Team of 5 engineers`;
        const doc = (0, parser_1.parseGD)(input);
        const diags = (0, linter_1.lintGD)(doc);
        const warnings = diags.filter((d) => d.severity === 'warning' && d.message.includes('DECOMPOSE'));
        assert.ok(warnings.length > 0);
    });
    test('reports info for DECOMPOSE without strategy', () => {
        const doc = (0, parser_1.parseGD)('INTENT: Build a script\nDECOMPOSE:\n  task-1: Do something');
        const diags = (0, linter_1.lintGD)(doc);
        const infos = diags.filter((d) => d.severity === 'info' && d.message.includes('strategy'));
        assert.ok(infos.length > 0);
    });
});
//# sourceMappingURL=linter.test.js.map