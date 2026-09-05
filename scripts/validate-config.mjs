import fs from 'node:fs';

const policyPath = 'config/candidate-discovery-policy.v0.2.json';
const stackPath = 'config/prompt-stack.v5.1.json';
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
requireRule(stack.orderedFiles.length === 1, 'Prompt stack must contain only the consolidated v5.1 constitution.');
requireRule(stack.version === '5.1', 'Prompt stack must use the current v5.1 package.');

for (const file of stack.orderedFiles) {
  requireRule(fs.existsSync(file), `Prompt stack file is missing: ${file}`);
}

const masterPrompt = fs.readFileSync(stack.orderedFiles[0], 'utf8');
for (const requiredSection of [
  'Supersedes: v5.0, v4.1, and all prior master prompts',
  '3A. SOURCE-BLIND AUDIT / EXTERNAL-SOURCE FIREWALL',
  '17. PAPER / SHADOW LAB — BROAD R&D SANDBOX',
  '19. PAPER → SHADOW → MAIN-CARD PROMOTION',
  '37C. EVIDENCE CLUSTERS / DE-DUPLICATION',
  "37D. COUNTER-CASE / DEVIL'S-ADVOCATE GATE",
  '37E. GLOBAL SLATE RANKING / COMPLEXITY BUDGET',
  '37F. SELECTION REGRET / PORTFOLIO-GATE AUDIT',
  '37G. REAL MONEY = PRODUCTION; PAPER = R&D',
  '37H. SETUP QUALITY, PROBABILITY, VALUE, CONFIDENCE, AND OVERLAY GRADE',
  '37I. SIX-QUESTION PRE-BET DECISION CORE',
  '37K. BOOSTED-PARLAY LEVERAGE RULE',
  '38. OVERLAY WEBSITE — PRIMARY OPERATING SURFACE',
]) {
  requireRule(masterPrompt.includes(requiredSection), `Master prompt is missing required rule: ${requiredSection}`);
}

if (failures.length) {
  console.error(failures.map((failure) => `- ${failure}`).join('\n'));
  process.exit(1);
}

console.log(`Validated ${policy.version} and ${discoveryEval.cases.length} anti-anchoring eval cases.`);
