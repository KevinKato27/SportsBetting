import { readFile, writeFile } from 'node:fs/promises';
import { strFromU8, strToU8, unzipSync, zipSync } from 'fflate';

const workbookPath = 'data/imports/sports_betting_backtest_tracker_v0_45.xlsx';
const slatePath = process.argv[2] ?? 'data/slates/current.json';
const slate = JSON.parse(await readFile(slatePath, 'utf8'));
const chatIntake = JSON.parse(await readFile('data/chat-intake/current.json', 'utf8'));
const morningScan = JSON.parse(await readFile('data/morning-scan/current.json', 'utf8'));
const researchBoard = JSON.parse(await readFile('data/research-board/current.json', 'utf8'));
const shortVerifiedAt = `${slate.lastVerified.slice(0, 10)} ${slate.lastVerified.slice(11, 16)}Z`;

if (!Array.isArray(slate.leagues) || slate.leagues.length !== 13) {
  throw new Error('Workbook sync requires the configured 13-league slate.');
}

const files = unzipSync(new Uint8Array(await readFile(workbookPath)));
const workbookXml = strFromU8(files['xl/workbook.xml']);
const relationshipsXml = strFromU8(files['xl/_rels/workbook.xml.rels']);

function worksheetPathFor(name) {
  const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const sheetMatch = workbookXml.match(new RegExp(`<x:sheet\\s+name="${escapedName}"[^>]*r:id="([^"]+)"`));
  if (!sheetMatch) throw new Error(`${name} worksheet is missing from the tracker.`);
  const relationshipPattern = new RegExp(`<Relationship[^>]*Target="([^"]+)"[^>]*Id="${sheetMatch[1]}"[^>]*/>`);
  const relationshipMatch = relationshipsXml.match(relationshipPattern);
  if (!relationshipMatch) throw new Error(`${name} worksheet relationship is missing.`);
  return relationshipMatch[1].replace(/^\//, '');
}

const worksheetPath = worksheetPathFor('Daily Slate');

function escapeXml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}

function stringCell(reference, style, value) {
  const text = value == null ? '' : String(value);
  return text
    ? `<x:c r="${reference}" s="${style}" t="str"><x:v>${escapeXml(text)}</x:v></x:c>`
    : `<x:c r="${reference}" s="${style}" t="str" />`;
}

function numberCell(reference, style, value) {
  return `<x:c r="${reference}" s="${style}" t="n"><x:v>${Number(value) || 0}</x:v></x:c>`;
}

function row(number, height, cells) {
  return `<x:row r="${number}" ht="${height}" customHeight="1">${cells.join('')}</x:row>`;
}

const columns = 'ABCDEFGHIJKLM'.split('');
const headers = [
  'Sport', 'Competition', 'Status', 'Games', 'Completed', 'Live', 'Scheduled',
  'Earliest start', 'Provider', 'Source URL', 'Endpoint', 'Verified at', 'Notes / error',
];
const rows = [];
rows.push(row(1, 28, [stringCell('A1', 393, 'Current Daily Slate')]));
rows.push(row(2, 22, [
  stringCell('A2', 394, 'Date'),
  stringCell('B2', 395, slate.date),
  stringCell('C2', 394, 'Last verified'),
  stringCell('D2', 395, shortVerifiedAt),
  stringCell('E2', 394, 'Gate'),
  stringCell('F2', 395, slate.gate),
  stringCell('G2', 394, 'Timezone'),
  stringCell('H2', 395, slate.timezone),
]));
rows.push(row(4, 30, headers.map((value, index) => stringCell(`${columns[index]}4`, 396, value))));

slate.leagues.forEach((league, index) => {
  const rowNumber = index + 5;
  const textStyle = rowNumber % 2 === 0 ? 399 : 397;
  const numberStyle = rowNumber % 2 === 0 ? 400 : 398;
  const values = [
    league.sport,
    league.league,
    league.status,
    league.games,
    league.completed,
    league.live,
    league.scheduled,
    league.earliestStart ?? '',
    league.provider,
    league.source,
    league.endpoint,
    league.sourceVerifiedAt ? `UTC ${league.sourceVerifiedAt}` : '',
    league.error ?? '',
  ];
  rows.push(row(rowNumber, 32, values.map((value, columnIndex) => {
    const reference = `${columns[columnIndex]}${rowNumber}`;
    return columnIndex >= 3 && columnIndex <= 6
      ? numberCell(reference, numberStyle, value)
      : stringCell(reference, textStyle, value);
  })));
});

