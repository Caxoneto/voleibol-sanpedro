import crypto from 'crypto';
import { queryNeon } from '@/lib/streaming-store';
import {
  ROLES_CATALOG,
  PERMISSIONS_CATALOG,
  DEFAULT_ROLE_PERMISSIONS,
  CURRENT_SEASON_SEED,
  INITIAL_VENUES_AND_COURTS,
  INITIAL_TEAM_SEASONS,
  INITIAL_CATEGORY_REGISTRATION_LINKS,
} from './catalog';

let seedPromise: Promise<void> | null = null;
let seededAtMs = 0;
const SEED_CACHE_TTL_MS = 10 * 60 * 1000;

/**
 * Asegura de forma idempotente las tablas y columnas complementarias añadidas en V2
 * (enlaces de auto-inscripción, solicitudes, avisos +15m, canal LOPIVI y programación de partidos).
 */
async function ensureIntranetSupplementalTables(): Promise<void> {
  await queryNeon(`
    CREATE TABLE IF NOT EXISTS public.intranet_category_registration_links (
      id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
      token text NOT NULL UNIQUE,
      category_code text NOT NULL,
      category_label text NOT NULL,
      default_team_season_id text REFERENCES public.intranet_team_seasons(id) ON DELETE SET NULL,
      season_id text NOT NULL REFERENCES public.intranet_seasons(id) ON DELETE CASCADE,
      is_active boolean DEFAULT true NOT NULL,
      submissions_count integer DEFAULT 0 NOT NULL,
      created_by uuid REFERENCES public.intranet_users(id) ON DELETE SET NULL,
      expires_at timestamp with time zone,
      created_at timestamp with time zone DEFAULT now() NOT NULL
    );
  `);
  await queryNeon(`
    CREATE INDEX IF NOT EXISTS idx_intranet_reg_links_cat
    ON public.intranet_category_registration_links USING btree (category_code, is_active);
  `);

  await queryNeon(`
    CREATE TABLE IF NOT EXISTS public.intranet_registration_requests (
      id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
      athlete_id text NOT NULL REFERENCES public.intranet_athletes(id) ON DELETE CASCADE,
      user_id uuid NOT NULL REFERENCES public.intranet_users(id) ON DELETE CASCADE,
      link_id uuid REFERENCES public.intranet_category_registration_links(id) ON DELETE SET NULL,
      category_code text NOT NULL,
      category_label text NOT NULL,
      selected_product_id uuid REFERENCES public.intranet_products(id) ON DELETE SET NULL,
      selected_price_plan_id uuid REFERENCES public.intranet_price_plans(id) ON DELETE SET NULL,
      is_minor boolean DEFAULT false NOT NULL,
      guardian_name text,
      contact_email text NOT NULL,
      contact_phone text,
      consent_image boolean DEFAULT false NOT NULL,
      consent_travel boolean DEFAULT false NOT NULL,
      consent_document_hash text,
      status text DEFAULT 'PENDING'::text NOT NULL,
      assigned_team_ids text[] DEFAULT '{}'::text[] NOT NULL,
      enrollment_id uuid REFERENCES public.intranet_enrollments(id) ON DELETE SET NULL,
      admin_notes text,
      reviewed_by uuid REFERENCES public.intranet_users(id) ON DELETE SET NULL,
      reviewed_at timestamp with time zone,
      created_at timestamp with time zone DEFAULT now() NOT NULL,
      pending_payload_enc text,
      CONSTRAINT intranet_registration_requests_status_check CHECK (status = ANY (ARRAY['PENDING'::text, 'APPROVED'::text, 'REJECTED'::text]))
    );
  `);
  await queryNeon(`
    ALTER TABLE public.intranet_registration_requests
    ADD COLUMN IF NOT EXISTS pending_payload_enc text,
    ADD COLUMN IF NOT EXISTS family_group_id uuid;
  `);
  await queryNeon(`
    CREATE INDEX IF NOT EXISTS idx_intranet_reg_requests_status
    ON public.intranet_registration_requests USING btree (status, created_at DESC);
  `);
  await queryNeon(`
    CREATE INDEX IF NOT EXISTS idx_intranet_reg_req_family_group
    ON public.intranet_registration_requests USING btree (family_group_id);
  `);
  await queryNeon(`
    ALTER TABLE public.intranet_applied_discounts
    ADD COLUMN IF NOT EXISTS sibling_athlete_ids text[] DEFAULT '{}'::text[];
  `);

  await queryNeon(`
    ALTER TABLE public.intranet_training_sessions
    ADD COLUMN IF NOT EXISTS assigned_coach_id uuid REFERENCES public.intranet_users(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS taken_by uuid REFERENCES public.intranet_users(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS taken_at timestamp with time zone;
  `);

  await queryNeon(`
    CREATE TABLE IF NOT EXISTS public.intranet_attendance_reminders (
      id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
      slot_id uuid REFERENCES public.intranet_training_slots(id) ON DELETE CASCADE,
      session_id uuid REFERENCES public.intranet_training_sessions(id) ON DELETE CASCADE,
      team_season_id text NOT NULL,
      madrid_date text NOT NULL,
      scheduled_start_time text NOT NULL,
      coach_user_id uuid REFERENCES public.intranet_users(id) ON DELETE SET NULL,
      coach_email text NOT NULL,
      sent_at timestamp with time zone DEFAULT now() NOT NULL,
      CONSTRAINT intranet_attendance_reminders_team_season_id_madrid_date_sc_key UNIQUE (team_season_id, madrid_date, scheduled_start_time, coach_email)
    );
  `);
  await queryNeon(`
    CREATE INDEX IF NOT EXISTS idx_intranet_att_rem_date
    ON public.intranet_attendance_reminders USING btree (madrid_date, team_season_id);
  `);

  await queryNeon(`
    CREATE TABLE IF NOT EXISTS public.intranet_lopivi_incidents (
      id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
      record_code text NOT NULL UNIQUE,
      channel text DEFAULT 'CANAL_WEB'::text NOT NULL,
      reporter_relationship text NOT NULL,
      is_anonymous boolean DEFAULT false NOT NULL,
      keep_identity_reserved boolean DEFAULT true NOT NULL,
      reporter_name_enc text,
      reporter_contact_enc text,
      minor_name_enc text,
      minor_age text,
      minor_category text,
      minor_team text,
      incident_date_text text,
      incident_location text NOT NULL,
      incident_types text[] DEFAULT '{}'::text[] NOT NULL,
      immediate_risk text DEFAULT 'NO_DETERMINADO'::text NOT NULL,
      description_enc text NOT NULL,
      measures_taken text[] DEFAULT '{}'::text[] NOT NULL,
      measures_description_enc text,
      authorities_notified text[] DEFAULT '{}'::text[] NOT NULL,
      authority_notification_date text,
      authority_recipient_enc text,
      authority_reference_enc text,
      follow_up_date text,
      follow_up_measures_enc text,
      follow_up_evolution_enc text,
      follow_up_actions_enc text,
      closed_date text,
      observations_enc text,
      status text DEFAULT 'RECIBIDA'::text NOT NULL,
      created_by_user_id uuid REFERENCES public.intranet_users(id) ON DELETE SET NULL,
      updated_by_user_id uuid REFERENCES public.intranet_users(id) ON DELETE SET NULL,
      created_at timestamp with time zone DEFAULT now() NOT NULL,
      updated_at timestamp with time zone DEFAULT now() NOT NULL,
      CONSTRAINT intranet_lopivi_incidents_channel_check CHECK (channel = ANY (ARRAY['CANAL_WEB'::text, 'PRESENCIAL'::text, 'TELEFONO'::text, 'EMAIL'::text, 'ESCRITO'::text, 'OTRO'::text])),
      CONSTRAINT intranet_lopivi_incidents_risk_check CHECK (immediate_risk = ANY (ARRAY['SI'::text, 'NO'::text, 'NO_DETERMINADO'::text])),
      CONSTRAINT intranet_lopivi_incidents_status_check CHECK (status = ANY (ARRAY['RECIBIDA'::text, 'EN_VALORACION'::text, 'MEDIDAS_ADOPTADAS'::text, 'DERIVADA_AUTORIDADES'::text, 'EN_SEGUIMIENTO'::text, 'CERRADA'::text]))
    );
  `);
  await queryNeon(`
    CREATE INDEX IF NOT EXISTS idx_intranet_lopivi_status
    ON public.intranet_lopivi_incidents USING btree (status, created_at DESC);
  `);

  await queryNeon(`
    CREATE TABLE IF NOT EXISTS public.intranet_match_schedules (
      match_id text PRIMARY KEY,
      team_season_id text NOT NULL,
      proposed_date text NOT NULL,
      proposed_time text NOT NULL,
      court_code text,
      venue_override text,
      locality_override text,
      departure_time_madrid text,
      schedule_status text DEFAULT 'PENDIENTE'::text NOT NULL,
      notes text,
      updated_by uuid REFERENCES public.intranet_users(id) ON DELETE SET NULL,
      updated_at timestamp with time zone DEFAULT now() NOT NULL
    );
  `);
  await queryNeon(`
    CREATE INDEX IF NOT EXISTS idx_intranet_match_sched_status
    ON public.intranet_match_schedules USING btree (schedule_status, proposed_date);
  `);
}

