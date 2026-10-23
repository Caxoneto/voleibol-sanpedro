import { Category, Team, Player, Staff, Match, Standings } from './types';

export interface AfadeGroupMeta {
  categoryId: string;
  teamId: string;
  name: string;
  gid: number;
  camId: number;
  fid: number;
}

export const AFADE_GROUPS_META: AfadeGroupMeta[] = [
  {
    "categoryId": "cat-senior-fem-afade",
    "teamId": "team-senior-fem-afade",
    "name": "Senior Femenino AFADE",
    "gid": 2035,
    "camId": 272,
    "fid": 848
  },
  {
    "categoryId": "cat-juvenil-fem-afade",
    "teamId": "team-juvenil-fem-afade",
    "name": "Juvenil Femenino AFADE",
    "gid": 2041,
    "camId": 272,
    "fid": 851
  },
  {
    "categoryId": "cat-infantil-fem-afade",
    "teamId": "team-infantil-fem-afade",
    "name": "Infantil Femenino AFADE",
    "gid": 2043,
    "camId": 272,
    "fid": 852
  }
];

export const AFADE_CATEGORIES: Category[] = [
  {
    "id": "cat-senior-fem-afade",
    "name": "Senior Femenino AFADE",
    "slug": "senior-femenino-afade",
    "order": 12,
    "description": "Liga AFADE Málaga - Senior Fem Grupo B",
    "association": "AFADE"
  },
  {
    "id": "cat-juvenil-fem-afade",
    "name": "Juvenil Femenino AFADE",
    "slug": "juvenil-femenino-afade",
    "order": 13,
    "description": "Liga AFADE Málaga - Juvenil Fem Grupo B",
    "association": "AFADE"
  },
  {
    "id": "cat-infantil-fem-afade",
    "name": "Infantil Femenino AFADE",
    "slug": "infantil-femenino-afade",
    "order": 14,
    "description": "Liga AFADE Málaga - Infantil Fem Grupo B",
    "association": "AFADE"
  }
];

export const AFADE_TEAMS: Team[] = [
  {
    "id": "team-senior-fem-afade",
    "categoryId": "cat-senior-fem-afade",
    "name": "Senior Femenino AFADE",
    "division": "Liga AFADE Málaga - Senior Fem Grupo B",
    "season": "2026/2027"
  },
  {
    "id": "team-juvenil-fem-afade",
    "categoryId": "cat-juvenil-fem-afade",
    "name": "Juvenil Femenino AFADE",
    "division": "Liga AFADE Málaga - Juvenil Fem Grupo B",
    "season": "2026/2027"
  },
  {
    "id": "team-infantil-fem-afade",
    "categoryId": "cat-infantil-fem-afade",
    "name": "Infantil Femenino AFADE",
    "division": "Liga AFADE Málaga - Infantil Fem Grupo B",
    "season": "2026/2027"
  }
];

export const AFADE_PLAYERS: Player[] = [];

export const AFADE_STAFF: Staff[] = [];

