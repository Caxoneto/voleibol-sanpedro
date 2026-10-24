'use client';

import { useState } from 'react';
import Image from 'next/image';
import { INITIAL_SPONSOR_TIERS, CURRENT_SPONSORS, CLUB_INFO, store } from '@/lib/data-store';

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
    icon: 'sports',
    title: 'Arbitrajes',
    description:
      'Ayudar a cubrir los costes de competición de una estructura con más de 150 partidos por temporada.',
  },
  {
    id: 'dest-transporte',
    icon: 'directions_bus',
    title: 'Transporte',
    description:
      'Disponer de un vehículo compartido para coordinar desplazamientos de equipos y personal.',
  },
  {
    id: 'dest-material',
    icon: 'fitness_center',
    title: 'Material',
    description:
      'Incorporar gomas, foam y otros recursos específicos para los entrenamientos.',
  },
  {
    id: 'dest-visibilidad',
    icon: 'checkroom',
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
    icon: 'airport_shuttle',
    description:
      'Vehículo de nueve plazas mediante renting o colaboración. Visibilidad durante desplazamientos y competiciones.',
    accent: true,
  },
  {
    id: 'proj-camisetas',
    name: 'Camisetas de Entrenamiento',
    title: 'Camisetas de Entrenamiento',
    icon: 'apparel',
    description:
      'Patrocinio total o por categoría de las 400 camisetas previstas para la temporada.',
    accent: false,
  },
  {
    id: 'proj-cantera',
    name: 'Cantera y Formación',
    title: 'Cantera y Formación',
    icon: 'school',
    description:
      'Apoyo a iniciación, formación técnica, material específico y desarrollo de entrenadores.',
    accent: false,
  },
  {
    id: 'proj-torneos',
    name: 'Torneos y Eventos',
    title: 'Torneos y Eventos',
    icon: 'emoji_events',
    description:
      'Colaboración vinculada a encuentros, torneos, photocall y acciones con las familias del club.',
    accent: true,
  },
];

