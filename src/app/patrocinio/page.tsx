'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  AlertCircle,
  ArrowRight,
  Award,
  Bus,
  CheckCircle2,
  ChevronDown,
  Dumbbell,
  ExternalLink,
  GraduationCap,
  Handshake,
  Loader2,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
  ShieldCheck,
  Shirt,
  Sparkles,
  Trophy,
  Users,
} from 'lucide-react';
import { INITIAL_SPONSOR_TIERS, CURRENT_SPONSORS, CLUB_INFO } from '@/lib/public-content';
import { sanitizeHttpsUrl } from '@/lib/validators';

const SPONSOR_LEGAL_VERSION = 'v3_2026_rgpd_patrocinio';

const FEDERATED_TEAMS_SUMMARY = [
  { category: 'SÉNIOR', detail: '1 femenino • 1 masculino' },
  { category: 'JUVENILES', detail: '2 femeninos • 1 masculino' },
  { category: 'CADETE', detail: '2 femeninos • 1 masculino' },
  { category: 'INFANTILES', detail: '3 femeninos • 1 masculino' },
  { category: 'ALEVINES', detail: '6 femeninos • 2 masculinos' },
  { category: 'BENJAMÍN', detail: '2 femeninos • 1 masculino' },
];

const OTHER_PROGRAMS = [
  '3 equipos AFADE',
  '1 equipo Amateur',
  '4 equipos de iniciación',
  '2 grupos de iniciación al deporte',
];

const SPONSORSHIP_DESTINATIONS = [
  {
    id: 'dest-arbitrajes',
    Icon: Trophy,
    title: 'Arbitrajes',
    description:
      'Ayudar a cubrir los costes de competición de una estructura con más de 150 partidos por temporada.',
  },
  {
    id: 'dest-transporte',
    Icon: Bus,
    title: 'Transporte',
    description:
      'Disponer de un vehículo compartido para coordinar desplazamientos de equipos y personal.',
  },
  {
    id: 'dest-material',
    Icon: Dumbbell,
    title: 'Material',
    description:
      'Incorporar gomas, foam y otros recursos específicos para los entrenamientos.',
  },
  {
    id: 'dest-visibilidad',
    Icon: Shirt,
    title: 'Visibilidad',
    description:
      'Producir 400 camisetas de entrenamiento, banners de pista y un photocall móvil.',
  },
];

const COMPANY_BENEFITS = [
  'Presencia en los canales digitales y redes sociales del club.',
  'Presentación como nueva empresa colaboradora.',
  'Inclusión en el listado oficial de patrocinadores.',
  'Logotipo en banners situados en las pistas de entrenamiento.',
  'Presencia en photocall y soportes utilizados durante actividades y eventos.',
  'Logotipo en las camisetas oficiales de entrenamiento.',
  'Participación en encuentros y acciones dirigidas a las familias del club.',
  'Publicaciones específicas vinculadas a la actividad de la empresa.',
  'Posibilidad de desarrollar promociones o ventajas para la comunidad del club.',
  'Asociación de la marca con proyectos concretos como cantera, movilidad, material deportivo o torneos.',
];

const NAMING_PROJECTS = [
  {
    id: 'proj-movilidad',
    name: 'Movilidad del Club',
    title: 'Movilidad del Club',
    Icon: Bus,
    description:
      'Vehículo de nueve plazas mediante renting o colaboración. Visibilidad durante desplazamientos y competiciones.',
    accent: true,
  },
  {
    id: 'proj-camisetas',
    name: 'Camisetas de Entrenamiento',
    title: 'Camisetas de Entrenamiento',
    Icon: Shirt,
    description:
      'Patrocinio total o por categoría de las 400 camisetas previstas para la temporada.',
    accent: false,
  },
  {
    id: 'proj-cantera',
    name: 'Cantera y Formación',
    title: 'Cantera y Formación',
    Icon: GraduationCap,
    description:
      'Apoyo a iniciación, formación técnica, material específico y desarrollo de entrenadores.',
    accent: false,
  },
  {
    id: 'proj-torneos',
    name: 'Torneos y Eventos',
    title: 'Torneos y Eventos',
    Icon: Trophy,
    description:
      'Colaboración vinculada a encuentros, torneos, photocall y acciones con las familias del club.',
    accent: true,
  },
];