/**
 * Siembra de forma idempotente en Neon los catálogos base de la intranet:
 * roles, permisos, matriz inicial, temporada vigente, 28 equipos FAVB/AFADE,
 * pabellones/pistas, enlaces de inscripción por categoría y modalidades de cuota.
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
      await ensureIntranetSupplementalTables();

      const check = await queryNeon<{
        roles_cnt: string;
        perms_cnt: string;
        teams_cnt: string;
        venues_cnt: string;
        links_cnt: string;
        plans_cnt: string;
        sibling_rules_cnt: string;
      }>(
        `SELECT
           (SELECT COUNT(*) FROM intranet_roles)::text AS roles_cnt,
           (SELECT COUNT(*) FROM intranet_permissions)::text AS perms_cnt,
           (SELECT COUNT(*) FROM intranet_team_seasons WHERE season_id = $1)::text AS teams_cnt,
           (SELECT COUNT(*) FROM intranet_venues)::text AS venues_cnt,
           (SELECT COUNT(*) FROM intranet_category_registration_links WHERE season_id = $1)::text AS links_cnt,
           (SELECT COUNT(*) FROM intranet_price_plans pp INNER JOIN intranet_products p ON p.id = pp.product_id WHERE p.season_id = $1)::text AS plans_cnt,
           (SELECT COUNT(*) FROM intranet_discount_rules WHERE season_id = $1 AND kind = 'SIBLING' AND is_active = true)::text AS sibling_rules_cnt;`,
        [CURRENT_SEASON_SEED.id]
      );

      const row = check[0];
      const alreadySeeded =
        !force &&
        row &&
        Number(row.roles_cnt) >= ROLES_CATALOG.length &&
        Number(row.perms_cnt) >= PERMISSIONS_CATALOG.length &&
        Number(row.teams_cnt) >= INITIAL_TEAM_SEASONS.length &&
        Number(row.venues_cnt) >= INITIAL_VENUES_AND_COURTS.length &&
        Number(row.links_cnt) >= INITIAL_CATEGORY_REGISTRATION_LINKS.length &&
        Number(row.plans_cnt) >= 3 &&
        Number(row.sibling_rules_cnt) >= 2;

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

      // 7. Enlaces de auto-inscripción por categoría (uno por categoría oficial si aún no existe)
      const existingLinkCats = await queryNeon<{ category_code: string }>(
        `SELECT category_code FROM intranet_category_registration_links WHERE season_id = $1;`,
        [CURRENT_SEASON_SEED.id]
      );
      const existingCatSet = new Set(existingLinkCats.map((r) => r.category_code));
      for (const linkSeed of INITIAL_CATEGORY_REGISTRATION_LINKS) {
        if (existingCatSet.has(linkSeed.categoryCode)) continue;
        const slugPart = linkSeed.categoryCode.replace(/^cat-/, '');
        const randomSuffix = crypto.randomBytes(16).toString('base64url');
        const token = `${slugPart}-${randomSuffix}`;
        await queryNeon(
          `INSERT INTO intranet_category_registration_links (
             token, category_code, category_label, default_team_season_id, season_id, is_active
           ) VALUES ($1, $2, $3, $4, $5, true)
           ON CONFLICT (token) DO NOTHING;`,
          [
            token,
            linkSeed.categoryCode,
            linkSeed.categoryLabel,
            linkSeed.defaultTeamSeasonId,
            CURRENT_SEASON_SEED.id,
          ]
        );
      }

      // 8. Producto y modalidades de cuota habituales (Mensual, Trimestral, Anual) si faltan
      let productRows = await queryNeon<{ id: string }>(
        `SELECT id::text AS id
         FROM intranet_products
         WHERE season_id = $1 AND product_type = 'SEASON_FEE' AND is_active = true
         ORDER BY created_at ASC LIMIT 1;`,
        [CURRENT_SEASON_SEED.id]
      );
      if (productRows.length === 0) {
        productRows = await queryNeon<{ id: string }>(
          `INSERT INTO intranet_products (
             season_id, name, product_type, is_recurring, description, is_active
           ) VALUES (
             $1, $2, 'SEASON_FEE', true,
             'Cuota deportiva de temporada completa incluyendo entrenamientos, competición oficial y gestión federativa.',
             true
           ) RETURNING id::text AS id;`,
          [CURRENT_SEASON_SEED.id, `Cuota Temporada ${CURRENT_SEASON_SEED.name}`]
        );
      }
      const feeProductId = productRows[0]?.id;
      if (feeProductId) {
        const existingPlans = await queryNeon<{ periodicity: string }>(
          `SELECT periodicity FROM intranet_price_plans WHERE product_id = $1::uuid;`,
          [feeProductId]
        );
        const periodSet = new Set(existingPlans.map((p) => p.periodicity));
        const defaultPlans: Array<{
          name: string;
          periodicity: 'MONTHLY' | 'QUARTERLY' | 'ANNUAL';
          total: number;
          installments: number;
          months: number[];
          proration: 'NONE' | 'BY_REMAINING_MONTHS';
        }> = [
          {
            name: 'Mensual (Sep-May)',
            periodicity: 'MONTHLY',
            total: 270,
            installments: 9,
            months: [9, 10, 11, 12, 1, 2, 3, 4, 5],
            proration: 'BY_REMAINING_MONTHS',
          },
          {
            name: 'Trimestral (3 plazos)',
            periodicity: 'QUARTERLY',
            total: 260,
            installments: 3,
            months: [9, 12, 3],
            proration: 'NONE',
          },
          {
            name: 'Anual (Pago único)',
            periodicity: 'ANNUAL',
            total: 245,
            installments: 1,
            months: [9],
            proration: 'NONE',
          },
        ];
        for (const dp of defaultPlans) {
          if (periodSet.has(dp.periodicity)) continue;
          await queryNeon(
            `INSERT INTO intranet_price_plans (
               product_id, name, periodicity, total_amount, installments_count, due_day,
               active_months, proration_mode, initial_fee_amount, is_active
             ) VALUES ($1::uuid, $2, $3, $4, $5, 5, $6::integer[], $7, 0, true);`,
            [
              feeProductId,
              dp.name,
              dp.periodicity,
              dp.total,
              dp.installments,
              dp.months,
              dp.proration,
            ]
          );
        }

        // 9. Reglas de descuento familiares idempotentes (2º Hermano y 3º Hermano)
        const existingDiscRows = await queryNeon<{ name: string; kind: string }>(
          `SELECT name, kind FROM intranet_discount_rules WHERE season_id = $1;`,
          [CURRENT_SEASON_SEED.id]
        );
        const hasSecondSibling = existingDiscRows.some((r) => /2[ºo]/i.test(r.name) && /hermano/i.test(r.name));
        const hasThirdSibling = existingDiscRows.some((r) => /3[ºoer]{1,2}/i.test(r.name) && /hermano/i.test(r.name));
        if (!hasSecondSibling) {
          await queryNeon(
            `INSERT INTO intranet_discount_rules (
               season_id, name, kind, value_type, value, applicable_product_ids, stackable, requires_reason, is_active
             ) VALUES ($1, '2º Hermano (-10€)', 'SIBLING', 'FIXED', 10, ARRAY[$2::uuid], false, false, true);`,
            [CURRENT_SEASON_SEED.id, feeProductId]
          );
        }
        if (!hasThirdSibling) {
          await queryNeon(
            `INSERT INTO intranet_discount_rules (
               season_id, name, kind, value_type, value, applicable_product_ids, stackable, requires_reason, is_active
             ) VALUES ($1, '3º Hermano (-20€)', 'SIBLING', 'FIXED', 20, ARRAY[$2::uuid], false, false, true);`,
            [CURRENT_SEASON_SEED.id, feeProductId]
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