export const AFADE_MATCHES: Match[] = [
  {
    "id": "afade-2035-j1",
    "teamId": "team-senior-fem-afade",
    "round": 1,
    "homeTeamName": "CD Voleibol San Pedro",
    "awayTeamName": "Fundación Victoria",
    "isClubHome": true,
    "venueName": "Pabellón de Deportes Sergio Scariolo (Calle Lyon, San Pedro Alcántara , 29670)",
    "matchDate": "2026-10-18T15:30:00.000Z",
    "status": "FINISHED",
    "statusText": "Finalizado",
    "setScores": [
      {
        "home": 25,
        "away": 21
      },
      {
        "home": 20,
        "away": 25
      },
      {
        "home": 25,
        "away": 23
      },
      {
        "home": 22,
        "away": 25
      },
      {
        "home": 13,
        "away": 15
      }
    ],
    "favbMatchUrl": "https://ligaafade.es/resultados?deporte=8&fase=848&grupo=2035",
    "isFeatured": false,
    "homeScore": 2,
    "awayScore": 3
  },
  {
    "id": "afade-2035-j2",
    "teamId": "team-senior-fem-afade",
    "round": 2,
    "homeTeamName": "CD Soho Málaga",
    "awayTeamName": "CD Voleibol San Pedro",
    "isClubHome": false,
    "venueName": "IES Christine Picasso (Calle Rachmaninov, 4)",
    "matchDate": "2026-10-22T18:30:00.000Z",
    "status": "FINISHED",
    "statusText": "Finalizado",
    "setScores": [
      {
        "home": 25,
        "away": 18
      },
      {
        "home": 25,
        "away": 20
      },
      {
        "home": 21,
        "away": 25
      },
      {
        "home": 25,
        "away": 19
      }
    ],
    "favbMatchUrl": "https://ligaafade.es/resultados?deporte=8&fase=848&grupo=2035",
    "isFeatured": false,
    "homeScore": 3,
    "awayScore": 1
  },
  {
    "id": "afade-2035-j3",
    "teamId": "team-senior-fem-afade",
    "round": 3,
    "homeTeamName": "CD Voleibol San Pedro",
    "awayTeamName": "(Descansa)",
    "isClubHome": true,
    "venueName": "Pabellón de Deportes Sergio Scariolo",
    "matchDate": "2026-11-01T12:00:00.000Z",
    "status": "SCHEDULED",
    "statusText": "Programado",
    "setScores": [],
    "favbMatchUrl": "https://ligaafade.es/resultados?deporte=8&fase=848&grupo=2035",
    "isFeatured": false
  },
  {
    "id": "afade-2035-j4",
    "teamId": "team-senior-fem-afade",
    "round": 4,
    "homeTeamName": "CD Voleibol San Pedro",
    "awayTeamName": "VAM",
    "isClubHome": true,
    "venueName": "Pabellón de Deportes Sergio Scariolo (Calle Lyon, San Pedro Alcántara , 29670)",
    "matchDate": "2026-11-08T19:00:00.000Z",
    "status": "SCHEDULED",
    "statusText": "Programado",
    "setScores": [],
    "favbMatchUrl": "https://ligaafade.es/resultados?deporte=8&fase=848&grupo=2035",
    "isFeatured": false
  },
  {
    "id": "afade-2035-j5",
    "teamId": "team-senior-fem-afade",
    "round": 5,
    "homeTeamName": "La Coracha B",
    "awayTeamName": "CD Voleibol San Pedro",
    "isClubHome": false,
    "venueName": "Colegio Divino Pastor (Calle Angelillo de Triana, 2)",
    "matchDate": "2026-11-22T17:00:00.000Z",
    "status": "SCHEDULED",
    "statusText": "Programado",
    "setScores": [],
    "favbMatchUrl": "https://ligaafade.es/resultados?deporte=8&fase=848&grupo=2035",
    "isFeatured": false
  },
  {
    "id": "afade-2035-j6",
    "teamId": "team-senior-fem-afade",
    "round": 6,
    "homeTeamName": "CD Voleibol San Pedro",
    "awayTeamName": "Just Voley B",
    "isClubHome": true,
    "venueName": "Pabellón de Deportes Sergio Scariolo (Calle Lyon, San Pedro Alcántara , 29670)",
    "matchDate": "2026-11-29T19:00:00.000Z",
    "status": "SCHEDULED",
    "statusText": "Programado",
    "setScores": [],
    "favbMatchUrl": "https://ligaafade.es/resultados?deporte=8&fase=848&grupo=2035",
    "isFeatured": false
  },
  {
    "id": "afade-2035-j7",
    "teamId": "team-senior-fem-afade",
    "round": 7,
    "homeTeamName": "Just Voley C",
    "awayTeamName": "CD Voleibol San Pedro",
    "isClubHome": false,
    "venueName": "Pabellón Colegio San José (Calle Argentea, 20)",
    "matchDate": "2026-12-02T20:00:00.000Z",
    "status": "SCHEDULED",
    "statusText": "Programado",
    "setScores": [],
    "favbMatchUrl": "https://ligaafade.es/resultados?deporte=8&fase=848&grupo=2035",
    "isFeatured": false
  },
  {
    "id": "afade-2041-j1",
    "teamId": "team-juvenil-fem-afade",
    "round": 1,
    "homeTeamName": "CD Voleibol San Pedro",
    "awayTeamName": "CD Unión Malagueña Voleibol",
    "isClubHome": true,
    "venueName": "Pabellón de Deportes Sergio Scariolo (Calle Lyon, San Pedro Alcántara , 29670)",
    "matchDate": "2026-10-31T12:00:00.000Z",
    "status": "SCHEDULED",
    "statusText": "Programado",
    "setScores": [],
    "favbMatchUrl": "https://ligaafade.es/resultados?deporte=8&fase=851&grupo=2041",
    "isFeatured": false
  },
  {
    "id": "afade-2041-j2",
    "teamId": "team-juvenil-fem-afade",
    "round": 2,
    "homeTeamName": "CD Voleibol San Pedro",
    "awayTeamName": "Fundación Victoria A",
    "isClubHome": true,
    "venueName": "Pabellón de Deportes Sergio Scariolo (Calle Lyon, San Pedro Alcántara , 29670)",
    "matchDate": "2026-11-08T17:00:00.000Z",
    "status": "SCHEDULED",
    "statusText": "Programado",
    "setScores": [],
    "favbMatchUrl": "https://ligaafade.es/resultados?deporte=8&fase=851&grupo=2041",
    "isFeatured": false
  },
  {
    "id": "afade-2041-j3",
    "teamId": "team-juvenil-fem-afade",
    "round": 3,
    "homeTeamName": "Asunción",
    "awayTeamName": "CD Voleibol San Pedro",
    "isClubHome": false,
    "venueName": "Colegio La Asunción (Calle Manuel de Palacio, 15, 29017)",
    "matchDate": "2026-11-14T15:00:00.000Z",
    "status": "SCHEDULED",
    "statusText": "Programado",
    "setScores": [],
    "favbMatchUrl": "https://ligaafade.es/resultados?deporte=8&fase=851&grupo=2041",
    "isFeatured": false
  },
  {
    "id": "afade-2041-j4",
    "teamId": "team-juvenil-fem-afade",
    "round": 4,
    "homeTeamName": "CD Voleibol San Pedro",
    "awayTeamName": "REAL Y CUBILES ASESORES",
    "isClubHome": true,
    "venueName": "Pabellón de Deportes Sergio Scariolo (Calle Lyon, San Pedro Alcántara , 29670)",
    "matchDate": "2026-11-29T17:00:00.000Z",
    "status": "SCHEDULED",
    "statusText": "Programado",
    "setScores": [],
    "favbMatchUrl": "https://ligaafade.es/resultados?deporte=8&fase=851&grupo=2041",
    "isFeatured": false
  },
  {
    "id": "afade-2041-j5",
    "teamId": "team-juvenil-fem-afade",
    "round": 5,
    "homeTeamName": "UDA Benalmádena",
    "awayTeamName": "CD Voleibol San Pedro",
    "isClubHome": false,
    "venueName": "IES Poetas Andaluces (Calle Medina Azahara, s/n, Arroyo de la Miel)",
    "matchDate": "2026-12-03T17:30:00.000Z",
    "status": "SCHEDULED",
    "statusText": "Programado",
    "setScores": [],
    "favbMatchUrl": "https://ligaafade.es/resultados?deporte=8&fase=851&grupo=2041",
    "isFeatured": false
  },
  {
    "id": "afade-2043-j1",
    "teamId": "team-infantil-fem-afade",
    "round": 1,
    "homeTeamName": "CD Voleibol San Pedro",
    "awayTeamName": "(Descansa)",
    "isClubHome": true,
    "venueName": "Pabellón de Deportes Sergio Scariolo",
    "matchDate": "2026-11-01T12:00:00.000Z",
    "status": "SCHEDULED",
    "statusText": "Programado",
    "setScores": [],
    "favbMatchUrl": "https://ligaafade.es/resultados?deporte=8&fase=852&grupo=2043",
    "isFeatured": false
  },
  {
    "id": "afade-2043-j2",
    "teamId": "team-infantil-fem-afade",
    "round": 2,
    "homeTeamName": "CD Voleibol San Pedro",
    "awayTeamName": "CD Forvoley",
    "isClubHome": true,
    "venueName": "Pabellón de Deportes Sergio Scariolo (Calle Lyon, San Pedro Alcántara , 29670)",
    "matchDate": "2026-11-08T15:00:00.000Z",
    "status": "SCHEDULED",
    "statusText": "Programado",
    "setScores": [],
    "favbMatchUrl": "https://ligaafade.es/resultados?deporte=8&fase=852&grupo=2043",
    "isFeatured": false
  },
  {
    "id": "afade-2043-j3",
    "teamId": "team-infantil-fem-afade",
    "round": 3,
    "homeTeamName": "La Coracha B",
    "awayTeamName": "CD Voleibol San Pedro",
    "isClubHome": false,
    "venueName": "Colegio Divino Pastor (Calle Angelillo de Triana, 2)",
    "matchDate": "2026-11-15T11:00:00.000Z",
    "status": "SCHEDULED",
    "statusText": "Programado",
    "setScores": [],
    "favbMatchUrl": "https://ligaafade.es/resultados?deporte=8&fase=852&grupo=2043",
    "isFeatured": false
  },
  {
    "id": "afade-2043-j4",
    "teamId": "team-infantil-fem-afade",
    "round": 4,
    "homeTeamName": "CD Voleibol San Pedro",
    "awayTeamName": "CD La Colina",
    "isClubHome": true,
    "venueName": "Pabellón de Deportes Sergio Scariolo (Calle Lyon, San Pedro Alcántara , 29670)",
    "matchDate": "2026-11-29T15:00:00.000Z",
    "status": "SCHEDULED",
    "statusText": "Programado",
    "setScores": [],
    "favbMatchUrl": "https://ligaafade.es/resultados?deporte=8&fase=852&grupo=2043",
    "isFeatured": false
  },
  {
    "id": "afade-2043-j5",
    "teamId": "team-infantil-fem-afade",
    "round": 5,
    "homeTeamName": "CV Cártama",
    "awayTeamName": "CD Voleibol San Pedro",
    "isClubHome": false,
    "venueName": "Ciudad Deportiva de Cártama (A-7057, Cártama)",
    "matchDate": "2026-12-11T17:30:00.000Z",
    "status": "SCHEDULED",
    "statusText": "Programado",
    "setScores": [],
    "favbMatchUrl": "https://ligaafade.es/resultados?deporte=8&fase=852&grupo=2043",
    "isFeatured": false
  }
];

