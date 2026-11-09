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
    "name": "Senior Femenino AFADE (GB)",
    "gid": 2035,
    "camId": 272,
    "fid": 848
  },
  {
    "categoryId": "cat-juvenil-fem-afade",
    "teamId": "team-juvenil-fem-afade",
    "name": "Juvenil Femenino AFADE (GB)",
    "gid": 2041,
    "camId": 272,
    "fid": 851
  },
  {
    "categoryId": "cat-infantil-fem-afade",
    "teamId": "team-infantil-fem-afade",
    "name": "Infantil Femenino AFADE (GB)",
    "gid": 2043,
    "camId": 272,
    "fid": 852
  }
];

export const AFADE_CATEGORIES: Category[] = [
  {
    "id": "cat-senior-fem-afade",
    "name": "Senior Femenino AFADE (GB)",
    "slug": "senior-femenino-afade",
    "order": 16,
    "description": "Liga AFADE Málaga · Senior Femenino - GB",
    "association": "AFADE"
  },
  {
    "id": "cat-juvenil-fem-afade",
    "name": "Juvenil Femenino AFADE (GB)",
    "slug": "juvenil-femenino-afade",
    "order": 15,
    "description": "Liga AFADE Málaga · Juvenil Femenino - GB",
    "association": "AFADE"
  },
  {
    "id": "cat-infantil-fem-afade",
    "name": "Infantil Femenino AFADE (GB)",
    "slug": "infantil-femenino-afade",
    "order": 14,
    "description": "Liga AFADE Málaga · Infantil Femenino - GB",
    "association": "AFADE"
  }
];

