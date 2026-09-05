import fs from 'node:fs';

const policyPath = 'config/candidate-discovery-policy.v0.2.json';
const stackPath = 'config/prompt-stack.v4.3.json';
const evalPath = 'config/evals/candidate-discovery.v0.1.json';
const policy = JSON.parse(fs.readFileSync(policyPath, 'utf8'));
const stack = JSON.parse(fs.readFileSync(stackPath, 'utf8'));
const discoveryEval = JSON.parse(fs.readFileSync(evalPath, 'utf8'));
const failures = [];

function requireRule(condition, message) {
  if (!condition) failures.push(message);
}

requireRule(policy.discovery.scope === 'full_eligible_daily_slate', 'Discovery must cover the full eligible daily slate.');
requireRule(policy.discovery.requiredMode === 'independent_then_compare', 'Independent discovery must happen before supplied-card comparison.');
requireRule(policy.discovery.suppliedCardsMaySeedCandidateUniverse === false, 'Supplied cards must not define the candidate universe.');
requireRule(policy.discovery.suppliedCardsMayReceivePreferentialRanking === false, 'Supplied cards must not receive preferential ranking.');
requireRule(policy.discovery.moreSuppliedCardsMayReduceIndependentDiscovery === false, 'More supplied cards must not reduce independent discovery.');
requireRule(policy.candidateOrigins.includes('INDEPENDENT') && policy.candidateOrigins.includes('SUPPLIED') && policy.candidateOrigins.includes('BOTH'), 'Candidate origins must distinguish independent, supplied, and overlap discoveries.');
requireRule(policy.presentation.singleRankedList === true && policy.presentation.showOriginOnEveryCandidate === true, 'The final ranked list must show every candidate origin.');
requireRule(policy.outputContract.includes('slateCoverage') && policy.outputContract.includes('independentCandidates'), 'Output must expose slate coverage and independently discovered candidates.');
requireRule(discoveryEval.cases.some((testCase) => testCase.id === 'find-stronger-unlisted-candidate'), 'Discovery eval must test an unlisted stronger candidate.');
requireRule(discoveryEval.cases.some((testCase) => testCase.id === 'allow-empty-shortlist'), 'Discovery eval must allow an honest empty shortlist.');
requireRule(stack.orderedFiles.length === 2, 'Prompt stack must contain the constitution and candidate-discovery addendum.');
requireRule(stack.version === '4.3', 'Prompt stack must use the current v4.3 package.');

for (const file of stack.orderedFiles) {
  requireRule(fs.existsSync(file), `Prompt stack file is missing: ${file}`);
}

const masterPrompt = fs.readFileSync(stack.orderedFiles[0], 'utf8');
for (const requiredSection of [
  '59. SOURCE-BLIND INDEPENDENT AUDIT',
  '60. EXTERNAL-SOURCE FIREWALL',
  '62. STANDALONE QUALIFICATION AND FROZEN RANKINGS',
  '63. CAUSAL / CORRELATION REASONING',
  '64. BROAD THESIS VS NARROW MARKET',
  '65. SOURCE-VS-SYSTEM CHALLENGER TRACKING',
  '67. EXECUTION RECEIPT',
]) {
  requireRule(masterPrompt.includes(requiredSection), `Master prompt is missing required rule: ${requiredSection}`);
}

if (failures.length) {
  console.error(failures.map((failure) => `- ${failure}`).join('\n'));
  process.exit(1);
}

console.log(`Validated ${policy.version} and ${discoveryEval.cases.length} anti-anchoring eval cases.`);