rows.push(row(19, 32, [stringCell('A19', 401, 'Soccer scope: EPL, La Liga, Bundesliga, Serie A, Ligue 1, UEFA Champions League and UEFA Europa League. MLS and Saudi Pro League are excluded.')]));
rows.push(row(20, 38, [stringCell('A20', 402, 'Schedule and result facts only. Odds, lineups, injuries, weather, promotions, bankroll and GPT grades remain unavailable until separately verified. This worksheet cannot make a wager FINAL.')]));

const worksheetXml = `<?xml version="1.0" encoding="utf-8"?><x:worksheet xmlns:x="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><x:sheetPr><x:tabColor rgb="FF16A3B6" /></x:sheetPr><x:sheetViews><x:sheetView showGridLines="0" workbookViewId="0"><x:pane ySplit="4" topLeftCell="A5" activePane="bottomLeft" state="frozen" /></x:sheetView></x:sheetViews><x:sheetFormatPr defaultRowHeight="15" /><x:cols><x:col min="1" max="1" width="13" hidden="0" customWidth="1" /><x:col min="2" max="2" width="16" hidden="0" customWidth="1" /><x:col min="3" max="3" width="13" hidden="0" customWidth="1" /><x:col min="4" max="4" width="20" hidden="0" customWidth="1" /><x:col min="5" max="5" width="10" hidden="0" customWidth="1" /><x:col min="6" max="6" width="14" hidden="0" customWidth="1" /><x:col min="7" max="7" width="10" hidden="0" customWidth="1" /><x:col min="8" max="8" width="18" hidden="0" customWidth="1" /><x:col min="9" max="9" width="22" hidden="0" customWidth="1" /><x:col min="10" max="10" width="42" hidden="0" customWidth="1" /><x:col min="11" max="11" width="58" hidden="0" customWidth="1" /><x:col min="12" max="12" width="25" hidden="0" customWidth="1" /><x:col min="13" max="13" width="28" hidden="0" customWidth="1" /></x:cols><x:sheetData>${rows.join('')}</x:sheetData><x:mergeCells count="3"><x:mergeCell ref="A1:M1" /><x:mergeCell ref="A19:M19" /><x:mergeCell ref="A20:M20" /></x:mergeCells><x:pageMargins left="0.7" right="0.7" top="0.75" bottom="0.75" header="0.3" footer="0.3" /></x:worksheet>`;

files[worksheetPath] = strToU8(worksheetXml);

const intakeWorksheetPath = worksheetPathFor('Chat Intake');
const intakeWorksheetXml = strFromU8(files[intakeWorksheetPath]);
const styleAt = (reference, fallback) => intakeWorksheetXml.match(new RegExp(`<x:c[^>]*r="${reference}"[^>]*s="(\\d+)"`))?.[1] ?? fallback;
const intakeStyles = {
  title: styleAt('A1', '0'),
  note: styleAt('A2', '0'),
  header: styleAt('A4', '0'),
  body: styleAt('A5', '0'),
};
const intakeHeaders = ['Date', 'Sport', 'League', 'Slip', 'Slip status', 'Entity', 'Event', 'Market', 'Threshold', 'Side', 'Displayed price', 'Sportsbook', 'Origin', 'Verification', 'Source label', 'Audit note', 'Placement evidence'];
const intakeColumns = 'ABCDEFGHIJKLMNOPQ'.split('');
const intakeRows = [
  row(1, 28, [stringCell('A1', intakeStyles.title, 'Current Chat Intake')]),
  row(2, 34, [stringCell('A2', intakeStyles.note, 'Public-safe structured summaries only. Recheck all chat-reported facts before use.')]),
  row(4, 30, intakeHeaders.map((value, index) => stringCell(`${intakeColumns[index]}4`, intakeStyles.header, value))),
];
let intakeRowNumber = 5;
for (const slip of chatIntake.slips) {
  for (const leg of slip.legs) {
    const values = [slip.date, slip.sport, slip.league, slip.title, slip.status, leg.entity, leg.event, leg.market, leg.threshold ?? '', leg.side, leg.displayedPrice ?? '', slip.sportsbook, slip.origin, slip.verificationStatus, slip.sourceLabel, slip.auditSummary, slip.placementEvidence];
    intakeRows.push(row(intakeRowNumber, 42, values.map((value, index) => stringCell(`${intakeColumns[index]}${intakeRowNumber}`, intakeStyles.body, value))));
    intakeRowNumber += 1;
  }
}
const intakeSheetData = `<x:sheetData>${intakeRows.join('')}</x:sheetData>`;
const intakeLastRow = Math.max(4, intakeRowNumber - 1);
const updatedIntakeWorksheetXml = intakeWorksheetXml
  .replace(/<x:dimension ref="[^"]+"\s*\/>/, `<x:dimension ref="A1:Q${intakeLastRow}" />`)
  .replace(/<x:sheetData>[\s\S]*?<\/x:sheetData>/, intakeSheetData);
