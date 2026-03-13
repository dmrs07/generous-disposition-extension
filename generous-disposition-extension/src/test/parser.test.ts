import * as assert from 'assert';
import { parseGD } from '../parser';
import { GDBlock } from '../ast';

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
    const doc = parseGD(input);
    assert.strictEqual(doc.blocks.length, 8);
    const names = doc.blocks.map((b: GDBlock) => b.name);
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
    const doc = parseGD('');
    assert.strictEqual(doc.blocks.length, 0);
    assert.strictEqual(doc.freeformStartLine, null);
  });

  test('stops at --- separator', () => {
    const input = `INTENT: Build something
WHY: Because
---
This is freeform content
CONTEXT: This should not be parsed`;
    const doc = parseGD(input);
    assert.strictEqual(doc.blocks.length, 2);
    assert.strictEqual(doc.freeformStartLine, 3);
  });

  test('handles missing optional blocks', () => {
    const input = `INTENT: Write a function that sorts an array`;
    const doc = parseGD(input);
    assert.strictEqual(doc.blocks.length, 1);
    assert.strictEqual(doc.blocks[0].name, 'INTENT');
    assert.strictEqual(doc.blocks[0].inlineValue, 'Write a function that sorts an array');
  });

  test('handles inline vs multi-line block bodies', () => {
    const input = `INTENT: Inline value here
CONTEXT:
  key1: value1
  key2: value2`;
    const doc = parseGD(input);
    const intent = doc.blocks.find((b: GDBlock) => b.name === 'INTENT');
    const context = doc.blocks.find((b: GDBlock) => b.name === 'CONTEXT');
    assert.strictEqual(intent?.inlineValue, 'Inline value here');
    assert.strictEqual(intent?.bodyLines.length, 0);
    assert.strictEqual(context?.bodyLines.length, 2);
  });

  test('ignores non-canonical ALL_CAPS headers', () => {
    const input = `INTENT: Do something
CUSTOM: This is not canonical
WHY: Because`;
    const doc = parseGD(input);
    assert.strictEqual(doc.blocks.length, 2);
    const names = doc.blocks.map((b: GDBlock) => b.name);
    assert.ok(!names.includes('CUSTOM' as never));
  });
});
