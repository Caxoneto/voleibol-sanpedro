'use client';

import { useState } from 'react';
import { INITIAL_SPONSOR_TIERS, CLUB_INFO, store } from '@/lib/data-store';

export default function PatrocinioPage() {
  const [selectedTier, setSelectedTier] = useState<string>('Lona en Pabellón Sergio Scariolo');
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
      `Hola, me comunico en nombre de "${form.companyName || 'mi empresa'}" y estamos interesados en el paquete de patrocinio "${tierName}" del C.D. Voleibol San Pedro.`
    );
    return `https://wa.me/34622112233?text=${text}`;
  };

  return (
    <div className="w-full min-h-screen bg-background">
      {/* Top Banner */}
      <section className="relative w-full bg-surface-container-lowest px-4 lg:px-8 py-12 border-b border-white/5 overflow-hidden">
        <div className="absolute -right-20 -top-24 w-96 h-96 rounded-full bg-primary-container/10 blur-3xl pointer-events-none" />
        <div className="max-w-7xl mx-auto relative z-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-primary-container text-white text-[11px] uppercase font-bold tracking-widest">
                ALIANZAS Y COMERCIO LOCAL
              </span>
              <span className="text-xs text-tertiary uppercase tracking-wider">
                SAN PEDRO ALCÁNTARA
              </span>
            </div>
            <h1 className="font-display-xl text-4xl sm:text-5xl lg:text-6xl uppercase text-white tracking-tight leading-none">
              PATROCINIO Y APOYO AL DEPORTE BASE
            </h1>
            <p className="font-body-md text-sm sm:text-base text-tertiary max-w-2xl mt-2">
              Únete a las empresas y comercios que hacen posible que más de 120 jóvenes y niños sampedreños jueguen al voleibol federado en el Pabellón Sergio Scariolo de San Pedro Alcántara.
            </p>
          </div>

          <a
            href={generateWhatsAppUrl(selectedTier)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-5 py-3 bg-[#25D366] hover:bg-[#20ba59] text-black font-label-md text-xs uppercase tracking-wider font-bold transition-all shadow-lg shrink-0"
          >
            <span className="material-symbols-outlined text-[18px]">chat</span>
            <span>Contacto Comercial WhatsApp</span>
          </a>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 lg:px-8 py-12 space-y-16">
        {/* Filosofía del Club para Patrocinadores */}
        <section className="bg-surface-container-low border border-white/5 p-6 sm:p-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <div className="w-10 h-10 bg-primary-container text-white flex items-center justify-center font-bold text-lg mb-2">
                01
              </div>
              <h3 className="font-headline-sm text-base uppercase text-white font-bold">
                100% Inversión en Deporte Base
              </h3>
              <p className="text-xs text-tertiary leading-relaxed">
                Cada euro aportado se destina íntegramente a equipaciones de los niños, balones reglamentarios, desplazamientos a partidos andaluces y licencias federadas FAVB.
              </p>
            </div>

            <div className="space-y-2">
              <div className="w-10 h-10 bg-surface-container-high text-primary border border-primary flex items-center justify-center font-bold text-lg mb-2">
                02
              </div>
              <h3 className="font-headline-sm text-base uppercase text-white font-bold">
                Gran Afluencia y Deporte Familiar
              </h3>
              <p className="text-xs text-tertiary leading-relaxed">
                Un pabellón volcado con el voleibol: los fines de semana el Sergio Scariolo reúne a cientos de familias, aficionados y vecinos de San Pedro y la Costa del Sol, garantizando visibilidad e impacto directo para tu negocio.
              </p>
            </div>

            <div className="space-y-2">
              <div className="w-10 h-10 bg-surface-container-high text-white flex items-center justify-center font-bold text-lg mb-2">
                03
              </div>
              <h3 className="font-headline-sm text-base uppercase text-white font-bold">
                Cercanía y Agradecimiento Real
              </h3>
              <p className="text-xs text-tertiary leading-relaxed">
                Reconocimiento continuo a través de megafonía en los partidos, presencia en cartelería oficial, faldón web y menciones en redes sociales (#VoleibolSanPedro).
              </p>
            </div>
          </div>
        </section>

        {/* Paquetes de Patrocinio */}
        <section className="space-y-6">
          <div className="text-center max-w-2xl mx-auto">
            <span className="text-xs text-primary font-bold uppercase tracking-wider block">
              Planes Adaptados al Comercio
            </span>
            <h2 className="font-display-xl text-3xl sm:text-4xl uppercase text-white mt-1">
              Paquetes de Colaboración Temporada 24/25
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pt-4">
            {INITIAL_SPONSOR_TIERS.map((tier) => (
              <div
                key={tier.id}
                className={`bg-surface-container-low border flex flex-col justify-between p-6 sm:p-8 transition-all relative ${
                  tier.isFeatured
                    ? 'border-primary-container shadow-[0_0_30px_rgba(217,4,41,0.2)] md:-translate-y-2'
                    : 'border-white/5 hover:border-white/20'
                }`}
              >
                {tier.isFeatured && (
                  <div className="absolute top-0 right-0 bg-primary-container text-white px-3 py-1 text-[10px] uppercase font-bold tracking-widest">
                    MÁS POPULAR
                  </div>
                )}

                <div>
                  <h3 className="font-display-xl text-2xl uppercase text-white">
                    {tier.name}
                  </h3>
                  <div className="font-display-xl text-3xl sm:text-4xl text-primary mt-2 mb-4">
                    {tier.priceAnnual}
                  </div>
                  <p className="font-body-sm text-xs text-tertiary mb-6 leading-relaxed">
                    {tier.description}
                  </p>

                  <div className="space-y-3 border-t border-white/10 pt-4">
                    {tier.features.map((feat, idx) => (
                      <div key={idx} className="flex items-start gap-2 text-xs text-on-surface">
                        <span className="material-symbols-outlined text-primary text-[18px] shrink-0 mt-0.5">
                          check_circle
                        </span>
                        <span>{feat}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-8">
                  <a
                    href="#contacto"
                    onClick={() => setSelectedTier(tier.name)}
                    className={`w-full py-3 text-center block font-label-md text-xs uppercase font-bold tracking-wider transition-all shadow ${
                      tier.isFeatured
                        ? 'bg-primary-container hover:bg-secondary-container text-white'
                        : 'bg-surface-container-high hover:bg-surface-bright text-white'
                    }`}
                  >
                    Seleccionar este Paquete
                  </a>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Formulario de Contacto Comercial */}
        <section id="contacto" className="bg-surface-container-low border border-white/10 p-6 sm:p-10">
          <div className="max-w-3xl mx-auto">
            <div className="text-center mb-8">
              <span className="text-xs text-primary font-bold uppercase tracking-wider block">
                Gerencia del Club
              </span>
              <h2 className="font-display-xl text-3xl uppercase text-white mt-1">
                Solicitud de Contacto para Empresas
              </h2>
              <p className="text-xs text-tertiary mt-2">
                Envíanos tus datos y nos pondremos en contacto contigo en menos de 24 horas para formalizar tu colaboración o enviarte el dossier comercial completo.
              </p>
            </div>

            {submitted ? (
              <div className="p-8 bg-emerald-500/15 border border-emerald-500/30 text-center space-y-4">
                <span className="material-symbols-outlined text-5xl text-emerald-400">
                  handshake
                </span>
                <h3 className="font-display-xl text-2xl uppercase text-white">
                  ¡Gracias por apostar por el deporte sampedreño!
                </h3>
                <p className="text-xs text-tertiary max-w-lg mx-auto">
                  Hemos recibido tu solicitud para el paquete <strong>{selectedTier}</strong>. El coordinador de patrocinios se pondrá en contacto contigo a la mayor brevedad.
                </p>
                <div className="pt-2">
                  <a
                    href={generateWhatsAppUrl(selectedTier)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-6 py-2.5 bg-[#25D366] text-black text-xs font-bold uppercase"
                  >
                    <span className="material-symbols-outlined text-[16px]">chat</span>
                    <span>Agilizar por WhatsApp Directo</span>
                  </a>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs uppercase font-bold text-tertiary mb-1">
                      Nombre de la Empresa o Comercio
                    </label>
                    <input
                      type="text"
                      required
                      value={form.companyName}
                      onChange={(e) => setForm({ ...form, companyName: e.target.value })}
                      placeholder="Ej. Cafetería San Pedro Centro"
                      className="w-full px-3 py-2.5 bg-surface-container-lowest border border-white/10 text-white text-xs focus:border-primary-container focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs uppercase font-bold text-tertiary mb-1">
                      Persona de Contacto
                    </label>
                    <input
                      type="text"
                      required
                      value={form.contactPerson}
                      onChange={(e) => setForm({ ...form, contactPerson: e.target.value })}
                      placeholder="Ej. Laura Delgado"
                      className="w-full px-3 py-2.5 bg-surface-container-lowest border border-white/10 text-white text-xs focus:border-primary-container focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs uppercase font-bold text-tertiary mb-1">
                      Teléfono
                    </label>
                    <input
                      type="tel"
                      required
                      value={form.phone}
                      onChange={(e) => setForm({ ...form, phone: e.target.value })}
                      placeholder="+34 600 000 000"
                      className="w-full px-3 py-2.5 bg-surface-container-lowest border border-white/10 text-white text-xs focus:border-primary-container focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs uppercase font-bold text-tertiary mb-1">
                      Correo Electrónico
                    </label>
                    <input
                      type="email"
                      required
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                      placeholder="contacto@empresa.com"
                      className="w-full px-3 py-2.5 bg-surface-container-lowest border border-white/10 text-white text-xs focus:border-primary-container focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs uppercase font-bold text-tertiary mb-1">
                      Paquete de Interés
                    </label>
                    <select
                      value={selectedTier}
                      onChange={(e) => setSelectedTier(e.target.value)}
                      className="w-full px-3 py-2.5 bg-surface-container-lowest border border-white/10 text-white text-xs focus:border-primary-container focus:outline-none"
                    >
                      {INITIAL_SPONSOR_TIERS.map((t) => (
                        <option key={t.id} value={t.name}>
                          {t.name}
                        </option>
                      ))}
                      <option value="Colaboración Personalizada">Otra colaboración a medida</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs uppercase font-bold text-tertiary mb-1">
                    Mensaje o consulta adicional (Opcional)
                  </label>
                  <textarea
                    rows={3}
                    value={form.message}
                    onChange={(e) => setForm({ ...form, message: e.target.value })}
                    placeholder="Cuéntanos sobre tu negocio o cualquier pregunta sobre lonas, pancartas o camisetas..."
                    className="w-full px-3 py-2.5 bg-surface-container-lowest border border-white/10 text-white text-xs focus:border-primary-container focus:outline-none"
                  />
                </div>

                <div className="pt-2 flex flex-col sm:flex-row items-center gap-4">
                  <button
                    type="submit"
                    className="w-full sm:flex-1 py-3 bg-primary-container hover:bg-secondary-container text-white font-label-md text-xs uppercase font-bold tracking-wider transition-all shadow-[4px_4px_0px_0px_#0e0e0e]"
                  >
                    Enviar Solicitud a la Directiva
                  </button>

                  <a
                    href={generateWhatsAppUrl(selectedTier)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full sm:w-auto px-6 py-3 bg-[#25D366] hover:bg-[#20ba59] text-black font-label-md text-xs uppercase font-bold tracking-wider flex items-center justify-center gap-2 shrink-0"
                  >
                    <span className="material-symbols-outlined text-[18px]">chat</span>
                    <span>O háblanos por WhatsApp</span>
                  </a>
                </div>
              </form>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
