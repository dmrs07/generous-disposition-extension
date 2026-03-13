"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BLOCK_META = exports.CANONICAL_BLOCKS = void 0;
exports.CANONICAL_BLOCKS = [
    'INTENT', 'WHY', 'FOR', 'CONTEXT', 'CONSTRAINTS', 'EXAMPLE', 'ASSUMPTIONS', 'DECOMPOSE'
];
exports.BLOCK_META = {
    INTENT: { required: true, description: 'What + deliverable type', hint: 'INTENT: Build a REST endpoint for user registration' },
    WHY: { required: false, description: 'Business context or purpose', hint: 'WHY: New signup flow for mobile app' },
    FOR: { required: false, description: 'Audience / skill level / reviewer', hint: 'FOR: Senior backend dev, PR review context' },
    CONTEXT: { required: false, description: 'Key-value state', hint: 'CONTEXT:\n  stack: NestJS + Prisma\n  auth: JWT' },
    CONSTRAINTS: { required: false, description: 'Format, length, style rules', hint: 'CONSTRAINTS:\n  format: single file\n  length: < 80 lines' },
    EXAMPLE: { required: false, description: 'Fragment of desired output', hint: 'EXAMPLE:\n  @Post("/register")\n  async register(@Body() dto) {}' },
    ASSUMPTIONS: { required: false, description: 'Taken-for-granted facts', hint: 'ASSUMPTIONS:\n  - DB configured\n  - Auth middleware exists' },
    DECOMPOSE: { required: false, description: 'Sub-tasks + execution strategy', hint: 'DECOMPOSE:\n  task-1: Generate schema\n  task-2: Create controller\n  strategy: sequential' },
};
//# sourceMappingURL=ast.js.map