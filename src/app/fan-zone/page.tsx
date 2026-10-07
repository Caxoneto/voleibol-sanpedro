'use client';

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import {
  INITIAL_PLAYERS,
  INITIAL_CHANTS,
  INITIAL_WALLPAPERS,
  store,
} from '@/lib/data-store';
import confetti from 'canvas-confetti';
import SponsorBanner from '@/components/SponsorBanner';

export default function FanZonePage() {
  // Estado de votación MVP
  const [selectedPlayerId, setSelectedPlayerId] = useState<string>('');
  const [hasVoted, setHasVoted] = useState<boolean>(false);
  const [voteCounts, setVoteCounts] = useState<Record<string, number>>({});
  const [votingFeedback, setVotingFeedback] = useState<string | null>(null);

  // Candidatos para el MVP (plantilla del Senior Femenino que disputó el último encuentro oficial)
  const mvpCandidates = INITIAL_PLAYERS.filter((p) => p.teamId === 'team-sf').slice(0, 4);

  // Estado del himno del club / audio
  const [isPlayingAnthem, setIsPlayingAnthem] = useState<boolean>(false);
  const [audioProgress, setAudioProgress] = useState<number>(0);
  const audioContextRef = useRef<AudioContext | null>(null);
  const anthemIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Muro social de fotos
  const [socialPhotos, setSocialPhotos] = useState<
    { id: string; author: string; caption: string; imageUrl: string; likes: number }[]
  >([
    {
      id: 'sp-1',
      author: 'Familia Gómez • San Pedro',
      caption: '¡Disfrutando de la victoria en el Sergio Scariolo con los peques! #VoleibolSanPedro',
      imageUrl: 'https://images.unsplash.com/photo-1543980932-b5fc649a8000?w=600&auto=format&fit=crop&q=80',
      likes: 42,
    },
    {
      id: 'sp-2',
      author: 'Grada Rojinegra Sampedreña',
      caption: '¡Punto a punto! La afición nunca falla cuando juega el primer equipo.',
      imageUrl: 'https://images.unsplash.com/photo-1558151748-f2621b5e52f0?w=600&auto=format&fit=crop&q=80',
      likes: 78,
    },
    {
      id: 'sp-3',
      author: 'Cantera Infantil Voley',
      caption: 'Nuestras futuras promesas animando detrás del banquillo. ¡Orgullo de pueblo!',
      imageUrl: 'https://images.unsplash.com/photo-1728968920002-4225a376499a?w=600&auto=format&fit=crop&q=80',
      likes: 56,
    },
  ]);

  // Modal subir foto
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadAuthor, setUploadAuthor] = useState('');
  const [uploadCaption, setUploadCaption] = useState('');

  // Inicializar votos desde store y verificar localStorage
  useEffect(() => {
    const votedLocally = localStorage.getItem('cdv_mvp_voted_j13');
    if (votedLocally) {
      setHasVoted(true);
    }

    const counts: Record<string, number> = {};
    mvpCandidates.forEach((c) => {
      counts[c.id] = store.getVoteCountForPlayer(c.id, 'm-past-1') + 2; // seed inicial balanceado
    });
    setVoteCounts(counts);
  }, []);

  const totalVotes = Object.values(voteCounts).reduce((a, b) => a + b, 0);

  // Votar por MVP
  const handleVoteSubmit = () => {
    if (!selectedPlayerId || hasVoted) return;

    // Registrar en store y estado local
    store.addFanVote('m-past-1', selectedPlayerId, 'local-session');
    setVoteCounts((prev) => ({
      ...prev,
      [selectedPlayerId]: (prev[selectedPlayerId] || 0) + 1,
    }));
    setHasVoted(true);
    localStorage.setItem('cdv_mvp_voted_j13', 'true');
    setVotingFeedback('¡Voto registrado con éxito! Gracias por apoyar a nuestros jugadores.');

    // Disparar confeti deportivo
    try {
      confetti({
        particleCount: 80,
        spread: 60,
        origin: { y: 0.7 },
        colors: ['#d90429', '#ffffff', '#ffb3af'],
      });
    } catch (e) {
      // Ignorar si el navegador bloquea canvas
    }
  };

  // Reproductor del Himno con Web Audio API (síntesis de fanfarria / himno de estadio)
  const toggleAnthem = () => {
    if (isPlayingAnthem) {
      // Detener
      setIsPlayingAnthem(false);
      setAudioProgress(0);
      if (anthemIntervalRef.current) clearInterval(anthemIntervalRef.current);
      if (audioContextRef.current) {
        audioContextRef.current.close();
        audioContextRef.current = null;
      }
    } else {
      // Iniciar síntesis musical de himno deportivo
      setIsPlayingAnthem(true);
      setAudioProgress(0);

      try {
        const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        const ctx = new AudioCtx();
        audioContextRef.current = ctx;

        // Notas del himno deportivo sampedreño: Do, Mi, Sol, Do alto, Sol, Do alto...
        const melody = [
          { note: 261.63, dur: 0.4 }, // C4
          { note: 329.63, dur: 0.4 }, // E4
          { note: 392.00, dur: 0.4 }, // G4
          { note: 523.25, dur: 0.8 }, // C5
          { note: 392.00, dur: 0.4 }, // G4
          { note: 523.25, dur: 1.0 }, // C5
          { note: 440.00, dur: 0.4 }, // A4
          { note: 523.25, dur: 0.6 }, // C5
          { note: 392.00, dur: 0.8 }, // G4
        ];

        let startTime = ctx.currentTime + 0.1;

        melody.forEach((item) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(item.note, startTime);

          gain.gain.setValueAtTime(0.18, startTime);
          gain.gain.exponentialRampToValueAtTime(0.001, startTime + item.dur);

          osc.connect(gain);
          gain.connect(ctx.destination);

          osc.start(startTime);
          osc.stop(startTime + item.dur);
          startTime += item.dur;
        });

        // Simular progreso de reproducción
        let prog = 0;
        anthemIntervalRef.current = setInterval(() => {
          prog += 10;
          if (prog >= 100) {
            prog = 100;
            setIsPlayingAnthem(false);
            if (anthemIntervalRef.current) clearInterval(anthemIntervalRef.current);
          }
          setAudioProgress(prog);
        }, 500);
      } catch (err) {
        setIsPlayingAnthem(false);
      }
    }
  };

  // Subir foto al muro
  const handleAddPhoto = (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadAuthor || !uploadCaption) return;

    const newPhoto = {
      id: `p-${Date.now()}`,
      author: uploadAuthor,
      caption: uploadCaption,
      imageUrl: 'https://images.unsplash.com/photo-1558151748-f2621b5e52f0?w=600&auto=format&fit=crop&q=80',
      likes: 1,
    };
    setSocialPhotos([newPhoto, ...socialPhotos]);
    setShowUploadModal(false);
    setUploadAuthor('');
    setUploadCaption('');
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
                LA GRADA SAMPEDREÑA
              </span>
              <span className="text-xs text-tertiary uppercase tracking-wider">
                #VOLEIBOLSAMPEDRO
              </span>
            </div>
            <h1 className="font-display-xl text-4xl sm:text-5xl lg:text-6xl uppercase text-white tracking-tight leading-none">
              FAN-ZONE COMUNITARIA
            </h1>
            <p className="font-body-md text-sm sm:text-base text-tertiary max-w-2xl mt-2">
              El corazón del Sergio Scariolo: vota el MVP de cada jornada, canta con la grada rojinegra, comparte tus fotos y descarga fondos oficiales del club.
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs text-primary font-bold uppercase tracking-wider shrink-0">
            <span className="material-symbols-outlined text-[20px]">favorite</span>
            <span>«Voleibol para todos»</span>
          </div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 lg:px-8 py-10 space-y-16">
        {/* BLOQUE 1: Votación Popular de MVP */}
        <section className="bg-surface-container-low border border-primary-container/30 p-6 sm:p-8 shadow-2xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-white/10">
            <div>
              <span className="text-xs text-primary font-bold uppercase tracking-wider block">
                Votación de la Afición
              </span>
              <h2 className="font-display-xl text-2xl sm:text-3xl uppercase text-white mt-1">
                Elige al MVP de la Jornada
              </h2>
            </div>
            <div className="flex items-center gap-2 text-xs text-tertiary">
              <span className="material-symbols-outlined text-primary text-[18px]">how_to_vote</span>
              <span>1 voto por aficionado / sesión</span>
            </div>
          </div>

          <p className="text-xs sm:text-sm text-tertiary mt-4 mb-6">
            Valora el esfuerzo de nuestros jugadores en el último choque de 1ª División Andaluza ante CV Pizarra. Selecciona a tu candidato preferido y envía tu voto.
          </p>

          {/* Candidatos Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
            {mvpCandidates.map((candidate) => {
              const count = voteCounts[candidate.id] || 0;
              const percent = totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0;
              const isSelected = selectedPlayerId === candidate.id;

              return (
                <div
                  key={candidate.id}
                  onClick={() => !hasVoted && setSelectedPlayerId(candidate.id)}
                  className={`group bg-surface-container-lowest border p-4 transition-all cursor-pointer relative overflow-hidden ${
                    isSelected
                      ? 'border-primary-container ring-2 ring-primary-container/50 bg-primary-container/10'
                      : 'border-white/5 hover:border-white/20'
                  } ${hasVoted ? 'cursor-default' : ''}`}
                >
                  <div className="relative h-44 w-full mb-3 overflow-hidden">
                    <Image
                      src={candidate.photoUrl}
                      alt={candidate.firstName}
                      fill
                      className="object-cover"
                    />
                    <div className="absolute top-2 left-2 font-display-xl text-3xl text-white">
                      #{candidate.number}
                    </div>
                  </div>

                  <h3 className="font-display-xl text-lg uppercase text-white leading-tight">
                    {candidate.firstName} {candidate.lastName}
                  </h3>
                  <span className="text-[10px] text-tertiary uppercase block mb-3">
                    {candidate.position}
                  </span>

                  {/* Resultados / Porcentaje */}
                  {hasVoted && (
                    <div className="space-y-1 pt-2 border-t border-white/10">
                      <div className="flex justify-between text-xs">
                        <span className="text-tertiary">{count} votos</span>
                        <span className="font-bold text-primary">{percent}%</span>
                      </div>
                      <div className="w-full bg-surface-container-high h-2 overflow-hidden">
                        <div
                          className="bg-primary-container h-full transition-all duration-700"
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {!hasVoted && (
                    <div className="pt-2">
                      <button
                        type="button"
                        className={`w-full py-1.5 text-xs uppercase font-bold tracking-wider transition-colors ${
                          isSelected
                            ? 'bg-primary-container text-white'
                            : 'bg-surface-container-high text-tertiary group-hover:text-white'
                        }`}
                      >
                        {isSelected ? 'Seleccionado' : 'Elegir'}
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Botón de Enviar Voto */}
          {!hasVoted ? (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-white/10">
              <span className="text-xs text-tertiary">
                {selectedPlayerId
                  ? 'Has seleccionado un jugador. Haz clic en el botón para confirmar.'
                  : 'Selecciona una tarjeta arriba para activar tu voto.'}
              </span>
              <button
                onClick={handleVoteSubmit}
                disabled={!selectedPlayerId}
                className="px-8 py-3 bg-primary-container hover:bg-secondary-container disabled:opacity-40 text-white font-label-md text-xs uppercase font-bold tracking-wider transition-all shadow-[4px_4px_0px_0px_#0e0e0e]"
              >
                Confirmar Voto MVP
              </button>
            </div>
          ) : (
            <div className="p-4 bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2">
              <span className="material-symbols-outlined text-[18px]">verified</span>
              <span>{votingFeedback || '¡Tu voto ha sido registrado! Gracias por participar.'}</span>
            </div>
          )}
        </section>

        {/* BLOQUE 2: Himno Oficial y Cánticos de la Grada */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Himno Player (5 cols) */}
          <div className="lg:col-span-5 bg-surface-container-low border border-white/5 p-6 sm:p-8 space-y-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-primary-container text-white flex items-center justify-center">
                <span className="material-symbols-outlined text-[24px]">music_note</span>
              </div>
              <div>
                <span className="text-[10px] uppercase tracking-widest text-primary font-bold block">
                  Banda Sonora Rojinegra
                </span>
                <h3 className="font-display-xl text-xl sm:text-2xl uppercase text-white">
                  Himno Oficial del Club
                </h3>
              </div>
            </div>

            <p className="font-body-sm text-xs text-tertiary leading-relaxed">
              La marcha deportiva tradicional con la que el Sergio Scariolo recibe a nuestros equipos en los partidos de gala.
            </p>

            {/* Audio Widget Simulado con Web Audio */}
            <div className="p-4 bg-surface-container-lowest border border-white/10 space-y-3">
              <div className="flex items-center justify-between text-xs text-tertiary">
                <span className="font-bold text-white uppercase">«¡Vamos San Pedro!»</span>
                <span>{isPlayingAnthem ? 'Reproduciendo en directo...' : '0:35'}</span>
              </div>

              {/* Progress Bar */}
              <div className="w-full bg-surface-container-high h-2 overflow-hidden">
                <div
                  className="bg-primary-container h-full transition-all duration-300"
                  style={{ width: `${audioProgress}%` }}
                />
              </div>

              <div className="flex items-center justify-between pt-2">
                <button
                  onClick={toggleAnthem}
                  className="px-4 py-2 bg-primary-container hover:bg-secondary-container text-white text-xs uppercase font-bold flex items-center gap-2 transition-all shadow"
                >
                  <span className="material-symbols-outlined text-[18px]">
                    {isPlayingAnthem ? 'pause' : 'play_arrow'}
                  </span>
                  <span>{isPlayingAnthem ? 'Pausar Himno' : 'Escuchar Himno'}</span>
                </button>

                <span className="text-[11px] text-tertiary flex items-center gap-1">
                  <span className="material-symbols-outlined text-[14px]">volume_up</span>
                  Sintetizador Web Audio
                </span>
              </div>
            </div>
          </div>

          {/* Cánticos Tradicionales (7 cols) */}
          <div className="lg:col-span-7 bg-surface-container-low border border-white/5 p-6 sm:p-8 space-y-6">
            <div>
              <span className="text-xs text-primary font-bold uppercase tracking-wider block">
                Letras de la Grada
              </span>
              <h3 className="font-display-xl text-2xl uppercase text-white mt-1">
                Cánticos del Pabellón Sergio Scariolo
              </h3>
            </div>

            <div className="space-y-4">
              {INITIAL_CHANTS.map((chant) => (
                <div
                  key={chant.id}
                  className="bg-surface-container-lowest border border-white/5 p-4 space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <h4 className="font-headline-sm text-sm uppercase text-primary font-bold">
                      {chant.title}
                    </h4>
                    <span className="text-[10px] text-tertiary uppercase font-mono">
                      {chant.rhythm}
                    </span>
                  </div>
                  <pre className="font-body-sm text-xs text-on-surface whitespace-pre-wrap leading-relaxed font-sans">
                    {chant.lyrics}
                  </pre>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* BLOQUE 3: Muro Social Comunitario (#VoleibolSanPedro) */}
        <section className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <span className="text-xs text-primary font-bold uppercase tracking-wider block">
                Comunidad de Familias y Afición
              </span>
              <h2 className="font-display-xl text-2xl sm:text-3xl uppercase text-white mt-1">
                Muro Social #VoleibolSanPedro
              </h2>
            </div>
            <button
              onClick={() => setShowUploadModal(true)}
              className="px-4 py-2 bg-primary-container hover:bg-secondary-container text-white text-xs uppercase font-bold tracking-wider flex items-center gap-1.5 transition-all self-start sm:self-auto shadow"
            >
              <span className="material-symbols-outlined text-[16px]">add_a_photo</span>
              <span>Subir Mi Foto de la Grada</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {socialPhotos.map((photo) => (
              <div
                key={photo.id}
                className="bg-surface-container-low border border-white/5 overflow-hidden flex flex-col justify-between"
              >
                <div>
                  <div className="relative h-60 w-full overflow-hidden">
                    <Image
                      src={photo.imageUrl}
                      alt={photo.caption}
                      fill
                      className="object-cover"
                    />
                  </div>
                  <div className="p-4 space-y-2">
                    <span className="text-[11px] text-primary font-bold uppercase block">
                      {photo.author}
                    </span>
                    <p className="text-xs text-on-surface-variant leading-relaxed">
                      {photo.caption}
                    </p>
                  </div>
                </div>

                <div className="p-4 pt-0 flex items-center justify-between text-xs text-tertiary border-t border-white/5 mt-2">
                  <span className="text-[10px] text-tertiary font-mono">#VoleibolSanPedro</span>
                  <span className="flex items-center gap-1 text-primary">
                    <span className="material-symbols-outlined text-[14px]">favorite</span>
                    {photo.likes}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* BLOQUE 4: Zona de Descargas Digitales Gratuitas */}
        <section className="bg-surface-container-low border border-white/5 p-6 sm:p-8 space-y-6">
          <div>
            <span className="text-xs text-primary font-bold uppercase tracking-wider block">
              Contenido Oficial Descargable
            </span>
            <h2 className="font-display-xl text-2xl sm:text-3xl uppercase text-white mt-1">
              Fondos de Pantalla y Carteles Oficiales
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {INITIAL_WALLPAPERS.map((wp) => (
              <div
                key={wp.id}
                className="bg-surface-container-lowest border border-white/5 p-4 flex flex-col justify-between space-y-4"
              >
                <div>
                  <div className="relative h-48 w-full border border-white/10 overflow-hidden mb-3">
                    <Image
                      src={wp.imageUrl}
                      alt={wp.title}
                      fill
                      className="object-cover"
                    />
                    <span className="absolute top-2 left-2 px-2 py-0.5 bg-black/80 text-white text-[10px] uppercase font-bold">
                      {wp.type}
                    </span>
                  </div>
                  <h4 className="font-headline-sm text-sm uppercase text-white font-bold leading-tight">
                    {wp.title}
                  </h4>
                  <span className="text-[11px] text-tertiary block mt-1">
                    {wp.dimensions}
                  </span>
                </div>

                <a
                  href={wp.downloadUrl}
                  download
                  className="w-full py-2 bg-surface-container-high hover:bg-primary-container text-white text-xs font-bold uppercase text-center flex items-center justify-center gap-1.5 transition-colors"
                >
                  <span className="material-symbols-outlined text-[16px]">download</span>
                  <span>Descargar Gratis</span>
                </a>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* Modal Subir Foto Afición */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="bg-surface-container-lowest border border-primary-container p-6 sm:p-8 max-w-lg w-full shadow-2xl relative">
            <button
              onClick={() => setShowUploadModal(false)}
              className="absolute top-4 right-4 text-tertiary hover:text-white"
            >
              <span className="material-symbols-outlined text-[24px]">close</span>
            </button>

            <h3 className="font-display-xl text-2xl uppercase text-white mb-2">
              Compartir Foto en el Muro
            </h3>
            <p className="text-xs text-tertiary mb-6">
              Sube una instantánea animando al C.D. Voleibol San Pedro en el Sergio Scariolo o en tus entrenamientos.
            </p>

            <form onSubmit={handleAddPhoto} className="space-y-4">
              <div>
                <label className="block text-xs uppercase font-bold text-tertiary mb-1">
                  Tu Nombre o Familia
                </label>
                <input
                  type="text"
                  required
                  value={uploadAuthor}
                  onChange={(e) => setUploadAuthor(e.target.value)}
                  placeholder="Ej. Familia Ruiz • San Pedro"
                  className="w-full px-3 py-2 bg-surface-container-high border border-white/10 text-white text-xs focus:border-primary-container focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs uppercase font-bold text-tertiary mb-1">
                  Mensaje / Pie de Foto
                </label>
                <textarea
                  required
                  rows={3}
                  value={uploadCaption}
                  onChange={(e) => setUploadCaption(e.target.value)}
                  placeholder="¡Vamos San Pedro! Qué gran partido vivimos este sábado..."
                  className="w-full px-3 py-2 bg-surface-container-high border border-white/10 text-white text-xs focus:border-primary-container focus:outline-none"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-primary-container hover:bg-secondary-container text-white font-label-md text-xs uppercase font-bold tracking-wider transition-all shadow-md"
              >
                Publicar en el Muro
              </button>
            </form>
          </div>
        </div>
      )}

      <SponsorBanner customText="ÚNETE COMO COMERCIO PATROCINADOR DE LA AFICIÓN" />
    </div>
  );
}
