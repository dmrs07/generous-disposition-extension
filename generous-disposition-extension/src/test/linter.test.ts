import * as assert from 'assert';
import { parseGD } from '../parser';
import { lintGD, GDDiagnostic } from '../linter';

suite('Linter Tests', () => {
  test('reports error for missing INTENT', () => {
    const doc = parseGD('WHY: Some reason');
    const diags = lintGD(doc);
    const errors = diags.filter((d: GDDiagnostic) => d.severity === 'error' && d.message.includes('INTENT'));
    assert.ok(errors.length > 0);
  });

  test('reports error for empty INTENT', () => {
    const doc = parseGD('INTENT: ');
    const diags = lintGD(doc);
    const errors = diags.filter((d: GDDiagnostic) => d.severity === 'error' && d.message.toLowerCase().includes('empty'));
    assert.ok(errors.length > 0);
  });

  test('reports error for duplicate block', () => {
    const doc = parseGD('INTENT: Build a script\nINTENT: Build another script');
    const diags = lintGD(doc);
    const errors = diags.filter((d: GDDiagnostic) => d.severity === 'error' && d.message.includes('Duplicate'));
    assert.ok(errors.length > 0);
  });

  test('reports warning for out-of-order block', () => {
    const doc = parseGD('INTENT: Build a function\nCONTEXT:\n  stack: Node\nWHY: Because');
    const diags = lintGD(doc);
    const warnings = diags.filter((d: GDDiagnostic) => d.severity === 'warning' && d.message.includes('order'));
    assert.ok(warnings.length > 0);
  });

  test('reports warning for placeholder text', () => {
    const doc = parseGD('INTENT: Build a TBD component');
    const diags = lintGD(doc);
    const warnings = diags.filter((d: GDDiagnostic) => d.severity === 'warning' && d.message.includes('placeholder'));
    assert.ok(warnings.length > 0);
  });

  test('reports warning for weak INTENT (no deliverable noun)', () => {
    const doc = parseGD('INTENT: Make it better somehow');
    const diags = lintGD(doc);
    const warnings = diags.filter((d: GDDiagnostic) => d.severity === 'warning' && d.message.includes('Weak INTENT'));
    assert.ok(warnings.length > 0);
  });

  test('reports info for missing CONSTRAINTS', () => {
    const doc = parseGD('INTENT: Build a function that sorts');
    const diags = lintGD(doc);
    const infos = diags.filter((d: GDDiagnostic) => d.severity === 'info' && d.message.includes('CONSTRAINTS'));
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
    const doc = parseGD(input);
    const diags = lintGD(doc);
    const warnings = diags.filter((d: GDDiagnostic) => d.severity === 'warning' && d.message.includes('DECOMPOSE'));
    assert.ok(warnings.length > 0);
  });

  test('reports info for DECOMPOSE without strategy', () => {
    const doc = parseGD('INTENT: Build a script\nDECOMPOSE:\n  task-1: Do something');
    const diags = lintGD(doc);
    const infos = diags.filter((d: GDDiagnostic) => d.severity === 'info' && d.message.includes('strategy'));
    assert.ok(infos.length > 0);
  });
});
