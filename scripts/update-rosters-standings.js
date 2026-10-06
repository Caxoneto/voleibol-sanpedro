const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../src/lib/data-store.ts');
let content = fs.readFileSync(filePath, 'utf8');

const newPlayers = `export const INITIAL_PLAYERS: Player[] = [
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
];`;

const newStandings = `export const INITIAL_STANDINGS: Standings[] = [
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
];`;

// Replace INITIAL_PLAYERS
const playersRegex = /export const INITIAL_PLAYERS: Player\[\] = \[[\s\S]*?\n\];/;
content = content.replace(playersRegex, newPlayers);

// Replace INITIAL_STANDINGS
const standingsRegex = /export const INITIAL_STANDINGS: Standings\[\] = \[[\s\S]*?\n\];/;
content = content.replace(standingsRegex, newStandings);

fs.writeFileSync(filePath, content, 'utf8');
console.log('Successfully updated data-store.ts with full rosters (10+ per category) and standings for all 10 categories!');
