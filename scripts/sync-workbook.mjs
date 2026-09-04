import { readFile, writeFile } from 'node:fs/promises';
import { strFromU8, strToU8, unzipSync, zipSync } from 'fflate';

const workbookPath = 'data/imports/sports_betting_backtest_tracker_v0_45.xlsx';
const slatePath = process.argv[2] ?? 'data/slates/current.json';
const slate = JSON.parse(await readFile(slatePath, 'utf8'));
const shortVerifiedAt = `${slate.lastVerified.slice(0, 10)} ${slate.lastVerified.slice(11, 16)}Z`;

if (!Array.isArray(slate.leagues) || slate.leagues.length !== 13) {
  throw new Error('Workbook sync requires the configured 13-league slate.');
}

const files = unzipSync(new Uint8Array(await readFile(workbookPath)));
const workbookXml = strFromU8(files['xl/workbook.xml']);
const sheetMatch = workbookXml.match(/<x:sheet\s+name="Daily Slate"[^>]*r:id="([^"]+)"/);
if (!sheetMatch) throw new Error('Daily Slate worksheet is missing from the tracker.');

const relationshipsXml = strFromU8(files['xl/_rels/workbook.xml.rels']);
const relationshipPattern = new RegExp(`<Relationship[^>]*Target="([^"]+)"[^>]*Id="${sheetMatch[1]}"[^>]*/>`);
const relationshipMatch = relationshipsXml.match(relationshipPattern);
if (!relationshipMatch) throw new Error('Daily Slate worksheet relationship is missing.');
const worksheetPath = relationshipMatch[1].replace(/^\//, '');

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
await writeFile(workbookPath, zipSync(files, { level: 6 }));
console.log(`Synced ${workbookPath} from ${slate.date} (${slate.leagues.length} leagues).`);