export default function PatrocinioPage() {
  const [selectedTier, setSelectedTier] = useState<string>('Patrocinador Oficial');
  const [submitted, setSubmitted] = useState<boolean>(false);
  const [submittedTier, setSubmittedTier] = useState<string>('Patrocinador Oficial');
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const [form, setForm] = useState({
    companyName: '',
    contactPerson: '',
    phone: '',
    email: '',
    message: '',
    privacyAccepted: false,
    website: '', // Honeypot anti-bots
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    if (!form.privacyAccepted) {
      setSubmitError('Debes aceptar expresamente la Política de Privacidad para enviar la solicitud.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/public/sponsor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyName: form.companyName.trim(),
          contactPerson: form.contactPerson.trim(),
          phone: form.phone.trim(),
          email: form.email.trim(),
          packageInterested: selectedTier,
          message: form.message.trim(),
          privacyAccepted: form.privacyAccepted,
          legalVersion: SPONSOR_LEGAL_VERSION,
          website: form.website,
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.success) {
        setSubmitError(data?.error || 'No se pudo registrar la solicitud. Revisa los campos e inténtalo de nuevo.');
        return;
      }

      setSubmittedTier(selectedTier);
      setSubmitted(true);
      setForm({
        companyName: '',
        contactPerson: '',
        phone: '',
        email: '',
        message: '',
        privacyAccepted: false,
        website: '',
      });
    } catch {
      setSubmitError('Error de conexión con el servidor. Inténtalo de nuevo en unos instantes.');
    } finally {
      setSubmitting(false);
    }
  };

  const generateWhatsAppUrl = (tierName: string) => {
    const text = encodeURIComponent(
      `Hola Alberto, me comunico en nombre de "${form.companyName || 'mi empresa'}" y nos gustaría recibir información sobre la modalidad "${tierName}" del Proyecto de Patrocinio 2026/2027 del C.D. Voleibol San Pedro.`
    );
    return `https://wa.me/34657713771?text=${text}`;
  };

  return (
    <div className="w-full min-h-screen bg-background relative overflow-hidden">
      {/* Subtle Page-Wide Ambient Background */}
      <div
        className="pointer-events-none fixed inset-0 w-full h-full bg-cover bg-center mix-blend-luminosity opacity-[0.14] blur-[3px] z-0"
        style={{ backgroundImage: "url('/images/pabellon-sergio-scariolo.jpg')" }}
      />

      {/* Cabecera Hero — Proyecto de Patrocinio 2026 / 2027 (Pág. 1 del Dossier) */}
      <section className="relative w-full bg-surface-container-lowest px-4 lg:px-8 py-12 sm:py-16 border-b border-white/5 overflow-hidden">
        {/* Background Image (Pabellón Sergio Scariolo) with slight blur */}
        <div
          className="pointer-events-none absolute inset-0 w-full h-full bg-cover bg-center mix-blend-luminosity opacity-40 blur-[2px] scale-105 animate-hero-bg transition-transform duration-1000"
          style={{ backgroundImage: "url('/images/pabellon-sergio-scariolo.jpg')" }}
        />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-background via-background/70 to-transparent" />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-background via-background/85 to-transparent" />

        <div className="absolute -right-20 -top-24 w-96 h-96 rounded-full bg-primary-container/15 blur-3xl pointer-events-none" />
        <div className="max-w-7xl mx-auto relative z-10 flex flex-col lg:flex-row lg:items-end justify-between gap-8">
          <div className="max-w-3xl">
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-primary-container text-white text-[11px] uppercase font-bold tracking-widest">
                PROYECTO DE PATROCINIO 2026 / 2027
              </span>
              <span className="text-xs text-tertiary uppercase tracking-wider font-semibold">
                C.D. VOLEIBOL SAN PEDRO
              </span>
            </div>
            <h1 className="font-display-xl text-4xl sm:text-5xl lg:text-6xl uppercase tracking-tight leading-none">
              <span className="text-white">PROYECTO DE </span>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-container via-red-500 to-secondary-fixed-dim">
                PATROCINIO 2026 / 2027
              </span>
            </h1>
            <p className="font-body-md text-sm sm:text-base text-tertiary mt-3 leading-relaxed">
              Una propuesta abierta para empresas que quieran apoyar el deporte local y acompañar el crecimiento del club.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
            <a
              href="#modalidades"
              className="inline-flex items-center justify-center gap-2 px-5 py-3 bg-primary-container hover:bg-cta-hover text-white font-label-md text-xs uppercase tracking-wider font-bold transition-all shadow-[4px_4px_0px_0px_#0e0e0e] active:translate-x-[1px] active:translate-y-[1px]"
            >
              <Award className="w-[18px] h-[18px]" aria-hidden="true" />
              <span>Modalidades de colaboración</span>
            </a>
            <a
              href={generateWhatsAppUrl(selectedTier)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 px-5 py-3 bg-[#25D366] hover:bg-[#20ba59] text-black font-label-md text-xs uppercase tracking-wider font-bold transition-all shadow-lg"
            >
              <MessageCircle className="w-[18px] h-[18px]" aria-hidden="true" />
              <span>WhatsApp Directo</span>
            </a>
          </div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 lg:px-8 py-12 space-y-16 sm:space-y-20 relative z-10">
        {/* 1. EMPRESAS QUE YA FORMAN PARTE DEL EQUIPO (Pág. 11 del Dossier) */}
        <section aria-labelledby="current-sponsors-heading" className="relative bg-surface-container-low border border-primary-container/30 p-6 sm:p-10 shadow-[0_0_40px_rgba(217,4,41,0.08)]">
          <div className="pb-6 border-b border-white/10">
            <h2 id="current-sponsors-heading" className="font-display-xl text-3xl sm:text-4xl uppercase text-white">
              EMPRESAS QUE YA FORMAN{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-container via-red-500 to-secondary-fixed-dim">
                PARTE DEL EQUIPO
              </span>
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4 pt-8">
            {CURRENT_SPONSORS.map((sponsor) => (
              <a
                key={sponsor.id}
                href={sanitizeHttpsUrl(sponsor.url, '#')}
                target="_blank"
                rel="noopener noreferrer"
                title={sponsor.name}
                aria-label={`Visitar web o perfil oficial de ${sponsor.name}`}
                className={`group relative h-[166px] sm:h-[200px] p-3.5 sm:p-4 flex items-center justify-center rounded-sm border border-white/15 hover:border-primary-container transition-all duration-300 ease-out hover:scale-105 hover:z-10 hover:shadow-[0_12px_30px_rgba(217,4,41,0.28)] shadow-md overflow-hidden ${
                  sponsor.bgClass || 'bg-white'
                }`}
              >
                <Image
                  src={sponsor.logoUrl}
                  alt={sponsor.name}
                  width={325}
                  height={175}
                  className="h-[112px] sm:h-[140px] w-full max-w-[230px] sm:max-w-[205px] object-contain transition-transform duration-300 ease-out group-hover:scale-[1.15]"
                />
                <ExternalLink
                  className="w-4 h-4 absolute top-2.5 right-2.5 opacity-0 group-hover:opacity-80 transition-opacity text-primary"
                  aria-hidden="true"
                />
              </a>
            ))}
          </div>
        </section>

        {/* 2. MÁS DE 25 AÑOS ALREDEDOR DEL VOLEIBOL & UN CLUB CON ALCANCE REAL EN SAN PEDRO (Págs. 3 y 4) */}
        <section aria-labelledby="reach-heading" className="space-y-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            <div className="lg:col-span-5 space-y-4">
              <span className="text-xs text-primary font-bold uppercase tracking-widest block">
                MÁS DE 25 AÑOS ALREDEDOR DEL VOLEIBOL
              </span>
              <h2 id="reach-heading" className="font-display-xl text-3xl sm:text-4xl uppercase text-white leading-tight">
                UN CLUB CON ALCANCE REAL EN{' '}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-container via-red-500 to-secondary-fixed-dim">
                  SAN PEDRO
                </span>
              </h2>
              <p className="text-xs sm:text-sm text-tertiary leading-relaxed">
                El <strong className="text-white">C.D. Voleibol San Pedro</strong> entiende el deporte como una escuela de convivencia y ha triplicado su base social en dos temporadas, abriendo una nueva etapa de crecimiento junto a entidades colaboradoras.
              </p>
            </div>

            {/* Tarjetas de Cifras Clave del Dossier (Págs. 3 y 4) */}
            <div className="lg:col-span-7 grid grid-cols-2 sm:grid-cols-3 gap-4">
              <div className="bg-surface-container-low border border-white/10 p-5 flex flex-col justify-center">
                <span className="font-display-xl text-4xl sm:text-5xl text-primary block leading-none">350</span>
                <span className="text-xs text-white font-bold uppercase tracking-wider mt-2 block">
                  jugadores y jugadoras
                </span>
              </div>

              <div className="bg-surface-container-low border border-white/10 p-5 flex flex-col justify-center">
                <span className="font-display-xl text-4xl sm:text-5xl text-white block leading-none">33</span>
                <span className="text-xs text-white font-bold uppercase tracking-wider mt-2 block">
                  equipos y grupos deportivos en total
                </span>
              </div>

              <div className="bg-surface-container-low border border-white/10 p-5 flex flex-col justify-center">
                <span className="font-display-xl text-4xl sm:text-5xl text-primary block leading-none">150+</span>
                <span className="text-xs text-white font-bold uppercase tracking-wider mt-2 block">
                  partidos por temporada
                </span>
              </div>

              <div className="bg-surface-container-low border border-white/10 p-5 flex flex-col justify-center">
                <span className="font-display-xl text-4xl sm:text-5xl text-white block leading-none">17</span>
                <span className="text-xs text-white font-bold uppercase tracking-wider mt-2 block">
                  personas en el equipo técnico
                </span>
              </div>

              <div className="bg-surface-container-low border border-white/10 p-5 flex flex-col justify-center">
                <span className="font-display-xl text-4xl sm:text-5xl text-primary block leading-none">+25</span>
                <span className="text-xs text-white font-bold uppercase tracking-wider mt-2 block">
                  años de historia
                </span>
                <span className="text-[11px] text-tertiary block mt-1">
                  Crecimiento x3 en dos temporadas
                </span>
              </div>

              <div className="bg-surface-container-low border border-primary-container/40 p-5 flex flex-col justify-between">
                <div>
                  <span className="font-display-xl text-4xl sm:text-5xl text-primary block leading-none">80%</span>
                  <span className="text-xs text-white font-bold uppercase tracking-wider mt-2 block">
                    participación femenina
                  </span>
                </div>
                <div className="mt-2">
                  <div className="w-full h-2 bg-white/15 rounded-full overflow-hidden flex">
                    <div className="w-[80%] bg-primary-container h-full" />
                  </div>
                  <span className="text-[10px] text-tertiary uppercase font-semibold mt-1 block">
                    20% masculina
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Desglose de Estructura Deportiva, Equipo Técnico e Instalaciones (Págs. 5 y 6) */}
          <div className="space-y-4 pt-2">
            <h3 className="font-display-xl text-2xl sm:text-3xl uppercase text-white">
              DEL PRIMER CONTACTO CON EL DEPORTE A CATEGORÍA SÉNIOR
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Col 1: Equipos Federados */}
              <div className="bg-surface-container-low border border-white/5 p-6 space-y-4">
                <div className="flex items-center gap-2 border-b border-white/10 pb-3">
                  <Sparkles className="w-5 h-5 text-primary shrink-0" aria-hidden="true" />
                  <h4 className="font-display-xl text-xl uppercase text-white">
                    Equipos Federados
                  </h4>
                </div>
                <ul className="space-y-2.5 text-xs">
                  {FEDERATED_TEAMS_SUMMARY.map((item) => (
                    <li key={item.category} className="flex items-center justify-between border-b border-white/5 pb-1.5">
                      <span className="font-bold text-primary uppercase tracking-wider">{item.category}</span>
                      <span className="text-on-surface font-medium">{item.detail}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Col 2: Otros Programas */}
              <div className="bg-surface-container-low border border-white/5 p-6 flex flex-col justify-between space-y-4">
                <div className="space-y-4">
                  <div className="flex items-center gap-2 border-b border-white/10 pb-3">
                    <Users className="w-5 h-5 text-primary shrink-0" aria-hidden="true" />
                    <h4 className="font-display-xl text-xl uppercase text-white">
                      Otros Programas
                    </h4>
                  </div>
                  <ul className="space-y-2.5 text-xs text-on-surface">
                    {OTHER_PROGRAMS.map((prog) => (
                      <li key={prog} className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 bg-primary-container shrink-0" aria-hidden="true" />
                        <span className="font-semibold">{prog}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Col 3: Equipo Técnico e Instalaciones (Pág. 6) */}
              <div className="bg-surface-container-low border border-white/5 p-6 flex flex-col justify-between space-y-4">
                <div className="space-y-3">
                  <div className="border-b border-white/10 pb-3">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-5 h-5 text-primary shrink-0" aria-hidden="true" />
                      <h4 className="font-display-xl text-xl uppercase text-white">
                        Equipo Técnico e Instalaciones
                      </h4>
                    </div>
                    <p className="text-[11px] text-tertiary mt-0.5">
                      Personas e instalaciones que sostienen el proyecto
                    </p>
                  </div>

                  <div className="space-y-2.5 text-xs">
                    <div>
                      <span className="text-primary font-bold uppercase tracking-wider block">
                        15 entrenadores • 2 coordinadores
                      </span>
                      <p className="text-tertiary mt-0.5">
                        4 con nivel 3 nacional • 3 con nivel 2 • 8 con nivel 1 • Coordinador general y Coordinador deportivo.
                      </p>
                    </div>
                    <div className="pt-2 border-t border-white/5">
                      <span className="text-primary font-bold uppercase tracking-wider block">
                        3 instalaciones
                      </span>
                      <ul className="text-on-surface space-y-1 mt-1">
                        <li>• Pabellón Sergio Scariolo</li>
                        <li>• IES Nueva Andalucía*</li>
                        <li>• Colegio Laude*</li>
                      </ul>
                      <span className="text-[10px] text-tertiary block mt-1">*proyecto privado</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 3. EL PATROCINIO MEJORA LA EXPERIENCIA DEPORTIVA Y QUÉ APORTA EL CLUB (Págs. 7 y 8) */}
        <section aria-labelledby="value-prop-heading" className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Izquierda: El patrocinio mejora la experiencia deportiva (Pág. 7) */}
          <div className="lg:col-span-6 bg-surface-container-low border border-white/5 p-6 sm:p-8 flex flex-col justify-between space-y-6">
            <div>
              <h2 id="value-prop-heading" className="font-display-xl text-2xl sm:text-3xl uppercase text-white">
                EL PATROCINIO MEJORA LA EXPERIENCIA DEPORTIVA
              </h2>
              <p className="text-xs text-tertiary mt-2 leading-relaxed">
                Queremos que el crecimiento del club vaya acompañado de una mejora real en la experiencia de nuestros jugadores, jugadoras, entrenadores y familias.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6">
                {SPONSORSHIP_DESTINATIONS.map((item) => {
                  const IconComponent = item.Icon;
                  return (
                    <div key={item.id} className="bg-surface-container-lowest border border-white/10 p-4 space-y-2">
                      <div className="flex items-center gap-2">
                        <IconComponent className="w-5 h-5 text-primary shrink-0" aria-hidden="true" />
                        <h3 className="font-headline-sm text-sm uppercase font-bold text-white">
                          {item.title}
                        </h3>
                      </div>
                      <p className="text-xs text-tertiary leading-relaxed">{item.description}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Derecha: Qué aporta el club a las empresas (Pág. 8) */}
          <div className="lg:col-span-6 bg-surface-container-low border border-white/5 p-6 sm:p-8 flex flex-col justify-between space-y-6">
            <div>
              <h2 className="font-display-xl text-2xl sm:text-3xl uppercase text-white">
                QUÉ APORTA EL CLUB A LAS EMPRESAS
              </h2>
              <p className="text-xs text-tertiary mt-2 leading-relaxed">
                Colaborar con el C. D. Voleibol San Pedro permite vincular la marca de la empresa con un proyecto deportivo consolidado, de carácter local y con una amplia participación de jóvenes y familias.
              </p>

              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2.5 mt-5">
                {COMPANY_BENEFITS.slice(0, 4).map((benefit, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-xs text-on-surface">
                    <CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" aria-hidden="true" />
                    <span className="leading-snug">{benefit}</span>
                  </li>
                ))}
              </ul>

              {COMPANY_BENEFITS.length > 4 && (
                <details className="group mt-4 border border-white/10 bg-surface-container-lowest">
                  <summary className="flex cursor-pointer list-none items-center justify-between px-3.5 py-2.5 text-xs font-semibold text-primary hover:text-white transition-colors [&::-webkit-details-marker]:hidden">
                    <span>Ver todos los beneficios comunicativos y fiscales ({COMPANY_BENEFITS.length - 4} más)</span>
                    <ChevronDown className="w-4 h-4 shrink-0 transition-transform group-open:rotate-180" aria-hidden="true" />
                  </summary>
                  <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2.5 border-t border-white/10 p-3.5">
                    {COMPANY_BENEFITS.slice(4).map((benefit, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-xs text-on-surface">
                        <CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" aria-hidden="true" />
                        <span className="leading-snug">{benefit}</span>
                      </li>
                    ))}
                  </ul>
                </details>
              )}
            </div>

            <p className="text-[11px] text-tertiary border-t border-white/10 pt-4">
              Las contraprestaciones se adaptarán al importe, duración y características de cada colaboración.
            </p>
          </div>
        </section>

        {/* 4. MODALIDADES DE COLABORACIÓN (Pág. 9) */}
        <section id="modalidades" aria-labelledby="tiers-heading" className="space-y-6 scroll-mt-28">
          <div className="text-center max-w-2xl mx-auto">
            <h2 id="tiers-heading" className="font-display-xl text-3xl sm:text-4xl uppercase text-white">
              MODALIDADES DE{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-container via-red-500 to-secondary-fixed-dim">
                COLABORACIÓN
              </span>
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 pt-4">
            {INITIAL_SPONSOR_TIERS.map((tier) => (
              <div
                key={tier.id}
                className={`flex flex-col justify-between p-6 transition-all relative ${
                  tier.isFeatured
                    ? 'bg-gradient-to-b from-primary-container/25 to-surface-container-low border-2 border-primary-container shadow-[0_0_30px_rgba(217,4,41,0.2)]'
                    : 'bg-surface-container-low border border-white/10 hover:border-white/25'
                }`}
              >
                <div>
                  <h3 className="font-display-xl text-2xl uppercase text-white leading-tight">
                    {tier.name}
                  </h3>
                  <div className="font-display-xl text-3xl sm:text-4xl text-primary mt-2 mb-4">
                    {tier.priceAnnual}
                  </div>
                  {tier.description && (
                    <p className="font-body-sm text-xs text-tertiary mb-5 leading-relaxed">
                      {tier.description}
                    </p>
                  )}

                  <div className="space-y-2.5 border-t border-white/10 pt-4">
                    {tier.features.map((feat, idx) => (
                      <div key={idx} className="flex items-start gap-2 text-xs text-on-surface">
                        <CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" aria-hidden="true" />
                        <span>{feat}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-6 mt-6 border-t border-white/5">
                  <a
                    href="#contacto"
                    onClick={() => setSelectedTier(tier.name)}
                    className={`w-full py-3 text-center block font-label-md text-xs uppercase font-bold tracking-wider transition-all shadow ${
                      tier.isFeatured
                        ? 'bg-primary-container hover:bg-cta-hover text-white'
                        : 'bg-surface-container-high hover:bg-primary-container text-white'
                    }`}
                  >
                    Seleccionar {tier.name}
                  </a>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* 5. PROYECTOS QUE PUEDEN LLEVAR EL NOMBRE DE UNA EMPRESA (Pág. 10) */}
        <section aria-labelledby="projects-heading" className="space-y-6">
          <div>
            <h2 id="projects-heading" className="font-display-xl text-3xl sm:text-4xl uppercase text-white">
              PROYECTOS QUE PUEDEN LLEVAR EL{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-container via-red-500 to-secondary-fixed-dim">
                NOMBRE DE UNA EMPRESA
              </span>
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {NAMING_PROJECTS.map((proj) => {
              const ProjectIcon = proj.Icon;
              return (
                <div
                  key={proj.id}
                  className={`p-6 border flex flex-col justify-between transition-all ${
                    proj.accent
                      ? 'bg-primary-container/10 border-primary-container/30 hover:border-primary-container'
                      : 'bg-surface-container-low border-white/10 hover:border-white/25'
                  }`}
                >
                  <div className="space-y-3">
                    <div className="w-10 h-10 bg-surface-container-highest border border-white/10 flex items-center justify-center text-primary">
                      <ProjectIcon className="w-5 h-5" aria-hidden="true" />
                    </div>
                    <h3 className="font-display-xl text-xl uppercase text-white">
                      {proj.title}
                    </h3>
                    <p className="text-xs text-tertiary leading-relaxed">
                      {proj.description}
                    </p>
                  </div>

                  <div className="pt-5 mt-5 border-t border-white/10">
                    <a
                      href="#contacto"
                      onClick={() => setSelectedTier(proj.name)}
                      className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-primary hover:text-white transition-colors"
                    >
                      <span>Consultar este proyecto</span>
                      <ArrowRight className="w-4 h-4" aria-hidden="true" />
                    </a>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* 6. ¿HACEMOS EQUIPO? — CONTACTO DIRECTO Y FORMULARIO (Pág. 12) */}
        <section id="contacto" className="bg-surface-container-low border border-white/10 p-6 sm:p-10 scroll-mt-28">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Tarjeta de Contacto Directo del Presidente (Pág. 12 del Dossier) */}
            <div className="lg:col-span-5 bg-gradient-to-br from-primary-container to-[#9e021d] p-6 sm:p-8 text-white space-y-6 shadow-xl">
              <div>
                <h2 className="font-display-xl text-3xl sm:text-4xl uppercase leading-none">
                  ¿HACEMOS EQUIPO?
                </h2>
                <p className="text-xs sm:text-sm text-white/95 mt-3 leading-relaxed">
                  La colaboración de las empresas ayuda al club a ofrecer una experiencia deportiva mejor a 350 jugadores y jugadoras de San Pedro
                </p>
              </div>

              <div className="space-y-3 pt-4 border-t border-white/20 text-xs sm:text-sm">
                <div>
                  <p className="font-bold text-base">C.D. Voleibol San Pedro</p>
                  <p className="text-white/95 text-sm">Alberto Alcántara González • Presidente</p>
                </div>

                <div className="pt-2 space-y-2">
                  <a
                    href="tel:+34657713771"
                    className="flex items-center gap-2.5 text-white hover:underline font-mono font-bold text-sm"
                  >
                    <Phone className="w-[18px] h-[18px] shrink-0" aria-hidden="true" />
                    <span>M. 657 71 37 71</span>
                  </a>
                  <a
                    href={`mailto:${CLUB_INFO.contactEmail}`}
                    className="flex items-center gap-2.5 text-white hover:underline font-medium text-xs sm:text-sm break-all"
                  >
                    <Mail className="w-[18px] h-[18px] shrink-0" aria-hidden="true" />
                    <span>{CLUB_INFO.contactEmail}</span>
                  </a>
                </div>
              </div>

              <div className="pt-2">
                <a
                  href={generateWhatsAppUrl(selectedTier)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-3 px-4 bg-black hover:bg-neutral-900 text-white font-label-md text-xs uppercase font-bold tracking-wider flex items-center justify-center gap-2 transition-all shadow-lg"
                >
                  <MessageCircle className="w-[18px] h-[18px] text-[#25D366]" aria-hidden="true" />
                  <span>Hablar por WhatsApp</span>
                </a>
              </div>
            </div>

            {/* Formulario de Solicitud Comercial */}
            <div className="lg:col-span-7">
              <div className="mb-6">
                <h3 className="font-display-xl text-2xl sm:text-3xl uppercase text-white">
                  CONTACTO PARA EMPRESAS
                </h3>
                <p className="text-xs text-tertiary mt-1">
                  Selecciona la modalidad o proyecto de tu interés y nos pondremos en contacto contigo.
                </p>
              </div>

              {submitted ? (
                <div className="p-8 bg-emerald-500/15 border border-emerald-500/30 text-center space-y-4" role="status">
                  <Handshake className="w-12 h-12 text-emerald-400 mx-auto" aria-hidden="true" />
                  <h4 className="font-display-xl text-2xl uppercase text-white">
                    ¡Gracias por hacer equipo con el C.D. Voleibol San Pedro!
                  </h4>
                  <p className="text-xs text-tertiary max-w-lg mx-auto">
                    Hemos registrado tu interés en <strong>{submittedTier}</strong>. Alberto Alcántara González se pondrá en contacto contigo a la mayor brevedad.
                  </p>
                  <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
                    <a
                      href={generateWhatsAppUrl(submittedTier)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-6 py-2.5 bg-[#25D366] text-black text-xs font-bold uppercase"
                    >
                      <MessageCircle className="w-4 h-4" aria-hidden="true" />
                      <span>Confirmar también por WhatsApp Directo</span>
                    </a>
                    <button
                      type="button"
                      onClick={() => setSubmitted(false)}
                      className="px-4 py-2.5 bg-surface-container-high hover:bg-surface-bright text-white text-xs font-bold uppercase transition-colors"
                    >
                      Enviar otra consulta
                    </button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  {/* Honeypot anti-bots */}
                  <div className="sr-only" aria-hidden="true">
                    <label htmlFor="sponsor-website-hp">Sitio web</label>
                    <input
                      id="sponsor-website-hp"
                      name="website"
                      type="text"
                      tabIndex={-1}
                      autoComplete="off"
                      value={form.website}
                      onChange={(e) => setForm({ ...form, website: e.target.value })}
                    />
                  </div>

                  {submitError && (
                    <div
                      role="alert"
                      className="p-3 bg-red-950/70 border border-red-500/50 text-red-200 text-xs flex items-start gap-2"
                    >
                      <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" aria-hidden="true" />
                      <span>{submitError}</span>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="sponsor-company" className="block text-xs uppercase font-bold text-tertiary mb-1">
                        Nombre de la Empresa
                      </label>
                      <input
                        id="sponsor-company"
                        type="text"
                        required
                        maxLength={150}
                        value={form.companyName}
                        onChange={(e) => setForm({ ...form, companyName: e.target.value })}
                        placeholder="Nombre de la empresa"
                        className="w-full px-3 py-2.5 bg-surface-container-lowest border border-white/10 text-white placeholder:text-tertiary/80 text-base sm:text-xs focus:border-primary-container focus:outline-none"
                      />
                    </div>

                    <div>
                      <label htmlFor="sponsor-contact" className="block text-xs uppercase font-bold text-tertiary mb-1">
                        Persona de Contacto
                      </label>
                      <input
                        id="sponsor-contact"
                        type="text"
                        required
                        maxLength={120}
                        value={form.contactPerson}
                        onChange={(e) => setForm({ ...form, contactPerson: e.target.value })}
                        placeholder="Nombre y apellidos"
                        className="w-full px-3 py-2.5 bg-surface-container-lowest border border-white/10 text-white placeholder:text-tertiary/80 text-base sm:text-xs focus:border-primary-container focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label htmlFor="sponsor-phone" className="block text-xs uppercase font-bold text-tertiary mb-1">
                        Teléfono
                      </label>
                      <input
                        id="sponsor-phone"
                        type="tel"
                        required
                        maxLength={30}
                        value={form.phone}
                        onChange={(e) => setForm({ ...form, phone: e.target.value })}
                        placeholder="+34 600 000 000"
                        className="w-full px-3 py-2.5 bg-surface-container-lowest border border-white/10 text-white placeholder:text-tertiary/80 text-base sm:text-xs focus:border-primary-container focus:outline-none"
                      />
                    </div>

                    <div>
                      <label htmlFor="sponsor-email" className="block text-xs uppercase font-bold text-tertiary mb-1">
                        Correo Electrónico
                      </label>
                      <input
                        id="sponsor-email"
                        type="email"
                        required
                        value={form.email}
                        onChange={(e) => setForm({ ...form, email: e.target.value })}
                        placeholder="contacto@empresa.com"
                        className="w-full px-3 py-2.5 bg-surface-container-lowest border border-white/10 text-white placeholder:text-tertiary/80 text-base sm:text-xs focus:border-primary-container focus:outline-none"
                      />
                    </div>

                    <div>
                      <label htmlFor="sponsor-tier" className="block text-xs uppercase font-bold text-tertiary mb-1">
                        Modalidad o Proyecto
                      </label>
                      <select
                        id="sponsor-tier"
                        value={selectedTier}
                        onChange={(e) => setSelectedTier(e.target.value)}
                        className="w-full px-3 py-2.5 bg-surface-container-lowest border border-white/10 text-white text-base sm:text-xs focus:border-primary-container focus:outline-none"
                      >
                        <optgroup label="Modalidades de colaboración">
                          {INITIAL_SPONSOR_TIERS.map((t) => (
                            <option key={t.id} value={t.name}>
                              {t.name} ({t.priceAnnual})
                            </option>
                          ))}
                        </optgroup>
                        <optgroup label="Proyectos que pueden llevar el nombre de una empresa">
                          {NAMING_PROJECTS.map((p) => (
                            <option key={p.id} value={p.name}>
                              {p.name}
                            </option>
                          ))}
                        </optgroup>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label htmlFor="sponsor-message" className="block text-xs uppercase font-bold text-tertiary mb-1">
                      Mensaje (Opcional)
                    </label>
                    <textarea
                      id="sponsor-message"
                      rows={3}
                      maxLength={2000}
                      value={form.message}
                      onChange={(e) => setForm({ ...form, message: e.target.value })}
                      placeholder="Mensaje o consulta..."
                      className="w-full px-3 py-2.5 bg-surface-container-lowest border border-white/10 text-white placeholder:text-tertiary/80 text-base sm:text-xs focus:border-primary-container focus:outline-none"
                    />
                  </div>

                  {/* Primera capa Art. 13 RGPD plegable + Casilla obligatoria sin premarcar */}
                  <div className="p-3.5 bg-surface-container-lowest border border-white/10 space-y-2 text-[11px] text-tertiary leading-relaxed">
                    <details className="group">
                      <summary className="flex cursor-pointer list-none items-center justify-between gap-2 font-semibold text-white/90 hover:text-white [&::-webkit-details-marker]:hidden">
                        <span className="inline-flex items-center gap-2">
                          <ShieldCheck className="w-4 h-4 text-primary shrink-0" aria-hidden="true" />
                          <span>Ver información básica sobre Protección de Datos (Art. 13 RGPD)</span>
                        </span>
                        <ChevronDown className="w-4 h-4 text-tertiary shrink-0 transition-transform group-open:rotate-180" aria-hidden="true" />
                      </summary>
                      <p className="mt-2 pt-2 border-t border-white/10">
                        Responsable: SAN PEDRO C.D VOLEIBOL (CIF G93147924) · Finalidad: gestionar tu solicitud · Base: consentimiento expreso (Art. 6.1.a RGPD) · Conservación: máx. 12 meses tras el cierre de la gestión · Encargados: Neon EU / Zoho Mail EU / Netlify (DPF-SCC) · Derechos y revocación:{' '}
                        <a href={`mailto:${CLUB_INFO.contactEmail}`} className="text-primary underline hover:text-white">
                          {CLUB_INFO.contactEmail}
                        </a>.
                      </p>
                    </details>
                    <label htmlFor="sponsor-privacy" className="flex items-start gap-2.5 cursor-pointer text-xs text-white pt-1.5 border-t border-white/10">
                      <input
                        id="sponsor-privacy"
                        type="checkbox"
                        required
                        checked={form.privacyAccepted}
                        onChange={(e) => setForm({ ...form, privacyAccepted: e.target.checked })}
                        className="mt-0.5 w-4 h-4 accent-[#d90429] shrink-0 cursor-pointer"
                      />
                      <span>
                        He leído y acepto la{' '}
                        <Link
                          href="/privacidad"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary underline hover:text-white font-semibold"
                        >
                          Política de Privacidad
                        </Link>{' '}
                        para el tratamiento de mis datos con el fin de tramitar esta solicitud.
                      </span>
                    </label>
                  </div>

                  <div className="pt-2 flex flex-col sm:flex-row items-center gap-4">
                    <button
                      type="submit"
                      disabled={submitting}
                      className="w-full sm:flex-1 py-3 bg-primary-container hover:bg-cta-hover disabled:opacity-60 text-white font-label-md text-xs uppercase font-bold tracking-wider transition-all shadow-[4px_4px_0px_0px_#0e0e0e] active:translate-x-[1px] active:translate-y-[1px] flex items-center justify-center gap-2 cursor-pointer"
                    >
                      {submitting ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                          <span>Enviando solicitud...</span>
                        </>
                      ) : (
                        <span>Enviar Solicitud</span>
                      )}
                    </button>

                    <a
                      href={generateWhatsAppUrl(selectedTier)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full sm:w-auto px-6 py-3 bg-[#25D366] hover:bg-[#20ba59] text-black font-label-md text-xs uppercase font-bold tracking-wider flex items-center justify-center gap-2 shrink-0"
                    >
                      <MessageCircle className="w-[18px] h-[18px]" aria-hidden="true" />
                      <span>WhatsApp Directo</span>
                    </a>
                  </div>
                </form>
              )}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
