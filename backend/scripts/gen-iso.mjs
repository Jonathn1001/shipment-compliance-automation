// One-time generator for ISO 3166-1 (country) and ISO 4217 (currency) snapshots.
// Country display names come from node's built-in Intl.DisplayNames; currency
// codes come from Intl.supportedValuesOf('currency') (the runtime's ISO 4217 set).
// Not run at request time — output is committed JSON, refreshed by re-running this.
import { writeFileSync } from 'node:fs';

const OUT_DIR = process.argv[2];
if (!OUT_DIR) throw new Error('usage: node gen-iso.mjs <outDir>');

// Canonical ISO 3166-1 alpha-2 officially-assigned code list (249).
const ALPHA2 =
  'AD AE AF AG AI AL AM AO AQ AR AS AT AU AW AX AZ BA BB BD BE BF BG BH BI BJ BL BM BN BO BQ BR BS BT BV BW BY BZ CA CC CD CF CG CH CI CK CL CM CN CO CR CU CV CW CX CY CZ DE DJ DK DM DO DZ EC EE EG EH ER ES ET FI FJ FK FM FO FR GA GB GD GE GF GG GH GI GL GM GN GP GQ GR GS GT GU GW GY HK HM HN HR HT HU ID IE IL IM IN IO IQ IR IS IT JE JM JO JP KE KG KH KI KM KN KP KR KW KY KZ LA LB LC LI LK LR LS LT LU LV LY MA MC MD ME MF MG MH MK ML MM MN MO MP MQ MR MS MT MU MV MW MX MY MZ NA NC NE NF NG NI NL NO NP NR NU NZ OM PA PE PF PG PH PK PL PM PN PR PS PT PW PY QA RE RO RS RU RW SA SB SC SD SE SG SH SI SJ SK SL SM SN SO SR SS ST SV SX SY SZ TC TD TF TG TH TJ TK TL TM TN TO TR TT TV TW TZ UA UG UM US UY UZ VA VC VE VG VI VN VU WF WS YE YT ZA ZM ZW'.split(
    ' ',
  );

const regionNames = new Intl.DisplayNames(['en'], { type: 'region' });
const countries = {};
for (const code of ALPHA2) {
  const name = regionNames.of(code);
  if (!name || name === code) throw new Error(`no display name for region ${code}`);
  countries[code] = name;
}

const currencyNames = new Intl.DisplayNames(['en'], { type: 'currency' });
const currencies = {};
for (const code of Intl.supportedValuesOf('currency')) {
  const name = currencyNames.of(code);
  currencies[code] = name && name !== code ? name : code;
}

const stamp = new Date().toISOString().slice(0, 10);

writeFileSync(
  `${OUT_DIR}/iso-3166.json`,
  JSON.stringify(
    {
      _note: `Snapshot of ISO 3166-1 alpha-2 country codes (officially assigned). Codes are the canonical ISO list; English display names from node Intl.DisplayNames. Not a live lookup. Generated ${stamp} by scripts/gen-iso.mjs; refresh by re-running.`,
      countries,
    },
    null,
    2,
  ) + '\n',
);

writeFileSync(
  `${OUT_DIR}/iso-4217.json`,
  JSON.stringify(
    {
      _note: `Snapshot of ISO 4217 currency codes from node Intl.supportedValuesOf('currency'); English names from Intl.DisplayNames. Not a live lookup. Generated ${stamp} by scripts/gen-iso.mjs; refresh by re-running.`,
      currencies,
    },
    null,
    2,
  ) + '\n',
);

console.log(
  `wrote ${Object.keys(countries).length} countries, ${Object.keys(currencies).length} currencies`,
);
