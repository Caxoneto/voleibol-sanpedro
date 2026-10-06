import {
  Category,
  Team,
  Player,
  Staff,
  Match,
  Standings,
  Article,
  SponsorTier,
  SponsorInquiry,
  FanVote,
  Chant,
  WallpaperDownload,
  PressAccreditation,
  NewsletterSubscriber,
  ClubInfo,
} from './types';

export const CLUB_INFO: ClubInfo = {
  name: 'C.D. Voleibol San Pedro',
  shortName: 'CDV San Pedro',
  city: 'San Pedro Alcántara, Marbella',
  region: 'Málaga, Andalucía',
  venueName: 'Pabellón Polideportivo Sergio Scariolo',
  venueAddress: 'C/ Fuente Nueva, s/n, 29670 San Pedro Alcántara (Málaga)',
  venueMapsUrl: 'https://maps.google.com/?q=Pabellon+Polideportivo+Sergio+Scariolo+San+Pedro+Alcantara',
  federationName: 'Federación Andaluza de Voleibol (FAVB)',
  federationUrl: 'https://favoley.net/publico/index.php',
  contactEmail: 'info@cdvoleibolsanpedro.es',
  contactPhone: '+34 952 78 50 12',
  whatsappUrl: 'https://wa.me/34622112233?text=Hola%2C%20me%20gustar%C3%ADa%20informaci%C3%B3n%20sobre%20el%20C.D.%20Voleibol%20San%20Pedro',
  socialHashtag: '#VoleibolSanPedro',
  motto: 'Pasión, cantera y orgullo sampedreño',
};

// Categorías del club: Senior Masculino (mayores) + 8 categorías de cantera oficiales de la FAVB
export const INITIAL_CATEGORIES: Category[] = [
  // Mayores (solo masculino)
  { id: 'cat-senior-masc-a', name: 'Senior Masculino A', slug: 'senior-masculino-a', order: 1, description: '1ª División Andaluza Senior Masculina' },
  { id: 'cat-senior-masc-b', name: 'Senior Masculino B', slug: 'senior-masculino-b', order: 2, description: 'Liga Provincial Senior Málaga' },
  // Cantera según Captura 1 FAVB (favoley.net)
  { id: 'cat-junior-masc', name: 'Júnior Masculino', slug: 'junior-masculino', order: 3, description: 'MAYM26-1345 · Júnior Masculino Liga Provincial' },
  { id: 'cat-junior-fem', name: 'Júnior Femenino', slug: 'junior-femenino', order: 4, description: 'MAYF26-1337 · Júnior Femenino Liga Provincial' },
  { id: 'cat-juvenil-masc', name: 'Juvenil Masculino', slug: 'juvenil-masculino', order: 5, description: 'MAJM26-1321 · Juvenil Masculino Liga Provincial' },
  { id: 'cat-juvenil-fem', name: 'Juvenil Femenino', slug: 'juvenil-femenino', order: 6, description: 'MAJF26-1330 · Juvenil Femenino Liga Provincial' },
  { id: 'cat-cadete-masc', name: 'Cadete Masculino', slug: 'cadete-masculino', order: 7, description: 'MACM26-1313 · Cadete Masculino Liga Provincial' },
  { id: 'cat-cadete-fem', name: 'Cadete Femenino', slug: 'cadete-femenino', order: 8, description: 'MACF26-1304 · Cadete Femenino Liga Provincial' },
  { id: 'cat-infantil-masc', name: 'Infantil Masculino', slug: 'infantil-masculino', order: 9, description: 'MAIM26-1288 · Infantil Masculino Liga Provincial' },
  { id: 'cat-infantil-fem', name: 'Infantil Femenino', slug: 'infantil-femenino', order: 10, description: 'MAIF26-1299 · Infantil Femenino Liga Provincial' },
];

export const INITIAL_TEAMS: Team[] = [
  { id: 'team-sma', categoryId: 'cat-senior-masc-a', name: 'Senior Masculino A', division: '1ª División Andaluza', season: '2026/2027' },
  { id: 'team-smb', categoryId: 'cat-senior-masc-b', name: 'Senior Masculino B', division: 'Liga Provincial', season: '2026/2027' },
  { id: 'team-juniorm', categoryId: 'cat-junior-masc', name: 'Júnior Masculino (MAYM26-1345)', division: 'Liga Provincial', season: '2026/2027' },
  { id: 'team-juniorf', categoryId: 'cat-junior-fem', name: 'Júnior Femenino (MAYF26-1337)', division: 'Liga Provincial', season: '2026/2027' },
  { id: 'team-juvm', categoryId: 'cat-juvenil-masc', name: 'Juvenil Masculino (MAJM26-1321)', division: 'Liga Provincial', season: '2026/2027' },
  { id: 'team-juvf', categoryId: 'cat-juvenil-fem', name: 'Juvenil Femenino (MAJF26-1330)', division: 'Liga Provincial', season: '2026/2027' },
  { id: 'team-cadm', categoryId: 'cat-cadete-masc', name: 'Cadete Masculino (MACM26-1313)', division: 'Liga Provincial', season: '2026/2027' },
  { id: 'team-cadf', categoryId: 'cat-cadete-fem', name: 'Cadete Femenino (MACF26-1304)', division: 'Liga Provincial', season: '2026/2027' },
  { id: 'team-infm', categoryId: 'cat-infantil-masc', name: 'Infantil Masculino (MAIM26-1288)', division: 'Liga Provincial', season: '2026/2027' },
  { id: 'team-inff', categoryId: 'cat-infantil-fem', name: 'Infantil Femenino (MAIF26-1299)', division: 'Liga Provincial', season: '2026/2027' },
];

const PLAYER_SILHOUETTE = '/images/player-placeholder.svg';
const STAFF_SILHOUETTE = '/images/staff-placeholder.svg';

