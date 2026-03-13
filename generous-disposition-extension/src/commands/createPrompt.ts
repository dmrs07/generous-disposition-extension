import * as vscode from 'vscode';

export async function createPrompt(): Promise<void> {
  const content = `INTENT:

WHY:

FOR:

CONTEXT:
  stack:


CONSTRAINTS:
  format:
  length:

EXAMPLE:


ASSUMPTIONS:
  -
  -

DECOMPOSE:
  task-1:
  task-2:
  strategy: sequential
`;
  const doc = await vscode.workspace.openTextDocument({
    content,
    language: 'generous-disposition',
  });
  await vscode.window.showTextDocument(doc);
}
