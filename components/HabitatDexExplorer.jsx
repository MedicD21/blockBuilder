"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";

const INPUT_CLASS =
  "w-full rounded-md border border-[#3a3a5c] bg-[rgba(12,12,24,.95)] px-3 py-2 text-[16px] text-[#e0e0e0] outline-none transition placeholder:text-[#666] focus:border-[#a0c4ff] focus:ring-1 focus:ring-[#a0c4ff]/40";

const TIME_ICON_URLS = {
  Morning: "/images/icons/pokopia/time-morning.svg",
  Day: "/images/icons/pokopia/time-day.svg",
  Evening: "/images/icons/pokopia/time-evening.svg",
  Night: "/images/icons/pokopia/time-night.svg",
};

const WEATHER_ICON_URLS = {
  Sun: "/images/icons/pokopia/weather-sun.svg",
  Cloud: "/images/icons/pokopia/weather-cloud.svg",
  Rain: "/images/icons/pokopia/weather-rain.svg",
};

const HABITAT_RANGE_OPTIONS = [
  { id: "all", label: "All Habitat Ranges" },
  { id: "withered-wastelands", label: "Withered Wastelands (001-048)" },
  { id: "bleak-beach", label: "Bleak Beach (049-097)" },
  { id: "rocky-ridges", label: "Rocky Ridges (098-136)" },
  { id: "sparkling-skylands", label: "Sparkling Skylands (137-183)" },
  { id: "any", label: "Any / Universal (184-209 + Event 001-004)" },
];

function toPublicImageSrc(src) {
  if (!src) return "";
  if (src.startsWith("http://") || src.startsWith("https://")) return src;
  if (src.startsWith("/")) return src;
  return `/${src}`;
}

function iconForTime(value) {
  return TIME_ICON_URLS[value] || "";
}

function iconForWeather(value) {
  return WEATHER_ICON_URLS[value] || "";
}

function normalizeString(value) {
  return String(value || "")
    .trim()
    .toLowerCase();
}

function normalizeKey(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
}

function getHabitatAnchorId(habitat) {
  const detailPathKey = String(habitat?.detailPath || "")
    .split("/")
    .pop()
    ?.replace(/\.shtml$/i, "");
  const key = normalizeKey(
    detailPathKey || habitat?.id || habitat?.slug || habitat?.name,
  );
  return key ? `habitat-${key}` : "";
}

function matchesHabitat(habitat, query) {
  if (!query) return true;

  return (
    normalizeString(habitat.name).includes(query) ||
    normalizeString(habitat.flavorText).includes(query) ||
    habitat.requirements.some((requirement) =>
      normalizeString(requirement.name).includes(query),
    ) ||
    habitat.spawnPokemon.some((pokemon) =>
      normalizeString(pokemon.name).includes(query),
    ) ||
    habitat.spawnPokemon.some((pokemon) =>
      pokemon.locations.some((location) =>
        normalizeString(location).includes(query),
      ),
    )
  );
}

function parseHabitatNumber(value) {
  const parsed = Number.parseInt(String(value || "").trim(), 10);
  return Number.isFinite(parsed) ? parsed : null;
}

function formatHabitatNumber(numberValue) {
  if (!Number.isFinite(numberValue)) return String(numberValue || "");
  return String(numberValue).padStart(3, "0");
}

function getHabitatRangeKey(numberValue, isEventHabitat) {
  if (!Number.isFinite(numberValue)) return "all";
  if (isEventHabitat) return "any";
  if (numberValue >= 1 && numberValue <= 48) return "withered-wastelands";
  if (numberValue >= 49 && numberValue <= 97) return "bleak-beach";
  if (numberValue >= 98 && numberValue <= 136) return "rocky-ridges";
  if (numberValue >= 137 && numberValue <= 183) return "sparkling-skylands";
  if (numberValue >= 184 && numberValue <= 209) return "any";
  return "all";
}