export const INITIAL_PLAYERS: Player[] = [
  // 1. Senior Masculino A (1ª Andaluza Senior Masculina) - 11 jugadores
  { id: 'p-sma-1', teamId: 'team-sma', number: 7, firstName: 'Alejandro', lastName: 'García Moreno', position: 'SETTER', birthYear: 1999, heightCm: 188, photoUrl: PLAYER_SILHOUETTE, isCaptain: true, isHomegrown: true },
  { id: 'p-sma-2', teamId: 'team-sma', number: 11, firstName: 'Mateo', lastName: 'Fernández Ruiz', position: 'OPPOSITE', birthYear: 2001, heightCm: 196, photoUrl: PLAYER_SILHOUETTE, isCaptain: false, isHomegrown: true },
  { id: 'p-sma-3', teamId: 'team-sma', number: 4, firstName: 'David', lastName: 'López Cantos', position: 'OUTSIDE_HITTER', birthYear: 2000, heightCm: 192, photoUrl: PLAYER_SILHOUETTE, isCaptain: false, isHomegrown: true },
  { id: 'p-sma-4', teamId: 'team-sma', number: 9, firstName: 'Javier', lastName: 'Sánchez Gil', position: 'OUTSIDE_HITTER', birthYear: 2002, heightCm: 190, photoUrl: PLAYER_SILHOUETTE, isCaptain: false, isHomegrown: false },
  { id: 'p-sma-5', teamId: 'team-sma', number: 13, firstName: 'Pablo', lastName: 'Romero Domínguez', position: 'MIDDLE_BLOCKER', birthYear: 1998, heightCm: 201, photoUrl: PLAYER_SILHOUETTE, isCaptain: false, isHomegrown: true },
  { id: 'p-sma-6', teamId: 'team-sma', number: 5, firstName: 'Álvaro', lastName: 'Navarro Muñoz', position: 'MIDDLE_BLOCKER', birthYear: 2003, heightCm: 198, photoUrl: PLAYER_SILHOUETTE, isCaptain: false, isHomegrown: true },
  { id: 'p-sma-7', teamId: 'team-sma', number: 1, firstName: 'Hugo', lastName: 'Castillo Vega', position: 'LIBERO', birthYear: 2001, heightCm: 178, photoUrl: PLAYER_SILHOUETTE, isCaptain: false, isHomegrown: true },
  { id: 'p-sma-8', teamId: 'team-sma', number: 14, firstName: 'Marcos', lastName: 'Benítez Sampedro', position: 'SETTER', birthYear: 2004, heightCm: 185, photoUrl: PLAYER_SILHOUETTE, isCaptain: false, isHomegrown: true },
  { id: 'p-sma-9', teamId: 'team-sma', number: 8, firstName: 'Rubén', lastName: 'Ortiz Gallego', position: 'OUTSIDE_HITTER', birthYear: 2001, heightCm: 191, photoUrl: PLAYER_SILHOUETTE, isCaptain: false, isHomegrown: true },
  { id: 'p-sma-10', teamId: 'team-sma', number: 16, firstName: 'Sergio', lastName: 'Carrasco Blanco', position: 'MIDDLE_BLOCKER', birthYear: 2002, heightCm: 199, photoUrl: PLAYER_SILHOUETTE, isCaptain: false, isHomegrown: true },
  { id: 'p-sma-11', teamId: 'team-sma', number: 2, firstName: 'Víctor', lastName: 'Mellado Díaz', position: 'LIBERO', birthYear: 2003, heightCm: 180, photoUrl: PLAYER_SILHOUETTE, isCaptain: false, isHomegrown: true },

  // 2. Senior Masculino B (Liga Provincial Senior) - 10 jugadores
  { id: 'p-smb-1', teamId: 'team-smb', number: 3, firstName: 'Raúl', lastName: 'Campos Márquez', position: 'SETTER', birthYear: 2004, heightCm: 182, photoUrl: PLAYER_SILHOUETTE, isCaptain: true, isHomegrown: true },
  { id: 'p-smb-2', teamId: 'team-smb', number: 8, firstName: 'Daniel', lastName: 'Pérez Heredia', position: 'OPPOSITE', birthYear: 2005, heightCm: 191, photoUrl: PLAYER_SILHOUETTE, isCaptain: false, isHomegrown: true },
  { id: 'p-smb-3', teamId: 'team-smb', number: 10, firstName: 'Gonzalo', lastName: 'Ríos Cano', position: 'OUTSIDE_HITTER', birthYear: 2004, heightCm: 187, photoUrl: PLAYER_SILHOUETTE, isCaptain: false, isHomegrown: true },
  { id: 'p-smb-4', teamId: 'team-smb', number: 6, firstName: 'Adrián', lastName: 'Vera Molina', position: 'OUTSIDE_HITTER', birthYear: 2005, heightCm: 189, photoUrl: PLAYER_SILHOUETTE, isCaptain: false, isHomegrown: true },
  { id: 'p-smb-5', teamId: 'team-smb', number: 12, firstName: 'Iván', lastName: 'Luque Serrano', position: 'MIDDLE_BLOCKER', birthYear: 2003, heightCm: 195, photoUrl: PLAYER_SILHOUETTE, isCaptain: false, isHomegrown: true },
  { id: 'p-smb-6', teamId: 'team-smb', number: 15, firstName: 'Roberto', lastName: 'Muñoz Prieto', position: 'MIDDLE_BLOCKER', birthYear: 2004, heightCm: 197, photoUrl: PLAYER_SILHOUETTE, isCaptain: false, isHomegrown: true },
  { id: 'p-smb-7', teamId: 'team-smb', number: 5, firstName: 'Carlos', lastName: 'Rueda Gómez', position: 'LIBERO', birthYear: 2005, heightCm: 177, photoUrl: PLAYER_SILHOUETTE, isCaptain: false, isHomegrown: true },
  { id: 'p-smb-8', teamId: 'team-smb', number: 2, firstName: 'Jaime', lastName: 'Lozano Gil', position: 'SETTER', birthYear: 2005, heightCm: 181, photoUrl: PLAYER_SILHOUETTE, isCaptain: false, isHomegrown: true },
  { id: 'p-smb-9', teamId: 'team-smb', number: 7, firstName: 'Mario', lastName: 'Domínguez Ramos', position: 'OUTSIDE_HITTER', birthYear: 2004, heightCm: 186, photoUrl: PLAYER_SILHOUETTE, isCaptain: false, isHomegrown: true },
  { id: 'p-smb-10', teamId: 'team-smb', number: 11, firstName: 'Cristian', lastName: 'Fuentes Soler', position: 'OPPOSITE', birthYear: 2003, heightCm: 193, photoUrl: PLAYER_SILHOUETTE, isCaptain: false, isHomegrown: true },

  // 3. Júnior Masculino (MAYM26-1345) - 10 jugadores
  { id: 'p-jm-1', teamId: 'team-juniorm', number: 6, firstName: 'Samuel', lastName: 'Molina Gil', position: 'SETTER', birthYear: 2006, heightCm: 184, photoUrl: PLAYER_SILHOUETTE, isCaptain: true, isHomegrown: true },
  { id: 'p-jm-2', teamId: 'team-juniorm', number: 9, firstName: 'Lucas', lastName: 'Alba Ramos', position: 'OUTSIDE_HITTER', birthYear: 2006, heightCm: 189, photoUrl: PLAYER_SILHOUETTE, isCaptain: false, isHomegrown: true },
  { id: 'p-jm-3', teamId: 'team-juniorm', number: 11, firstName: 'Jorge', lastName: 'Benítez Reyes', position: 'OPPOSITE', birthYear: 2006, heightCm: 193, photoUrl: PLAYER_SILHOUETTE, isCaptain: false, isHomegrown: true },
  { id: 'p-jm-4', teamId: 'team-juniorm', number: 4, firstName: 'Diego', lastName: 'Cano Salgado', position: 'OUTSIDE_HITTER', birthYear: 2006, heightCm: 186, photoUrl: PLAYER_SILHOUETTE, isCaptain: false, isHomegrown: true },
  { id: 'p-jm-5', teamId: 'team-juniorm', number: 14, firstName: 'Eric', lastName: 'Martín Villalba', position: 'MIDDLE_BLOCKER', birthYear: 2005, heightCm: 198, photoUrl: PLAYER_SILHOUETTE, isCaptain: false, isHomegrown: true },
  { id: 'p-jm-6', teamId: 'team-juniorm', number: 8, firstName: 'Manuel', lastName: 'Pardo Ortega', position: 'MIDDLE_BLOCKER', birthYear: 2006, heightCm: 195, photoUrl: PLAYER_SILHOUETTE, isCaptain: false, isHomegrown: true },
  { id: 'p-jm-7', teamId: 'team-juniorm', number: 2, firstName: 'Pablo', lastName: 'Cárdenas León', position: 'LIBERO', birthYear: 2006, heightCm: 176, photoUrl: PLAYER_SILHOUETTE, isCaptain: false, isHomegrown: true },
  { id: 'p-jm-8', teamId: 'team-juniorm', number: 5, firstName: 'Fernando', lastName: 'Ruiz Gil', position: 'SETTER', birthYear: 2006, heightCm: 182, photoUrl: PLAYER_SILHOUETTE, isCaptain: false, isHomegrown: true },
  { id: 'p-jm-9', teamId: 'team-juniorm', number: 7, firstName: 'Marc', lastName: 'Sánchez Ortiz', position: 'OUTSIDE_HITTER', birthYear: 2005, heightCm: 188, photoUrl: PLAYER_SILHOUETTE, isCaptain: false, isHomegrown: true },
  { id: 'p-jm-10', teamId: 'team-juniorm', number: 10, firstName: 'Bruno', lastName: 'Vidal Campos', position: 'MIDDLE_BLOCKER', birthYear: 2006, heightCm: 194, photoUrl: PLAYER_SILHOUETTE, isCaptain: false, isHomegrown: true },

  // 4. Júnior Femenino (MAYF26-1337) - 10 jugadoras
  { id: 'p-jf-1', teamId: 'team-juniorf', number: 4, firstName: 'Elena', lastName: 'Soria Blanco', position: 'SETTER', birthYear: 2006, heightCm: 174, photoUrl: PLAYER_SILHOUETTE, isCaptain: true, isHomegrown: true },
  { id: 'p-jf-2', teamId: 'team-juniorf', number: 11, firstName: 'Marta', lastName: 'Torres Luque', position: 'OUTSIDE_HITTER', birthYear: 2006, heightCm: 178, photoUrl: PLAYER_SILHOUETTE, isCaptain: false, isHomegrown: true },
  { id: 'p-jf-3', teamId: 'team-juniorf', number: 7, firstName: 'Lucía', lastName: 'Márquez Vera', position: 'OPPOSITE', birthYear: 2006, heightCm: 181, photoUrl: PLAYER_SILHOUETTE, isCaptain: false, isHomegrown: true },
  { id: 'p-jf-4', teamId: 'team-juniorf', number: 9, firstName: 'Sara', lastName: 'Morales Romero', position: 'OUTSIDE_HITTER', birthYear: 2006, heightCm: 176, photoUrl: PLAYER_SILHOUETTE, isCaptain: false, isHomegrown: true },
  { id: 'p-jf-5', teamId: 'team-juniorf', number: 13, firstName: 'Carmen', lastName: 'Gil Navarro', position: 'MIDDLE_BLOCKER', birthYear: 2005, heightCm: 185, photoUrl: PLAYER_SILHOUETTE, isCaptain: false, isHomegrown: true },
  { id: 'p-jf-6', teamId: 'team-juniorf', number: 6, firstName: 'Alba', lastName: 'Carrasco Pérez', position: 'MIDDLE_BLOCKER', birthYear: 2006, heightCm: 183, photoUrl: PLAYER_SILHOUETTE, isCaptain: false, isHomegrown: true },
  { id: 'p-jf-7', teamId: 'team-juniorf', number: 1, firstName: 'Natalia', lastName: 'Vega Ramos', position: 'LIBERO', birthYear: 2006, heightCm: 168, photoUrl: PLAYER_SILHOUETTE, isCaptain: false, isHomegrown: true },
  { id: 'p-jf-8', teamId: 'team-juniorf', number: 8, firstName: 'Paula', lastName: 'Mendoza Díaz', position: 'SETTER', birthYear: 2006, heightCm: 172, photoUrl: PLAYER_SILHOUETTE, isCaptain: false, isHomegrown: true },
  { id: 'p-jf-9', teamId: 'team-juniorf', number: 5, firstName: 'Irene', lastName: 'Salgado Montes', position: 'OUTSIDE_HITTER', birthYear: 2005, heightCm: 175, photoUrl: PLAYER_SILHOUETTE, isCaptain: false, isHomegrown: true },
  { id: 'p-jf-10', teamId: 'team-juniorf', number: 10, firstName: 'Claudia', lastName: 'Peña Fuentes', position: 'OPPOSITE', birthYear: 2006, heightCm: 180, photoUrl: PLAYER_SILHOUETTE, isCaptain: false, isHomegrown: true },

  // 5. Juvenil Masculino (MAJM26-1321) - 10 jugadores
  { id: 'p-juvm-1', teamId: 'team-juvm', number: 5, firstName: 'Nicolás', lastName: 'Prieto Reyes', position: 'SETTER', birthYear: 2007, heightCm: 183, photoUrl: PLAYER_SILHOUETTE, isCaptain: true, isHomegrown: true },
  { id: 'p-juvm-2', teamId: 'team-juvm', number: 12, firstName: 'Jaime', lastName: 'Díaz Ortiz', position: 'OPPOSITE', birthYear: 2008, heightCm: 192, photoUrl: PLAYER_SILHOUETTE, isCaptain: false, isHomegrown: true },
  { id: 'p-juvm-3', teamId: 'team-juvm', number: 7, firstName: 'Tomás', lastName: 'Marín Solís', position: 'OUTSIDE_HITTER', birthYear: 2007, heightCm: 187, photoUrl: PLAYER_SILHOUETTE, isCaptain: false, isHomegrown: true },
  { id: 'p-juvm-4', teamId: 'team-juvm', number: 3, firstName: 'Guillermo', lastName: 'Blanco Vega', position: 'OUTSIDE_HITTER', birthYear: 2008, heightCm: 185, photoUrl: PLAYER_SILHOUETTE, isCaptain: false, isHomegrown: true },
  { id: 'p-juvm-5', teamId: 'team-juvm', number: 14, firstName: 'Rubén', lastName: 'Gómez Alarcón', position: 'MIDDLE_BLOCKER', birthYear: 2007, heightCm: 196, photoUrl: PLAYER_SILHOUETTE, isCaptain: false, isHomegrown: true },
  { id: 'p-juvm-6', teamId: 'team-juvm', number: 9, firstName: 'Pau', lastName: 'Esteve Sampedro', position: 'MIDDLE_BLOCKER', birthYear: 2008, heightCm: 194, photoUrl: PLAYER_SILHOUETTE, isCaptain: false, isHomegrown: true },
  { id: 'p-juvm-7', teamId: 'team-juvm', number: 1, firstName: 'Leo', lastName: 'Fuentes Castillo', position: 'LIBERO', birthYear: 2007, heightCm: 174, photoUrl: PLAYER_SILHOUETTE, isCaptain: false, isHomegrown: true },
  { id: 'p-juvm-8', teamId: 'team-juvm', number: 2, firstName: 'Darío', lastName: 'Romero Luque', position: 'SETTER', birthYear: 2008, heightCm: 180, photoUrl: PLAYER_SILHOUETTE, isCaptain: false, isHomegrown: true },
  { id: 'p-juvm-9', teamId: 'team-juvm', number: 10, firstName: 'Hugo', lastName: 'Gil Benítez', position: 'OUTSIDE_HITTER', birthYear: 2007, heightCm: 186, photoUrl: PLAYER_SILHOUETTE, isCaptain: false, isHomegrown: true },
  { id: 'p-juvm-10', teamId: 'team-juvm', number: 11, firstName: 'Álvaro', lastName: 'Ramos Cano', position: 'OPPOSITE', birthYear: 2008, heightCm: 190, photoUrl: PLAYER_SILHOUETTE, isCaptain: false, isHomegrown: true },

  // 6. Juvenil Femenino (MAJF26-1330) - 10 jugadoras
  { id: 'p-juvf-1', teamId: 'team-juvf', number: 7, firstName: 'Lucía', lastName: 'Gálvez Marín', position: 'OUTSIDE_HITTER', birthYear: 2007, heightCm: 176, photoUrl: PLAYER_SILHOUETTE, isCaptain: true, isHomegrown: true },
  { id: 'p-juvf-2', teamId: 'team-juvf', number: 10, firstName: 'Paula', lastName: 'Heredia Cruz', position: 'MIDDLE_BLOCKER', birthYear: 2008, heightCm: 182, photoUrl: PLAYER_SILHOUETTE, isCaptain: false, isHomegrown: true },
  { id: 'p-juvf-3', teamId: 'team-juvf', number: 3, firstName: 'Carla', lastName: 'Serrano Molina', position: 'SETTER', birthYear: 2007, heightCm: 171, photoUrl: PLAYER_SILHOUETTE, isCaptain: false, isHomegrown: true },
  { id: 'p-juvf-4', teamId: 'team-juvf', number: 9, firstName: 'Daniela', lastName: 'Ruiz Pardo', position: 'OPPOSITE', birthYear: 2008, heightCm: 179, photoUrl: PLAYER_SILHOUETTE, isCaptain: false, isHomegrown: true },
  { id: 'p-juvf-5', teamId: 'team-juvf', number: 5, firstName: 'Andrea', lastName: 'León Blanco', position: 'OUTSIDE_HITTER', birthYear: 2007, heightCm: 174, photoUrl: PLAYER_SILHOUETTE, isCaptain: false, isHomegrown: true },
  { id: 'p-juvf-6', teamId: 'team-juvf', number: 14, firstName: 'Martina', lastName: 'Soler Gil', position: 'MIDDLE_BLOCKER', birthYear: 2008, heightCm: 184, photoUrl: PLAYER_SILHOUETTE, isCaptain: false, isHomegrown: true },
  { id: 'p-juvf-7', teamId: 'team-juvf', number: 2, firstName: 'Emma', lastName: 'Castro Ramos', position: 'LIBERO', birthYear: 2007, heightCm: 166, photoUrl: PLAYER_SILHOUETTE, isCaptain: false, isHomegrown: true },
  { id: 'p-juvf-8', teamId: 'team-juvf', number: 8, firstName: 'Julia', lastName: 'Benítez Vega', position: 'SETTER', birthYear: 2008, heightCm: 170, photoUrl: PLAYER_SILHOUETTE, isCaptain: false, isHomegrown: true },
  { id: 'p-juvf-9', teamId: 'team-juvf', number: 11, firstName: 'Valeria', lastName: 'Morales Ortiz', position: 'OUTSIDE_HITTER', birthYear: 2007, heightCm: 175, photoUrl: PLAYER_SILHOUETTE, isCaptain: false, isHomegrown: true },
  { id: 'p-juvf-10', teamId: 'team-juvf', number: 6, firstName: 'Sofía', lastName: 'Navarro Díaz', position: 'OPPOSITE', birthYear: 2008, heightCm: 178, photoUrl: PLAYER_SILHOUETTE, isCaptain: false, isHomegrown: true },

  // 7. Cadete Masculino (MACM26-1313) - 10 jugadores
  { id: 'p-cadm-1', teamId: 'team-cadm', number: 4, firstName: 'Adrián', lastName: 'Ruiz Montes', position: 'OUTSIDE_HITTER', birthYear: 2009, heightCm: 182, photoUrl: PLAYER_SILHOUETTE, isCaptain: true, isHomegrown: true },
  { id: 'p-cadm-2', teamId: 'team-cadm', number: 8, firstName: 'Mario', lastName: 'Navas Serrano', position: 'SETTER', birthYear: 2009, heightCm: 178, photoUrl: PLAYER_SILHOUETTE, isCaptain: false, isHomegrown: true },
  { id: 'p-cadm-3', teamId: 'team-cadm', number: 11, firstName: 'Daniel', lastName: 'Cano Prieto', position: 'OPPOSITE', birthYear: 2010, heightCm: 186, photoUrl: PLAYER_SILHOUETTE, isCaptain: false, isHomegrown: true },
  { id: 'p-cadm-4', teamId: 'team-cadm', number: 6, firstName: 'Alejandro', lastName: 'Vega Luque', position: 'OUTSIDE_HITTER', birthYear: 2009, heightCm: 180, photoUrl: PLAYER_SILHOUETTE, isCaptain: false, isHomegrown: true },
  { id: 'p-cadm-5', teamId: 'team-cadm', number: 13, firstName: 'Gabriel', lastName: 'Ramos Soler', position: 'MIDDLE_BLOCKER', birthYear: 2009, heightCm: 190, photoUrl: PLAYER_SILHOUETTE, isCaptain: false, isHomegrown: true },
  { id: 'p-cadm-6', teamId: 'team-cadm', number: 15, firstName: 'Héctor', lastName: 'Alarcón Díaz', position: 'MIDDLE_BLOCKER', birthYear: 2010, heightCm: 188, photoUrl: PLAYER_SILHOUETTE, isCaptain: false, isHomegrown: true },
  { id: 'p-cadm-7', teamId: 'team-cadm', number: 1, firstName: 'Lucas', lastName: 'Romero Gil', position: 'LIBERO', birthYear: 2009, heightCm: 170, photoUrl: PLAYER_SILHOUETTE, isCaptain: false, isHomegrown: true },
  { id: 'p-cadm-8', teamId: 'team-cadm', number: 2, firstName: 'Mateo', lastName: 'Blanco Ortiz', position: 'SETTER', birthYear: 2010, heightCm: 175, photoUrl: PLAYER_SILHOUETTE, isCaptain: false, isHomegrown: true },
  { id: 'p-cadm-9', teamId: 'team-cadm', number: 7, firstName: 'Javier', lastName: 'Fuentes Gómez', position: 'OUTSIDE_HITTER', birthYear: 2009, heightCm: 179, photoUrl: PLAYER_SILHOUETTE, isCaptain: false, isHomegrown: true },
  { id: 'p-cadm-10', teamId: 'team-cadm', number: 9, firstName: 'Rodrigo', lastName: 'Castillo Marín', position: 'OPPOSITE', birthYear: 2010, heightCm: 184, photoUrl: PLAYER_SILHOUETTE, isCaptain: false, isHomegrown: true },

  // 8. Cadete Femenino (MACF26-1304) - 10 jugadoras
  { id: 'p-cadf-1', teamId: 'team-cadf', number: 3, firstName: 'Carla', lastName: 'Román Peña', position: 'SETTER', birthYear: 2009, heightCm: 171, photoUrl: PLAYER_SILHOUETTE, isCaptain: true, isHomegrown: true },
  { id: 'p-cadf-2', teamId: 'team-cadf', number: 9, firstName: 'Marina', lastName: 'Vega Castillo', position: 'OUTSIDE_HITTER', birthYear: 2010, heightCm: 175, photoUrl: PLAYER_SILHOUETTE, isCaptain: false, isHomegrown: true },
  { id: 'p-cadf-3', teamId: 'team-cadf', number: 12, firstName: 'Blanca', lastName: 'Gil Serrano', position: 'OPPOSITE', birthYear: 2009, heightCm: 177, photoUrl: PLAYER_SILHOUETTE, isCaptain: false, isHomegrown: true },
  { id: 'p-cadf-4', teamId: 'team-cadf', number: 5, firstName: 'Claudia', lastName: 'Ortiz Molina', position: 'OUTSIDE_HITTER', birthYear: 2010, heightCm: 172, photoUrl: PLAYER_SILHOUETTE, isCaptain: false, isHomegrown: true },
  { id: 'p-cadf-5', teamId: 'team-cadf', number: 14, firstName: 'Alicia', lastName: 'Torres Blanco', position: 'MIDDLE_BLOCKER', birthYear: 2009, heightCm: 181, photoUrl: PLAYER_SILHOUETTE, isCaptain: false, isHomegrown: true },
  { id: 'p-cadf-6', teamId: 'team-cadf', number: 8, firstName: 'Valentina', lastName: 'Luque Ramos', position: 'MIDDLE_BLOCKER', birthYear: 2010, heightCm: 179, photoUrl: PLAYER_SILHOUETTE, isCaptain: false, isHomegrown: true },
  { id: 'p-cadf-7', teamId: 'team-cadf', number: 1, firstName: 'Mía', lastName: 'Cárdenas Gómez', position: 'LIBERO', birthYear: 2009, heightCm: 163, photoUrl: PLAYER_SILHOUETTE, isCaptain: false, isHomegrown: true },
  { id: 'p-cadf-8', teamId: 'team-cadf', number: 4, firstName: 'Chloe', lastName: 'Pardo Solís', position: 'SETTER', birthYear: 2010, heightCm: 169, photoUrl: PLAYER_SILHOUETTE, isCaptain: false, isHomegrown: true },
  { id: 'p-cadf-9', teamId: 'team-cadf', number: 7, firstName: 'Nerea', lastName: 'Ruiz Benítez', position: 'OUTSIDE_HITTER', birthYear: 2009, heightCm: 173, photoUrl: PLAYER_SILHOUETTE, isCaptain: false, isHomegrown: true },
  { id: 'p-cadf-10', teamId: 'team-cadf', number: 10, firstName: 'Laura', lastName: 'Mendoza Díaz', position: 'OPPOSITE', birthYear: 2010, heightCm: 176, photoUrl: PLAYER_SILHOUETTE, isCaptain: false, isHomegrown: true },

  // 9. Infantil Masculino (MAIM26-1288) - 10 jugadores
  { id: 'p-infm-1', teamId: 'team-infm', number: 2, firstName: 'Iker', lastName: 'Fernández Luque', position: 'SETTER', birthYear: 2012, heightCm: 165, photoUrl: PLAYER_SILHOUETTE, isCaptain: true, isHomegrown: true },
  { id: 'p-infm-2', teamId: 'team-infm', number: 7, firstName: 'Gonzalo', lastName: 'Marín Blanco', position: 'OUTSIDE_HITTER', birthYear: 2011, heightCm: 172, photoUrl: PLAYER_SILHOUETTE, isCaptain: false, isHomegrown: true },
  { id: 'p-infm-3', teamId: 'team-infm', number: 10, firstName: 'Hugo', lastName: 'Ramos Soler', position: 'OPPOSITE', birthYear: 2011, heightCm: 175, photoUrl: PLAYER_SILHOUETTE, isCaptain: false, isHomegrown: true },
  { id: 'p-infm-4', teamId: 'team-infm', number: 4, firstName: 'Martín', lastName: 'Gil Vega', position: 'OUTSIDE_HITTER', birthYear: 2012, heightCm: 168, photoUrl: PLAYER_SILHOUETTE, isCaptain: false, isHomegrown: true },
  { id: 'p-infm-5', teamId: 'team-infm', number: 13, firstName: 'Óliver', lastName: 'Gómez Ortiz', position: 'MIDDLE_BLOCKER', birthYear: 2011, heightCm: 178, photoUrl: PLAYER_SILHOUETTE, isCaptain: false, isHomegrown: true },
  { id: 'p-infm-6', teamId: 'team-infm', number: 9, firstName: 'Thiago', lastName: 'Alarcón Ruiz', position: 'MIDDLE_BLOCKER', birthYear: 2012, heightCm: 176, photoUrl: PLAYER_SILHOUETTE, isCaptain: false, isHomegrown: true },
  { id: 'p-infm-7', teamId: 'team-infm', number: 1, firstName: 'Dylan', lastName: 'Castro Cano', position: 'LIBERO', birthYear: 2011, heightCm: 158, photoUrl: PLAYER_SILHOUETTE, isCaptain: false, isHomegrown: true },
  { id: 'p-infm-8', teamId: 'team-infm', number: 5, firstName: 'Leo', lastName: 'Serrano Díaz', position: 'SETTER', birthYear: 2012, heightCm: 163, photoUrl: PLAYER_SILHOUETTE, isCaptain: false, isHomegrown: true },
  { id: 'p-infm-9', teamId: 'team-infm', number: 8, firstName: 'Nico', lastName: 'Fuentes Pardo', position: 'OUTSIDE_HITTER', birthYear: 2011, heightCm: 169, photoUrl: PLAYER_SILHOUETTE, isCaptain: false, isHomegrown: true },
  { id: 'p-infm-10', teamId: 'team-infm', number: 11, firstName: 'Álex', lastName: 'Castillo Solís', position: 'OPPOSITE', birthYear: 2012, heightCm: 173, photoUrl: PLAYER_SILHOUETTE, isCaptain: false, isHomegrown: true },

  // 10. Infantil Femenino (MAIF26-1299) - 10 jugadoras
  { id: 'p-inff-1', teamId: 'team-inff', number: 5, firstName: 'Noa', lastName: 'Sánchez Gómez', position: 'OUTSIDE_HITTER', birthYear: 2012, heightCm: 164, photoUrl: PLAYER_SILHOUETTE, isCaptain: true, isHomegrown: true },
  { id: 'p-inff-2', teamId: 'team-inff', number: 3, firstName: 'Vega', lastName: 'Romero Díaz', position: 'SETTER', birthYear: 2011, heightCm: 162, photoUrl: PLAYER_SILHOUETTE, isCaptain: false, isHomegrown: true },
  { id: 'p-inff-3', teamId: 'team-inff', number: 9, firstName: 'Abril', lastName: 'Torres Luque', position: 'OPPOSITE', birthYear: 2011, heightCm: 169, photoUrl: PLAYER_SILHOUETTE, isCaptain: false, isHomegrown: true },
  { id: 'p-inff-4', teamId: 'team-inff', number: 7, firstName: 'Alma', lastName: 'Gil Blanco', position: 'OUTSIDE_HITTER', birthYear: 2012, heightCm: 165, photoUrl: PLAYER_SILHOUETTE, isCaptain: false, isHomegrown: true },
  { id: 'p-inff-5', teamId: 'team-inff', number: 12, firstName: 'Olivia', lastName: 'Marín Ramos', position: 'MIDDLE_BLOCKER', birthYear: 2011, heightCm: 173, photoUrl: PLAYER_SILHOUETTE, isCaptain: false, isHomegrown: true },
  { id: 'p-inff-6', teamId: 'team-inff', number: 14, firstName: 'Lara', lastName: 'Vega Soler', position: 'MIDDLE_BLOCKER', birthYear: 2012, heightCm: 171, photoUrl: PLAYER_SILHOUETTE, isCaptain: false, isHomegrown: true },
  { id: 'p-inff-7', teamId: 'team-inff', number: 1, firstName: 'Zoe', lastName: 'Ortiz Castillo', position: 'LIBERO', birthYear: 2011, heightCm: 155, photoUrl: PLAYER_SILHOUETTE, isCaptain: false, isHomegrown: true },
  { id: 'p-inff-8', teamId: 'team-inff', number: 4, firstName: 'Gala', lastName: 'Benítez Pardo', position: 'SETTER', birthYear: 2012, heightCm: 160, photoUrl: PLAYER_SILHOUETTE, isCaptain: false, isHomegrown: true },
  { id: 'p-inff-9', teamId: 'team-inff', number: 8, firstName: 'Valeria', lastName: 'Ruiz Cano', position: 'OUTSIDE_HITTER', birthYear: 2011, heightCm: 166, photoUrl: PLAYER_SILHOUETTE, isCaptain: false, isHomegrown: true },
  { id: 'p-inff-10', teamId: 'team-inff', number: 10, firstName: 'Martina', lastName: 'Gómez Alarcón', position: 'OPPOSITE', birthYear: 2012, heightCm: 168, photoUrl: PLAYER_SILHOUETTE, isCaptain: false, isHomegrown: true },
];

