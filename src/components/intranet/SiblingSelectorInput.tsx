'use client';

import React, { useMemo, useState } from 'react';
import { Search, UserCheck, Users, X } from 'lucide-react';

export interface SiblingCandidateOption {
  athleteId: string;
  fullName: string;
  birthYear?: number | null;
  teamOrCategory?: string | null;
  guardianEmail?: string | null;
  guardianName?: string | null;
  pendingStatus?: string | null;
}

function foldSearchText(raw: string): string {
  return String(raw || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

/**
 * Selector autocompletable de hermano/a en el club.
 * Filtra en vivo a partir del 3.er carácter escrito para evitar listados largos.
 */
export function SiblingSelectorInput({
  candidates,
  excludedAthleteId,
  selectedIds,
  onChange,
  matchGuardianEmail,
  inputId = 'censo-sibling-search',
}: {
  candidates: SiblingCandidateOption[];
  excludedAthleteId?: string;
  selectedIds: string[];
  onChange: (nextIds: string[]) => void;
  matchGuardianEmail?: string | null;
  inputId?: string;
}) {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);

  const selectedOptions = useMemo(
    () =>
      selectedIds
        .map((id) => candidates.find((c) => c.athleteId === id) || { athleteId: id, fullName: id })
        .filter(Boolean),
    [selectedIds, candidates]
  );

  const normalizedQuery = foldSearchText(query);
  const canFilter = normalizedQuery.length >= 3;

  const filteredMatches = useMemo(() => {
    if (!canFilter) return [];
    const tokens = normalizedQuery.split(/\s+/).filter(Boolean);
    const cleanTargetEmail = matchGuardianEmail?.trim().toLowerCase() || '';

    return candidates
      .filter((c) => c.athleteId !== excludedAthleteId && !selectedIds.includes(c.athleteId))
      .filter((c) => {
        const hay = foldSearchText(
          `${c.fullName} ${c.teamOrCategory || ''} ${c.guardianName || ''} ${c.birthYear || ''}`
        );
        return tokens.every((tk) => hay.includes(tk));
      })
      .sort((a, b) => {
        const aSame = cleanTargetEmail && a.guardianEmail?.toLowerCase() === cleanTargetEmail ? 0 : 1;
        const bSame = cleanTargetEmail && b.guardianEmail?.toLowerCase() === cleanTargetEmail ? 0 : 1;
        if (aSame !== bSame) return aSame - bSame;
        return a.fullName.localeCompare(b.fullName, 'es');
      })
      .slice(0, 15);
  }, [canFilter, normalizedQuery, candidates, excludedAthleteId, selectedIds, matchGuardianEmail]);

  const cleanTargetEmail = matchGuardianEmail?.trim().toLowerCase() || '';

  return (
    <div className="rounded-none border border-amber-400/45 bg-amber-950/20 p-3 space-y-2.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <label
          htmlFor={inputId}
          className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-amber-200"
        >
          <Users className="h-3.5 w-3.5 shrink-0 text-amber-300" aria-hidden="true" />
          <span>Vincular hermano/a en el club (obligatorio) *</span>
        </label>
        <span className="text-[10px] font-mono text-amber-200/80">
          Filtra desde 3 letras
        </span>
      </div>

      {selectedOptions.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selectedOptions.map((sel) => (
            <span
              key={sel.athleteId}
              className="inline-flex items-center gap-1.5 rounded-none border border-emerald-500/45 bg-emerald-950/50 px-2.5 py-1 text-xs font-semibold text-emerald-200"
            >
              <UserCheck className="h-3.5 w-3.5 text-emerald-400 shrink-0" aria-hidden="true" />
              <span>
                {sel.fullName}
                {sel.teamOrCategory ? ` (${sel.teamOrCategory})` : ''}
              </span>
              <button
                type="button"
                aria-label={`Quitar a ${sel.fullName}`}
                onClick={() => onChange(selectedIds.filter((id) => id !== sel.athleteId))}
                className="ml-0.5 text-emerald-300 hover:text-white cursor-pointer"
              >
                <X className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            </span>
          ))}
        </div>
      )}

      <div className="relative">
        <Search className="h-3.5 w-3.5 text-tertiary absolute left-2.5 top-1/2 -translate-y-1/2" aria-hidden="true" />
        <input
          id={inputId}
          type="text"
          value={query}
          onFocus={() => setIsOpen(true)}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          placeholder="Escribe al menos 3 letras del nombre o apellidos del hermano/a..."
          className="w-full rounded-none border border-white/15 bg-surface-container pl-8 pr-3 py-2 text-xs text-white placeholder:text-tertiary/75 focus:border-amber-400 focus:outline-none"
        />

        {isOpen && canFilter && (
          <div
            role="listbox"
            aria-label="Hermanos coincidentes en el club"
            className="mt-1 max-h-48 overflow-y-auto rounded-none border border-amber-400/50 bg-surface-container-lowest shadow-[4px_4px_0px_0px_#0e0e0e]"
          >
            {filteredMatches.length === 0 ? (
              <div className="px-3 py-2.5 text-xs text-tertiary">
                No se encontraron deportistas que coincidan con &ldquo;{query.trim()}&rdquo;.
              </div>
            ) : (
              filteredMatches.map((cand) => {
                const isSameTutor = Boolean(
                  cleanTargetEmail && cand.guardianEmail?.toLowerCase() === cleanTargetEmail
                );
                return (
                  <button
                    key={cand.athleteId}
                    type="button"
                    role="option"
                    aria-selected={false}
                    onClick={() => {
                      onChange([...selectedIds, cand.athleteId]);
                      setQuery('');
                      setIsOpen(false);
                    }}
                    className="w-full text-left px-3 py-2 border-b border-white/5 last:border-b-0 hover:bg-amber-500/15 flex items-center justify-between gap-2 text-xs cursor-pointer"
                  >
                    <div className="min-w-0">
                      <p className="font-bold text-white truncate">{cand.fullName}</p>
                      <p className="text-[11px] text-tertiary truncate">
                        {[
                          cand.teamOrCategory || null,
                          cand.birthYear ? `Año ${cand.birthYear}` : null,
                          cand.pendingStatus === 'PENDING' ? 'Solicitud pendiente' : null,
                        ]
                          .filter(Boolean)
                          .join(' · ')}
                      </p>
                    </div>
                    {isSameTutor && (
                      <span className="shrink-0 rounded-none border border-emerald-500/40 bg-emerald-500/15 px-1.5 py-0.5 text-[10px] font-bold uppercase text-emerald-300">
                        Misma familia
                      </span>
                    )}
                  </button>
                );
              })
            )}
          </div>
        )}
      </div>

      {!canFilter && selectedOptions.length === 0 && (
        <p className="text-[11px] text-amber-100/80">
          Introduce al menos <strong>3 caracteres</strong> para mostrar y filtrar la lista de deportistas del club.
        </p>
      )}
    </div>
  );
}
