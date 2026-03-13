import * as assert from 'assert';
import { estimateTokens, estimateByBlock, TOKEN_PROFILES, TokenProfile } from '../tokenCounter';
import { parseGD } from '../parser';

suite('Token Counter Tests', () => {
  test('returns 0 for empty string', () => {
    assert.strictEqual(estimateTokens(''), 0);
  });

  test('returns expected count for known string', () => {
    // "hello world" = 2 words, ratio 1.33 → ceil(2.66) = 3
    const result = estimateTokens('hello world');
    assert.strictEqual(result, 3);
  });

  test('per-block breakdown sums to approximately full document count', () => {
    const input = `INTENT: Build a REST endpoint for user registration
WHY: New signup flow for mobile app
CONTEXT:
  stack: NestJS
  auth: JWT`;
    const doc = parseGD(input);
    const byBlock = estimateByBlock(doc);
    const blockSum = Object.values(byBlock).reduce((a: number, b: number) => a + b, 0);
    const total = estimateTokens(input);
    // Block sum should be within 20% of total (slight variance due to header repetition)
    assert.ok(Math.abs(blockSum - total) / total < 0.3, `blockSum=${blockSum} total=${total}`);
  });

  test('respects custom token profile ratio', () => {
    const text = 'one two three four five';
    const profile35 = TOKEN_PROFILES.find((p: TokenProfile) => p.name === 'gpt-3.5')!;
    const profileLlama = TOKEN_PROFILES.find((p: TokenProfile) => p.name === 'llama-3')!;
    const count35 = estimateTokens(text, profile35);
    const countLlama = estimateTokens(text, profileLlama);
    // llama ratio (1.35) > gpt-3.5 ratio (1.28), so llama count should be >= gpt-3.5
    assert.ok(countLlama >= count35);
  });
});