export const INITIAL_STAFF: Staff[] = [
  { id: 'st-sma-1', teamId: 'team-sma', name: 'Manuel "Manolo" Rivas Cortés', role: 'HEAD_COACH', photoUrl: STAFF_SILHOUETTE },
  { id: 'st-sma-2', teamId: 'team-sma', name: 'Carlos Alarcón Vega', role: 'ASSISTANT', photoUrl: STAFF_SILHOUETTE },
  { id: 'st-sma-3', teamId: 'team-sma', name: 'Marta Lozano Pino', role: 'PHYSIO', photoUrl: STAFF_SILHOUETTE },
  { id: 'st-cad-1', teamId: 'team-cadm', name: 'Antonio Salgado Marín', role: 'HEAD_COACH', photoUrl: STAFF_SILHOUETTE },
  { id: 'st-inf-1', teamId: 'team-infm', name: 'Alberto Gil Sampedro', role: 'HEAD_COACH', photoUrl: STAFF_SILHOUETTE },
];

export const INITIAL_MATCHES: Match[] = [
  // Próximo partido destacado (Local en Sergio Scariolo)
  {
    id: 'm-featured-1',
    teamId: 'team-sma',
    round: 1,
    homeTeamName: 'C.D. Voleibol San Pedro',
    awayTeamName: 'CV Costa del Sol Estepona',
    isClubHome: true,
    venueName: 'Pabellón Polideportivo Sergio Scariolo',
    matchDate: '2026-10-10T16:30:00.000Z', // 18:30h en Madrid
    status: 'SCHEDULED',
    setScores: [],
    favbMatchUrl: 'https://favoley.net/publico/seccion.php?seccion=competicion&id=2&vista=calendario',
    isFeatured: true,
  },
  {
    id: 'm-past-1',
    teamId: 'team-sma',
    round: 2,
    homeTeamName: 'CV Pizarra',
    awayTeamName: 'C.D. Voleibol San Pedro',
    isClubHome: false,
    venueName: 'Pabellón Dani Pacheco (Pizarra)',
    matchDate: '2026-10-03T16:00:00.000Z',
    status: 'FINISHED',
    setScores: [
      { home: 22, away: 25 },
      { home: 25, away: 21 },
      { home: 20, away: 25 },
      { home: 19, away: 25 },
    ],
    favbMatchUrl: 'https://favoley.net/publico/seccion.php?seccion=competicion&id=2&vista=calendario',
    mvpPlayerId: 'p-sma-2',
  },
  {
    id: 'm-cadf-1',
    teamId: 'team-cadf',
    round: 1,
    homeTeamName: 'C.D. Voleibol San Pedro',
    awayTeamName: 'San Estanislao',
    isClubHome: true,
    venueName: 'Pabellón Polideportivo Sergio Scariolo',
    matchDate: '2026-10-10T08:00:00.000Z', // 10:00h en Madrid
    status: 'SCHEDULED',
    setScores: [],
    favbMatchUrl: 'https://favoley.net/publico/seccion.php?seccion=competicion&id=1304&vista=calendario',
  },
  {
    id: 'm-cadm-1',
    teamId: 'team-cadm',
    round: 1,
    homeTeamName: 'Fundación Victoria',
    awayTeamName: 'C.D. Voleibol San Pedro',
    isClubHome: false,
    venueName: 'Polideportivo San Fernando',
    matchDate: '2026-10-11T09:30:00.000Z', // 11:30h en Madrid
    status: 'SCHEDULED',
    setScores: [],
    favbMatchUrl: 'https://favoley.net/publico/seccion.php?seccion=competicion&id=1313&vista=calendario',
  },
  {
    id: 'm-inff-1',
    teamId: 'team-inff',
    round: 1,
    homeTeamName: 'C.D. Voleibol San Pedro',
    awayTeamName: 'Mijas Vóley Blanco',
    isClubHome: true,
    venueName: 'Pabellón Polideportivo Sergio Scariolo',
    matchDate: '2026-10-17T07:30:00.000Z', // 09:30h en Madrid
    status: 'SCHEDULED',
    setScores: [],
    favbMatchUrl: 'https://favoley.net/publico/seccion.php?seccion=competicion&id=1299&vista=calendario',
  },
  {
    id: 'm-jm-1',
    teamId: 'team-juniorm',
    round: 1,
    homeTeamName: 'C.D. Voleibol San Pedro',
    awayTeamName: 'CV Fuengirola',
    isClubHome: true,
    venueName: 'Pabellón Polideportivo Sergio Scariolo',
    matchDate: '2026-10-18T10:00:00.000Z', // 12:00h en Madrid
    status: 'SCHEDULED',
    setScores: [],
    favbMatchUrl: 'https://favoley.net/publico/seccion.php?seccion=competicion&id=1345&vista=calendario',
  },
];