export const AFADE_STANDINGS: Standings[] = [
  {
    "id": "st-cat-senior-fem-afade-1",
    "categoryId": "cat-senior-fem-afade",
    "teamName": "VAM",
    "isCurrentClub": false,
    "played": 1,
    "won": 1,
    "lost": 0,
    "setsFor": 3,
    "setsAgainst": 0,
    "points": 3
  },
  {
    "id": "st-cat-senior-fem-afade-2",
    "categoryId": "cat-senior-fem-afade",
    "teamName": "Just Voley B",
    "isCurrentClub": false,
    "played": 1,
    "won": 1,
    "lost": 0,
    "setsFor": 3,
    "setsAgainst": 1,
    "points": 3
  },
  {
    "id": "st-cat-senior-fem-afade-3",
    "categoryId": "cat-senior-fem-afade",
    "teamName": "CD Soho Málaga",
    "isCurrentClub": false,
    "played": 1,
    "won": 1,
    "lost": 0,
    "setsFor": 3,
    "setsAgainst": 1,
    "points": 3
  },
  {
    "id": "st-cat-senior-fem-afade-4",
    "categoryId": "cat-senior-fem-afade",
    "teamName": "Fundación Victoria",
    "isCurrentClub": false,
    "played": 1,
    "won": 1,
    "lost": 0,
    "setsFor": 3,
    "setsAgainst": 2,
    "points": 2
  },
  {
    "id": "st-cat-senior-fem-afade-5",
    "categoryId": "cat-senior-fem-afade",
    "teamName": "CD Voleibol San Pedro",
    "isCurrentClub": true,
    "played": 2,
    "won": 0,
    "lost": 2,
    "setsFor": 3,
    "setsAgainst": 6,
    "points": 1
  },
  {
    "id": "st-cat-senior-fem-afade-6",
    "categoryId": "cat-senior-fem-afade",
    "teamName": "La Coracha B",
    "isCurrentClub": false,
    "played": 1,
    "won": 0,
    "lost": 1,
    "setsFor": 1,
    "setsAgainst": 3,
    "points": 0
  },
  {
    "id": "st-cat-senior-fem-afade-7",
    "categoryId": "cat-senior-fem-afade",
    "teamName": "Just Voley C",
    "isCurrentClub": false,
    "played": 1,
    "won": 0,
    "lost": 1,
    "setsFor": 0,
    "setsAgainst": 3,
    "points": 0
  },
  {
    "id": "st-cat-juvenil-fem-afade-1",
    "categoryId": "cat-juvenil-fem-afade",
    "teamName": "Fundación Victoria A",
    "isCurrentClub": false,
    "played": 0,
    "won": 0,
    "lost": 0,
    "setsFor": 0,
    "setsAgainst": 0,
    "points": 0
  },
  {
    "id": "st-cat-juvenil-fem-afade-2",
    "categoryId": "cat-juvenil-fem-afade",
    "teamName": "CD Unión Malagueña Voleibol",
    "isCurrentClub": false,
    "played": 0,
    "won": 0,
    "lost": 0,
    "setsFor": 0,
    "setsAgainst": 0,
    "points": 0
  },
  {
    "id": "st-cat-juvenil-fem-afade-3",
    "categoryId": "cat-juvenil-fem-afade",
    "teamName": "UDA Benalmádena",
    "isCurrentClub": false,
    "played": 0,
    "won": 0,
    "lost": 0,
    "setsFor": 0,
    "setsAgainst": 0,
    "points": 0
  },
  {
    "id": "st-cat-juvenil-fem-afade-4",
    "categoryId": "cat-juvenil-fem-afade",
    "teamName": "CD Voleibol San Pedro",
    "isCurrentClub": true,
    "played": 0,
    "won": 0,
    "lost": 0,
    "setsFor": 0,
    "setsAgainst": 0,
    "points": 0
  },
  {
    "id": "st-cat-juvenil-fem-afade-5",
    "categoryId": "cat-juvenil-fem-afade",
    "teamName": "Asunción",
    "isCurrentClub": false,
    "played": 0,
    "won": 0,
    "lost": 0,
    "setsFor": 0,
    "setsAgainst": 0,
    "points": 0
  },
  {
    "id": "st-cat-juvenil-fem-afade-6",
    "categoryId": "cat-juvenil-fem-afade",
    "teamName": "REAL Y CUBILES ASESORES",
    "isCurrentClub": false,
    "played": 0,
    "won": 0,
    "lost": 0,
    "setsFor": 0,
    "setsAgainst": 0,
    "points": 0
  },
  {
    "id": "st-cat-infantil-fem-afade-1",
    "categoryId": "cat-infantil-fem-afade",
    "teamName": "La Coracha B",
    "isCurrentClub": false,
    "played": 0,
    "won": 0,
    "lost": 0,
    "setsFor": 0,
    "setsAgainst": 0,
    "points": 0
  },
  {
    "id": "st-cat-infantil-fem-afade-2",
    "categoryId": "cat-infantil-fem-afade",
    "teamName": "CV Cártama",
    "isCurrentClub": false,
    "played": 0,
    "won": 0,
    "lost": 0,
    "setsFor": 0,
    "setsAgainst": 0,
    "points": 0
  },
  {
    "id": "st-cat-infantil-fem-afade-3",
    "categoryId": "cat-infantil-fem-afade",
    "teamName": "CD La Colina",
    "isCurrentClub": false,
    "played": 0,
    "won": 0,
    "lost": 0,
    "setsFor": 0,
    "setsAgainst": 0,
    "points": 0
  },
  {
    "id": "st-cat-infantil-fem-afade-4",
    "categoryId": "cat-infantil-fem-afade",
    "teamName": "CD Forvoley",
    "isCurrentClub": false,
    "played": 0,
    "won": 0,
    "lost": 0,
    "setsFor": 0,
    "setsAgainst": 0,
    "points": 0
  },
  {
    "id": "st-cat-infantil-fem-afade-5",
    "categoryId": "cat-infantil-fem-afade",
    "teamName": "CD Voleibol San Pedro",
    "isCurrentClub": true,
    "played": 0,
    "won": 0,
    "lost": 0,
    "setsFor": 0,
    "setsAgainst": 0,
    "points": 0
  }
];
