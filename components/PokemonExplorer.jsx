"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

const FILTER_INPUT_CLASS =
  "w-full rounded-md border border-[#3a3a5c] bg-[rgba(12,12,24,.95)] px-3 py-2 text-[16px] text-[#e0e0e0] outline-none transition placeholder:text-[#666] focus:border-[#a0c4ff] focus:ring-1 focus:ring-[#a0c4ff]/40";

const CHIP_BASE_CLASS =
  "inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[13px] font-medium tracking-[0.02em]";

const FAVORITE_CHIP_CLASSES = [
  "border-rose-400/30 bg-rose-500/15 text-rose-200",
  "border-fuchsia-400/30 bg-fuchsia-500/15 text-fuchsia-200",
  "border-pink-400/30 bg-pink-500/15 text-pink-200",
  "border-orange-400/30 bg-orange-500/15 text-orange-200",
  "border-lime-400/30 bg-lime-500/15 text-lime-200",
  "border-teal-400/30 bg-teal-500/15 text-teal-200",
  "border-sky-400/30 bg-sky-500/15 text-sky-200",
  "border-indigo-400/30 bg-indigo-500/15 text-indigo-200",
];

const SPECIALTY_CHIP_CLASSES = [
  "border-amber-400/30 bg-amber-500/15 text-amber-200",
  "border-yellow-400/30 bg-yellow-500/15 text-yellow-200",
  "border-cyan-400/30 bg-cyan-500/15 text-cyan-200",
  "border-violet-400/30 bg-violet-500/15 text-violet-200",
  "border-emerald-400/30 bg-emerald-500/15 text-emerald-200",
  "border-slate-400/30 bg-slate-500/15 text-slate-200",
  "border-blue-400/30 bg-blue-500/15 text-blue-200",
  "border-red-400/30 bg-red-500/15 text-red-200",
];

const AREA_CHIP_CLASSES = [
  "border-sky-400/30 bg-sky-500/15 text-sky-200",
  "border-blue-400/30 bg-blue-500/15 text-blue-200",
  "border-cyan-400/30 bg-cyan-500/15 text-cyan-200",
  "border-emerald-400/30 bg-emerald-500/15 text-emerald-200",
  "border-teal-400/30 bg-teal-500/15 text-teal-200",
  "border-indigo-400/30 bg-indigo-500/15 text-indigo-200",
  "border-lime-400/30 bg-lime-500/15 text-lime-200",
  "border-purple-400/30 bg-purple-500/15 text-purple-200",
];

const IDEAL_CHIP_CLASSES = [
  "border-emerald-400/30 bg-emerald-500/15 text-emerald-200",
  "border-teal-400/30 bg-teal-500/15 text-teal-200",
  "border-lime-400/30 bg-lime-500/15 text-lime-200",
  "border-cyan-400/30 bg-cyan-500/15 text-cyan-200",
  "border-sky-400/30 bg-sky-500/15 text-sky-200",
  "border-violet-400/30 bg-violet-500/15 text-violet-200",
];

const RARITY_CHIP_CLASSES = [
  "border-zinc-400/30 bg-zinc-500/15 text-zinc-200",
  "border-indigo-400/30 bg-indigo-500/15 text-indigo-200",
  "border-amber-400/30 bg-amber-500/15 text-amber-200",
  "border-fuchsia-400/30 bg-fuchsia-500/15 text-fuchsia-200",
  "border-red-400/30 bg-red-500/15 text-red-200",
];

function hashLabel(label) {
  let hash = 0;
  for (let i = 0; i < label.length; i += 1) {
    hash = (hash * 31 + label.charCodeAt(i)) >>> 0;
  }
  return hash;
}

function chipTone(label, palette) {
  if (palette.length === 0) {
    return "border-[#3a3a5c] bg-[rgba(255,255,255,.04)] text-[#e0e0e0]";
  }

  const index = hashLabel(label.toLowerCase()) % palette.length;
  return palette[index];
}

function normalizeKey(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
}

function normalizeHabitatPathKey(detailPath) {
  return normalizeKey(
    String(detailPath || "")
      .split("/")
      .pop()
      ?.replace(/\.shtml$/i, "") || "",
  );
}