export const INITIAL_STANDINGS: Standings[] = [
  // 1. Senior Masculino A (1ª Andaluza Grupo Sur)
  { id: 'std-sma-1', categoryId: 'cat-senior-masc-a', teamName: 'C.D. Voleibol San Pedro', isCurrentClub: true, played: 13, won: 11, lost: 2, setsFor: 35, setsAgainst: 13, points: 32 },
  { id: 'std-sma-2', categoryId: 'cat-senior-masc-a', teamName: 'CV Pizarra', isCurrentClub: false, played: 13, won: 10, lost: 3, setsFor: 33, setsAgainst: 15, points: 29 },
  { id: 'std-sma-3', categoryId: 'cat-senior-masc-a', teamName: 'CV Costa del Sol Estepona', isCurrentClub: false, played: 13, won: 9, lost: 4, setsFor: 31, setsAgainst: 18, points: 26 },
  { id: 'std-sma-4', categoryId: 'cat-senior-masc-a', teamName: 'CV Marbella', isCurrentClub: false, played: 13, won: 7, lost: 6, setsFor: 26, setsAgainst: 22, points: 21 },
  { id: 'std-sma-5', categoryId: 'cat-senior-masc-a', teamName: 'CV Almería B', isCurrentClub: false, played: 13, won: 6, lost: 7, setsFor: 22, setsAgainst: 25, points: 18 },
  { id: 'std-sma-6', categoryId: 'cat-senior-masc-a', teamName: 'CD Mijas Vóley', isCurrentClub: false, played: 13, won: 5, lost: 8, setsFor: 19, setsAgainst: 28, points: 14 },
  { id: 'std-sma-7', categoryId: 'cat-senior-masc-a', teamName: 'CV Benalmádena', isCurrentClub: false, played: 13, won: 3, lost: 10, setsFor: 14, setsAgainst: 32, points: 9 },
  { id: 'std-sma-8', categoryId: 'cat-senior-masc-a', teamName: 'CV Ronda Sierra', isCurrentClub: false, played: 13, won: 1, lost: 12, setsFor: 8, setsAgainst: 36, points: 3 },

  // 2. Senior Masculino B (Liga Provincial Málaga)
  { id: 'std-smb-1', categoryId: 'cat-senior-masc-b', teamName: 'CV Cártama', isCurrentClub: false, played: 8, won: 7, lost: 1, setsFor: 22, setsAgainst: 6, points: 20 },
  { id: 'std-smb-2', categoryId: 'cat-senior-masc-b', teamName: 'C.D. Voleibol San Pedro B', isCurrentClub: true, played: 8, won: 6, lost: 2, setsFor: 20, setsAgainst: 9, points: 18 },
  { id: 'std-smb-3', categoryId: 'cat-senior-masc-b', teamName: 'CV Coín', isCurrentClub: false, played: 8, won: 5, lost: 3, setsFor: 17, setsAgainst: 12, points: 15 },
  { id: 'std-smb-4', categoryId: 'cat-senior-masc-b', teamName: 'CV Nerja', isCurrentClub: false, played: 8, won: 3, lost: 5, setsFor: 12, setsAgainst: 17, points: 9 },
  { id: 'std-smb-5', categoryId: 'cat-senior-masc-b', teamName: 'CV Torremolinos', isCurrentClub: false, played: 8, won: 2, lost: 6, setsFor: 8, setsAgainst: 20, points: 6 },
  { id: 'std-smb-6', categoryId: 'cat-senior-masc-b', teamName: 'CV Alhaurín de la Torre', isCurrentClub: false, played: 8, won: 1, lost: 7, setsFor: 5, setsAgainst: 20, points: 4 },

  // 3. Júnior Masculino (MAYM26-1345)
  { id: 'std-jm-1', categoryId: 'cat-junior-masc', teamName: 'C.D. Voleibol San Pedro', isCurrentClub: true, played: 6, won: 5, lost: 1, setsFor: 16, setsAgainst: 5, points: 15 },
  { id: 'std-jm-2', categoryId: 'cat-junior-masc', teamName: 'Costa del Voley', isCurrentClub: false, played: 6, won: 5, lost: 1, setsFor: 15, setsAgainst: 6, points: 14 },
  { id: 'std-jm-3', categoryId: 'cat-junior-masc', teamName: 'CV Pizarra Júnior', isCurrentClub: false, played: 6, won: 4, lost: 2, setsFor: 13, setsAgainst: 9, points: 12 },
  { id: 'std-jm-4', categoryId: 'cat-junior-masc', teamName: 'CV Fuengirola', isCurrentClub: false, played: 6, won: 2, lost: 4, setsFor: 8, setsAgainst: 14, points: 6 },
  { id: 'std-jm-5', categoryId: 'cat-junior-masc', teamName: 'San Estanislao', isCurrentClub: false, played: 6, won: 1, lost: 5, setsFor: 5, setsAgainst: 16, points: 4 },
  { id: 'std-jm-6', categoryId: 'cat-junior-masc', teamName: 'CV Marbella', isCurrentClub: false, played: 6, won: 1, lost: 5, setsFor: 4, setsAgainst: 16, points: 3 },

  // 4. Júnior Femenino (MAYF26-1337)
  { id: 'std-jf-1', categoryId: 'cat-junior-fem', teamName: 'CV Cártama', isCurrentClub: false, played: 6, won: 6, lost: 0, setsFor: 18, setsAgainst: 3, points: 17 },
  { id: 'std-jf-2', categoryId: 'cat-junior-fem', teamName: 'C.D. Voleibol San Pedro', isCurrentClub: true, played: 6, won: 4, lost: 2, setsFor: 14, setsAgainst: 8, points: 13 },
  { id: 'std-jf-3', categoryId: 'cat-junior-fem', teamName: 'San Estanislao', isCurrentClub: false, played: 6, won: 4, lost: 2, setsFor: 13, setsAgainst: 10, points: 11 },
  { id: 'std-jf-4', categoryId: 'cat-junior-fem', teamName: 'Mijas Vóley', isCurrentClub: false, played: 6, won: 2, lost: 4, setsFor: 9, setsAgainst: 14, points: 6 },
  { id: 'std-jf-5', categoryId: 'cat-junior-fem', teamName: 'Costa del Voley', isCurrentClub: false, played: 6, won: 1, lost: 5, setsFor: 6, setsAgainst: 16, points: 4 },
  { id: 'std-jf-6', categoryId: 'cat-junior-fem', teamName: 'Fundación Victoria', isCurrentClub: false, played: 6, won: 1, lost: 5, setsFor: 5, setsAgainst: 17, points: 3 },

  // 5. Juvenil Masculino (MAJM26-1321)
  { id: 'std-juvm-1', categoryId: 'cat-juvenil-masc', teamName: 'C.D. Voleibol San Pedro', isCurrentClub: true, played: 7, won: 6, lost: 1, setsFor: 19, setsAgainst: 6, points: 18 },
  { id: 'std-juvm-2', teamName: 'CV Pizarra', categoryId: 'cat-juvenil-masc', isCurrentClub: false, played: 7, won: 5, lost: 2, setsFor: 17, setsAgainst: 8, points: 16 },
  { id: 'std-juvm-3', teamName: 'Costa del Voley', categoryId: 'cat-juvenil-masc', isCurrentClub: false, played: 7, won: 4, lost: 3, setsFor: 14, setsAgainst: 11, points: 12 },
  { id: 'std-juvm-4', teamName: 'CD Mijas Vóley', categoryId: 'cat-juvenil-masc', isCurrentClub: false, played: 7, won: 3, lost: 4, setsFor: 11, setsAgainst: 13, points: 9 },
  { id: 'std-juvm-5', teamName: 'CV Alhaurín', categoryId: 'cat-juvenil-masc', isCurrentClub: false, played: 7, won: 2, lost: 5, setsFor: 8, setsAgainst: 16, points: 5 },
  { id: 'std-juvm-6', teamName: 'CV Benalmádena', categoryId: 'cat-juvenil-masc', isCurrentClub: false, played: 7, won: 1, lost: 6, setsFor: 4, setsAgainst: 19, points: 3 },

  // 6. Juvenil Femenino (MAJF26-1330)
  { id: 'std-juvf-1', categoryId: 'cat-juvenil-fem', teamName: 'San Estanislao', isCurrentClub: false, played: 6, won: 5, lost: 1, setsFor: 16, setsAgainst: 5, points: 15 },
  { id: 'std-juvf-2', categoryId: 'cat-juvenil-fem', teamName: 'C.D. Voleibol San Pedro', isCurrentClub: true, played: 6, won: 5, lost: 1, setsFor: 16, setsAgainst: 6, points: 14 },
  { id: 'std-juvf-3', categoryId: 'cat-juvenil-fem', teamName: 'Unión Malagueña', isCurrentClub: false, played: 6, won: 3, lost: 3, setsFor: 11, setsAgainst: 11, points: 9 },
  { id: 'std-juvf-4', categoryId: 'cat-juvenil-fem', teamName: 'CV Marbella', isCurrentClub: false, played: 6, won: 3, lost: 3, setsFor: 10, setsAgainst: 12, points: 8 },
  { id: 'std-juvf-5', categoryId: 'cat-juvenil-fem', teamName: 'Cártama Azul', isCurrentClub: false, played: 6, won: 1, lost: 5, setsFor: 6, setsAgainst: 15, points: 5 },
  { id: 'std-juvf-6', categoryId: 'cat-juvenil-fem', teamName: 'Fundación Victoria', isCurrentClub: false, played: 6, won: 1, lost: 5, setsFor: 5, setsAgainst: 16, points: 3 },

  // 7. Cadete Masculino (MACM26-1313)
  { id: 'std-cadm-1', categoryId: 'cat-cadete-masc', teamName: 'C.D. Voleibol San Pedro', isCurrentClub: true, played: 5, won: 4, lost: 1, setsFor: 13, setsAgainst: 4, points: 12 },
  { id: 'std-cadm-2', categoryId: 'cat-cadete-masc', teamName: 'Fundación Victoria', isCurrentClub: false, played: 5, won: 4, lost: 1, setsFor: 13, setsAgainst: 5, points: 12 },
  { id: 'std-cadm-3', categoryId: 'cat-cadete-masc', teamName: 'CV Pizarra', isCurrentClub: false, played: 5, won: 3, lost: 2, setsFor: 10, setsAgainst: 8, points: 9 },
  { id: 'std-cadm-4', categoryId: 'cat-cadete-masc', teamName: 'Costa del Voley', isCurrentClub: false, played: 5, won: 2, lost: 3, setsFor: 8, setsAgainst: 10, points: 6 },
  { id: 'std-cadm-5', categoryId: 'cat-cadete-masc', teamName: 'CD Mijas Vóley', isCurrentClub: false, played: 5, won: 1, lost: 4, setsFor: 4, setsAgainst: 13, points: 3 },
  { id: 'std-cadm-6', categoryId: 'cat-cadete-masc', teamName: 'CV Nerja', isCurrentClub: false, played: 5, won: 1, lost: 4, setsFor: 3, setsAgainst: 14, points: 3 },

  // 8. Cadete Femenino (MACF26-1304)
  { id: 'std-cadf-1', categoryId: 'cat-cadete-fem', teamName: 'C.D. Voleibol San Pedro', isCurrentClub: true, played: 6, won: 5, lost: 1, setsFor: 16, setsAgainst: 5, points: 15 },
  { id: 'std-cadf-2', categoryId: 'cat-cadete-fem', teamName: 'Cártama Azul', isCurrentClub: false, played: 6, won: 5, lost: 1, setsFor: 15, setsAgainst: 6, points: 14 },
  { id: 'std-cadf-3', categoryId: 'cat-cadete-fem', teamName: 'Costa del Voley Rosa', isCurrentClub: false, played: 6, won: 4, lost: 2, setsFor: 13, setsAgainst: 8, points: 12 },
  { id: 'std-cadf-4', categoryId: 'cat-cadete-fem', teamName: 'Fundación Victoria', isCurrentClub: false, played: 6, won: 3, lost: 3, setsFor: 11, setsAgainst: 11, points: 9 },
  { id: 'std-cadf-5', categoryId: 'cat-cadete-fem', teamName: 'Mijas Vóley', isCurrentClub: false, played: 6, won: 2, lost: 4, setsFor: 8, setsAgainst: 14, points: 6 },
  { id: 'std-cadf-6', categoryId: 'cat-cadete-fem', teamName: 'San Estanislao', isCurrentClub: false, played: 6, won: 1, lost: 5, setsFor: 5, setsAgainst: 16, points: 4 },
  { id: 'std-cadf-7', categoryId: 'cat-cadete-fem', teamName: 'Unión Malagueña A', isCurrentClub: false, played: 6, won: 1, lost: 5, setsFor: 4, setsAgainst: 17, points: 3 },

  // 9. Infantil Masculino (MAIM26-1288)
  { id: 'std-infm-1', categoryId: 'cat-infantil-masc', teamName: 'CV Pizarra', isCurrentClub: false, played: 5, won: 5, lost: 0, setsFor: 15, setsAgainst: 2, points: 15 },
  { id: 'std-infm-2', categoryId: 'cat-infantil-masc', teamName: 'C.D. Voleibol San Pedro', isCurrentClub: true, played: 5, won: 4, lost: 1, setsFor: 13, setsAgainst: 5, points: 12 },
  { id: 'std-infm-3', categoryId: 'cat-infantil-masc', teamName: 'Costa del Voley', isCurrentClub: false, played: 5, won: 3, lost: 2, setsFor: 10, setsAgainst: 8, points: 9 },
  { id: 'std-infm-4', categoryId: 'cat-infantil-masc', teamName: 'San Estanislao', isCurrentClub: false, played: 5, won: 2, lost: 3, setsFor: 7, setsAgainst: 11, points: 5 },
  { id: 'std-infm-5', categoryId: 'cat-infantil-masc', teamName: 'CD Mijas Vóley', isCurrentClub: false, played: 5, won: 1, lost: 4, setsFor: 5, setsAgainst: 13, points: 4 },
  { id: 'std-infm-6', categoryId: 'cat-infantil-masc', teamName: 'CV Benalmádena', isCurrentClub: false, played: 5, won: 0, lost: 5, setsFor: 2, setsAgainst: 15, points: 0 },

  // 10. Infantil Femenino (MAIF26-1299)
  { id: 'std-inff-1', categoryId: 'cat-infantil-fem', teamName: 'C.D. Voleibol San Pedro', isCurrentClub: true, played: 6, won: 5, lost: 1, setsFor: 16, setsAgainst: 6, points: 15 },
  { id: 'std-inff-2', categoryId: 'cat-infantil-fem', teamName: 'Fundación Victoria', isCurrentClub: false, played: 6, won: 5, lost: 1, setsFor: 15, setsAgainst: 5, points: 14 },
  { id: 'std-inff-3', categoryId: 'cat-infantil-fem', teamName: 'Mijas Vóley Blanco', isCurrentClub: false, played: 6, won: 4, lost: 2, setsFor: 13, setsAgainst: 9, points: 11 },
  { id: 'std-inff-4', categoryId: 'cat-infantil-fem', teamName: 'Cártama Voley', isCurrentClub: false, played: 6, won: 2, lost: 4, setsFor: 9, setsAgainst: 13, points: 7 },
  { id: 'std-inff-5', categoryId: 'cat-infantil-fem', teamName: 'CV Marbella', isCurrentClub: false, played: 6, won: 1, lost: 5, setsFor: 6, setsAgainst: 16, points: 4 },
  { id: 'std-inff-6', categoryId: 'cat-infantil-fem', teamName: 'San Estanislao', isCurrentClub: false, played: 6, won: 1, lost: 5, setsFor: 4, setsAgainst: 17, points: 3 },
];

