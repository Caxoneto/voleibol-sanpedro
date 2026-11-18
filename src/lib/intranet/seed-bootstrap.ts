import { queryNeon } from '@/lib/streaming-store';
import {
  ROLES_CATALOG,
  PERMISSIONS_CATALOG,
  DEFAULT_ROLE_PERMISSIONS,
  CURRENT_SEASON_SEED,
  INITIAL_VENUES_AND_COURTS,
  INITIAL_TEAM_SEASONS,
} from './catalog';

let seedPromise: Promise<void> | null = null;
let seededAtMs = 0;
const SEED_CACHE_TTL_MS = 10 * 60 * 1000;

/**
 * Siembra de forma idempotente en Neon los catálogos base de la intranet:
 * roles, permisos, matriz inicial, temporada vigente, 16 equipos FAVB/AFADE y pabellones/pistas.
 */
export async function ensureIntranetSeeded(force = false): Promise<void> {
  if (!force && seededAtMs > 0 && Date.now() - seededAtMs < SEED_CACHE_TTL_MS) {
    return;
  }

  if (seedPromise && !force) {
    return seedPromise;
  }

  seedPromise = (async () => {
    try {
      const check = await queryNeon<{
        roles_cnt: string;
        perms_cnt: string;
        teams_cnt: string;
        venues_cnt: string;
      }>(
        `SELECT
           (SELECT COUNT(*) FROM intranet_roles)::text AS roles_cnt,
           (SELECT COUNT(*) FROM intranet_permissions)::text AS perms_cnt,
           (SELECT COUNT(*) FROM intranet_team_seasons WHERE season_id = $1)::text AS teams_cnt,
           (SELECT COUNT(*) FROM intranet_venues)::text AS venues_cnt;`,
        [CURRENT_SEASON_SEED.id]
      );

      const row = check[0];
      const alreadySeeded =
        !force &&
        row &&
        Number(row.roles_cnt) >= ROLES_CATALOG.length &&
        Number(row.perms_cnt) >= PERMISSIONS_CATALOG.length &&
        Number(row.teams_cnt) >= INITIAL_TEAM_SEASONS.length &&
        Number(row.venues_cnt) >= INITIAL_VENUES_AND_COURTS.length;

      if (alreadySeeded) {
        seededAtMs = Date.now();
        return;
      }

      // 1. Roles
      for (const role of ROLES_CATALOG) {
        await queryNeon(
          `INSERT INTO intranet_roles (code, name, description, is_system)
           VALUES ($1, $2, $3, true)
           ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description;`,
          [role.code, role.name, role.description]
        );
      }

      // 2. Permisos
      for (const perm of PERMISSIONS_CATALOG) {
        await queryNeon(
          `INSERT INTO intranet_permissions (code, module, name, default_scope, is_president_only)
           VALUES ($1, $2, $3, $4, $5)
           ON CONFLICT (code) DO UPDATE SET
             module = EXCLUDED.module,
             name = EXCLUDED.name,
             default_scope = EXCLUDED.default_scope,
             is_president_only = EXCLUDED.is_president_only;`,
          [perm.code, perm.module, perm.name, perm.defaultScope, perm.isPresidentOnly]
        );
      }

      // 3. Matriz inicial de permisos por rol (solo si la tabla está vacía o si faltan en PRESIDENTE)
      const rpCountRows = await queryNeon<{ cnt: string }>(
        `SELECT COUNT(*)::text AS cnt FROM intranet_role_permissions;`
      );
      const rpCount = Number(rpCountRows[0]?.cnt || 0);
      if (rpCount === 0 || force) {
        for (const [roleCode, perms] of Object.entries(DEFAULT_ROLE_PERMISSIONS)) {
          for (const p of perms) {
            await queryNeon(
              `INSERT INTO intranet_role_permissions (role_code, permission_code, scope)
               VALUES ($1, $2, $3)
               ON CONFLICT (role_code, permission_code) DO NOTHING;`,
              [roleCode, p.code, p.scope]
            );
          }
        }
      }

      // 4. Temporada actual
      await queryNeon(
        `INSERT INTO intranet_seasons (id, name, is_current, start_date, end_date)
         VALUES ($1, $2, true, $3, $4)
         ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;`,
        [
          CURRENT_SEASON_SEED.id,
          CURRENT_SEASON_SEED.name,
          CURRENT_SEASON_SEED.startDate,
          CURRENT_SEASON_SEED.endDate,
        ]
      );

      // 5. Equipos FAVB + AFADE
      for (const team of INITIAL_TEAM_SEASONS) {
        await queryNeon(
          `INSERT INTO intranet_team_seasons (
             id, season_id, category_id, name, division, association, gender, is_active, sort_order
           ) VALUES ($1, $2, $3, $4, $5, $6, $7, true, $8)
           ON CONFLICT (id) DO UPDATE SET
             category_id = EXCLUDED.category_id,
             name = EXCLUDED.name,
             division = EXCLUDED.division,
             association = EXCLUDED.association,
             gender = EXCLUDED.gender,
             sort_order = EXCLUDED.sort_order;`,
          [
            team.id,
            CURRENT_SEASON_SEED.id,
            team.categoryId,
            team.name,
            team.division,
            team.association,
            team.gender,
            team.sortOrder,
          ]
        );
      }

      // 6. Pabellones y pistas iniciales
      for (const v of INITIAL_VENUES_AND_COURTS) {
        await queryNeon(
          `INSERT INTO intranet_venues (id, name, address, maps_url, locality, is_home_venue, is_active)
           VALUES ($1, $2, $3, $4, $5, true, true)
           ON CONFLICT (id) DO UPDATE SET
             name = EXCLUDED.name,
             address = EXCLUDED.address,
             maps_url = COALESCE(EXCLUDED.maps_url, intranet_venues.maps_url);`,
          [v.id, v.venueName, v.address, v.mapsUrl || null, v.locality]
        );

        for (const c of v.courts) {
          await queryNeon(
            `INSERT INTO intranet_courts (id, venue_id, name, surface_type, is_active)
             VALUES ($1, $2, $3, $4, true)
             ON CONFLICT (id) DO UPDATE SET
               name = EXCLUDED.name,
               surface_type = EXCLUDED.surface_type;`,
            [c.id, v.id, c.name, c.surfaceType]
          );
        }
      }

      seededAtMs = Date.now();
    } finally {
      seedPromise = null;
    }
  })();

  return seedPromise;
}
