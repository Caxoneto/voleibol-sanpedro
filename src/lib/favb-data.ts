import { Category, Team, Player, Staff, Match, Standings } from './types';

export const FAVB_CATEGORIES: Category[] = [
  {
    "id": "cat-senior-fem",
    "name": "Senior Femenino (1ª Andaluza)",
    "slug": "senior-femenino",
    "order": 1,
    "description": "1ª División Andaluza Femenina (FAVB)"
  },
  {
    "id": "cat-senior-masc",
    "name": "Senior Masculino (2ª Andaluza · G4B)",
    "slug": "senior-masculino",
    "order": 2,
    "description": "2ª División Andaluza Masculina · G4B (FAVB)"
  },
  {
    "id": "cat-juvenil-masc",
    "name": "Juvenil Masculino (G2)",
    "slug": "juvenil-masculino",
    "order": 3,
    "description": "Liga Provincial Málaga · G2 (FAVB)"
  },
  {
    "id": "cat-juvenil-fem-rojo",
    "name": "Juvenil Femenino Rojo (Oro · G1)",
    "slug": "juvenil-femenino-rojo",
    "order": 4,
    "description": "Liga Provincial Málaga · Liga Oro - G1 (FAVB)"
  },
  {
    "id": "cat-juvenil-fem-negro",
    "name": "Juvenil Femenino Negro (Plata · G1)",
    "slug": "juvenil-femenino-negro",
    "order": 5,
    "description": "Liga Provincial Málaga · Liga Plata - G1 (FAVB)"
  },
  {
    "id": "cat-cadete-masc",
    "name": "Cadete Masculino (G2)",
    "slug": "cadete-masculino",
    "order": 6,
    "description": "Liga Provincial Málaga · G2 (FAVB)"
  },
  {
    "id": "cat-cadete-fem-rojo",
    "name": "Cadete Femenino Rojo (Oro · G2)",
    "slug": "cadete-femenino-rojo",
    "order": 7,
    "description": "Liga Provincial Málaga · Liga Oro - G2 (FAVB)"
  },
  {
    "id": "cat-cadete-fem-negro",
    "name": "Cadete Femenino Negro (Plata · G3)",
    "slug": "cadete-femenino-negro",
    "order": 8,
    "description": "Liga Provincial Málaga · Liga Plata - G3 (FAVB)"
  },
  {
    "id": "cat-infantil-masc",
    "name": "Infantil Masculino (G1)",
    "slug": "infantil-masculino",
    "order": 9,
    "description": "Liga Provincial Málaga · G1 (FAVB)"
  },
  {
    "id": "cat-infantil-fem-rojo",
    "name": "Infantil Femenino Rojo (Oro · G1)",
    "slug": "infantil-femenino-rojo",
    "order": 10,
    "description": "Liga Provincial Málaga · Liga Oro - G1 (FAVB)"
  },
  {
    "id": "cat-infantil-fem-negro",
    "name": "Infantil Femenino Negro (Oro · G2)",
    "slug": "infantil-femenino-negro",
    "order": 11,
    "description": "Liga Provincial Málaga · Liga Oro - G2 (FAVB)"
  },
  {
    "id": "cat-infantil-fem-blanco",
    "name": "Infantil Femenino Blanco (Plata · G2)",
    "slug": "infantil-femenino-blanco",
    "order": 12,
    "description": "Liga Provincial Málaga · Liga Plata - G2 (FAVB)"
  },
  {
    "id": "cat-infantil-fem-gris",
    "name": "Infantil Femenino Gris (Plata · G1)",
    "slug": "infantil-femenino-gris",
    "order": 13,
    "description": "Liga Provincial Málaga · Liga Plata - G1 (FAVB)"
  }
];

export const FAVB_TEAMS: Team[] = [
  {
    "id": "team-sf",
    "categoryId": "cat-senior-fem",
    "name": "Senior Femenino",
    "division": "1ª División Andaluza Femenina (FAVB)",
    "season": "2026/2027"
  },
  {
    "id": "team-sm",
    "categoryId": "cat-senior-masc",
    "name": "Senior Masculino",
    "division": "2ª División Andaluza Masculina · G4B (FAVB)",
    "season": "2026/2027"
  },
  {
    "id": "team-jm",
    "categoryId": "cat-juvenil-masc",
    "name": "Juvenil Masculino",
    "division": "Liga Provincial Málaga · G2 (FAVB)",
    "season": "2026/2027"
  },
  {
    "id": "team-jf-rojo",
    "categoryId": "cat-juvenil-fem-rojo",
    "name": "Juvenil Femenino Rojo",
    "division": "Liga Provincial Málaga · Liga Oro - G1 (FAVB)",
    "season": "2026/2027"
  },
  {
    "id": "team-jf-negro",
    "categoryId": "cat-juvenil-fem-negro",
    "name": "Juvenil Femenino Negro",
    "division": "Liga Provincial Málaga · Liga Plata - G1 (FAVB)",
    "season": "2026/2027"
  },
  {
    "id": "team-cm",
    "categoryId": "cat-cadete-masc",
    "name": "Cadete Masculino",
    "division": "Liga Provincial Málaga · G2 (FAVB)",
    "season": "2026/2027"
  },
  {
    "id": "team-cf-rojo",
    "categoryId": "cat-cadete-fem-rojo",
    "name": "Cadete Femenino Rojo",
    "division": "Liga Provincial Málaga · Liga Oro - G2 (FAVB)",
    "season": "2026/2027"
  },
  {
    "id": "team-cf-negro",
    "categoryId": "cat-cadete-fem-negro",
    "name": "Cadete Femenino Negro",
    "division": "Liga Provincial Málaga · Liga Plata - G3 (FAVB)",
    "season": "2026/2027"
  },
  {
    "id": "team-im",
    "categoryId": "cat-infantil-masc",
    "name": "Infantil Masculino",
    "division": "Liga Provincial Málaga · G1 (FAVB)",
    "season": "2026/2027"
  },
  {
    "id": "team-if-rojo",
    "categoryId": "cat-infantil-fem-rojo",
    "name": "Infantil Femenino Rojo",
    "division": "Liga Provincial Málaga · Liga Oro - G1 (FAVB)",
    "season": "2026/2027"
  },
  {
    "id": "team-if-negro",
    "categoryId": "cat-infantil-fem-negro",
    "name": "Infantil Femenino Negro",
    "division": "Liga Provincial Málaga · Liga Oro - G2 (FAVB)",
    "season": "2026/2027"
  },
  {
    "id": "team-if-blanco",
    "categoryId": "cat-infantil-fem-blanco",
    "name": "Infantil Femenino Blanco",
    "division": "Liga Provincial Málaga · Liga Plata - G2 (FAVB)",
    "season": "2026/2027"
  },
  {
    "id": "team-if-gris",
    "categoryId": "cat-infantil-fem-gris",
    "name": "Infantil Femenino Gris",
    "division": "Liga Provincial Málaga · Liga Plata - G1 (FAVB)",
    "season": "2026/2027"
  }
];

export const FAVB_PLAYERS: Player[] = [
  {
    "id": "p-test-prueba",
    "teamId": "team-cf-negro",
    "number": 99,
    "firstName": "Persona",
    "lastName": "Prueba Prueba",
    "position": "OUTSIDE_HITTER",
    "birthYear": 2016,
    "heightCm": 150,
    "photoUrl": "/images/player-placeholder.svg",
    "isCaptain": false,
    "isHomegrown": true,
    "matchesCalledUp": 0,
    "totalClubCallUps": 0,
    "licenseCategory": "Benjamín"
  },
  {
    "id": "demo-cm-1",
    "teamId": "team-cm",
    "number": 81,
    "firstName": "Demo Cadete",
    "lastName": "Uno",
    "position": "OUTSIDE_HITTER",
    "birthYear": 2011,
    "heightCm": 170,
    "photoUrl": "/images/player-placeholder.svg",
    "isCaptain": false,
    "isHomegrown": true,
    "matchesCalledUp": 0,
    "totalClubCallUps": 0,
    "licenseCategory": "Cadete"
  },
  {
    "id": "demo-cm-2",
    "teamId": "team-cm",
    "number": 82,
    "firstName": "Demo Cadete",
    "lastName": "Dos",
    "position": "MIDDLE_BLOCKER",
    "birthYear": 2011,
    "heightCm": 175,
    "photoUrl": "/images/player-placeholder.svg",
    "isCaptain": false,
    "isHomegrown": true,
    "matchesCalledUp": 0,
    "totalClubCallUps": 0,
    "licenseCategory": "Cadete"
  },
  {
    "id": "demo-cm-3",
    "teamId": "team-cm",
    "number": 83,
    "firstName": "Demo Cadete",
    "lastName": "Tres",
    "position": "SETTER",
    "birthYear": 2010,
    "heightCm": 172,
    "photoUrl": "/images/player-placeholder.svg",
    "isCaptain": false,
    "isHomegrown": true,
    "matchesCalledUp": 0,
    "totalClubCallUps": 0,
    "licenseCategory": "Cadete"
  },
  {
    "id": "demo-cm-4",
    "teamId": "team-cm",
    "number": 84,
    "firstName": "Demo Cadete",
    "lastName": "Cuatro",
    "position": "OPPOSITE",
    "birthYear": 2010,
    "heightCm": 178,
    "photoUrl": "/images/player-placeholder.svg",
    "isCaptain": false,
    "isHomegrown": true,
    "matchesCalledUp": 0,
    "totalClubCallUps": 0,
    "licenseCategory": "Cadete"
  },
  {
    "id": "demo-cm-5",
    "teamId": "team-cm",
    "number": 85,
    "firstName": "Demo Cadete",
    "lastName": "Cinco",
    "position": "LIBERO",
    "birthYear": 2011,
    "heightCm": 165,
    "photoUrl": "/images/player-placeholder.svg",
    "isCaptain": false,
    "isHomegrown": true,
    "matchesCalledUp": 0,
    "totalClubCallUps": 0,
    "licenseCategory": "Cadete"
  },
  {
    "id": "demo-sf-1",
    "teamId": "team-sf",
    "number": 91,
    "firstName": "Demo Senior",
    "lastName": "Una",
    "position": "OUTSIDE_HITTER",
    "birthYear": 2002,
    "heightCm": 176,
    "photoUrl": "/images/player-placeholder.svg",
    "isCaptain": false,
    "isHomegrown": true,
    "matchesCalledUp": 0,
    "totalClubCallUps": 0,
    "licenseCategory": "Senior"
  },
  {
    "id": "demo-sf-2",
    "teamId": "team-sf",
    "number": 92,
    "firstName": "Demo Senior",
    "lastName": "Dos",
    "position": "SETTER",
    "birthYear": 2003,
    "heightCm": 171,
    "photoUrl": "/images/player-placeholder.svg",
    "isCaptain": false,
    "isHomegrown": true,
    "matchesCalledUp": 0,
    "totalClubCallUps": 0,
    "licenseCategory": "Senior"
  },
  {
    "id": "demo-sf-3",
    "teamId": "team-sf",
    "number": 93,
    "firstName": "Demo Senior",
    "lastName": "Tres",
    "position": "MIDDLE_BLOCKER",
    "birthYear": 2001,
    "heightCm": 182,
    "photoUrl": "/images/player-placeholder.svg",
    "isCaptain": false,
    "isHomegrown": true,
    "matchesCalledUp": 0,
    "totalClubCallUps": 0,
    "licenseCategory": "Senior"
  },
  {
    "id": "demo-sf-4",
    "teamId": "team-sf",
    "number": 94,
    "firstName": "Demo Senior",
    "lastName": "Cuatro",
    "position": "OPPOSITE",
    "birthYear": 2004,
    "heightCm": 179,
    "photoUrl": "/images/player-placeholder.svg",
    "isCaptain": false,
    "isHomegrown": true,
    "matchesCalledUp": 0,
    "totalClubCallUps": 0,
    "licenseCategory": "Senior"
  },
  {
    "id": "demo-sf-5",
    "teamId": "team-sf",
    "number": 95,
    "firstName": "Demo Senior",
    "lastName": "Cinco",
    "position": "LIBERO",
    "birthYear": 2000,
    "heightCm": 168,
    "photoUrl": "/images/player-placeholder.svg",
    "isCaptain": false,
    "isHomegrown": true,
    "matchesCalledUp": 0,
    "totalClubCallUps": 0,
    "licenseCategory": "Senior"
  },
  {
    "id": "p-team-sf-1",
    "teamId": "team-sf",
    "number": 1,
    "firstName": "Marta",
    "lastName": "Sanchez Rosado",
    "position": "LIBERO",
    "birthYear": 2008,
    "heightCm": 173,
    "photoUrl": "/images/player-placeholder.svg",
    "isCaptain": false,
    "isHomegrown": true,
    "matchesCalledUp": 6,
    "totalClubCallUps": 11,
    "licenseCategory": "Juvenil",
    "otherTeamCallUps": [
      {
        "teamId": "team-jf-rojo",
        "teamName": "Juvenil Femenino Rojo",
        "count": 5
      }
    ]
  },
  {
    "id": "p-team-sf-2",
    "teamId": "team-sf",
    "number": 2,
    "firstName": "Lola",
    "lastName": "Ríos Osuna",
    "position": "OUTSIDE_HITTER",
    "birthYear": 2008,
    "heightCm": 174,
    "photoUrl": "/images/player-placeholder.svg",
    "isCaptain": false,
    "isHomegrown": true,
    "matchesCalledUp": 4,
    "totalClubCallUps": 8,
    "licenseCategory": "Juvenil",
    "otherTeamCallUps": [
      {
        "teamId": "team-jf-rojo",
        "teamName": "Juvenil Femenino Rojo",
        "count": 4
      }
    ]
  },
  {
    "id": "p-team-sf-3",
    "teamId": "team-sf",
    "number": 3,
    "firstName": "Mine",
    "lastName": "Morgan",
    "position": "LIBERO",
    "birthYear": 2004,
    "heightCm": 171,
    "photoUrl": "/images/player-placeholder.svg",
    "isCaptain": false,
    "isHomegrown": true,
    "matchesCalledUp": 3,
    "totalClubCallUps": 3
  },
  {
    "id": "p-team-sf-4",
    "teamId": "team-sf",
    "number": 4,
    "firstName": "Lucía",
    "lastName": "Jiménez Cuadrado",
    "position": "LIBERO",
    "birthYear": 2008,
    "heightCm": 175,
    "photoUrl": "/images/player-placeholder.svg",
    "isCaptain": false,
    "isHomegrown": true,
    "matchesCalledUp": 4,
    "totalClubCallUps": 9,
    "licenseCategory": "Juvenil",
    "otherTeamCallUps": [
      {
        "teamId": "team-jf-rojo",
        "teamName": "Juvenil Femenino Rojo",
        "count": 5
      }
    ]
  },
  {
    "id": "p-team-sf-5",
    "teamId": "team-sf",
    "number": 4,
    "firstName": "Nathalie",
    "lastName": "Pozzi Banegas",
    "position": "OPPOSITE",
    "birthYear": 2003,
    "heightCm": 177,
    "photoUrl": "/images/player-placeholder.svg",
    "isCaptain": false,
    "isHomegrown": true,
    "matchesCalledUp": 6,
    "totalClubCallUps": 6
  },
  {
    "id": "p-team-sf-6",
    "teamId": "team-sf",
    "number": 5,
    "firstName": "Yumara",
    "lastName": "Vallejo Vallejo",
    "position": "MIDDLE_BLOCKER",
    "birthYear": 2004,
    "heightCm": 179,
    "photoUrl": "/images/player-placeholder.svg",
    "isCaptain": false,
    "isHomegrown": true,
    "matchesCalledUp": 6,
    "totalClubCallUps": 6
  },
  {
    "id": "p-team-sf-7",
    "teamId": "team-sf",
    "number": 8,
    "firstName": "Maria",
    "lastName": "Lopez Quevedo",
    "position": "OUTSIDE_HITTER",
    "birthYear": 2003,
    "heightCm": 174,
    "photoUrl": "/images/player-placeholder.svg",
    "isCaptain": true,
    "isHomegrown": true,
    "matchesCalledUp": 6,
    "totalClubCallUps": 6
  },
  {
    "id": "p-team-sf-8",
    "teamId": "team-sf",
    "number": 11,
    "firstName": "Luna",
    "lastName": "Guerrero Dueñas",
    "position": "MIDDLE_BLOCKER",
    "birthYear": 2008,
    "heightCm": 176,
    "photoUrl": "/images/player-placeholder.svg",
    "isCaptain": false,
    "isHomegrown": true,
    "matchesCalledUp": 6,
    "totalClubCallUps": 11,
    "licenseCategory": "Juvenil",
    "otherTeamCallUps": [
      {
        "teamId": "team-jf-rojo",
        "teamName": "Juvenil Femenino Rojo",
        "count": 5
      }
    ]
  },
  {
    "id": "p-team-sf-9",
    "teamId": "team-sf",
    "number": 12,
    "firstName": "Cristina",
    "lastName": "Millanes Garcia",
    "position": "OUTSIDE_HITTER",
    "birthYear": 2003,
    "heightCm": 175,
    "photoUrl": "/images/player-placeholder.svg",
    "isCaptain": false,
    "isHomegrown": true,
    "matchesCalledUp": 3,
    "totalClubCallUps": 3
  },
  {
    "id": "p-team-sf-10",
    "teamId": "team-sf",
    "number": 14,
    "firstName": "Elsa",
    "lastName": "Yague Ostio",
    "position": "SETTER",
    "birthYear": 2003,
    "heightCm": 178,
    "photoUrl": "/images/player-placeholder.svg",
    "isCaptain": false,
    "isHomegrown": true,
    "matchesCalledUp": 6,
    "totalClubCallUps": 6
  },
  {
    "id": "p-team-sf-11",
    "teamId": "team-sf",
    "number": 15,
    "firstName": "Sandra",
    "lastName": "García Rupérez",
    "position": "OPPOSITE",
    "birthYear": 2004,
    "heightCm": 173,
    "photoUrl": "/images/player-placeholder.svg",
    "isCaptain": false,
    "isHomegrown": true,
    "matchesCalledUp": 5,
    "totalClubCallUps": 5
  },
  {
    "id": "p-team-sf-12",
    "teamId": "team-sf",
    "number": 17,
    "firstName": "Rocio",
    "lastName": "Valencia Artola",
    "position": "SETTER",
    "birthYear": 2008,
    "heightCm": 175,
    "photoUrl": "/images/player-placeholder.svg",
    "isCaptain": false,
    "isHomegrown": true,
    "matchesCalledUp": 1,
    "totalClubCallUps": 5,
    "licenseCategory": "Juvenil",
    "otherTeamCallUps": [
      {
        "teamId": "team-jf-rojo",
        "teamName": "Juvenil Femenino Rojo",
        "count": 4
      }
    ]
  },
  {
    "id": "p-team-sf-13",
    "teamId": "team-sf",
    "number": 17,
    "firstName": "Alma",
    "lastName": "Marquez Rodriguez",
    "position": "OUTSIDE_HITTER",
    "birthYear": 2004,
    "heightCm": 177,
    "photoUrl": "/images/player-placeholder.svg",
    "isCaptain": false,
    "isHomegrown": true,
    "matchesCalledUp": 1,
    "totalClubCallUps": 1
  },
  {
    "id": "p-team-sf-14",
    "teamId": "team-sf",
    "number": 18,
    "firstName": "Nerea",
    "lastName": "Sanchez Olvera",
    "position": "LIBERO",
    "birthYear": 2004,
    "heightCm": 171,
    "photoUrl": "/images/player-placeholder.svg",
    "isCaptain": false,
    "isHomegrown": true,
    "matchesCalledUp": 2,
    "totalClubCallUps": 2
  },
  {
    "id": "p-team-sf-15",
    "teamId": "team-sf",
    "number": 18,
    "firstName": "Elena",
    "lastName": "Santaella Aranda",
    "position": "MIDDLE_BLOCKER",
    "birthYear": 2004,
    "heightCm": 177,
    "photoUrl": "/images/player-placeholder.svg",
    "isCaptain": false,
    "isHomegrown": true,
    "matchesCalledUp": 3,
    "totalClubCallUps": 3
  },
  {
    "id": "p-team-sf-16",
    "teamId": "team-sf",
    "number": 19,
    "firstName": "Elena",
    "lastName": "Salvi",
    "position": "OPPOSITE",
    "birthYear": 2004,
    "heightCm": 173,
    "photoUrl": "/images/player-placeholder.svg",
    "isCaptain": false,
    "isHomegrown": true,
    "matchesCalledUp": 3,
    "totalClubCallUps": 3
  },
  {
    "id": "p-team-sf-17",
    "teamId": "team-sf",
    "number": 20,
    "firstName": "Adriana",
    "lastName": "Megens Marin",
    "position": "OPPOSITE",
    "birthYear": 2008,
    "heightCm": 179,
    "photoUrl": "/images/player-placeholder.svg",
    "isCaptain": false,
    "isHomegrown": true,
    "matchesCalledUp": 3,
    "totalClubCallUps": 7,
    "licenseCategory": "Juvenil",
    "otherTeamCallUps": [
      {
        "teamId": "team-jf-rojo",
        "teamName": "Juvenil Femenino Rojo",
        "count": 4
      }
    ]
  },
  {
    "id": "p-team-sf-18",
    "teamId": "team-sf",
    "number": 28,
    "firstName": "Maria Francisca",
    "lastName": "Jimenez Mateos",
    "position": "LIBERO",
    "birthYear": 2003,
    "heightCm": 171,
    "photoUrl": "/images/player-placeholder.svg",
    "isCaptain": false,
    "isHomegrown": true,
    "matchesCalledUp": 1,
    "totalClubCallUps": 1
  },
  {
    "id": "p-team-sm-1",
    "teamId": "team-sm",
    "number": 1,
    "firstName": "Pablo",
    "lastName": "Vazquez Calatayud",
    "position": "OPPOSITE",
    "birthYear": 2002,
    "heightCm": 185,
    "photoUrl": "/images/player-placeholder.svg",
    "isCaptain": false,
    "isHomegrown": true,
    "matchesCalledUp": 1,
    "totalClubCallUps": 1
  },
  {
    "id": "p-team-sm-2",
    "teamId": "team-sm",
    "number": 3,
    "firstName": "Przemyslaw",
    "lastName": "Krenczyk",
    "position": "SETTER",
    "birthYear": 2001,
    "heightCm": 187,
    "photoUrl": "/images/player-placeholder.svg",
    "isCaptain": false,
    "isHomegrown": true,
    "matchesCalledUp": 1,
    "totalClubCallUps": 1
  },
  {
    "id": "p-team-sm-3",
    "teamId": "team-sm",
    "number": 5,
    "firstName": "Fernando",
    "lastName": "Vazquez Calvente",
    "position": "LIBERO",
    "birthYear": 2001,
    "heightCm": 181,
    "photoUrl": "/images/player-placeholder.svg",
    "isCaptain": false,
    "isHomegrown": true,
    "matchesCalledUp": 1,
    "totalClubCallUps": 1
  },
  {
    "id": "p-team-sm-4",
    "teamId": "team-sm",
    "number": 7,
    "firstName": "Salvador",
    "lastName": "Martínez Martínez",
    "position": "OPPOSITE",
    "birthYear": 2001,
    "heightCm": 185,
    "photoUrl": "/images/player-placeholder.svg",
    "isCaptain": false,
    "isHomegrown": true,
    "matchesCalledUp": 1,
    "totalClubCallUps": 1
  },
  {
    "id": "p-team-sm-5",
    "teamId": "team-sm",
    "number": 10,
    "firstName": "Juan Eufrasio",
    "lastName": "Martinez Martinez",
    "position": "MIDDLE_BLOCKER",
    "birthYear": 2002,
    "heightCm": 187,
    "photoUrl": "/images/player-placeholder.svg",
    "isCaptain": false,
    "isHomegrown": true,
    "matchesCalledUp": 1,
    "totalClubCallUps": 1
  },
  {
    "id": "p-team-sm-6",
    "teamId": "team-sm",
    "number": 14,
    "firstName": "José",
    "lastName": "Benítez Hidalgo",
    "position": "OUTSIDE_HITTER",
    "birthYear": 2001,
    "heightCm": 185,
    "photoUrl": "/images/player-placeholder.svg",
    "isCaptain": false,
    "isHomegrown": true,
    "matchesCalledUp": 1,
    "totalClubCallUps": 1
  },
  {
    "id": "p-team-sm-7",
    "teamId": "team-sm",
    "number": 18,
    "firstName": "Alejandro",
    "lastName": "Hurtado Gonzalez",
    "position": "SETTER",
    "birthYear": 2001,
    "heightCm": 183,
    "photoUrl": "/images/player-placeholder.svg",
    "isCaptain": false,
    "isHomegrown": true,
    "matchesCalledUp": 1,
    "totalClubCallUps": 1
  },
  {
    "id": "p-team-sm-8",
    "teamId": "team-sm",
    "number": 19,
    "firstName": "Mateo",
    "lastName": "Perez Ruiz",
    "position": "OUTSIDE_HITTER",
    "birthYear": 2001,
    "heightCm": 183,
    "photoUrl": "/images/player-placeholder.svg",
    "isCaptain": false,
    "isHomegrown": true,
    "matchesCalledUp": 1,
    "totalClubCallUps": 4,
    "licenseCategory": "Juvenil",
    "otherTeamCallUps": [
      {
        "teamId": "team-jm",
        "teamName": "Juvenil Masculino",
        "count": 3
      }
    ]
  },
  {
    "id": "p-team-sm-9",
    "teamId": "team-sm",
    "number": 22,
    "firstName": "Javier",
    "lastName": "Rodríguez Gadea",
    "position": "MIDDLE_BLOCKER",
    "birthYear": 2002,
    "heightCm": 183,
    "photoUrl": "/images/player-placeholder.svg",
    "isCaptain": true,
    "isHomegrown": true,
    "matchesCalledUp": 1,
    "totalClubCallUps": 1
  },
  {
    "id": "p-team-sm-10",
    "teamId": "team-sm",
    "number": 47,
    "firstName": "Christopher",
    "lastName": "Martin Martin",
    "position": "LIBERO",
    "birthYear": 2002,
    "heightCm": 181,
    "photoUrl": "/images/player-placeholder.svg",
    "isCaptain": false,
    "isHomegrown": true,
    "matchesCalledUp": 1,
    "totalClubCallUps": 1
  },
  {
    "id": "p-team-sm-11",
    "teamId": "team-sm",
    "number": 81,
    "firstName": "Sacha",
    "lastName": "Schapovaloff González",
    "position": "OUTSIDE_HITTER",
    "birthYear": 2002,
    "heightCm": 183,
    "photoUrl": "/images/player-placeholder.svg",
    "isCaptain": false,
    "isHomegrown": true,
    "matchesCalledUp": 1,
    "totalClubCallUps": 1
  },
  {
    "id": "p-team-sm-12",
    "teamId": "team-sm",
    "number": 98,
    "firstName": "Luis Miguel Marrugo",
    "lastName": "De Arco",
    "position": "SETTER",
    "birthYear": 2001,
    "heightCm": 183,
    "photoUrl": "/images/player-placeholder.svg",
    "isCaptain": false,
    "isHomegrown": true,
    "matchesCalledUp": 1,
    "totalClubCallUps": 1
  },
  {
    "id": "p-team-sm-13",
    "teamId": "team-sm",
    "number": 99,
    "firstName": "Gonzalo",
    "lastName": "Galán Toro",
    "position": "MIDDLE_BLOCKER",
    "birthYear": 2002,
    "heightCm": 187,
    "photoUrl": "/images/player-placeholder.svg",
    "isCaptain": false,
    "isHomegrown": true,
    "matchesCalledUp": 1,
    "totalClubCallUps": 5,
    "licenseCategory": "Juvenil",
    "otherTeamCallUps": [
      {
        "teamId": "team-jm",
        "teamName": "Juvenil Masculino",
        "count": 4
      }
    ]
  },
  {
    "id": "p-team-jm-1",
    "teamId": "team-jm",
    "number": 1,
    "firstName": "Nicolás",
    "lastName": "Serrato Rojo",
    "position": "LIBERO",
    "birthYear": 2010,
    "heightCm": 178,
    "photoUrl": "/images/player-placeholder.svg",
    "isCaptain": false,
    "isHomegrown": true,
    "matchesCalledUp": 4,
    "totalClubCallUps": 6,
    "licenseCategory": "Cadete",
    "otherTeamCallUps": [
      {
        "teamId": "team-cm",
        "teamName": "Cadete Masculino",
        "count": 2
      }
    ]
  },
  {
    "id": "p-team-jm-2",
    "teamId": "team-jm",
    "number": 3,
    "firstName": "Mateo",
    "lastName": "Perez Ruiz",
    "position": "OUTSIDE_HITTER",
    "birthYear": 2008,
    "heightCm": 181,
    "photoUrl": "/images/player-placeholder.svg",
    "isCaptain": false,
    "isHomegrown": true,
    "matchesCalledUp": 3,
    "totalClubCallUps": 4,
    "otherTeamCallUps": [
      {
        "teamId": "team-sm",
        "teamName": "Senior Masculino",
        "count": 1
      }
    ]
  },
  {
    "id": "p-team-jm-3",
    "teamId": "team-jm",
    "number": 4,
    "firstName": "Solane",
    "lastName": "Mordant",
    "position": "OPPOSITE",
    "birthYear": 2008,
    "heightCm": 183,
    "photoUrl": "/images/player-placeholder.svg",
    "isCaptain": false,
    "isHomegrown": true,
    "matchesCalledUp": 1,
    "totalClubCallUps": 1
  },
  {
    "id": "p-team-jm-4",
    "teamId": "team-jm",
    "number": 9,
    "firstName": "Timur",
    "lastName": "Shylko",
    "position": "MIDDLE_BLOCKER",
    "birthYear": 2008,
    "heightCm": 185,
    "photoUrl": "/images/player-placeholder.svg",
    "isCaptain": false,
    "isHomegrown": true,
    "matchesCalledUp": 1,
    "totalClubCallUps": 1
  },
  {
    "id": "p-team-jm-5",
    "teamId": "team-jm",
    "number": 11,
    "firstName": "Pedro",
    "lastName": "Núñez Romero",
    "position": "OUTSIDE_HITTER",
    "birthYear": 2010,
    "heightCm": 177,
    "photoUrl": "/images/player-placeholder.svg",
    "isCaptain": false,
    "isHomegrown": true,
    "matchesCalledUp": 4,
    "totalClubCallUps": 6,
    "licenseCategory": "Cadete",
    "otherTeamCallUps": [
      {
        "teamId": "team-cm",
        "teamName": "Cadete Masculino",
        "count": 2
      }
    ]
  },
  {
    "id": "p-team-jm-6",
    "teamId": "team-jm",
    "number": 15,
    "firstName": "Álvaro",
    "lastName": "González Auñón",
    "position": "MIDDLE_BLOCKER",
    "birthYear": 2010,
    "heightCm": 179,
    "photoUrl": "/images/player-placeholder.svg",
    "isCaptain": false,
    "isHomegrown": true,
    "matchesCalledUp": 1,
    "totalClubCallUps": 3,
    "licenseCategory": "Cadete",
    "otherTeamCallUps": [
      {
        "teamId": "team-cm",
        "teamName": "Cadete Masculino",
        "count": 2
      }
    ]
  },
  {
    "id": "p-team-jm-7",
    "teamId": "team-jm",
    "number": 18,
    "firstName": "Ángel",
    "lastName": "Hurtado González",
    "position": "MIDDLE_BLOCKER",
    "birthYear": 2008,
    "heightCm": 184,
    "photoUrl": "/images/player-placeholder.svg",
    "isCaptain": false,
    "isHomegrown": true,
    "matchesCalledUp": 4,
    "totalClubCallUps": 4
  },
  {
    "id": "p-team-jm-8",
    "teamId": "team-jm",
    "number": 19,
    "firstName": "Lebron Michael",
    "lastName": "Barrozo Pérez",
    "position": "LIBERO",
    "birthYear": 2010,
    "heightCm": 174,
    "photoUrl": "/images/player-placeholder.svg",
    "isCaptain": false,
    "isHomegrown": true,
    "matchesCalledUp": 2,
    "totalClubCallUps": 4,
    "licenseCategory": "Cadete",
    "otherTeamCallUps": [
      {
        "teamId": "team-cm",
        "teamName": "Cadete Masculino",
        "count": 2
      }
    ]
  },
  {
    "id": "p-team-jm-9",
    "teamId": "team-jm",
    "number": 21,
    "firstName": "Alejandro",
    "lastName": "Moncayo Pino",
    "position": "SETTER",
    "birthYear": 2008,
    "heightCm": 180,
    "photoUrl": "/images/player-placeholder.svg",
    "isCaptain": false,
    "isHomegrown": true,
    "matchesCalledUp": 4,
    "totalClubCallUps": 4
  },
  {
    "id": "p-team-jm-10",
    "teamId": "team-jm",
    "number": 31,
    "firstName": "David",
    "lastName": "Casillas Llamas",
    "position": "LIBERO",
    "birthYear": 2008,
    "heightCm": 177,
    "photoUrl": "/images/player-placeholder.svg",
    "isCaptain": false,
    "isHomegrown": true,
    "matchesCalledUp": 1,
    "totalClubCallUps": 1
  },
  {
    "id": "p-team-jm-11",
    "teamId": "team-jm",
    "number": 69,
    "firstName": "Dominik",
    "lastName": "Tapia Manzano",
    "position": "OPPOSITE",
    "birthYear": 2008,
    "heightCm": 182,
    "photoUrl": "/images/player-placeholder.svg",
    "isCaptain": false,
    "isHomegrown": true,
    "matchesCalledUp": 3,
    "totalClubCallUps": 3
  },
  {
    "id": "p-team-jm-12",
    "teamId": "team-jm",
    "number": 98,
    "firstName": "Ignacio",
    "lastName": "Mendez",
    "position": "OUTSIDE_HITTER",
    "birthYear": 2008,
    "heightCm": 181,
    "photoUrl": "/images/player-placeholder.svg",
    "isCaptain": false,
    "isHomegrown": true,
    "matchesCalledUp": 4,
    "totalClubCallUps": 4
  },
  {
    "id": "p-team-jm-13",
    "teamId": "team-jm",
    "number": 99,
    "firstName": "Gonzalo",
    "lastName": "Galán Toro",
    "position": "LIBERO",
    "birthYear": 2008,
    "heightCm": 176,
    "photoUrl": "/images/player-placeholder.svg",
    "isCaptain": true,
    "isHomegrown": true,
    "matchesCalledUp": 4,
    "totalClubCallUps": 5,
    "otherTeamCallUps": [
      {
        "teamId": "team-sm",
        "teamName": "Senior Masculino",
        "count": 1
      }
    ]
  },
  {
    "id": "p-team-jf-rojo-1",
    "teamId": "team-jf-rojo",
    "number": 1,
    "firstName": "Marta",
    "lastName": "Sanchez Rosado",
    "position": "SETTER",
    "birthYear": 2008,
    "heightCm": 170,
    "photoUrl": "/images/player-placeholder.svg",
    "isCaptain": true,
    "isHomegrown": true,
    "matchesCalledUp": 5,
    "totalClubCallUps": 11,
    "otherTeamCallUps": [
      {
        "teamId": "team-sf",
        "teamName": "Senior Femenino",
        "count": 6
      }
    ]
  },
  {
    "id": "p-team-jf-rojo-2",
    "teamId": "team-jf-rojo",
    "number": 2,
    "firstName": "Lola",
    "lastName": "Ríos Osuna",
    "position": "SETTER",
    "birthYear": 2008,
    "heightCm": 175,
    "photoUrl": "/images/player-placeholder.svg",
    "isCaptain": false,
    "isHomegrown": true,
    "matchesCalledUp": 4,
    "totalClubCallUps": 8,
    "otherTeamCallUps": [
      {
        "teamId": "team-sf",
        "teamName": "Senior Femenino",
        "count": 4
      }
    ]
  },
  {
    "id": "p-team-jf-rojo-3",
    "teamId": "team-jf-rojo",
    "number": 4,
    "firstName": "Lucía",
    "lastName": "Jiménez Cuadrado",
    "position": "OPPOSITE",
    "birthYear": 2008,
    "heightCm": 174,
    "photoUrl": "/images/player-placeholder.svg",
    "isCaptain": false,
    "isHomegrown": true,
    "matchesCalledUp": 5,
    "totalClubCallUps": 9,
    "otherTeamCallUps": [
      {
        "teamId": "team-sf",
        "teamName": "Senior Femenino",
        "count": 4
      }
    ]
  },
  {
    "id": "p-team-jf-rojo-4",
    "teamId": "team-jf-rojo",
    "number": 5,
    "firstName": "Marina",
    "lastName": "Perez Cañete",
    "position": "OUTSIDE_HITTER",
    "birthYear": 2008,
    "heightCm": 168,
    "photoUrl": "/images/player-placeholder.svg",
    "isCaptain": false,
    "isHomegrown": true,
    "matchesCalledUp": 1,
    "totalClubCallUps": 4,
    "licenseCategory": "Cadete",
    "otherTeamCallUps": [
      {
        "teamId": "team-cf-rojo",
        "teamName": "Cadete Femenino Rojo",
        "count": 3
      }
    ]
  },
  {
    "id": "p-team-jf-rojo-5",
    "teamId": "team-jf-rojo",
    "number": 6,
    "firstName": "Sheena Elaine",
    "lastName": "Garay Fernandez",
    "position": "LIBERO",
    "birthYear": 2009,
    "heightCm": 168,
    "photoUrl": "/images/player-placeholder.svg",
    "isCaptain": false,
    "isHomegrown": true,
    "matchesCalledUp": 3,
    "totalClubCallUps": 3
  },
  {
    "id": "p-team-jf-rojo-6",
    "teamId": "team-jf-rojo",
    "number": 7,
    "firstName": "Roma",
    "lastName": "Garcia Soler",
    "position": "OUTSIDE_HITTER",
    "birthYear": 2008,
    "heightCm": 171,
    "photoUrl": "/images/player-placeholder.svg",
    "isCaptain": false,
    "isHomegrown": true,
    "matchesCalledUp": 4,
    "totalClubCallUps": 4
  },
  {
    "id": "p-team-jf-rojo-7",
    "teamId": "team-jf-rojo",
    "number": 11,
    "firstName": "Luna",
    "lastName": "Guerrero Dueñas",
    "position": "MIDDLE_BLOCKER",
    "birthYear": 2009,
    "heightCm": 173,
    "photoUrl": "/images/player-placeholder.svg",
    "isCaptain": false,
    "isHomegrown": true,
    "matchesCalledUp": 5,
    "totalClubCallUps": 11,
    "otherTeamCallUps": [
      {
        "teamId": "team-sf",
        "teamName": "Senior Femenino",
        "count": 6
      }
    ]
  },
  {
    "id": "p-team-jf-rojo-8",
    "teamId": "team-jf-rojo",
    "number": 12,
    "firstName": "Laura",
    "lastName": "Cordero Cortes",
    "position": "LIBERO",
    "birthYear": 2008,
    "heightCm": 168,
    "photoUrl": "/images/player-placeholder.svg",
    "isCaptain": false,
    "isHomegrown": true,
    "matchesCalledUp": 5,
    "totalClubCallUps": 5
  },
  {
    "id": "p-team-jf-rojo-9",
    "teamId": "team-jf-rojo",
    "number": 15,
    "firstName": "Adriana",
    "lastName": "Megens Marin",
    "position": "OPPOSITE",
    "birthYear": 2009,
    "heightCm": 170,
    "photoUrl": "/images/player-placeholder.svg",
    "isCaptain": false,
    "isHomegrown": true,
    "matchesCalledUp": 4,
    "totalClubCallUps": 7,
    "otherTeamCallUps": [
      {
        "teamId": "team-sf",
        "teamName": "Senior Femenino",
        "count": 3
      }
    ]
  },
  {
    "id": "p-team-jf-rojo-10",
    "teamId": "team-jf-rojo",
    "number": 16,
    "firstName": "Nahiara",
    "lastName": "Gutiérrez Durkin",
    "position": "SETTER",
    "birthYear": 2008,
    "heightCm": 172,
    "photoUrl": "/images/player-placeholder.svg",
    "isCaptain": false,
    "isHomegrown": true,
    "matchesCalledUp": 4,
    "totalClubCallUps": 4
  },
  {
    "id": "p-team-jf-rojo-11",
    "teamId": "team-jf-rojo",
    "number": 17,
    "firstName": "Rocio",
    "lastName": "Valencia Artola",
    "position": "OUTSIDE_HITTER",
    "birthYear": 2009,
    "heightCm": 174,
    "photoUrl": "/images/player-placeholder.svg",
    "isCaptain": false,
    "isHomegrown": true,
    "matchesCalledUp": 4,
    "totalClubCallUps": 5,
    "otherTeamCallUps": [
      {
        "teamId": "team-sf",
        "teamName": "Senior Femenino",
        "count": 1
      }
    ]
  },
  {
    "id": "p-team-jf-rojo-12",
    "teamId": "team-jf-rojo",
    "number": 19,
    "firstName": "Carla",
    "lastName": "Moncayo Pérez",
    "position": "OUTSIDE_HITTER",
    "birthYear": 2009,
    "heightCm": 172,
    "photoUrl": "/images/player-placeholder.svg",
    "isCaptain": false,
    "isHomegrown": true,
    "matchesCalledUp": 5,
    "totalClubCallUps": 5
  },
  {
    "id": "p-team-jf-rojo-13",
    "teamId": "team-jf-rojo",
    "number": 23,
    "firstName": "Amira",
    "lastName": "Pardo Skoug",
    "position": "MIDDLE_BLOCKER",
    "birthYear": 2009,
    "heightCm": 171,
    "photoUrl": "/images/player-placeholder.svg",
    "isCaptain": false,
    "isHomegrown": true,
    "matchesCalledUp": 2,
    "totalClubCallUps": 2
  },
  {
    "id": "p-team-jf-rojo-14",
    "teamId": "team-jf-rojo",
    "number": 31,
    "firstName": "Sofía",
    "lastName": "Benítez Cañizares",
    "position": "MIDDLE_BLOCKER",
    "birthYear": 2009,
    "heightCm": 171,
    "photoUrl": "/images/player-placeholder.svg",
    "isCaptain": false,
    "isHomegrown": true,
    "matchesCalledUp": 5,
    "totalClubCallUps": 5
  },
  {
    "id": "p-team-jf-negro-1",
    "teamId": "team-jf-negro",
    "number": 1,
    "firstName": "Paula",
    "lastName": "Téllez Ros",
    "position": "SETTER",
    "birthYear": 2008,
    "heightCm": 168,
    "photoUrl": "/images/player-placeholder.svg",
    "isCaptain": false,
    "isHomegrown": true,
    "matchesCalledUp": 2,
    "totalClubCallUps": 2
  },
  {
    "id": "p-team-jf-negro-2",
    "teamId": "team-jf-negro",
    "number": 3,
    "firstName": "Isabel",
    "lastName": "González Rosa",
    "position": "OUTSIDE_HITTER",
    "birthYear": 2009,
    "heightCm": 170,
    "photoUrl": "/images/player-placeholder.svg",
    "isCaptain": false,
    "isHomegrown": true,
    "matchesCalledUp": 2,
    "totalClubCallUps": 2
  },
  {
    "id": "p-team-jf-negro-3",
    "teamId": "team-jf-negro",
    "number": 4,
    "firstName": "Marta",
    "lastName": "Calvente Palomo",
    "position": "OPPOSITE",
    "birthYear": 2008,
    "heightCm": 172,
    "photoUrl": "/images/player-placeholder.svg",
    "isCaptain": false,
    "isHomegrown": true,
    "matchesCalledUp": 1,
    "totalClubCallUps": 1
  },
  {
    "id": "p-team-jf-negro-4",
    "teamId": "team-jf-negro",
    "number": 6,
    "firstName": "Jimena Aguilar",
    "lastName": "Del Río",
    "position": "LIBERO",
    "birthYear": 2009,
    "heightCm": 166,
    "photoUrl": "/images/player-placeholder.svg",
    "isCaptain": false,
    "isHomegrown": true,
    "matchesCalledUp": 2,
    "totalClubCallUps": 2
  },
  {
    "id": "p-team-jf-negro-5",
    "teamId": "team-jf-negro",
    "number": 6,
    "firstName": "Paola",
    "lastName": "López Sánchez",
    "position": "OUTSIDE_HITTER",
    "birthYear": 2008,
    "heightCm": 168,
    "photoUrl": "/images/player-placeholder.svg",
    "isCaptain": true,
    "isHomegrown": true,
    "matchesCalledUp": 1,
    "totalClubCallUps": 1
  },
  {
    "id": "p-team-jf-negro-6",
    "teamId": "team-jf-negro",
    "number": 7,
    "firstName": "Aitana",
    "lastName": "Peña Romero",
    "position": "OUTSIDE_HITTER",
    "birthYear": 2008,
    "heightCm": 170,
    "photoUrl": "/images/player-placeholder.svg",
    "isCaptain": true,
    "isHomegrown": true,
    "matchesCalledUp": 2,
    "totalClubCallUps": 2
  },
  {
    "id": "p-team-jf-negro-7",
    "teamId": "team-jf-negro",
    "number": 8,
    "firstName": "Adriana",
    "lastName": "Barroso Aguilar",
    "position": "MIDDLE_BLOCKER",
    "birthYear": 2009,
    "heightCm": 170,
    "photoUrl": "/images/player-placeholder.svg",
    "isCaptain": false,
    "isHomegrown": true,
    "matchesCalledUp": 1,
    "totalClubCallUps": 1
  },
  {
    "id": "p-team-jf-negro-8",
    "teamId": "team-jf-negro",
    "number": 9,
    "firstName": "Johana",
    "lastName": "Quintero Scott",
    "position": "SETTER",
    "birthYear": 2008,
    "heightCm": 172,
    "photoUrl": "/images/player-placeholder.svg",
    "isCaptain": false,
    "isHomegrown": true,
    "matchesCalledUp": 1,
    "totalClubCallUps": 1
  },
  {
    "id": "p-team-jf-negro-9",
    "teamId": "team-jf-negro",
    "number": 10,
    "firstName": "Paula Adama",
    "lastName": "Benhamou Rivero",
    "position": "MIDDLE_BLOCKER",
    "birthYear": 2009,
    "heightCm": 172,
    "photoUrl": "/images/player-placeholder.svg",
    "isCaptain": false,
    "isHomegrown": true,
    "matchesCalledUp": 2,
    "totalClubCallUps": 2
  },
  {
    "id": "p-team-jf-negro-10",
    "teamId": "team-jf-negro",
    "number": 11,
    "firstName": "Maria",
    "lastName": "Martin Valle",
    "position": "SETTER",
    "birthYear": 2008,
    "heightCm": 168,
    "photoUrl": "/images/player-placeholder.svg",
    "isCaptain": false,
    "isHomegrown": true,
    "matchesCalledUp": 2,
    "totalClubCallUps": 2
  },
  {
    "id": "p-team-jf-negro-11",
    "teamId": "team-jf-negro",
    "number": 13,
    "firstName": "Eva",
    "lastName": "Puissant Salvat",
    "position": "OPPOSITE",
    "birthYear": 2009,
    "heightCm": 170,
    "photoUrl": "/images/player-placeholder.svg",
    "isCaptain": false,
    "isHomegrown": true,
    "matchesCalledUp": 2,
    "totalClubCallUps": 2
  },
  {
    "id": "p-team-jf-negro-12",
    "teamId": "team-jf-negro",
    "number": 14,
    "firstName": "Ainara",
    "lastName": "Ortega Gomez",
    "position": "SETTER",
    "birthYear": 2008,
    "heightCm": 172,
    "photoUrl": "/images/player-placeholder.svg",
    "isCaptain": false,
    "isHomegrown": true,
    "matchesCalledUp": 2,
    "totalClubCallUps": 2
  },
  {
    "id": "p-team-jf-negro-13",
    "teamId": "team-jf-negro",
    "number": 19,
    "firstName": "Noemí",
    "lastName": "Puissant Salvat",
    "position": "OUTSIDE_HITTER",
    "birthYear": 2009,
    "heightCm": 168,
    "photoUrl": "/images/player-placeholder.svg",
    "isCaptain": false,
    "isHomegrown": true,
    "matchesCalledUp": 2,
    "totalClubCallUps": 2
  },
  {
    "id": "p-team-jf-negro-14",
    "teamId": "team-jf-negro",
    "number": 24,
    "firstName": "Elisa Mila",
    "lastName": "El Aouch",
    "position": "OPPOSITE",
    "birthYear": 2008,
    "heightCm": 170,
    "photoUrl": "/images/player-placeholder.svg",
    "isCaptain": false,
    "isHomegrown": true,
    "matchesCalledUp": 2,
    "totalClubCallUps": 2
  },
  {
    "id": "p-team-jf-negro-15",
    "teamId": "team-jf-negro",
    "number": 32,
    "firstName": "Iris",
    "lastName": "Gil Hurtado",
    "position": "LIBERO",
    "birthYear": 2009,
    "heightCm": 166,
    "photoUrl": "/images/player-placeholder.svg",
    "isCaptain": false,
    "isHomegrown": true,
    "matchesCalledUp": 2,
    "totalClubCallUps": 2
  },
  {
    "id": "p-team-cm-1",
    "teamId": "team-cm",
    "number": 1,
    "firstName": "Nicolás",
    "lastName": "Serrato Rojo",
    "position": "SETTER",
    "birthYear": 2011,
    "heightCm": 176,
    "photoUrl": "/images/player-placeholder.svg",
    "isCaptain": true,
    "isHomegrown": true,
    "matchesCalledUp": 2,
    "totalClubCallUps": 6,
    "otherTeamCallUps": [
      {
        "teamId": "team-jm",
        "teamName": "Juvenil Masculino",
        "count": 4
      }
    ]
  },
  {
    "id": "p-team-cm-2",
    "teamId": "team-cm",
    "number": 2,
    "firstName": "Diego",
    "lastName": "Pedrazo Segarra",
    "position": "OUTSIDE_HITTER",
    "birthYear": 2010,
    "heightCm": 176,
    "photoUrl": "/images/player-placeholder.svg",
    "isCaptain": false,
    "isHomegrown": true,
    "matchesCalledUp": 2,
    "totalClubCallUps": 2
  },
  {
    "id": "p-team-cm-3",
    "teamId": "team-cm",
    "number": 3,
    "firstName": "Jordan",
    "lastName": "Romero Rios",
    "position": "SETTER",
    "birthYear": 2010,
    "heightCm": 178,
    "photoUrl": "/images/player-placeholder.svg",
    "isCaptain": false,
    "isHomegrown": true,
    "matchesCalledUp": 1,
    "totalClubCallUps": 1
  },
  {
    "id": "p-team-cm-4",
    "teamId": "team-cm",
    "number": 4,
    "firstName": "Pedro",
    "lastName": "Núñez Romero",
    "position": "OUTSIDE_HITTER",
    "birthYear": 2011,
    "heightCm": 178,
    "photoUrl": "/images/player-placeholder.svg",
    "isCaptain": false,
    "isHomegrown": true,
    "matchesCalledUp": 2,
    "totalClubCallUps": 6,
    "otherTeamCallUps": [
      {
        "teamId": "team-jm",
        "teamName": "Juvenil Masculino",
        "count": 4
      }
    ]
  },
  {
    "id": "p-team-cm-5",
    "teamId": "team-cm",
    "number": 6,
    "firstName": "Ivan",
    "lastName": "Valadez Alvarez",
    "position": "OPPOSITE",
    "birthYear": 2011,
    "heightCm": 176,
    "photoUrl": "/images/player-placeholder.svg",
    "isCaptain": false,
    "isHomegrown": true,
    "matchesCalledUp": 2,
    "totalClubCallUps": 2
  },
  {
    "id": "p-team-cm-6",
    "teamId": "team-cm",
    "number": 8,
    "firstName": "Iker",
    "lastName": "Trujillo Ruiz",
    "position": "SETTER",
    "birthYear": 2010,
    "heightCm": 174,
    "photoUrl": "/images/player-placeholder.svg",
    "isCaptain": false,
    "isHomegrown": true,
    "matchesCalledUp": 2,
    "totalClubCallUps": 2
  },
  {
    "id": "p-team-cm-7",
    "teamId": "team-cm",
    "number": 10,
    "firstName": "George",
    "lastName": "Filip",
    "position": "MIDDLE_BLOCKER",
    "birthYear": 2011,
    "heightCm": 178,
    "photoUrl": "/images/player-placeholder.svg",
    "isCaptain": false,
    "isHomegrown": true,
    "matchesCalledUp": 2,
    "totalClubCallUps": 2
  },
  {
    "id": "p-team-cm-8",
    "teamId": "team-cm",
    "number": 13,
    "firstName": "Marc",
    "lastName": "Castro Martín",
    "position": "OUTSIDE_HITTER",
    "birthYear": 2011,
    "heightCm": 174,
    "photoUrl": "/images/player-placeholder.svg",
    "isCaptain": false,
    "isHomegrown": true,
    "matchesCalledUp": 2,
    "totalClubCallUps": 2
  },
  {
    "id": "p-team-cm-9",
    "teamId": "team-cm",
    "number": 15,
    "firstName": "Álvaro",
    "lastName": "González Auñón",
    "position": "LIBERO",
    "birthYear": 2011,
    "heightCm": 179,
    "photoUrl": "/images/player-placeholder.svg",
    "isCaptain": false,
    "isHomegrown": true,
    "matchesCalledUp": 2,
    "totalClubCallUps": 3,
    "otherTeamCallUps": [
      {
        "teamId": "team-jm",
        "teamName": "Juvenil Masculino",
        "count": 1
      }
    ]
  },
  {
    "id": "p-team-cm-10",
    "teamId": "team-cm",
    "number": 15,
    "firstName": "Adonay",
    "lastName": "Heredia Santiago",
    "position": "MIDDLE_BLOCKER",
    "birthYear": 2011,
    "heightCm": 178,
    "photoUrl": "/images/player-placeholder.svg",
    "isCaptain": false,
    "isHomegrown": true,
    "matchesCalledUp": 1,
    "totalClubCallUps": 1
  },
  {
    "id": "p-team-cm-11",
    "teamId": "team-cm",
    "number": 19,
    "firstName": "Lebron Michael",
    "lastName": "Barrozo Pérez",
    "position": "LIBERO",
    "birthYear": 2011,
    "heightCm": 174,
    "photoUrl": "/images/player-placeholder.svg",
    "isCaptain": false,
    "isHomegrown": true,
    "matchesCalledUp": 2,
    "totalClubCallUps": 4,
    "otherTeamCallUps": [
      {
        "teamId": "team-jm",
        "teamName": "Juvenil Masculino",
        "count": 2
      }
    ]
  },
  {
    "id": "p-team-cm-12",
    "teamId": "team-cm",
    "number": 23,
    "firstName": "Maxim",
    "lastName": "Jalba",
    "position": "LIBERO",
    "birthYear": 2010,
    "heightCm": 172,
    "photoUrl": "/images/player-placeholder.svg",
    "isCaptain": false,
    "isHomegrown": true,
    "matchesCalledUp": 1,
    "totalClubCallUps": 1
  },
  {
    "id": "p-team-cf-rojo-1",
    "teamId": "team-cf-rojo",
    "number": 2,
    "firstName": "Leia",
    "lastName": "Renouard",
    "position": "SETTER",
    "birthYear": 2010,
    "heightCm": 167,
    "photoUrl": "/images/player-placeholder.svg",
    "isCaptain": false,
    "isHomegrown": true,
    "matchesCalledUp": 3,
    "totalClubCallUps": 3
  },
  {
    "id": "p-team-cf-rojo-2",
    "teamId": "team-cf-rojo",
    "number": 4,
    "firstName": "Valeria",
    "lastName": "Veliente Verdugo",
    "position": "LIBERO",
    "birthYear": 2011,
    "heightCm": 165,
    "photoUrl": "/images/player-placeholder.svg",
    "isCaptain": false,
    "isHomegrown": true,
    "matchesCalledUp": 3,
    "totalClubCallUps": 3
  },
  {
    "id": "p-team-cf-rojo-3",
    "teamId": "team-cf-rojo",
    "number": 5,
    "firstName": "Marina",
    "lastName": "Perez Cañete",
    "position": "OPPOSITE",
    "birthYear": 2010,
    "heightCm": 171,
    "photoUrl": "/images/player-placeholder.svg",
    "isCaptain": false,
    "isHomegrown": true,
    "matchesCalledUp": 3,
    "totalClubCallUps": 4,
    "otherTeamCallUps": [
      {
        "teamId": "team-jf-rojo",
        "teamName": "Juvenil Femenino Rojo",
        "count": 1
      }
    ]
  },
  {
    "id": "p-team-cf-rojo-4",
    "teamId": "team-cf-rojo",
    "number": 6,
    "firstName": "Zayra",
    "lastName": "Ortega Gomez",
    "position": "MIDDLE_BLOCKER",
    "birthYear": 2011,
    "heightCm": 173,
    "photoUrl": "/images/player-placeholder.svg",
    "isCaptain": false,
    "isHomegrown": true,
    "matchesCalledUp": 2,
    "totalClubCallUps": 5,
    "licenseCategory": "Infantil",
    "otherTeamCallUps": [
      {
        "teamId": "team-if-rojo",
        "teamName": "Infantil Femenino Rojo",
        "count": 3
      }
    ]
  },
  {
    "id": "p-team-cf-rojo-5",
    "teamId": "team-cf-rojo",
    "number": 7,
    "firstName": "Leoní",
    "lastName": "Anaya Peeters",
    "position": "OUTSIDE_HITTER",
    "birthYear": 2010,
    "heightCm": 168,
    "photoUrl": "/images/player-placeholder.svg",
    "isCaptain": false,
    "isHomegrown": true,
    "matchesCalledUp": 2,
    "totalClubCallUps": 2
  },
  {
    "id": "p-team-cf-rojo-6",
    "teamId": "team-cf-rojo",
    "number": 10,
    "firstName": "Paula",
    "lastName": "Román Ramirez",
    "position": "MIDDLE_BLOCKER",
    "birthYear": 2011,
    "heightCm": 170,
    "photoUrl": "/images/player-placeholder.svg",
    "isCaptain": true,
    "isHomegrown": true,
    "matchesCalledUp": 3,
    "totalClubCallUps": 3
  },
  {
    "id": "p-team-cf-rojo-7",
    "teamId": "team-cf-rojo",
    "number": 12,
    "firstName": "Nira",
    "lastName": "González Pérez",
    "position": "SETTER",
    "birthYear": 2010,
    "heightCm": 172,
    "photoUrl": "/images/player-placeholder.svg",
    "isCaptain": false,
    "isHomegrown": true,
    "matchesCalledUp": 2,
    "totalClubCallUps": 5,
    "licenseCategory": "Infantil",
    "otherTeamCallUps": [
      {
        "teamId": "team-if-rojo",
        "teamName": "Infantil Femenino Rojo",
        "count": 3
      }
    ]
  },
  {
    "id": "p-team-cf-rojo-8",
    "teamId": "team-cf-rojo",
    "number": 13,
    "firstName": "Paula",
    "lastName": "Valadez Fernandez",
    "position": "OPPOSITE",
    "birthYear": 2011,
    "heightCm": 167,
    "photoUrl": "/images/player-placeholder.svg",
    "isCaptain": false,
    "isHomegrown": true,
    "matchesCalledUp": 3,
    "totalClubCallUps": 3
  },
  {
    "id": "p-team-cf-rojo-9",
    "teamId": "team-cf-rojo",
    "number": 14,
    "firstName": "Marina",
    "lastName": "Vegas Sanchez",
    "position": "SETTER",
    "birthYear": 2010,
    "heightCm": 170,
    "photoUrl": "/images/player-placeholder.svg",
    "isCaptain": false,
    "isHomegrown": true,
    "matchesCalledUp": 1,
    "totalClubCallUps": 1
  },
  {
    "id": "p-team-cf-rojo-10",
    "teamId": "team-cf-rojo",
    "number": 15,
    "firstName": "Jaqueline",
    "lastName": "Montero Alves",
    "position": "SETTER",
    "birthYear": 2010,
    "heightCm": 169,
    "photoUrl": "/images/player-placeholder.svg",
    "isCaptain": false,
    "isHomegrown": true,
    "matchesCalledUp": 3,
    "totalClubCallUps": 3
  },
  {
    "id": "p-team-cf-rojo-11",
    "teamId": "team-cf-rojo",
    "number": 16,
    "firstName": "Chloe Hannah",
    "lastName": "Cerda Ynoa",
    "position": "OUTSIDE_HITTER",
    "birthYear": 2011,
    "heightCm": 171,
    "photoUrl": "/images/player-placeholder.svg",
    "isCaptain": false,
    "isHomegrown": true,
    "matchesCalledUp": 2,
    "totalClubCallUps": 5,
    "licenseCategory": "Infantil",
    "otherTeamCallUps": [
      {
        "teamId": "team-if-rojo",
        "teamName": "Infantil Femenino Rojo",
        "count": 3
      }
    ]
  },
  {
    "id": "p-team-cf-rojo-12",
    "teamId": "team-cf-rojo",
    "number": 20,
    "firstName": "Daniela",
    "lastName": "Romero Oña",
    "position": "OPPOSITE",
    "birthYear": 2010,
    "heightCm": 173,
    "photoUrl": "/images/player-placeholder.svg",
    "isCaptain": false,
    "isHomegrown": true,
    "matchesCalledUp": 1,
    "totalClubCallUps": 4,
    "licenseCategory": "Infantil",
    "otherTeamCallUps": [
      {
        "teamId": "team-if-rojo",
        "teamName": "Infantil Femenino Rojo",
        "count": 3
      }
    ]
  },
  {
    "id": "p-team-cf-rojo-13",
    "teamId": "team-cf-rojo",
    "number": 24,
    "firstName": "Lola",
    "lastName": "Vazquez Bautista",
    "position": "MIDDLE_BLOCKER",
    "birthYear": 2011,
    "heightCm": 168,
    "photoUrl": "/images/player-placeholder.svg",
    "isCaptain": false,
    "isHomegrown": true,
    "matchesCalledUp": 3,
    "totalClubCallUps": 3
  },
  {
    "id": "p-team-cf-rojo-14",
    "teamId": "team-cf-rojo",
    "number": 25,
    "firstName": "Alejandra",
    "lastName": "Redondo Lendinez",
    "position": "OUTSIDE_HITTER",
    "birthYear": 2010,
    "heightCm": 170,
    "photoUrl": "/images/player-placeholder.svg",
    "isCaptain": false,
    "isHomegrown": true,
    "matchesCalledUp": 2,
    "totalClubCallUps": 2
  },
  {
    "id": "p-team-cf-rojo-15",
    "teamId": "team-cf-rojo",
    "number": 33,
    "firstName": "Angela",
    "lastName": "Gomez Moreno",
    "position": "MIDDLE_BLOCKER",
    "birthYear": 2011,
    "heightCm": 172,
    "photoUrl": "/images/player-placeholder.svg",
    "isCaptain": false,
    "isHomegrown": true,
    "matchesCalledUp": 3,
    "totalClubCallUps": 3
  },
  {
    "id": "p-team-cf-negro-1",
    "teamId": "team-cf-negro",
    "number": 1,
    "firstName": "Olivia Del",
    "lastName": "Barrio Benková",
    "position": "SETTER",
    "birthYear": 2010,
    "heightCm": 165,
    "photoUrl": "/images/player-placeholder.svg",
    "isCaptain": false,
    "isHomegrown": true,
    "matchesCalledUp": 1,
    "totalClubCallUps": 1
  },
  {
    "id": "p-team-cf-negro-2",
    "teamId": "team-cf-negro",
    "number": 2,
    "firstName": "Rocio",
    "lastName": "Gonzalez Alvarez",
    "position": "OUTSIDE_HITTER",
    "birthYear": 2011,
    "heightCm": 167,
    "photoUrl": "/images/player-placeholder.svg",
    "isCaptain": true,
    "isHomegrown": true,
    "matchesCalledUp": 2,
    "totalClubCallUps": 2
  },
  {
    "id": "p-team-cf-negro-3",
    "teamId": "team-cf-negro",
    "number": 3,
    "firstName": "Nicoleta",
    "lastName": "Filip",
    "position": "OPPOSITE",
    "birthYear": 2010,
    "heightCm": 169,
    "photoUrl": "/images/player-placeholder.svg",
    "isCaptain": false,
    "isHomegrown": true,
    "matchesCalledUp": 2,
    "totalClubCallUps": 2
  },
  {
    "id": "p-team-cf-negro-4",
    "teamId": "team-cf-negro",
    "number": 4,
    "firstName": "Aroa",
    "lastName": "Blanco Ossa",
    "position": "LIBERO",
    "birthYear": 2011,
    "heightCm": 163,
    "photoUrl": "/images/player-placeholder.svg",
    "isCaptain": false,
    "isHomegrown": true,
    "matchesCalledUp": 2,
    "totalClubCallUps": 2
  },
  {
    "id": "p-team-cf-negro-5",
    "teamId": "team-cf-negro",
    "number": 7,
    "firstName": "Michelle",
    "lastName": "Villanueva Koblyakova",
    "position": "OUTSIDE_HITTER",
    "birthYear": 2010,
    "heightCm": 167,
    "photoUrl": "/images/player-placeholder.svg",
    "isCaptain": false,
    "isHomegrown": true,
    "matchesCalledUp": 2,
    "totalClubCallUps": 2
  },
  {
    "id": "p-team-cf-negro-6",
    "teamId": "team-cf-negro",
    "number": 10,
    "firstName": "Ashley",
    "lastName": "Mancheno Villavicencio",
    "position": "MIDDLE_BLOCKER",
    "birthYear": 2011,
    "heightCm": 169,
    "photoUrl": "/images/player-placeholder.svg",
    "isCaptain": false,
    "isHomegrown": true,
    "matchesCalledUp": 2,
    "totalClubCallUps": 2
  },
  {
    "id": "p-team-cf-negro-7",
    "teamId": "team-cf-negro",
    "number": 14,
    "firstName": "Nora",
    "lastName": "Pareja Beriguete",
    "position": "OUTSIDE_HITTER",
    "birthYear": 2011,
    "heightCm": 165,
    "photoUrl": "/images/player-placeholder.svg",
    "isCaptain": false,
    "isHomegrown": true,
    "matchesCalledUp": 1,
    "totalClubCallUps": 4,
    "licenseCategory": "Infantil",
    "otherTeamCallUps": [
      {
        "teamId": "team-if-negro",
        "teamName": "Infantil Femenino Negro",
        "count": 3
      }
    ]
  },
  {
    "id": "p-team-cf-negro-8",
    "teamId": "team-cf-negro",
    "number": 15,
    "firstName": "Valeria",
    "lastName": "Nuñez Iglesias",
    "position": "OPPOSITE",
    "birthYear": 2010,
    "heightCm": 167,
    "photoUrl": "/images/player-placeholder.svg",
    "isCaptain": false,
    "isHomegrown": true,
    "matchesCalledUp": 1,
    "totalClubCallUps": 4,
    "licenseCategory": "Infantil",
    "otherTeamCallUps": [
      {
        "teamId": "team-if-negro",
        "teamName": "Infantil Femenino Negro",
        "count": 3
      }
    ]
  },
  {
    "id": "p-team-cf-negro-9",
    "teamId": "team-cf-negro",
    "number": 16,
    "firstName": "Naliah Loreen",
    "lastName": "Tenorio Kaluzova",
    "position": "SETTER",
    "birthYear": 2010,
    "heightCm": 165,
    "photoUrl": "/images/player-placeholder.svg",
    "isCaptain": false,
    "isHomegrown": true,
    "matchesCalledUp": 2,
    "totalClubCallUps": 2
  },
  {
    "id": "p-team-cf-negro-10",
    "teamId": "team-cf-negro",
    "number": 17,
    "firstName": "Milana",
    "lastName": "Sanchez Dyda",
    "position": "LIBERO",
    "birthYear": 2011,
    "heightCm": 163,
    "photoUrl": "/images/player-placeholder.svg",
    "isCaptain": false,
    "isHomegrown": true,
    "matchesCalledUp": 2,
    "totalClubCallUps": 2
  },
  {
    "id": "p-team-cf-negro-11",
    "teamId": "team-cf-negro",
    "number": 24,
    "firstName": "Disa",
    "lastName": "Shala Shala",
    "position": "SETTER",
    "birthYear": 2010,
    "heightCm": 169,
    "photoUrl": "/images/player-placeholder.svg",
    "isCaptain": false,
    "isHomegrown": true,
    "matchesCalledUp": 2,
    "totalClubCallUps": 2
  },
  {
    "id": "p-team-im-1",
    "teamId": "team-im",
    "number": 1,
    "firstName": "Rubén",
    "lastName": "Bernal Pacheco",
    "position": "SETTER",
    "birthYear": 2013,
    "heightCm": 168,
    "photoUrl": "/images/player-placeholder.svg",
    "isCaptain": false,
    "isHomegrown": true,
    "matchesCalledUp": 2,
    "totalClubCallUps": 2
  },
  {
    "id": "p-team-im-2",
    "teamId": "team-im",
    "number": 2,
    "firstName": "Antonio",
    "lastName": "Garcia Gonzalez",
    "position": "OUTSIDE_HITTER",
    "birthYear": 2014,
    "heightCm": 164,
    "photoUrl": "/images/player-placeholder.svg",
    "isCaptain": false,
    "isHomegrown": true,
    "matchesCalledUp": 4,
    "totalClubCallUps": 4,
    "licenseCategory": "Alevín"
  },
  {
    "id": "p-team-im-3",
    "teamId": "team-im",
    "number": 8,
    "firstName": "Pablo",
    "lastName": "Martin Garcia",
    "position": "OUTSIDE_HITTER",
    "birthYear": 2013,
    "heightCm": 170,
    "photoUrl": "/images/player-placeholder.svg",
    "isCaptain": false,
    "isHomegrown": true,
    "matchesCalledUp": 4,
    "totalClubCallUps": 4
  },
  {
    "id": "p-team-im-4",
    "teamId": "team-im",
    "number": 10,
    "firstName": "Agustín",
    "lastName": "Benítez Cañizares",
    "position": "MIDDLE_BLOCKER",
    "birthYear": 2013,
    "heightCm": 173,
    "photoUrl": "/images/player-placeholder.svg",
    "isCaptain": false,
    "isHomegrown": true,
    "matchesCalledUp": 3,
    "totalClubCallUps": 3
  },
  {
    "id": "p-team-im-5",
    "teamId": "team-im",
    "number": 11,
    "firstName": "Thiago",
    "lastName": "Perez Martinez",
    "position": "OPPOSITE",
    "birthYear": 2013,
    "heightCm": 171,
    "photoUrl": "/images/player-placeholder.svg",
    "isCaptain": false,
    "isHomegrown": true,
    "matchesCalledUp": 3,
    "totalClubCallUps": 3
  },
  {
    "id": "p-team-im-6",
    "teamId": "team-im",
    "number": 12,
    "firstName": "Martin",
    "lastName": "Moncayo Pérez",
    "position": "OUTSIDE_HITTER",
    "birthYear": 2013,
    "heightCm": 172,
    "photoUrl": "/images/player-placeholder.svg",
    "isCaptain": true,
    "isHomegrown": true,
    "matchesCalledUp": 4,
    "totalClubCallUps": 4
  },
  {
    "id": "p-team-im-7",
    "teamId": "team-im",
    "number": 21,
    "firstName": "Victor",
    "lastName": "Fabian Jimenez",
    "position": "MIDDLE_BLOCKER",
    "birthYear": 2013,
    "heightCm": 174,
    "photoUrl": "/images/player-placeholder.svg",
    "isCaptain": false,
    "isHomegrown": true,
    "matchesCalledUp": 4,
    "totalClubCallUps": 4
  },
  {
    "id": "p-team-im-8",
    "teamId": "team-im",
    "number": 23,
    "firstName": "Gabriel",
    "lastName": "Vidal Enriquez",
    "position": "LIBERO",
    "birthYear": 2013,
    "heightCm": 166,
    "photoUrl": "/images/player-placeholder.svg",
    "isCaptain": false,
    "isHomegrown": true,
    "matchesCalledUp": 4,
    "totalClubCallUps": 4
  },
  {
    "id": "p-team-im-9",
    "teamId": "team-im",
    "number": 77,
    "firstName": "Alexander",
    "lastName": "Bauzone",
    "position": "OPPOSITE",
    "birthYear": 2013,
    "heightCm": 172,
    "photoUrl": "/images/player-placeholder.svg",
    "isCaptain": false,
    "isHomegrown": true,
    "matchesCalledUp": 4,
    "totalClubCallUps": 4
  },
  {
    "id": "p-team-im-10",
    "teamId": "team-im",
    "number": 99,
    "firstName": "Adrián",
    "lastName": "Galán Toro",
    "position": "SETTER",
    "birthYear": 2014,
    "heightCm": 165,
    "photoUrl": "/images/player-placeholder.svg",
    "isCaptain": false,
    "isHomegrown": true,
    "matchesCalledUp": 3,
    "totalClubCallUps": 3,
    "licenseCategory": "Alevín"
  },
  {
    "id": "p-team-if-rojo-1",
    "teamId": "team-if-rojo",
    "number": 1,
    "firstName": "Valentina",
    "lastName": "Piovano Rubio",
    "position": "SETTER",
    "birthYear": 2013,
    "heightCm": 165,
    "photoUrl": "/images/player-placeholder.svg",
    "isCaptain": false,
    "isHomegrown": true,
    "matchesCalledUp": 3,
    "totalClubCallUps": 3
  },
  {
    "id": "p-team-if-rojo-2",
    "teamId": "team-if-rojo",
    "number": 4,
    "firstName": "Charlotte Hannah",
    "lastName": "Cerda Ynoa",
    "position": "OUTSIDE_HITTER",
    "birthYear": 2013,
    "heightCm": 167,
    "photoUrl": "/images/player-placeholder.svg",
    "isCaptain": false,
    "isHomegrown": true,
    "matchesCalledUp": 3,
    "totalClubCallUps": 3
  },
  {
    "id": "p-team-if-rojo-3",
    "teamId": "team-if-rojo",
    "number": 5,
    "firstName": "Ángela",
    "lastName": "Cerván Bernal",
    "position": "MIDDLE_BLOCKER",
    "birthYear": 2013,
    "heightCm": 169,
    "photoUrl": "/images/player-placeholder.svg",
    "isCaptain": false,
    "isHomegrown": true,
    "matchesCalledUp": 3,
    "totalClubCallUps": 3
  },
  {
    "id": "p-team-if-rojo-4",
    "teamId": "team-if-rojo",
    "number": 6,
    "firstName": "Zayra",
    "lastName": "Ortega Gomez",
    "position": "OPPOSITE",
    "birthYear": 2013,
    "heightCm": 168,
    "photoUrl": "/images/player-placeholder.svg",
    "isCaptain": false,
    "isHomegrown": true,
    "matchesCalledUp": 3,
    "totalClubCallUps": 5,
    "otherTeamCallUps": [
      {
        "teamId": "team-cf-rojo",
        "teamName": "Cadete Femenino Rojo",
        "count": 2
      }
    ]
  },
  {
    "id": "p-team-if-rojo-5",
    "teamId": "team-if-rojo",
    "number": 8,
    "firstName": "Carla",
    "lastName": "Ruano Ruiz",
    "position": "OUTSIDE_HITTER",
    "birthYear": 2013,
    "heightCm": 166,
    "photoUrl": "/images/player-placeholder.svg",
    "isCaptain": false,
    "isHomegrown": true,
    "matchesCalledUp": 3,
    "totalClubCallUps": 3
  },
  {
    "id": "p-team-if-rojo-6",
    "teamId": "team-if-rojo",
    "number": 10,
    "firstName": "Daniela",
    "lastName": "Romero Oña",
    "position": "OUTSIDE_HITTER",
    "birthYear": 2013,
    "heightCm": 169,
    "photoUrl": "/images/player-placeholder.svg",
    "isCaptain": true,
    "isHomegrown": true,
    "matchesCalledUp": 3,
    "totalClubCallUps": 4,
    "otherTeamCallUps": [
      {
        "teamId": "team-cf-rojo",
        "teamName": "Cadete Femenino Rojo",
        "count": 1
      }
    ]
  },
  {
    "id": "p-team-if-rojo-7",
    "teamId": "team-if-rojo",
    "number": 12,
    "firstName": "Nira",
    "lastName": "González Pérez",
    "position": "SETTER",
    "birthYear": 2013,
    "heightCm": 166,
    "photoUrl": "/images/player-placeholder.svg",
    "isCaptain": false,
    "isHomegrown": true,
    "matchesCalledUp": 3,
    "totalClubCallUps": 5,
    "otherTeamCallUps": [
      {
        "teamId": "team-cf-rojo",
        "teamName": "Cadete Femenino Rojo",
        "count": 2
      }
    ]
  },
  {
    "id": "p-team-if-rojo-8",
    "teamId": "team-if-rojo",
    "number": 15,
    "firstName": "Harly",
    "lastName": "Miller Soomre",
    "position": "MIDDLE_BLOCKER",
    "birthYear": 2013,
    "heightCm": 171,
    "photoUrl": "/images/player-placeholder.svg",
    "isCaptain": false,
    "isHomegrown": true,
    "matchesCalledUp": 2,
    "totalClubCallUps": 2
  },
  {
    "id": "p-team-if-rojo-9",
    "teamId": "team-if-rojo",
    "number": 16,
    "firstName": "Chloe Hannah",
    "lastName": "Cerda Ynoa",
    "position": "OPPOSITE",
    "birthYear": 2013,
    "heightCm": 168,
    "photoUrl": "/images/player-placeholder.svg",
    "isCaptain": false,
    "isHomegrown": true,
    "matchesCalledUp": 3,
    "totalClubCallUps": 5,
    "otherTeamCallUps": [
      {
        "teamId": "team-cf-rojo",
        "teamName": "Cadete Femenino Rojo",
        "count": 2
      }
    ]
  },
  {
    "id": "p-team-if-rojo-10",
    "teamId": "team-if-rojo",
    "number": 17,
    "firstName": "Sara",
    "lastName": "Andrades Pérez",
    "position": "LIBERO",
    "birthYear": 2013,
    "heightCm": 164,
    "photoUrl": "/images/player-placeholder.svg",
    "isCaptain": false,
    "isHomegrown": true,
    "matchesCalledUp": 3,
    "totalClubCallUps": 3
  },
  {
    "id": "p-team-if-negro-1",
    "teamId": "team-if-negro",
    "number": 2,
    "firstName": "Atenas",
    "lastName": "Garcia Soler",
    "position": "SETTER",
    "birthYear": 2013,
    "heightCm": 165,
    "photoUrl": "/images/player-placeholder.svg",
    "isCaptain": false,
    "isHomegrown": true,
    "matchesCalledUp": 2,
    "totalClubCallUps": 3,
    "otherTeamCallUps": [
      {
        "teamId": "team-cf-negro",
        "teamName": "Cadete Femenino Negro",
        "count": 1
      }
    ]
  },
  {
    "id": "p-team-if-negro-2",
    "teamId": "team-if-negro",
    "number": 3,
    "firstName": "Celia",
    "lastName": "Mena Dominguez",
    "position": "OUTSIDE_HITTER",
    "birthYear": 2013,
    "heightCm": 167,
    "photoUrl": "/images/player-placeholder.svg",
    "isCaptain": true,
    "isHomegrown": true,
    "matchesCalledUp": 3,
    "totalClubCallUps": 3
  },
  {
    "id": "p-team-if-negro-3",
    "teamId": "team-if-negro",
    "number": 4,
    "firstName": "Nora",
    "lastName": "Pareja Beriguete",
    "position": "MIDDLE_BLOCKER",
    "birthYear": 2013,
    "heightCm": 169,
    "photoUrl": "/images/player-placeholder.svg",
    "isCaptain": false,
    "isHomegrown": true,
    "matchesCalledUp": 3,
    "totalClubCallUps": 4,
    "otherTeamCallUps": [
      {
        "teamId": "team-cf-negro",
        "teamName": "Cadete Femenino Negro",
        "count": 1
      }
    ]
  },
  {
    "id": "p-team-if-negro-4",
    "teamId": "team-if-negro",
    "number": 6,
    "firstName": "Daryna",
    "lastName": "Maslova Maslov",
    "position": "MIDDLE_BLOCKER",
    "birthYear": 2014,
    "heightCm": 167,
    "photoUrl": "/images/player-placeholder.svg",
    "isCaptain": false,
    "isHomegrown": true,
    "matchesCalledUp": 2,
    "totalClubCallUps": 2
  },
  {
    "id": "p-team-if-negro-5",
    "teamId": "team-if-negro",
    "number": 7,
    "firstName": "Valeria",
    "lastName": "Montero Cantudo",
    "position": "OPPOSITE",
    "birthYear": 2013,
    "heightCm": 168,
    "photoUrl": "/images/player-placeholder.svg",
    "isCaptain": false,
    "isHomegrown": true,
    "matchesCalledUp": 3,
    "totalClubCallUps": 3
  },
  {
    "id": "p-team-if-negro-6",
    "teamId": "team-if-negro",
    "number": 8,
    "firstName": "Jimena",
    "lastName": "Román Ramirez",
    "position": "OUTSIDE_HITTER",
    "birthYear": 2013,
    "heightCm": 167,
    "photoUrl": "/images/player-placeholder.svg",
    "isCaptain": false,
    "isHomegrown": true,
    "matchesCalledUp": 3,
    "totalClubCallUps": 4,
    "otherTeamCallUps": [
      {
        "teamId": "team-cf-negro",
        "teamName": "Cadete Femenino Negro",
        "count": 1
      }
    ]
  },
  {
    "id": "p-team-if-negro-7",
    "teamId": "team-if-negro",
    "number": 9,
    "firstName": "Camila Noemi",
    "lastName": "Sanabria Cañete",
    "position": "MIDDLE_BLOCKER",
    "birthYear": 2013,
    "heightCm": 170,
    "photoUrl": "/images/player-placeholder.svg",
    "isCaptain": false,
    "isHomegrown": true,
    "matchesCalledUp": 3,
    "totalClubCallUps": 3
  },
  {
    "id": "p-team-if-negro-8",
    "teamId": "team-if-negro",
    "number": 10,
    "firstName": "Julia",
    "lastName": "Trujillo Ruiz",
    "position": "OUTSIDE_HITTER",
    "birthYear": 2013,
    "heightCm": 168,
    "photoUrl": "/images/player-placeholder.svg",
    "isCaptain": true,
    "isHomegrown": true,
    "matchesCalledUp": 3,
    "totalClubCallUps": 3
  },
  {
    "id": "p-team-if-negro-9",
    "teamId": "team-if-negro",
    "number": 12,
    "firstName": "Candela",
    "lastName": "Díaz Calvente",
    "position": "OPPOSITE",
    "birthYear": 2013,
    "heightCm": 165,
    "photoUrl": "/images/player-placeholder.svg",
    "isCaptain": true,
    "isHomegrown": true,
    "matchesCalledUp": 2,
    "totalClubCallUps": 2
  },
  {
    "id": "p-team-if-negro-10",
    "teamId": "team-if-negro",
    "number": 15,
    "firstName": "Valeria",
    "lastName": "Nuñez Iglesias",
    "position": "LIBERO",
    "birthYear": 2013,
    "heightCm": 164,
    "photoUrl": "/images/player-placeholder.svg",
    "isCaptain": false,
    "isHomegrown": true,
    "matchesCalledUp": 3,
    "totalClubCallUps": 4,
    "otherTeamCallUps": [
      {
        "teamId": "team-cf-negro",
        "teamName": "Cadete Femenino Negro",
        "count": 1
      }
    ]
  },
  {
    "id": "p-team-if-negro-11",
    "teamId": "team-if-negro",
    "number": 18,
    "firstName": "Alba",
    "lastName": "Casado Redondo",
    "position": "SETTER",
    "birthYear": 2013,
    "heightCm": 166,
    "photoUrl": "/images/player-placeholder.svg",
    "isCaptain": false,
    "isHomegrown": true,
    "matchesCalledUp": 3,
    "totalClubCallUps": 3
  },
  {
    "id": "p-team-if-negro-12",
    "teamId": "team-if-negro",
    "number": 25,
    "firstName": "Paula",
    "lastName": "Hernandez Alvarez",
    "position": "OPPOSITE",
    "birthYear": 2013,
    "heightCm": 169,
    "photoUrl": "/images/player-placeholder.svg",
    "isCaptain": false,
    "isHomegrown": true,
    "matchesCalledUp": 3,
    "totalClubCallUps": 3
  },
  {
    "id": "p-team-if-blanco-1",
    "teamId": "team-if-blanco",
    "number": 2,
    "firstName": "Karla Guerrerro",
    "lastName": "San Emeterio",
    "position": "SETTER",
    "birthYear": 2012,
    "heightCm": 166,
    "photoUrl": "/images/player-placeholder.svg",
    "isCaptain": false,
    "isHomegrown": true,
    "matchesCalledUp": 1,
    "totalClubCallUps": 1,
    "licenseCategory": "Alevín"
  },
  {
    "id": "p-team-if-blanco-2",
    "teamId": "team-if-blanco",
    "number": 3,
    "firstName": "Julieta Vidal",
    "lastName": "De Leon",
    "position": "OPPOSITE",
    "birthYear": 2012,
    "heightCm": 166,
    "photoUrl": "/images/player-placeholder.svg",
    "isCaptain": false,
    "isHomegrown": true,
    "matchesCalledUp": 1,
    "totalClubCallUps": 1
  },
  {
    "id": "p-team-if-blanco-3",
    "teamId": "team-if-blanco",
    "number": 4,
    "firstName": "Daniela",
    "lastName": "Gonzalez Ortega",
    "position": "OPPOSITE",
    "birthYear": 2013,
    "heightCm": 164,
    "photoUrl": "/images/player-placeholder.svg",
    "isCaptain": false,
    "isHomegrown": true,
    "matchesCalledUp": 1,
    "totalClubCallUps": 1,
    "licenseCategory": "Alevín"
  },
  {
    "id": "p-team-if-blanco-4",
    "teamId": "team-if-blanco",
    "number": 5,
    "firstName": "Sara Muñoz",
    "lastName": "El Haj",
    "position": "MIDDLE_BLOCKER",
    "birthYear": 2013,
    "heightCm": 166,
    "photoUrl": "/images/player-placeholder.svg",
    "isCaptain": false,
    "isHomegrown": true,
    "matchesCalledUp": 1,
    "totalClubCallUps": 1
  },
  {
    "id": "p-team-if-blanco-5",
    "teamId": "team-if-blanco",
    "number": 7,
    "firstName": "Selena",
    "lastName": "Naranjo Ventura",
    "position": "SETTER",
    "birthYear": 2012,
    "heightCm": 162,
    "photoUrl": "/images/player-placeholder.svg",
    "isCaptain": true,
    "isHomegrown": true,
    "matchesCalledUp": 1,
    "totalClubCallUps": 1
  },
  {
    "id": "p-team-if-blanco-6",
    "teamId": "team-if-blanco",
    "number": 9,
    "firstName": "Martina De La",
    "lastName": "Medica Sánchez",
    "position": "OUTSIDE_HITTER",
    "birthYear": 2012,
    "heightCm": 164,
    "photoUrl": "/images/player-placeholder.svg",
    "isCaptain": false,
    "isHomegrown": true,
    "matchesCalledUp": 1,
    "totalClubCallUps": 1
  },
  {
    "id": "p-team-if-blanco-7",
    "teamId": "team-if-blanco",
    "number": 11,
    "firstName": "Marta",
    "lastName": "Robles Ciobotaru",
    "position": "MIDDLE_BLOCKER",
    "birthYear": 2013,
    "heightCm": 162,
    "photoUrl": "/images/player-placeholder.svg",
    "isCaptain": false,
    "isHomegrown": true,
    "matchesCalledUp": 1,
    "totalClubCallUps": 1
  },
  {
    "id": "p-team-if-blanco-8",
    "teamId": "team-if-blanco",
    "number": 13,
    "firstName": "Daniela",
    "lastName": "Naranjo Navarro",
    "position": "OUTSIDE_HITTER",
    "birthYear": 2013,
    "heightCm": 164,
    "photoUrl": "/images/player-placeholder.svg",
    "isCaptain": false,
    "isHomegrown": true,
    "matchesCalledUp": 1,
    "totalClubCallUps": 1
  },
  {
    "id": "p-team-if-blanco-9",
    "teamId": "team-if-blanco",
    "number": 20,
    "firstName": "Ana",
    "lastName": "Martin Sanchez",
    "position": "SETTER",
    "birthYear": 2012,
    "heightCm": 162,
    "photoUrl": "/images/player-placeholder.svg",
    "isCaptain": false,
    "isHomegrown": true,
    "matchesCalledUp": 1,
    "totalClubCallUps": 1
  },
  {
    "id": "p-team-if-blanco-10",
    "teamId": "team-if-blanco",
    "number": 75,
    "firstName": "Vega",
    "lastName": "Vazquez Bautista",
    "position": "OUTSIDE_HITTER",
    "birthYear": 2013,
    "heightCm": 162,
    "photoUrl": "/images/player-placeholder.svg",
    "isCaptain": false,
    "isHomegrown": true,
    "matchesCalledUp": 1,
    "totalClubCallUps": 1,
    "licenseCategory": "Alevín"
  },
  {
    "id": "p-team-if-gris-1",
    "teamId": "team-if-gris",
    "number": 1,
    "firstName": "Noah",
    "lastName": "Alcantara Agenjo",
    "position": "OPPOSITE",
    "birthYear": 2013,
    "heightCm": 164,
    "photoUrl": "/images/player-placeholder.svg",
    "isCaptain": false,
    "isHomegrown": true,
    "matchesCalledUp": 1,
    "totalClubCallUps": 1,
    "licenseCategory": "Alevín"
  },
  {
    "id": "p-team-if-gris-2",
    "teamId": "team-if-gris",
    "number": 3,
    "firstName": "Samira Ailen",
    "lastName": "Sanabria Cañete",
    "position": "SETTER",
    "birthYear": 2012,
    "heightCm": 166,
    "photoUrl": "/images/player-placeholder.svg",
    "isCaptain": false,
    "isHomegrown": true,
    "matchesCalledUp": 1,
    "totalClubCallUps": 1,
    "licenseCategory": "Alevín"
  },
  {
    "id": "p-team-if-gris-3",
    "teamId": "team-if-gris",
    "number": 6,
    "firstName": "Helena De",
    "lastName": "Lope Moraga",
    "position": "OUTSIDE_HITTER",
    "birthYear": 2013,
    "heightCm": 162,
    "photoUrl": "/images/player-placeholder.svg",
    "isCaptain": false,
    "isHomegrown": true,
    "matchesCalledUp": 1,
    "totalClubCallUps": 1,
    "licenseCategory": "Alevín"
  },
  {
    "id": "p-team-if-gris-4",
    "teamId": "team-if-gris",
    "number": 11,
    "firstName": "Sofia",
    "lastName": "Muñoz Fernandez",
    "position": "SETTER",
    "birthYear": 2012,
    "heightCm": 162,
    "photoUrl": "/images/player-placeholder.svg",
    "isCaptain": true,
    "isHomegrown": true,
    "matchesCalledUp": 1,
    "totalClubCallUps": 1
  },
  {
    "id": "p-team-if-gris-5",
    "teamId": "team-if-gris",
    "number": 15,
    "firstName": "Alba Lucía",
    "lastName": "Escalona Vivaldi",
    "position": "OUTSIDE_HITTER",
    "birthYear": 2013,
    "heightCm": 164,
    "photoUrl": "/images/player-placeholder.svg",
    "isCaptain": false,
    "isHomegrown": true,
    "matchesCalledUp": 1,
    "totalClubCallUps": 1
  },
  {
    "id": "p-team-if-gris-6",
    "teamId": "team-if-gris",
    "number": 22,
    "firstName": "Cayetana",
    "lastName": "Jurado Guzman",
    "position": "OPPOSITE",
    "birthYear": 2012,
    "heightCm": 166,
    "photoUrl": "/images/player-placeholder.svg",
    "isCaptain": false,
    "isHomegrown": true,
    "matchesCalledUp": 1,
    "totalClubCallUps": 1
  },
  {
    "id": "p-team-if-gris-7",
    "teamId": "team-if-gris",
    "number": 24,
    "firstName": "Anna",
    "lastName": "Buetto Domanova",
    "position": "MIDDLE_BLOCKER",
    "birthYear": 2013,
    "heightCm": 162,
    "photoUrl": "/images/player-placeholder.svg",
    "isCaptain": false,
    "isHomegrown": true,
    "matchesCalledUp": 1,
    "totalClubCallUps": 1
  },
  {
    "id": "p-team-if-gris-8",
    "teamId": "team-if-gris",
    "number": 25,
    "firstName": "Martina",
    "lastName": "Morrison Vergara",
    "position": "OUTSIDE_HITTER",
    "birthYear": 2012,
    "heightCm": 164,
    "photoUrl": "/images/player-placeholder.svg",
    "isCaptain": false,
    "isHomegrown": true,
    "matchesCalledUp": 1,
    "totalClubCallUps": 1
  },
  {
    "id": "p-team-if-gris-9",
    "teamId": "team-if-gris",
    "number": 27,
    "firstName": "Pilar",
    "lastName": "Megens Marin",
    "position": "MIDDLE_BLOCKER",
    "birthYear": 2013,
    "heightCm": 166,
    "photoUrl": "/images/player-placeholder.svg",
    "isCaptain": false,
    "isHomegrown": true,
    "matchesCalledUp": 1,
    "totalClubCallUps": 1
  },
  {
    "id": "p-team-if-gris-10",
    "teamId": "team-if-gris",
    "number": 71,
    "firstName": "Adriana",
    "lastName": "Herrera Pérez",
    "position": "SETTER",
    "birthYear": 2012,
    "heightCm": 162,
    "photoUrl": "/images/player-placeholder.svg",
    "isCaptain": false,
    "isHomegrown": true,
    "matchesCalledUp": 1,
    "totalClubCallUps": 1
  },
  {
    "id": "p-team-cf-negro-12",
    "teamId": "team-cf-negro",
    "number": 1,
    "firstName": "Martina",
    "lastName": "Nasisi Adán",
    "position": "OUTSIDE_HITTER",
    "birthYear": 2011,
    "heightCm": 168,
    "photoUrl": "/images/player-placeholder.svg",
    "isCaptain": false,
    "isHomegrown": true,
    "matchesCalledUp": 1,
    "totalClubCallUps": 1
  },
  {
    "id": "p-team-cf-negro-13",
    "teamId": "team-cf-negro",
    "number": 26,
    "firstName": "Itziar",
    "lastName": "Ayala Chicón",
    "position": "MIDDLE_BLOCKER",
    "birthYear": 2011,
    "heightCm": 170,
    "photoUrl": "/images/player-placeholder.svg",
    "isCaptain": false,
    "isHomegrown": true,
    "matchesCalledUp": 1,
    "totalClubCallUps": 1
  },
  {
    "id": "p-team-im-11",
    "teamId": "team-im",
    "number": 3,
    "firstName": "Daniel",
    "lastName": "Moreno Ruiz",
    "position": "SETTER",
    "birthYear": 2014,
    "heightCm": 162,
    "photoUrl": "/images/player-placeholder.svg",
    "isCaptain": false,
    "isHomegrown": true,
    "licenseCategory": "Alevín",
    "matchesCalledUp": 1,
    "totalClubCallUps": 1
  }
];

export const FAVB_STAFF: Staff[] = [
  {
    "id": "st-sf-1",
    "teamId": "team-sf",
    "name": "Carlos Alberto Alcántara González",
    "role": "HEAD_COACH",
    "photoUrl": "/images/staff-placeholder.svg"
  },
  {
    "id": "st-sf-2",
    "teamId": "team-sf",
    "name": "Nadeau",
    "role": "HEAD_COACH",
    "photoUrl": "/images/staff-placeholder.svg"
  },
  {
    "id": "st-sf-3",
    "teamId": "team-sf",
    "name": "Martínez",
    "role": "ASSISTANT",
    "photoUrl": "/images/staff-placeholder.svg"
  },
  {
    "id": "st-team-sm-1",
    "teamId": "team-sm",
    "name": "Nadeau",
    "role": "HEAD_COACH",
    "photoUrl": "/images/staff-placeholder.svg"
  },
  {
    "id": "st-jm-1",
    "teamId": "team-jm",
    "name": "Nadeau",
    "role": "HEAD_COACH",
    "photoUrl": "/images/staff-placeholder.svg"
  },
  {
    "id": "st-jf-rojo-1",
    "teamId": "team-jf-rojo",
    "name": "Nadeau",
    "role": "HEAD_COACH",
    "photoUrl": "/images/staff-placeholder.svg"
  },
  {
    "id": "stf-team-jf-rojo-2",
    "teamId": "team-jf-rojo",
    "name": "Rodríguez",
    "role": "HEAD_COACH",
    "photoUrl": "/images/staff-placeholder.svg"
  },
  {
    "id": "st-team-jf-negro-1",
    "teamId": "team-jf-negro",
    "name": "García",
    "role": "HEAD_COACH",
    "photoUrl": "/images/staff-placeholder.svg"
  },
  {
    "id": "st-cm-1",
    "teamId": "team-cm",
    "name": "Nadeau",
    "role": "HEAD_COACH",
    "photoUrl": "/images/staff-placeholder.svg"
  },
  {
    "id": "st-team-cm-2",
    "teamId": "team-cm",
    "name": "Galán",
    "role": "ASSISTANT",
    "photoUrl": "/images/staff-placeholder.svg"
  },
  {
    "id": "st-team-cm-3",
    "teamId": "team-cm",
    "name": "Rodríguez",
    "role": "HEAD_COACH",
    "photoUrl": "/images/staff-placeholder.svg"
  },
  {
    "id": "st-cf-rojo-1",
    "teamId": "team-cf-rojo",
    "name": "Vázquez",
    "role": "HEAD_COACH",
    "photoUrl": "/images/staff-placeholder.svg"
  },
  {
    "id": "st-cf-rojo-2",
    "teamId": "team-cf-rojo",
    "name": "Gómez",
    "role": "ASSISTANT",
    "photoUrl": "/images/staff-placeholder.svg"
  },
  {
    "id": "stf-team-cf-rojo-3",
    "teamId": "team-cf-rojo",
    "name": "Rodríguez",
    "role": "HEAD_COACH",
    "photoUrl": "/images/staff-placeholder.svg"
  },
  {
    "id": "st-team-cf-negro-1",
    "teamId": "team-cf-negro",
    "name": "Renouard",
    "role": "HEAD_COACH",
    "photoUrl": "/images/staff-placeholder.svg"
  },
  {
    "id": "st-im-1",
    "teamId": "team-im",
    "name": "Rodríguez",
    "role": "HEAD_COACH",
    "photoUrl": "/images/staff-placeholder.svg"
  },
  {
    "id": "stf-team-im-2",
    "teamId": "team-im",
    "name": "Galán",
    "role": "ASSISTANT",
    "photoUrl": "/images/staff-placeholder.svg"
  },
  {
    "id": "st-if-rojo-1",
    "teamId": "team-if-rojo",
    "name": "Vázquez",
    "role": "HEAD_COACH",
    "photoUrl": "/images/staff-placeholder.svg"
  },
  {
    "id": "st-if-rojo-2",
    "teamId": "team-if-rojo",
    "name": "Nadeau",
    "role": "ASSISTANT",
    "photoUrl": "/images/staff-placeholder.svg"
  },
  {
    "id": "st-if-rojo-3",
    "teamId": "team-if-rojo",
    "name": "Martínez",
    "role": "ASSISTANT",
    "photoUrl": "/images/staff-placeholder.svg"
  },
  {
    "id": "st-if-negro-1",
    "teamId": "team-if-negro",
    "name": "Nadeau",
    "role": "HEAD_COACH",
    "photoUrl": "/images/staff-placeholder.svg"
  },
  {
    "id": "st-if-negro-2",
    "teamId": "team-if-negro",
    "name": "Martínez",
    "role": "ASSISTANT",
    "photoUrl": "/images/staff-placeholder.svg"
  },
  {
    "id": "st-team-if-blanco-1",
    "teamId": "team-if-blanco",
    "name": "Martínez",
    "role": "HEAD_COACH",
    "photoUrl": "/images/staff-placeholder.svg"
  },
  {
    "id": "st-team-if-blanco-2",
    "teamId": "team-if-blanco",
    "name": "Vázquez",
    "role": "ASSISTANT",
    "photoUrl": "/images/staff-placeholder.svg"
  },
  {
    "id": "st-team-if-gris-1",
    "teamId": "team-if-gris",
    "name": "Martínez",
    "role": "HEAD_COACH",
    "photoUrl": "/images/staff-placeholder.svg"
  },
  {
    "id": "st-team-if-gris-2",
    "teamId": "team-if-gris",
    "name": "Alcántara",
    "role": "ASSISTANT",
    "photoUrl": "/images/staff-placeholder.svg"
  }
];

export const FAVB_MATCHES: Match[] = [
  {
    "id": "favb-1055",
    "teamId": "team-sf",
    "round": 1,
    "homeTeamName": "ACADEMIA VC ISONDA",
    "awayTeamName": "VOLEIBOL SAN PEDRO",
    "isClubHome": false,
    "venueName": "INSTALACIONES DEPORTIVAS EL NARANJO (Córdoba)",
    "matchDate": "2026-10-04T08:30:00.000Z",
    "status": "FINISHED",
    "homeScore": 3,
    "awayScore": 0,
    "setScores": [
      {
        "home": 25,
        "away": 15
      },
      {
        "home": 25,
        "away": 14
      },
      {
        "home": 25,
        "away": 19
      }
    ],
    "favbMatchUrl": "https://favoley.net/publico/seccion.php?seccion=marcador&id=1055",
    "isFeatured": false,
    "locality": "Córdoba",
    "googleMapsUrl": "https://www.google.com/maps/search/?api=1&query=INSTALACIONES%20DEPORTIVAS%20EL%20NARANJO%20C%C3%B3rdoba",
    "referees": [
      {
        "role": "1º Árbitro",
        "name": "Eva Maria Sanchez Sanchez"
      },
      {
        "role": "2º Árbitro",
        "name": "Joaquín Guzmán Raya"
      },
      {
        "role": "Anotador/a",
        "name": "Elena Caler Calderón"
      }
    ],
    "homeRoster": [
      {
        "name": "Alba Porta Cosano",
        "dorsal": "2",
        "isLibero": true
      },
      {
        "name": "Gema Garcia Morales",
        "dorsal": "4",
        "originCategory": "Júnior"
      },
      {
        "name": "Marina Expósito Serrano",
        "dorsal": "5",
        "originCategory": "Júnior"
      },
      {
        "name": "Marta De Dios Cano",
        "dorsal": "8",
        "originCategory": "Juvenil"
      },
      {
        "name": "Inés Pozuelo Salcines",
        "dorsal": "9",
        "originCategory": "Juvenil"
      },
      {
        "name": "Laia Aguilera Gallego",
        "dorsal": "10",
        "originCategory": "Júnior"
      },
      {
        "name": "Sandra Valverde Segura",
        "dorsal": "13"
      },
      {
        "name": "Maria Figueras Jurado",
        "dorsal": "14",
        "originCategory": "Juvenil"
      },
      {
        "name": "Lydia Gómez Vaca",
        "dorsal": "15",
        "isLibero": true,
        "originCategory": "Juvenil"
      },
      {
        "name": "Lucía Ramos Sánchez",
        "dorsal": "16"
      },
      {
        "name": "María Pérez Lucena",
        "dorsal": "17",
        "originCategory": "Juvenil"
      },
      {
        "name": "Elsa Páez Nogales",
        "dorsal": "18",
        "isCaptain": true,
        "originCategory": "Júnior"
      },
      {
        "name": "Julia Garcia Sanchez",
        "dorsal": "19",
        "originCategory": "Juvenil"
      },
      {
        "name": "Laura Luque Delgado",
        "dorsal": "23",
        "originCategory": "Juvenil"
      },
      {
        "name": "Sáenz",
        "isStaff": true,
        "staffRole": "1º Entrenador/a"
      }
    ],
    "awayRoster": [
      {
        "name": "Marta Sanchez Rosado",
        "dorsal": "1",
        "originCategory": "Juvenil"
      },
      {
        "name": "Mine Morgan",
        "dorsal": "3",
        "isLibero": true
      },
      {
        "name": "Nathalie Pozzi Banegas",
        "dorsal": "4"
      },
      {
        "name": "Yumara Vallejo Vallejo",
        "dorsal": "5"
      },
      {
        "name": "Maria Lopez Quevedo",
        "dorsal": "8",
        "isCaptain": true
      },
      {
        "name": "Luna Guerrero Dueñas",
        "dorsal": "11",
        "originCategory": "Juvenil"
      },
      {
        "name": "Elsa Yague Ostio",
        "dorsal": "14"
      },
      {
        "name": "Sandra García Rupérez",
        "dorsal": "15"
      },
      {
        "name": "Rocio Valencia Artola",
        "dorsal": "17",
        "originCategory": "Juvenil"
      },
      {
        "name": "Nerea Sanchez Olvera",
        "dorsal": "18",
        "isLibero": true
      },
      {
        "name": "Adriana Megens Marin",
        "dorsal": "20",
        "originCategory": "Juvenil"
      },
      {
        "name": "Nadeau",
        "isStaff": true,
        "staffRole": "1º Entrenador/a"
      }
    ]
  },
  {
    "id": "favb-1061",
    "teamId": "team-sf",
    "round": 2,
    "homeTeamName": "VOLEIBOL SAN PEDRO",
    "awayTeamName": "CDU ATARFE 1AF",
    "isClubHome": true,
    "venueName": "POLIDEPORTIVO SERGIO SCARIOLO – P3 (San Pedro de Alcántara)",
    "matchDate": "2026-10-10T16:00:00.000Z",
    "status": "FINISHED",
    "homeScore": 2,
    "awayScore": 3,
    "setScores": [
      {
        "home": 25,
        "away": 22
      },
      {
        "home": 26,
        "away": 24
      },
      {
        "home": 22,
        "away": 25
      },
      {
        "home": 15,
        "away": 25
      },
      {
        "home": 11,
        "away": 15
      }
    ],
    "favbMatchUrl": "https://favoley.net/publico/seccion.php?seccion=marcador&id=1061",
    "isFeatured": false,
    "court": "Pista P3",
    "locality": "San Pedro de Alcántara",
    "googleMapsUrl": "https://www.google.com/maps/search/?api=1&query=POLIDEPORTIVO%20SERGIO%20SCARIOLO%20San%20Pedro%20de%20Alc%C3%A1ntara",
    "referees": [
      {
        "role": "1º Árbitro",
        "name": "Sara Perea Espinosa"
      },
      {
        "role": "2º Árbitro",
        "name": "Maria Andrea Perea Espinosa"
      },
      {
        "role": "Anotador/a",
        "name": "Rodolfo Israel Drago Figueras"
      }
    ],
    "homeRoster": [
      {
        "name": "Marta Sanchez Rosado",
        "dorsal": "1",
        "isLibero": true,
        "originCategory": "Juvenil"
      },
      {
        "name": "Lola Ríos Osuna",
        "dorsal": "2",
        "originCategory": "Juvenil"
      },
      {
        "name": "Mine Morgan",
        "dorsal": "3",
        "isLibero": true
      },
      {
        "name": "Nerea Sanchez Olvera",
        "dorsal": "4"
      },
      {
        "name": "Yumara Vallejo Vallejo",
        "dorsal": "5"
      },
      {
        "name": "Nathalie Pozzi Banegas",
        "dorsal": "6"
      },
      {
        "name": "Maria Lopez Quevedo",
        "dorsal": "8",
        "isCaptain": true
      },
      {
        "name": "Luna Guerrero Dueñas",
        "dorsal": "11",
        "originCategory": "Juvenil"
      },
      {
        "name": "Cristina Millanes Garcia",
        "dorsal": "12"
      },
      {
        "name": "Elsa Yague Ostio",
        "dorsal": "14"
      },
      {
        "name": "Sandra García Rupérez",
        "dorsal": "15"
      },
      {
        "name": "Elena Santaella Aranda",
        "dorsal": "18"
      },
      {
        "name": "Adriana Megens Marin",
        "dorsal": "20",
        "originCategory": "Juvenil"
      },
      {
        "name": "Nadeau",
        "isStaff": true,
        "staffRole": "1º Entrenador/a"
      },
      {
        "name": "Martínez",
        "isStaff": true,
        "staffRole": "2º Entrenador/a"
      }
    ],
    "awayRoster": [
      {
        "name": "Sofia Billing Perez",
        "dorsal": "3",
        "originCategory": "Júnior"
      },
      {
        "name": "Rocío Prieto Lamolda",
        "dorsal": "5",
        "originCategory": "Júnior"
      },
      {
        "name": "Noemí Jiménez Cuenca",
        "dorsal": "6",
        "originCategory": "Juvenil"
      },
      {
        "name": "Fatima Comino Calleja",
        "dorsal": "8",
        "originCategory": "Júnior"
      },
      {
        "name": "Daniela Soto García",
        "dorsal": "9",
        "originCategory": "Cadete"
      },
      {
        "name": "Maria López Fernández",
        "dorsal": "11",
        "originCategory": "Júnior"
      },
      {
        "name": "M.angeles Soria Jiménez",
        "dorsal": "12",
        "isCaptain": true
      },
      {
        "name": "Belén Charneco García",
        "dorsal": "19",
        "originCategory": "Cadete"
      },
      {
        "name": "Ines Lizancos Saldaña",
        "dorsal": "23",
        "isLibero": true,
        "originCategory": "Juvenil"
      },
      {
        "name": "Anabel Megan Mcvicar Reyes",
        "dorsal": "24"
      },
      {
        "name": "Paloma Castellano Hernández",
        "dorsal": "34"
      },
      {
        "name": "Muñoz",
        "isStaff": true,
        "staffRole": "2º Entrenador/a"
      },
      {
        "name": "Herrera",
        "isStaff": true,
        "staffRole": "1º Entrenador/a"
      }
    ]
  },
  {
    "id": "favb-1067",
    "teamId": "team-sf",
    "round": 3,
    "homeTeamName": "CV CIUDAD DE MÁLAGA",
    "awayTeamName": "VOLEIBOL SAN PEDRO",
    "isClubHome": false,
    "venueName": "COMPLEJO DEPORTIVO UNIVERSITARIO MALAGA (Málaga)",
    "matchDate": "2026-10-17T09:00:00.000Z",
    "status": "FINISHED",
    "homeScore": 3,
    "awayScore": 0,
    "setScores": [
      {
        "home": 25,
        "away": 17
      },
      {
        "home": 25,
        "away": 17
      },
      {
        "home": 25,
        "away": 16
      }
    ],
    "favbMatchUrl": "https://favoley.net/publico/seccion.php?seccion=marcador&id=1067",
    "isFeatured": false,
    "locality": "Málaga",
    "googleMapsUrl": "https://www.google.com/maps/search/?api=1&query=COMPLEJO%20DEPORTIVO%20UNIVERSITARIO%20MALAGA%20M%C3%A1laga",
    "referees": [
      {
        "role": "1º Árbitro",
        "name": "Daniel Sanchez Dominguez"
      },
      {
        "role": "2º Árbitro",
        "name": "Greta Varesi"
      },
      {
        "role": "Anotador/a",
        "name": "Iris Justicia Casado"
      }
    ],
    "homeRoster": [
      {
        "name": "Nicole Benítez González",
        "dorsal": "1"
      },
      {
        "name": "Meric Gurcan",
        "dorsal": "2",
        "isLibero": true
      },
      {
        "name": "Paloma Rodrigues De Aguiar",
        "dorsal": "3",
        "isCaptain": true
      },
      {
        "name": "Talita Erika De Barros Correia",
        "dorsal": "4"
      },
      {
        "name": "Paola Cuadra Martin",
        "dorsal": "5"
      },
      {
        "name": "Patricia Pedrosa Jiménez",
        "dorsal": "7"
      },
      {
        "name": "Lucy Williams",
        "dorsal": "8"
      },
      {
        "name": "Ana Sofia Gamboa Rodriguez",
        "dorsal": "9"
      },
      {
        "name": "Dalia Isabella Monzon Cernadas",
        "dorsal": "10",
        "originCategory": "Juvenil"
      },
      {
        "name": "Polina Smolianinova",
        "dorsal": "11"
      },
      {
        "name": "Ana Paula Arteaga Camizao",
        "dorsal": "21"
      },
      {
        "name": "Erika Ablasinskaite",
        "dorsal": "32"
      },
      {
        "name": "Dayana Rosa Armenteros Moya",
        "dorsal": "40"
      },
      {
        "name": "Lucía Moreno López",
        "dorsal": "41",
        "isLibero": true
      },
      {
        "name": "Ruiz",
        "isStaff": true,
        "staffRole": "2º Entrenador/a"
      },
      {
        "name": "Cuadra",
        "isStaff": true,
        "staffRole": "1º Entrenador/a"
      }
    ],
    "awayRoster": [
      {
        "name": "Marta Sanchez Rosado",
        "dorsal": "1",
        "isLibero": true,
        "originCategory": "Juvenil"
      },
      {
        "name": "Lola Ríos Osuna",
        "dorsal": "2",
        "originCategory": "Juvenil"
      },
      {
        "name": "Lucía Jiménez Cuadrado",
        "dorsal": "4",
        "originCategory": "Juvenil"
      },
      {
        "name": "Yumara Vallejo Vallejo",
        "dorsal": "5"
      },
      {
        "name": "Nathalie Pozzi Banegas",
        "dorsal": "6"
      },
      {
        "name": "Maria Lopez Quevedo",
        "dorsal": "8",
        "isCaptain": true
      },
      {
        "name": "Luna Guerrero Dueñas",
        "dorsal": "11",
        "originCategory": "Juvenil"
      },
      {
        "name": "Elsa Yague Ostio",
        "dorsal": "14"
      },
      {
        "name": "Sandra García Rupérez",
        "dorsal": "15"
      },
      {
        "name": "Nadeau",
        "isStaff": true,
        "staffRole": "1º Entrenador/a"
      }
    ]
  },
  {
    "id": "favb-1073",
    "teamId": "team-sf",
    "round": 4,
    "homeTeamName": "VOLEIBOL SAN PEDRO",
    "awayTeamName": "SIERRA ELVIRA",
    "isClubHome": true,
    "venueName": "POLIDEPORTIVO SERGIO SCARIOLO – P3 (San Pedro de Alcántara)",
    "matchDate": "2026-10-25T11:00:00.000Z",
    "status": "FINISHED",
    "homeScore": 3,
    "awayScore": 0,
    "setScores": [
      {
        "home": 25,
        "away": 12
      },
      {
        "home": 25,
        "away": 9
      },
      {
        "home": 25,
        "away": 21
      }
    ],
    "favbMatchUrl": "https://favoley.net/publico/seccion.php?seccion=marcador&id=1073",
    "isFeatured": false,
    "court": "Pista P3",
    "locality": "San Pedro de Alcántara",
    "googleMapsUrl": "https://www.google.com/maps/search/?api=1&query=POLIDEPORTIVO%20SERGIO%20SCARIOLO%20San%20Pedro%20de%20Alc%C3%A1ntara",
    "referees": [
      {
        "role": "1º Árbitro",
        "name": "Greta Varesi"
      },
      {
        "role": "2º Árbitro",
        "name": "José Manuel Cherino Navarro"
      },
      {
        "role": "Anotador/a",
        "name": "Rodolfo Drago Ravelo"
      }
    ],
    "homeRoster": [
      {
        "name": "Marta Sanchez Rosado",
        "dorsal": "1",
        "originCategory": "Juvenil"
      },
      {
        "name": "Lola Ríos Osuna",
        "dorsal": "2",
        "originCategory": "Juvenil"
      },
      {
        "name": "Lucía Jiménez Cuadrado",
        "dorsal": "4",
        "isLibero": true,
        "originCategory": "Juvenil"
      },
      {
        "name": "Yumara Vallejo Vallejo",
        "dorsal": "5"
      },
      {
        "name": "Nathalie Pozzi Banegas",
        "dorsal": "6"
      },
      {
        "name": "Maria Lopez Quevedo",
        "dorsal": "8",
        "isCaptain": true
      },
      {
        "name": "Luna Guerrero Dueñas",
        "dorsal": "11",
        "originCategory": "Juvenil"
      },
      {
        "name": "Cristina Millanes Garcia",
        "dorsal": "12"
      },
      {
        "name": "Elsa Yague Ostio",
        "dorsal": "14"
      },
      {
        "name": "Sandra García Rupérez",
        "dorsal": "15"
      },
      {
        "name": "Elena Santaella Aranda",
        "dorsal": "18"
      },
      {
        "name": "Elena Salvi",
        "dorsal": "19"
      },
      {
        "name": "Maria Francisca Jimenez Mateos",
        "dorsal": "28",
        "isLibero": true
      },
      {
        "name": "Nadeau",
        "isStaff": true,
        "staffRole": "1º Entrenador/a"
      },
      {
        "name": "Martinez",
        "isStaff": true,
        "staffRole": "2º Entrenador/a"
      },
      {
        "name": "Martínez",
        "isStaff": true,
        "staffRole": "2º Entrenador/a"
      }
    ],
    "awayRoster": [
      {
        "name": "Marta Civico Gago",
        "dorsal": "1",
        "isCaptain": true,
        "originCategory": "Sénior Tercera"
      },
      {
        "name": "Marta Sanchez Garcia",
        "dorsal": "2",
        "originCategory": "Júnior"
      },
      {
        "name": "Natalia López Castro",
        "dorsal": "6",
        "isLibero": true,
        "originCategory": "Sénior Tercera"
      },
      {
        "name": "Rut Medina Arcos",
        "dorsal": "7",
        "originCategory": "Júnior"
      },
      {
        "name": "Marta Guerrero Nozal",
        "dorsal": "8",
        "originCategory": "Juvenil"
      },
      {
        "name": "Alba Romero Ramírez",
        "dorsal": "9",
        "isLibero": true,
        "originCategory": "Sénior Tercera"
      },
      {
        "name": "Irene Lupión Coca",
        "dorsal": "12",
        "originCategory": "Júnior"
      },
      {
        "name": "Lucía Martín Ros",
        "dorsal": "13",
        "originCategory": "Juvenil"
      },
      {
        "name": "Alanis Villanueva Pérez",
        "dorsal": "19",
        "originCategory": "Juvenil"
      },
      {
        "name": "Bat-seba Medina Arcos",
        "dorsal": "22",
        "originCategory": "Júnior"
      },
      {
        "name": "Julia Bravo Rodriguez",
        "dorsal": "23",
        "originCategory": "Júnior"
      },
      {
        "name": "Aisha Dumont Tamboura",
        "dorsal": "32",
        "originCategory": "Júnior"
      },
      {
        "name": "Irene Cabrera López",
        "dorsal": "36",
        "originCategory": "Júnior"
      },
      {
        "name": "Guirao",
        "isStaff": true,
        "staffRole": "1º Entrenador/a"
      }
    ]
  },
  {
    "id": "favb-1078",
    "teamId": "team-sf",
    "round": 5,
    "homeTeamName": "FUNDACIÓN CAJASOL ANDALUCÍA 1AF",
    "awayTeamName": "VOLEIBOL SAN PEDRO",
    "isClubHome": false,
    "venueName": "PABELLÓN ENTRETORRES – Central (Dos Hermanas)",
    "matchDate": "2026-11-01T11:00:00.000Z",
    "status": "FINISHED",
    "homeScore": 3,
    "awayScore": 0,
    "setScores": [
      {
        "home": 25,
        "away": 17
      },
      {
        "home": 25,
        "away": 8
      },
      {
        "home": 25,
        "away": 10
      }
    ],
    "favbMatchUrl": "https://favoley.net/publico/seccion.php?seccion=marcador&id=1078",
    "isFeatured": false,
    "court": "Pista Central",
    "locality": "Dos Hermanas",
    "googleMapsUrl": "https://www.google.com/maps/search/?api=1&query=PABELL%C3%93N%20ENTRETORRES%20Dos%20Hermanas",
    "referees": [
      {
        "role": "1º Árbitro",
        "name": "Lucía Gutiérrez González"
      },
      {
        "role": "2º Árbitro",
        "name": "María José Salado Gutiérrez"
      },
      {
        "role": "Anotador/a",
        "name": "María Cuesta García"
      }
    ],
    "homeRoster": [
      {
        "name": "Andrea Hernandez Cuenca",
        "dorsal": "2"
      },
      {
        "name": "Andrea González Carmona",
        "dorsal": "3"
      },
      {
        "name": "Lidia Lopez Perez",
        "dorsal": "5"
      },
      {
        "name": "Irene Troyano Carabias",
        "dorsal": "6",
        "isCaptain": true
      },
      {
        "name": "Sara Juarez Pasquel",
        "dorsal": "7",
        "isLibero": true
      },
      {
        "name": "Marina Martinez Montiel",
        "dorsal": "9"
      },
      {
        "name": "Blanca Fúnez Santos",
        "dorsal": "14",
        "originCategory": "Júnior"
      },
      {
        "name": "Laura Mendoza Gallego",
        "dorsal": "16"
      },
      {
        "name": "Sara Pérez Muñoz",
        "dorsal": "17",
        "originCategory": "Júnior"
      },
      {
        "name": "Laura Silva Aranda",
        "dorsal": "18",
        "originCategory": "Juvenil"
      },
      {
        "name": "Carlota Saiz Alleman",
        "dorsal": "19",
        "originCategory": "Júnior"
      },
      {
        "name": "Collin",
        "isStaff": true,
        "staffRole": "1º Entrenador/a"
      },
      {
        "name": "Aguilar",
        "isStaff": true,
        "staffRole": "2º Entrenador/a"
      }
    ],
    "awayRoster": [
      {
        "name": "Marta Sanchez Rosado",
        "dorsal": "1",
        "originCategory": "Juvenil"
      },
      {
        "name": "Lola Ríos Osuna",
        "dorsal": "2",
        "originCategory": "Juvenil"
      },
      {
        "name": "Mine Morgan",
        "dorsal": "3",
        "isLibero": true
      },
      {
        "name": "Lucía Jiménez Cuadrado",
        "dorsal": "4",
        "isLibero": true,
        "originCategory": "Juvenil"
      },
      {
        "name": "Yumara Vallejo Vallejo",
        "dorsal": "5"
      },
      {
        "name": "Nathalie Pozzi Banegas",
        "dorsal": "6"
      },
      {
        "name": "Maria Lopez Quevedo",
        "dorsal": "8",
        "isCaptain": true
      },
      {
        "name": "Luna Guerrero Dueñas",
        "dorsal": "11",
        "originCategory": "Juvenil"
      },
      {
        "name": "Elsa Yague Ostio",
        "dorsal": "14"
      },
      {
        "name": "Elena Salvi",
        "dorsal": "19"
      },
      {
        "name": "Nadeau",
        "isStaff": true,
        "staffRole": "1º Entrenador/a"
      }
    ]
  },
  {
    "id": "favb-1082",
    "teamId": "team-sf",
    "round": 6,
    "homeTeamName": "VOLEIBOL SAN PEDRO",
    "awayTeamName": "LAS FLORES SEVILLA",
    "isClubHome": true,
    "venueName": "POLIDEPORTIVO SERGIO SCARIOLO – P3 (San Pedro de Alcántara)",
    "matchDate": "2026-11-07T17:00:00.000Z",
    "status": "FINISHED",
    "homeScore": 1,
    "awayScore": 3,
    "setScores": [
      {
        "home": 21,
        "away": 25
      },
      {
        "home": 16,
        "away": 25
      },
      {
        "home": 25,
        "away": 22
      },
      {
        "home": 17,
        "away": 25
      }
    ],
    "favbMatchUrl": "https://favoley.net/publico/seccion.php?seccion=marcador&id=1082",
    "isFeatured": false,
    "court": "Pista P3",
    "locality": "San Pedro de Alcántara",
    "googleMapsUrl": "https://www.google.com/maps/search/?api=1&query=POLIDEPORTIVO%20SERGIO%20SCARIOLO%20San%20Pedro%20de%20Alc%C3%A1ntara",
    "referees": [
      {
        "role": "1º Árbitro",
        "name": "Sara Perea Espinosa"
      },
      {
        "role": "2º Árbitro",
        "name": "Alba Badillo Calle"
      },
      {
        "role": "Anotador/a",
        "name": "Christian Samir Darias Drago"
      }
    ],
    "homeRoster": [
      {
        "name": "Marta Sanchez Rosado",
        "dorsal": "1",
        "isLibero": true,
        "originCategory": "Juvenil"
      },
      {
        "name": "Lucía Jiménez Cuadrado",
        "dorsal": "4",
        "isLibero": true,
        "originCategory": "Juvenil"
      },
      {
        "name": "Yumara Vallejo Vallejo",
        "dorsal": "5"
      },
      {
        "name": "Nathalie Pozzi Banegas",
        "dorsal": "6"
      },
      {
        "name": "Maria Lopez Quevedo",
        "dorsal": "8",
        "isCaptain": true
      },
      {
        "name": "Luna Guerrero Dueñas",
        "dorsal": "11",
        "originCategory": "Juvenil"
      },
      {
        "name": "Cristina Millanes Garcia",
        "dorsal": "12"
      },
      {
        "name": "Elsa Yague Ostio",
        "dorsal": "14"
      },
      {
        "name": "Sandra García Rupérez",
        "dorsal": "15"
      },
      {
        "name": "Alma Marquez Rodriguez",
        "dorsal": "17"
      },
      {
        "name": "Elena Santaella Aranda",
        "dorsal": "18"
      },
      {
        "name": "Elena Salvi",
        "dorsal": "19"
      },
      {
        "name": "Adriana Megens Marin",
        "dorsal": "20",
        "originCategory": "Juvenil"
      },
      {
        "name": "Nadeau",
        "isStaff": true,
        "staffRole": "1º Entrenador/a"
      }
    ],
    "awayRoster": [
      {
        "name": "Paula Tesseyre Rodriguez",
        "dorsal": "1"
      },
      {
        "name": "Marta Pasión Galván",
        "dorsal": "2"
      },
      {
        "name": "Carmen Vivancos Porras",
        "dorsal": "7",
        "isCaptain": true,
        "isLibero": true
      },
      {
        "name": "Carmen Cabrera Álvarez",
        "dorsal": "10"
      },
      {
        "name": "Emma Carrasco Finbom",
        "dorsal": "12"
      },
      {
        "name": "María Puebla Morillo-velarde",
        "dorsal": "14"
      },
      {
        "name": "Nuria Juviñá Fernández",
        "dorsal": "16"
      },
      {
        "name": "Emma Soto García",
        "dorsal": "22",
        "originCategory": "Juvenil"
      },
      {
        "name": "Sara Portillo Almagro",
        "dorsal": "40"
      },
      {
        "name": "Martina Pía Jaén Alconero",
        "dorsal": "41",
        "originCategory": "Cadete"
      },
      {
        "name": "Ángela Roldán Morales",
        "dorsal": "79"
      },
      {
        "name": "Sara Carrasco Finbom",
        "dorsal": "95"
      },
      {
        "name": "Cruzado",
        "isStaff": true,
        "staffRole": "1º Entrenador/a"
      },
      {
        "name": "Ortiz",
        "isStaff": true,
        "staffRole": "Cuerpo Técnico"
      }
    ]
  },
  {
    "id": "favb-1086",
    "teamId": "team-sf",
    "round": 7,
    "homeTeamName": "AL-BAYYANA ROQUETAS",
    "awayTeamName": "VOLEIBOL SAN PEDRO",
    "isClubHome": false,
    "venueName": "C.D.U. JUAN GONZALEZ FERNANDEZ (El Parador)",
    "matchDate": "2026-11-14T17:00:00.000Z",
    "status": "SCHEDULED",
    "setScores": [],
    "favbMatchUrl": "https://favoley.net/publico/seccion.php?seccion=marcador&id=1086",
    "isFeatured": false,
    "locality": "El Parador",
    "googleMapsUrl": "https://www.google.com/maps/search/?api=1&query=C.D.U.%20JUAN%20GONZALEZ%20FERNANDEZ%20El%20Parador"
  },
  {
    "id": "favb-1090",
    "teamId": "team-sf",
    "round": 8,
    "homeTeamName": "VOLEIBOL SAN PEDRO",
    "awayTeamName": "AKUMAL SPORT NUTRITION CVSA",
    "isClubHome": true,
    "venueName": "POLIDEPORTIVO SERGIO SCARIOLO – P3 (San Pedro de Alcántara)",
    "matchDate": "2026-11-21T17:00:00.000Z",
    "status": "SCHEDULED",
    "setScores": [],
    "favbMatchUrl": "https://favoley.net/publico/seccion.php?seccion=marcador&id=1090",
    "isFeatured": false,
    "court": "Pista P3",
    "locality": "San Pedro de Alcántara",
    "googleMapsUrl": "https://www.google.com/maps/search/?api=1&query=POLIDEPORTIVO%20SERGIO%20SCARIOLO%20San%20Pedro%20de%20Alc%C3%A1ntara"
  },
  {
    "id": "favb-1094",
    "teamId": "team-sf",
    "round": 9,
    "homeTeamName": "GRANAVOLEY ESPAGRUAS",
    "awayTeamName": "VOLEIBOL SAN PEDRO",
    "isClubHome": false,
    "venueName": "CENTRO DEPORTIVO JIRO (Ogíjares)",
    "matchDate": "2026-11-29T12:00:00.000Z",
    "status": "SCHEDULED",
    "setScores": [],
    "favbMatchUrl": "https://favoley.net/publico/seccion.php?seccion=marcador&id=1094",
    "isFeatured": false,
    "locality": "Ogíjares",
    "googleMapsUrl": "https://www.google.com/maps/search/?api=1&query=CENTRO%20DEPORTIVO%20JIRO%20Og%C3%ADjares"
  },
  {
    "id": "favb-1104",
    "teamId": "team-sf",
    "round": 11,
    "homeTeamName": "3STEVOLEY AIRZONE",
    "awayTeamName": "VOLEIBOL SAN PEDRO",
    "isClubHome": false,
    "venueName": "PABELLÓN DEPORTIVO RUBÉN RUZAFA (Torre de Benagalbón)",
    "matchDate": "2026-12-19T16:00:00.000Z",
    "status": "SCHEDULED",
    "setScores": [],
    "favbMatchUrl": "https://favoley.net/publico/seccion.php?seccion=marcador&id=1104",
    "isFeatured": false,
    "locality": "Torre de Benagalbón",
    "googleMapsUrl": "https://www.google.com/maps/search/?api=1&query=PABELL%C3%93N%20DEPORTIVO%20RUB%C3%89N%20RUZAFA%20Torre%20de%20Benagalb%C3%B3n"
  },
  {
    "id": "favb-1110",
    "teamId": "team-sf",
    "round": 12,
    "homeTeamName": "VOLEIBOL SAN PEDRO",
    "awayTeamName": "ACADEMIA VC ISONDA",
    "isClubHome": true,
    "venueName": "POLIDEPORTIVO SERGIO SCARIOLO – P3 (San Pedro de Alcántara)",
    "matchDate": "2027-01-16T17:30:00.000Z",
    "status": "SCHEDULED",
    "setScores": [],
    "favbMatchUrl": "https://favoley.net/publico/seccion.php?seccion=marcador&id=1110",
    "isFeatured": false,
    "court": "Pista P3",
    "locality": "San Pedro de Alcántara",
    "googleMapsUrl": "https://www.google.com/maps/search/?api=1&query=POLIDEPORTIVO%20SERGIO%20SCARIOLO%20San%20Pedro%20de%20Alc%C3%A1ntara"
  },
  {
    "id": "favb-1116",
    "teamId": "team-sf",
    "round": 13,
    "homeTeamName": "CDU ATARFE 1AF",
    "awayTeamName": "VOLEIBOL SAN PEDRO",
    "isClubHome": false,
    "venueName": "PABELLÓN POLIDEPORTIVO MUNICIPAL 1º DE MAYO ATARFE (Atarfe)",
    "matchDate": "2027-01-24T09:00:00.000Z",
    "status": "SCHEDULED",
    "setScores": [],
    "favbMatchUrl": "https://favoley.net/publico/seccion.php?seccion=marcador&id=1116",
    "isFeatured": false,
    "locality": "Atarfe",
    "googleMapsUrl": "https://www.google.com/maps/search/?api=1&query=PABELL%C3%93N%20POLIDEPORTIVO%20MUNICIPAL%201%C2%BA%20DE%20MAYO%20ATARFE%20Atarfe"
  },
  {
    "id": "favb-1122",
    "teamId": "team-sf",
    "round": 14,
    "homeTeamName": "VOLEIBOL SAN PEDRO",
    "awayTeamName": "CV CIUDAD DE MÁLAGA",
    "isClubHome": true,
    "venueName": "POLIDEPORTIVO SERGIO SCARIOLO (San Pedro de Alcántara)",
    "matchDate": "2027-01-30T17:00:00.000Z",
    "status": "SCHEDULED",
    "setScores": [],
    "favbMatchUrl": "https://favoley.net/publico/seccion.php?seccion=marcador&id=1122",
    "isFeatured": false,
    "locality": "San Pedro de Alcántara",
    "googleMapsUrl": "https://www.google.com/maps/search/?api=1&query=POLIDEPORTIVO%20SERGIO%20SCARIOLO%20San%20Pedro%20de%20Alc%C3%A1ntara"
  },
  {
    "id": "favb-1128",
    "teamId": "team-sf",
    "round": 15,
    "homeTeamName": "SIERRA ELVIRA",
    "awayTeamName": "VOLEIBOL SAN PEDRO",
    "isClubHome": false,
    "venueName": "PABELLÓN MUNICIPAL DE LAS GABIAS (Las Gabias)",
    "matchDate": "2027-02-07T11:45:00.000Z",
    "status": "SCHEDULED",
    "setScores": [],
    "favbMatchUrl": "https://favoley.net/publico/seccion.php?seccion=marcador&id=1128",
    "isFeatured": false,
    "locality": "Las Gabias",
    "googleMapsUrl": "https://www.google.com/maps/search/?api=1&query=PABELL%C3%93N%20MUNICIPAL%20DE%20LAS%20GABIAS%20Las%20Gabias"
  },
  {
    "id": "favb-1133",
    "teamId": "team-sf",
    "round": 16,
    "homeTeamName": "VOLEIBOL SAN PEDRO",
    "awayTeamName": "FUNDACIÓN CAJASOL ANDALUCÍA 1AF",
    "isClubHome": true,
    "venueName": "POLIDEPORTIVO SERGIO SCARIOLO – P3 (San Pedro de Alcántara)",
    "matchDate": "2027-02-13T17:30:00.000Z",
    "status": "SCHEDULED",
    "setScores": [],
    "favbMatchUrl": "https://favoley.net/publico/seccion.php?seccion=marcador&id=1133",
    "isFeatured": false,
    "court": "Pista P3",
    "locality": "San Pedro de Alcántara",
    "googleMapsUrl": "https://www.google.com/maps/search/?api=1&query=POLIDEPORTIVO%20SERGIO%20SCARIOLO%20San%20Pedro%20de%20Alc%C3%A1ntara"
  },
  {
    "id": "favb-1137",
    "teamId": "team-sf",
    "round": 17,
    "homeTeamName": "LAS FLORES SEVILLA",
    "awayTeamName": "VOLEIBOL SAN PEDRO",
    "isClubHome": false,
    "venueName": "CENTRO DEPORTIVO MENDIGORRIA (Sevilla)",
    "matchDate": "2027-02-21T11:00:00.000Z",
    "status": "SCHEDULED",
    "setScores": [],
    "favbMatchUrl": "https://favoley.net/publico/seccion.php?seccion=marcador&id=1137",
    "isFeatured": false,
    "locality": "Sevilla",
    "googleMapsUrl": "https://www.google.com/maps/search/?api=1&query=CENTRO%20DEPORTIVO%20MENDIGORRIA%20Sevilla"
  },
  {
    "id": "favb-1141",
    "teamId": "team-sf",
    "round": 18,
    "homeTeamName": "VOLEIBOL SAN PEDRO",
    "awayTeamName": "AL-BAYYANA ROQUETAS",
    "isClubHome": true,
    "venueName": "POLIDEPORTIVO SERGIO SCARIOLO – P3 (San Pedro de Alcántara)",
    "matchDate": "2027-02-27T17:30:00.000Z",
    "status": "SCHEDULED",
    "setScores": [],
    "favbMatchUrl": "https://favoley.net/publico/seccion.php?seccion=marcador&id=1141",
    "isFeatured": false,
    "court": "Pista P3",
    "locality": "San Pedro de Alcántara",
    "googleMapsUrl": "https://www.google.com/maps/search/?api=1&query=POLIDEPORTIVO%20SERGIO%20SCARIOLO%20San%20Pedro%20de%20Alc%C3%A1ntara"
  },
  {
    "id": "favb-1145",
    "teamId": "team-sf",
    "round": 19,
    "homeTeamName": "AKUMAL SPORT NUTRITION CVSA",
    "awayTeamName": "VOLEIBOL SAN PEDRO",
    "isClubHome": false,
    "venueName": "Complejo deportivo Rafael Machado Villar (Armilla)",
    "matchDate": "2027-03-06T19:00:00.000Z",
    "status": "SCHEDULED",
    "setScores": [],
    "favbMatchUrl": "https://favoley.net/publico/seccion.php?seccion=marcador&id=1145",
    "isFeatured": false,
    "locality": "Armilla",
    "googleMapsUrl": "https://www.google.com/maps/search/?api=1&query=Complejo%20deportivo%20Rafael%20Machado%20Villar%20Armilla"
  },
  {
    "id": "favb-1149",
    "teamId": "team-sf",
    "round": 20,
    "homeTeamName": "VOLEIBOL SAN PEDRO",
    "awayTeamName": "GRANAVOLEY ESPAGRUAS",
    "isClubHome": true,
    "venueName": "POLIDEPORTIVO SERGIO SCARIOLO (San Pedro de Alcántara)",
    "matchDate": "2027-03-13T17:30:00.000Z",
    "status": "SCHEDULED",
    "setScores": [],
    "favbMatchUrl": "https://favoley.net/publico/seccion.php?seccion=marcador&id=1149",
    "isFeatured": false,
    "locality": "San Pedro de Alcántara",
    "googleMapsUrl": "https://www.google.com/maps/search/?api=1&query=POLIDEPORTIVO%20SERGIO%20SCARIOLO%20San%20Pedro%20de%20Alc%C3%A1ntara"
  },
  {
    "id": "favb-1159",
    "teamId": "team-sf",
    "round": 22,
    "homeTeamName": "VOLEIBOL SAN PEDRO",
    "awayTeamName": "3STEVOLEY AIRZONE",
    "isClubHome": true,
    "venueName": "POLIDEPORTIVO SERGIO SCARIOLO – P3 (San Pedro de Alcántara)",
    "matchDate": "2027-04-24T16:30:00.000Z",
    "status": "SCHEDULED",
    "setScores": [],
    "favbMatchUrl": "https://favoley.net/publico/seccion.php?seccion=marcador&id=1159",
    "isFeatured": false,
    "court": "Pista P3",
    "locality": "San Pedro de Alcántara",
    "googleMapsUrl": "https://www.google.com/maps/search/?api=1&query=POLIDEPORTIVO%20SERGIO%20SCARIOLO%20San%20Pedro%20de%20Alc%C3%A1ntara"
  },
  {
    "id": "favb-8402",
    "teamId": "team-sm",
    "round": 1,
    "homeTeamName": "VOLEIBOL SAN PEDRO",
    "awayTeamName": "CD VOLEYPLAYA LINENSE 2X2",
    "isClubHome": true,
    "venueName": "POLIDEPORTIVO SERGIO SCARIOLO – P3 (San Pedro de Alcántara)",
    "matchDate": "2026-11-07T19:00:00.000Z",
    "status": "FINISHED",
    "homeScore": 3,
    "awayScore": 2,
    "setScores": [
      {
        "home": 22,
        "away": 25
      },
      {
        "home": 25,
        "away": 15
      },
      {
        "home": 23,
        "away": 25
      },
      {
        "home": 25,
        "away": 20
      },
      {
        "home": 15,
        "away": 8
      }
    ],
    "favbMatchUrl": "https://favoley.net/publico/seccion.php?seccion=marcador&id=8402",
    "isFeatured": false,
    "court": "Pista P3",
    "locality": "San Pedro de Alcántara",
    "googleMapsUrl": "https://www.google.com/maps/search/?api=1&query=POLIDEPORTIVO%20SERGIO%20SCARIOLO%20San%20Pedro%20de%20Alc%C3%A1ntara",
    "referees": [
      {
        "role": "1º Árbitro",
        "name": "Alba Badillo Calle"
      },
      {
        "role": "2º Árbitro",
        "name": "Sara Perea Espinosa"
      }
    ],
    "homeRoster": [
      {
        "name": "Pablo Vazquez Calatayud",
        "dorsal": "1"
      },
      {
        "name": "Przemyslaw Krenczyk",
        "dorsal": "3"
      },
      {
        "name": "Fernando Vazquez Calvente",
        "dorsal": "5",
        "isLibero": true
      },
      {
        "name": "Salvador Martínez Martínez",
        "dorsal": "7"
      },
      {
        "name": "Juan Eufrasio Martinez Martinez",
        "dorsal": "10"
      },
      {
        "name": "José Benítez Hidalgo",
        "dorsal": "14"
      },
      {
        "name": "Alejandro Hurtado Gonzalez",
        "dorsal": "18"
      },
      {
        "name": "Mateo Perez Ruiz",
        "dorsal": "19",
        "originCategory": "Juvenil"
      },
      {
        "name": "Javier Rodríguez Gadea",
        "dorsal": "22",
        "isCaptain": true
      },
      {
        "name": "Christopher Martin Martin",
        "dorsal": "47",
        "isLibero": true
      },
      {
        "name": "Sacha Schapovaloff González",
        "dorsal": "81"
      },
      {
        "name": "Luis Miguel Marrugo De Arco",
        "dorsal": "98"
      },
      {
        "name": "Gonzalo Galán Toro",
        "dorsal": "99",
        "originCategory": "Juvenil"
      },
      {
        "name": "Nadeau",
        "isStaff": true,
        "staffRole": "1º Entrenador/a"
      }
    ],
    "awayRoster": [
      {
        "name": "Evan Hamilton",
        "dorsal": "2"
      },
      {
        "name": "Filip Baranowski",
        "dorsal": "5"
      },
      {
        "name": "Ángel Gómez Martín",
        "dorsal": "8",
        "isCaptain": true
      },
      {
        "name": "Luis Gonzalo Cazorla Cabezas",
        "dorsal": "10"
      },
      {
        "name": "Pablo Gastón Lagos Córdoba",
        "dorsal": "11"
      },
      {
        "name": "Jose Muñoz Serrano",
        "dorsal": "13"
      },
      {
        "name": "Gonzalo Nunes Carvalho",
        "dorsal": "15",
        "isLibero": true
      },
      {
        "name": "Julian Byrne",
        "dorsal": "16"
      },
      {
        "name": "Álvaro Román Núñez",
        "dorsal": "17"
      },
      {
        "name": "Francisco De Jesus Iglesias Martin",
        "dorsal": "21",
        "isLibero": true
      },
      {
        "name": "Milson Dieter Lizarazu Cruz",
        "dorsal": "69"
      },
      {
        "name": "Ramon Molina Meléndez",
        "dorsal": "98"
      },
      {
        "name": "Cazorla",
        "isStaff": true,
        "staffRole": "1º Entrenador/a"
      },
      {
        "name": "Diaz",
        "isStaff": true,
        "staffRole": "2º Entrenador/a"
      },
      {
        "name": "Lagos",
        "isStaff": true,
        "staffRole": "2º Entrenador/a"
      }
    ]
  },
  {
    "id": "favb-8406",
    "teamId": "team-sm",
    "round": 2,
    "homeTeamName": "INTER PLAYAS",
    "awayTeamName": "VOLEIBOL SAN PEDRO",
    "isClubHome": false,
    "venueName": "PABELLÓN CUBIERTO FRANCISCO J. AGUILAR (Vélez-Málaga)",
    "matchDate": "2026-11-14T11:00:00.000Z",
    "status": "SCHEDULED",
    "setScores": [],
    "favbMatchUrl": "https://favoley.net/publico/seccion.php?seccion=marcador&id=8406",
    "isFeatured": false,
    "locality": "Vélez-Málaga",
    "googleMapsUrl": "https://www.google.com/maps/search/?api=1&query=PABELL%C3%93N%20CUBIERTO%20FRANCISCO%20J.%20AGUILAR%20V%C3%A9lez-M%C3%A1laga"
  },
  {
    "id": "favb-8410",
    "teamId": "team-sm",
    "round": 3,
    "homeTeamName": "VOLEIBOL SAN PEDRO",
    "awayTeamName": "LA CORACHA B",
    "isClubHome": true,
    "venueName": "POLIDEPORTIVO SERGIO SCARIOLO – P3 (San Pedro de Alcántara)",
    "matchDate": "2026-11-22T15:00:00.000Z",
    "status": "SCHEDULED",
    "setScores": [],
    "favbMatchUrl": "https://favoley.net/publico/seccion.php?seccion=marcador&id=8410",
    "isFeatured": false,
    "court": "Pista P3",
    "locality": "San Pedro de Alcántara",
    "googleMapsUrl": "https://www.google.com/maps/search/?api=1&query=POLIDEPORTIVO%20SERGIO%20SCARIOLO%20San%20Pedro%20de%20Alc%C3%A1ntara"
  },
  {
    "id": "favb-8413",
    "teamId": "team-sm",
    "round": 4,
    "homeTeamName": "CARTAMA",
    "awayTeamName": "VOLEIBOL SAN PEDRO",
    "isClubHome": false,
    "venueName": "Pabellón Municipal Visitante",
    "matchDate": "2026-11-28T11:00:00.000Z",
    "status": "SCHEDULED",
    "setScores": [],
    "favbMatchUrl": "https://favoley.net/publico/seccion.php?seccion=marcador&id=8413",
    "isFeatured": false,
    "googleMapsUrl": "https://www.google.com/maps/search/?api=1&query=Pabell%C3%B3n%20Municipal%20Visitante"
  },
  {
    "id": "favb-8415",
    "teamId": "team-sm",
    "round": 5,
    "homeTeamName": "VOLEIBOL SAN PEDRO",
    "awayTeamName": "FUENGIROLA CV",
    "isClubHome": true,
    "venueName": "Pabellón Polideportivo Sergio Scariolo",
    "matchDate": "2026-12-05T17:30:00.000Z",
    "status": "SCHEDULED",
    "setScores": [],
    "favbMatchUrl": "https://favoley.net/publico/seccion.php?seccion=marcador&id=8415",
    "isFeatured": false,
    "googleMapsUrl": "https://www.google.com/maps/search/?api=1&query=Pabell%C3%B3n%20Polideportivo%20Sergio%20Scariolo"
  },
  {
    "id": "favb-8417",
    "teamId": "team-sm",
    "round": 6,
    "homeTeamName": "JUST VOLEY CV A",
    "awayTeamName": "VOLEIBOL SAN PEDRO",
    "isClubHome": false,
    "venueName": "COLEGIO SAN JOSÉ (Málaga)",
    "matchDate": "2026-12-13T15:00:00.000Z",
    "status": "SCHEDULED",
    "setScores": [],
    "favbMatchUrl": "https://favoley.net/publico/seccion.php?seccion=marcador&id=8417",
    "isFeatured": false,
    "locality": "Málaga",
    "googleMapsUrl": "https://www.google.com/maps/search/?api=1&query=COLEGIO%20SAN%20JOS%C3%89%20M%C3%A1laga"
  },
  {
    "id": "favb-8423",
    "teamId": "team-sm",
    "round": 8,
    "homeTeamName": "CD VOLEYPLAYA LINENSE 2X2",
    "awayTeamName": "VOLEIBOL SAN PEDRO",
    "isClubHome": false,
    "venueName": "Pabellón Municipal Visitante",
    "matchDate": "2027-01-16T11:00:00.000Z",
    "status": "SCHEDULED",
    "setScores": [],
    "favbMatchUrl": "https://favoley.net/publico/seccion.php?seccion=marcador&id=8423",
    "isFeatured": false,
    "googleMapsUrl": "https://www.google.com/maps/search/?api=1&query=Pabell%C3%B3n%20Municipal%20Visitante"
  },
  {
    "id": "favb-8427",
    "teamId": "team-sm",
    "round": 9,
    "homeTeamName": "VOLEIBOL SAN PEDRO",
    "awayTeamName": "INTER PLAYAS",
    "isClubHome": true,
    "venueName": "Pabellón Polideportivo Sergio Scariolo",
    "matchDate": "2027-01-23T17:30:00.000Z",
    "status": "SCHEDULED",
    "setScores": [],
    "favbMatchUrl": "https://favoley.net/publico/seccion.php?seccion=marcador&id=8427",
    "isFeatured": false,
    "googleMapsUrl": "https://www.google.com/maps/search/?api=1&query=Pabell%C3%B3n%20Polideportivo%20Sergio%20Scariolo"
  },
  {
    "id": "favb-8431",
    "teamId": "team-sm",
    "round": 10,
    "homeTeamName": "LA CORACHA B",
    "awayTeamName": "VOLEIBOL SAN PEDRO",
    "isClubHome": false,
    "venueName": "Pabellón Municipal Visitante",
    "matchDate": "2027-01-30T11:00:00.000Z",
    "status": "SCHEDULED",
    "setScores": [],
    "favbMatchUrl": "https://favoley.net/publico/seccion.php?seccion=marcador&id=8431",
    "isFeatured": false,
    "googleMapsUrl": "https://www.google.com/maps/search/?api=1&query=Pabell%C3%B3n%20Municipal%20Visitante"
  },
  {
    "id": "favb-8434",
    "teamId": "team-sm",
    "round": 11,
    "homeTeamName": "VOLEIBOL SAN PEDRO",
    "awayTeamName": "CARTAMA",
    "isClubHome": true,
    "venueName": "Pabellón Polideportivo Sergio Scariolo",
    "matchDate": "2027-02-06T17:30:00.000Z",
    "status": "SCHEDULED",
    "setScores": [],
    "favbMatchUrl": "https://favoley.net/publico/seccion.php?seccion=marcador&id=8434",
    "isFeatured": false,
    "googleMapsUrl": "https://www.google.com/maps/search/?api=1&query=Pabell%C3%B3n%20Polideportivo%20Sergio%20Scariolo"
  },
  {
    "id": "favb-8436",
    "teamId": "team-sm",
    "round": 12,
    "homeTeamName": "FUENGIROLA CV",
    "awayTeamName": "VOLEIBOL SAN PEDRO",
    "isClubHome": false,
    "venueName": "Pabellón Municipal Visitante",
    "matchDate": "2027-02-13T11:00:00.000Z",
    "status": "SCHEDULED",
    "setScores": [],
    "favbMatchUrl": "https://favoley.net/publico/seccion.php?seccion=marcador&id=8436",
    "isFeatured": false,
    "googleMapsUrl": "https://www.google.com/maps/search/?api=1&query=Pabell%C3%B3n%20Municipal%20Visitante"
  },
  {
    "id": "favb-8438",
    "teamId": "team-sm",
    "round": 13,
    "homeTeamName": "VOLEIBOL SAN PEDRO",
    "awayTeamName": "JUST VOLEY CV A",
    "isClubHome": true,
    "venueName": "Pabellón Polideportivo Sergio Scariolo",
    "matchDate": "2027-02-20T17:30:00.000Z",
    "status": "SCHEDULED",
    "setScores": [],
    "favbMatchUrl": "https://favoley.net/publico/seccion.php?seccion=marcador&id=8438",
    "isFeatured": false,
    "googleMapsUrl": "https://www.google.com/maps/search/?api=1&query=Pabell%C3%B3n%20Polideportivo%20Sergio%20Scariolo"
  },
  {
    "id": "favb-1476",
    "teamId": "team-jm",
    "round": 1,
    "homeTeamName": "VOLEIBOL SAN PEDRO",
    "awayTeamName": "FUENGIROLA CV A",
    "isClubHome": true,
    "venueName": "POLIDEPORTIVO SERGIO SCARIOLO – P3 (San Pedro de Alcántara)",
    "matchDate": "2026-10-03T15:00:00.000Z",
    "status": "FINISHED",
    "homeScore": 1,
    "awayScore": 3,
    "setScores": [
      {
        "home": 12,
        "away": 25
      },
      {
        "home": 22,
        "away": 25
      },
      {
        "home": 25,
        "away": 19
      },
      {
        "home": 22,
        "away": 25
      }
    ],
    "favbMatchUrl": "https://favoley.net/publico/seccion.php?seccion=marcador&id=1476",
    "isFeatured": false,
    "court": "Pista P3",
    "locality": "San Pedro de Alcántara",
    "googleMapsUrl": "https://www.google.com/maps/search/?api=1&query=POLIDEPORTIVO%20SERGIO%20SCARIOLO%20San%20Pedro%20de%20Alc%C3%A1ntara",
    "referees": [
      {
        "role": "1º Árbitro",
        "name": "Rodolfo Israel Drago Figueras"
      },
      {
        "role": "2º Árbitro",
        "name": "Rodolfo Drago Ravelo"
      }
    ],
    "homeRoster": [
      {
        "name": "Nicolás Serrato Rojo",
        "dorsal": "1",
        "originCategory": "Cadete"
      },
      {
        "name": "Mateo Perez Ruiz",
        "dorsal": "3"
      },
      {
        "name": "Solane Mordant",
        "dorsal": "4"
      },
      {
        "name": "Timur Shylko",
        "dorsal": "9"
      },
      {
        "name": "Pedro Núñez Romero",
        "dorsal": "11",
        "originCategory": "Cadete"
      },
      {
        "name": "Ángel Hurtado González",
        "dorsal": "18"
      },
      {
        "name": "Alejandro Moncayo Pino",
        "dorsal": "21"
      },
      {
        "name": "Dominik Tapia Manzano",
        "dorsal": "69"
      },
      {
        "name": "Ignacio Mendez",
        "dorsal": "98"
      },
      {
        "name": "Gonzalo Galán Toro",
        "dorsal": "99",
        "isCaptain": true,
        "isLibero": true
      },
      {
        "name": "Nadeau",
        "isStaff": true,
        "staffRole": "1º Entrenador/a"
      }
    ],
    "awayRoster": [
      {
        "name": "Alexan Lorsignol Suso",
        "dorsal": "1"
      },
      {
        "name": "Juan Jose Moreno Melendez",
        "dorsal": "2"
      },
      {
        "name": "Sergio Moreno Jiménez",
        "dorsal": "3"
      },
      {
        "name": "Alexander Ivaylov Guenadiev Vinev",
        "dorsal": "4"
      },
      {
        "name": "Armando López Caballero",
        "dorsal": "5",
        "isCaptain": true
      },
      {
        "name": "Facundo Gonzalez Estrella",
        "dorsal": "6"
      },
      {
        "name": "Ramiro Moreira",
        "dorsal": "7"
      },
      {
        "name": "Ángel Reina Santana",
        "dorsal": "9"
      },
      {
        "name": "Daniel Giraldo Velastegui",
        "dorsal": "14",
        "isLibero": true
      },
      {
        "name": "Caprarola",
        "isStaff": true,
        "staffRole": "1º Entrenador/a"
      }
    ]
  },
  {
    "id": "favb-1479",
    "teamId": "team-jm",
    "round": 2,
    "homeTeamName": "UDA BENALMADENA",
    "awayTeamName": "VOLEIBOL SAN PEDRO",
    "isClubHome": false,
    "venueName": "POLIDEPORTIVO MUNICIPAL DE ARROYO DE LA MIEL (Benalmádena)",
    "matchDate": "2026-10-11T10:00:00.000Z",
    "status": "FINISHED",
    "homeScore": 3,
    "awayScore": 0,
    "setScores": [
      {
        "home": 25,
        "away": 12
      },
      {
        "home": 25,
        "away": 13
      },
      {
        "home": 25,
        "away": 19
      }
    ],
    "favbMatchUrl": "https://favoley.net/publico/seccion.php?seccion=marcador&id=1479",
    "isFeatured": false,
    "locality": "Benalmádena",
    "googleMapsUrl": "https://www.google.com/maps/search/?api=1&query=POLIDEPORTIVO%20MUNICIPAL%20DE%20ARROYO%20DE%20LA%20MIEL%20Benalm%C3%A1dena",
    "referees": [
      {
        "role": "1º Árbitro",
        "name": "Jose Antonio Cuadra Perez"
      },
      {
        "role": "2º Árbitro",
        "name": "Alba Peña Mateos"
      }
    ],
    "homeRoster": [
      {
        "name": "Joaquin Etienne Vilte",
        "dorsal": "2"
      },
      {
        "name": "Sergio Sancho Curiel",
        "dorsal": "5",
        "originCategory": "Cadete"
      },
      {
        "name": "Pablo Alba Cano",
        "dorsal": "6",
        "isCaptain": true
      },
      {
        "name": "Bruno Ortega Surano",
        "dorsal": "11"
      },
      {
        "name": "Aitor Logrosán Hernández",
        "dorsal": "12"
      },
      {
        "name": "Aleksander Tsvetanov Dotsin",
        "dorsal": "15"
      },
      {
        "name": "Lucas Pérez Ruiz",
        "dorsal": "19",
        "isLibero": true
      },
      {
        "name": "Alejandro Matos Heredia",
        "dorsal": "20",
        "isLibero": true,
        "originCategory": "Cadete"
      },
      {
        "name": "Marcos Cusac Segura",
        "dorsal": "21"
      },
      {
        "name": "Nico Blanco Castillo",
        "dorsal": "22"
      },
      {
        "name": "Marcos Gonzalez Vegas",
        "dorsal": "24"
      },
      {
        "name": "Martin Skirmantas Khitev",
        "dorsal": "27"
      },
      {
        "name": "Santiago Díaz Pascual",
        "dorsal": "31"
      },
      {
        "name": "Torres",
        "isStaff": true,
        "staffRole": "1º Entrenador/a"
      },
      {
        "name": "Perea",
        "isStaff": true,
        "staffRole": "2º Entrenador/a"
      }
    ],
    "awayRoster": [
      {
        "name": "Nicolás Serrato Rojo",
        "dorsal": "1",
        "originCategory": "Cadete"
      },
      {
        "name": "Pedro Núñez Romero",
        "dorsal": "4",
        "originCategory": "Cadete"
      },
      {
        "name": "Ignacio Mendez",
        "dorsal": "11"
      },
      {
        "name": "Alvaro Gonzalez Auñon",
        "dorsal": "15",
        "originCategory": "Cadete"
      },
      {
        "name": "Ángel Hurtado González",
        "dorsal": "18"
      },
      {
        "name": "Lebron Michael Barrozo Perez",
        "dorsal": "19",
        "isLibero": true,
        "originCategory": "Cadete"
      },
      {
        "name": "Alejandro Moncayo Pino",
        "dorsal": "21"
      },
      {
        "name": "Dominik Tapia Manzano",
        "dorsal": "69"
      },
      {
        "name": "Gonzalo Galán Toro",
        "dorsal": "99",
        "isCaptain": true
      },
      {
        "name": "Nadeau",
        "isStaff": true,
        "staffRole": "1º Entrenador/a"
      }
    ]
  },
  {
    "id": "favb-1481",
    "teamId": "team-jm",
    "round": 3,
    "homeTeamName": "VOLEIBOL SAN PEDRO",
    "awayTeamName": "CARTAMA",
    "isClubHome": true,
    "venueName": "POLIDEPORTIVO SERGIO SCARIOLO – P3 (San Pedro de Alcántara)",
    "matchDate": "2026-10-18T17:00:00.000Z",
    "status": "FINISHED",
    "homeScore": 0,
    "awayScore": 3,
    "setScores": [
      {
        "home": 11,
        "away": 25
      },
      {
        "home": 19,
        "away": 25
      },
      {
        "home": 15,
        "away": 25
      }
    ],
    "favbMatchUrl": "https://favoley.net/publico/seccion.php?seccion=marcador&id=1481",
    "isFeatured": false,
    "court": "Pista P3",
    "locality": "San Pedro de Alcántara",
    "googleMapsUrl": "https://www.google.com/maps/search/?api=1&query=POLIDEPORTIVO%20SERGIO%20SCARIOLO%20San%20Pedro%20de%20Alc%C3%A1ntara",
    "referees": [
      {
        "role": "1º Árbitro",
        "name": "Rodolfo Israel Drago Figueras"
      },
      {
        "role": "Anotador/a",
        "name": "Rodolfo Drago Ravelo"
      }
    ],
    "homeRoster": [
      {
        "name": "Nicolás Serrato Rojo",
        "dorsal": "1",
        "originCategory": "Cadete"
      },
      {
        "name": "Mateo Perez Ruiz",
        "dorsal": "3"
      },
      {
        "name": "Pedro Núñez Romero",
        "dorsal": "4",
        "originCategory": "Cadete"
      },
      {
        "name": "Ignacio Mendez",
        "dorsal": "11"
      },
      {
        "name": "Ángel Hurtado González",
        "dorsal": "18"
      },
      {
        "name": "Alejandro Moncayo Pino",
        "dorsal": "21"
      },
      {
        "name": "David Casillas Llamas",
        "dorsal": "31",
        "isLibero": true
      },
      {
        "name": "Dominik Tapia Manzano",
        "dorsal": "69"
      },
      {
        "name": "Gonzalo Galán Toro",
        "dorsal": "99",
        "isCaptain": true
      },
      {
        "name": "Nadeau",
        "isStaff": true,
        "staffRole": "1º Entrenador/a"
      }
    ],
    "awayRoster": [
      {
        "name": "Alejandro Ayllón Pimentel",
        "dorsal": "1",
        "isCaptain": true
      },
      {
        "name": "Nacho Chaves Cerezo",
        "dorsal": "2",
        "isLibero": true
      },
      {
        "name": "Daniel León García",
        "dorsal": "6"
      },
      {
        "name": "Martin Postigo Olmo",
        "dorsal": "7"
      },
      {
        "name": "Samuel García Romero",
        "dorsal": "8"
      },
      {
        "name": "Pablo Aranda Moreno",
        "dorsal": "10"
      },
      {
        "name": "Jose Alejandro Quintero Martinez",
        "dorsal": "11"
      },
      {
        "name": "Rene Romero Cortes",
        "dorsal": "12"
      },
      {
        "name": "Angel Andujar Ramirez",
        "dorsal": "13"
      },
      {
        "name": "Kendry Jordary Reynoza Orozco",
        "dorsal": "21"
      },
      {
        "name": "Sebastian Fernandez Cardozo",
        "dorsal": "23"
      },
      {
        "name": "Jorge García Gómez",
        "dorsal": "31",
        "isLibero": true
      },
      {
        "name": "Ciro Alejandro González Luque",
        "dorsal": "67"
      },
      {
        "name": "Palomo",
        "isStaff": true,
        "staffRole": "1º Entrenador/a"
      }
    ]
  },
  {
    "id": "favb-1482",
    "teamId": "team-jm",
    "round": 4,
    "homeTeamName": "INTER PLAYAS",
    "awayTeamName": "VOLEIBOL SAN PEDRO",
    "isClubHome": false,
    "venueName": "IES JOAQUÍN LOBATO (Torre del Mar)",
    "matchDate": "2026-10-24T14:00:00.000Z",
    "status": "FINISHED",
    "homeScore": 3,
    "awayScore": 0,
    "setScores": [
      {
        "home": 25,
        "away": 15
      },
      {
        "home": 25,
        "away": 15
      },
      {
        "home": 25,
        "away": 14
      }
    ],
    "favbMatchUrl": "https://favoley.net/publico/seccion.php?seccion=marcador&id=1482",
    "isFeatured": false,
    "locality": "Torre del Mar",
    "googleMapsUrl": "https://www.google.com/maps/search/?api=1&query=IES%20JOAQU%C3%8DN%20LOBATO%20Torre%20del%20Mar",
    "referees": [
      {
        "role": "1º Árbitro",
        "name": "Julia Aguilera Pardo"
      },
      {
        "role": "Anotador/a",
        "name": "Clara Elisa Bautista Rueda"
      }
    ],
    "homeRoster": [
      {
        "name": "Pablo Sánchez Jiménez",
        "dorsal": "1"
      },
      {
        "name": "Matias Gerez Iglesia",
        "dorsal": "3",
        "isCaptain": true
      },
      {
        "name": "Yanis Gabriel Simion",
        "dorsal": "4"
      },
      {
        "name": "Pedro Silva Roig",
        "dorsal": "8",
        "isLibero": true
      },
      {
        "name": "Daniel Alcantara Sanchez",
        "dorsal": "9"
      },
      {
        "name": "Andrés Martín Jiménez",
        "dorsal": "11"
      },
      {
        "name": "Guillermo Olaya Pezzi",
        "dorsal": "13",
        "isLibero": true
      },
      {
        "name": "Danilo Pasi",
        "dorsal": "15"
      },
      {
        "name": "Rodrigo Maturana Domínguez",
        "dorsal": "25"
      },
      {
        "name": "Diego Pacheco Maino",
        "dorsal": "31"
      },
      {
        "name": "Bravo",
        "isStaff": true,
        "staffRole": "1º Entrenador/a"
      }
    ],
    "awayRoster": [
      {
        "name": "Nicolás Serrato Rojo",
        "dorsal": "1",
        "isLibero": true,
        "originCategory": "Cadete"
      },
      {
        "name": "Mateo Perez Ruiz",
        "dorsal": "3"
      },
      {
        "name": "Pedro Núñez Romero",
        "dorsal": "4",
        "originCategory": "Cadete"
      },
      {
        "name": "Ignacio Mendez",
        "dorsal": "9"
      },
      {
        "name": "Ángel Hurtado González",
        "dorsal": "18"
      },
      {
        "name": "Lebron Michael Barrozo Perez",
        "dorsal": "19",
        "originCategory": "Cadete"
      },
      {
        "name": "Alejandro Moncayo Pino",
        "dorsal": "21"
      },
      {
        "name": "Gonzalo Galán Toro",
        "dorsal": "99",
        "isCaptain": true
      },
      {
        "name": "Nadeau",
        "isStaff": true,
        "staffRole": "1º Entrenador/a"
      }
    ]
  },
  {
    "id": "favb-1486",
    "teamId": "team-jm",
    "round": 6,
    "homeTeamName": "FUENGIROLA CV A",
    "awayTeamName": "VOLEIBOL SAN PEDRO",
    "isClubHome": false,
    "venueName": "COMPLEJO POLIDEPORTIVO MUNICIPAL ELOLA (Fuengirola)",
    "matchDate": "2026-11-15T13:00:00.000Z",
    "status": "SCHEDULED",
    "setScores": [],
    "favbMatchUrl": "https://favoley.net/publico/seccion.php?seccion=marcador&id=1486",
    "isFeatured": false,
    "locality": "Fuengirola",
    "googleMapsUrl": "https://www.google.com/maps/search/?api=1&query=COMPLEJO%20POLIDEPORTIVO%20MUNICIPAL%20ELOLA%20Fuengirola"
  },
  {
    "id": "favb-1489",
    "teamId": "team-jm",
    "round": 7,
    "homeTeamName": "VOLEIBOL SAN PEDRO",
    "awayTeamName": "UDA BENALMADENA",
    "isClubHome": true,
    "venueName": "Pabellón Polideportivo Sergio Scariolo",
    "matchDate": "2026-11-20T17:30:00.000Z",
    "status": "SCHEDULED",
    "setScores": [],
    "favbMatchUrl": "https://favoley.net/publico/seccion.php?seccion=marcador&id=1489",
    "isFeatured": false,
    "googleMapsUrl": "https://www.google.com/maps/search/?api=1&query=Pabell%C3%B3n%20Polideportivo%20Sergio%20Scariolo"
  },
  {
    "id": "favb-1491",
    "teamId": "team-jm",
    "round": 8,
    "homeTeamName": "CARTAMA",
    "awayTeamName": "VOLEIBOL SAN PEDRO",
    "isClubHome": false,
    "venueName": "Pabellón Municipal Visitante",
    "matchDate": "2026-11-27T11:00:00.000Z",
    "status": "SCHEDULED",
    "setScores": [],
    "favbMatchUrl": "https://favoley.net/publico/seccion.php?seccion=marcador&id=1491",
    "isFeatured": false,
    "googleMapsUrl": "https://www.google.com/maps/search/?api=1&query=Pabell%C3%B3n%20Municipal%20Visitante"
  },
  {
    "id": "favb-1492",
    "teamId": "team-jm",
    "round": 9,
    "homeTeamName": "VOLEIBOL SAN PEDRO",
    "awayTeamName": "INTER PLAYAS",
    "isClubHome": true,
    "venueName": "Pabellón Polideportivo Sergio Scariolo",
    "matchDate": "2026-12-11T17:30:00.000Z",
    "status": "SCHEDULED",
    "setScores": [],
    "favbMatchUrl": "https://favoley.net/publico/seccion.php?seccion=marcador&id=1492",
    "isFeatured": false,
    "googleMapsUrl": "https://www.google.com/maps/search/?api=1&query=Pabell%C3%B3n%20Polideportivo%20Sergio%20Scariolo"
  },
  {
    "id": "favb-1834",
    "teamId": "team-jf-rojo",
    "round": 1,
    "homeTeamName": "CARTAMA AZUL",
    "awayTeamName": "VOLEIBOL SAN PEDRO ROJO",
    "isClubHome": false,
    "venueName": "POLIDEPORTIVO MUNICIPAL DE CARTAMA – P2 (Cártama)",
    "matchDate": "2026-10-03T09:00:00.000Z",
    "status": "FINISHED",
    "homeScore": 3,
    "awayScore": 0,
    "setScores": [
      {
        "home": 25,
        "away": 3
      },
      {
        "home": 25,
        "away": 10
      },
      {
        "home": 25,
        "away": 16
      }
    ],
    "favbMatchUrl": "https://favoley.net/publico/seccion.php?seccion=marcador&id=1834",
    "isFeatured": false,
    "court": "Pista P2",
    "locality": "Cártama",
    "googleMapsUrl": "https://www.google.com/maps/search/?api=1&query=POLIDEPORTIVO%20MUNICIPAL%20DE%20CARTAMA%20C%C3%A1rtama",
    "referees": [
      {
        "role": "1º Árbitro",
        "name": "Sara Perea Espinosa"
      },
      {
        "role": "2º Árbitro",
        "name": "Maria Andrea Perea Espinosa"
      }
    ],
    "homeRoster": [
      {
        "name": "Guadalupe Amancay Diaz",
        "dorsal": "2",
        "isLibero": true,
        "originCategory": "Cadete"
      },
      {
        "name": "Paloma Duarte Ojeda",
        "dorsal": "7",
        "isCaptain": true
      },
      {
        "name": "Adriana Gutierrez Llauger",
        "dorsal": "8",
        "isLibero": true
      },
      {
        "name": "Aide Caceres Goyanes",
        "dorsal": "9",
        "originCategory": "Cadete"
      },
      {
        "name": "Carmen Martín Ramírez",
        "dorsal": "10",
        "originCategory": "Cadete"
      },
      {
        "name": "Elena Soto Maldonado",
        "dorsal": "11",
        "originCategory": "Cadete"
      },
      {
        "name": "Marina Lozano Molina",
        "dorsal": "14",
        "originCategory": "Cadete"
      },
      {
        "name": "Elsa Rueda Le Guillou",
        "dorsal": "17",
        "originCategory": "Cadete"
      },
      {
        "name": "Ines Cáceres Goyanes",
        "dorsal": "18",
        "originCategory": "Cadete"
      },
      {
        "name": "Stefaniya Salikhbaeva",
        "dorsal": "21",
        "originCategory": "Cadete"
      },
      {
        "name": "Marta Rodríguez Ortega",
        "dorsal": "81",
        "originCategory": "Cadete"
      },
      {
        "name": "Villa",
        "isStaff": true,
        "staffRole": "1º Entrenador/a"
      }
    ],
    "awayRoster": [
      {
        "name": "Marta Sanchez Rosado",
        "dorsal": "1",
        "isCaptain": true
      },
      {
        "name": "Lola Ríos Osuna",
        "dorsal": "2"
      },
      {
        "name": "Lucía Jiménez Cuadrado",
        "dorsal": "4"
      },
      {
        "name": "Sheena Elaine Garay Fernandez",
        "dorsal": "6",
        "isLibero": true
      },
      {
        "name": "Roma Garcia Soler",
        "dorsal": "7"
      },
      {
        "name": "Luna Guerrero Dueñas",
        "dorsal": "11"
      },
      {
        "name": "Laura Cordero Cortes",
        "dorsal": "12",
        "isLibero": true
      },
      {
        "name": "Adriana Megens Marin",
        "dorsal": "15"
      },
      {
        "name": "Nahiara Gutiérrez Durkin",
        "dorsal": "16"
      },
      {
        "name": "Rocio Valencia Artola",
        "dorsal": "17"
      },
      {
        "name": "Carla Moncayo Pérez",
        "dorsal": "19"
      },
      {
        "name": "Sofía Benítez Cañizares",
        "dorsal": "31"
      },
      {
        "name": "Nadeau",
        "isStaff": true,
        "staffRole": "1º Entrenador/a"
      }
    ]
  },
  {
    "id": "favb-1837",
    "teamId": "team-jf-rojo",
    "round": 2,
    "homeTeamName": "VOLEIBOL SAN PEDRO ROJO",
    "awayTeamName": "COSTA DEL VOLEY ROSA",
    "isClubHome": true,
    "venueName": "POLIDEPORTIVO SERGIO SCARIOLO – P3 (San Pedro de Alcántara)",
    "matchDate": "2026-10-10T10:30:00.000Z",
    "status": "FINISHED",
    "homeScore": 0,
    "awayScore": 3,
    "setScores": [
      {
        "home": 21,
        "away": 25
      },
      {
        "home": 23,
        "away": 25
      },
      {
        "home": 20,
        "away": 25
      }
    ],
    "favbMatchUrl": "https://favoley.net/publico/seccion.php?seccion=marcador&id=1837",
    "isFeatured": false,
    "court": "Pista P3",
    "locality": "San Pedro de Alcántara",
    "googleMapsUrl": "https://www.google.com/maps/search/?api=1&query=POLIDEPORTIVO%20SERGIO%20SCARIOLO%20San%20Pedro%20de%20Alc%C3%A1ntara",
    "referees": [
      {
        "role": "1º Árbitro",
        "name": "Alba Badillo Calle"
      },
      {
        "role": "Anotador/a",
        "name": "Rodolfo Drago Ravelo"
      }
    ],
    "homeRoster": [
      {
        "name": "Marta Sanchez Rosado",
        "dorsal": "1",
        "isCaptain": true
      },
      {
        "name": "Carla Moncayo Pérez",
        "dorsal": "2"
      },
      {
        "name": "Lucía Jiménez Cuadrado",
        "dorsal": "4"
      },
      {
        "name": "Sheena Elaine Garay Fernandez",
        "dorsal": "6",
        "isLibero": true
      },
      {
        "name": "Roma Garcia Soler",
        "dorsal": "7"
      },
      {
        "name": "Luna Guerrero Dueñas",
        "dorsal": "11"
      },
      {
        "name": "Lola Ríos Osuna",
        "dorsal": "12"
      },
      {
        "name": "Adriana Megens Marin",
        "dorsal": "15"
      },
      {
        "name": "Nahiara Gutiérrez Durkin",
        "dorsal": "16"
      },
      {
        "name": "Rocio Valencia Artola",
        "dorsal": "17"
      },
      {
        "name": "Laura Cordero Cortes",
        "dorsal": "19",
        "isLibero": true
      },
      {
        "name": "Sofía Benítez Cañizares",
        "dorsal": "31"
      },
      {
        "name": "Nadeau",
        "isStaff": true,
        "staffRole": "1º Entrenador/a"
      }
    ],
    "awayRoster": [
      {
        "name": "Cristina Gil Garcia",
        "dorsal": "2",
        "isCaptain": true
      },
      {
        "name": "Valentina Lorente Díaz",
        "dorsal": "3",
        "originCategory": "Cadete"
      },
      {
        "name": "Martina Iranzo Peinado",
        "dorsal": "4"
      },
      {
        "name": "María Victoria Vélez Ontiveros",
        "dorsal": "7",
        "isLibero": true
      },
      {
        "name": "Valentina Arias Ferreira",
        "dorsal": "9",
        "originCategory": "Cadete"
      },
      {
        "name": "Valeria Arenal Rueda",
        "dorsal": "12",
        "originCategory": "Cadete"
      },
      {
        "name": "Lucia Diaz Gomez",
        "dorsal": "15",
        "originCategory": "Cadete"
      },
      {
        "name": "Maria Vera Naranjo",
        "dorsal": "17",
        "isLibero": true
      },
      {
        "name": "Martina Paola Costa Diaz",
        "dorsal": "18"
      },
      {
        "name": "Paola Bernal Puerto",
        "dorsal": "19"
      },
      {
        "name": "Olivia Muñoz Pino",
        "dorsal": "26"
      },
      {
        "name": "Malak Baghdadi Attaouil",
        "dorsal": "27"
      },
      {
        "name": "Paula Flores Izquierdo",
        "dorsal": "92",
        "originCategory": "Infantil"
      },
      {
        "name": "Carla Arenal Rueda",
        "dorsal": "98",
        "originCategory": "Infantil"
      },
      {
        "name": "Palacios",
        "isStaff": true,
        "staffRole": "1º Entrenador/a"
      },
      {
        "name": "Martínez",
        "isStaff": true,
        "staffRole": "2º Entrenador/a"
      }
    ]
  },
  {
    "id": "favb-1840",
    "teamId": "team-jf-rojo",
    "round": 3,
    "homeTeamName": "INTER PLAYAS A",
    "awayTeamName": "VOLEIBOL SAN PEDRO ROJO",
    "isClubHome": false,
    "venueName": "IES JOAQUÍN LOBATO (Torre del Mar)",
    "matchDate": "2026-10-17T14:00:00.000Z",
    "status": "FINISHED",
    "homeScore": 3,
    "awayScore": 0,
    "setScores": [
      {
        "home": 25,
        "away": 14
      },
      {
        "home": 25,
        "away": 23
      },
      {
        "home": 26,
        "away": 24
      }
    ],
    "favbMatchUrl": "https://favoley.net/publico/seccion.php?seccion=marcador&id=1840",
    "isFeatured": false,
    "locality": "Torre del Mar",
    "googleMapsUrl": "https://www.google.com/maps/search/?api=1&query=IES%20JOAQU%C3%8DN%20LOBATO%20Torre%20del%20Mar",
    "referees": [
      {
        "role": "1º Árbitro",
        "name": "Víctor De Paz Fernández"
      },
      {
        "role": "2º Árbitro",
        "name": "Maria Andrea Perea Espinosa"
      }
    ],
    "homeRoster": [
      {
        "name": "Lucia Torres Molina",
        "dorsal": "1",
        "isCaptain": true
      },
      {
        "name": "Luna Durán Soler",
        "dorsal": "6"
      },
      {
        "name": "Blanca Carrasco Sánchez",
        "dorsal": "7"
      },
      {
        "name": "Polina Podkhalyuzina Shidlovskaya",
        "dorsal": "8"
      },
      {
        "name": "Mayra Muñoz Noguera",
        "dorsal": "9"
      },
      {
        "name": "Sofia Hajib Barranquero",
        "dorsal": "10"
      },
      {
        "name": "Noelia Mas López",
        "dorsal": "13"
      },
      {
        "name": "Ariadna Casilla García",
        "dorsal": "15"
      },
      {
        "name": "Africa Ibañez Gomez",
        "dorsal": "19"
      },
      {
        "name": "Marina Vega Guillen",
        "dorsal": "23",
        "isLibero": true
      },
      {
        "name": "Eva Maria Sighinas",
        "dorsal": "33",
        "isLibero": true
      },
      {
        "name": "Sandra Téllez Sánchez",
        "dorsal": "43"
      },
      {
        "name": "Teresa Pérez González",
        "dorsal": "53"
      },
      {
        "name": "Diaz",
        "isStaff": true,
        "staffRole": "1º Entrenador/a"
      }
    ],
    "awayRoster": [
      {
        "name": "Marta Sanchez Rosado",
        "dorsal": "1",
        "isCaptain": true
      },
      {
        "name": "Carla Moncayo Pérez",
        "dorsal": "2"
      },
      {
        "name": "Lucía Jiménez Cuadrado",
        "dorsal": "4"
      },
      {
        "name": "Marina Perez Cañete",
        "dorsal": "5",
        "originCategory": "Cadete"
      },
      {
        "name": "Roma Garcia Soler",
        "dorsal": "7"
      },
      {
        "name": "Luna Guerrero Dueñas",
        "dorsal": "11"
      },
      {
        "name": "Nahiara Gutiérrez Durkin",
        "dorsal": "16"
      },
      {
        "name": "Laura Cordero Cortes",
        "dorsal": "19",
        "isLibero": true
      },
      {
        "name": "Lola Ríos Osuna",
        "dorsal": "21"
      },
      {
        "name": "Sofía Benítez Cañizares",
        "dorsal": "31"
      },
      {
        "name": "Rodríguez",
        "isStaff": true,
        "staffRole": "1º Entrenador/a"
      }
    ]
  },
  {
    "id": "favb-1843",
    "teamId": "team-jf-rojo",
    "round": 4,
    "homeTeamName": "VOLEIBOL SAN PEDRO ROJO",
    "awayTeamName": "LA VEGA VOLEY",
    "isClubHome": true,
    "venueName": "POLIDEPORTIVO SERGIO SCARIOLO – P3 (San Pedro de Alcántara)",
    "matchDate": "2026-10-24T10:00:00.000Z",
    "status": "FINISHED",
    "homeScore": 3,
    "awayScore": 1,
    "setScores": [
      {
        "home": 26,
        "away": 24
      },
      {
        "home": 25,
        "away": 9
      },
      {
        "home": 24,
        "away": 26
      },
      {
        "home": 25,
        "away": 12
      }
    ],
    "favbMatchUrl": "https://favoley.net/publico/seccion.php?seccion=marcador&id=1843",
    "isFeatured": false,
    "court": "Pista P3",
    "locality": "San Pedro de Alcántara",
    "googleMapsUrl": "https://www.google.com/maps/search/?api=1&query=POLIDEPORTIVO%20SERGIO%20SCARIOLO%20San%20Pedro%20de%20Alc%C3%A1ntara",
    "referees": [
      {
        "role": "1º Árbitro",
        "name": "Rodolfo Israel Drago Figueras"
      },
      {
        "role": "Anotador/a",
        "name": "Christian Samir Darias Drago",
        "isTrainee": true
      }
    ],
    "homeRoster": [
      {
        "name": "Marta Sanchez Rosado",
        "dorsal": "1",
        "isCaptain": true
      },
      {
        "name": "Lola Ríos Osuna",
        "dorsal": "2"
      },
      {
        "name": "Lucía Jiménez Cuadrado",
        "dorsal": "4"
      },
      {
        "name": "Sheena Elaine Garay Fernandez",
        "dorsal": "6",
        "isLibero": true
      },
      {
        "name": "Roma Garcia Soler",
        "dorsal": "7"
      },
      {
        "name": "Luna Guerrero Dueñas",
        "dorsal": "11"
      },
      {
        "name": "Adriana Megens Marin",
        "dorsal": "15"
      },
      {
        "name": "Nahiara Gutiérrez Durkin",
        "dorsal": "16"
      },
      {
        "name": "Rocio Valencia Artola",
        "dorsal": "17"
      },
      {
        "name": "Laura Cordero Cortes",
        "dorsal": "19",
        "isLibero": true
      },
      {
        "name": "Carla Moncayo Pérez",
        "dorsal": "21"
      },
      {
        "name": "Amira Pardo Skoug",
        "dorsal": "23"
      },
      {
        "name": "Sofía Benítez Cañizares",
        "dorsal": "31"
      },
      {
        "name": "Nadeau",
        "isStaff": true,
        "staffRole": "1º Entrenador/a"
      }
    ],
    "awayRoster": [
      {
        "name": "Candelaria García Miranda",
        "dorsal": "5",
        "originCategory": "Cadete"
      },
      {
        "name": "Sharon Vanessa Vanegas Rodriguez",
        "dorsal": "6"
      },
      {
        "name": "Andrea Espejo Palomo",
        "dorsal": "9",
        "isCaptain": true
      },
      {
        "name": "Esperanza Paradas Aguilar",
        "dorsal": "10",
        "originCategory": "Cadete"
      },
      {
        "name": "Lourdes Mesa Campos",
        "dorsal": "12"
      },
      {
        "name": "Ainhoa Talavera García",
        "dorsal": "18"
      },
      {
        "name": "Maite Siles Vegas",
        "dorsal": "19"
      },
      {
        "name": "Jimena Toro Sierras",
        "dorsal": "27",
        "isLibero": true
      },
      {
        "name": "Gómez",
        "isStaff": true,
        "staffRole": "1º Entrenador/a"
      },
      {
        "name": "Chamorro",
        "isStaff": true,
        "staffRole": "2º Entrenador/a"
      }
    ]
  },
  {
    "id": "favb-1846",
    "teamId": "team-jf-rojo",
    "round": 5,
    "homeTeamName": "NUEVA OLA",
    "awayTeamName": "VOLEIBOL SAN PEDRO ROJO",
    "isClubHome": false,
    "venueName": "POLIDEPORTIVO FERNANDO RUIZ HIERRO (Vélez-Málaga)",
    "matchDate": "2026-11-08T10:30:00.000Z",
    "status": "FINISHED",
    "statusText": "Finalizado",
    "homeScore": 2,
    "awayScore": 3,
    "setScores": [
      {
        "home": 26,
        "away": 24
      },
      {
        "home": 16,
        "away": 25
      },
      {
        "home": 23,
        "away": 25
      },
      {
        "home": 25,
        "away": 21
      },
      {
        "home": 12,
        "away": 15
      }
    ],
    "favbMatchUrl": "https://favoley.net/publico/seccion.php?seccion=marcador&id=1846",
    "isFeatured": false,
    "locality": "Vélez-Málaga",
    "googleMapsUrl": "https://www.google.com/maps/search/?api=1&query=POLIDEPORTIVO%20FERNANDO%20RUIZ%20HIERRO%20V%C3%A9lez-M%C3%A1laga",
    "referees": [
      {
        "role": "Árbitro Principal",
        "name": "Julia Aguilera Pardo"
      }
    ],
    "homeRoster": [
      {
        "name": "Marta Pérez Peláez",
        "dorsal": "3",
        "isCaptain": true
      },
      {
        "name": "Maria Paz Carrasco Jiménez",
        "dorsal": "7"
      },
      {
        "name": "Paula Pastor Franco",
        "dorsal": "8"
      },
      {
        "name": "Sara Manzano Yules",
        "dorsal": "9"
      },
      {
        "name": "Sara Stanchev Yuste",
        "dorsal": "11"
      },
      {
        "name": "Gala Lozano Herrera",
        "dorsal": "12"
      },
      {
        "name": "Luz Alelí Escobar Álvarez",
        "dorsal": "14",
        "isLibero": true
      },
      {
        "name": "Jendairy Francheska Arenas Lobo",
        "dorsal": "20"
      },
      {
        "name": "Irene Roldan Medina",
        "dorsal": "22"
      },
      {
        "name": "Sofía Cintado Revuelta",
        "dorsal": "30"
      },
      {
        "name": "Irene Arroyo Narváez",
        "dorsal": "33"
      },
      {
        "name": "Agata Ortega Jaramillo",
        "dorsal": "91"
      },
      {
        "name": "Paula Puertas Cotilla",
        "dorsal": "99",
        "isLibero": true
      },
      {
        "name": "Campillejo",
        "isStaff": true,
        "staffRole": "1º Entrenador/a"
      }
    ],
    "awayRoster": [
      {
        "name": "Marta Sanchez Rosado",
        "dorsal": "1",
        "isCaptain": true
      },
      {
        "name": "Carla Moncayo Pérez",
        "dorsal": "2"
      },
      {
        "name": "Lucía Jiménez Cuadrado",
        "dorsal": "4"
      },
      {
        "name": "Luna Guerrero Dueñas",
        "dorsal": "11"
      },
      {
        "name": "Laura Cordero Cortes",
        "dorsal": "12",
        "isLibero": true
      },
      {
        "name": "Rocio Valencia Artola",
        "dorsal": "17"
      },
      {
        "name": "Amira Pardo Skoug",
        "dorsal": "23"
      },
      {
        "name": "Adriana Megens Marin",
        "dorsal": "27"
      },
      {
        "name": "Sofía Benítez Cañizares",
        "dorsal": "31"
      },
      {
        "name": "Nadeau",
        "isStaff": true,
        "staffRole": "1º Entrenador/a"
      }
    ]
  },
  {
    "id": "favb-1849",
    "teamId": "team-jf-rojo",
    "round": 6,
    "homeTeamName": "VOLEIBOL SAN PEDRO ROJO",
    "awayTeamName": "CARTAMA AZUL",
    "isClubHome": true,
    "venueName": "POLIDEPORTIVO SERGIO SCARIOLO – P3 (San Pedro de Alcántara)",
    "matchDate": "2026-11-13T17:30:00.000Z",
    "status": "SCHEDULED",
    "setScores": [],
    "favbMatchUrl": "https://favoley.net/publico/seccion.php?seccion=marcador&id=1849",
    "isFeatured": false,
    "court": "Pista P3",
    "locality": "San Pedro de Alcántara",
    "googleMapsUrl": "https://www.google.com/maps/search/?api=1&query=POLIDEPORTIVO%20SERGIO%20SCARIOLO%20San%20Pedro%20de%20Alc%C3%A1ntara"
  },
  {
    "id": "favb-1852",
    "teamId": "team-jf-rojo",
    "round": 7,
    "homeTeamName": "COSTA DEL VOLEY ROSA",
    "awayTeamName": "VOLEIBOL SAN PEDRO ROJO",
    "isClubHome": false,
    "venueName": "Pabellón Municipal Visitante",
    "matchDate": "2026-11-20T11:00:00.000Z",
    "status": "SCHEDULED",
    "setScores": [],
    "favbMatchUrl": "https://favoley.net/publico/seccion.php?seccion=marcador&id=1852",
    "isFeatured": false,
    "googleMapsUrl": "https://www.google.com/maps/search/?api=1&query=Pabell%C3%B3n%20Municipal%20Visitante"
  },
  {
    "id": "favb-1855",
    "teamId": "team-jf-rojo",
    "round": 8,
    "homeTeamName": "VOLEIBOL SAN PEDRO ROJO",
    "awayTeamName": "INTER PLAYAS A",
    "isClubHome": true,
    "venueName": "Pabellón Polideportivo Sergio Scariolo",
    "matchDate": "2026-11-27T17:30:00.000Z",
    "status": "SCHEDULED",
    "setScores": [],
    "favbMatchUrl": "https://favoley.net/publico/seccion.php?seccion=marcador&id=1855",
    "isFeatured": false,
    "googleMapsUrl": "https://www.google.com/maps/search/?api=1&query=Pabell%C3%B3n%20Polideportivo%20Sergio%20Scariolo"
  },
  {
    "id": "favb-1858",
    "teamId": "team-jf-rojo",
    "round": 9,
    "homeTeamName": "LA VEGA VOLEY",
    "awayTeamName": "VOLEIBOL SAN PEDRO ROJO",
    "isClubHome": false,
    "venueName": "Pabellón Municipal Visitante",
    "matchDate": "2026-12-11T11:00:00.000Z",
    "status": "SCHEDULED",
    "setScores": [],
    "favbMatchUrl": "https://favoley.net/publico/seccion.php?seccion=marcador&id=1858",
    "isFeatured": false,
    "googleMapsUrl": "https://www.google.com/maps/search/?api=1&query=Pabell%C3%B3n%20Municipal%20Visitante"
  },
  {
    "id": "favb-1861",
    "teamId": "team-jf-rojo",
    "round": 10,
    "homeTeamName": "VOLEIBOL SAN PEDRO ROJO",
    "awayTeamName": "NUEVA OLA",
    "isClubHome": true,
    "venueName": "Pabellón Polideportivo Sergio Scariolo",
    "matchDate": "2026-12-18T17:30:00.000Z",
    "status": "SCHEDULED",
    "setScores": [],
    "favbMatchUrl": "https://favoley.net/publico/seccion.php?seccion=marcador&id=1861",
    "isFeatured": false,
    "googleMapsUrl": "https://www.google.com/maps/search/?api=1&query=Pabell%C3%B3n%20Polideportivo%20Sergio%20Scariolo"
  },
  {
    "id": "favb-5523",
    "teamId": "team-jf-negro",
    "round": 1,
    "homeTeamName": "VOLEIBOL SAN PEDRO NEGRO",
    "awayTeamName": "ALHAURÍN DE LA TORRE",
    "isClubHome": true,
    "venueName": "POLIDEPORTIVO SERGIO SCARIOLO – P3 (San Pedro de Alcántara)",
    "matchDate": "2026-10-24T16:30:00.000Z",
    "status": "FINISHED",
    "homeScore": 1,
    "awayScore": 3,
    "setScores": [
      {
        "home": 26,
        "away": 24
      },
      {
        "home": 24,
        "away": 26
      },
      {
        "home": 16,
        "away": 25
      },
      {
        "home": 22,
        "away": 25
      }
    ],
    "favbMatchUrl": "https://favoley.net/publico/seccion.php?seccion=marcador&id=5523",
    "isFeatured": false,
    "court": "Pista P3",
    "locality": "San Pedro de Alcántara",
    "googleMapsUrl": "https://www.google.com/maps/search/?api=1&query=POLIDEPORTIVO%20SERGIO%20SCARIOLO%20San%20Pedro%20de%20Alc%C3%A1ntara",
    "referees": [
      {
        "role": "1º Árbitro",
        "name": "Christian Samir Darias Drago"
      },
      {
        "role": "Anotador/a",
        "name": "Rodolfo Drago Ravelo"
      }
    ],
    "homeRoster": [
      {
        "name": "Paula Téllez Ros",
        "dorsal": "1"
      },
      {
        "name": "Isabel González Rosa",
        "dorsal": "3"
      },
      {
        "name": "Marta Calvente Palomo",
        "dorsal": "4"
      },
      {
        "name": "Jimena Aguilar Del Río",
        "dorsal": "6",
        "isLibero": true
      },
      {
        "name": "Aitana Peña Romero",
        "dorsal": "7",
        "isCaptain": true
      },
      {
        "name": "Paula Adama Benhamou Rivero",
        "dorsal": "10"
      },
      {
        "name": "Maria Martin Valle",
        "dorsal": "11"
      },
      {
        "name": "Eva Puissant Salvat",
        "dorsal": "13"
      },
      {
        "name": "Ainara Ortega Gomez",
        "dorsal": "14"
      },
      {
        "name": "Noemí Puissant Salvat",
        "dorsal": "19"
      },
      {
        "name": "Elisa Mila El Aouch",
        "dorsal": "24"
      },
      {
        "name": "Iris Gil Hurtado",
        "dorsal": "32",
        "isLibero": true
      },
      {
        "name": "García",
        "isStaff": true,
        "staffRole": "1º Entrenador/a"
      }
    ],
    "awayRoster": [
      {
        "name": "Miriam Martín Martin",
        "dorsal": "4",
        "isCaptain": true
      },
      {
        "name": "Lucía Ponce Fernández",
        "dorsal": "8"
      },
      {
        "name": "Sara Deonier Roldan",
        "dorsal": "10"
      },
      {
        "name": "Carmen Gonzalez Porcel",
        "dorsal": "16"
      },
      {
        "name": "Cristina Cintado Miranda",
        "dorsal": "19"
      },
      {
        "name": "Lucia Moreno Lopez",
        "dorsal": "21",
        "isLibero": true
      },
      {
        "name": "Elena Llamas Méndez",
        "dorsal": "24"
      },
      {
        "name": "Lola Guerrero Martin",
        "dorsal": "60"
      },
      {
        "name": "Ana Espinar Sánchez",
        "dorsal": "80"
      },
      {
        "name": "Olazabal",
        "isStaff": true,
        "staffRole": "1º Entrenador/a"
      }
    ]
  },
  {
    "id": "favb-5527",
    "teamId": "team-jf-negro",
    "round": 2,
    "homeTeamName": "FUENGIROLA CV B",
    "awayTeamName": "VOLEIBOL SAN PEDRO NEGRO",
    "isClubHome": false,
    "venueName": "COMPLEJO POLIDEPORTIVO MUNICIPAL ELOLA (Fuengirola)",
    "matchDate": "2026-11-07T17:00:00.000Z",
    "status": "FINISHED",
    "homeScore": 1,
    "awayScore": 3,
    "setScores": [
      {
        "home": 14,
        "away": 25
      },
      {
        "home": 25,
        "away": 11
      },
      {
        "home": 23,
        "away": 25
      },
      {
        "home": 15,
        "away": 25
      }
    ],
    "favbMatchUrl": "https://favoley.net/publico/seccion.php?seccion=marcador&id=5527",
    "isFeatured": false,
    "locality": "Fuengirola",
    "googleMapsUrl": "https://www.google.com/maps/search/?api=1&query=COMPLEJO%20POLIDEPORTIVO%20MUNICIPAL%20ELOLA%20Fuengirola",
    "referees": [
      {
        "role": "1º Árbitro",
        "name": "Naiara Bocanegra Anton"
      },
      {
        "role": "Anotador/a",
        "name": "Marta Vegas Lopez"
      }
    ],
    "homeRoster": [
      {
        "name": "Isabella Alejandra Caparroz Pinel",
        "dorsal": "1"
      },
      {
        "name": "Mya Chalan Hall",
        "dorsal": "2"
      },
      {
        "name": "Christa Van Harten Gerhartl",
        "dorsal": "3",
        "isCaptain": true
      },
      {
        "name": "Nuoyi Chen",
        "dorsal": "5"
      },
      {
        "name": "Ainhoa Wang",
        "dorsal": "7"
      },
      {
        "name": "Sofia Baeza Elliot",
        "dorsal": "8"
      },
      {
        "name": "Marina Muñiz Ordoñez",
        "dorsal": "9"
      },
      {
        "name": "Emilija Kairyte",
        "dorsal": "10"
      },
      {
        "name": "Ines Laila Nada El Mouaffak",
        "dorsal": "13"
      },
      {
        "name": "Alba Villalon Baez",
        "dorsal": "17"
      },
      {
        "name": "Angela Grandoso Ettaqy",
        "dorsal": "19"
      },
      {
        "name": "Valentina Ema Lago Cristante",
        "dorsal": "31",
        "originCategory": "Cadete"
      },
      {
        "name": "Margarita Bano",
        "dorsal": "70",
        "isLibero": true
      },
      {
        "name": "Paloma Delia",
        "dorsal": "73",
        "isLibero": true
      },
      {
        "name": "Postigo",
        "isStaff": true,
        "staffRole": "1º Entrenador/a"
      },
      {
        "name": "Moreno",
        "isStaff": true,
        "staffRole": "2º Entrenador/a"
      }
    ],
    "awayRoster": [
      {
        "name": "Paula Téllez Ros",
        "dorsal": "1"
      },
      {
        "name": "Jimena Aguilar Del Río",
        "dorsal": "2",
        "isLibero": true
      },
      {
        "name": "Isabel González Rosa",
        "dorsal": "3"
      },
      {
        "name": "Paola López Sánchez",
        "dorsal": "6",
        "isCaptain": true
      },
      {
        "name": "Aitana Peña Romero",
        "dorsal": "7"
      },
      {
        "name": "Adriana Barroso Aguilar",
        "dorsal": "8"
      },
      {
        "name": "Johana Quintero Scott",
        "dorsal": "9"
      },
      {
        "name": "Paula Adama Benhamou Rivero",
        "dorsal": "10"
      },
      {
        "name": "Maria Martin Valle",
        "dorsal": "11"
      },
      {
        "name": "Eva Puissant Salvat",
        "dorsal": "13"
      },
      {
        "name": "Ainara Ortega Gomez",
        "dorsal": "14"
      },
      {
        "name": "Noemí Puissant Salvat",
        "dorsal": "19"
      },
      {
        "name": "Elisa Mila El Aouch",
        "dorsal": "24"
      },
      {
        "name": "Iris Gil Hurtado",
        "dorsal": "32",
        "isLibero": true
      },
      {
        "name": "García",
        "isStaff": true,
        "staffRole": "1º Entrenador/a"
      }
    ]
  },
  {
    "id": "favb-5531",
    "teamId": "team-jf-negro",
    "round": 3,
    "homeTeamName": "VOLEIBOL SAN PEDRO NEGRO",
    "awayTeamName": "LA CORACHA",
    "isClubHome": true,
    "venueName": "POLIDEPORTIVO SERGIO SCARIOLO – P3 (San Pedro de Alcántara)",
    "matchDate": "2026-11-15T12:00:00.000Z",
    "status": "SCHEDULED",
    "setScores": [],
    "favbMatchUrl": "https://favoley.net/publico/seccion.php?seccion=marcador&id=5531",
    "isFeatured": false,
    "court": "Pista P3",
    "locality": "San Pedro de Alcántara",
    "googleMapsUrl": "https://www.google.com/maps/search/?api=1&query=POLIDEPORTIVO%20SERGIO%20SCARIOLO%20San%20Pedro%20de%20Alc%C3%A1ntara"
  },
  {
    "id": "favb-5534",
    "teamId": "team-jf-negro",
    "round": 4,
    "homeTeamName": "3STEVOLEY B",
    "awayTeamName": "VOLEIBOL SAN PEDRO NEGRO",
    "isClubHome": false,
    "venueName": "Pabellón Municipal Visitante",
    "matchDate": "2026-11-20T11:00:00.000Z",
    "status": "SCHEDULED",
    "setScores": [],
    "favbMatchUrl": "https://favoley.net/publico/seccion.php?seccion=marcador&id=5534",
    "isFeatured": false,
    "googleMapsUrl": "https://www.google.com/maps/search/?api=1&query=Pabell%C3%B3n%20Municipal%20Visitante"
  },
  {
    "id": "favb-5536",
    "teamId": "team-jf-negro",
    "round": 5,
    "homeTeamName": "VOLEIBOL SAN PEDRO NEGRO",
    "awayTeamName": "CEV JUVENIL",
    "isClubHome": true,
    "venueName": "Pabellón Polideportivo Sergio Scariolo",
    "matchDate": "2026-12-11T17:30:00.000Z",
    "status": "SCHEDULED",
    "setScores": [],
    "favbMatchUrl": "https://favoley.net/publico/seccion.php?seccion=marcador&id=5536",
    "isFeatured": false,
    "googleMapsUrl": "https://www.google.com/maps/search/?api=1&query=Pabell%C3%B3n%20Polideportivo%20Sergio%20Scariolo"
  },
  {
    "id": "favb-5538",
    "teamId": "team-jf-negro",
    "round": 6,
    "homeTeamName": "INTER PLAYAS C",
    "awayTeamName": "VOLEIBOL SAN PEDRO NEGRO",
    "isClubHome": false,
    "venueName": "Pabellón Municipal Visitante",
    "matchDate": "2026-12-18T11:00:00.000Z",
    "status": "SCHEDULED",
    "setScores": [],
    "favbMatchUrl": "https://favoley.net/publico/seccion.php?seccion=marcador&id=5538",
    "isFeatured": false,
    "googleMapsUrl": "https://www.google.com/maps/search/?api=1&query=Pabell%C3%B3n%20Municipal%20Visitante"
  },
  {
    "id": "favb-5544",
    "teamId": "team-jf-negro",
    "round": 8,
    "homeTeamName": "ALHAURÍN DE LA TORRE",
    "awayTeamName": "VOLEIBOL SAN PEDRO NEGRO",
    "isClubHome": false,
    "venueName": "Pabellón Municipal Visitante",
    "matchDate": "2027-01-22T11:00:00.000Z",
    "status": "SCHEDULED",
    "setScores": [],
    "favbMatchUrl": "https://favoley.net/publico/seccion.php?seccion=marcador&id=5544",
    "isFeatured": false,
    "googleMapsUrl": "https://www.google.com/maps/search/?api=1&query=Pabell%C3%B3n%20Municipal%20Visitante"
  },
  {
    "id": "favb-5548",
    "teamId": "team-jf-negro",
    "round": 9,
    "homeTeamName": "VOLEIBOL SAN PEDRO NEGRO",
    "awayTeamName": "FUENGIROLA CV B",
    "isClubHome": true,
    "venueName": "Pabellón Polideportivo Sergio Scariolo",
    "matchDate": "2027-02-05T17:30:00.000Z",
    "status": "SCHEDULED",
    "setScores": [],
    "favbMatchUrl": "https://favoley.net/publico/seccion.php?seccion=marcador&id=5548",
    "isFeatured": false,
    "googleMapsUrl": "https://www.google.com/maps/search/?api=1&query=Pabell%C3%B3n%20Polideportivo%20Sergio%20Scariolo"
  },
  {
    "id": "favb-5552",
    "teamId": "team-jf-negro",
    "round": 10,
    "homeTeamName": "LA CORACHA",
    "awayTeamName": "VOLEIBOL SAN PEDRO NEGRO",
    "isClubHome": false,
    "venueName": "Pabellón Municipal Visitante",
    "matchDate": "2027-02-12T11:00:00.000Z",
    "status": "SCHEDULED",
    "setScores": [],
    "favbMatchUrl": "https://favoley.net/publico/seccion.php?seccion=marcador&id=5552",
    "isFeatured": false,
    "googleMapsUrl": "https://www.google.com/maps/search/?api=1&query=Pabell%C3%B3n%20Municipal%20Visitante"
  },
  {
    "id": "favb-5555",
    "teamId": "team-jf-negro",
    "round": 11,
    "homeTeamName": "VOLEIBOL SAN PEDRO NEGRO",
    "awayTeamName": "3STEVOLEY B",
    "isClubHome": true,
    "venueName": "Pabellón Polideportivo Sergio Scariolo",
    "matchDate": "2027-03-05T17:30:00.000Z",
    "status": "SCHEDULED",
    "setScores": [],
    "favbMatchUrl": "https://favoley.net/publico/seccion.php?seccion=marcador&id=5555",
    "isFeatured": false,
    "googleMapsUrl": "https://www.google.com/maps/search/?api=1&query=Pabell%C3%B3n%20Polideportivo%20Sergio%20Scariolo"
  },
  {
    "id": "favb-5557",
    "teamId": "team-jf-negro",
    "round": 12,
    "homeTeamName": "CEV JUVENIL",
    "awayTeamName": "VOLEIBOL SAN PEDRO NEGRO",
    "isClubHome": false,
    "venueName": "Pabellón Municipal Visitante",
    "matchDate": "2027-03-12T11:00:00.000Z",
    "status": "SCHEDULED",
    "setScores": [],
    "favbMatchUrl": "https://favoley.net/publico/seccion.php?seccion=marcador&id=5557",
    "isFeatured": false,
    "googleMapsUrl": "https://www.google.com/maps/search/?api=1&query=Pabell%C3%B3n%20Municipal%20Visitante"
  },
  {
    "id": "favb-5559",
    "teamId": "team-jf-negro",
    "round": 13,
    "homeTeamName": "VOLEIBOL SAN PEDRO NEGRO",
    "awayTeamName": "INTER PLAYAS C",
    "isClubHome": true,
    "venueName": "Pabellón Polideportivo Sergio Scariolo",
    "matchDate": "2027-04-02T16:30:00.000Z",
    "status": "SCHEDULED",
    "setScores": [],
    "favbMatchUrl": "https://favoley.net/publico/seccion.php?seccion=marcador&id=5559",
    "isFeatured": false,
    "googleMapsUrl": "https://www.google.com/maps/search/?api=1&query=Pabell%C3%B3n%20Polideportivo%20Sergio%20Scariolo"
  },
  {
    "id": "favb-3828",
    "teamId": "team-cm",
    "round": 1,
    "homeTeamName": "3STEVOLEY",
    "awayTeamName": "VOLEIBOL SAN PEDRO",
    "isClubHome": false,
    "venueName": "C.E.I.P TIERNO GALVÁN (Rincón de la Victoria)",
    "matchDate": "2026-11-07T11:00:00.000Z",
    "status": "FINISHED",
    "homeScore": 3,
    "awayScore": 0,
    "setScores": [
      {
        "home": 25,
        "away": 21
      },
      {
        "home": 25,
        "away": 14
      },
      {
        "home": 25,
        "away": 22
      }
    ],
    "favbMatchUrl": "https://favoley.net/publico/seccion.php?seccion=marcador&id=3828",
    "isFeatured": false,
    "locality": "Rincón de la Victoria",
    "googleMapsUrl": "https://www.google.com/maps/search/?api=1&query=C.E.I.P%20TIERNO%20GALV%C3%81N%20Rinc%C3%B3n%20de%20la%20Victoria",
    "referees": [
      {
        "role": "1º Árbitro",
        "name": "Julia Aguilera Pardo"
      },
      {
        "role": "1º Árbitro",
        "name": "Sara Perea Espinosa"
      },
      {
        "role": "Anotador/a",
        "name": "Clara Elisa Bautista Rueda"
      },
      {
        "role": "Anotador/a",
        "name": "Sofía Del Moral Laborde"
      }
    ],
    "homeRoster": [
      {
        "name": "Israel Garcia Garrido",
        "dorsal": "4"
      },
      {
        "name": "Alejandro González Berros",
        "dorsal": "5"
      },
      {
        "name": "Maximilian Contreras Graulich",
        "dorsal": "11"
      },
      {
        "name": "Fco Javier Serrano Villalobos",
        "dorsal": "12",
        "isLibero": true
      },
      {
        "name": "Raul Garcia Reyes",
        "dorsal": "15",
        "isLibero": true
      },
      {
        "name": "Benjamin Antonio Sandoval Ithurbide",
        "dorsal": "17"
      },
      {
        "name": "Gonzalo López Delgado",
        "dorsal": "18",
        "isCaptain": true
      },
      {
        "name": "Juan Antonio Trujillo Vargas",
        "dorsal": "26"
      },
      {
        "name": "Pablo Lara Sepúlveda",
        "dorsal": "33"
      },
      {
        "name": "Llorente",
        "isStaff": true,
        "staffRole": "1º Entrenador/a"
      }
    ],
    "awayRoster": [
      {
        "name": "Nicolás Serrato Rojo",
        "dorsal": "1",
        "isCaptain": true
      },
      {
        "name": "Diego Pedrazo Segarra",
        "dorsal": "2"
      },
      {
        "name": "Jordan Romero Rios",
        "dorsal": "3"
      },
      {
        "name": "Pedro Núñez Romero",
        "dorsal": "4"
      },
      {
        "name": "Ivan Valadez Alvarez",
        "dorsal": "6"
      },
      {
        "name": "Iker Trujillo Ruiz",
        "dorsal": "8"
      },
      {
        "name": "George Filip",
        "dorsal": "10"
      },
      {
        "name": "Marc Castro Martín",
        "dorsal": "13"
      },
      {
        "name": "Alvaro Gonzalez Auñon",
        "dorsal": "15",
        "isLibero": true
      },
      {
        "name": "Lebron Michael Barrozo Perez",
        "dorsal": "19"
      },
      {
        "name": "Maxim Jalba",
        "dorsal": "23",
        "isLibero": true
      },
      {
        "name": "Galán",
        "isStaff": true,
        "staffRole": "2º Entrenador/a"
      },
      {
        "name": "Rodríguez",
        "isStaff": true,
        "staffRole": "1º Entrenador/a"
      }
    ]
  },
  {
    "id": "favb-3831",
    "teamId": "team-cm",
    "round": 2,
    "homeTeamName": "VOLEIBOL SAN PEDRO",
    "awayTeamName": "ALHAURÍN DE LA TORRE A",
    "isClubHome": true,
    "venueName": "POLIDEPORTIVO SERGIO SCARIOLO – P3 (San Pedro de Alcántara)",
    "matchDate": "2026-10-25T09:00:00.000Z",
    "status": "FINISHED",
    "homeScore": 0,
    "awayScore": 3,
    "setScores": [
      {
        "home": 17,
        "away": 25
      },
      {
        "home": 21,
        "away": 25
      },
      {
        "home": 18,
        "away": 25
      }
    ],
    "favbMatchUrl": "https://favoley.net/publico/seccion.php?seccion=marcador&id=3831",
    "isFeatured": false,
    "court": "Pista P3",
    "locality": "San Pedro de Alcántara",
    "googleMapsUrl": "https://www.google.com/maps/search/?api=1&query=POLIDEPORTIVO%20SERGIO%20SCARIOLO%20San%20Pedro%20de%20Alc%C3%A1ntara",
    "referees": [
      {
        "role": "1º Árbitro",
        "name": "Rodolfo Drago Ravelo"
      },
      {
        "role": "Anotador/a",
        "name": "Christian Samir Darias Drago"
      }
    ],
    "homeRoster": [
      {
        "name": "Nicolás Serrato Rojo",
        "dorsal": "1",
        "isCaptain": true
      },
      {
        "name": "Diego Pedrazo Segarra",
        "dorsal": "2"
      },
      {
        "name": "Marc Castro Martín",
        "dorsal": "3"
      },
      {
        "name": "Pedro Núñez Romero",
        "dorsal": "4"
      },
      {
        "name": "Ivan Valadez Alvarez",
        "dorsal": "6"
      },
      {
        "name": "Iker Trujillo Ruiz",
        "dorsal": "8"
      },
      {
        "name": "George Filip",
        "dorsal": "10"
      },
      {
        "name": "Adonay Heredia Santiago",
        "dorsal": "15"
      },
      {
        "name": "Lebron Michael Barrozo Perez",
        "dorsal": "19"
      },
      {
        "name": "Alvaro Gonzalez Auñon",
        "dorsal": "75",
        "isLibero": true
      },
      {
        "name": "Galán",
        "isStaff": true,
        "staffRole": "2º Entrenador/a"
      },
      {
        "name": "Rodríguez",
        "isStaff": true,
        "staffRole": "1º Entrenador/a"
      },
      {
        "name": "Nadeau",
        "isStaff": true,
        "staffRole": "2º Entrenador/a"
      }
    ],
    "awayRoster": [
      {
        "name": "Juan Jose Buzon Barquero",
        "dorsal": "4",
        "isLibero": true,
        "originCategory": "Infantil"
      },
      {
        "name": "Jose Luis Raimundo Andres",
        "dorsal": "6",
        "isCaptain": true
      },
      {
        "name": "Lucas Linares Vicario",
        "dorsal": "7"
      },
      {
        "name": "David Rojas Ruiz",
        "dorsal": "8"
      },
      {
        "name": "Emilio Ric Etzl",
        "dorsal": "9"
      },
      {
        "name": "Daniel Bernal Hidalgo",
        "dorsal": "10",
        "originCategory": "Infantil"
      },
      {
        "name": "Francisco Manuel Arrabal Gutierrez",
        "dorsal": "15"
      },
      {
        "name": "Adrian Bono Segovia",
        "dorsal": "16"
      },
      {
        "name": "Naser Bouaich Taoussi",
        "dorsal": "21"
      },
      {
        "name": "Alejandro Alcalde Bustillo",
        "dorsal": "27",
        "isLibero": true
      },
      {
        "name": "Hugo Palomo Gomez",
        "dorsal": "77",
        "originCategory": "Infantil"
      },
      {
        "name": "Quevedo",
        "isStaff": true,
        "staffRole": "1º Entrenador/a"
      }
    ]
  },
  {
    "id": "favb-3834",
    "teamId": "team-cm",
    "round": 3,
    "homeTeamName": "CV PIZARRA LA FUENSANTA",
    "awayTeamName": "VOLEIBOL SAN PEDRO",
    "isClubHome": false,
    "venueName": "Pabellón Municipal Dani Pacheco (Pizarra)",
    "matchDate": "2026-11-13T19:00:00.000Z",
    "status": "SCHEDULED",
    "setScores": [],
    "favbMatchUrl": "https://favoley.net/publico/seccion.php?seccion=marcador&id=3834",
    "isFeatured": false,
    "googleMapsUrl": "https://www.google.com/maps/search/?api=1&query=Pabell%C3%B3n%20Municipal%20Dani%20Pacheco%20Pizarra",
    "locality": "Pizarra"
  },
  {
    "id": "favb-3837",
    "teamId": "team-cm",
    "round": 4,
    "homeTeamName": "VOLEIBOL SAN PEDRO",
    "awayTeamName": "UDA BENALMADENA",
    "isClubHome": true,
    "venueName": "Pabellón Polideportivo Sergio Scariolo",
    "matchDate": "2026-11-27T17:30:00.000Z",
    "status": "SCHEDULED",
    "setScores": [],
    "favbMatchUrl": "https://favoley.net/publico/seccion.php?seccion=marcador&id=3837",
    "isFeatured": false,
    "googleMapsUrl": "https://www.google.com/maps/search/?api=1&query=Pabell%C3%B3n%20Polideportivo%20Sergio%20Scariolo"
  },
  {
    "id": "favb-3840",
    "teamId": "team-cm",
    "round": 5,
    "homeTeamName": "UNION MALAGUEÑA",
    "awayTeamName": "VOLEIBOL SAN PEDRO",
    "isClubHome": false,
    "venueName": "Pabellón Municipal Visitante",
    "matchDate": "2026-12-18T11:00:00.000Z",
    "status": "SCHEDULED",
    "setScores": [],
    "favbMatchUrl": "https://favoley.net/publico/seccion.php?seccion=marcador&id=3840",
    "isFeatured": false,
    "googleMapsUrl": "https://www.google.com/maps/search/?api=1&query=Pabell%C3%B3n%20Municipal%20Visitante"
  },
  {
    "id": "favb-3843",
    "teamId": "team-cm",
    "round": 6,
    "homeTeamName": "VOLEIBOL SAN PEDRO",
    "awayTeamName": "3STEVOLEY",
    "isClubHome": true,
    "venueName": "Pabellón Polideportivo Sergio Scariolo",
    "matchDate": "2027-01-08T17:30:00.000Z",
    "status": "SCHEDULED",
    "setScores": [],
    "favbMatchUrl": "https://favoley.net/publico/seccion.php?seccion=marcador&id=3843",
    "isFeatured": false,
    "googleMapsUrl": "https://www.google.com/maps/search/?api=1&query=Pabell%C3%B3n%20Polideportivo%20Sergio%20Scariolo"
  },
  {
    "id": "favb-3846",
    "teamId": "team-cm",
    "round": 7,
    "homeTeamName": "ALHAURÍN DE LA TORRE A",
    "awayTeamName": "VOLEIBOL SAN PEDRO",
    "isClubHome": false,
    "venueName": "Pabellón Municipal Visitante",
    "matchDate": "2027-01-15T11:00:00.000Z",
    "status": "SCHEDULED",
    "setScores": [],
    "favbMatchUrl": "https://favoley.net/publico/seccion.php?seccion=marcador&id=3846",
    "isFeatured": false,
    "googleMapsUrl": "https://www.google.com/maps/search/?api=1&query=Pabell%C3%B3n%20Municipal%20Visitante"
  },
  {
    "id": "favb-3849",
    "teamId": "team-cm",
    "round": 8,
    "homeTeamName": "VOLEIBOL SAN PEDRO",
    "awayTeamName": "CV PIZARRA LA FUENSANTA",
    "isClubHome": true,
    "venueName": "Pabellón Polideportivo Sergio Scariolo",
    "matchDate": "2027-01-29T17:30:00.000Z",
    "status": "SCHEDULED",
    "setScores": [],
    "favbMatchUrl": "https://favoley.net/publico/seccion.php?seccion=marcador&id=3849",
    "isFeatured": false,
    "googleMapsUrl": "https://www.google.com/maps/search/?api=1&query=Pabell%C3%B3n%20Polideportivo%20Sergio%20Scariolo"
  },
  {
    "id": "favb-3852",
    "teamId": "team-cm",
    "round": 9,
    "homeTeamName": "UDA BENALMADENA",
    "awayTeamName": "VOLEIBOL SAN PEDRO",
    "isClubHome": false,
    "venueName": "Pabellón Municipal Visitante",
    "matchDate": "2027-02-05T11:00:00.000Z",
    "status": "SCHEDULED",
    "setScores": [],
    "favbMatchUrl": "https://favoley.net/publico/seccion.php?seccion=marcador&id=3852",
    "isFeatured": false,
    "googleMapsUrl": "https://www.google.com/maps/search/?api=1&query=Pabell%C3%B3n%20Municipal%20Visitante"
  },
  {
    "id": "favb-3855",
    "teamId": "team-cm",
    "round": 10,
    "homeTeamName": "VOLEIBOL SAN PEDRO",
    "awayTeamName": "UNION MALAGUEÑA",
    "isClubHome": true,
    "venueName": "Pabellón Polideportivo Sergio Scariolo",
    "matchDate": "2027-02-19T17:30:00.000Z",
    "status": "SCHEDULED",
    "setScores": [],
    "favbMatchUrl": "https://favoley.net/publico/seccion.php?seccion=marcador&id=3855",
    "isFeatured": false,
    "googleMapsUrl": "https://www.google.com/maps/search/?api=1&query=Pabell%C3%B3n%20Polideportivo%20Sergio%20Scariolo"
  },
  {
    "id": "favb-4162",
    "teamId": "team-cf-rojo",
    "round": 1,
    "homeTeamName": "VOLEIBOL SAN PEDRO ROJO",
    "awayTeamName": "CV PIZARRA LA FUENSANTA",
    "isClubHome": true,
    "venueName": "POLIDEPORTIVO SERGIO SCARIOLO – P3 (San Pedro de Alcántara)",
    "matchDate": "2026-10-10T08:00:00.000Z",
    "status": "FINISHED",
    "homeScore": 0,
    "awayScore": 3,
    "setScores": [
      {
        "home": 20,
        "away": 25
      },
      {
        "home": 23,
        "away": 25
      },
      {
        "home": 21,
        "away": 25
      }
    ],
    "favbMatchUrl": "https://favoley.net/publico/seccion.php?seccion=marcador&id=4162",
    "isFeatured": false,
    "court": "Pista P3",
    "locality": "San Pedro de Alcántara",
    "googleMapsUrl": "https://www.google.com/maps/search/?api=1&query=POLIDEPORTIVO%20SERGIO%20SCARIOLO%20San%20Pedro%20de%20Alc%C3%A1ntara",
    "referees": [
      {
        "role": "1º Árbitro",
        "name": "Rodolfo Drago Ravelo"
      },
      {
        "role": "2º Árbitro",
        "name": "Alba Badillo Calle"
      }
    ],
    "homeRoster": [
      {
        "name": "Leia Renouard /",
        "dorsal": "2"
      },
      {
        "name": "Valeria Veliente Verdugo",
        "dorsal": "4",
        "isLibero": true
      },
      {
        "name": "Marina Perez Cañete",
        "dorsal": "5"
      },
      {
        "name": "Zayra Ortega Gomez",
        "dorsal": "6",
        "originCategory": "Infantil"
      },
      {
        "name": "Leoní Anaya Peeters",
        "dorsal": "7"
      },
      {
        "name": "Paula Román Ramirez",
        "dorsal": "10",
        "isCaptain": true
      },
      {
        "name": "Nira González Pérez",
        "dorsal": "12",
        "originCategory": "Infantil"
      },
      {
        "name": "Paula Valadez Fernandez",
        "dorsal": "13"
      },
      {
        "name": "Jaqueline Montero Alves",
        "dorsal": "15"
      },
      {
        "name": "Chloe Hannah Cerda Ynoa",
        "dorsal": "16",
        "originCategory": "Infantil"
      },
      {
        "name": "Daniela Romero Oña",
        "dorsal": "20",
        "originCategory": "Infantil"
      },
      {
        "name": "Lola Vazquez Bautista",
        "dorsal": "24"
      },
      {
        "name": "Alejandra Redondo Lendinez",
        "dorsal": "25"
      },
      {
        "name": "Angela Gomez Moreno",
        "dorsal": "33"
      },
      {
        "name": "Gómez",
        "isStaff": true,
        "staffRole": "2º Entrenador/a"
      },
      {
        "name": "Vazquez",
        "isStaff": true,
        "staffRole": "1º Entrenador/a"
      }
    ],
    "awayRoster": [
      {
        "name": "Ainhoa Lozano Gamez",
        "dorsal": "1"
      },
      {
        "name": "Marta Alcántara Villalobos",
        "dorsal": "3"
      },
      {
        "name": "Iraide Navarro Postigo",
        "dorsal": "4"
      },
      {
        "name": "Clara Rios Estrada",
        "dorsal": "5"
      },
      {
        "name": "Elena Rosas Lobato",
        "dorsal": "7"
      },
      {
        "name": "Valeria Infantes Gámez",
        "dorsal": "8"
      },
      {
        "name": "Leire Ortega Santiago",
        "dorsal": "9"
      },
      {
        "name": "Amanda Guerrero Vergara",
        "dorsal": "10"
      },
      {
        "name": "Africa Mancera Acedo",
        "dorsal": "11"
      },
      {
        "name": "Claudia Rojo Romero",
        "dorsal": "12"
      },
      {
        "name": "Mara Brenes Villar",
        "dorsal": "18"
      },
      {
        "name": "África Cuenca Camacho",
        "dorsal": "19",
        "isCaptain": true
      },
      {
        "name": "Carmen García Perea",
        "dorsal": "21",
        "isLibero": true
      },
      {
        "name": "Cecilia Gonzalez Navarro",
        "dorsal": "22"
      },
      {
        "name": "Monterroso",
        "isStaff": true,
        "staffRole": "1º Entrenador/a"
      }
    ]
  },
  {
    "id": "favb-4166",
    "teamId": "team-cf-rojo",
    "round": 2,
    "homeTeamName": "NUEVA OLA A",
    "awayTeamName": "VOLEIBOL SAN PEDRO ROJO",
    "isClubHome": false,
    "venueName": "POLIDEPORTIVO FERNANDO RUIZ HIERRO – P1 (Vélez-Málaga)",
    "matchDate": "2026-10-17T10:00:00.000Z",
    "status": "FINISHED",
    "homeScore": 0,
    "awayScore": 3,
    "setScores": [
      {
        "home": 10,
        "away": 25
      },
      {
        "home": 14,
        "away": 25
      },
      {
        "home": 14,
        "away": 25
      }
    ],
    "favbMatchUrl": "https://favoley.net/publico/seccion.php?seccion=marcador&id=4166",
    "isFeatured": false,
    "court": "Pista P1",
    "locality": "Vélez-Málaga",
    "googleMapsUrl": "https://www.google.com/maps/search/?api=1&query=POLIDEPORTIVO%20FERNANDO%20RUIZ%20HIERRO%20V%C3%A9lez-M%C3%A1laga",
    "referees": [
      {
        "role": "1º Árbitro",
        "name": "Verónica Carmona Arjona"
      },
      {
        "role": "Anotador/a",
        "name": "Clara Elisa Bautista Rueda"
      }
    ],
    "homeRoster": [
      {
        "name": "Carmen Del Rio Barrena",
        "dorsal": "1"
      },
      {
        "name": "Ana Maria Roldan Medina",
        "dorsal": "6"
      },
      {
        "name": "Paula Rodríguez Díaz",
        "dorsal": "9"
      },
      {
        "name": "Noa García Aponte",
        "dorsal": "11"
      },
      {
        "name": "Almudena Moreno Moreno",
        "dorsal": "12",
        "isLibero": true
      },
      {
        "name": "Julieta Balastegui Crespillo",
        "dorsal": "14",
        "originCategory": "Infantil"
      },
      {
        "name": "Irene Ortiz Santiago",
        "dorsal": "21"
      },
      {
        "name": "Sugey Heredia Barrios",
        "dorsal": "22",
        "isCaptain": true
      },
      {
        "name": "Vega De Quinta Guzman",
        "dorsal": "28"
      },
      {
        "name": "Ainara Mora Gutierrez",
        "dorsal": "30"
      },
      {
        "name": "Shira Toledo Lopez",
        "dorsal": "48",
        "isLibero": true
      },
      {
        "name": "Sánchez",
        "isStaff": true,
        "staffRole": "1º Entrenador/a"
      }
    ],
    "awayRoster": [
      {
        "name": "Leia Renouard /",
        "dorsal": "2"
      },
      {
        "name": "Valeria Veliente Verdugo",
        "dorsal": "4",
        "isLibero": true
      },
      {
        "name": "Marina Perez Cañete",
        "dorsal": "5"
      },
      {
        "name": "Paula Román Ramirez",
        "dorsal": "10",
        "isCaptain": true
      },
      {
        "name": "Paula Valadez Fernandez",
        "dorsal": "13"
      },
      {
        "name": "Jaqueline Montero Alves",
        "dorsal": "15"
      },
      {
        "name": "Lola Vazquez Bautista",
        "dorsal": "24"
      },
      {
        "name": "Angela Gomez Moreno",
        "dorsal": "33"
      },
      {
        "name": "Alejandra Redondo Lendinez",
        "dorsal": "75"
      },
      {
        "name": "Gómez",
        "isStaff": true,
        "staffRole": "2º Entrenador/a"
      },
      {
        "name": "Vazquez",
        "isStaff": true,
        "staffRole": "2º Entrenador/a"
      },
      {
        "name": "Rodríguez",
        "isStaff": true,
        "staffRole": "1º Entrenador/a"
      }
    ]
  },
  {
    "id": "favb-4170",
    "teamId": "team-cf-rojo",
    "round": 3,
    "homeTeamName": "VOLEIBOL SAN PEDRO ROJO",
    "awayTeamName": "UDA BENALMADENA A",
    "isClubHome": true,
    "venueName": "POLIDEPORTIVO SERGIO SCARIOLO – P3 (San Pedro de Alcántara)",
    "matchDate": "2026-10-24T14:30:00.000Z",
    "status": "FINISHED",
    "homeScore": 1,
    "awayScore": 3,
    "setScores": [
      {
        "home": 15,
        "away": 25
      },
      {
        "home": 17,
        "away": 25
      },
      {
        "home": 28,
        "away": 26
      },
      {
        "home": 22,
        "away": 25
      }
    ],
    "favbMatchUrl": "https://favoley.net/publico/seccion.php?seccion=marcador&id=4170",
    "isFeatured": false,
    "court": "Pista P3",
    "locality": "San Pedro de Alcántara",
    "googleMapsUrl": "https://www.google.com/maps/search/?api=1&query=POLIDEPORTIVO%20SERGIO%20SCARIOLO%20San%20Pedro%20de%20Alc%C3%A1ntara",
    "referees": [
      {
        "role": "1º Árbitro",
        "name": "Rodolfo Drago Ravelo"
      },
      {
        "role": "Anotador/a",
        "name": "Christian Samir Darias Drago"
      }
    ],
    "homeRoster": [
      {
        "name": "Leia Renouard /",
        "dorsal": "2"
      },
      {
        "name": "Valeria Veliente Verdugo",
        "dorsal": "4",
        "isLibero": true
      },
      {
        "name": "Marina Perez Cañete",
        "dorsal": "5"
      },
      {
        "name": "Zayra Ortega Gomez",
        "dorsal": "6",
        "originCategory": "Infantil"
      },
      {
        "name": "Paula Román Ramirez",
        "dorsal": "10",
        "isCaptain": true
      },
      {
        "name": "Nira González Pérez",
        "dorsal": "12",
        "originCategory": "Infantil"
      },
      {
        "name": "Paula Valadez Fernandez",
        "dorsal": "13"
      },
      {
        "name": "Marina Vegas Sanchez",
        "dorsal": "14"
      },
      {
        "name": "Jaqueline Montero Alves",
        "dorsal": "15"
      },
      {
        "name": "Chloe Hannah Cerda Ynoa",
        "dorsal": "16",
        "originCategory": "Infantil"
      },
      {
        "name": "Lola Vazquez Bautista",
        "dorsal": "24"
      },
      {
        "name": "Angela Gomez Moreno",
        "dorsal": "33"
      },
      {
        "name": "Leoní Anaya Peeters",
        "dorsal": "75"
      },
      {
        "name": "Gómez",
        "isStaff": true,
        "staffRole": "2º Entrenador/a"
      },
      {
        "name": "Vazquez",
        "isStaff": true,
        "staffRole": "2º Entrenador/a"
      },
      {
        "name": "Rodríguez",
        "isStaff": true,
        "staffRole": "1º Entrenador/a"
      }
    ],
    "awayRoster": [
      {
        "name": "Carmen Higueras Roman",
        "dorsal": "5"
      },
      {
        "name": "Emily Zock Marie Noelle",
        "dorsal": "9"
      },
      {
        "name": "Pilar Camaño Bianchi",
        "dorsal": "11",
        "isLibero": true
      },
      {
        "name": "Josefina Castano",
        "dorsal": "12"
      },
      {
        "name": "Cecilia Jiménez Ibáñez",
        "dorsal": "13",
        "isCaptain": true
      },
      {
        "name": "Sophie Zock",
        "dorsal": "14"
      },
      {
        "name": "Claudia García Liñán",
        "dorsal": "15"
      },
      {
        "name": "Luna Garcillan Gonzalez",
        "dorsal": "21"
      },
      {
        "name": "Yriola Gallardo Coque",
        "dorsal": "25"
      },
      {
        "name": "Valeria Torres Arias",
        "dorsal": "31"
      },
      {
        "name": "Carla Gonzalez Franco",
        "dorsal": "37",
        "isLibero": true
      },
      {
        "name": "Sofiia Puzankova",
        "dorsal": "53"
      },
      {
        "name": "Yanira Vaziri Muñoz",
        "dorsal": "54"
      },
      {
        "name": "Alves Javier",
        "isStaff": true,
        "staffRole": "1º Entrenador/a"
      }
    ]
  },
  {
    "id": "favb-4173",
    "teamId": "team-cf-rojo",
    "round": 4,
    "homeTeamName": "3STEVOLEY A",
    "awayTeamName": "VOLEIBOL SAN PEDRO ROJO",
    "isClubHome": false,
    "venueName": "C.E.I.P TIERNO GALVÁN (Rincón de la Victoria)",
    "matchDate": "2026-11-15T09:00:00.000Z",
    "status": "SCHEDULED",
    "setScores": [],
    "favbMatchUrl": "https://favoley.net/publico/seccion.php?seccion=marcador&id=4173",
    "isFeatured": false,
    "locality": "Rincón de la Victoria",
    "googleMapsUrl": "https://www.google.com/maps/search/?api=1&query=C.E.I.P%20TIERNO%20GALV%C3%81N%20Rinc%C3%B3n%20de%20la%20Victoria"
  },
  {
    "id": "favb-4175",
    "teamId": "team-cf-rojo",
    "round": 5,
    "homeTeamName": "VOLEIBOL SAN PEDRO ROJO",
    "awayTeamName": "FUENGIROLA CV A",
    "isClubHome": true,
    "venueName": "Pabellón Polideportivo Sergio Scariolo",
    "matchDate": "2026-11-20T17:30:00.000Z",
    "status": "SCHEDULED",
    "setScores": [],
    "favbMatchUrl": "https://favoley.net/publico/seccion.php?seccion=marcador&id=4175",
    "isFeatured": false,
    "googleMapsUrl": "https://www.google.com/maps/search/?api=1&query=Pabell%C3%B3n%20Polideportivo%20Sergio%20Scariolo"
  },
  {
    "id": "favb-4177",
    "teamId": "team-cf-rojo",
    "round": 6,
    "homeTeamName": "CARTAMA BLANCO",
    "awayTeamName": "VOLEIBOL SAN PEDRO ROJO",
    "isClubHome": false,
    "venueName": "Pabellón Municipal Visitante",
    "matchDate": "2026-11-27T11:00:00.000Z",
    "status": "SCHEDULED",
    "setScores": [],
    "favbMatchUrl": "https://favoley.net/publico/seccion.php?seccion=marcador&id=4177",
    "isFeatured": false,
    "googleMapsUrl": "https://www.google.com/maps/search/?api=1&query=Pabell%C3%B3n%20Municipal%20Visitante"
  },
  {
    "id": "favb-4183",
    "teamId": "team-cf-rojo",
    "round": 8,
    "homeTeamName": "CV PIZARRA LA FUENSANTA",
    "awayTeamName": "VOLEIBOL SAN PEDRO ROJO",
    "isClubHome": false,
    "venueName": "Pabellón Municipal Visitante",
    "matchDate": "2026-12-18T11:00:00.000Z",
    "status": "SCHEDULED",
    "setScores": [],
    "favbMatchUrl": "https://favoley.net/publico/seccion.php?seccion=marcador&id=4183",
    "isFeatured": false,
    "googleMapsUrl": "https://www.google.com/maps/search/?api=1&query=Pabell%C3%B3n%20Municipal%20Visitante"
  },
  {
    "id": "favb-4187",
    "teamId": "team-cf-rojo",
    "round": 9,
    "homeTeamName": "VOLEIBOL SAN PEDRO ROJO",
    "awayTeamName": "NUEVA OLA A",
    "isClubHome": true,
    "venueName": "Pabellón Polideportivo Sergio Scariolo",
    "matchDate": "2027-01-15T17:30:00.000Z",
    "status": "SCHEDULED",
    "setScores": [],
    "favbMatchUrl": "https://favoley.net/publico/seccion.php?seccion=marcador&id=4187",
    "isFeatured": false,
    "googleMapsUrl": "https://www.google.com/maps/search/?api=1&query=Pabell%C3%B3n%20Polideportivo%20Sergio%20Scariolo"
  },
  {
    "id": "favb-4191",
    "teamId": "team-cf-rojo",
    "round": 10,
    "homeTeamName": "UDA BENALMADENA A",
    "awayTeamName": "VOLEIBOL SAN PEDRO ROJO",
    "isClubHome": false,
    "venueName": "Pabellón Municipal Visitante",
    "matchDate": "2027-01-22T11:00:00.000Z",
    "status": "SCHEDULED",
    "setScores": [],
    "favbMatchUrl": "https://favoley.net/publico/seccion.php?seccion=marcador&id=4191",
    "isFeatured": false,
    "googleMapsUrl": "https://www.google.com/maps/search/?api=1&query=Pabell%C3%B3n%20Municipal%20Visitante"
  },
  {
    "id": "favb-4194",
    "teamId": "team-cf-rojo",
    "round": 11,
    "homeTeamName": "VOLEIBOL SAN PEDRO ROJO",
    "awayTeamName": "3STEVOLEY A",
    "isClubHome": true,
    "venueName": "Pabellón Polideportivo Sergio Scariolo",
    "matchDate": "2027-01-29T17:30:00.000Z",
    "status": "SCHEDULED",
    "setScores": [],
    "favbMatchUrl": "https://favoley.net/publico/seccion.php?seccion=marcador&id=4194",
    "isFeatured": false,
    "googleMapsUrl": "https://www.google.com/maps/search/?api=1&query=Pabell%C3%B3n%20Polideportivo%20Sergio%20Scariolo"
  },
  {
    "id": "favb-4196",
    "teamId": "team-cf-rojo",
    "round": 12,
    "homeTeamName": "FUENGIROLA CV A",
    "awayTeamName": "VOLEIBOL SAN PEDRO ROJO",
    "isClubHome": false,
    "venueName": "Pabellón Municipal Visitante",
    "matchDate": "2027-02-05T11:00:00.000Z",
    "status": "SCHEDULED",
    "setScores": [],
    "favbMatchUrl": "https://favoley.net/publico/seccion.php?seccion=marcador&id=4196",
    "isFeatured": false,
    "googleMapsUrl": "https://www.google.com/maps/search/?api=1&query=Pabell%C3%B3n%20Municipal%20Visitante"
  },
  {
    "id": "favb-4198",
    "teamId": "team-cf-rojo",
    "round": 13,
    "homeTeamName": "VOLEIBOL SAN PEDRO ROJO",
    "awayTeamName": "CARTAMA BLANCO",
    "isClubHome": true,
    "venueName": "Pabellón Polideportivo Sergio Scariolo",
    "matchDate": "2027-02-12T17:30:00.000Z",
    "status": "SCHEDULED",
    "setScores": [],
    "favbMatchUrl": "https://favoley.net/publico/seccion.php?seccion=marcador&id=4198",
    "isFeatured": false,
    "googleMapsUrl": "https://www.google.com/maps/search/?api=1&query=Pabell%C3%B3n%20Polideportivo%20Sergio%20Scariolo"
  },
  {
    "id": "favb-5719",
    "teamId": "team-cf-negro",
    "round": 1,
    "homeTeamName": "3STEVOLEY C",
    "awayTeamName": "VOLEIBOL SAN PEDRO NEGRO",
    "isClubHome": false,
    "venueName": "C.E.I.P TIERNO GALVÁN (Rincón de la Victoria)",
    "matchDate": "2026-10-25T09:00:00.000Z",
    "status": "FINISHED",
    "homeScore": 0,
    "awayScore": 3,
    "setScores": [
      {
        "home": 22,
        "away": 25
      },
      {
        "home": 22,
        "away": 25
      },
      {
        "home": 16,
        "away": 25
      }
    ],
    "favbMatchUrl": "https://favoley.net/publico/seccion.php?seccion=marcador&id=5719",
    "isFeatured": false,
    "locality": "Rincón de la Victoria",
    "googleMapsUrl": "https://www.google.com/maps/search/?api=1&query=C.E.I.P%20TIERNO%20GALV%C3%81N%20Rinc%C3%B3n%20de%20la%20Victoria",
    "referees": [
      {
        "role": "Árbitro Principal",
        "name": "Karin Heredia Taboada"
      }
    ],
    "homeRoster": [
      {
        "name": "Olivia Guerrero Pedrosa",
        "dorsal": "1"
      },
      {
        "name": "Coral Biehler Andrade",
        "dorsal": "2"
      },
      {
        "name": "Nadia Cisneros Vera",
        "dorsal": "4"
      },
      {
        "name": "Elena Perea Salado",
        "dorsal": "5"
      },
      {
        "name": "Lucia Jimenez Fernandez",
        "dorsal": "6",
        "isLibero": true
      },
      {
        "name": "Lucia Parra Soto",
        "dorsal": "9",
        "isLibero": true
      },
      {
        "name": "Iara Chica Benitez",
        "dorsal": "10"
      },
      {
        "name": "Candela Sot Cáceres",
        "dorsal": "13"
      },
      {
        "name": "Gina Delmas Montesano",
        "dorsal": "14"
      },
      {
        "name": "Carmen Castro Sánchez",
        "dorsal": "19"
      },
      {
        "name": "Amber Xia",
        "dorsal": "20"
      },
      {
        "name": "Carmen Luque Lorenzo",
        "dorsal": "27"
      },
      {
        "name": "Marta Lara Sepúlveda",
        "dorsal": "29"
      },
      {
        "name": "Marina Navas Ruiz",
        "dorsal": "70",
        "isCaptain": true
      },
      {
        "name": "Sánchez.g",
        "isStaff": true,
        "staffRole": "2º Entrenador/a"
      },
      {
        "name": "Sánchez.p",
        "isStaff": true,
        "staffRole": "1º Entrenador/a"
      }
    ],
    "awayRoster": [
      {
        "name": "Olivia Del Barrio Benková",
        "dorsal": "1"
      },
      {
        "name": "Rocio Gonzalez Alvarez",
        "dorsal": "2",
        "isCaptain": true
      },
      {
        "name": "Nicoleta Filip",
        "dorsal": "3"
      },
      {
        "name": "Aroa Blanco Ossa",
        "dorsal": "4",
        "isLibero": true
      },
      {
        "name": "Michelle Villanueva Koblyakova",
        "dorsal": "7"
      },
      {
        "name": "Ashley Mancheno Villavicencio",
        "dorsal": "10"
      },
      {
        "name": "Nora Pareja Beriguete",
        "dorsal": "14",
        "originCategory": "Infantil"
      },
      {
        "name": "Valeria Nuñez Iglesias",
        "dorsal": "15",
        "originCategory": "Infantil"
      },
      {
        "name": "Naliah Loreen Tenorio Kaluzova",
        "dorsal": "16"
      },
      {
        "name": "Milana Sanchez Dyda",
        "dorsal": "17",
        "isLibero": true
      },
      {
        "name": "Disa Shala Shala",
        "dorsal": "24"
      },
      {
        "name": "Renouard",
        "isStaff": true,
        "staffRole": "1º Entrenador/a"
      }
    ]
  },
  {
    "id": "favb-5723",
    "teamId": "team-cf-negro",
    "round": 2,
    "homeTeamName": "VOLEIBOL SAN PEDRO NEGRO",
    "awayTeamName": "C.V. CIUDAD DE MÁLAGA",
    "isClubHome": true,
    "venueName": "POLIDEPORTIVO SERGIO SCARIOLO – P3 (San Pedro de Alcántara)",
    "matchDate": "2026-11-08T09:00:00.000Z",
    "status": "FINISHED",
    "statusText": "Finalizado",
    "homeScore": 2,
    "awayScore": 3,
    "setScores": [
      {
        "home": 19,
        "away": 25
      },
      {
        "home": 23,
        "away": 25
      },
      {
        "home": 25,
        "away": 23
      },
      {
        "home": 25,
        "away": 16
      },
      {
        "home": 8,
        "away": 15
      }
    ],
    "favbMatchUrl": "https://favoley.net/publico/seccion.php?seccion=marcador&id=5723",
    "isFeatured": false,
    "court": "Pista P3",
    "locality": "San Pedro de Alcántara",
    "googleMapsUrl": "https://www.google.com/maps/search/?api=1&query=POLIDEPORTIVO%20SERGIO%20SCARIOLO%20San%20Pedro%20de%20Alc%C3%A1ntara",
    "referees": [
      {
        "role": "1º Árbitro",
        "name": "Christian Samir Darias Drago"
      },
      {
        "role": "Anotador/a",
        "name": "Rodolfo Drago Ravelo"
      }
    ],
    "homeRoster": [
      {
        "name": "Martina Nasisi Adán",
        "dorsal": "1"
      },
      {
        "name": "Rocio Gonzalez Alvarez",
        "dorsal": "2",
        "isCaptain": true
      },
      {
        "name": "Nicoleta Filip",
        "dorsal": "3"
      },
      {
        "name": "Aroa Blanco Ossa",
        "dorsal": "4",
        "isLibero": true
      },
      {
        "name": "Michelle Villanueva Koblyakova",
        "dorsal": "7"
      },
      {
        "name": "Jimena Román Ramirez",
        "dorsal": "8",
        "originCategory": "Infantil"
      },
      {
        "name": "Ashley Mancheno Villavicencio",
        "dorsal": "10"
      },
      {
        "name": "Atenas Garcia Soler",
        "dorsal": "12",
        "originCategory": "Infantil"
      },
      {
        "name": "Naliah Loreen Tenorio Kaluzova",
        "dorsal": "16"
      },
      {
        "name": "Milana Sanchez Dyda",
        "dorsal": "17",
        "isLibero": true
      },
      {
        "name": "Disa Shala Shala",
        "dorsal": "24"
      },
      {
        "name": "Itziar Ayala Chicon",
        "dorsal": "26"
      },
      {
        "name": "Renouard",
        "isStaff": true,
        "staffRole": "1º Entrenador/a"
      }
    ],
    "awayRoster": [
      {
        "name": "Pilar Mohedano Royo",
        "dorsal": "2"
      },
      {
        "name": "Lola Lopez Fuentes",
        "dorsal": "3"
      },
      {
        "name": "María Martín Ramírez",
        "dorsal": "4"
      },
      {
        "name": "Sofía Recio Rosillo",
        "dorsal": "7"
      },
      {
        "name": "María Jose Gamboa Rodriguez",
        "dorsal": "8"
      },
      {
        "name": "Maria Martinez Sorlozano",
        "dorsal": "10"
      },
      {
        "name": "Daniela Aguilera Padilla",
        "dorsal": "12"
      },
      {
        "name": "Sofía Pládena Cabrera",
        "dorsal": "13",
        "isLibero": true
      },
      {
        "name": "Paula Lorenzo Martin",
        "dorsal": "16",
        "isCaptain": true
      },
      {
        "name": "Alejandra Aguilera Padilla",
        "dorsal": "26"
      },
      {
        "name": "Lasprilla.m",
        "isStaff": true,
        "staffRole": "1º Entrenador/a"
      },
      {
        "name": "Lasprilla.g",
        "isStaff": true,
        "staffRole": "2º Entrenador/a"
      }
    ]
  },
  {
    "id": "favb-5727",
    "teamId": "team-cf-negro",
    "round": 3,
    "homeTeamName": "CADETE BLANCO",
    "awayTeamName": "VOLEIBOL SAN PEDRO NEGRO",
    "isClubHome": false,
    "venueName": "Polideportivo Municipal El Carmen (Estepona)",
    "matchDate": "2026-11-14T13:00:00.000Z",
    "status": "SCHEDULED",
    "setScores": [],
    "favbMatchUrl": "https://favoley.net/publico/seccion.php?seccion=marcador&id=5727",
    "isFeatured": false,
    "googleMapsUrl": "https://www.google.com/maps/search/?api=1&query=Polideportivo%20Municipal%20El%20Carmen%20Estepona",
    "locality": "Estepona"
  },
  {
    "id": "favb-5731",
    "teamId": "team-cf-negro",
    "round": 4,
    "homeTeamName": "VOLEIBOL SAN PEDRO NEGRO",
    "awayTeamName": "FUENGIROLA CV D",
    "isClubHome": true,
    "venueName": "Pabellón Polideportivo Sergio Scariolo",
    "matchDate": "2026-11-20T17:30:00.000Z",
    "status": "SCHEDULED",
    "setScores": [],
    "favbMatchUrl": "https://favoley.net/publico/seccion.php?seccion=marcador&id=5731",
    "isFeatured": false,
    "googleMapsUrl": "https://www.google.com/maps/search/?api=1&query=Pabell%C3%B3n%20Polideportivo%20Sergio%20Scariolo"
  },
  {
    "id": "favb-5735",
    "teamId": "team-cf-negro",
    "round": 5,
    "homeTeamName": "INTER PLAYAS B",
    "awayTeamName": "VOLEIBOL SAN PEDRO NEGRO",
    "isClubHome": false,
    "venueName": "Pabellón Municipal Visitante",
    "matchDate": "2026-12-11T11:00:00.000Z",
    "status": "SCHEDULED",
    "setScores": [],
    "favbMatchUrl": "https://favoley.net/publico/seccion.php?seccion=marcador&id=5735",
    "isFeatured": false,
    "googleMapsUrl": "https://www.google.com/maps/search/?api=1&query=Pabell%C3%B3n%20Municipal%20Visitante"
  },
  {
    "id": "favb-5739",
    "teamId": "team-cf-negro",
    "round": 6,
    "homeTeamName": "VOLEIBOL SAN PEDRO NEGRO",
    "awayTeamName": "LA CORACHA",
    "isClubHome": true,
    "venueName": "Pabellón Polideportivo Sergio Scariolo",
    "matchDate": "2026-12-18T17:30:00.000Z",
    "status": "SCHEDULED",
    "setScores": [],
    "favbMatchUrl": "https://favoley.net/publico/seccion.php?seccion=marcador&id=5739",
    "isFeatured": false,
    "googleMapsUrl": "https://www.google.com/maps/search/?api=1&query=Pabell%C3%B3n%20Polideportivo%20Sergio%20Scariolo"
  },
  {
    "id": "favb-5743",
    "teamId": "team-cf-negro",
    "round": 7,
    "homeTeamName": "SOHO MALAGA",
    "awayTeamName": "VOLEIBOL SAN PEDRO NEGRO",
    "isClubHome": false,
    "venueName": "IES CHRISTINE PICASSO – P1 (Málaga)",
    "matchDate": "2027-01-16T16:30:00.000Z",
    "status": "SCHEDULED",
    "setScores": [],
    "favbMatchUrl": "https://favoley.net/publico/seccion.php?seccion=marcador&id=5743",
    "isFeatured": false,
    "court": "Pista P1",
    "locality": "Málaga",
    "googleMapsUrl": "https://maps.app.goo.gl/AWprbdFyeoK5c3ZCA"
  },
  {
    "id": "favb-5747",
    "teamId": "team-cf-negro",
    "round": 8,
    "homeTeamName": "VOLEIBOL SAN PEDRO NEGRO",
    "awayTeamName": "3STEVOLEY C",
    "isClubHome": true,
    "venueName": "Pabellón Polideportivo Sergio Scariolo",
    "matchDate": "2027-01-22T17:30:00.000Z",
    "status": "SCHEDULED",
    "setScores": [],
    "favbMatchUrl": "https://favoley.net/publico/seccion.php?seccion=marcador&id=5747",
    "isFeatured": false,
    "googleMapsUrl": "https://www.google.com/maps/search/?api=1&query=Pabell%C3%B3n%20Polideportivo%20Sergio%20Scariolo"
  },
  {
    "id": "favb-5751",
    "teamId": "team-cf-negro",
    "round": 9,
    "homeTeamName": "C.V. CIUDAD DE MÁLAGA",
    "awayTeamName": "VOLEIBOL SAN PEDRO NEGRO",
    "isClubHome": false,
    "venueName": "Pabellón Municipal Visitante",
    "matchDate": "2027-02-05T11:00:00.000Z",
    "status": "SCHEDULED",
    "setScores": [],
    "favbMatchUrl": "https://favoley.net/publico/seccion.php?seccion=marcador&id=5751",
    "isFeatured": false,
    "googleMapsUrl": "https://www.google.com/maps/search/?api=1&query=Pabell%C3%B3n%20Municipal%20Visitante"
  },
  {
    "id": "favb-5755",
    "teamId": "team-cf-negro",
    "round": 10,
    "homeTeamName": "VOLEIBOL SAN PEDRO NEGRO",
    "awayTeamName": "CADETE BLANCO",
    "isClubHome": true,
    "venueName": "Pabellón Polideportivo Sergio Scariolo",
    "matchDate": "2027-02-12T17:30:00.000Z",
    "status": "SCHEDULED",
    "setScores": [],
    "favbMatchUrl": "https://favoley.net/publico/seccion.php?seccion=marcador&id=5755",
    "isFeatured": false,
    "googleMapsUrl": "https://www.google.com/maps/search/?api=1&query=Pabell%C3%B3n%20Polideportivo%20Sergio%20Scariolo"
  },
  {
    "id": "favb-5759",
    "teamId": "team-cf-negro",
    "round": 11,
    "homeTeamName": "FUENGIROLA CV D",
    "awayTeamName": "VOLEIBOL SAN PEDRO NEGRO",
    "isClubHome": false,
    "venueName": "Pabellón Municipal Visitante",
    "matchDate": "2027-03-05T11:00:00.000Z",
    "status": "SCHEDULED",
    "setScores": [],
    "favbMatchUrl": "https://favoley.net/publico/seccion.php?seccion=marcador&id=5759",
    "isFeatured": false,
    "googleMapsUrl": "https://www.google.com/maps/search/?api=1&query=Pabell%C3%B3n%20Municipal%20Visitante"
  },
  {
    "id": "favb-5763",
    "teamId": "team-cf-negro",
    "round": 12,
    "homeTeamName": "VOLEIBOL SAN PEDRO NEGRO",
    "awayTeamName": "INTER PLAYAS B",
    "isClubHome": true,
    "venueName": "Pabellón Polideportivo Sergio Scariolo",
    "matchDate": "2027-03-12T17:30:00.000Z",
    "status": "SCHEDULED",
    "setScores": [],
    "favbMatchUrl": "https://favoley.net/publico/seccion.php?seccion=marcador&id=5763",
    "isFeatured": false,
    "googleMapsUrl": "https://www.google.com/maps/search/?api=1&query=Pabell%C3%B3n%20Polideportivo%20Sergio%20Scariolo"
  },
  {
    "id": "favb-5767",
    "teamId": "team-cf-negro",
    "round": 13,
    "homeTeamName": "LA CORACHA",
    "awayTeamName": "VOLEIBOL SAN PEDRO NEGRO",
    "isClubHome": false,
    "venueName": "Pabellón Municipal Visitante",
    "matchDate": "2027-04-02T10:00:00.000Z",
    "status": "SCHEDULED",
    "setScores": [],
    "favbMatchUrl": "https://favoley.net/publico/seccion.php?seccion=marcador&id=5767",
    "isFeatured": false,
    "googleMapsUrl": "https://www.google.com/maps/search/?api=1&query=Pabell%C3%B3n%20Municipal%20Visitante"
  },
  {
    "id": "favb-5771",
    "teamId": "team-cf-negro",
    "round": 14,
    "homeTeamName": "VOLEIBOL SAN PEDRO NEGRO",
    "awayTeamName": "SOHO MALAGA",
    "isClubHome": true,
    "venueName": "Pabellón Polideportivo Sergio Scariolo",
    "matchDate": "2027-04-09T16:30:00.000Z",
    "status": "SCHEDULED",
    "setScores": [],
    "favbMatchUrl": "https://favoley.net/publico/seccion.php?seccion=marcador&id=5771",
    "isFeatured": false,
    "googleMapsUrl": "https://www.google.com/maps/search/?api=1&query=Pabell%C3%B3n%20Polideportivo%20Sergio%20Scariolo"
  },
  {
    "id": "favb-3696",
    "teamId": "team-im",
    "round": 1,
    "homeTeamName": "3STEVOLEY",
    "awayTeamName": "VOLEIBOL SAN PEDRO",
    "isClubHome": false,
    "venueName": "C.E.I.P TIERNO GALVÁN (Rincón de la Victoria)",
    "matchDate": "2026-10-10T16:00:00.000Z",
    "status": "FINISHED",
    "homeScore": 0,
    "awayScore": 3,
    "setScores": [
      {
        "home": 17,
        "away": 25
      },
      {
        "home": 21,
        "away": 25
      },
      {
        "home": 21,
        "away": 25
      }
    ],
    "favbMatchUrl": "https://favoley.net/publico/seccion.php?seccion=marcador&id=3696",
    "isFeatured": false,
    "locality": "Rincón de la Victoria",
    "googleMapsUrl": "https://www.google.com/maps/search/?api=1&query=C.E.I.P%20TIERNO%20GALV%C3%81N%20Rinc%C3%B3n%20de%20la%20Victoria",
    "referees": [
      {
        "role": "1º Árbitro",
        "name": "Sergio Marín Estrada",
        "isTrainee": true
      },
      {
        "role": "2º Árbitro",
        "name": "Marta Vegas Lopez"
      }
    ],
    "homeRoster": [
      {
        "name": "Egoi Santos Férnandez",
        "dorsal": "1"
      },
      {
        "name": "Pablo Torres Palomo",
        "dorsal": "4"
      },
      {
        "name": "Dael Redondo Marin",
        "dorsal": "8"
      },
      {
        "name": "Lucas Armada Tores",
        "dorsal": "10"
      },
      {
        "name": "Guillermo Antonio De La Rosa Millan",
        "dorsal": "20"
      },
      {
        "name": "Marco Martín Mesa",
        "dorsal": "27",
        "isCaptain": true
      },
      {
        "name": "Miguel Ángel Perea Salado",
        "dorsal": "33"
      },
      {
        "name": "Gael Moya Bajo",
        "dorsal": "40"
      },
      {
        "name": "Alvaro Solis Lopez",
        "dorsal": "88"
      }
    ],
    "awayRoster": [
      {
        "name": "Rubén Bernal Pacheco",
        "dorsal": "1"
      },
      {
        "name": "Antonio Garcia Gonzalez",
        "dorsal": "2",
        "originCategory": "Alevín"
      },
      {
        "name": "Pablo Martin Garcia",
        "dorsal": "8"
      },
      {
        "name": "Agustín Benítez Cañizares",
        "dorsal": "10"
      },
      {
        "name": "Thiago Perez Martinez",
        "dorsal": "11"
      },
      {
        "name": "Martin Moncayo Pérez",
        "dorsal": "12",
        "isCaptain": true
      },
      {
        "name": "Victor Fabian Jimenez",
        "dorsal": "21"
      },
      {
        "name": "Gabriel Vidal Enriquez",
        "dorsal": "23"
      },
      {
        "name": "Alexander Bauzone",
        "dorsal": "77"
      },
      {
        "name": "Adrián Galán Toro",
        "dorsal": "99",
        "originCategory": "Alevín"
      },
      {
        "name": "Rodríguez",
        "isStaff": true,
        "staffRole": "1º Entrenador/a"
      }
    ]
  },
  {
    "id": "favb-3701",
    "teamId": "team-im",
    "round": 2,
    "homeTeamName": "VOLEIBOL SAN PEDRO",
    "awayTeamName": "ALHAURÍN DE LA TORRE",
    "isClubHome": true,
    "venueName": "POLIDEPORTIVO SERGIO SCARIOLO – P3 (San Pedro de Alcántara)",
    "matchDate": "2026-10-16T16:30:00.000Z",
    "status": "FINISHED",
    "homeScore": 0,
    "awayScore": 3,
    "setScores": [
      {
        "home": 8,
        "away": 25
      },
      {
        "home": 12,
        "away": 25
      },
      {
        "home": 7,
        "away": 25
      }
    ],
    "favbMatchUrl": "https://favoley.net/publico/seccion.php?seccion=marcador&id=3701",
    "isFeatured": false,
    "court": "Pista P3",
    "locality": "San Pedro de Alcántara",
    "googleMapsUrl": "https://www.google.com/maps/search/?api=1&query=POLIDEPORTIVO%20SERGIO%20SCARIOLO%20San%20Pedro%20de%20Alc%C3%A1ntara",
    "referees": [
      {
        "role": "1º Árbitro",
        "name": "Rodolfo Israel Drago Figueras"
      },
      {
        "role": "Anotador/a",
        "name": "Rodolfo Drago Ravelo"
      }
    ],
    "homeRoster": [
      {
        "name": "Rubén Bernal Pacheco",
        "dorsal": "1"
      },
      {
        "name": "Antonio Garcia Gonzalez",
        "dorsal": "2",
        "originCategory": "Alevín"
      },
      {
        "name": "Pablo Martin Garcia",
        "dorsal": "8"
      },
      {
        "name": "Agustín Benítez Cañizares",
        "dorsal": "10"
      },
      {
        "name": "Thiago Perez Martinez",
        "dorsal": "11"
      },
      {
        "name": "Martin Moncayo Pérez",
        "dorsal": "12",
        "isCaptain": true
      },
      {
        "name": "Victor Fabian Jimenez",
        "dorsal": "21"
      },
      {
        "name": "Gabriel Vidal Enriquez",
        "dorsal": "23"
      },
      {
        "name": "Alexander Bauzone",
        "dorsal": "77"
      },
      {
        "name": "Adrián Galán Toro",
        "dorsal": "99",
        "originCategory": "Alevín"
      },
      {
        "name": "Galán",
        "isStaff": true,
        "staffRole": "2º Entrenador/a"
      },
      {
        "name": "Rodríguez",
        "isStaff": true,
        "staffRole": "1º Entrenador/a"
      }
    ],
    "awayRoster": [
      {
        "name": "Hugo Palomo Gomez",
        "dorsal": "4"
      },
      {
        "name": "Ruifeng Di",
        "dorsal": "5"
      },
      {
        "name": "Daniel Bernal Hidalgo",
        "dorsal": "10",
        "isCaptain": true
      },
      {
        "name": "Hugo Perez De Souza",
        "dorsal": "13"
      },
      {
        "name": "Álvaro Rojas Ruiz",
        "dorsal": "41",
        "originCategory": "Alevín"
      },
      {
        "name": "Pablo Montoro Ramos",
        "dorsal": "66"
      },
      {
        "name": "Juan Jose Buzon Barquero",
        "dorsal": "77"
      },
      {
        "name": "Gustavo Miranda De Figueiredo",
        "dorsal": "88"
      },
      {
        "name": "Adrián De La Vieja Yubero",
        "dorsal": "99"
      },
      {
        "name": "Quevedo",
        "isStaff": true,
        "staffRole": "1º Entrenador/a"
      }
    ]
  },
  {
    "id": "favb-3706",
    "teamId": "team-im",
    "round": 3,
    "homeTeamName": "CARTAMA",
    "awayTeamName": "VOLEIBOL SAN PEDRO",
    "isClubHome": false,
    "venueName": "POLIDEPORTIVO MUNICIPAL DE CARTAMA (Cártama)",
    "matchDate": "2026-10-24T09:15:00.000Z",
    "status": "FINISHED",
    "homeScore": 3,
    "awayScore": 0,
    "setScores": [
      {
        "home": 25,
        "away": 14
      },
      {
        "home": 25,
        "away": 16
      },
      {
        "home": 25,
        "away": 13
      }
    ],
    "favbMatchUrl": "https://favoley.net/publico/seccion.php?seccion=marcador&id=3706",
    "isFeatured": false,
    "locality": "Cártama",
    "googleMapsUrl": "https://www.google.com/maps/search/?api=1&query=POLIDEPORTIVO%20MUNICIPAL%20DE%20CARTAMA%20C%C3%A1rtama",
    "referees": [
      {
        "role": "1º Árbitro",
        "name": "Sofía Del Moral Laborde",
        "isTrainee": true
      },
      {
        "role": "2º Árbitro",
        "name": "Maria Andrea Perea Espinosa"
      }
    ],
    "homeRoster": [
      {
        "name": "Julio Sánchez Bastin",
        "dorsal": "1"
      },
      {
        "name": "Erik Woods Garcia",
        "dorsal": "4"
      },
      {
        "name": "Álvaro Benítez Plaza",
        "dorsal": "8"
      },
      {
        "name": "Antonio Garcia Carrion",
        "dorsal": "9"
      },
      {
        "name": "Adam Sufiyan Javeed-sait Pagador",
        "dorsal": "10"
      },
      {
        "name": "Ivan Sanchez Alcazar",
        "dorsal": "11",
        "isCaptain": true
      },
      {
        "name": "Ángel Vargas Villodres",
        "dorsal": "12"
      },
      {
        "name": "David Lema Arévalo",
        "dorsal": "13",
        "originCategory": "Alevín"
      },
      {
        "name": "Ramon Cano Frias",
        "dorsal": "14"
      },
      {
        "name": "Jaime Fernández Román",
        "dorsal": "55"
      },
      {
        "name": "Palomo",
        "isStaff": true,
        "staffRole": "1º Entrenador/a"
      }
    ],
    "awayRoster": [
      {
        "name": "Antonio Garcia Gonzalez",
        "dorsal": "2",
        "originCategory": "Alevín"
      },
      {
        "name": "Alexander Bauzone",
        "dorsal": "3"
      },
      {
        "name": "Pablo Martin Garcia",
        "dorsal": "8"
      },
      {
        "name": "Martin Moncayo Pérez",
        "dorsal": "12",
        "isCaptain": true
      },
      {
        "name": "Victor Fabian Jimenez",
        "dorsal": "21"
      },
      {
        "name": "Gabriel Vidal Enriquez",
        "dorsal": "23"
      },
      {
        "name": "Rodríguez",
        "isStaff": true,
        "staffRole": "1º Entrenador/a"
      }
    ]
  },
  {
    "id": "favb-3711",
    "teamId": "team-im",
    "round": 4,
    "homeTeamName": "VOLEIBOL SAN PEDRO",
    "awayTeamName": "COSTA DEL VOLEY",
    "isClubHome": true,
    "venueName": "POLIDEPORTIVO SERGIO SCARIOLO – P3 (San Pedro de Alcántara)",
    "matchDate": "2026-11-08T11:00:00.000Z",
    "status": "FINISHED",
    "statusText": "Finalizado",
    "homeScore": 0,
    "awayScore": 3,
    "setScores": [
      {
        "home": 14,
        "away": 25
      },
      {
        "home": 16,
        "away": 25
      },
      {
        "home": 23,
        "away": 25
      }
    ],
    "favbMatchUrl": "https://favoley.net/publico/seccion.php?seccion=marcador&id=3711",
    "isFeatured": false,
    "court": "Pista P3",
    "locality": "San Pedro de Alcántara",
    "googleMapsUrl": "https://www.google.com/maps/search/?api=1&query=POLIDEPORTIVO%20SERGIO%20SCARIOLO%20San%20Pedro%20de%20Alc%C3%A1ntara",
    "referees": [
      {
        "role": "1º Árbitro",
        "name": "Rodolfo Drago Ravelo"
      },
      {
        "role": "Anotador/a",
        "name": "Christian Samir Darias Drago"
      }
    ],
    "homeRoster": [
      {
        "name": "Antonio Garcia Gonzalez",
        "dorsal": "2",
        "originCategory": "Alevín"
      },
      {
        "name": "Daniel Moreno Ruiz",
        "dorsal": "3",
        "originCategory": "Alevín"
      },
      {
        "name": "Pablo Martin Garcia",
        "dorsal": "8"
      },
      {
        "name": "Agustín Benítez Cañizares",
        "dorsal": "10"
      },
      {
        "name": "Thiago Perez Martinez",
        "dorsal": "11"
      },
      {
        "name": "Martin Moncayo Pérez",
        "dorsal": "12",
        "isCaptain": true
      },
      {
        "name": "Victor Fabian Jimenez",
        "dorsal": "21"
      },
      {
        "name": "Gabriel Vidal Enriquez",
        "dorsal": "23"
      },
      {
        "name": "Alexander Bauzone",
        "dorsal": "77"
      },
      {
        "name": "Adrián Galán Toro",
        "dorsal": "99",
        "originCategory": "Alevín"
      },
      {
        "name": "Rodríguez",
        "isStaff": true,
        "staffRole": "1º Entrenador/a"
      }
    ],
    "awayRoster": [
      {
        "name": "Nacho Naranjo Jurado",
        "dorsal": "4"
      },
      {
        "name": "Martín Núñez Corona",
        "dorsal": "6"
      },
      {
        "name": "Yago Nahuel González Luque",
        "dorsal": "9"
      },
      {
        "name": "Adrian De Pedro Lorenzo",
        "dorsal": "10"
      },
      {
        "name": "Gabriel Mesa Salazar",
        "dorsal": "17",
        "originCategory": "Alevín"
      },
      {
        "name": "Martin Lorente Díaz",
        "dorsal": "18",
        "originCategory": "Alevín"
      },
      {
        "name": "Leo Sanjorge Miejimolle",
        "dorsal": "19",
        "originCategory": "Alevín"
      },
      {
        "name": "Sergio García Medina",
        "dorsal": "20",
        "isCaptain": true
      },
      {
        "name": "Juan Manuel Izquierdo Aranda",
        "dorsal": "30",
        "originCategory": "Alevín"
      },
      {
        "name": "Sergio Salas Garcia",
        "dorsal": "99"
      },
      {
        "name": "Izquierdo",
        "isStaff": true,
        "staffRole": "Médico / Fisio"
      },
      {
        "name": "Sanjorge",
        "isStaff": true,
        "staffRole": "1º Entrenador/a"
      }
    ]
  },
  {
    "id": "favb-3716",
    "teamId": "team-im",
    "round": 5,
    "homeTeamName": "CV PIZARRA LA FUENSANTA AZUL",
    "awayTeamName": "VOLEIBOL SAN PEDRO",
    "isClubHome": false,
    "venueName": "Pabellón Municipal Dani Pacheco (Pizarra)",
    "matchDate": "2026-11-13T17:00:00.000Z",
    "status": "SCHEDULED",
    "setScores": [],
    "favbMatchUrl": "https://favoley.net/publico/seccion.php?seccion=marcador&id=3716",
    "isFeatured": false,
    "locality": "Pizarra",
    "googleMapsUrl": "https://www.google.com/maps/search/?api=1&query=Pabell%C3%B3n%20Municipal%20Dani%20Pacheco%20Pizarra"
  },
  {
    "id": "favb-3721",
    "teamId": "team-im",
    "round": 6,
    "homeTeamName": "VOLEIBOL SAN PEDRO",
    "awayTeamName": "CV PIZARRA LA FUENSANTA BLANCO",
    "isClubHome": true,
    "venueName": "Pabellón Polideportivo Sergio Scariolo",
    "matchDate": "2026-11-20T17:30:00.000Z",
    "status": "SCHEDULED",
    "setScores": [],
    "favbMatchUrl": "https://favoley.net/publico/seccion.php?seccion=marcador&id=3721",
    "isFeatured": false,
    "googleMapsUrl": "https://www.google.com/maps/search/?api=1&query=Pabell%C3%B3n%20Polideportivo%20Sergio%20Scariolo"
  },
  {
    "id": "favb-3726",
    "teamId": "team-im",
    "round": 7,
    "homeTeamName": "FUENGIROLA CV",
    "awayTeamName": "VOLEIBOL SAN PEDRO",
    "isClubHome": false,
    "venueName": "Pabellón Municipal Visitante",
    "matchDate": "2026-11-27T11:00:00.000Z",
    "status": "SCHEDULED",
    "setScores": [],
    "favbMatchUrl": "https://favoley.net/publico/seccion.php?seccion=marcador&id=3726",
    "isFeatured": false,
    "googleMapsUrl": "https://www.google.com/maps/search/?api=1&query=Pabell%C3%B3n%20Municipal%20Visitante"
  },
  {
    "id": "favb-3731",
    "teamId": "team-im",
    "round": 8,
    "homeTeamName": "VOLEIBOL SAN PEDRO",
    "awayTeamName": "NUEVA OLA",
    "isClubHome": true,
    "venueName": "Pabellón Polideportivo Sergio Scariolo",
    "matchDate": "2026-12-11T17:30:00.000Z",
    "status": "SCHEDULED",
    "setScores": [],
    "favbMatchUrl": "https://favoley.net/publico/seccion.php?seccion=marcador&id=3731",
    "isFeatured": false,
    "googleMapsUrl": "https://www.google.com/maps/search/?api=1&query=Pabell%C3%B3n%20Polideportivo%20Sergio%20Scariolo"
  },
  {
    "id": "favb-3736",
    "teamId": "team-im",
    "round": 9,
    "homeTeamName": "UDA BENALMADENA A",
    "awayTeamName": "VOLEIBOL SAN PEDRO",
    "isClubHome": false,
    "venueName": "Pabellón Municipal Visitante",
    "matchDate": "2026-12-18T11:00:00.000Z",
    "status": "SCHEDULED",
    "setScores": [],
    "favbMatchUrl": "https://favoley.net/publico/seccion.php?seccion=marcador&id=3736",
    "isFeatured": false,
    "googleMapsUrl": "https://www.google.com/maps/search/?api=1&query=Pabell%C3%B3n%20Municipal%20Visitante"
  },
  {
    "id": "favb-3741",
    "teamId": "team-im",
    "round": 10,
    "homeTeamName": "VOLEIBOL SAN PEDRO",
    "awayTeamName": "3STEVOLEY",
    "isClubHome": true,
    "venueName": "Pabellón Polideportivo Sergio Scariolo",
    "matchDate": "2027-01-15T17:30:00.000Z",
    "status": "SCHEDULED",
    "setScores": [],
    "favbMatchUrl": "https://favoley.net/publico/seccion.php?seccion=marcador&id=3741",
    "isFeatured": false,
    "googleMapsUrl": "https://www.google.com/maps/search/?api=1&query=Pabell%C3%B3n%20Polideportivo%20Sergio%20Scariolo"
  },
  {
    "id": "favb-3746",
    "teamId": "team-im",
    "round": 11,
    "homeTeamName": "ALHAURÍN DE LA TORRE",
    "awayTeamName": "VOLEIBOL SAN PEDRO",
    "isClubHome": false,
    "venueName": "Pabellón Municipal Visitante",
    "matchDate": "2027-01-22T11:00:00.000Z",
    "status": "SCHEDULED",
    "setScores": [],
    "favbMatchUrl": "https://favoley.net/publico/seccion.php?seccion=marcador&id=3746",
    "isFeatured": false,
    "googleMapsUrl": "https://www.google.com/maps/search/?api=1&query=Pabell%C3%B3n%20Municipal%20Visitante"
  },
  {
    "id": "favb-3751",
    "teamId": "team-im",
    "round": 12,
    "homeTeamName": "VOLEIBOL SAN PEDRO",
    "awayTeamName": "CARTAMA",
    "isClubHome": true,
    "venueName": "Pabellón Polideportivo Sergio Scariolo",
    "matchDate": "2027-01-29T17:30:00.000Z",
    "status": "SCHEDULED",
    "setScores": [],
    "favbMatchUrl": "https://favoley.net/publico/seccion.php?seccion=marcador&id=3751",
    "isFeatured": false,
    "googleMapsUrl": "https://www.google.com/maps/search/?api=1&query=Pabell%C3%B3n%20Polideportivo%20Sergio%20Scariolo"
  },
  {
    "id": "favb-3756",
    "teamId": "team-im",
    "round": 13,
    "homeTeamName": "COSTA DEL VOLEY",
    "awayTeamName": "VOLEIBOL SAN PEDRO",
    "isClubHome": false,
    "venueName": "Pabellón Municipal Visitante",
    "matchDate": "2027-02-05T11:00:00.000Z",
    "status": "SCHEDULED",
    "setScores": [],
    "favbMatchUrl": "https://favoley.net/publico/seccion.php?seccion=marcador&id=3756",
    "isFeatured": false,
    "googleMapsUrl": "https://www.google.com/maps/search/?api=1&query=Pabell%C3%B3n%20Municipal%20Visitante"
  },
  {
    "id": "favb-3761",
    "teamId": "team-im",
    "round": 14,
    "homeTeamName": "VOLEIBOL SAN PEDRO",
    "awayTeamName": "CV PIZARRA LA FUENSANTA AZUL",
    "isClubHome": true,
    "venueName": "Pabellón Polideportivo Sergio Scariolo",
    "matchDate": "2027-02-12T17:30:00.000Z",
    "status": "SCHEDULED",
    "setScores": [],
    "favbMatchUrl": "https://favoley.net/publico/seccion.php?seccion=marcador&id=3761",
    "isFeatured": false,
    "googleMapsUrl": "https://www.google.com/maps/search/?api=1&query=Pabell%C3%B3n%20Polideportivo%20Sergio%20Scariolo"
  },
  {
    "id": "favb-3766",
    "teamId": "team-im",
    "round": 15,
    "homeTeamName": "CV PIZARRA LA FUENSANTA BLANCO",
    "awayTeamName": "VOLEIBOL SAN PEDRO",
    "isClubHome": false,
    "venueName": "Pabellón Municipal Visitante",
    "matchDate": "2027-02-19T11:00:00.000Z",
    "status": "SCHEDULED",
    "setScores": [],
    "favbMatchUrl": "https://favoley.net/publico/seccion.php?seccion=marcador&id=3766",
    "isFeatured": false,
    "googleMapsUrl": "https://www.google.com/maps/search/?api=1&query=Pabell%C3%B3n%20Municipal%20Visitante"
  },
  {
    "id": "favb-3771",
    "teamId": "team-im",
    "round": 16,
    "homeTeamName": "VOLEIBOL SAN PEDRO",
    "awayTeamName": "FUENGIROLA CV",
    "isClubHome": true,
    "venueName": "Pabellón Polideportivo Sergio Scariolo",
    "matchDate": "2027-03-05T17:30:00.000Z",
    "status": "SCHEDULED",
    "setScores": [],
    "favbMatchUrl": "https://favoley.net/publico/seccion.php?seccion=marcador&id=3771",
    "isFeatured": false,
    "googleMapsUrl": "https://www.google.com/maps/search/?api=1&query=Pabell%C3%B3n%20Polideportivo%20Sergio%20Scariolo"
  },
  {
    "id": "favb-3776",
    "teamId": "team-im",
    "round": 17,
    "homeTeamName": "NUEVA OLA",
    "awayTeamName": "VOLEIBOL SAN PEDRO",
    "isClubHome": false,
    "venueName": "Pabellón Municipal Visitante",
    "matchDate": "2027-03-12T11:00:00.000Z",
    "status": "SCHEDULED",
    "setScores": [],
    "favbMatchUrl": "https://favoley.net/publico/seccion.php?seccion=marcador&id=3776",
    "isFeatured": false,
    "googleMapsUrl": "https://www.google.com/maps/search/?api=1&query=Pabell%C3%B3n%20Municipal%20Visitante"
  },
  {
    "id": "favb-3781",
    "teamId": "team-im",
    "round": 18,
    "homeTeamName": "VOLEIBOL SAN PEDRO",
    "awayTeamName": "UDA BENALMADENA A",
    "isClubHome": true,
    "venueName": "Pabellón Polideportivo Sergio Scariolo",
    "matchDate": "2027-03-19T17:30:00.000Z",
    "status": "SCHEDULED",
    "setScores": [],
    "favbMatchUrl": "https://favoley.net/publico/seccion.php?seccion=marcador&id=3781",
    "isFeatured": false,
    "googleMapsUrl": "https://www.google.com/maps/search/?api=1&query=Pabell%C3%B3n%20Polideportivo%20Sergio%20Scariolo"
  },
  {
    "id": "favb-4072",
    "teamId": "team-if-rojo",
    "round": 1,
    "homeTeamName": "COSTA DEL VOLEY ROSA (ORO)",
    "awayTeamName": "VOLEIBOL SAN PEDRO ROJO",
    "isClubHome": false,
    "venueName": "PABELLÓN ANTONIO SERRANO LIMA – P2 (Marbella)",
    "matchDate": "2026-10-11T14:00:00.000Z",
    "status": "FINISHED",
    "homeScore": 3,
    "awayScore": 0,
    "setScores": [
      {
        "home": 25,
        "away": 19
      },
      {
        "home": 25,
        "away": 19
      },
      {
        "home": 25,
        "away": 16
      }
    ],
    "favbMatchUrl": "https://favoley.net/publico/seccion.php?seccion=marcador&id=4072",
    "isFeatured": false,
    "court": "Pista P2",
    "locality": "Marbella",
    "googleMapsUrl": "https://www.google.com/maps/search/?api=1&query=PABELL%C3%93N%20ANTONIO%20SERRANO%20LIMA%20Marbella",
    "referees": [
      {
        "role": "1º Árbitro",
        "name": "Lucía Martín Palomino"
      },
      {
        "role": "2º Árbitro",
        "name": "Santiago Román Sánchez"
      }
    ],
    "homeRoster": [
      {
        "name": "Analú Mendoza Londoño",
        "dorsal": "1"
      },
      {
        "name": "Paula Flores Izquierdo",
        "dorsal": "2"
      },
      {
        "name": "Salma Boussebti Diaz",
        "dorsal": "7"
      },
      {
        "name": "Sara Martínez Ramos",
        "dorsal": "8"
      },
      {
        "name": "Vera Perez Ostrofsky",
        "dorsal": "10"
      },
      {
        "name": "Alejandra Molero Guerrero",
        "dorsal": "11"
      },
      {
        "name": "Ainara Sofia Galeano Venialgo",
        "dorsal": "14",
        "isCaptain": true
      },
      {
        "name": "Nerea González Saucedo",
        "dorsal": "15"
      },
      {
        "name": "Maryangel Carrascal Oliva",
        "dorsal": "17"
      },
      {
        "name": "Carla Arenal Rueda",
        "dorsal": "18"
      },
      {
        "name": "Olivia Sandoval Cervan",
        "dorsal": "20"
      },
      {
        "name": "Patricia Marquez Rodriguez",
        "dorsal": "22"
      },
      {
        "name": "Marta Rodríguez Nogales",
        "dorsal": "23"
      },
      {
        "name": "Vázquez",
        "isStaff": true,
        "staffRole": "1º Entrenador/a"
      }
    ],
    "awayRoster": [
      {
        "name": "Valentina Piovano Rubio",
        "dorsal": "1"
      },
      {
        "name": "Charlotte Hannah Cerda Ynoa",
        "dorsal": "4"
      },
      {
        "name": "Ángela Cerván Bernal",
        "dorsal": "5"
      },
      {
        "name": "Zayra Ortega Gomez",
        "dorsal": "6"
      },
      {
        "name": "Carla Ruano Ruiz",
        "dorsal": "8"
      },
      {
        "name": "Daniela Romero Oña",
        "dorsal": "10",
        "isCaptain": true
      },
      {
        "name": "Nira González Pérez",
        "dorsal": "12"
      },
      {
        "name": "Harly Miller Soomre",
        "dorsal": "15"
      },
      {
        "name": "Chloe Hannah Cerda Ynoa",
        "dorsal": "16"
      },
      {
        "name": "Sara Andrades Pérez",
        "dorsal": "17"
      },
      {
        "name": "Vazquez",
        "isStaff": true,
        "staffRole": "1º Entrenador/a"
      },
      {
        "name": "Nadeau",
        "isStaff": true,
        "staffRole": "2º Entrenador/a"
      },
      {
        "name": "Martínez",
        "isStaff": true,
        "staffRole": "2º Entrenador/a"
      }
    ]
  },
  {
    "id": "favb-4075",
    "teamId": "team-if-rojo",
    "round": 2,
    "homeTeamName": "VOLEIBOL SAN PEDRO ROJO",
    "awayTeamName": "FORVOLEY TORREMOLINOS",
    "isClubHome": true,
    "venueName": "POLIDEPORTIVO SERGIO SCARIOLO – P3 (San Pedro de Alcántara)",
    "matchDate": "2026-10-17T14:00:00.000Z",
    "status": "FINISHED",
    "homeScore": 3,
    "awayScore": 0,
    "setScores": [
      {
        "home": 25,
        "away": 3
      },
      {
        "home": 25,
        "away": 8
      },
      {
        "home": 25,
        "away": 18
      }
    ],
    "favbMatchUrl": "https://favoley.net/publico/seccion.php?seccion=marcador&id=4075",
    "isFeatured": false,
    "court": "Pista P3",
    "locality": "San Pedro de Alcántara",
    "googleMapsUrl": "https://www.google.com/maps/search/?api=1&query=POLIDEPORTIVO%20SERGIO%20SCARIOLO%20San%20Pedro%20de%20Alc%C3%A1ntara",
    "referees": [
      {
        "role": "Árbitro Principal",
        "name": "Rodolfo Drago Ravelo"
      }
    ],
    "homeRoster": [
      {
        "name": "Valentina Piovano Rubio",
        "dorsal": "1"
      },
      {
        "name": "Charlotte Hannah Cerda Ynoa",
        "dorsal": "4"
      },
      {
        "name": "Ángela Cerván Bernal",
        "dorsal": "5"
      },
      {
        "name": "Zayra Ortega Gomez",
        "dorsal": "6"
      },
      {
        "name": "Carla Ruano Ruiz",
        "dorsal": "8"
      },
      {
        "name": "Daniela Romero Oña",
        "dorsal": "10",
        "isCaptain": true
      },
      {
        "name": "Nira González Pérez",
        "dorsal": "12"
      },
      {
        "name": "Harly Miller Soomre",
        "dorsal": "15"
      },
      {
        "name": "Chloe Hannah Cerda Ynoa",
        "dorsal": "16"
      },
      {
        "name": "Sara Andrades Pérez",
        "dorsal": "17"
      },
      {
        "name": "Vazquez",
        "isStaff": true,
        "staffRole": "1º Entrenador/a"
      }
    ],
    "awayRoster": [
      {
        "name": "Blanca Carmona Copado",
        "dorsal": "2"
      },
      {
        "name": "Maëlyne Beaudet Pisar",
        "dorsal": "4"
      },
      {
        "name": "Siria Nunziata",
        "dorsal": "6"
      },
      {
        "name": "Noemi Muñoz Gamez",
        "dorsal": "9"
      },
      {
        "name": "Martina Arias Jimenez",
        "dorsal": "15",
        "isCaptain": true
      },
      {
        "name": "Bianca Espeche",
        "dorsal": "18"
      },
      {
        "name": "Nefeli De Molina Chatziandreou",
        "dorsal": "21"
      },
      {
        "name": "María López García",
        "dorsal": "98"
      },
      {
        "name": "Ana Catalina Lopez Segovia",
        "dorsal": "99"
      },
      {
        "name": "Delgado",
        "isStaff": true,
        "staffRole": "1º Entrenador/a"
      }
    ]
  },
  {
    "id": "favb-4077",
    "teamId": "team-if-rojo",
    "round": 3,
    "homeTeamName": "3STEVOLEY A",
    "awayTeamName": "VOLEIBOL SAN PEDRO ROJO",
    "isClubHome": false,
    "venueName": "C.E.I.P TIERNO GALVÁN (Rincón de la Victoria)",
    "matchDate": "2026-10-25T11:00:00.000Z",
    "status": "FINISHED",
    "homeScore": 3,
    "awayScore": 2,
    "setScores": [
      {
        "home": 13,
        "away": 25
      },
      {
        "home": 22,
        "away": 25
      },
      {
        "home": 25,
        "away": 14
      },
      {
        "home": 25,
        "away": 21
      },
      {
        "home": 15,
        "away": 9
      }
    ],
    "favbMatchUrl": "https://favoley.net/publico/seccion.php?seccion=marcador&id=4077",
    "isFeatured": false,
    "locality": "Rincón de la Victoria",
    "googleMapsUrl": "https://www.google.com/maps/search/?api=1&query=C.E.I.P%20TIERNO%20GALV%C3%81N%20Rinc%C3%B3n%20de%20la%20Victoria",
    "referees": [
      {
        "role": "Árbitro Principal",
        "name": "Karin Heredia Taboada"
      }
    ],
    "homeRoster": [
      {
        "name": "Noa Peña Ramos",
        "dorsal": "1"
      },
      {
        "name": "Sara Mateo Paniagua",
        "dorsal": "3"
      },
      {
        "name": "Ellie Larruscain Gunter",
        "dorsal": "4"
      },
      {
        "name": "Rania Alvarez Castillo",
        "dorsal": "6"
      },
      {
        "name": "Ariadna Gutierrez Bueno",
        "dorsal": "9"
      },
      {
        "name": "Laura Castillo López",
        "dorsal": "12"
      },
      {
        "name": "Arya López Calvo",
        "dorsal": "13"
      },
      {
        "name": "Thalia Siena Paemen Van Haelst",
        "dorsal": "14"
      },
      {
        "name": "Elisabeth Kaindl",
        "dorsal": "19"
      },
      {
        "name": "Daniela Peláez Agudo",
        "dorsal": "21",
        "isCaptain": true
      },
      {
        "name": "Isabella Schneider Redondo",
        "dorsal": "23"
      },
      {
        "name": "Valentina Hidalgo Cordoba",
        "dorsal": "28"
      },
      {
        "name": "Ayshin Dumunt Simarro",
        "dorsal": "41"
      },
      {
        "name": "Martina Lopez Guerrero",
        "dorsal": "72"
      },
      {
        "name": "Montero",
        "isStaff": true,
        "staffRole": "2º Entrenador/a"
      },
      {
        "name": "Martín",
        "isStaff": true,
        "staffRole": "1º Entrenador/a"
      }
    ],
    "awayRoster": [
      {
        "name": "Valentina Piovano Rubio",
        "dorsal": "1"
      },
      {
        "name": "Charlotte Hannah Cerda Ynoa",
        "dorsal": "4"
      },
      {
        "name": "Ángela Cerván Bernal",
        "dorsal": "5"
      },
      {
        "name": "Zayra Ortega Gomez",
        "dorsal": "6"
      },
      {
        "name": "Carla Ruano Ruiz",
        "dorsal": "8"
      },
      {
        "name": "Daniela Romero Oña",
        "dorsal": "10",
        "isCaptain": true
      },
      {
        "name": "Nira González Pérez",
        "dorsal": "12"
      },
      {
        "name": "Chloe Hannah Cerda Ynoa",
        "dorsal": "16"
      },
      {
        "name": "Sara Andrades Pérez",
        "dorsal": "17"
      },
      {
        "name": "Vazquez",
        "isStaff": true,
        "staffRole": "1º Entrenador/a"
      }
    ]
  },
  {
    "id": "favb-4079",
    "teamId": "team-if-rojo",
    "round": 4,
    "homeTeamName": "UNION MALAGUEÑA",
    "awayTeamName": "VOLEIBOL SAN PEDRO ROJO",
    "isClubHome": false,
    "venueName": "Ciudad Deportiva Carranque Javier Imbroda (PABELLON B) (Málaga)",
    "matchDate": "2026-11-15T11:30:00.000Z",
    "status": "SCHEDULED",
    "setScores": [],
    "favbMatchUrl": "https://favoley.net/publico/seccion.php?seccion=marcador&id=4079",
    "isFeatured": false,
    "locality": "Málaga",
    "googleMapsUrl": "https://www.google.com/maps/search/?api=1&query=Ciudad%20Deportiva%20Carranque%20Javier%20Imbroda%20(PABELLON%20B)%20M%C3%A1laga"
  },
  {
    "id": "favb-4083",
    "teamId": "team-if-rojo",
    "round": 5,
    "homeTeamName": "VOLEIBOL SAN PEDRO ROJO",
    "awayTeamName": "CARTAMA",
    "isClubHome": true,
    "venueName": "Pabellón Polideportivo Sergio Scariolo",
    "matchDate": "2026-11-20T17:30:00.000Z",
    "status": "SCHEDULED",
    "setScores": [],
    "favbMatchUrl": "https://favoley.net/publico/seccion.php?seccion=marcador&id=4083",
    "isFeatured": false,
    "googleMapsUrl": "https://www.google.com/maps/search/?api=1&query=Pabell%C3%B3n%20Polideportivo%20Sergio%20Scariolo"
  },
  {
    "id": "favb-4087",
    "teamId": "team-if-rojo",
    "round": 6,
    "homeTeamName": "VOLEIBOL SAN PEDRO ROJO",
    "awayTeamName": "COSTA DEL VOLEY ROSA (ORO)",
    "isClubHome": true,
    "venueName": "Pabellón Polideportivo Sergio Scariolo",
    "matchDate": "2026-11-27T17:30:00.000Z",
    "status": "SCHEDULED",
    "setScores": [],
    "favbMatchUrl": "https://favoley.net/publico/seccion.php?seccion=marcador&id=4087",
    "isFeatured": false,
    "googleMapsUrl": "https://www.google.com/maps/search/?api=1&query=Pabell%C3%B3n%20Polideportivo%20Sergio%20Scariolo"
  },
  {
    "id": "favb-4090",
    "teamId": "team-if-rojo",
    "round": 7,
    "homeTeamName": "FORVOLEY TORREMOLINOS",
    "awayTeamName": "VOLEIBOL SAN PEDRO ROJO",
    "isClubHome": false,
    "venueName": "Pabellón Municipal Visitante",
    "matchDate": "2026-12-11T11:00:00.000Z",
    "status": "SCHEDULED",
    "setScores": [],
    "favbMatchUrl": "https://favoley.net/publico/seccion.php?seccion=marcador&id=4090",
    "isFeatured": false,
    "googleMapsUrl": "https://www.google.com/maps/search/?api=1&query=Pabell%C3%B3n%20Municipal%20Visitante"
  },
  {
    "id": "favb-4092",
    "teamId": "team-if-rojo",
    "round": 8,
    "homeTeamName": "VOLEIBOL SAN PEDRO ROJO",
    "awayTeamName": "3STEVOLEY A",
    "isClubHome": true,
    "venueName": "Pabellón Polideportivo Sergio Scariolo",
    "matchDate": "2026-12-18T17:30:00.000Z",
    "status": "SCHEDULED",
    "setScores": [],
    "favbMatchUrl": "https://favoley.net/publico/seccion.php?seccion=marcador&id=4092",
    "isFeatured": false,
    "googleMapsUrl": "https://www.google.com/maps/search/?api=1&query=Pabell%C3%B3n%20Polideportivo%20Sergio%20Scariolo"
  },
  {
    "id": "favb-4094",
    "teamId": "team-if-rojo",
    "round": 9,
    "homeTeamName": "VOLEIBOL SAN PEDRO ROJO",
    "awayTeamName": "UNION MALAGUEÑA",
    "isClubHome": true,
    "venueName": "Pabellón Polideportivo Sergio Scariolo",
    "matchDate": "2027-01-15T17:30:00.000Z",
    "status": "SCHEDULED",
    "setScores": [],
    "favbMatchUrl": "https://favoley.net/publico/seccion.php?seccion=marcador&id=4094",
    "isFeatured": false,
    "googleMapsUrl": "https://www.google.com/maps/search/?api=1&query=Pabell%C3%B3n%20Polideportivo%20Sergio%20Scariolo"
  },
  {
    "id": "favb-4098",
    "teamId": "team-if-rojo",
    "round": 10,
    "homeTeamName": "CARTAMA",
    "awayTeamName": "VOLEIBOL SAN PEDRO ROJO",
    "isClubHome": false,
    "venueName": "Pabellón Municipal Visitante",
    "matchDate": "2027-01-22T11:00:00.000Z",
    "status": "SCHEDULED",
    "setScores": [],
    "favbMatchUrl": "https://favoley.net/publico/seccion.php?seccion=marcador&id=4098",
    "isFeatured": false,
    "googleMapsUrl": "https://www.google.com/maps/search/?api=1&query=Pabell%C3%B3n%20Municipal%20Visitante"
  },
  {
    "id": "favb-4100",
    "teamId": "team-if-negro",
    "round": 1,
    "homeTeamName": "VOLEIBOL SAN PEDRO NEGRO",
    "awayTeamName": "FUENGIROLA CV A",
    "isClubHome": true,
    "venueName": "POLIDEPORTIVO SERGIO SCARIOLO – P3 (San Pedro de Alcántara)",
    "matchDate": "2026-10-10T14:00:00.000Z",
    "status": "FINISHED",
    "homeScore": 0,
    "awayScore": 3,
    "setScores": [
      {
        "home": 10,
        "away": 25
      },
      {
        "home": 14,
        "away": 25
      },
      {
        "home": 15,
        "away": 25
      }
    ],
    "favbMatchUrl": "https://favoley.net/publico/seccion.php?seccion=marcador&id=4100",
    "isFeatured": false,
    "court": "Pista P3",
    "locality": "San Pedro de Alcántara",
    "googleMapsUrl": "https://www.google.com/maps/search/?api=1&query=POLIDEPORTIVO%20SERGIO%20SCARIOLO%20San%20Pedro%20de%20Alc%C3%A1ntara",
    "referees": [
      {
        "role": "Árbitro Principal",
        "name": "Rodolfo Israel Drago Figueras"
      }
    ],
    "homeRoster": [
      {
        "name": "Atenas Garcia Soler",
        "dorsal": "2"
      },
      {
        "name": "Celia Mena Dominguez",
        "dorsal": "3"
      },
      {
        "name": "Nora Pareja Beriguete",
        "dorsal": "4"
      },
      {
        "name": "Valeria Montero Cantudo",
        "dorsal": "7"
      },
      {
        "name": "Jimena Román Ramirez",
        "dorsal": "8"
      },
      {
        "name": "Camila Noemi Sanabria Cañete",
        "dorsal": "9"
      },
      {
        "name": "Julia Trujillo Ruiz",
        "dorsal": "10",
        "isCaptain": true
      },
      {
        "name": "Valeria Nuñez Iglesias",
        "dorsal": "15"
      },
      {
        "name": "Alba Casado Redondo",
        "dorsal": "18"
      },
      {
        "name": "Paula Hernandez Alvarez",
        "dorsal": "25"
      },
      {
        "name": "Nadeau",
        "isStaff": true,
        "staffRole": "1º Entrenador/a"
      },
      {
        "name": "Martínez",
        "isStaff": true,
        "staffRole": "2º Entrenador/a"
      }
    ],
    "awayRoster": [
      {
        "name": "Matilda Lamberti Franzetti",
        "dorsal": "1"
      },
      {
        "name": "Cala Castilla Mateos",
        "dorsal": "3"
      },
      {
        "name": "Alba Jiménez Vega",
        "dorsal": "4"
      },
      {
        "name": "Arianna Baroni Wilson",
        "dorsal": "6"
      },
      {
        "name": "Yasmine Boujara",
        "dorsal": "8"
      },
      {
        "name": "Noa Rey Ruiz",
        "dorsal": "11",
        "isCaptain": true
      },
      {
        "name": "Valentina Mendez Celikel",
        "dorsal": "12"
      },
      {
        "name": "Nikoleta Valle Eykova",
        "dorsal": "13"
      },
      {
        "name": "Valeria Sanchez Drozdovska",
        "dorsal": "14"
      },
      {
        "name": "Valeria Muñoz Diaz",
        "dorsal": "17"
      },
      {
        "name": "Patricia Rodriguez Ortega",
        "dorsal": "18"
      },
      {
        "name": "Manuela Fernandez Zulueta",
        "dorsal": "71"
      },
      {
        "name": "Gil",
        "isStaff": true,
        "staffRole": "1º Entrenador/a"
      }
    ]
  },
  {
    "id": "favb-4103",
    "teamId": "team-if-negro",
    "round": 2,
    "homeTeamName": "UDA BENALMADENA A",
    "awayTeamName": "VOLEIBOL SAN PEDRO NEGRO",
    "isClubHome": false,
    "venueName": "IES POETAS ANDALUCES (Benalmádena)",
    "matchDate": "2026-10-17T14:00:00.000Z",
    "status": "FINISHED",
    "homeScore": 3,
    "awayScore": 2,
    "setScores": [
      {
        "home": 25,
        "away": 23
      },
      {
        "home": 15,
        "away": 25
      },
      {
        "home": 25,
        "away": 20
      },
      {
        "home": 13,
        "away": 25
      },
      {
        "home": 15,
        "away": 10
      }
    ],
    "favbMatchUrl": "https://favoley.net/publico/seccion.php?seccion=marcador&id=4103",
    "isFeatured": false,
    "locality": "Benalmádena",
    "googleMapsUrl": "https://www.google.com/maps/search/?api=1&query=IES%20POETAS%20ANDALUCES%20Benalm%C3%A1dena",
    "referees": [
      {
        "role": "1º Árbitro",
        "name": "Joaquin Etienne Vilte"
      },
      {
        "role": "Anotador/a",
        "name": "Julia Aguilera Pardo"
      }
    ],
    "homeRoster": [
      {
        "name": "Regina Ruano Guerra",
        "dorsal": "2"
      },
      {
        "name": "Alejandra Esteban Avisbal",
        "dorsal": "6"
      },
      {
        "name": "Elija Vaitkeviciute Vaitkeviciute",
        "dorsal": "11"
      },
      {
        "name": "Miryam Jimenez Sancho",
        "dorsal": "32"
      },
      {
        "name": "Jamaica Isabella Zabaleta Chavez",
        "dorsal": "33"
      },
      {
        "name": "Alba Carrasco Herrera",
        "dorsal": "34"
      },
      {
        "name": "Marta Piedrabuena Molina",
        "dorsal": "35"
      },
      {
        "name": "Noa Pérez Laureano",
        "dorsal": "36"
      },
      {
        "name": "Alfonsina Jaime Herrera",
        "dorsal": "45",
        "isCaptain": true
      },
      {
        "name": "Lucia Hernandez Naharro",
        "dorsal": "52"
      },
      {
        "name": "Mar Cabrera Fourniert",
        "dorsal": "77"
      },
      {
        "name": "Emma Rodriguez De Tembleque Romero",
        "dorsal": "98"
      },
      {
        "name": "De Marco",
        "isStaff": true,
        "staffRole": "1º Entrenador/a"
      }
    ],
    "awayRoster": [
      {
        "name": "Celia Mena Dominguez",
        "dorsal": "3",
        "isCaptain": true
      },
      {
        "name": "Nora Pareja Beriguete",
        "dorsal": "4"
      },
      {
        "name": "Daryna Maslova Maslov",
        "dorsal": "6"
      },
      {
        "name": "Valeria Montero Cantudo",
        "dorsal": "7"
      },
      {
        "name": "Jimena Román Ramirez",
        "dorsal": "8"
      },
      {
        "name": "Camila Noemi Sanabria Cañete",
        "dorsal": "9"
      },
      {
        "name": "Julia Trujillo Ruiz",
        "dorsal": "10"
      },
      {
        "name": "Candela Díaz Calvente",
        "dorsal": "12"
      },
      {
        "name": "Valeria Nuñez Iglesias",
        "dorsal": "15"
      },
      {
        "name": "Alba Casado Redondo",
        "dorsal": "18"
      },
      {
        "name": "Paula Hernandez Alvarez",
        "dorsal": "25"
      },
      {
        "name": "Nadeau",
        "isStaff": true,
        "staffRole": "1º Entrenador/a"
      }
    ]
  },
  {
    "id": "favb-4105",
    "teamId": "team-if-negro",
    "round": 3,
    "homeTeamName": "VOLEIBOL SAN PEDRO NEGRO",
    "awayTeamName": "CV PIZARRA LA FUENSANTA AZUL",
    "isClubHome": true,
    "venueName": "POLIDEPORTIVO SERGIO SCARIOLO – P3 (San Pedro de Alcántara)",
    "matchDate": "2026-10-24T08:00:00.000Z",
    "status": "FINISHED",
    "homeScore": 1,
    "awayScore": 3,
    "setScores": [
      {
        "home": 22,
        "away": 25
      },
      {
        "home": 26,
        "away": 24
      },
      {
        "home": 16,
        "away": 25
      },
      {
        "home": 13,
        "away": 25
      }
    ],
    "favbMatchUrl": "https://favoley.net/publico/seccion.php?seccion=marcador&id=4105",
    "isFeatured": false,
    "court": "Pista P3",
    "locality": "San Pedro de Alcántara",
    "googleMapsUrl": "https://www.google.com/maps/search/?api=1&query=POLIDEPORTIVO%20SERGIO%20SCARIOLO%20San%20Pedro%20de%20Alc%C3%A1ntara",
    "referees": [
      {
        "role": "1º Árbitro",
        "name": "Christian Samir Darias Drago",
        "isTrainee": true
      },
      {
        "role": "Anotador/a",
        "name": "Rodolfo Israel Drago Figueras"
      }
    ],
    "homeRoster": [
      {
        "name": "Atenas Garcia Soler",
        "dorsal": "2"
      },
      {
        "name": "Celia Mena Dominguez",
        "dorsal": "3"
      },
      {
        "name": "Nora Pareja Beriguete",
        "dorsal": "4"
      },
      {
        "name": "Daryna Maslova Maslov",
        "dorsal": "6"
      },
      {
        "name": "Valeria Montero Cantudo",
        "dorsal": "7"
      },
      {
        "name": "Jimena Román Ramirez",
        "dorsal": "8"
      },
      {
        "name": "Camila Noemi Sanabria Cañete",
        "dorsal": "9"
      },
      {
        "name": "Julia Trujillo Ruiz",
        "dorsal": "10"
      },
      {
        "name": "Candela Díaz Calvente",
        "dorsal": "12",
        "isCaptain": true
      },
      {
        "name": "Valeria Nuñez Iglesias",
        "dorsal": "15"
      },
      {
        "name": "Alba Casado Redondo",
        "dorsal": "18"
      },
      {
        "name": "Paula Hernandez Alvarez",
        "dorsal": "25"
      },
      {
        "name": "Nadeau",
        "isStaff": true,
        "staffRole": "1º Entrenador/a"
      }
    ],
    "awayRoster": [
      {
        "name": "Maria Marin Muñoz",
        "dorsal": "5",
        "isCaptain": true
      },
      {
        "name": "Ana De Oliveira Garcia",
        "dorsal": "6"
      },
      {
        "name": "Daniela Benitez Olivero",
        "dorsal": "7"
      },
      {
        "name": "Celia Chevalier Aranda",
        "dorsal": "10"
      },
      {
        "name": "Martina Florido Sanchez",
        "dorsal": "15"
      },
      {
        "name": "Marina Padilla Franco",
        "dorsal": "17"
      },
      {
        "name": "Marietta García Benítez",
        "dorsal": "19"
      },
      {
        "name": "Ambar Galán Dolabella",
        "dorsal": "27"
      },
      {
        "name": "Ainhoa Sánchez Fuentes",
        "dorsal": "60"
      },
      {
        "name": "Dominguez",
        "isStaff": true,
        "staffRole": "1º Entrenador/a"
      },
      {
        "name": "Marín",
        "isStaff": true,
        "staffRole": "2º Entrenador/a"
      }
    ]
  },
  {
    "id": "favb-4106",
    "teamId": "team-if-negro",
    "round": 4,
    "homeTeamName": "MIJAS VOLEY AZUL",
    "awayTeamName": "VOLEIBOL SAN PEDRO NEGRO",
    "isClubHome": false,
    "venueName": "PABELLÓN CUBIERTO DE LA CALA – P2 (La Cala de Mijas)",
    "matchDate": "2026-11-15T09:00:00.000Z",
    "status": "SCHEDULED",
    "setScores": [],
    "favbMatchUrl": "https://favoley.net/publico/seccion.php?seccion=marcador&id=4106",
    "isFeatured": false,
    "court": "Pista P2",
    "locality": "La Cala de Mijas",
    "googleMapsUrl": "https://www.google.com/maps/search/?api=1&query=PABELL%C3%93N%20CUBIERTO%20DE%20LA%20CALA%20La%20Cala%20de%20Mijas"
  },
  {
    "id": "favb-4110",
    "teamId": "team-if-negro",
    "round": 6,
    "homeTeamName": "FUENGIROLA CV A",
    "awayTeamName": "VOLEIBOL SAN PEDRO NEGRO",
    "isClubHome": false,
    "venueName": "Pabellón Municipal Visitante",
    "matchDate": "2026-11-27T11:00:00.000Z",
    "status": "SCHEDULED",
    "setScores": [],
    "favbMatchUrl": "https://favoley.net/publico/seccion.php?seccion=marcador&id=4110",
    "isFeatured": false,
    "googleMapsUrl": "https://www.google.com/maps/search/?api=1&query=Pabell%C3%B3n%20Municipal%20Visitante"
  },
  {
    "id": "favb-4113",
    "teamId": "team-if-negro",
    "round": 7,
    "homeTeamName": "VOLEIBOL SAN PEDRO NEGRO",
    "awayTeamName": "UDA BENALMADENA A",
    "isClubHome": true,
    "venueName": "Pabellón Polideportivo Sergio Scariolo",
    "matchDate": "2026-12-11T17:30:00.000Z",
    "status": "SCHEDULED",
    "setScores": [],
    "favbMatchUrl": "https://favoley.net/publico/seccion.php?seccion=marcador&id=4113",
    "isFeatured": false,
    "googleMapsUrl": "https://www.google.com/maps/search/?api=1&query=Pabell%C3%B3n%20Polideportivo%20Sergio%20Scariolo"
  },
  {
    "id": "favb-4115",
    "teamId": "team-if-negro",
    "round": 8,
    "homeTeamName": "CV PIZARRA LA FUENSANTA AZUL",
    "awayTeamName": "VOLEIBOL SAN PEDRO NEGRO",
    "isClubHome": false,
    "venueName": "Pabellón Municipal Visitante",
    "matchDate": "2026-12-18T11:00:00.000Z",
    "status": "SCHEDULED",
    "setScores": [],
    "favbMatchUrl": "https://favoley.net/publico/seccion.php?seccion=marcador&id=4115",
    "isFeatured": false,
    "googleMapsUrl": "https://www.google.com/maps/search/?api=1&query=Pabell%C3%B3n%20Municipal%20Visitante"
  },
  {
    "id": "favb-4116",
    "teamId": "team-if-negro",
    "round": 9,
    "homeTeamName": "VOLEIBOL SAN PEDRO NEGRO",
    "awayTeamName": "MIJAS VOLEY AZUL",
    "isClubHome": true,
    "venueName": "Pabellón Polideportivo Sergio Scariolo",
    "matchDate": "2027-01-15T17:30:00.000Z",
    "status": "SCHEDULED",
    "setScores": [],
    "favbMatchUrl": "https://favoley.net/publico/seccion.php?seccion=marcador&id=4116",
    "isFeatured": false,
    "googleMapsUrl": "https://www.google.com/maps/search/?api=1&query=Pabell%C3%B3n%20Polideportivo%20Sergio%20Scariolo"
  },
  {
    "id": "favb-7424",
    "teamId": "team-if-blanco",
    "round": 1,
    "homeTeamName": "AD ASUNCIÓN",
    "awayTeamName": "VOLEIBOL SAN PEDRO BLANCO",
    "isClubHome": false,
    "venueName": "COLEGIO DE LA ASUNCIÓN – Central (Málaga)",
    "matchDate": "2026-10-24T11:30:00.000Z",
    "status": "FINISHED",
    "homeScore": 3,
    "awayScore": 0,
    "setScores": [
      {
        "home": 25,
        "away": 19
      },
      {
        "home": 25,
        "away": 11
      },
      {
        "home": 25,
        "away": 12
      }
    ],
    "favbMatchUrl": "https://favoley.net/publico/seccion.php?seccion=marcador&id=7424",
    "isFeatured": false,
    "court": "Pista Central",
    "locality": "Málaga",
    "googleMapsUrl": "https://www.google.com/maps/search/?api=1&query=COLEGIO%20DE%20LA%20ASUNCI%C3%93N%20M%C3%A1laga",
    "referees": [
      {
        "role": "Árbitro Principal",
        "name": "Mauricio Dorian Kevin Roca Martinez"
      }
    ],
    "homeRoster": [
      {
        "name": "Milena Ruiz Garcia",
        "dorsal": "1",
        "isCaptain": true
      },
      {
        "name": "Olivia Garcia González",
        "dorsal": "4"
      },
      {
        "name": "Carla Garcia Arroyo",
        "dorsal": "9"
      },
      {
        "name": "Inara Casasola Acero",
        "dorsal": "11"
      },
      {
        "name": "Carla Casasola Acero",
        "dorsal": "14"
      },
      {
        "name": "Maria Murillo De La Puerta",
        "dorsal": "16"
      },
      {
        "name": "Adr Gira Gale",
        "dorsal": "17"
      },
      {
        "name": "Elena Núñez Escribano",
        "dorsal": "18"
      },
      {
        "name": "Noelia Vela Coca",
        "dorsal": "20"
      },
      {
        "name": "Cabra",
        "isStaff": true,
        "staffRole": "1º Entrenador/a"
      }
    ],
    "awayRoster": [
      {
        "name": "Karla Guerrerro San Emeterio",
        "dorsal": "2",
        "originCategory": "Alevín"
      },
      {
        "name": "Julieta Vidal De Leon",
        "dorsal": "3"
      },
      {
        "name": "Daniela Gonzalez Ortega",
        "dorsal": "4",
        "originCategory": "Alevín"
      },
      {
        "name": "Sara Muñoz El Haj",
        "dorsal": "5"
      },
      {
        "name": "Selena Naranjo Ventura",
        "dorsal": "7",
        "isCaptain": true
      },
      {
        "name": "Martina De La Medica Sánchez",
        "dorsal": "9"
      },
      {
        "name": "Marta Robles Ciobotaru",
        "dorsal": "11"
      },
      {
        "name": "Daniela Naranjo Navarro",
        "dorsal": "13"
      },
      {
        "name": "Ana Martin Sanchez",
        "dorsal": "20"
      },
      {
        "name": "Vega Vazquez Bautista",
        "dorsal": "75",
        "originCategory": "Alevín"
      },
      {
        "name": "Martínez",
        "isStaff": true,
        "staffRole": "1º Entrenador/a"
      },
      {
        "name": "Vazquez",
        "isStaff": true,
        "staffRole": "2º Entrenador/a"
      }
    ]
  },
  {
    "id": "favb-7432",
    "teamId": "team-if-blanco",
    "round": 3,
    "homeTeamName": "VOLEIBOL SAN PEDRO BLANCO",
    "awayTeamName": "INTER PLAYAS",
    "isClubHome": true,
    "venueName": "POLIDEPORTIVO SERGIO SCARIOLO – P3 (San Pedro de Alcántara)",
    "matchDate": "2026-11-15T10:00:00.000Z",
    "status": "SCHEDULED",
    "setScores": [],
    "favbMatchUrl": "https://favoley.net/publico/seccion.php?seccion=marcador&id=7432",
    "isFeatured": false,
    "court": "Pista P3",
    "locality": "San Pedro de Alcántara",
    "googleMapsUrl": "https://www.google.com/maps/search/?api=1&query=POLIDEPORTIVO%20SERGIO%20SCARIOLO%20San%20Pedro%20de%20Alc%C3%A1ntara"
  },
  {
    "id": "favb-7437",
    "teamId": "team-if-blanco",
    "round": 4,
    "homeTeamName": "EMV ALH.GRANDE",
    "awayTeamName": "VOLEIBOL SAN PEDRO BLANCO",
    "isClubHome": false,
    "venueName": "Pabellón Municipal Visitante",
    "matchDate": "2026-11-20T11:00:00.000Z",
    "status": "SCHEDULED",
    "setScores": [],
    "favbMatchUrl": "https://favoley.net/publico/seccion.php?seccion=marcador&id=7437",
    "isFeatured": false,
    "googleMapsUrl": "https://www.google.com/maps/search/?api=1&query=Pabell%C3%B3n%20Municipal%20Visitante"
  },
  {
    "id": "favb-7442",
    "teamId": "team-if-blanco",
    "round": 5,
    "homeTeamName": "VOLEIBOL SAN PEDRO BLANCO",
    "awayTeamName": "CLUB NERJA ATLETISMO",
    "isClubHome": true,
    "venueName": "Pabellón Polideportivo Sergio Scariolo",
    "matchDate": "2026-11-27T17:30:00.000Z",
    "status": "SCHEDULED",
    "setScores": [],
    "favbMatchUrl": "https://favoley.net/publico/seccion.php?seccion=marcador&id=7442",
    "isFeatured": false,
    "googleMapsUrl": "https://www.google.com/maps/search/?api=1&query=Pabell%C3%B3n%20Polideportivo%20Sergio%20Scariolo"
  },
  {
    "id": "favb-7447",
    "teamId": "team-if-blanco",
    "round": 6,
    "homeTeamName": "ALHAURÍN DE LA TORRE",
    "awayTeamName": "VOLEIBOL SAN PEDRO BLANCO",
    "isClubHome": false,
    "venueName": "Pabellón Municipal Visitante",
    "matchDate": "2026-12-11T11:00:00.000Z",
    "status": "SCHEDULED",
    "setScores": [],
    "favbMatchUrl": "https://favoley.net/publico/seccion.php?seccion=marcador&id=7447",
    "isFeatured": false,
    "googleMapsUrl": "https://www.google.com/maps/search/?api=1&query=Pabell%C3%B3n%20Municipal%20Visitante"
  },
  {
    "id": "favb-7451",
    "teamId": "team-if-blanco",
    "round": 7,
    "homeTeamName": "VOLEIBOL SAN PEDRO BLANCO",
    "awayTeamName": "LA VEGA",
    "isClubHome": true,
    "venueName": "Pabellón Polideportivo Sergio Scariolo",
    "matchDate": "2026-12-18T17:30:00.000Z",
    "status": "SCHEDULED",
    "setScores": [],
    "favbMatchUrl": "https://favoley.net/publico/seccion.php?seccion=marcador&id=7451",
    "isFeatured": false,
    "googleMapsUrl": "https://www.google.com/maps/search/?api=1&query=Pabell%C3%B3n%20Polideportivo%20Sergio%20Scariolo"
  },
  {
    "id": "favb-7454",
    "teamId": "team-if-blanco",
    "round": 8,
    "homeTeamName": "INFANTIL BLANCO",
    "awayTeamName": "VOLEIBOL SAN PEDRO BLANCO",
    "isClubHome": false,
    "venueName": "Pabellón Municipal Visitante",
    "matchDate": "2027-01-08T11:00:00.000Z",
    "status": "SCHEDULED",
    "setScores": [],
    "favbMatchUrl": "https://favoley.net/publico/seccion.php?seccion=marcador&id=7454",
    "isFeatured": false,
    "googleMapsUrl": "https://www.google.com/maps/search/?api=1&query=Pabell%C3%B3n%20Municipal%20Visitante"
  },
  {
    "id": "favb-7457",
    "teamId": "team-if-blanco",
    "round": 9,
    "homeTeamName": "VOLEIBOL SAN PEDRO BLANCO",
    "awayTeamName": "CV PIZARRA LA FUENSANTA BLANCO",
    "isClubHome": true,
    "venueName": "Pabellón Polideportivo Sergio Scariolo",
    "matchDate": "2027-01-15T17:30:00.000Z",
    "status": "SCHEDULED",
    "setScores": [],
    "favbMatchUrl": "https://favoley.net/publico/seccion.php?seccion=marcador&id=7457",
    "isFeatured": false,
    "googleMapsUrl": "https://www.google.com/maps/search/?api=1&query=Pabell%C3%B3n%20Polideportivo%20Sergio%20Scariolo"
  },
  {
    "id": "favb-7460",
    "teamId": "team-if-blanco",
    "round": 10,
    "homeTeamName": "VOLEIBOL SAN PEDRO BLANCO",
    "awayTeamName": "AD ASUNCIÓN",
    "isClubHome": true,
    "venueName": "Pabellón Polideportivo Sergio Scariolo",
    "matchDate": "2027-01-22T17:30:00.000Z",
    "status": "SCHEDULED",
    "setScores": [],
    "favbMatchUrl": "https://favoley.net/publico/seccion.php?seccion=marcador&id=7460",
    "isFeatured": false,
    "googleMapsUrl": "https://www.google.com/maps/search/?api=1&query=Pabell%C3%B3n%20Polideportivo%20Sergio%20Scariolo"
  },
  {
    "id": "favb-7468",
    "teamId": "team-if-blanco",
    "round": 12,
    "homeTeamName": "INTER PLAYAS",
    "awayTeamName": "VOLEIBOL SAN PEDRO BLANCO",
    "isClubHome": false,
    "venueName": "Pabellón Municipal Visitante",
    "matchDate": "2027-02-05T11:00:00.000Z",
    "status": "SCHEDULED",
    "setScores": [],
    "favbMatchUrl": "https://favoley.net/publico/seccion.php?seccion=marcador&id=7468",
    "isFeatured": false,
    "googleMapsUrl": "https://www.google.com/maps/search/?api=1&query=Pabell%C3%B3n%20Municipal%20Visitante"
  },
  {
    "id": "favb-7473",
    "teamId": "team-if-blanco",
    "round": 13,
    "homeTeamName": "VOLEIBOL SAN PEDRO BLANCO",
    "awayTeamName": "EMV ALH.GRANDE",
    "isClubHome": true,
    "venueName": "Pabellón Polideportivo Sergio Scariolo",
    "matchDate": "2027-02-12T17:30:00.000Z",
    "status": "SCHEDULED",
    "setScores": [],
    "favbMatchUrl": "https://favoley.net/publico/seccion.php?seccion=marcador&id=7473",
    "isFeatured": false,
    "googleMapsUrl": "https://www.google.com/maps/search/?api=1&query=Pabell%C3%B3n%20Polideportivo%20Sergio%20Scariolo"
  },
  {
    "id": "favb-7478",
    "teamId": "team-if-blanco",
    "round": 14,
    "homeTeamName": "CLUB NERJA ATLETISMO",
    "awayTeamName": "VOLEIBOL SAN PEDRO BLANCO",
    "isClubHome": false,
    "venueName": "Pabellón Municipal Visitante",
    "matchDate": "2027-02-19T11:00:00.000Z",
    "status": "SCHEDULED",
    "setScores": [],
    "favbMatchUrl": "https://favoley.net/publico/seccion.php?seccion=marcador&id=7478",
    "isFeatured": false,
    "googleMapsUrl": "https://www.google.com/maps/search/?api=1&query=Pabell%C3%B3n%20Municipal%20Visitante"
  },
  {
    "id": "favb-7483",
    "teamId": "team-if-blanco",
    "round": 15,
    "homeTeamName": "VOLEIBOL SAN PEDRO BLANCO",
    "awayTeamName": "ALHAURÍN DE LA TORRE",
    "isClubHome": true,
    "venueName": "Pabellón Polideportivo Sergio Scariolo",
    "matchDate": "2027-03-05T17:30:00.000Z",
    "status": "SCHEDULED",
    "setScores": [],
    "favbMatchUrl": "https://favoley.net/publico/seccion.php?seccion=marcador&id=7483",
    "isFeatured": false,
    "googleMapsUrl": "https://www.google.com/maps/search/?api=1&query=Pabell%C3%B3n%20Polideportivo%20Sergio%20Scariolo"
  },
  {
    "id": "favb-7487",
    "teamId": "team-if-blanco",
    "round": 16,
    "homeTeamName": "LA VEGA",
    "awayTeamName": "VOLEIBOL SAN PEDRO BLANCO",
    "isClubHome": false,
    "venueName": "Pabellón Municipal Visitante",
    "matchDate": "2027-03-12T11:00:00.000Z",
    "status": "SCHEDULED",
    "setScores": [],
    "favbMatchUrl": "https://favoley.net/publico/seccion.php?seccion=marcador&id=7487",
    "isFeatured": false,
    "googleMapsUrl": "https://www.google.com/maps/search/?api=1&query=Pabell%C3%B3n%20Municipal%20Visitante"
  },
  {
    "id": "favb-7490",
    "teamId": "team-if-blanco",
    "round": 17,
    "homeTeamName": "VOLEIBOL SAN PEDRO BLANCO",
    "awayTeamName": "INFANTIL BLANCO",
    "isClubHome": true,
    "venueName": "Pabellón Polideportivo Sergio Scariolo",
    "matchDate": "2027-04-02T16:30:00.000Z",
    "status": "SCHEDULED",
    "setScores": [],
    "favbMatchUrl": "https://favoley.net/publico/seccion.php?seccion=marcador&id=7490",
    "isFeatured": false,
    "googleMapsUrl": "https://www.google.com/maps/search/?api=1&query=Pabell%C3%B3n%20Polideportivo%20Sergio%20Scariolo"
  },
  {
    "id": "favb-7493",
    "teamId": "team-if-blanco",
    "round": 18,
    "homeTeamName": "CV PIZARRA LA FUENSANTA BLANCO",
    "awayTeamName": "VOLEIBOL SAN PEDRO BLANCO",
    "isClubHome": false,
    "venueName": "Pabellón Municipal Visitante",
    "matchDate": "2027-04-09T10:00:00.000Z",
    "status": "SCHEDULED",
    "setScores": [],
    "favbMatchUrl": "https://favoley.net/publico/seccion.php?seccion=marcador&id=7493",
    "isFeatured": false,
    "googleMapsUrl": "https://www.google.com/maps/search/?api=1&query=Pabell%C3%B3n%20Municipal%20Visitante"
  },
  {
    "id": "favb-7356",
    "teamId": "team-if-gris",
    "round": 2,
    "homeTeamName": "VOLEIBOL SAN PEDRO GRIS",
    "awayTeamName": "3STEVOLEY B",
    "isClubHome": true,
    "venueName": "POLIDEPORTIVO SERGIO SCARIOLO – P3 (San Pedro de Alcántara)",
    "matchDate": "2026-11-07T09:00:00.000Z",
    "status": "FINISHED",
    "homeScore": 1,
    "awayScore": 3,
    "setScores": [
      {
        "home": 17,
        "away": 25
      },
      {
        "home": 25,
        "away": 15
      },
      {
        "home": 17,
        "away": 25
      },
      {
        "home": 24,
        "away": 26
      }
    ],
    "favbMatchUrl": "https://favoley.net/publico/seccion.php?seccion=marcador&id=7356",
    "isFeatured": false,
    "court": "Pista P3",
    "locality": "San Pedro de Alcántara",
    "googleMapsUrl": "https://www.google.com/maps/search/?api=1&query=POLIDEPORTIVO%20SERGIO%20SCARIOLO%20San%20Pedro%20de%20Alc%C3%A1ntara",
    "referees": [
      {
        "role": "1º Árbitro",
        "name": "Christian Samir Darias Drago"
      },
      {
        "role": "Anotador/a",
        "name": "Rodolfo Drago Ravelo"
      }
    ],
    "homeRoster": [
      {
        "name": "Noah Alcantara Agenjo",
        "dorsal": "1",
        "originCategory": "Alevín"
      },
      {
        "name": "Samira Ailen Sanabria Cañete",
        "dorsal": "3",
        "originCategory": "Alevín"
      },
      {
        "name": "Helena De Lope Moraga",
        "dorsal": "6",
        "originCategory": "Alevín"
      },
      {
        "name": "Sofia Muñoz Fernandez",
        "dorsal": "11",
        "isCaptain": true
      },
      {
        "name": "Alba Lucía Escalona Vivaldi",
        "dorsal": "15"
      },
      {
        "name": "Cayetana Jurado Guzman",
        "dorsal": "22"
      },
      {
        "name": "Anna Buetto Domanova",
        "dorsal": "24"
      },
      {
        "name": "Martina Morrison Vergara",
        "dorsal": "25"
      },
      {
        "name": "Pilar Megens Marin",
        "dorsal": "27"
      },
      {
        "name": "Adriana Herrera Pérez",
        "dorsal": "71"
      },
      {
        "name": "Martínez",
        "isStaff": true,
        "staffRole": "1º Entrenador/a"
      },
      {
        "name": "Alcantara",
        "isStaff": true,
        "staffRole": "2º Entrenador/a"
      }
    ],
    "awayRoster": [
      {
        "name": "Paula Serrano Vertedor",
        "dorsal": "5"
      },
      {
        "name": "Solomiia Korol",
        "dorsal": "7"
      },
      {
        "name": "Marina Jiménez González",
        "dorsal": "10"
      },
      {
        "name": "Celia Martin Bernal",
        "dorsal": "11"
      },
      {
        "name": "Mia Cionti Molina",
        "dorsal": "13"
      },
      {
        "name": "Lola Lasheras Diaz",
        "dorsal": "14",
        "isCaptain": true
      },
      {
        "name": "Lucia Barrionuevo Rodriguez",
        "dorsal": "17"
      },
      {
        "name": "Elsa Watson Mata",
        "dorsal": "18"
      },
      {
        "name": "Marina Hernández Lara",
        "dorsal": "20"
      },
      {
        "name": "Carla Bermúdez Ocete",
        "dorsal": "24"
      },
      {
        "name": "Valentina Seijo Ruiz",
        "dorsal": "27"
      },
      {
        "name": "Lucia San Roman Moreno",
        "dorsal": "28"
      },
      {
        "name": "Noa Rio Lara",
        "dorsal": "77"
      },
      {
        "name": "Haro",
        "isStaff": true,
        "staffRole": "1º Entrenador/a"
      }
    ]
  },
  {
    "id": "favb-7361",
    "teamId": "team-if-gris",
    "round": 3,
    "homeTeamName": "FUENGIROLA CV B",
    "awayTeamName": "VOLEIBOL SAN PEDRO GRIS",
    "isClubHome": false,
    "venueName": "COMPLEJO POLIDEPORTIVO MUNICIPAL ELOLA (Fuengirola)",
    "matchDate": "2026-11-14T16:00:00.000Z",
    "status": "SCHEDULED",
    "setScores": [],
    "favbMatchUrl": "https://favoley.net/publico/seccion.php?seccion=marcador&id=7361",
    "isFeatured": false,
    "locality": "Fuengirola",
    "googleMapsUrl": "https://www.google.com/maps/search/?api=1&query=COMPLEJO%20POLIDEPORTIVO%20MUNICIPAL%20ELOLA%20Fuengirola"
  },
  {
    "id": "favb-7366",
    "teamId": "team-if-gris",
    "round": 4,
    "homeTeamName": "VOLEIBOL SAN PEDRO GRIS",
    "awayTeamName": "MIJAS VOLEY BLANCO",
    "isClubHome": true,
    "venueName": "Pabellón Polideportivo Sergio Scariolo",
    "matchDate": "2026-11-20T17:30:00.000Z",
    "status": "SCHEDULED",
    "setScores": [],
    "favbMatchUrl": "https://favoley.net/publico/seccion.php?seccion=marcador&id=7366",
    "isFeatured": false,
    "googleMapsUrl": "https://www.google.com/maps/search/?api=1&query=Pabell%C3%B3n%20Polideportivo%20Sergio%20Scariolo"
  },
  {
    "id": "favb-7371",
    "teamId": "team-if-gris",
    "round": 5,
    "homeTeamName": "UDA BENALMADENA B",
    "awayTeamName": "VOLEIBOL SAN PEDRO GRIS",
    "isClubHome": false,
    "venueName": "POLIDEPORTIVO MUNICIPAL DE ARROYO DE LA MIEL (Benalmádena)",
    "matchDate": "2026-11-29T09:00:00.000Z",
    "status": "SCHEDULED",
    "setScores": [],
    "favbMatchUrl": "https://favoley.net/publico/seccion.php?seccion=marcador&id=7371",
    "isFeatured": false,
    "locality": "Benalmádena",
    "googleMapsUrl": "https://www.google.com/maps/search/?api=1&query=POLIDEPORTIVO%20MUNICIPAL%20DE%20ARROYO%20DE%20LA%20MIEL%20Benalm%C3%A1dena"
  },
  {
    "id": "favb-7375",
    "teamId": "team-if-gris",
    "round": 6,
    "homeTeamName": "VOLEIBOL SAN PEDRO GRIS",
    "awayTeamName": "COSTA DEL VOLEY NEGRO",
    "isClubHome": true,
    "venueName": "Pabellón Polideportivo Sergio Scariolo",
    "matchDate": "2026-12-11T17:30:00.000Z",
    "status": "SCHEDULED",
    "setScores": [],
    "favbMatchUrl": "https://favoley.net/publico/seccion.php?seccion=marcador&id=7375",
    "isFeatured": false,
    "googleMapsUrl": "https://www.google.com/maps/search/?api=1&query=Pabell%C3%B3n%20Polideportivo%20Sergio%20Scariolo"
  },
  {
    "id": "favb-7378",
    "teamId": "team-if-gris",
    "round": 7,
    "homeTeamName": "EMV ALHAURIN EL GRANDE ROJO",
    "awayTeamName": "VOLEIBOL SAN PEDRO GRIS",
    "isClubHome": false,
    "venueName": "Pabellón Municipal Visitante",
    "matchDate": "2026-12-18T11:00:00.000Z",
    "status": "SCHEDULED",
    "setScores": [],
    "favbMatchUrl": "https://favoley.net/publico/seccion.php?seccion=marcador&id=7378",
    "isFeatured": false,
    "googleMapsUrl": "https://www.google.com/maps/search/?api=1&query=Pabell%C3%B3n%20Municipal%20Visitante"
  },
  {
    "id": "favb-7381",
    "teamId": "team-if-gris",
    "round": 8,
    "homeTeamName": "VOLEIBOL SAN PEDRO GRIS",
    "awayTeamName": "INFANTIL NEGRO",
    "isClubHome": true,
    "venueName": "Pabellón Polideportivo Sergio Scariolo",
    "matchDate": "2027-01-08T17:30:00.000Z",
    "status": "SCHEDULED",
    "setScores": [],
    "favbMatchUrl": "https://favoley.net/publico/seccion.php?seccion=marcador&id=7381",
    "isFeatured": false,
    "googleMapsUrl": "https://www.google.com/maps/search/?api=1&query=Pabell%C3%B3n%20Polideportivo%20Sergio%20Scariolo"
  },
  {
    "id": "favb-7384",
    "teamId": "team-if-gris",
    "round": 9,
    "homeTeamName": "NUEVA OLA",
    "awayTeamName": "VOLEIBOL SAN PEDRO GRIS",
    "isClubHome": false,
    "venueName": "Pabellón Municipal Visitante",
    "matchDate": "2027-01-15T11:00:00.000Z",
    "status": "SCHEDULED",
    "setScores": [],
    "favbMatchUrl": "https://favoley.net/publico/seccion.php?seccion=marcador&id=7384",
    "isFeatured": false,
    "googleMapsUrl": "https://www.google.com/maps/search/?api=1&query=Pabell%C3%B3n%20Municipal%20Visitante"
  },
  {
    "id": "favb-7392",
    "teamId": "team-if-gris",
    "round": 11,
    "homeTeamName": "3STEVOLEY B",
    "awayTeamName": "VOLEIBOL SAN PEDRO GRIS",
    "isClubHome": false,
    "venueName": "Pabellón Municipal Visitante",
    "matchDate": "2027-01-29T11:00:00.000Z",
    "status": "SCHEDULED",
    "setScores": [],
    "favbMatchUrl": "https://favoley.net/publico/seccion.php?seccion=marcador&id=7392",
    "isFeatured": false,
    "googleMapsUrl": "https://www.google.com/maps/search/?api=1&query=Pabell%C3%B3n%20Municipal%20Visitante"
  },
  {
    "id": "favb-7397",
    "teamId": "team-if-gris",
    "round": 12,
    "homeTeamName": "VOLEIBOL SAN PEDRO GRIS",
    "awayTeamName": "FUENGIROLA CV B",
    "isClubHome": true,
    "venueName": "Pabellón Polideportivo Sergio Scariolo",
    "matchDate": "2027-02-05T17:30:00.000Z",
    "status": "SCHEDULED",
    "setScores": [],
    "favbMatchUrl": "https://favoley.net/publico/seccion.php?seccion=marcador&id=7397",
    "isFeatured": false,
    "googleMapsUrl": "https://www.google.com/maps/search/?api=1&query=Pabell%C3%B3n%20Polideportivo%20Sergio%20Scariolo"
  },
  {
    "id": "favb-7402",
    "teamId": "team-if-gris",
    "round": 13,
    "homeTeamName": "MIJAS VOLEY BLANCO",
    "awayTeamName": "VOLEIBOL SAN PEDRO GRIS",
    "isClubHome": false,
    "venueName": "Pabellón Municipal Visitante",
    "matchDate": "2027-02-12T11:00:00.000Z",
    "status": "SCHEDULED",
    "setScores": [],
    "favbMatchUrl": "https://favoley.net/publico/seccion.php?seccion=marcador&id=7402",
    "isFeatured": false,
    "googleMapsUrl": "https://www.google.com/maps/search/?api=1&query=Pabell%C3%B3n%20Municipal%20Visitante"
  },
  {
    "id": "favb-7407",
    "teamId": "team-if-gris",
    "round": 14,
    "homeTeamName": "VOLEIBOL SAN PEDRO GRIS",
    "awayTeamName": "UDA BENALMADENA B",
    "isClubHome": true,
    "venueName": "Pabellón Polideportivo Sergio Scariolo",
    "matchDate": "2027-02-19T17:30:00.000Z",
    "status": "SCHEDULED",
    "setScores": [],
    "favbMatchUrl": "https://favoley.net/publico/seccion.php?seccion=marcador&id=7407",
    "isFeatured": false,
    "googleMapsUrl": "https://www.google.com/maps/search/?api=1&query=Pabell%C3%B3n%20Polideportivo%20Sergio%20Scariolo"
  },
  {
    "id": "favb-7411",
    "teamId": "team-if-gris",
    "round": 15,
    "homeTeamName": "COSTA DEL VOLEY NEGRO",
    "awayTeamName": "VOLEIBOL SAN PEDRO GRIS",
    "isClubHome": false,
    "venueName": "Pabellón Municipal Visitante",
    "matchDate": "2027-03-05T11:00:00.000Z",
    "status": "SCHEDULED",
    "setScores": [],
    "favbMatchUrl": "https://favoley.net/publico/seccion.php?seccion=marcador&id=7411",
    "isFeatured": false,
    "googleMapsUrl": "https://www.google.com/maps/search/?api=1&query=Pabell%C3%B3n%20Municipal%20Visitante"
  },
  {
    "id": "favb-7414",
    "teamId": "team-if-gris",
    "round": 16,
    "homeTeamName": "VOLEIBOL SAN PEDRO GRIS",
    "awayTeamName": "EMV ALHAURIN EL GRANDE ROJO",
    "isClubHome": true,
    "venueName": "Pabellón Polideportivo Sergio Scariolo",
    "matchDate": "2027-03-12T17:30:00.000Z",
    "status": "SCHEDULED",
    "setScores": [],
    "favbMatchUrl": "https://favoley.net/publico/seccion.php?seccion=marcador&id=7414",
    "isFeatured": false,
    "googleMapsUrl": "https://www.google.com/maps/search/?api=1&query=Pabell%C3%B3n%20Polideportivo%20Sergio%20Scariolo"
  },
  {
    "id": "favb-7417",
    "teamId": "team-if-gris",
    "round": 17,
    "homeTeamName": "INFANTIL NEGRO",
    "awayTeamName": "VOLEIBOL SAN PEDRO GRIS",
    "isClubHome": false,
    "venueName": "Pabellón Municipal Visitante",
    "matchDate": "2027-04-02T10:00:00.000Z",
    "status": "SCHEDULED",
    "setScores": [],
    "favbMatchUrl": "https://favoley.net/publico/seccion.php?seccion=marcador&id=7417",
    "isFeatured": false,
    "googleMapsUrl": "https://www.google.com/maps/search/?api=1&query=Pabell%C3%B3n%20Municipal%20Visitante"
  },
  {
    "id": "favb-7420",
    "teamId": "team-if-gris",
    "round": 18,
    "homeTeamName": "VOLEIBOL SAN PEDRO GRIS",
    "awayTeamName": "NUEVA OLA",
    "isClubHome": true,
    "venueName": "Pabellón Polideportivo Sergio Scariolo",
    "matchDate": "2027-04-09T16:30:00.000Z",
    "status": "SCHEDULED",
    "setScores": [],
    "favbMatchUrl": "https://favoley.net/publico/seccion.php?seccion=marcador&id=7420",
    "isFeatured": false,
    "googleMapsUrl": "https://www.google.com/maps/search/?api=1&query=Pabell%C3%B3n%20Polideportivo%20Sergio%20Scariolo"
  }
];

export const FAVB_STANDINGS: Standings[] = [
  {
    "id": "std-cat-senior-fem-1",
    "categoryId": "cat-senior-fem",
    "teamName": "LAS FLORES SEVILLA",
    "isCurrentClub": false,
    "played": 5,
    "won": 5,
    "lost": 0,
    "pg3": 5,
    "pg2": 0,
    "pp1": 0,
    "pp0": 0,
    "setsFor": 15,
    "setsAgainst": 5,
    "setCoef": 3,
    "pointsFor": 472,
    "pointsAgainst": 410,
    "pointCoef": 1.151,
    "points": 15
  },
  {
    "id": "std-cat-senior-fem-2",
    "categoryId": "cat-senior-fem",
    "teamName": "AL-BAYYANA ROQUETAS",
    "isCurrentClub": false,
    "played": 5,
    "won": 4,
    "lost": 1,
    "pg3": 4,
    "pg2": 0,
    "pp1": 0,
    "pp0": 1,
    "setsFor": 13,
    "setsAgainst": 3,
    "setCoef": 4.333,
    "pointsFor": 391,
    "pointsAgainst": 323,
    "pointCoef": 1.211,
    "points": 12
  },
  {
    "id": "std-cat-senior-fem-3",
    "categoryId": "cat-senior-fem",
    "teamName": "3STEVOLEY AIRZONE",
    "isCurrentClub": false,
    "played": 5,
    "won": 4,
    "lost": 1,
    "pg3": 4,
    "pg2": 0,
    "pp1": 0,
    "pp0": 1,
    "setsFor": 12,
    "setsAgainst": 4,
    "setCoef": 3,
    "pointsFor": 383,
    "pointsAgainst": 314,
    "pointCoef": 1.22,
    "points": 12
  },
  {
    "id": "std-cat-senior-fem-4",
    "categoryId": "cat-senior-fem",
    "teamName": "ACADEMIA VC ISONDA",
    "isCurrentClub": false,
    "played": 5,
    "won": 4,
    "lost": 1,
    "pg3": 4,
    "pg2": 0,
    "pp1": 0,
    "pp0": 1,
    "setsFor": 12,
    "setsAgainst": 4,
    "setCoef": 3,
    "pointsFor": 389,
    "pointsAgainst": 331,
    "pointCoef": 1.175,
    "points": 12
  },
  {
    "id": "std-cat-senior-fem-5",
    "categoryId": "cat-senior-fem",
    "teamName": "CDU ATARFE 1AF",
    "isCurrentClub": false,
    "played": 5,
    "won": 3,
    "lost": 2,
    "pg3": 2,
    "pg2": 1,
    "pp1": 0,
    "pp0": 2,
    "setsFor": 11,
    "setsAgainst": 8,
    "setCoef": 1.375,
    "pointsFor": 431,
    "pointsAgainst": 402,
    "pointCoef": 1.072,
    "points": 8
  },
  {
    "id": "std-cat-senior-fem-6",
    "categoryId": "cat-senior-fem",
    "teamName": "FUNDACIÓN CAJASOL ANDALUCÍA 1AF",
    "isCurrentClub": false,
    "played": 6,
    "won": 3,
    "lost": 3,
    "pg3": 2,
    "pg2": 1,
    "pp1": 0,
    "pp0": 3,
    "setsFor": 10,
    "setsAgainst": 11,
    "setCoef": 0.909,
    "pointsFor": 465,
    "pointsAgainst": 434,
    "pointCoef": 1.071,
    "points": 8
  },
  {
    "id": "std-cat-senior-fem-7",
    "categoryId": "cat-senior-fem",
    "teamName": "CV CIUDAD DE MÁLAGA",
    "isCurrentClub": false,
    "played": 6,
    "won": 3,
    "lost": 3,
    "pg3": 2,
    "pg2": 1,
    "pp1": 0,
    "pp0": 3,
    "setsFor": 10,
    "setsAgainst": 12,
    "setCoef": 0.833,
    "pointsFor": 477,
    "pointsAgainst": 489,
    "pointCoef": 0.975,
    "points": 8
  },
  {
    "id": "std-cat-senior-fem-8",
    "categoryId": "cat-senior-fem",
    "teamName": "GRANAVOLEY ESPAGRUAS",
    "isCurrentClub": false,
    "played": 6,
    "won": 2,
    "lost": 4,
    "pg3": 2,
    "pg2": 0,
    "pp1": 2,
    "pp0": 2,
    "setsFor": 11,
    "setsAgainst": 13,
    "setCoef": 0.846,
    "pointsFor": 489,
    "pointsAgainst": 527,
    "pointCoef": 0.928,
    "points": 8
  },
  {
    "id": "std-cat-senior-fem-9",
    "categoryId": "cat-senior-fem",
    "teamName": "VOLEIBOL SAN PEDRO",
    "isCurrentClub": true,
    "played": 6,
    "won": 1,
    "lost": 5,
    "pg3": 1,
    "pg2": 0,
    "pp1": 1,
    "pp0": 4,
    "setsFor": 6,
    "setsAgainst": 15,
    "setCoef": 0.4,
    "pointsFor": 386,
    "pointsAgainst": 475,
    "pointCoef": 0.813,
    "points": 4
  },
  {
    "id": "std-cat-senior-fem-10",
    "categoryId": "cat-senior-fem",
    "teamName": "AKUMAL SPORT NUTRITION CVSA",
    "isCurrentClub": false,
    "played": 5,
    "won": 1,
    "lost": 4,
    "pg3": 1,
    "pg2": 0,
    "pp1": 0,
    "pp0": 4,
    "setsFor": 5,
    "setsAgainst": 13,
    "setCoef": 0.385,
    "pointsFor": 387,
    "pointsAgainst": 430,
    "pointCoef": 0.9,
    "points": 3
  },
  {
    "id": "std-cat-senior-fem-11",
    "categoryId": "cat-senior-fem",
    "teamName": "SIERRA ELVIRA",
    "isCurrentClub": false,
    "played": 6,
    "won": 0,
    "lost": 6,
    "pg3": 0,
    "pg2": 0,
    "pp1": 0,
    "pp0": 6,
    "setsFor": 1,
    "setsAgainst": 18,
    "setCoef": 0.056,
    "pointsFor": 336,
    "pointsAgainst": 471,
    "pointCoef": 0.713,
    "points": 0
  },
  {
    "id": "std-cat-senior-masc-1",
    "categoryId": "cat-senior-masc",
    "teamName": "JUST VOLEY CV A",
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
    "pointsFor": 95,
    "pointsAgainst": 68,
    "pointCoef": 1.397,
    "points": 3
  },
  {
    "id": "std-cat-senior-masc-2",
    "categoryId": "cat-senior-masc",
    "teamName": "FUENGIROLA CV",
    "isCurrentClub": false,
    "played": 1,
    "won": 1,
    "lost": 0,
    "pg3": 0,
    "pg2": 1,
    "pp1": 0,
    "pp0": 0,
    "setsFor": 3,
    "setsAgainst": 2,
    "setCoef": 1.5,
    "pointsFor": 103,
    "pointsAgainst": 82,
    "pointCoef": 1.256,
    "points": 2
  },
  {
    "id": "std-cat-senior-masc-3",
    "categoryId": "cat-senior-masc",
    "teamName": "VOLEIBOL SAN PEDRO",
    "isCurrentClub": true,
    "played": 1,
    "won": 1,
    "lost": 0,
    "pg3": 0,
    "pg2": 1,
    "pp1": 0,
    "pp0": 0,
    "setsFor": 3,
    "setsAgainst": 2,
    "setCoef": 1.5,
    "pointsFor": 110,
    "pointsAgainst": 93,
    "pointCoef": 1.183,
    "points": 2
  },
  {
    "id": "std-cat-senior-masc-4",
    "categoryId": "cat-senior-masc",
    "teamName": "CD VOLEYPLAYA LINENSE 2X2",
    "isCurrentClub": false,
    "played": 1,
    "won": 0,
    "lost": 1,
    "pg3": 0,
    "pg2": 0,
    "pp1": 1,
    "pp0": 0,
    "setsFor": 2,
    "setsAgainst": 3,
    "setCoef": 0.667,
    "pointsFor": 93,
    "pointsAgainst": 110,
    "pointCoef": 0.845,
    "points": 1
  },
  {
    "id": "std-cat-senior-masc-5",
    "categoryId": "cat-senior-masc",
    "teamName": "LA CORACHA B",
    "isCurrentClub": false,
    "played": 1,
    "won": 0,
    "lost": 1,
    "pg3": 0,
    "pg2": 0,
    "pp1": 1,
    "pp0": 0,
    "setsFor": 2,
    "setsAgainst": 3,
    "setCoef": 0.667,
    "pointsFor": 82,
    "pointsAgainst": 103,
    "pointCoef": 0.796,
    "points": 1
  },
  {
    "id": "std-cat-senior-masc-6",
    "categoryId": "cat-senior-masc",
    "teamName": "INTER PLAYAS",
    "isCurrentClub": false,
    "played": 1,
    "won": 0,
    "lost": 1,
    "pg3": 0,
    "pg2": 0,
    "pp1": 0,
    "pp0": 1,
    "setsFor": 1,
    "setsAgainst": 3,
    "setCoef": 0.333,
    "pointsFor": 68,
    "pointsAgainst": 95,
    "pointCoef": 0.716,
    "points": 0
  },
  {
    "id": "std-cat-senior-masc-7",
    "categoryId": "cat-senior-masc",
    "teamName": "CARTAMA",
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
    "id": "std-cat-juvenil-masc-1",
    "categoryId": "cat-juvenil-masc",
    "teamName": "CARTAMA",
    "isCurrentClub": false,
    "played": 4,
    "won": 3,
    "lost": 1,
    "pg3": 3,
    "pg2": 0,
    "pp1": 0,
    "pp0": 1,
    "setsFor": 9,
    "setsAgainst": 3,
    "setCoef": 3,
    "pointsFor": 281,
    "pointsAgainst": 225,
    "pointCoef": 1.249,
    "points": 9
  },
  {
    "id": "std-cat-juvenil-masc-2",
    "categoryId": "cat-juvenil-masc",
    "teamName": "UDA BENALMADENA",
    "isCurrentClub": false,
    "played": 4,
    "won": 3,
    "lost": 1,
    "pg3": 3,
    "pg2": 0,
    "pp1": 0,
    "pp0": 1,
    "setsFor": 10,
    "setsAgainst": 4,
    "setCoef": 2.5,
    "pointsFor": 333,
    "pointsAgainst": 271,
    "pointCoef": 1.229,
    "points": 9
  },
  {
    "id": "std-cat-juvenil-masc-3",
    "categoryId": "cat-juvenil-masc",
    "teamName": "INTER PLAYAS",
    "isCurrentClub": false,
    "played": 4,
    "won": 3,
    "lost": 1,
    "pg3": 3,
    "pg2": 0,
    "pp1": 0,
    "pp0": 1,
    "setsFor": 9,
    "setsAgainst": 4,
    "setCoef": 2.25,
    "pointsFor": 310,
    "pointsAgainst": 256,
    "pointCoef": 1.211,
    "points": 9
  },
  {
    "id": "std-cat-juvenil-masc-4",
    "categoryId": "cat-juvenil-masc",
    "teamName": "FUENGIROLA CV A",
    "isCurrentClub": false,
    "played": 4,
    "won": 1,
    "lost": 3,
    "pg3": 1,
    "pg2": 0,
    "pp1": 0,
    "pp0": 3,
    "setsFor": 4,
    "setsAgainst": 10,
    "setCoef": 0.4,
    "pointsFor": 262,
    "pointsAgainst": 329,
    "pointCoef": 0.796,
    "points": 3
  },
  {
    "id": "std-cat-juvenil-masc-5",
    "categoryId": "cat-juvenil-masc",
    "teamName": "VOLEIBOL SAN PEDRO",
    "isCurrentClub": true,
    "played": 4,
    "won": 0,
    "lost": 4,
    "pg3": 0,
    "pg2": 0,
    "pp1": 0,
    "pp0": 4,
    "setsFor": 1,
    "setsAgainst": 12,
    "setCoef": 0.083,
    "pointsFor": 214,
    "pointsAgainst": 319,
    "pointCoef": 0.671,
    "points": 0
  },
  {
    "id": "std-cat-juvenil-fem-rojo-1",
    "categoryId": "cat-juvenil-fem-rojo",
    "teamName": "CARTAMA AZUL",
    "isCurrentClub": false,
    "played": 5,
    "won": 5,
    "lost": 0,
    "pg3": 5,
    "pg2": 0,
    "pp1": 0,
    "pp0": 0,
    "setsFor": 15,
    "setsAgainst": 1,
    "setCoef": 15,
    "pointsFor": 397,
    "pointsAgainst": 211,
    "pointCoef": 1.882,
    "points": 15
  },
  {
    "id": "std-cat-juvenil-fem-rojo-2",
    "categoryId": "cat-juvenil-fem-rojo",
    "teamName": "COSTA DEL VOLEY ROSA",
    "isCurrentClub": false,
    "played": 5,
    "won": 4,
    "lost": 1,
    "pg3": 4,
    "pg2": 0,
    "pp1": 0,
    "pp0": 1,
    "setsFor": 13,
    "setsAgainst": 3,
    "setCoef": 4.333,
    "pointsFor": 369,
    "pointsAgainst": 329,
    "pointCoef": 1.122,
    "points": 12
  },
  {
    "id": "std-cat-juvenil-fem-rojo-3",
    "categoryId": "cat-juvenil-fem-rojo",
    "teamName": "INTER PLAYAS A",
    "isCurrentClub": false,
    "played": 5,
    "won": 3,
    "lost": 2,
    "pg3": 3,
    "pg2": 0,
    "pp1": 0,
    "pp0": 2,
    "setsFor": 9,
    "setsAgainst": 6,
    "setCoef": 1.5,
    "pointsFor": 328,
    "pointsAgainst": 307,
    "pointCoef": 1.068,
    "points": 9
  },
  {
    "id": "std-cat-juvenil-fem-rojo-4",
    "categoryId": "cat-juvenil-fem-rojo",
    "teamName": "VOLEIBOL SAN PEDRO ROJO",
    "isCurrentClub": true,
    "played": 5,
    "won": 2,
    "lost": 3,
    "pg3": 1,
    "pg2": 1,
    "pp1": 0,
    "pp0": 3,
    "setsFor": 6,
    "setsAgainst": 12,
    "setCoef": 0.5,
    "pointsFor": 368,
    "pointsAgainst": 398,
    "pointCoef": 0.925,
    "points": 5
  },
  {
    "id": "std-cat-juvenil-fem-rojo-5",
    "categoryId": "cat-juvenil-fem-rojo",
    "teamName": "NUEVA OLA",
    "isCurrentClub": false,
    "played": 5,
    "won": 1,
    "lost": 4,
    "pg3": 0,
    "pg2": 1,
    "pp1": 1,
    "pp0": 3,
    "setsFor": 5,
    "setsAgainst": 14,
    "setCoef": 0.357,
    "pointsFor": 348,
    "pointsAgainst": 435,
    "pointCoef": 0.8,
    "points": 3
  },
  {
    "id": "std-cat-juvenil-fem-rojo-6",
    "categoryId": "cat-juvenil-fem-rojo",
    "teamName": "LA VEGA VOLEY",
    "isCurrentClub": false,
    "played": 5,
    "won": 0,
    "lost": 5,
    "pg3": 0,
    "pg2": 0,
    "pp1": 1,
    "pp0": 4,
    "setsFor": 3,
    "setsAgainst": 15,
    "setCoef": 0.2,
    "pointsFor": 292,
    "pointsAgainst": 422,
    "pointCoef": 0.692,
    "points": 1
  },
  {
    "id": "std-cat-juvenil-fem-negro-1",
    "categoryId": "cat-juvenil-fem-negro",
    "teamName": "INTER PLAYAS C",
    "isCurrentClub": false,
    "played": 2,
    "won": 2,
    "lost": 0,
    "pg3": 1,
    "pg2": 1,
    "pp1": 0,
    "pp0": 0,
    "setsFor": 6,
    "setsAgainst": 2,
    "setCoef": 3,
    "pointsFor": 182,
    "pointsAgainst": 150,
    "pointCoef": 1.213,
    "points": 5
  },
  {
    "id": "std-cat-juvenil-fem-negro-2",
    "categoryId": "cat-juvenil-fem-negro",
    "teamName": "3STEVOLEY B",
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
    "setCoef": 0,
    "pointsFor": 75,
    "pointsAgainst": 65,
    "pointCoef": 1.154,
    "points": 3
  },
  {
    "id": "std-cat-juvenil-fem-negro-3",
    "categoryId": "cat-juvenil-fem-negro",
    "teamName": "ALHAURÍN DE LA TORRE",
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
    "pointsFor": 100,
    "pointsAgainst": 88,
    "pointCoef": 1.136,
    "points": 3
  },
  {
    "id": "std-cat-juvenil-fem-negro-4",
    "categoryId": "cat-juvenil-fem-negro",
    "teamName": "CEV JUVENIL",
    "isCurrentClub": false,
    "played": 2,
    "won": 1,
    "lost": 1,
    "pg3": 1,
    "pg2": 0,
    "pp1": 0,
    "pp0": 1,
    "setsFor": 3,
    "setsAgainst": 3,
    "setCoef": 1,
    "pointsFor": 140,
    "pointsAgainst": 100,
    "pointCoef": 1.4,
    "points": 3
  },
  {
    "id": "std-cat-juvenil-fem-negro-5",
    "categoryId": "cat-juvenil-fem-negro",
    "teamName": "VOLEIBOL SAN PEDRO NEGRO",
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
    "pointsAgainst": 177,
    "pointCoef": 0.983,
    "points": 3
  },
  {
    "id": "std-cat-juvenil-fem-negro-6",
    "categoryId": "cat-juvenil-fem-negro",
    "teamName": "FUENGIROLA CV B",
    "isCurrentClub": false,
    "played": 2,
    "won": 0,
    "lost": 2,
    "pg3": 0,
    "pg2": 0,
    "pp1": 1,
    "pp0": 1,
    "setsFor": 3,
    "setsAgainst": 6,
    "setCoef": 0.5,
    "pointsFor": 172,
    "pointsAgainst": 193,
    "pointCoef": 0.891,
    "points": 1
  },
  {
    "id": "std-cat-juvenil-fem-negro-7",
    "categoryId": "cat-juvenil-fem-negro",
    "teamName": "LA CORACHA",
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
    "pointsFor": 80,
    "pointsAgainst": 150,
    "pointCoef": 0.533,
    "points": 0
  },
  {
    "id": "std-cat-cadete-masc-1",
    "categoryId": "cat-cadete-masc",
    "teamName": "ALHAURÍN DE LA TORRE A",
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
    "setCoef": 0,
    "pointsFor": 150,
    "pointsAgainst": 98,
    "pointCoef": 1.531,
    "points": 6
  },
  {
    "id": "std-cat-cadete-masc-2",
    "categoryId": "cat-cadete-masc",
    "teamName": "3STEVOLEY",
    "isCurrentClub": false,
    "played": 2,
    "won": 2,
    "lost": 0,
    "pg3": 1,
    "pg2": 1,
    "pp1": 0,
    "pp0": 0,
    "setsFor": 6,
    "setsAgainst": 2,
    "setCoef": 3,
    "pointsFor": 182,
    "pointsAgainst": 155,
    "pointCoef": 1.174,
    "points": 5
  },
  {
    "id": "std-cat-cadete-masc-3",
    "categoryId": "cat-cadete-masc",
    "teamName": "CV PIZARRA LA FUENSANTA",
    "isCurrentClub": false,
    "played": 2,
    "won": 1,
    "lost": 1,
    "pg3": 1,
    "pg2": 0,
    "pp1": 1,
    "pp0": 0,
    "setsFor": 5,
    "setsAgainst": 3,
    "setCoef": 1.667,
    "pointsFor": 173,
    "pointsAgainst": 163,
    "pointCoef": 1.061,
    "points": 4
  },
  {
    "id": "std-cat-cadete-masc-4",
    "categoryId": "cat-cadete-masc",
    "teamName": "UDA BENALMADENA",
    "isCurrentClub": false,
    "played": 2,
    "won": 1,
    "lost": 1,
    "pg3": 1,
    "pg2": 0,
    "pp1": 0,
    "pp0": 1,
    "setsFor": 3,
    "setsAgainst": 4,
    "setCoef": 0.75,
    "pointsFor": 153,
    "pointsAgainst": 162,
    "pointCoef": 0.944,
    "points": 3
  },
  {
    "id": "std-cat-cadete-masc-5",
    "categoryId": "cat-cadete-masc",
    "teamName": "UNION MALAGUEÑA",
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
    "pointsFor": 129,
    "pointsAgainst": 172,
    "pointCoef": 0.75,
    "points": 0
  },
  {
    "id": "std-cat-cadete-masc-6",
    "categoryId": "cat-cadete-masc",
    "teamName": "VOLEIBOL SAN PEDRO",
    "isCurrentClub": true,
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
    "pointsFor": 113,
    "pointsAgainst": 150,
    "pointCoef": 0.753,
    "points": 0
  },
  {
    "id": "std-cat-cadete-fem-rojo-1",
    "categoryId": "cat-cadete-fem-rojo",
    "teamName": "CARTAMA BLANCO",
    "isCurrentClub": false,
    "played": 3,
    "won": 2,
    "lost": 1,
    "pg3": 2,
    "pg2": 0,
    "pp1": 1,
    "pp0": 0,
    "setsFor": 8,
    "setsAgainst": 3,
    "setCoef": 2.667,
    "pointsFor": 255,
    "pointsAgainst": 178,
    "pointCoef": 1.433,
    "points": 7
  },
  {
    "id": "std-cat-cadete-fem-rojo-2",
    "categoryId": "cat-cadete-fem-rojo",
    "teamName": "CV PIZARRA LA FUENSANTA",
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
    "setCoef": 0,
    "pointsFor": 150,
    "pointsAgainst": 113,
    "pointCoef": 1.327,
    "points": 6
  },
  {
    "id": "std-cat-cadete-fem-rojo-3",
    "categoryId": "cat-cadete-fem-rojo",
    "teamName": "FUENGIROLA CV A",
    "isCurrentClub": false,
    "played": 2,
    "won": 2,
    "lost": 0,
    "pg3": 1,
    "pg2": 1,
    "pp1": 0,
    "pp0": 0,
    "setsFor": 6,
    "setsAgainst": 2,
    "setCoef": 3,
    "pointsFor": 184,
    "pointsAgainst": 152,
    "pointCoef": 1.211,
    "points": 5
  },
  {
    "id": "std-cat-cadete-fem-rojo-4",
    "categoryId": "cat-cadete-fem-rojo",
    "teamName": "UDA BENALMADENA A",
    "isCurrentClub": false,
    "played": 3,
    "won": 1,
    "lost": 2,
    "pg3": 1,
    "pg2": 0,
    "pp1": 1,
    "pp0": 1,
    "setsFor": 5,
    "setsAgainst": 7,
    "setCoef": 0.714,
    "pointsFor": 245,
    "pointsAgainst": 266,
    "pointCoef": 0.921,
    "points": 4
  },
  {
    "id": "std-cat-cadete-fem-rojo-5",
    "categoryId": "cat-cadete-fem-rojo",
    "teamName": "VOLEIBOL SAN PEDRO ROJO",
    "isCurrentClub": true,
    "played": 3,
    "won": 1,
    "lost": 2,
    "pg3": 1,
    "pg2": 0,
    "pp1": 0,
    "pp0": 2,
    "setsFor": 4,
    "setsAgainst": 6,
    "setCoef": 0.667,
    "pointsFor": 221,
    "pointsAgainst": 214,
    "pointCoef": 1.033,
    "points": 3
  },
  {
    "id": "std-cat-cadete-fem-rojo-6",
    "categoryId": "cat-cadete-fem-rojo",
    "teamName": "3STEVOLEY A",
    "isCurrentClub": false,
    "played": 2,
    "won": 1,
    "lost": 1,
    "pg3": 0,
    "pg2": 1,
    "pp1": 0,
    "pp0": 1,
    "setsFor": 3,
    "setsAgainst": 5,
    "setCoef": 0.6,
    "pointsFor": 164,
    "pointsAgainst": 180,
    "pointCoef": 0.911,
    "points": 2
  },
  {
    "id": "std-cat-cadete-fem-rojo-7",
    "categoryId": "cat-cadete-fem-rojo",
    "teamName": "NUEVA OLA A",
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
    "pointsFor": 109,
    "pointsAgainst": 225,
    "pointCoef": 0.484,
    "points": 0
  },
  {
    "id": "std-cat-cadete-fem-negro-1",
    "categoryId": "cat-cadete-fem-negro",
    "teamName": "CADETE BLANCO",
    "isCurrentClub": false,
    "played": 2,
    "won": 2,
    "lost": 0,
    "pg3": 1,
    "pg2": 1,
    "pp1": 0,
    "pp0": 0,
    "setsFor": 6,
    "setsAgainst": 2,
    "setCoef": 3,
    "pointsFor": 180,
    "pointsAgainst": 129,
    "pointCoef": 1.395,
    "points": 5
  },
  {
    "id": "std-cat-cadete-fem-negro-2",
    "categoryId": "cat-cadete-fem-negro",
    "teamName": "C.V. CIUDAD DE MÁLAGA",
    "isCurrentClub": false,
    "played": 2,
    "won": 2,
    "lost": 0,
    "pg3": 1,
    "pg2": 1,
    "pp1": 0,
    "pp0": 0,
    "setsFor": 6,
    "setsAgainst": 2,
    "setCoef": 3,
    "pointsFor": 179,
    "pointsAgainst": 155,
    "pointCoef": 1.155,
    "points": 5
  },
  {
    "id": "std-cat-cadete-fem-negro-3",
    "categoryId": "cat-cadete-fem-negro",
    "teamName": "LA CORACHA",
    "isCurrentClub": false,
    "played": 2,
    "won": 1,
    "lost": 1,
    "pg3": 1,
    "pg2": 0,
    "pp1": 1,
    "pp0": 0,
    "setsFor": 5,
    "setsAgainst": 3,
    "setCoef": 1.667,
    "pointsFor": 160,
    "pointsAgainst": 134,
    "pointCoef": 1.194,
    "points": 4
  },
  {
    "id": "std-cat-cadete-fem-negro-4",
    "categoryId": "cat-cadete-fem-negro",
    "teamName": "VOLEIBOL SAN PEDRO NEGRO",
    "isCurrentClub": true,
    "played": 2,
    "won": 1,
    "lost": 1,
    "pg3": 1,
    "pg2": 0,
    "pp1": 1,
    "pp0": 0,
    "setsFor": 5,
    "setsAgainst": 3,
    "setCoef": 1.667,
    "pointsFor": 175,
    "pointsAgainst": 164,
    "pointCoef": 1.067,
    "points": 4
  },
  {
    "id": "std-cat-cadete-fem-negro-5",
    "categoryId": "cat-cadete-fem-negro",
    "teamName": "SOHO MALAGA",
    "isCurrentClub": false,
    "played": 2,
    "won": 1,
    "lost": 1,
    "pg3": 1,
    "pg2": 0,
    "pp1": 0,
    "pp0": 1,
    "setsFor": 3,
    "setsAgainst": 3,
    "setCoef": 1,
    "pointsFor": 130,
    "pointsAgainst": 122,
    "pointCoef": 1.066,
    "points": 3
  },
  {
    "id": "std-cat-cadete-fem-negro-6",
    "categoryId": "cat-cadete-fem-negro",
    "teamName": "FUENGIROLA CV D",
    "isCurrentClub": false,
    "played": 2,
    "won": 1,
    "lost": 1,
    "pg3": 1,
    "pg2": 0,
    "pp1": 0,
    "pp0": 1,
    "setsFor": 3,
    "setsAgainst": 3,
    "setCoef": 1,
    "pointsFor": 122,
    "pointsAgainst": 115,
    "pointCoef": 1.061,
    "points": 3
  },
  {
    "id": "std-cat-cadete-fem-negro-7",
    "categoryId": "cat-cadete-fem-negro",
    "teamName": "3STEVOLEY C",
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
    "pointsFor": 104,
    "pointsAgainst": 150,
    "pointCoef": 0.693,
    "points": 0
  },
  {
    "id": "std-cat-cadete-fem-negro-8",
    "categoryId": "cat-cadete-fem-negro",
    "teamName": "INTER PLAYAS B",
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
    "pointsFor": 69,
    "pointsAgainst": 150,
    "pointCoef": 0.46,
    "points": 0
  },
  {
    "id": "std-cat-infantil-masc-1",
    "categoryId": "cat-infantil-masc",
    "teamName": "ALHAURÍN DE LA TORRE",
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
    "setCoef": 0,
    "pointsFor": 300,
    "pointsAgainst": 148,
    "pointCoef": 2.027,
    "points": 12
  },
  {
    "id": "std-cat-infantil-masc-2",
    "categoryId": "cat-infantil-masc",
    "teamName": "CARTAMA",
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
    "pointsFor": 248,
    "pointsAgainst": 163,
    "pointCoef": 1.521,
    "points": 9
  },
  {
    "id": "std-cat-infantil-masc-3",
    "categoryId": "cat-infantil-masc",
    "teamName": "CV PIZARRA LA FUENSANTA AZUL",
    "isCurrentClub": false,
    "played": 4,
    "won": 3,
    "lost": 1,
    "pg3": 3,
    "pg2": 0,
    "pp1": 0,
    "pp0": 1,
    "setsFor": 10,
    "setsAgainst": 4,
    "setCoef": 2.5,
    "pointsFor": 323,
    "pointsAgainst": 238,
    "pointCoef": 1.357,
    "points": 9
  },
  {
    "id": "std-cat-infantil-masc-4",
    "categoryId": "cat-infantil-masc",
    "teamName": "FUENGIROLA CV",
    "isCurrentClub": false,
    "played": 4,
    "won": 2,
    "lost": 2,
    "pg3": 2,
    "pg2": 0,
    "pp1": 2,
    "pp0": 0,
    "setsFor": 10,
    "setsAgainst": 8,
    "setCoef": 1.25,
    "pointsFor": 384,
    "pointsAgainst": 348,
    "pointCoef": 1.103,
    "points": 8
  },
  {
    "id": "std-cat-infantil-masc-5",
    "categoryId": "cat-infantil-masc",
    "teamName": "COSTA DEL VOLEY",
    "isCurrentClub": false,
    "played": 4,
    "won": 3,
    "lost": 1,
    "pg3": 1,
    "pg2": 2,
    "pp1": 0,
    "pp0": 1,
    "setsFor": 9,
    "setsAgainst": 7,
    "setCoef": 1.286,
    "pointsFor": 344,
    "pointsAgainst": 326,
    "pointCoef": 1.055,
    "points": 7
  },
  {
    "id": "std-cat-infantil-masc-6",
    "categoryId": "cat-infantil-masc",
    "teamName": "NUEVA OLA",
    "isCurrentClub": false,
    "played": 4,
    "won": 2,
    "lost": 2,
    "pg3": 1,
    "pg2": 1,
    "pp1": 0,
    "pp0": 2,
    "setsFor": 7,
    "setsAgainst": 8,
    "setCoef": 0.875,
    "pointsFor": 306,
    "pointsAgainst": 313,
    "pointCoef": 0.978,
    "points": 5
  },
  {
    "id": "std-cat-infantil-masc-7",
    "categoryId": "cat-infantil-masc",
    "teamName": "UDA BENALMADENA A",
    "isCurrentClub": false,
    "played": 4,
    "won": 1,
    "lost": 3,
    "pg3": 1,
    "pg2": 0,
    "pp1": 1,
    "pp0": 2,
    "setsFor": 5,
    "setsAgainst": 9,
    "setCoef": 0.556,
    "pointsFor": 272,
    "pointsAgainst": 303,
    "pointCoef": 0.898,
    "points": 4
  },
  {
    "id": "std-cat-infantil-masc-8",
    "categoryId": "cat-infantil-masc",
    "teamName": "VOLEIBOL SAN PEDRO",
    "isCurrentClub": true,
    "played": 4,
    "won": 1,
    "lost": 3,
    "pg3": 1,
    "pg2": 0,
    "pp1": 0,
    "pp0": 3,
    "setsFor": 3,
    "setsAgainst": 9,
    "setCoef": 0.333,
    "pointsFor": 198,
    "pointsAgainst": 284,
    "pointCoef": 0.697,
    "points": 3
  },
  {
    "id": "std-cat-infantil-masc-9",
    "categoryId": "cat-infantil-masc",
    "teamName": "3STEVOLEY",
    "isCurrentClub": false,
    "played": 3,
    "won": 0,
    "lost": 3,
    "pg3": 0,
    "pg2": 0,
    "pp1": 0,
    "pp0": 3,
    "setsFor": 1,
    "setsAgainst": 9,
    "setCoef": 0.111,
    "pointsFor": 166,
    "pointsAgainst": 249,
    "pointCoef": 0.667,
    "points": 0
  },
  {
    "id": "std-cat-infantil-masc-10",
    "categoryId": "cat-infantil-masc",
    "teamName": "CV PIZARRA LA FUENSANTA BLANCO",
    "isCurrentClub": false,
    "played": 4,
    "won": 0,
    "lost": 4,
    "pg3": 0,
    "pg2": 0,
    "pp1": 0,
    "pp0": 4,
    "setsFor": 1,
    "setsAgainst": 12,
    "setCoef": 0.083,
    "pointsFor": 152,
    "pointsAgainst": 321,
    "pointCoef": 0.474,
    "points": 0
  },
  {
    "id": "std-cat-infantil-fem-rojo-1",
    "categoryId": "cat-infantil-fem-rojo",
    "teamName": "CARTAMA",
    "isCurrentClub": false,
    "played": 3,
    "won": 3,
    "lost": 0,
    "pg3": 3,
    "pg2": 0,
    "pp1": 0,
    "pp0": 0,
    "setsFor": 9,
    "setsAgainst": 0,
    "setCoef": 0,
    "pointsFor": 225,
    "pointsAgainst": 106,
    "pointCoef": 2.123,
    "points": 9
  },
  {
    "id": "std-cat-infantil-fem-rojo-2",
    "categoryId": "cat-infantil-fem-rojo",
    "teamName": "3STEVOLEY A",
    "isCurrentClub": false,
    "played": 3,
    "won": 3,
    "lost": 0,
    "pg3": 2,
    "pg2": 1,
    "pp1": 0,
    "pp0": 0,
    "setsFor": 9,
    "setsAgainst": 2,
    "setCoef": 4.5,
    "pointsFor": 250,
    "pointsAgainst": 179,
    "pointCoef": 1.397,
    "points": 8
  },
  {
    "id": "std-cat-infantil-fem-rojo-3",
    "categoryId": "cat-infantil-fem-rojo",
    "teamName": "COSTA DEL VOLEY ROSA (ORO)",
    "isCurrentClub": false,
    "played": 3,
    "won": 2,
    "lost": 1,
    "pg3": 2,
    "pg2": 0,
    "pp1": 0,
    "pp0": 1,
    "setsFor": 6,
    "setsAgainst": 3,
    "setCoef": 2,
    "pointsFor": 207,
    "pointsAgainst": 155,
    "pointCoef": 1.335,
    "points": 6
  },
  {
    "id": "std-cat-infantil-fem-rojo-4",
    "categoryId": "cat-infantil-fem-rojo",
    "teamName": "VOLEIBOL SAN PEDRO ROJO",
    "isCurrentClub": true,
    "played": 3,
    "won": 1,
    "lost": 2,
    "pg3": 1,
    "pg2": 0,
    "pp1": 1,
    "pp0": 1,
    "setsFor": 5,
    "setsAgainst": 6,
    "setCoef": 0.833,
    "pointsFor": 223,
    "pointsAgainst": 204,
    "pointCoef": 1.093,
    "points": 4
  },
  {
    "id": "std-cat-infantil-fem-rojo-5",
    "categoryId": "cat-infantil-fem-rojo",
    "teamName": "UNION MALAGUEÑA",
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
    "pointsFor": 104,
    "pointsAgainst": 225,
    "pointCoef": 0.462,
    "points": 0
  },
  {
    "id": "std-cat-infantil-fem-rojo-6",
    "categoryId": "cat-infantil-fem-rojo",
    "teamName": "FORVOLEY TORREMOLINOS",
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
    "pointsFor": 85,
    "pointsAgainst": 225,
    "pointCoef": 0.378,
    "points": 0
  },
  {
    "id": "std-cat-infantil-fem-negro-1",
    "categoryId": "cat-infantil-fem-negro",
    "teamName": "FUENGIROLA CV A",
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
    "setCoef": 0,
    "pointsFor": 150,
    "pointsAgainst": 72,
    "pointCoef": 2.083,
    "points": 6
  },
  {
    "id": "std-cat-infantil-fem-negro-2",
    "categoryId": "cat-infantil-fem-negro",
    "teamName": "MIJAS VOLEY AZUL",
    "isCurrentClub": false,
    "played": 2,
    "won": 2,
    "lost": 0,
    "pg3": 2,
    "pg2": 0,
    "pp1": 0,
    "pp0": 0,
    "setsFor": 6,
    "setsAgainst": 2,
    "setCoef": 3,
    "pointsFor": 196,
    "pointsAgainst": 137,
    "pointCoef": 1.431,
    "points": 6
  },
  {
    "id": "std-cat-infantil-fem-negro-3",
    "categoryId": "cat-infantil-fem-negro",
    "teamName": "CV PIZARRA LA FUENSANTA AZUL",
    "isCurrentClub": false,
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
    "pointsFor": 165,
    "pointsAgainst": 174,
    "pointCoef": 0.948,
    "points": 3
  },
  {
    "id": "std-cat-infantil-fem-negro-4",
    "categoryId": "cat-infantil-fem-negro",
    "teamName": "UDA BENALMADENA A",
    "isCurrentClub": false,
    "played": 3,
    "won": 1,
    "lost": 2,
    "pg3": 0,
    "pg2": 1,
    "pp1": 0,
    "pp0": 2,
    "setsFor": 4,
    "setsAgainst": 8,
    "setCoef": 0.5,
    "pointsFor": 197,
    "pointsAgainst": 277,
    "pointCoef": 0.711,
    "points": 2
  },
  {
    "id": "std-cat-infantil-fem-negro-5",
    "categoryId": "cat-infantil-fem-negro",
    "teamName": "VOLEIBOL SAN PEDRO NEGRO",
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
    "pointsFor": 219,
    "pointsAgainst": 267,
    "pointCoef": 0.82,
    "points": 1
  },
  {
    "id": "std-cat-infantil-fem-blanco-1",
    "categoryId": "cat-infantil-fem-blanco",
    "teamName": "CV PIZARRA LA FUENSANTA BLANCO",
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
    "setCoef": 0,
    "pointsFor": 150,
    "pointsAgainst": 58,
    "pointCoef": 2.586,
    "points": 6
  },
  {
    "id": "std-cat-infantil-fem-blanco-2",
    "categoryId": "cat-infantil-fem-blanco",
    "teamName": "AD ASUNCIÓN",
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
    "setCoef": 0,
    "pointsFor": 150,
    "pointsAgainst": 91,
    "pointCoef": 1.648,
    "points": 6
  },
  {
    "id": "std-cat-infantil-fem-blanco-3",
    "categoryId": "cat-infantil-fem-blanco",
    "teamName": "INFANTIL BLANCO",
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
    "pointsFor": 173,
    "pointsAgainst": 112,
    "pointCoef": 1.545,
    "points": 6
  },
  {
    "id": "std-cat-infantil-fem-blanco-4",
    "categoryId": "cat-infantil-fem-blanco",
    "teamName": "ALHAURÍN DE LA TORRE",
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
    "setCoef": 0,
    "pointsFor": 75,
    "pointsAgainst": 47,
    "pointCoef": 1.596,
    "points": 3
  },
  {
    "id": "std-cat-infantil-fem-blanco-5",
    "categoryId": "cat-infantil-fem-blanco",
    "teamName": "LA VEGA",
    "isCurrentClub": false,
    "played": 2,
    "won": 1,
    "lost": 1,
    "pg3": 1,
    "pg2": 0,
    "pp1": 0,
    "pp0": 1,
    "setsFor": 3,
    "setsAgainst": 3,
    "setCoef": 1,
    "pointsFor": 126,
    "pointsAgainst": 142,
    "pointCoef": 0.887,
    "points": 3
  },
  {
    "id": "std-cat-infantil-fem-blanco-6",
    "categoryId": "cat-infantil-fem-blanco",
    "teamName": "CLUB NERJA ATLETISMO",
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
    "pointsFor": 150,
    "pointsAgainst": 177,
    "pointCoef": 0.847,
    "points": 0
  },
  {
    "id": "std-cat-infantil-fem-blanco-7",
    "categoryId": "cat-infantil-fem-blanco",
    "teamName": "VOLEIBOL SAN PEDRO BLANCO",
    "isCurrentClub": true,
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
    "pointsFor": 42,
    "pointsAgainst": 75,
    "pointCoef": 0.56,
    "points": 0
  },
  {
    "id": "std-cat-infantil-fem-blanco-8",
    "categoryId": "cat-infantil-fem-blanco",
    "teamName": "INTER PLAYAS",
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
    "pointsFor": 79,
    "pointsAgainst": 150,
    "pointCoef": 0.527,
    "points": 0
  },
  {
    "id": "std-cat-infantil-fem-blanco-9",
    "categoryId": "cat-infantil-fem-blanco",
    "teamName": "EMV ALH.GRANDE",
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
    "pointsFor": 57,
    "pointsAgainst": 150,
    "pointCoef": 0.38,
    "points": 0
  },
  {
    "id": "std-cat-infantil-fem-gris-1",
    "categoryId": "cat-infantil-fem-gris",
    "teamName": "EMV ALHAURIN EL GRANDE ROJO",
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
    "pointsFor": 174,
    "pointsAgainst": 85,
    "pointCoef": 2.047,
    "points": 6
  },
  {
    "id": "std-cat-infantil-fem-gris-2",
    "categoryId": "cat-infantil-fem-gris",
    "teamName": "FUENGIROLA CV B",
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
    "pointsFor": 167,
    "pointsAgainst": 104,
    "pointCoef": 1.606,
    "points": 6
  },
  {
    "id": "std-cat-infantil-fem-gris-3",
    "categoryId": "cat-infantil-fem-gris",
    "teamName": "3STEVOLEY B",
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
    "pointsFor": 168,
    "pointsAgainst": 133,
    "pointCoef": 1.263,
    "points": 6
  },
  {
    "id": "std-cat-infantil-fem-gris-4",
    "categoryId": "cat-infantil-fem-gris",
    "teamName": "COSTA DEL VOLEY NEGRO",
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
    "pointsFor": 98,
    "pointsAgainst": 76,
    "pointCoef": 1.289,
    "points": 3
  },
  {
    "id": "std-cat-infantil-fem-gris-5",
    "categoryId": "cat-infantil-fem-gris",
    "teamName": "MIJAS VOLEY BLANCO",
    "isCurrentClub": false,
    "played": 2,
    "won": 1,
    "lost": 1,
    "pg3": 1,
    "pg2": 0,
    "pp1": 0,
    "pp0": 1,
    "setsFor": 4,
    "setsAgainst": 3,
    "setCoef": 1.333,
    "pointsFor": 141,
    "pointsAgainst": 143,
    "pointCoef": 0.986,
    "points": 3
  },
  {
    "id": "std-cat-infantil-fem-gris-6",
    "categoryId": "cat-infantil-fem-gris",
    "teamName": "VOLEIBOL SAN PEDRO GRIS",
    "isCurrentClub": true,
    "played": 1,
    "won": 0,
    "lost": 1,
    "pg3": 0,
    "pg2": 0,
    "pp1": 0,
    "pp0": 1,
    "setsFor": 1,
    "setsAgainst": 3,
    "setCoef": 0.333,
    "pointsFor": 83,
    "pointsAgainst": 91,
    "pointCoef": 0.912,
    "points": 0
  },
  {
    "id": "std-cat-infantil-fem-gris-7",
    "categoryId": "cat-infantil-fem-gris",
    "teamName": "INFANTIL NEGRO",
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
    "pointsFor": 108,
    "pointsAgainst": 168,
    "pointCoef": 0.643,
    "points": 0
  },
  {
    "id": "std-cat-infantil-fem-gris-8",
    "categoryId": "cat-infantil-fem-gris",
    "teamName": "UDA BENALMADENA B",
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
    "pointsFor": 96,
    "pointsAgainst": 173,
    "pointCoef": 0.555,
    "points": 0
  },
  {
    "id": "std-cat-infantil-fem-gris-9",
    "categoryId": "cat-infantil-fem-gris",
    "teamName": "NUEVA OLA",
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
    "pointsFor": 90,
    "pointsAgainst": 152,
    "pointCoef": 0.592,
    "points": 0
  }
];