// Noticias estrictamente de voleibol con imágenes genéricas de voleibol pista/balón
export const INITIAL_ARTICLES: Article[] = [
  {
    id: 'art-1',
    title: 'El Senior Masculino ruge en el Sergio Scariolo ante más de 400 sampedreños',
    slug: 'senior-masculino-vence-derbi-sergio-scariolo',
    excerpt: 'Con un pabellón volcado animando al equipo, el conjunto sampedreño firmó una actuación soberbia en 1ª División Andaluza.',
    contentMarkdown: `El ambiente en el Pabellón Polideportivo Sergio Scariolo fue de los que quedan grabados en la memoria colectiva del voleibol sampedreño. Con las gradas completamente llenas por familias y aficionados locales, el C.D. Voleibol San Pedro firmó una actuación soberbia ante el CV Marbella (25-20, 25-23, 25-19).

### Dominio táctico y bloqueo asfixiante
Desde el primer punto, el colocador y capitán Alejandro García impuso un ritmo veloz y variado en la distribución. Los remates de David López y la contundencia de Mateo Fernández por zona dos desarticularon la defensa rival. En la red, el bloqueo sampedreño fue un auténtico muro.

### Un pabellón volcado con el voleibol formativo
Ver a los niños y niñas de las categorías de cantera animando detrás del banquillo con banderas y tambores es el verdadero triunfo de nuestro club. Seguimos trabajando con la máxima humildad de cara a los próximos choques de la FAVB.`,
    categoryId: 'cat-senior-masc-a',
    categoryName: 'Senior Masculino',
    coverImageUrl: 'https://images.unsplash.com/photo-1728971124745-423b12df446d?w=1200&auto=format&fit=crop&q=80',
    publishedAt: '2026-10-04T18:00:00.000Z',
    isFeatured: true,
    readingTimeMinutes: 3,
    galleryUrls: [
      'https://images.unsplash.com/photo-1729564615215-9df5ef19b971?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1553005746-9245ba190489?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1567880325673-ccc01edca61c?w=800&auto=format&fit=crop&q=80',
    ],
  },
  {
    id: 'art-2',
    title: 'Arrancan las Ligas Provinciales de Cantera de la FAVB con 8 equipos sampedreños',
    slug: 'arranque-ligas-provinciales-cantera-favb',
    excerpt: 'Nuestros equipos Júnior, Juvenil, Cadete e Infantil debutan este mes en las competiciones oficiales de la Federación Andaluza.',
    contentMarkdown: `La temporada 2026/2027 echa a rodar de forma oficial para toda la estructura deportiva del C.D. Voleibol San Pedro. En esta campaña competimos con 8 conjuntos de base en las Ligas Provinciales de Málaga organizadas por la FAVB (favoley.net): Júnior Masculino y Femenino, Juvenil Masculino y Femenino, Cadete Masculino y Femenino, e Infantil Masculino y Femenino.

El objetivo del club se mantiene intacto: formación deportiva, hábitos saludables y compañerismo en cada entrenamiento y partido en el Pabellón Sergio Scariolo.`,
    categoryId: 'cat-cantera',
    categoryName: 'Cantera FAVB',
    coverImageUrl: 'https://images.unsplash.com/photo-1547347298-4074fc3086f0?w=1200&auto=format&fit=crop&q=80',
    publishedAt: '2026-10-05T12:00:00.000Z',
    isFeatured: false,
    readingTimeMinutes: 2,
  },
  {
    id: 'art-3',
    title: 'Jornada de Tecnificación y Arbitraje con la Delegación Malagueña de Voleibol',
    slug: 'jornada-tecnificacion-arbitraje-sergio-scariolo',
    excerpt: 'El Pabellón Sergio Scariolo acoge un encuentro formativo para entrenadores y árbitros federados de la provincia.',
    contentMarkdown: `Este fin de semana nuestras instalaciones albergaron una sesión de actualización sobre el reglamento de voleibol FAVB y actas digitales, reforzando el compromiso de San Pedro Alcántara con el desarrollo integral de nuestro deporte.`,
    categoryId: 'cat-inst',
    categoryName: 'Institucional',
    coverImageUrl: 'https://images.unsplash.com/photo-1706206817521-6d74effeb6c7?w=1200&auto=format&fit=crop&q=80',
    publishedAt: '2026-09-28T09:00:00.000Z',
    isFeatured: false,
    readingTimeMinutes: 2,
  },
];