export function HabitatDexExplorer({ habitatDataset }) {
  const [query, setQuery] = useState("");
  const [pokemonFilter, setPokemonFilter] = useState("all");
  const [locationRangeFilter, setLocationRangeFilter] = useState("all");
  const [isPokemonPickerOpen, setIsPokemonPickerOpen] = useState(false);
  const [activeHabitatModal, setActiveHabitatModal] = useState(null);
  const pokemonPickerRef = useRef(null);

  const habitatsWithMeta = useMemo(() => {
    const numberOccurrenceByValue = new Map();

    return habitatDataset.habitats.map((habitat) => {
      const numericNumber = parseHabitatNumber(habitat.number);
      const currentOccurrence =
        (numberOccurrenceByValue.get(numericNumber) || 0) + 1;
      numberOccurrenceByValue.set(numericNumber, currentOccurrence);

      const isEventHabitat =
        Number.isFinite(numericNumber) &&
        numericNumber >= 1 &&
        numericNumber <= 4 &&
        currentOccurrence > 1;
      const displayNumber = isEventHabitat
        ? `E-${formatHabitatNumber(numericNumber)}`
        : formatHabitatNumber(numericNumber);

      return {
        ...habitat,
        numericNumber,
        isEventHabitat,
        displayNumber,
        rangeKey: getHabitatRangeKey(numericNumber, isEventHabitat),
      };
    });
  }, [habitatDataset.habitats]);

  const pokemonOptions = useMemo(() => {
    const deduped = new Map();

    habitatsWithMeta.forEach((habitat) => {
      habitat.spawnPokemon.forEach((pokemon) => {
        if (!pokemon?.name) return;

        const existing = deduped.get(pokemon.name);
        if (existing) return;

        deduped.set(pokemon.name, {
          id: pokemon.name,
          name: pokemon.name,
          spriteSrc: toPublicImageSrc(pokemon.spriteUrl),
        });
      });
    });

    return Array.from(deduped.values()).sort((a, b) =>
      a.name.localeCompare(b.name),
    );
  }, [habitatsWithMeta]);

  const selectedPokemonOption =
    pokemonFilter === "all"
      ? null
      : (pokemonOptions.find((option) => option.id === pokemonFilter) ?? null);

  const filteredHabitats = useMemo(() => {
    const normalizedQuery = normalizeString(query);
    const normalizedPokemonFilter = normalizeKey(pokemonFilter);
    const isPokemonFiltering = pokemonFilter !== "all";
    const isLocationRangeFiltering = locationRangeFilter !== "all";

    return habitatsWithMeta.filter((habitat) => {
      const inQuery = matchesHabitat(habitat, normalizedQuery);
      const inPokemon =
        !isPokemonFiltering ||
        habitat.spawnPokemon.some(
          (pokemon) => normalizeKey(pokemon.name) === normalizedPokemonFilter,
        );
      const inLocationRange =
        !isLocationRangeFiltering || habitat.rangeKey === locationRangeFilter;

      return inQuery && inPokemon && inLocationRange;
    });
  }, [habitatsWithMeta, locationRangeFilter, pokemonFilter, query]);

  const isFiltering =
    query.trim().length > 0 ||
    pokemonFilter !== "all" ||
    locationRangeFilter !== "all";

  const resetFilters = () => {
    setQuery("");
    setPokemonFilter("all");
    setLocationRangeFilter("all");
    setIsPokemonPickerOpen(false);
  };

  useEffect(() => {
    if (!isPokemonPickerOpen && !activeHabitatModal) return undefined;

    const handlePointerDown = (event) => {
      if (!isPokemonPickerOpen) return;
      if (!pokemonPickerRef.current?.contains(event.target)) {
        setIsPokemonPickerOpen(false);
      }
    };

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        setIsPokemonPickerOpen(false);
        setActiveHabitatModal(null);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("touchstart", handlePointerDown);
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("touchstart", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [activeHabitatModal, isPokemonPickerOpen]);

  return (
    <section className='space-y-5'>
      <div className='rounded-xl border border-[#3a3a5c] bg-[rgba(10,10,20,.9)] p-4 shadow-[0_8px_30px_rgba(0,0,0,.25)] md:p-5'>
        <div className='grid gap-3 md:grid-cols-3'>
          <label className='space-y-1 text-sm'>
            <span className='text-[16px] font-semibold uppercase tracking-[0.12em] text-[#999]'>
              Search Habitat Dex
            </span>
            <input
              className={INPUT_CLASS}
              onChange={(event) => setQuery(event.target.value)}
              placeholder='Habitat, requirement, pokemon, location'
              value={query}
            />
          </label>

          <div className='space-y-1 text-sm'>
            <span className='text-[16px] font-semibold uppercase tracking-[0.12em] text-[#999]'>
              Pokemon
            </span>
            <div className='relative' ref={pokemonPickerRef}>
              <button
                aria-expanded={isPokemonPickerOpen}
                className={`${INPUT_CLASS} flex items-center justify-between gap-2 text-left`}
                onClick={() => setIsPokemonPickerOpen((open) => !open)}
                type='button'
              >
                <span className='flex min-w-0 items-center gap-2'>
                  {selectedPokemonOption?.spriteSrc ? (
                    <Image
                      alt=''
                      aria-hidden='true'
                      className='h-5 w-5 flex-shrink-0 object-contain'
                      height={20}
                      src={selectedPokemonOption.spriteSrc}
                      unoptimized
                      width={20}
                    />
                  ) : (
                    <span className='inline-flex h-5 w-5 flex-shrink-0 items-center justify-center rounded border border-[#3a3a5c] bg-white/5 text-[12px] text-[#7f8bb0]'>
                      *
                    </span>
                  )}
                  <span className='truncate'>
                    {selectedPokemonOption?.name || "All Pokemon"}
                  </span>
                </span>
                <span className='text-[12px] text-[#8897bc]'>
                  {isPokemonPickerOpen ? "▲" : "▼"}
                </span>
              </button>

              {isPokemonPickerOpen ? (
                <div className='absolute left-0 right-0 z-20 mt-1 max-h-72 overflow-y-auto rounded-md border border-[#3a3a5c] bg-[rgba(10,10,20,.98)] p-1 shadow-[0_10px_30px_rgba(0,0,0,.45)]'>
                  <button
                    className={`flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-[15px] transition ${
                      pokemonFilter === "all"
                        ? "bg-[rgba(160,196,255,.16)] text-[#e6edff]"
                        : "text-[#c7d1ea] hover:bg-white/8"
                    }`}
                    onClick={() => {
                      setPokemonFilter("all");
                      setIsPokemonPickerOpen(false);
                    }}
                    type='button'
                  >
                    <span className='inline-flex h-5 w-5 flex-shrink-0 items-center justify-center rounded border border-[#3a3a5c] bg-white/5 text-[12px] text-[#7f8bb0]'>
                      *
                    </span>
                    <span className='truncate'>All Pokemon</span>
                  </button>

                  {pokemonOptions.map((pokemonOption) => (
                    <button
                      className={`flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-[15px] transition ${
                        pokemonFilter === pokemonOption.id
                          ? "bg-[rgba(160,196,255,.16)] text-[#e6edff]"
                          : "text-[#c7d1ea] hover:bg-white/8"
                      }`}
                      key={pokemonOption.id}
                      onClick={() => {
                        setPokemonFilter(pokemonOption.id);
                        setIsPokemonPickerOpen(false);
                      }}
                      type='button'
                    >
                      {pokemonOption.spriteSrc ? (
                        <Image
                          alt=''
                          aria-hidden='true'
                          className='h-5 w-5 flex-shrink-0 object-contain'
                          height={20}
                          src={pokemonOption.spriteSrc}
                          unoptimized
                          width={20}
                        />
                      ) : (
                        <span className='inline-flex h-5 w-5 flex-shrink-0 items-center justify-center rounded border border-[#3a3a5c] bg-white/5 text-[12px] text-[#7f8bb0]'>
                          ?
                        </span>
                      )}
                      <span className='truncate'>{pokemonOption.name}</span>
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          </div>

          <label className='space-y-1 text-sm'>
            <span className='text-[16px] font-semibold uppercase tracking-[0.12em] text-[#999]'>
              Location Range
            </span>
            <select
              className={INPUT_CLASS}
              onChange={(event) => setLocationRangeFilter(event.target.value)}
              value={locationRangeFilter}
            >
              {HABITAT_RANGE_OPTIONS.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className='mt-4 flex justify-end border-t border-[#3a3a5c] pt-3'>
          <button
            className={`rounded border px-2 py-1 text-[13px] tracking-[0.08em] transition ${
              isFiltering
                ? "border-[#4b567b] bg-white/5 text-[#b5c0df] hover:bg-white/10"
                : "border-[#2d3250] bg-white/3 text-[#5f6b8f]"
            }`}
            disabled={!isFiltering}
            onClick={resetFilters}
            type='button'
          >
            RESET FILTERS
          </button>
        </div>
      </div>

      <div className='flex flex-wrap items-center justify-between gap-2 px-1'>
        <h2 className='text-[15px] font-semibold uppercase tracking-[0.18em] text-[#a0c4ff] sm:text-[16px]'>
          Habitat Dex
        </h2>
        <p className='text-[14px] tracking-[0.08em] text-[#777]'>
          Showing {filteredHabitats.length} of {habitatDataset.totalHabitats}
        </p>
      </div>

      {filteredHabitats.length === 0 ? (
        <div className='rounded-xl border border-[#3a3a5c] bg-[rgba(10,10,20,.75)] p-6 text-center text-[15px] tracking-[0.08em] text-[#777]'>
          No habitats match the current filters.
        </div>
      ) : null}

      <div className='grid gap-3 rounded-xl border border-[#3a3a5c] bg-[rgba(10,10,20,.65)] p-3 md:grid-cols-2 lg:grid-cols-3'>
        {filteredHabitats.map((habitat) => (
          <article
            className='rounded-xl border border-[#3a3a5c] bg-[rgba(10,10,20,.9)] p-3 shadow-[inset_0_1px_0_rgba(160,196,255,.08)]'
            id={getHabitatAnchorId(habitat)}
            key={`${habitat.id}-${habitat.detailPath || habitat.slug || habitat.name}`}
          >
            <button
              className='w-full text-left'
              onClick={() => setActiveHabitatModal(habitat)}
              type='button'
            >
              <div className='flex items-start justify-between gap-2'>
                <div>
                  <p className='text-[12px] tracking-[0.14em] text-[#7e97c8]'>
                    {habitat.isEventHabitat
                      ? habitat.displayNumber
                      : `#${habitat.displayNumber}`}
                  </p>
                  <h3 className='text-[20px] font-bold uppercase text-[#e8efff] sm:text-[22px]'>
                    {habitat.name}
                  </h3>
                </div>
                {habitat.imageUrl ? (
                  <Image
                    alt={habitat.imageAlt || habitat.name}
                    className='h-1/2 w-1/2 rounded-md border border-[#3a3a5c] bg-[rgba(255,255,255,.03)] object-contain p-1'
                    height={96}
                    src={toPublicImageSrc(habitat.imageUrl)}
                    unoptimized
                    width={96}
                  />
                ) : null}
              </div>
              <p className='mt-2 text-[12px] font-semibold tracking-[0.12em] text-[#8ea4cf]'>
                VIEW DETAILS
              </p>
            </button>
          </article>
        ))}
      </div>

      {activeHabitatModal ? (
        <div
          className='fixed inset-0 z-50 flex items-center justify-center bg-[rgba(0,0,0,.7)] p-3'
          onClick={() => setActiveHabitatModal(null)}
          role='presentation'
        >
          <div
            aria-labelledby='habitat-modal-title'
            aria-modal='true'
            className='max-h-[90vh] w-full max-w-[1000px] overflow-y-auto rounded-xl border border-[#3a3a5c] bg-[rgba(10,10,20,.98)] p-4 shadow-[0_20px_50px_rgba(0,0,0,.4)] sm:p-5'
            onClick={(event) => event.stopPropagation()}
            role='dialog'
          >
            <div className='mb-2 flex items-start justify-between gap-3'>
              <div className='flex min-w-0 items-start gap-3'>
                {activeHabitatModal.imageUrl ? (
                  <Image
                    alt={activeHabitatModal.imageAlt || activeHabitatModal.name}
                    className='h-20 w-20 rounded-md border border-[#3a3a5c] bg-[rgba(255,255,255,.03)] object-contain p-1'
                    height={80}
                    src={toPublicImageSrc(activeHabitatModal.imageUrl)}
                    unoptimized
                    width={80}
                  />
                ) : null}
                <div className='min-w-0'>
                  <p className='text-[12px] tracking-[0.14em] text-[#7e97c8]'>
                    {activeHabitatModal.isEventHabitat
                      ? activeHabitatModal.displayNumber
                      : `#${activeHabitatModal.displayNumber}`}
                  </p>
                  <h3
                    className='break-words text-[30px] font-bold leading-tight text-[#e8efff]'
                    id='habitat-modal-title'
                  >
                    {activeHabitatModal.name}
                  </h3>
                  {activeHabitatModal.primaryLocation ? (
                    <p className='text-[14px] text-[#9fb0d6]'>
                      Primary: {activeHabitatModal.primaryLocation}
                    </p>
                  ) : null}
                </div>
              </div>
              <button
                className='rounded border border-[#3a3a5c] px-2 py-1 text-[12px] tracking-[0.1em] text-[#a0c4ff] transition hover:bg-white/10'
                onClick={() => setActiveHabitatModal(null)}
                type='button'
              >
                CLOSE
              </button>
            </div>

            {activeHabitatModal.flavorText ? (
              <p className='mb-3 text-[14px] text-[#aeb8d8]'>
                {activeHabitatModal.flavorText}
              </p>
            ) : null}

            <div className='mb-3'>
              <p className='mb-1 text-[12px] font-semibold uppercase tracking-[0.14em] text-[#87a2d4]'>
                Requirements
              </p>
              <ul className='space-y-1'>
                {activeHabitatModal.requirements.map((requirement) => (
                  <li
                    className='flex items-center justify-between gap-2 rounded-md border border-[#3a3a5c] bg-[rgba(160,196,255,.08)] px-2 py-1 text-[14px]'
                    key={`${activeHabitatModal.id}-${requirement.id}`}
                  >
                    <span className='flex items-center gap-2'>
                      {requirement.imageUrl ? (
                        <Image
                          alt={requirement.imageAlt || requirement.name}
                          className='h-7 w-7 object-contain'
                          height={28}
                          src={toPublicImageSrc(requirement.imageUrl)}
                          unoptimized
                          width={28}
                        />
                      ) : null}
                      {requirement.name}
                    </span>
                    <span className='rounded-full border border-[#a0c4ff]/40 bg-[#1e2b4d] px-2 py-0.5 text-[12px] font-semibold text-[#d7e7ff]'>
                      x{requirement.quantity}
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <p className='mb-1 text-[12px] font-semibold uppercase tracking-[0.14em] text-[#87a2d4]'>
                Pokemon That Can Spawn
              </p>
              <div className='grid gap-2 sm:grid-cols-2 xl:grid-cols-3'>
                {activeHabitatModal.spawnPokemon.map((pokemon, index) => {
                  const key = `${activeHabitatModal.id}-${pokemon.id}-${index}`;
                  const previewLocations = pokemon.locations.slice(0, 2);

                  return (
                    <div
                      className='rounded-md border border-[#3a3a5c] bg-[rgba(242,160,103,.08)] p-2'
                      key={key}
                    >
                      <div className='mb-1 flex items-center gap-2'>
                        {pokemon.spriteUrl ? (
                          <Image
                            alt={pokemon.spriteAlt || pokemon.name}
                            className='h-10 w-10 object-contain'
                            height={40}
                            src={toPublicImageSrc(pokemon.spriteUrl)}
                            unoptimized
                            width={40}
                          />
                        ) : null}
                        <div className='min-w-0'>
                          <p className='truncate text-[14px] font-semibold text-[#e4ecff]'>
                            {pokemon.name}
                          </p>
                          {pokemon.rarity ? (
                            <p className='text-[12px] text-[#b4c4e9]'>
                              {pokemon.rarity}
                            </p>
                          ) : null}
                        </div>
                      </div>

                      {previewLocations.length > 0 ? (
                        <p className='line-clamp-2 text-[12px] text-[#9caed8]'>
                          {previewLocations.join(" · ")}
                          {pokemon.locations.length > previewLocations.length
                            ? " ..."
                            : ""}
                        </p>
                      ) : null}

                      <div className='mt-2 flex flex-wrap gap-1'>
                        {(pokemon.timeOfDay || []).map((timeValue) => (
                          <span
                            className='inline-flex items-center rounded-full border border-[#3a3a5c] bg-[rgba(255,255,255,.06)] p-0.5'
                            key={`${key}-time-${timeValue}`}
                            title={`Time: ${timeValue}`}
                          >
                            {iconForTime(timeValue) ? (
                              <Image
                                alt={timeValue}
                                className='h-6 w-6 rounded-full border border-[#3a3a5c] object-cover'
                                height={40}
                                src={iconForTime(timeValue)}
                                unoptimized
                                width={40}
                              />
                            ) : null}
                          </span>
                        ))}
                        <div className='mx-1 h-6 w-px bg-[#3a3a5c]' />
                        {(pokemon.weather || []).map((weatherValue) => (
                          <span
                            className='inline-flex items-center rounded-full border border-[#3a3a5c] bg-[rgba(255,255,255,.06)] p-0.5'
                            key={`${key}-weather-${weatherValue}`}
                            title={`Weather: ${weatherValue}`}
                          >
                            {iconForWeather(weatherValue) ? (
                              <Image
                                alt={weatherValue}
                                className='h-6 w-6 rounded-full border border-[#3a3a5c] object-cover'
                                height={40}
                                src={iconForWeather(weatherValue)}
                                unoptimized
                                width={40}
                              />
                            ) : null}
                          </span>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