files[intakeWorksheetPath] = strToU8(updatedIntakeWorksheetXml);

const morningWorksheetPath = worksheetPathFor('Morning Scan');
const morningWorksheetXml = strFromU8(files[morningWorksheetPath]);
const morningStyleAt = (reference, fallback) => morningWorksheetXml.match(new RegExp(`<x:c[^>]*r="${reference}"[^>]*s="(\\d+)"`))?.[1] ?? fallback;
const morningStyles = {
  title: morningStyleAt('A1', '0'),
  note: morningStyleAt('A2', '0'),
  header: morningStyleAt('A4', '0'),
  body: morningStyleAt('A5', '0'),
};
const morningHeaders = ['Date', 'Sport', 'League', 'Event', 'Start', 'Projection status', 'Projected participant', 'Role / lineup slot', 'Projection basis', 'Candidate market', 'Origin', 'Source URL'];
const morningColumns = 'ABCDEFGHIJKL'.split('');
const morningRows = [
  row(1, 28, [stringCell('A1', morningStyles.title, 'Morning Slate Scan')]),
  row(2, 32, [stringCell('A2', morningStyles.note, 'Prospective lineups and independent candidates. Projections are never confirmed lineups; missing evidence remains blank.')]),
  row(4, 30, morningHeaders.map((value, index) => stringCell(`${morningColumns[index]}4`, morningStyles.header, value))),
];
let morningRowNumber = 5;
for (const game of morningScan.games) {
  const participants = game.projectedParticipants.length ? game.projectedParticipants : [{ name: '', role: '', basis: '' }];
  for (const participant of participants) {
    const values = [morningScan.date, game.sport, game.league, game.event, game.startTime, game.projectionStatus, participant.name, participant.role, participant.basis, '', '', game.sources?.[0] ?? ''];
    morningRows.push(row(morningRowNumber, 38, values.map((value, index) => stringCell(`${morningColumns[index]}${morningRowNumber}`, morningStyles.body, value))));
    morningRowNumber += 1;
  }
}
for (const candidate of morningScan.candidates) {
  const values = [morningScan.date, candidate.sport ?? '', candidate.league ?? '', candidate.event ?? '', '', 'CANDIDATE', candidate.entity, candidate.role ?? '', candidate.rationale ?? '', candidate.marketFamily, candidate.origin, candidate.sources?.[0] ?? ''];
  morningRows.push(row(morningRowNumber, 38, values.map((value, index) => stringCell(`${morningColumns[index]}${morningRowNumber}`, morningStyles.body, value))));
  morningRowNumber += 1;
}
if (morningRowNumber === 5) {
  const values = [morningScan.date, '', '', '', '', morningScan.status, '', '', morningScan.notes, '', '', ''];
  morningRows.push(row(5, 38, values.map((value, index) => stringCell(`${morningColumns[index]}5`, morningStyles.body, value))));
  morningRowNumber = 6;
}
const morningSheetData = `<x:sheetData>${morningRows.join('')}</x:sheetData>`;
const morningLastRow = morningRowNumber - 1;
const updatedMorningWorksheetXml = morningWorksheetXml
  .replace(/<x:dimension ref="[^"]+"\s*\/>/, `<x:dimension ref="A1:L${morningLastRow}" />`)
  .replace(/<x:sheetData>[\s\S]*?<\/x:sheetData>/, morningSheetData);
