import fs from 'node:fs';

const policyPath = 'config/audit-policy.v0.1.json';
const stackPath = 'config/prompt-stack.v4.1.json';
const policy = JSON.parse(fs.readFileSync(policyPath, 'utf8'));
const stack = JSON.parse(fs.readFileSync(stackPath, 'utf8'));
const failures = [];

function requireRule(condition, message) {
  if (!condition) failures.push(message);
}

requireRule(policy.sourceRules.minimumIndependentOrigins >= 2, 'Independent audit requires at least two source origins.');
requireRule(policy.sourceRules.userSuppliedSourcesCountTowardMinimum === false, 'User-supplied sources must not count toward the independent minimum.');
requireRule(policy.sourceRules.draftKingsMarketCaptureCountsTowardMinimum === false, 'DraftKings market capture must remain a separate price gate.');
requireRule(policy.sourceRules.independentAuditDepthMayDecreaseWhenMoreUserSourcesAreProvided === false, 'Independent audit depth must never shrink as supplied evidence grows.');
requireRule(policy.requiredChecks.some((check) => check.id === 'counter_case'), 'A disconfirming counter-case check is required.');
requireRule(policy.qualificationGate.qualificationRequires === 'PASS', 'Qualification must require an audit PASS.');
requireRule(policy.qualificationGate.realCardAllowedStatuses.length === 1 && policy.qualificationGate.realCardAllowedStatuses[0] === 'PASS', 'Real Card must accept only audit PASS.');
requireRule(stack.orderedFiles.length === 2, 'Prompt stack must contain the constitution and audit addendum.');

for (const file of stack.orderedFiles) {
  requireRule(fs.existsSync(file), `Prompt stack file is missing: ${file}`);
}

if (failures.length) {
  console.error(failures.map((failure) => `- ${failure}`).join('\n'));
  process.exit(1);
}

console.log(`Validated ${policy.version}: ${policy.sourceRules.minimumIndependentOrigins} independent origins and PASS-only qualification.`);
