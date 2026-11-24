'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { ChevronDown, Layers } from 'lucide-react';
import {
  ClubCategoryFamilyCode,
  getCategoryFamilyCode,
  getShortTeamLabelInFamily,
  getTeamColorTheme,
  groupByCategoryFamily,
} from '@/lib/club-info';

export interface CategoryTeamSelectorItem {
  id: string;
  name: string;
  slug?: string;
  description?: string;
  association?: 'FAVB' | 'AFADE';
}

interface CategoryTeamSelectorBarProps {
  items: CategoryTeamSelectorItem[];
  selectedValue: string | null;
  valueKey?: 'id' | 'slug';
  onSelect: (value: string, item?: CategoryTeamSelectorItem) => void;
  allowAll?: boolean;
  allLabel?: string;
  allowFamilyAll?: boolean;
  idPrefix?: string;
  defaultOpenSelected?: boolean;
  ariaLabel?: string;
  rightSlot?: React.ReactNode;
}

export default function CategoryTeamSelectorBar({
  items,
  selectedValue,
  valueKey = 'id',
  onSelect,
  allowAll = false,
  allLabel = 'Todas',
  allowFamilyAll = false,
  idPrefix = 'cat-pill-',
  defaultOpenSelected = false,
  ariaLabel = 'Categorías y equipos',
  rightSlot,
}: CategoryTeamSelectorBarProps) {
  const getItemValue = (item: CategoryTeamSelectorItem): string =>
    valueKey === 'slug' ? item.slug || item.id : item.id;

  const grouped = useMemo(
    () => groupByCategoryFamily(items, (item) => item.id),
    [items]
  );

  const selectedItem = useMemo(
    () =>
      items.find(
        (item) =>
          (valueKey === 'slug' ? item.slug === selectedValue : item.id === selectedValue) ||
          item.id === selectedValue
      ) || null,
    [items, selectedValue, valueKey]
  );

  const activeFamilyCode: ClubCategoryFamilyCode | null = useMemo(() => {
    if (!selectedValue || selectedValue === 'ALL') return null;
    if (selectedValue.startsWith('FAMILY:')) {
      return selectedValue.replace('FAMILY:', '') as ClubCategoryFamilyCode;
    }
    if (selectedItem) {
      return getCategoryFamilyCode(selectedItem.id);
    }
    return null;
  }, [selectedValue, selectedItem]);

  const [openFamily, setOpenFamily] = useState<ClubCategoryFamilyCode | null>(
    defaultOpenSelected ? activeFamilyCode : null
  );

  useEffect(() => {
    if (selectedValue === 'ALL' || !selectedValue) {
      setOpenFamily(null);
    } else if (activeFamilyCode && defaultOpenSelected) {
      setOpenFamily(activeFamilyCode);
    }
  }, [activeFamilyCode, selectedValue, defaultOpenSelected]);

  const openGroup = useMemo(
    () => grouped.find((g) => g.family.code === openFamily) || null,
    [grouped, openFamily]
  );

  const handleFamilyClick = (familyCode: ClubCategoryFamilyCode) => {
    const targetGroup = grouped.find((g) => g.family.code === familyCode);
    if (!targetGroup || targetGroup.items.length === 0) return;

    const isSameActive = activeFamilyCode === familyCode;
    const isCurrentlyOpen = openFamily === familyCode;

    if (isSameActive) {
      setOpenFamily(isCurrentlyOpen ? null : familyCode);
      return;
    }

    setOpenFamily(familyCode);
    if (allowFamilyAll) {
      onSelect(`FAMILY:${familyCode}`);
    } else {
      const first = targetGroup.items[0];
      onSelect(getItemValue(first), first);
    }
  };

  return (
    <section
      aria-label={ariaLabel}
      className="sticky top-28 z-30 bg-[#131313] border-b border-white/10 shadow-lg"
    >
      <div className="max-w-7xl mx-auto px-4 lg:px-8 py-2.5 space-y-2">
        {/* Nivel 1: Categorías principales */}
        <div className="flex items-center justify-between gap-2.5 sm:gap-3">
          <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto category-scrollbar pb-1 sm:pb-1.5 scroll-smooth snap-x snap-mandatory flex-1 min-w-0">
            <span className="hidden lg:inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-tertiary shrink-0 mr-1">
              <Layers className="w-3.5 h-3.5 text-primary" aria-hidden="true" />
              <span>Categoría:</span>
            </span>

            {allowAll && (
              <button
                type="button"
                id={`${idPrefix}ALL`}
                onClick={() => {
                  setOpenFamily(null);
                  onSelect('ALL');
                }}
                aria-pressed={selectedValue === 'ALL'}
                className={`snap-start inline-flex items-center justify-center px-3 py-2 sm:py-1.5 text-xs font-bold uppercase tracking-wider whitespace-nowrap transition-all shrink-0 cursor-pointer ${
                  selectedValue === 'ALL'
                    ? 'bg-primary-container text-white shadow-[2px_2px_0px_0px_#0e0e0e]'
                    : 'bg-surface-container-high text-tertiary hover:text-white'
                }`}
              >
                {allLabel}
              </button>
            )}

            {grouped.map(({ family, items: familyItems }) => {
              const isActiveFamily = activeFamilyCode === family.code;
              const isExpanded = openFamily === family.code;
              return (
                <button
                  key={family.code}
                  type="button"
                  id={`family-tab-${family.code}`}
                  onClick={() => handleFamilyClick(family.code)}
                  aria-expanded={isExpanded}
                  aria-pressed={isActiveFamily}
                  className={`snap-start inline-flex items-center gap-1.5 px-3 py-2 sm:py-1.5 text-xs sm:text-sm font-bold uppercase tracking-wider whitespace-nowrap transition-all shrink-0 cursor-pointer border ${
                    isActiveFamily
                      ? 'bg-primary-container text-white border-primary-container shadow-[2px_2px_0px_0px_#0e0e0e]'
                      : isExpanded
                      ? 'bg-surface-container-highest text-white border-white/25'
                      : 'bg-surface-container-high text-tertiary border-white/5 hover:text-white hover:bg-surface-container-highest'
                  }`}
                >
                  <span>{family.shortLabel}</span>
                  <span
                    className={`px-1.5 py-0.5 text-[10px] font-mono leading-none ${
                      isActiveFamily
                        ? 'bg-black/30 text-white'
                        : 'bg-white/10 text-zinc-300'
                    }`}
                  >
                    {familyItems.length}
                  </span>
                  <ChevronDown
                    className={`w-3.5 h-3.5 transition-transform duration-200 ${
                      isExpanded ? 'rotate-180' : ''
                    }`}
                    aria-hidden="true"
                  />
                </button>
              );
            })}
          </div>

          {rightSlot && <div className="shrink-0">{rightSlot}</div>}
        </div>

        {/* Nivel 2: Equipos desplegados de la categoría abierta */}
        {openGroup && (
          <div className="pt-2 pb-1 border-t border-white/10 flex flex-col gap-1.5 animate-fade-in">
            <div className="flex items-center justify-between gap-2 text-[10px] uppercase tracking-wider text-tertiary">
              <span>
                Equipos en <strong className="text-white">{openGroup.family.label}</strong> (
                {openGroup.items.length})
              </span>
              {selectedItem && activeFamilyCode === openGroup.family.code && (() => {
                const selectedTheme = getTeamColorTheme(selectedItem.name);
                return (
                  <span
                    className={`hidden sm:inline font-bold truncate ${
                      selectedTheme.colorKey ? selectedTheme.textClass : 'text-primary'
                    }`}
                  >
                    Seleccionado: {selectedItem.name}
                  </span>
                );
              })()}
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              {allowFamilyAll && (
                <button
                  type="button"
                  id={`${idPrefix}FAMILY-${openGroup.family.code}`}
                  onClick={() => onSelect(`FAMILY:${openGroup.family.code}`)}
                  aria-pressed={selectedValue === `FAMILY:${openGroup.family.code}`}
                  className={`px-2.5 py-1.5 text-[11px] sm:text-xs font-bold uppercase tracking-wider transition-all cursor-pointer border ${
                    selectedValue === `FAMILY:${openGroup.family.code}`
                      ? 'bg-white text-black border-white'
                      : 'bg-surface-container text-zinc-300 border-white/15 hover:text-white hover:border-white/30'
                  }`}
                >
                  Todos en {openGroup.family.shortLabel}
                </button>
              )}

              {openGroup.items.map((item) => {
                const itemVal = getItemValue(item);
                const isSelected = selectedValue === itemVal;
                const shortLabel = getShortTeamLabelInFamily(item.name, openGroup.family.code);
                const theme = getTeamColorTheme(item.name);
                const buttonClasses = theme.colorKey
                  ? isSelected
                    ? `${theme.activeBgClass} border-2 ${theme.borderClass} ${theme.activeTextClass} shadow-[2px_2px_0px_0px_#0e0e0e]`
                    : `bg-surface-container-low ${theme.textClass} border border-white/15 hover:border-white/40 hover:bg-surface-container-high`
                  : isSelected
                  ? 'bg-primary-container text-white border border-primary shadow-[2px_2px_0px_0px_#0e0e0e]'
                  : 'bg-surface-container-low text-tertiary border border-white/10 hover:text-white hover:border-primary/40 hover:bg-surface-container-high';

                return (
                  <button
                    key={item.id}
                    type="button"
                    id={`${idPrefix}${itemVal}`}
                    onClick={() => onSelect(itemVal, item)}
                    aria-pressed={isSelected}
                    className={`px-2.5 py-1.5 text-[11px] sm:text-xs font-bold uppercase tracking-wider transition-all cursor-pointer text-left inline-flex items-center gap-1.5 ${buttonClasses}`}
                  >
                    {theme.colorKey && (
                      <span
                        className={`w-2 h-2 rounded-full shrink-0 ${theme.dotClass}`}
                        aria-hidden="true"
                      />
                    )}
                    <span>{shortLabel}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