export const AFADE_TEAMS: Team[] = [
  {
    "id": "team-senior-fem-afade",
    "categoryId": "cat-senior-fem-afade",
    "name": "Senior Femenino AFADE (GB)",
    "division": "Liga AFADE Málaga · Senior Femenino - GB",
    "season": "2026/2027"
  },
  {
    "id": "team-juvenil-fem-afade",
    "categoryId": "cat-juvenil-fem-afade",
    "name": "Juvenil Femenino AFADE (GB)",
    "division": "Liga AFADE Málaga · Juvenil Femenino - GB",
    "season": "2026/2027"
  },
  {
    "id": "team-infantil-fem-afade",
    "categoryId": "cat-infantil-fem-afade",
    "name": "Infantil Femenino AFADE (GB)",
    "division": "Liga AFADE Málaga · Infantil Femenino - GB",
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
    "awayScore": 3,
    "locality": "San Pedro de Alcántara",
    "googleMapsUrl": "https://www.google.com/maps/search/?api=1&query=Pabell%C3%B3n%20de%20Deportes%20Sergio%20Scariolo%20(Calle%20Lyon%2C%20San%20Pedro%20Alc%C3%A1ntara%20%2C%2029670)"
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
    "awayScore": 1,
    "locality": "Málaga",
    "googleMapsUrl": "https://www.google.com/maps/search/?api=1&query=IES%20Christine%20Picasso%20(Calle%20Rachmaninov%2C%204)"
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
    "status": "FINISHED",
    "statusText": "Finalizado",
    "setScores": [
      {
        "home": 18,
        "away": 25
      },
      {
        "home": 15,
        "away": 25
      },
      {
        "home": 19,
        "away": 25
      }
    ],
    "favbMatchUrl": "https://ligaafade.es/resultados?deporte=8&fase=848&grupo=2035",
    "isFeatured": false,
    "homeScore": 0,
    "awayScore": 3,
    "locality": "San Pedro de Alcántara",
    "googleMapsUrl": "https://www.google.com/maps/search/?api=1&query=Pabell%C3%B3n%20de%20Deportes%20Sergio%20Scariolo%20(Calle%20Lyon%2C%20San%20Pedro%20Alc%C3%A1ntara%20%2C%2029670)"
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
    "isFeatured": false,
    "locality": "Málaga",
    "googleMapsUrl": "https://www.google.com/maps/search/?api=1&query=Colegio%20Divino%20Pastor%20(Calle%20Angelillo%20de%20Triana%2C%202)"
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
    "isFeatured": false,
    "locality": "San Pedro de Alcántara",
    "googleMapsUrl": "https://www.google.com/maps/search/?api=1&query=Pabell%C3%B3n%20de%20Deportes%20Sergio%20Scariolo%20(Calle%20Lyon%2C%20San%20Pedro%20Alc%C3%A1ntara%20%2C%2029670)"
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
    "isFeatured": false,
    "locality": "Málaga",
    "googleMapsUrl": "https://www.google.com/maps/search/?api=1&query=Pabell%C3%B3n%20Colegio%20San%20Jos%C3%A9%20(Calle%20Argentea%2C%2020)"
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
    "status": "FINISHED",
    "statusText": "Finalizado",
    "setScores": [
      {
        "home": 21,
        "away": 25
      },
      {
        "home": 25,
        "away": 22
      },
      {
        "home": 19,
        "away": 25
      },
      {
        "home": 18,
        "away": 25
      }
    ],
    "favbMatchUrl": "https://ligaafade.es/resultados?deporte=8&fase=851&grupo=2041",
    "isFeatured": false,
    "homeScore": 1,
    "awayScore": 3,
    "locality": "San Pedro de Alcántara",
    "googleMapsUrl": "https://www.google.com/maps/search/?api=1&query=Pabell%C3%B3n%20de%20Deportes%20Sergio%20Scariolo%20(Calle%20Lyon%2C%20San%20Pedro%20Alc%C3%A1ntara%20%2C%2029670)"
  },
  {
    "id": "afade-2041-j2",
    "teamId": "team-juvenil-fem-afade",
    "round": 2,
    "homeTeamName": "CD Voleibol San Pedro",
    "awayTeamName": "Fundación Victoria A",
    "isClubHome": true,
    "venueName": "Pabellón de Deportes Sergio Scariolo (Calle Lyon, San Pedro Alcántara , 29670)",
    "matchDate": "2026-11-08T11:30:00.000Z",
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
    "favbMatchUrl": "https://ligaafade.es/resultados?deporte=8&fase=851&grupo=2041",
    "isFeatured": false,
    "homeScore": 3,
    "awayScore": 1,
    "locality": "San Pedro de Alcántara",
    "googleMapsUrl": "https://www.google.com/maps/search/?api=1&query=Pabell%C3%B3n%20de%20Deportes%20Sergio%20Scariolo%20(Calle%20Lyon%2C%20San%20Pedro%20Alc%C3%A1ntara%20%2C%2029670)"
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
    "isFeatured": false,
    "locality": "Málaga",
    "googleMapsUrl": "https://www.google.com/maps/search/?api=1&query=Colegio%20La%20Asunci%C3%B3n%20(Calle%20Manuel%20de%20Palacio%2C%2015%2C%2029017)"
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
    "isFeatured": false,
    "locality": "San Pedro de Alcántara",
    "googleMapsUrl": "https://www.google.com/maps/search/?api=1&query=Pabell%C3%B3n%20de%20Deportes%20Sergio%20Scariolo%20(Calle%20Lyon%2C%20San%20Pedro%20Alc%C3%A1ntara%20%2C%2029670)"
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
    "isFeatured": false,
    "locality": "Málaga",
    "googleMapsUrl": "https://www.google.com/maps/search/?api=1&query=IES%20Poetas%20Andaluces%20(Calle%20Medina%20Azahara%2C%20s%2Fn%2C%20Arroyo%20de%20la%20Miel)"
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
    "favbMatchUrl": "https://ligaafade.es/resultados?deporte=8&fase=852&grupo=2043",
    "isFeatured": false,
    "homeScore": 3,
    "awayScore": 1,
    "locality": "San Pedro de Alcántara",
    "googleMapsUrl": "https://www.google.com/maps/search/?api=1&query=Pabell%C3%B3n%20de%20Deportes%20Sergio%20Scariolo%20(Calle%20Lyon%2C%20San%20Pedro%20Alc%C3%A1ntara%20%2C%2029670)"
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
    "isFeatured": false,
    "locality": "Málaga",
    "googleMapsUrl": "https://www.google.com/maps/search/?api=1&query=Colegio%20Divino%20Pastor%20(Calle%20Angelillo%20de%20Triana%2C%202)"
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
    "isFeatured": false,
    "locality": "San Pedro de Alcántara",
    "googleMapsUrl": "https://www.google.com/maps/search/?api=1&query=Pabell%C3%B3n%20de%20Deportes%20Sergio%20Scariolo%20(Calle%20Lyon%2C%20San%20Pedro%20Alc%C3%A1ntara%20%2C%2029670)"
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
    "isFeatured": false,
    "locality": "Málaga",
    "googleMapsUrl": "https://www.google.com/maps/search/?api=1&query=Ciudad%20Deportiva%20de%20C%C3%A1rtama%20(A-7057%2C%20C%C3%A1rtama)"
  }
];

