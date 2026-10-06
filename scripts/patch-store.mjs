import fs from 'fs';

const content = fs.readFileSync('src/lib/data-store.ts', 'utf8');
const startMarker = '// Categorías del club:';
const endMarker = 'export const INITIAL_ARTICLES: Article[] = [';
const startIdx = content.indexOf(startMarker);
const endIdx = content.indexOf(endMarker);

if (startIdx === -1 || endIdx === -1) {
  console.error('Markers not found!');
  process.exit(1);
}

const replacement = `import {
  FAVB_CATEGORIES,
  FAVB_TEAMS,
  FAVB_PLAYERS,
  FAVB_STAFF,
  FAVB_MATCHES,
  FAVB_STANDINGS,
} from './favb-data';

export const INITIAL_CATEGORIES: Category[] = FAVB_CATEGORIES;
export const INITIAL_TEAMS: Team[] = FAVB_TEAMS;
export const INITIAL_PLAYERS: Player[] = FAVB_PLAYERS;
export const INITIAL_STAFF: Staff[] = FAVB_STAFF;
export const INITIAL_MATCHES: Match[] = FAVB_MATCHES;
export const INITIAL_STANDINGS: Standings[] = FAVB_STANDINGS;

`;

const newContent = content.substring(0, startIdx) + replacement + content.substring(endIdx);
fs.writeFileSync('src/lib/data-store.ts', newContent, 'utf8');
console.log('src/lib/data-store.ts updated successfully!');