export const INITIAL_SPONSOR_TIERS: SponsorTier[] = [
  {
    id: 'sp-1',
    name: 'Comercio Amigo de San Pedro',
    priceAnnual: '250 € / temporada',
    description: 'Pensado para cafeterías, panaderías, talleres y comercios locales de San Pedro que quieren apoyar a los jóvenes del pueblo.',
    features: [
      'Logotipo y mención en la sección de Patrocinadores de la web oficial',
      'Distintivo físico adhesivo oficial: "Establecimiento Colaborador C.D.V. San Pedro"',
      'Menciones mensuales de agradecimiento en redes sociales oficiales (#VoleibolSanPedro)',
      'Acceso al club de empresas colaboradoras',
    ],
    isFeatured: false,
  },
  {
    id: 'sp-2',
    name: 'Lona en Pabellón Sergio Scariolo',
    priceAnnual: '600 € / temporada',
    description: 'Máxima visibilidad de marca en cada jornada de liga y torneos federados para empresas de Marbella, Estepona y la Costa del Sol.',
    features: [
      'Pancarta publicitaria de 3x1 metros a pie de pista o barandilla en el Pabellón Sergio Scariolo',
      'Presencia destacada en el faldón de la web oficial',
      'Agradecimiento por megafonía en los partidos de 1ª División Andaluza',
      'Dossier fotográfico de tu marca en pista para uso comercial propio',
    ],
    isFeatured: true,
  },
  {
    id: 'sp-3',
    name: 'Patrocinador de Cantera',
    priceAnnual: '1.500 € / temporada',
    description: 'Apoya el equipamiento y desplazamientos de las categorías de cantera del voleibol sampedreño.',
    features: [
      'Logotipo en la camiseta de juego oficial de categorías de Cantera',
      'Presencia en cartelería oficial física y digital',
      'Espacio editorial destacado en la web oficial y boletín informativo',
      'Agradecimiento especial en la clausura de temporada',
    ],
    isFeatured: false,
  },
];