function toPublicImageSrc(src) {
  if (!src) return "";
  if (src.startsWith("http://") || src.startsWith("https://")) return src;
  if (src.startsWith("/")) return src;
  return `/${src}`;
}

function toHabitatAnchorId(habitatPathKey) {
  return habitatPathKey ? `habitat-${habitatPathKey}` : "";
}

export function PokemonExplorer({ dataset, habitatDataset }) {
  const [query, setQuery] = useState("");
  const [habitat, setHabitat] = useState("all");
  const [location, setLocation] = useState("all");
  const [favorite, setFavorite] = useState("all");
  const [rarity, setRarity] = useState("all");
  const [eventType, setEventType] = useState("all");
  const [activePokemonModal, setActivePokemonModal] = useState(null);

  const rarityOptions = useMemo(
    () =>
      Array.from(
        new Set(
          dataset.pokemon
            .map((pokemon) => pokemon.meta?.rarity)
            .filter((value) => Boolean(value)),
        ),
      ).sort((a, b) => a.localeCompare(b)),
    [dataset.pokemon],
  );

  const habitatMetaByPathKey = useMemo(() => {
    const lookup = new Map();
    for (const habitatEntry of habitatDataset?.habitats || []) {
      const detailPathKey = normalizeHabitatPathKey(habitatEntry.detailPath);
      const fallbackKey = normalizeKey(
        habitatEntry.id || habitatEntry.slug || habitatEntry.name,
      );
      const key = detailPathKey || fallbackKey;
      if (!key || lookup.has(key)) continue;
      lookup.set(key, {
        key,
        name: habitatEntry.name,
        anchorId: toHabitatAnchorId(key),
        imageUrl: toPublicImageSrc(habitatEntry.imageUrl),
      });
    }
    return lookup;
  }, [habitatDataset?.habitats]);

  const pokemonHabitatsByCardKey = useMemo(() => {
    const lookup = new Map();

    for (const pokemon of dataset.pokemon) {
      const cardKey = `${pokemon.number}-${pokemon.name}`;
      const habitatIds = Array.isArray(pokemon.meta?.habitatIds)
        ? pokemon.meta.habitatIds
        : [];
      const values = habitatIds
        .map((habitatId) => habitatMetaByPathKey.get(normalizeKey(habitatId)))
        .filter(Boolean);
      const uniqueValues = Array.from(
        values.reduce((acc, value) => {
          if (!acc.has(value.key)) acc.set(value.key, value);
          return acc;
        }, new Map()).values(),
      ).sort((a, b) =>
        a.name.localeCompare(b.name),
      );
      lookup.set(cardKey, uniqueValues);
    }

    return lookup;
  }, [dataset.pokemon, habitatMetaByPathKey]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();

    return dataset.pokemon.filter((pokemon) => {
      const pokemonHabitatEntries =
        pokemonHabitatsByCardKey.get(`${pokemon.number}-${pokemon.name}`) || [];
      const inQuery =
        q.length === 0 ||
        pokemon.name.toLowerCase().includes(q) ||
        pokemon.number.toLowerCase().includes(q) ||
        (pokemon.meta?.eventNumber || "").toLowerCase().includes(q) ||
        pokemon.favorites.some((f) => f.toLowerCase().includes(q)) ||
        pokemon.specialties.some((s) => s.toLowerCase().includes(q)) ||
        pokemonHabitatEntries.some((entry) =>
          entry.name.toLowerCase().includes(q),
        );

      const inHabitat = habitat === "all" || pokemon.idealHabitat === habitat;
      const inLocation =
        location === "all" || pokemon.primaryLocation === location;
      const inFavorite =
        favorite === "all" || pokemon.favorites.includes(favorite);
      const inRarity = rarity === "all" || pokemon.meta?.rarity === rarity;
      const isEventPokemon = Boolean(pokemon.meta?.isEventPokemon);
      const inEventType =
        eventType === "all" ||
        (eventType === "event" && isEventPokemon) ||
        (eventType === "standard" && !isEventPokemon);

      return (
        inQuery &&
        inHabitat &&
        inLocation &&
        inFavorite &&
        inRarity &&
        inEventType
      );
    });
  }, [
    dataset.pokemon,
    eventType,
    favorite,
    habitat,
    location,
    pokemonHabitatsByCardKey,
    query,
    rarity,
  ]);

  const isFiltering =
    query.trim().length > 0 ||
    habitat !== "all" ||
    location !== "all" ||
    favorite !== "all" ||
    rarity !== "all" ||
    eventType !== "all";

  const resetFilters = () => {
    setQuery("");
    setHabitat("all");
    setLocation("all");
    setFavorite("all");
    setRarity("all");
    setEventType("all");
  };

  useEffect(() => {
    if (!activePokemonModal) return undefined;

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        setActivePokemonModal(null);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activePokemonModal]);

  return (
    <section className='space-y-5'>
      <div className='rounded-xl border border-[#3a3a5c] bg-[rgba(10,10,20,.9)] p-4 shadow-[0_8px_30px_rgba(0,0,0,.25)] md:p-5'>
        <div className='grid gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6'>
          <label className='space-y-1 text-sm'>
            <span className='text-[16px] font-semibold uppercase tracking-[0.12em] text-[#999]'>
              Search
            </span>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder='Name, number, favorite, specialty, spawn habitat'
              className={FILTER_INPUT_CLASS}
            />
          </label>

          <label className='space-y-1 text-sm'>
            <span className='text-[16px] font-semibold uppercase tracking-[0.12em] text-[#999]'>
              Ideal Habitat
            </span>
            <select
              value={habitat}
              onChange={(event) => setHabitat(event.target.value)}
              className={FILTER_INPUT_CLASS}
            >
              <option value='all'>All</option>
              {dataset.facets.idealHabitats.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>

          <label className='space-y-1 text-sm'>
            <span className='text-[16px] font-semibold uppercase tracking-[0.12em] text-[#999]'>
              Primary Location
            </span>
            <select
              value={location}
              onChange={(event) => setLocation(event.target.value)}
              className={FILTER_INPUT_CLASS}
            >
              <option value='all'>All</option>
              {dataset.facets.primaryLocations.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>

          <label className='space-y-1 text-sm'>
            <span className='text-[16px] font-semibold uppercase tracking-[0.12em] text-[#999]'>
              Favorite Category
            </span>
            <select
              value={favorite}
              onChange={(event) => setFavorite(event.target.value)}
              className={FILTER_INPUT_CLASS}
            >
              <option value='all'>All</option>
              {dataset.facets.favorites.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>

          <label className='space-y-1 text-sm'>
            <span className='text-[16px] font-semibold uppercase tracking-[0.12em] text-[#999]'>
              Rarity
            </span>
            <select
              value={rarity}
              onChange={(event) => setRarity(event.target.value)}
              className={FILTER_INPUT_CLASS}
            >
              <option value='all'>All</option>
              {rarityOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>

          <label className='space-y-1 text-sm'>
            <span className='text-[16px] font-semibold uppercase tracking-[0.12em] text-[#999]'>
              Pokemon Type
            </span>
            <select
              value={eventType}
              onChange={(event) => setEventType(event.target.value)}
              className={FILTER_INPUT_CLASS}
            >
              <option value='all'>All</option>
              <option value='standard'>Standard</option>
              <option value='event'>Event</option>
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
        <div className='flex flex-wrap items-center gap-2'>
          <h2 className='text-[15px] font-semibold uppercase tracking-[0.18em] text-[#a0c4ff] sm:text-[16px]'>
            Pokemon Directory
          </h2>
          <Link
            className='rounded-full border border-[#49a281] bg-[rgba(73,162,129,.12)] px-2 py-1 text-[11px] font-semibold tracking-[0.1em] text-[#f2a067] transition hover:border-[#8ad7b9] hover:bg-[rgba(73,162,129,.26)] hover:text-[#a0c4ff]'
            href='/pokemon-explorer/habitat-dex'
          >
            HABITAT DEX
          </Link>
        </div>
        <p className='text-[14px] tracking-[0.08em] text-[#777]'>
          Showing {filtered.length} of {dataset.count}
        </p>
      </div>

      {filtered.length === 0 ? (
        <div className='rounded-xl border border-[#3a3a5c] bg-[rgba(10,10,20,.75)] p-6 text-center text-[15px] tracking-[0.08em] text-[#777]'>
          No Pokemon match the current filters.
        </div>
      ) : null}

      <div className='grid gap-3 rounded-xl border border-[#3a3a5c] bg-[rgba(10,10,20,.65)] p-3 md:grid-cols-2 xl:grid-cols-3'>
        {filtered.map((pokemon) => {
          const cardKey = `${pokemon.number}-${pokemon.name}`;
          const isEventPokemon = Boolean(pokemon.meta?.isEventPokemon);
          const spawnHabitats = pokemonHabitatsByCardKey.get(cardKey) || [];
          const displayNumber = isEventPokemon
            ? pokemon.meta?.eventNumber || `E-${pokemon.number}`
            : `#${pokemon.number}`;

          return (
            <article
              key={cardKey}
              className='rounded-xl border border-[#3a3a5c] bg-[rgba(10,10,20,.9)] p-3 shadow-[inset_0_1px_0_rgba(160,196,255,.08)] transition duration-150 hover:-translate-y-0.5 hover:border-[#a0c4ff] sm:p-4'
            >
              <button
                className='w-full text-left'
                onClick={() =>
                  setActivePokemonModal({
                    pokemon,
                    spawnHabitats,
                    displayNumber,
                  })
                }
                type='button'
              >
                <div className='mb-2 flex items-center justify-between gap-2'>
                  <span className='rounded-full border border-[#3a3a5c] bg-[rgba(160,196,255,.14)] px-2 py-1 text-[13px] font-bold tracking-[0.08em] text-[#a0c4ff]'>
                    {displayNumber}
                  </span>
                  <span className='text-[12px] font-semibold tracking-[0.08em] text-[#8ca2d0]'>
                    DETAILS
                  </span>
                </div>

                <div className='flex items-center gap-2'>
                  {pokemon.meta?.spriteUrl ? (
                    <Image
                      aria-hidden='true'
                      className='inline-block h-14 w-14 object-contain sm:h-16 sm:w-16 md:h-20 md:w-20'
                      src={toPublicImageSrc(pokemon.meta.spriteUrl)}
                      alt=''
                      width={80}
                      height={80}
                      unoptimized
                    />
                  ) : null}
                  <span className='break-words text-2xl font-bold leading-none text-[#e6edff] sm:text-3xl'>
                    {pokemon.name}
                  </span>
                </div>

                <p className='mt-2 text-[15px] text-[#8a8aa8] sm:text-sm'>
                  {pokemon.primaryLocation}
                </p>
              </button>
            </article>
          );
        })}
      </div>

      {activePokemonModal ? (
        <div
          className='fixed inset-0 z-50 flex items-center justify-center bg-[rgba(0,0,0,.7)] p-3'
          onClick={() => setActivePokemonModal(null)}
          role='presentation'
        >
          <div
            aria-labelledby='pokemon-modal-title'
            aria-modal='true'
            className='max-h-[88vh] w-full max-w-[900px] overflow-y-auto rounded-xl border border-[#3a3a5c] bg-[rgba(10,10,20,.98)] p-4 shadow-[0_20px_50px_rgba(0,0,0,.4)] sm:p-5'
            onClick={(event) => event.stopPropagation()}
            role='dialog'
          >
            <div className='mb-2 flex items-start justify-between gap-3'>
              <div className='flex min-w-0 items-start gap-3'>
                {activePokemonModal.pokemon.meta?.spriteUrl ? (
                  <Image
                    alt={activePokemonModal.pokemon.name}
                    className='h-16 w-16 flex-shrink-0 rounded-md border border-[#3a3a5c] bg-[rgba(255,255,255,.03)] p-1 object-contain sm:h-20 sm:w-20'
                    height={80}
                    src={toPublicImageSrc(activePokemonModal.pokemon.meta.spriteUrl)}
                    unoptimized
                    width={80}
                  />
                ) : null}
                <div className='min-w-0'>
                  <div className='mb-2 flex items-center gap-2'>
                    <span className='rounded-full border border-[#3a3a5c] bg-[rgba(160,196,255,.14)] px-2 py-1 text-[13px] font-bold tracking-[0.08em] text-[#a0c4ff]'>
                      {activePokemonModal.displayNumber}
                    </span>
                    {activePokemonModal.pokemon.meta?.rarity ? (
                      <span
                        className={`${CHIP_BASE_CLASS} ${chipTone(activePokemonModal.pokemon.meta.rarity, RARITY_CHIP_CLASSES)}`}
                      >
                        {activePokemonModal.pokemon.meta.rarity}
                      </span>
                    ) : null}
                  </div>
                  <h3
                    className='break-words text-3xl font-bold text-[#e6edff]'
                    id='pokemon-modal-title'
                  >
                    {activePokemonModal.pokemon.name}
                  </h3>
                  <p className='mt-1 text-[15px] text-[#8a8aa8]'>
                    {activePokemonModal.pokemon.primaryLocation}
                  </p>
                </div>
              </div>

              <button
                className='rounded border border-[#3a3a5c] px-2 py-1 text-[12px] tracking-[0.1em] text-[#a0c4ff] transition hover:bg-white/10'
                onClick={() => setActivePokemonModal(null)}
                type='button'
              >
                CLOSE
              </button>
            </div>

            <div className='mb-3 flex items-center gap-2 text-sm text-[#a9a9c2]'>
              <span className='font-semibold text-[#999]'>Ideal:</span>
              <span
                className={`${CHIP_BASE_CLASS} ${chipTone(activePokemonModal.pokemon.idealHabitat, IDEAL_CHIP_CLASSES)}`}
              >
                {activePokemonModal.pokemon.idealHabitat}
              </span>
            </div>

            <div className='mb-3 flex items-start gap-2 text-sm text-[#a9a9c2]'>
              <span className='mt-1 font-semibold text-[#999]'>Habitats:</span>
              {activePokemonModal.spawnHabitats.length > 0 ? (
                <div className='flex flex-wrap gap-1'>
                  {activePokemonModal.spawnHabitats.map((habitatEntry) => (
                    <Link
                      className={`${CHIP_BASE_CLASS} ${chipTone(habitatEntry.name, AREA_CHIP_CLASSES)} transition hover:brightness-110 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#a0c4ff]/60`}
                      href={`/pokemon-explorer/habitat-dex#${habitatEntry.anchorId}`}
                      key={`${activePokemonModal.pokemon.number}-${activePokemonModal.pokemon.name}-spawn-habitat-${habitatEntry.key}`}
                    >
                      {habitatEntry.imageUrl ? (
                        <Image
                          alt=''
                          aria-hidden='true'
                          className='h-4 w-4 rounded-sm border border-[#3a3a5c] object-cover'
                          height={16}
                          src={habitatEntry.imageUrl}
                          unoptimized
                          width={16}
                        />
                      ) : null}
                      {habitatEntry.name}
                    </Link>
                  ))}
                </div>
              ) : (
                <span className='text-sm text-[#666]'>-</span>
              )}
            </div>

            <div className='space-y-3'>
              <div>
                <p className='text-[12px] font-semibold uppercase tracking-[0.14em] text-[#777]'>
                  Favorites
                  <span className='ml-1 text-xs font-normal tracking-[0.02em] text-[#5cf73d]'>
                    (tappable to filter items)
                  </span>
                </p>
                {activePokemonModal.pokemon.favorites.length > 0 ? (
                  <div className='mt-1 flex flex-wrap gap-1'>
                    {activePokemonModal.pokemon.favorites.map(
                      (favoriteName, index) => (
                        <Link
                          key={`${activePokemonModal.pokemon.number}-${activePokemonModal.pokemon.name}-favorite-${favoriteName}-${index}`}
                          className={`${CHIP_BASE_CLASS} ${chipTone(favoriteName, FAVORITE_CHIP_CLASSES)} transition hover:brightness-110 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#a0c4ff]/60`}
                          href={`/items?favorite=${encodeURIComponent(favoriteName)}`}
                        >
                          {favoriteName}
                        </Link>
                      ),
                    )}
                  </div>
                ) : (
                  <p className='text-sm text-[#666]'>-</p>
                )}
              </div>

              <div>
                <p className='text-[12px] font-semibold uppercase tracking-[0.14em] text-[#777]'>
                  Specialties
                </p>
                {Array.isArray(activePokemonModal.pokemon.meta?.specialtyDetails) &&
                activePokemonModal.pokemon.meta.specialtyDetails.length > 0 ? (
                  <ul className='mt-1 flex flex-wrap gap-1'>
                    {activePokemonModal.pokemon.meta.specialtyDetails.map(
                      (specialty) => (
                        <li
                          key={`${activePokemonModal.pokemon.number}-${activePokemonModal.pokemon.name}-${specialty.name}`}
                        >
                          <span
                            className={`${CHIP_BASE_CLASS} ${chipTone(specialty.name, SPECIALTY_CHIP_CLASSES)}`}
                          >
                            {specialty.iconUrl ? (
                              <Image
                                aria-hidden='true'
                                className='inline-block h-5 w-5 object-contain align-middle'
                                src={specialty.iconUrl}
                                alt=''
                                width={20}
                                height={20}
                                unoptimized
                              />
                            ) : null}
                            {specialty.name}
                            {specialty.name.toLowerCase() === "litter" &&
                            specialty.litterItemIconUrl ? (
                              <>
                                <span className='mx-1 text-[#666]'>|</span>
                                <Image
                                  aria-hidden='true'
                                  className='inline-block h-5 w-5 object-contain align-middle'
                                  src={specialty.litterItemIconUrl}
                                  alt=''
                                  width={20}
                                  height={20}
                                  unoptimized
                                />
                                {specialty.litterItemName ?? "Drop"}
                              </>
                            ) : null}
                          </span>
                        </li>
                      ),
                    )}
                  </ul>
                ) : activePokemonModal.pokemon.specialties.length > 0 ? (
                  <div className='mt-1 flex flex-wrap gap-1'>
                    {activePokemonModal.pokemon.specialties.map(
                      (specialtyName) => (
                        <span
                          key={`${activePokemonModal.pokemon.number}-${activePokemonModal.pokemon.name}-specialty-${specialtyName}`}
                          className={`${CHIP_BASE_CLASS} ${chipTone(specialtyName, SPECIALTY_CHIP_CLASSES)}`}
                        >
                          {(() => {
                            const specialtyDetail =
                              activePokemonModal.pokemon.meta?.specialtyDetails.find(
                                (detail) => detail.name === specialtyName,
                              );
                            return specialtyDetail?.iconUrl ? (
                              <Image
                                aria-hidden='true'
                                className='inline-block h-5 w-5 object-contain align-middle'
                                src={specialtyDetail.iconUrl}
                                alt=''
                                width={20}
                                height={20}
                                unoptimized
                              />
                            ) : null;
                          })()}
                          {specialtyName}
                        </span>
                      ),
                    )}
                  </div>
                ) : (
                  <p className='text-sm text-[#666]'>-</p>
                )}
              </div>

              <div>
                <p className='text-[12px] font-semibold uppercase tracking-[0.14em] text-[#777]'>
                  Available Areas
                </p>
                {(() => {
                  const areaEntries =
                    activePokemonModal.pokemon.meta?.areaDetails &&
                    activePokemonModal.pokemon.meta.areaDetails.length > 0
                      ? activePokemonModal.pokemon.meta.areaDetails
                      : activePokemonModal.pokemon.availableAreas.map(
                          (areaName) => ({
                            name: areaName,
                          }),
                        );

                  return areaEntries.length > 0 ? (
                    <div className='mt-1 flex flex-wrap gap-1'>
                      {areaEntries.map((area) => (
                        <span
                          key={`${activePokemonModal.pokemon.number}-${activePokemonModal.pokemon.name}-area-${area.name}`}
                          className={`${CHIP_BASE_CLASS} ${chipTone(area.name, AREA_CHIP_CLASSES)}`}
                        >
                          {area.iconUrl ? (
                            <Image
                              aria-hidden='true'
                              className='inline-block h-5 w-5 object-contain align-middle'
                              src={area.iconUrl}
                              alt=''
                              width={20}
                              height={20}
                              unoptimized
                            />
                          ) : null}
                          {area.name}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className='text-sm text-[#666]'>-</p>
                  );
                })()}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