export default function PatrocinioPage() {
  const [selectedTier, setSelectedTier] = useState<string>('Patrocinador Oficial');
  const [submitted, setSubmitted] = useState<boolean>(false);

  const [form, setForm] = useState({
    companyName: '',
    contactPerson: '',
    phone: '',
    email: '',
    message: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    store.addSponsorInquiry({
      companyName: form.companyName,
      contactPerson: form.contactPerson,
      phone: form.phone,
      email: form.email,
      packageInterested: selectedTier,
      message: form.message,
    });
    setSubmitted(true);
  };

  const generateWhatsAppUrl = (tierName: string) => {
    const text = encodeURIComponent(
      `Hola Alberto, me comunico en nombre de "${form.companyName || 'mi empresa'}" y nos gustaría recibir información sobre la modalidad "${tierName}" del Proyecto de Patrocinio 2026/2027 del C.D. Voleibol San Pedro.`
    );
    return `https://wa.me/34657713771?text=${text}`;
  };

  return (
    <div className="w-full min-h-screen bg-background">
      {/* Cabecera Hero — Proyecto de Patrocinio 2026 / 2027 (Pág. 1 del Dossier) */}
      <section className="relative w-full bg-surface-container-lowest px-4 lg:px-8 py-12 sm:py-16 border-b border-white/5 overflow-hidden">
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
              className="inline-flex items-center justify-center gap-2 px-5 py-3 bg-primary-container hover:bg-secondary-container text-white font-label-md text-xs uppercase tracking-wider font-bold transition-all shadow-[4px_4px_0px_0px_#0e0e0e]"
            >
              <span className="material-symbols-outlined text-[18px]" aria-hidden="true">workspace_premium</span>
              <span>Modalidades de colaboración</span>
            </a>
            <a
              href={generateWhatsAppUrl(selectedTier)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 px-5 py-3 bg-[#25D366] hover:bg-[#20ba59] text-black font-label-md text-xs uppercase tracking-wider font-bold transition-all shadow-lg"
            >
              <span className="material-symbols-outlined text-[18px]" aria-hidden="true">chat</span>
              <span>WhatsApp Directo</span>
            </a>
          </div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 lg:px-8 py-12 space-y-16 sm:space-y-20">
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

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 sm:gap-5 pt-8">
            {CURRENT_SPONSORS.map((sponsor) => (
              <a
                key={sponsor.id}
                href={sponsor.url}
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
                <span
                  className="material-symbols-outlined text-[15px] absolute top-2.5 right-2.5 opacity-0 group-hover:opacity-80 transition-opacity text-primary"
                  aria-hidden="true"
                >
                  open_in_new
                </span>
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
                El <strong className="text-white">C.D. Voleibol San Pedro</strong> trabaja para que el voleibol sea accesible a todas las edades y niveles.
              </p>
              <p className="text-xs sm:text-sm text-tertiary leading-relaxed">
                El club entiende el deporte como una escuela de convivencia, responsabilidad y trabajo en equipo.
              </p>
              <p className="text-xs sm:text-sm text-tertiary leading-relaxed">
                En las dos últimas temporadas hemos triplicado el número de jugadores y jugadoras. Este crecimiento abre una nueva etapa y también exige más medios, profesionales y material específico.
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
                  <span className="material-symbols-outlined text-primary text-[20px]" aria-hidden="true">
                    sports_volleyball
                  </span>
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
                    <span className="material-symbols-outlined text-primary text-[20px]" aria-hidden="true">
                      groups
                    </span>
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
                <p className="text-[11px] text-tertiary border-t border-white/10 pt-3 leading-relaxed">
                  Nuestro objetivo es que cada persona pueda encontrar su lugar dentro del club, con independencia de su edad, experiencia o nivel deportivo.
                </p>
              </div>

              {/* Col 3: Equipo Técnico e Instalaciones (Pág. 6) */}
              <div className="bg-surface-container-low border border-white/5 p-6 flex flex-col justify-between space-y-4">
                <div className="space-y-3">
                  <div className="border-b border-white/10 pb-3">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-primary text-[20px]" aria-hidden="true">
                        stadium
                      </span>
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

                <p className="text-[11px] text-tertiary border-t border-white/10 pt-3 leading-relaxed">
                  Esta estructura permite atender a deportistas de diferentes edades, organizar entrenamientos y participar cada temporada en más de 150 partidos.
                </p>
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
                {SPONSORSHIP_DESTINATIONS.map((item) => (
                  <div key={item.id} className="bg-surface-container-lowest border border-white/10 p-4 space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-primary text-[20px]" aria-hidden="true">
                        {item.icon}
                      </span>
                      <h3 className="font-headline-sm text-sm uppercase font-bold text-white">
                        {item.title}
                      </h3>
                    </div>
                    <p className="text-xs text-tertiary leading-relaxed">{item.description}</p>
                  </div>
                ))}
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

              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2.5 mt-6">
                {COMPANY_BENEFITS.map((benefit, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-xs text-on-surface">
                    <span className="material-symbols-outlined text-primary text-[16px] shrink-0 mt-0.5" aria-hidden="true">
                      check_circle
                    </span>
                    <span className="leading-snug">{benefit}</span>
                  </li>
                ))}
              </ul>
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
                        <span className="material-symbols-outlined text-primary text-[16px] shrink-0 mt-0.5" aria-hidden="true">
                          check_circle
                        </span>
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
                        ? 'bg-primary-container hover:bg-secondary-container text-white'
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
            {NAMING_PROJECTS.map((proj) => (
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
                    <span className="material-symbols-outlined text-[22px]" aria-hidden="true">
                      {proj.icon}
                    </span>
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
                    <span className="material-symbols-outlined text-[15px]" aria-hidden="true">
                      arrow_forward
                    </span>
                  </a>
                </div>
              </div>
            ))}
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
                <p className="text-xs sm:text-sm text-white/90 mt-3 leading-relaxed">
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
                    <span className="material-symbols-outlined text-[18px]" aria-hidden="true">call</span>
                    <span>M. 657 71 37 71</span>
                  </a>
                  <a
                    href="mailto:voleibolsanpedro@hotmail.es"
                    className="flex items-center gap-2.5 text-white hover:underline font-medium text-xs sm:text-sm break-all"
                  >
                    <span className="material-symbols-outlined text-[18px]" aria-hidden="true">mail</span>
                    <span>voleibolsanpedro@hotmail.es</span>
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
                  <span className="material-symbols-outlined text-[18px] text-[#25D366]" aria-hidden="true">chat</span>
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
                <div className="p-8 bg-emerald-500/15 border border-emerald-500/30 text-center space-y-4">
                  <span className="material-symbols-outlined text-5xl text-emerald-400" aria-hidden="true">
                    handshake
                  </span>
                  <h4 className="font-display-xl text-2xl uppercase text-white">
                    ¡Gracias por hacer equipo con el C.D. Voleibol San Pedro!
                  </h4>
                  <p className="text-xs text-tertiary max-w-lg mx-auto">
                    Hemos registrado tu interés en <strong>{selectedTier}</strong>. Alberto Alcántara González se pondrá en contacto contigo a la mayor brevedad.
                  </p>
                  <div className="pt-2">
                    <a
                      href={generateWhatsAppUrl(selectedTier)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-6 py-2.5 bg-[#25D366] text-black text-xs font-bold uppercase"
                    >
                      <span className="material-symbols-outlined text-[16px]" aria-hidden="true">chat</span>
                      <span>Confirmar también por WhatsApp Directo</span>
                    </a>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="sponsor-company" className="block text-xs uppercase font-bold text-tertiary mb-1">
                        Nombre de la Empresa
                      </label>
                      <input
                        id="sponsor-company"
                        type="text"
                        required
                        value={form.companyName}
                        onChange={(e) => setForm({ ...form, companyName: e.target.value })}
                        placeholder="Nombre de la empresa"
                        className="w-full px-3 py-2.5 bg-surface-container-lowest border border-white/10 text-white text-base sm:text-xs focus:border-primary-container focus:outline-none"
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
                        value={form.contactPerson}
                        onChange={(e) => setForm({ ...form, contactPerson: e.target.value })}
                        placeholder="Nombre y apellidos"
                        className="w-full px-3 py-2.5 bg-surface-container-lowest border border-white/10 text-white text-base sm:text-xs focus:border-primary-container focus:outline-none"
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
                        value={form.phone}
                        onChange={(e) => setForm({ ...form, phone: e.target.value })}
                        placeholder="+34 600 000 000"
                        className="w-full px-3 py-2.5 bg-surface-container-lowest border border-white/10 text-white text-base sm:text-xs focus:border-primary-container focus:outline-none"
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
                        className="w-full px-3 py-2.5 bg-surface-container-lowest border border-white/10 text-white text-base sm:text-xs focus:border-primary-container focus:outline-none"
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
                      value={form.message}
                      onChange={(e) => setForm({ ...form, message: e.target.value })}
                      placeholder="Mensaje o consulta..."
                      className="w-full px-3 py-2.5 bg-surface-container-lowest border border-white/10 text-white text-base sm:text-xs focus:border-primary-container focus:outline-none"
                    />
                  </div>

                  <div className="pt-2 flex flex-col sm:flex-row items-center gap-4">
                    <button
                      type="submit"
                      className="w-full sm:flex-1 py-3 bg-primary-container hover:bg-secondary-container text-white font-label-md text-xs uppercase font-bold tracking-wider transition-all shadow-[4px_4px_0px_0px_#0e0e0e]"
                    >
                      Enviar Solicitud
                    </button>

                    <a
                      href={generateWhatsAppUrl(selectedTier)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full sm:w-auto px-6 py-3 bg-[#25D366] hover:bg-[#20ba59] text-black font-label-md text-xs uppercase font-bold tracking-wider flex items-center justify-center gap-2 shrink-0"
                    >
                      <span className="material-symbols-outlined text-[18px]" aria-hidden="true">chat</span>
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