export const INITIAL_CHANTS: Chant[] = [
  {
    id: 'chant-1',
    title: '¡Vamos mi San Pedro, a ganar!',
    rhythm: 'Palmas al compás acelerado',
    lyrics: `(Coro de grada)
¡Vamos mi San Pedro, hoy hay que ganar!
Desde Fuente Nueva hasta el bulevar,
¡Rojinegro el pecho, orgullo de verdad!
¡Punto a punto el Sergio Scariolo rugirá!
(Paaaaalmas: ¡San Pedro! ¡San Pedro! ¡Hey!)`,
  },
  {
    id: 'chant-2',
    title: 'San Pedro de mi vida',
    rhythm: 'Canto melódico con bufandas en alto',
    lyrics: `San Pedro de mi vida,
tú eres mi pasión,
defiéndeme esa bola,
con todo el corazón.
No importa la distancia,
ni quién esté enfrente,
¡el pueblo sampedreño
siempre está presente!`,
  },
  {
    id: 'chant-3',
    title: 'Bloqueo en la red',
    rhythm: 'Grito de guerra tras punto de bloqueo',
    lyrics: `¡Aquí no pasa nada!
¡Aquí mandamos hoy!
¡La red es una muralla,
de San Pedro yo soy!`,
  },
];

export const INITIAL_WALLPAPERS: WallpaperDownload[] = [
  {
    id: 'wp-1',
    title: 'Poder en la Red - Remate Espectacular',
    type: 'MOBILE',
    dimensions: '1080 x 1920 (9:16)',
    imageUrl: 'https://images.unsplash.com/photo-1686753767715-37cb0c34212c?w=1080&auto=format&fit=crop&q=80',
    downloadUrl: '/images/hero-spike.png',
  },
  {
    id: 'wp-2',
    title: 'Escudo Rojinegro - Fondo Estadio Carbono',
    type: 'DESKTOP',
    dimensions: '1920 x 1080 (16:9)',
    imageUrl: 'https://images.unsplash.com/photo-1728971121202-04896f2a35a4?w=1920&auto=format&fit=crop&q=80',
    downloadUrl: '/images/logo.jpg',
  },
  {
    id: 'wp-3',
    title: 'Cartel Oficial de Partido - Sergio Scariolo',
    type: 'POSTER',
    dimensions: 'A3 Formato PDF Alta Resolución',
    imageUrl: 'https://images.unsplash.com/photo-1666901356149-93f2eb3ba5a2?w=1200&auto=format&fit=crop&q=80',
    downloadUrl: '/images/hero-spike.png',
  },
];