files[morningWorksheetPath] = strToU8(updatedMorningWorksheetXml);

const boardWorksheetPath = worksheetPathFor('Today Board');
const boardWorksheetXml = strFromU8(files[boardWorksheetPath]);
const boardStyleAt = (reference, fallback) => boardWorksheetXml.match(new RegExp(`<x:c[^>]*r="${reference}"[^>]*s="(\\d+)"`))?.[1] ?? fallback;
const boardStyles = {
  title: boardStyleAt('A1', '0'),
  note: boardStyleAt('A2', '0'),
  header: 'ABCDEFGHIJK'.split('').map((column) => boardStyleAt(`${column}4`, '0')),
  real: 'ABCDEFGHIJK'.split('').map((column) => boardStyleAt(`${column}5`, '0')),
  final: 'ABCDEFGHIJK'.split('').map((column) => boardStyleAt(`${column}8`, '0')),
  paper: 'ABCDEFGHIJK'.split('').map((column) => boardStyleAt(`${column}9`, '0')),
};
const boardHeaders = ['Bucket', 'ID', 'Sport', 'Entity / Ticket', 'Event / Promo', 'Market / Legs', 'Price', 'Chat Grade', 'Leg Grade /100', 'Confidence /100', 'Status / Research Read'];
const boardColumns = 'ABCDEFGHIJK'.split('');
const boardRows = [
  row(1, 30, [stringCell('A1', boardStyles.title, 'TODAY BOARD')]),
  row(2, 22, [stringCell('A2', boardStyles.note, `Daily real, final-check, and paper research — ${researchBoard.date}`)]),
  row(4, 32, boardHeaders.map((value, index) => stringCell(`${boardColumns[index]}4`, boardStyles.header[index], value))),
];
let boardRowNumber = 5;
const appendBoardRow = (styles, values) => {
  boardRows.push(row(boardRowNumber, 42, values.map((value, index) => stringCell(`${boardColumns[index]}${boardRowNumber}`, styles[index], value))));
  boardRowNumber += 1;
};
for (const item of researchBoard.realCard) appendBoardRow(boardStyles.real, ['REAL', item.id, item.sport, item.title, item.promo, item.legs.join(' | '), item.price, item.chatGrade ?? '', item.legGrade ?? '', item.confidence ?? '', `${item.status} — ${item.summary}`]);
for (const item of researchBoard.activeCandidates) appendBoardRow(boardStyles.final, ['FINAL CHECK', item.id, item.sport, item.entity, item.event, item.market, item.price, item.chatGrade ?? '', item.legGrade ?? '', item.confidence ?? '', `${item.status} — ${item.rationale}`]);
for (const item of researchBoard.paperCandidates) appendBoardRow(boardStyles.paper, ['PAPER', item.id, item.sport, item.entity, item.event, item.market, item.price, item.chatGrade ?? '', item.legGrade ?? '', item.confidence ?? '', `${item.experiment} — ${item.rationale}`]);
const boardLastRow = boardRowNumber - 1;
const updatedBoardWorksheetXml = boardWorksheetXml
  .replace(/<x:dimension ref="[^"]+"\s*\/>/, `<x:dimension ref="A1:K${boardLastRow}" />`)
  .replace(/<x:sheetData>[\s\S]*?<\/x:sheetData>/, `<x:sheetData>${boardRows.join('')}</x:sheetData>`);
files[boardWorksheetPath] = strToU8(updatedBoardWorksheetXml);

await writeFile(workbookPath, zipSync(files, { level: 6 }));
console.log(`Synced ${workbookPath} from ${slate.date} (${slate.leagues.length} leagues, ${chatIntake.slips.length} chat slips, ${morningScan.games.length} morning games, ${boardLastRow - 4} board rows).`);