export const AFADE_STANDINGS: Standings[] = [
  {
    "id": "st-cat-senior-fem-afade-1",
    "categoryId": "cat-senior-fem-afade",
    "teamName": "VAM",
    "isCurrentClub": false,
    "played": 4,
    "won": 4,
    "lost": 0,
    "pg3": 4,
    "pg2": 0,
    "pp1": 0,
    "pp0": 0,
    "setsFor": 12,
    "setsAgainst": 0,
    "setCoef": 12,
    "pointsFor": 300,
    "pointsAgainst": 162,
    "pointCoef": 1.852,
    "points": 12
  },
  {
    "id": "st-cat-senior-fem-afade-2",
    "categoryId": "cat-senior-fem-afade",
    "teamName": "Just Voley B",
    "isCurrentClub": false,
    "played": 3,
    "won": 3,
    "lost": 0,
    "pg3": 3,
    "pg2": 0,
    "pp1": 0,
    "pp0": 0,
    "setsFor": 9,
    "setsAgainst": 1,
    "setCoef": 9,
    "pointsFor": 245,
    "pointsAgainst": 142,
    "pointCoef": 1.725,
    "points": 9
  },
  {
    "id": "st-cat-senior-fem-afade-3",
    "categoryId": "cat-senior-fem-afade",
    "teamName": "La Coracha B",
    "isCurrentClub": false,
    "played": 4,
    "won": 3,
    "lost": 1,
    "pg3": 3,
    "pg2": 0,
    "pp1": 0,
    "pp0": 1,
    "setsFor": 10,
    "setsAgainst": 3,
    "setCoef": 3.333,
    "pointsFor": 294,
    "pointsAgainst": 264,
    "pointCoef": 1.114,
    "points": 9
  },
  {
    "id": "st-cat-senior-fem-afade-4",
    "categoryId": "cat-senior-fem-afade",
    "teamName": "CD Soho Málaga",
    "isCurrentClub": false,
    "played": 3,
    "won": 1,
    "lost": 2,
    "pg3": 1,
    "pg2": 0,
    "pp1": 0,
    "pp0": 2,
    "setsFor": 3,
    "setsAgainst": 7,
    "setCoef": 0.429,
    "pointsFor": 215,
    "pointsAgainst": 221,
    "pointCoef": 0.973,
    "points": 3
  },
  {
    "id": "st-cat-senior-fem-afade-5",
    "categoryId": "cat-senior-fem-afade",
    "teamName": "Fundación Victoria",
    "isCurrentClub": false,
    "played": 4,
    "won": 1,
    "lost": 3,
    "pg3": 0,
    "pg2": 1,
    "pp1": 0,
    "pp0": 3,
    "setsFor": 3,
    "setsAgainst": 11,
    "setCoef": 0.273,
    "pointsFor": 212,
    "pointsAgainst": 325,
    "pointCoef": 0.652,
    "points": 2
  },
  {
    "id": "st-cat-senior-fem-afade-6",
    "categoryId": "cat-senior-fem-afade",
    "teamName": "CD Voleibol San Pedro",
    "isCurrentClub": true,
    "played": 3,
    "won": 0,
    "lost": 3,
    "pg3": 0,
    "pg2": 0,
    "pp1": 1,
    "pp0": 2,
    "setsFor": 3,
    "setsAgainst": 9,
    "setCoef": 0.333,
    "pointsFor": 216,
    "pointsAgainst": 262,
    "pointCoef": 0.824,
    "points": 1
  },
  {
    "id": "st-cat-senior-fem-afade-7",
    "categoryId": "cat-senior-fem-afade",
    "teamName": "Just Voley C",
    "isCurrentClub": false,
    "played": 3,
    "won": 0,
    "lost": 3,
    "pg3": 0,
    "pg2": 0,
    "pp1": 0,
    "pp0": 3,
    "setsFor": 0,
    "setsAgainst": 9,
    "setCoef": 0,
    "pointsFor": 119,
    "pointsAgainst": 225,
    "pointCoef": 0.529,
    "points": 0
  },
  {
    "id": "st-cat-juvenil-fem-afade-1",
    "categoryId": "cat-juvenil-fem-afade",
    "teamName": "CD Unión Malagueña Voleibol",
    "isCurrentClub": false,
    "played": 2,
    "won": 2,
    "lost": 0,
    "pg3": 2,
    "pg2": 0,
    "pp1": 0,
    "pp0": 0,
    "setsFor": 6,
    "setsAgainst": 1,
    "setCoef": 6,
    "pointsFor": 161,
    "pointsAgainst": 120,
    "pointCoef": 1.342,
    "points": 6
  },
  {
    "id": "st-cat-juvenil-fem-afade-2",
    "categoryId": "cat-juvenil-fem-afade",
    "teamName": "Asunción",
    "isCurrentClub": false,
    "played": 1,
    "won": 1,
    "lost": 0,
    "pg3": 1,
    "pg2": 0,
    "pp1": 0,
    "pp0": 0,
    "setsFor": 3,
    "setsAgainst": 0,
    "setCoef": 3,
    "pointsFor": 75,
    "pointsAgainst": 37,
    "pointCoef": 2.027,
    "points": 3
  },
  {
    "id": "st-cat-juvenil-fem-afade-3",
    "categoryId": "cat-juvenil-fem-afade",
    "teamName": "UDA Benalmádena",
    "isCurrentClub": false,
    "played": 1,
    "won": 1,
    "lost": 0,
    "pg3": 1,
    "pg2": 0,
    "pp1": 0,
    "pp0": 0,
    "setsFor": 3,
    "setsAgainst": 1,
    "setCoef": 3,
    "pointsFor": 97,
    "pointsAgainst": 87,
    "pointCoef": 1.115,
    "points": 3
  },
  {
    "id": "st-cat-juvenil-fem-afade-4",
    "categoryId": "cat-juvenil-fem-afade",
    "teamName": "CD Voleibol San Pedro",
    "isCurrentClub": true,
    "played": 2,
    "won": 1,
    "lost": 1,
    "pg3": 1,
    "pg2": 0,
    "pp1": 0,
    "pp0": 1,
    "setsFor": 4,
    "setsAgainst": 4,
    "setCoef": 1,
    "pointsFor": 174,
    "pointsAgainst": 168,
    "pointCoef": 1.036,
    "points": 3
  },
  {
    "id": "st-cat-juvenil-fem-afade-5",
    "categoryId": "cat-juvenil-fem-afade",
    "teamName": "Fundación Victoria A",
    "isCurrentClub": false,
    "played": 2,
    "won": 0,
    "lost": 2,
    "pg3": 0,
    "pg2": 0,
    "pp1": 0,
    "pp0": 2,
    "setsFor": 2,
    "setsAgainst": 6,
    "setCoef": 0.333,
    "pointsFor": 169,
    "pointsAgainst": 192,
    "pointCoef": 0.88,
    "points": 0
  },
  {
    "id": "st-cat-juvenil-fem-afade-6",
    "categoryId": "cat-juvenil-fem-afade",
    "teamName": "REAL Y CUBILES ASESORES",
    "isCurrentClub": false,
    "played": 2,
    "won": 0,
    "lost": 2,
    "pg3": 0,
    "pg2": 0,
    "pp1": 0,
    "pp0": 2,
    "setsFor": 0,
    "setsAgainst": 6,
    "setCoef": 0,
    "pointsFor": 78,
    "pointsAgainst": 150,
    "pointCoef": 0.52,
    "points": 0
  },
  {
    "id": "st-cat-infantil-fem-afade-1",
    "categoryId": "cat-infantil-fem-afade",
    "teamName": "CV Cártama",
    "isCurrentClub": false,
    "played": 2,
    "won": 2,
    "lost": 0,
    "pg3": 2,
    "pg2": 0,
    "pp1": 0,
    "pp0": 0,
    "setsFor": 6,
    "setsAgainst": 0,
    "setCoef": 6,
    "pointsFor": 150,
    "pointsAgainst": 37,
    "pointCoef": 4.054,
    "points": 6
  },
  {
    "id": "st-cat-infantil-fem-afade-2",
    "categoryId": "cat-infantil-fem-afade",
    "teamName": "CD Voleibol San Pedro",
    "isCurrentClub": true,
    "played": 1,
    "won": 1,
    "lost": 0,
    "pg3": 1,
    "pg2": 0,
    "pp1": 0,
    "pp0": 0,
    "setsFor": 3,
    "setsAgainst": 1,
    "setCoef": 3,
    "pointsFor": 96,
    "pointsAgainst": 71,
    "pointCoef": 1.352,
    "points": 3
  },
  {
    "id": "st-cat-infantil-fem-afade-3",
    "categoryId": "cat-infantil-fem-afade",
    "teamName": "CD La Colina",
    "isCurrentClub": false,
    "played": 0,
    "won": 0,
    "lost": 0,
    "pg3": 0,
    "pg2": 0,
    "pp1": 0,
    "pp0": 0,
    "setsFor": 0,
    "setsAgainst": 0,
    "setCoef": 0,
    "pointsFor": 0,
    "pointsAgainst": 0,
    "pointCoef": 0,
    "points": 0
  },
  {
    "id": "st-cat-infantil-fem-afade-4",
    "categoryId": "cat-infantil-fem-afade",
    "teamName": "La Coracha B",
    "isCurrentClub": false,
    "played": 1,
    "won": 0,
    "lost": 1,
    "pg3": 0,
    "pg2": 0,
    "pp1": 0,
    "pp0": 1,
    "setsFor": 0,
    "setsAgainst": 3,
    "setCoef": 0,
    "pointsFor": 18,
    "pointsAgainst": 75,
    "pointCoef": 0.24,
    "points": 0
  },
  {
    "id": "st-cat-infantil-fem-afade-5",
    "categoryId": "cat-infantil-fem-afade",
    "teamName": "CD Forvoley",
    "isCurrentClub": false,
    "played": 2,
    "won": 0,
    "lost": 2,
    "pg3": 0,
    "pg2": 0,
    "pp1": 0,
    "pp0": 2,
    "setsFor": 1,
    "setsAgainst": 6,
    "setCoef": 0.167,
    "pointsFor": 90,
    "pointsAgainst": 171,
    "pointCoef": 0.526,
    "points": 0
  }
];
