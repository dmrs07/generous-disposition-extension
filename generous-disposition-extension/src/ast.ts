export type BlockName = 'INTENT' | 'WHY' | 'FOR' | 'CONTEXT' | 'CONSTRAINTS' | 'EXAMPLE' | 'ASSUMPTIONS' | 'DECOMPOSE';

export const CANONICAL_BLOCKS: BlockName[] = [
  'INTENT', 'WHY', 'FOR', 'CONTEXT', 'CONSTRAINTS', 'EXAMPLE', 'ASSUMPTIONS', 'DECOMPOSE'
];

export const BLOCK_META: Record<BlockName, { required: boolean; description: string; hint: string }> = {
  INTENT:      { required: true,  description: 'What + deliverable type', hint: 'INTENT: Build a REST endpoint for user registration' },
  WHY:         { required: false, description: 'Business context or purpose', hint: 'WHY: New signup flow for mobile app' },
  FOR:         { required: false, description: 'Audience / skill level / reviewer', hint: 'FOR: Senior backend dev, PR review context' },
  CONTEXT:     { required: false, description: 'Key-value state', hint: 'CONTEXT:\n  stack: NestJS + Prisma\n  auth: JWT' },
  CONSTRAINTS: { required: false, description: 'Format, length, style rules', hint: 'CONSTRAINTS:\n  format: single file\n  length: < 80 lines' },
  EXAMPLE:     { required: false, description: 'Fragment of desired output', hint: 'EXAMPLE:\n  @Post("/register")\n  async register(@Body() dto) {}' },
  ASSUMPTIONS: { required: false, description: 'Taken-for-granted facts', hint: 'ASSUMPTIONS:\n  - DB configured\n  - Auth middleware exists' },
  DECOMPOSE:   { required: false, description: 'Sub-tasks + execution strategy', hint: 'DECOMPOSE:\n  task-1: Generate schema\n  task-2: Create controller\n  strategy: sequential' },
};

export interface GDLine {
  lineIndex: number;
  text: string;
}

export interface GDBlock {
  name: BlockName;
  headerLine: number;
  inlineValue: string;
  bodyLines: GDLine[];
}

export interface GDDocument {
  blocks: GDBlock[];
  freeformStartLine: number | null;
  raw: string;
  lines: string[];
}