// In-Memory Reactive Store
class DataStore {
  private categories: Category[] = [...INITIAL_CATEGORIES];
  private teams: Team[] = [...INITIAL_TEAMS];
  private players: Player[] = [...INITIAL_PLAYERS];
  private staff: Staff[] = [...INITIAL_STAFF];
  private matches: Match[] = [...INITIAL_MATCHES];
  private standings: Standings[] = [...INITIAL_STANDINGS];
  private articles: Article[] = [...INITIAL_ARTICLES];
  private sponsorTiers: SponsorTier[] = [...INITIAL_SPONSOR_TIERS];
  private sponsorInquiries: SponsorInquiry[] = [];
  private fanVotes: FanVote[] = [
    { id: 'fv-1', matchId: 'm-past-1', playerId: 'p-sma-2', ipHash: 'mock-1', createdAt: new Date().toISOString() },
    { id: 'fv-2', matchId: 'm-past-1', playerId: 'p-sma-2', ipHash: 'mock-2', createdAt: new Date().toISOString() },
    { id: 'fv-3', matchId: 'm-past-1', playerId: 'p-sma-1', ipHash: 'mock-3', createdAt: new Date().toISOString() },
  ];
  private pressAccreditations: PressAccreditation[] = [];
  private newsletterSubscribers: NewsletterSubscriber[] = [];
  private chants: Chant[] = [...INITIAL_CHANTS];
  private wallpapers: WallpaperDownload[] = [...INITIAL_WALLPAPERS];
  private mvpVotingActive: boolean = true;

  getCategories(): Category[] {
    return [...this.categories].sort((a, b) => a.order - b.order);
  }

  getTeams(): Team[] {
    return [...this.teams];
  }

  getTeamById(id: string): Team | undefined {
    return this.teams.find((t) => t.id === id);
  }

  getPlayers(teamId?: string): Player[] {
    if (teamId) {
      return this.players.filter((p) => p.teamId === teamId);
    }
    return [...this.players];
  }

  getStaff(teamId?: string): Staff[] {
    if (teamId) {
      return this.staff.filter((s) => s.teamId === teamId);
    }
    return [...this.staff];
  }

  getMatches(): Match[] {
    return [...this.matches].sort(
      (a, b) => new Date(a.matchDate).getTime() - new Date(b.matchDate).getTime()
    );
  }

  getFeaturedMatch(): Match | undefined {
    const featured = this.matches.find((m) => m.isFeatured);
    if (featured) return featured;
    return this.matches.find((m) => m.status === 'SCHEDULED');
  }

  getRecentMatches(): Match[] {
    return this.matches
      .filter((m) => m.status === 'FINISHED')
      .sort((a, b) => new Date(b.matchDate).getTime() - new Date(a.matchDate).getTime());
  }

  getUpcomingMatches(): Match[] {
    return this.matches
      .filter((m) => m.status === 'SCHEDULED')
      .sort((a, b) => new Date(a.matchDate).getTime() - new Date(b.matchDate).getTime());
  }

  getStandings(categoryId?: string): Standings[] {
    let list = [...this.standings];
    if (categoryId) {
      list = list.filter((s) => s.categoryId === categoryId);
    }
    return list.sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      const diffB = b.setsFor - b.setsAgainst;
      const diffA = a.setsFor - a.setsAgainst;
      return diffB - diffA;
    });
  }

  getArticles(): Article[] {
    return [...this.articles].sort(
      (a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
    );
  }

  getArticleBySlug(slug: string): Article | undefined {
    return this.articles.find((a) => a.slug === slug);
  }

  getSponsorTiers(): SponsorTier[] {
    return [...this.sponsorTiers];
  }

  getSponsorInquiries(): SponsorInquiry[] {
    return [...this.sponsorInquiries].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  addSponsorInquiry(inquiry: Omit<SponsorInquiry, 'id' | 'createdAt'>): SponsorInquiry {
    const newInquiry: SponsorInquiry = {
      ...inquiry,
      id: `inq-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      createdAt: new Date().toISOString(),
    };
    this.sponsorInquiries.unshift(newInquiry);
    return newInquiry;
  }

  getFanVotes(matchId?: string): FanVote[] {
    if (matchId) {
      return this.fanVotes.filter((v) => v.matchId === matchId);
    }
    return [...this.fanVotes];
  }

  getVoteCountForPlayer(playerId: string, matchId?: string): number {
    return this.fanVotes.filter(
      (v) => v.playerId === playerId && (!matchId || v.matchId === matchId)
    ).length;
  }

  hasUserVoted(matchId: string, ipHash: string): boolean {
    return this.fanVotes.some((v) => v.matchId === matchId && v.ipHash === ipHash);
  }

  addFanVote(matchId: string, playerId: string, ipHash: string): { success: boolean; message: string } {
    if (!this.mvpVotingActive) {
      return { success: false, message: 'La votación semanal de MVP está actualmente cerrada.' };
    }
    if (this.hasUserVoted(matchId, ipHash)) {
      return { success: false, message: 'Ya has registrado tu voto para este partido.' };
    }
    this.fanVotes.push({
      id: `vote-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      matchId,
      playerId,
      ipHash,
      createdAt: new Date().toISOString(),
    });
    return { success: true, message: '¡Voto registrado con éxito! Gracias por apoyar a nuestros deportistas.' };
  }

  isMvpVotingActive(): boolean {
    return this.mvpVotingActive;
  }

  setMvpVotingActive(active: boolean): void {
    this.mvpVotingActive = active;
  }

  resetFanVotes(): void {
    this.fanVotes = [];
  }

  getPressAccreditations(): PressAccreditation[] {
    return [...this.pressAccreditations].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  addPressAccreditation(data: Omit<PressAccreditation, 'id' | 'createdAt' | 'status'>): PressAccreditation {
    const acc: PressAccreditation = {
      ...data,
      id: `acc-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      status: 'PENDING',
      createdAt: new Date().toISOString(),
    };
    this.pressAccreditations.unshift(acc);
    return acc;
  }

  getNewsletterSubscribers(): NewsletterSubscriber[] {
    return [...this.newsletterSubscribers];
  }

  addNewsletterSubscriber(email: string): { success: boolean; message: string } {
    const cleanEmail = email.trim().toLowerCase();
    if (this.newsletterSubscribers.some((s) => s.email === cleanEmail)) {
      return { success: false, message: 'Este correo electrónico ya está suscrito al boletín oficial.' };
    }
    this.newsletterSubscribers.push({
      id: `sub-${Date.now()}`,
      email: cleanEmail,
      createdAt: new Date().toISOString(),
    });
    return { success: true, message: '¡Gracias por suscribirte al boletín del C.D. Voleibol San Pedro!' };
  }

  getChants(): Chant[] {
    return [...this.chants];
  }

  getWallpapers(): WallpaperDownload[] {
    return [...this.wallpapers];
  }
}

declare global {
  // eslint-disable-next-line no-var
  var __voleibolStore: DataStore | undefined;
}

export const store: DataStore = globalThis.__voleibolStore || new DataStore();
if (process.env.NODE_ENV !== 'production') {
  globalThis.__voleibolStore = store;
}
