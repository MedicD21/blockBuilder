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

export function PokemonExplorer({ dataset }) {
  const [query, setQuery] = useState("");
  const [habitat, setHabitat] = useState("all");
  const [location, setLocation] = useState("all");
  const [favorite, setFavorite] = useState("all");
  const [rarity, setRarity] = useState("all");
  const [isMobileViewport, setIsMobileViewport] = useState(false);
  const [expandedMobileCards, setExpandedMobileCards] = useState({});

  useEffect(() => {
    if (typeof window === "undefined") return undefined;

    const mediaQuery = window.matchMedia("(max-width: 767px)");
    const syncViewport = (matches) => {
      setIsMobileViewport(matches);
      if (!matches) {
        setExpandedMobileCards({});
      }
    };

    syncViewport(mediaQuery.matches);

    const handleChange = (event) => {
      syncViewport(event.matches);
    };

    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener("change", handleChange);
      return () => {
        mediaQuery.removeEventListener("change", handleChange);
      };
    }

    mediaQuery.addListener(handleChange);
    return () => {
      mediaQuery.removeListener(handleChange);
    };
  }, []);

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

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();

    return dataset.pokemon.filter((pokemon) => {
      const inQuery =
        q.length === 0 ||
        pokemon.name.toLowerCase().includes(q) ||
        pokemon.number.toLowerCase().includes(q) ||
        pokemon.favorites.some((f) => f.toLowerCase().includes(q)) ||
        pokemon.specialties.some((s) => s.toLowerCase().includes(q));

      const inHabitat = habitat === "all" || pokemon.idealHabitat === habitat;
      const inLocation =
        location === "all" || pokemon.primaryLocation === location;
      const inFavorite =
        favorite === "all" || pokemon.favorites.includes(favorite);
      const inRarity = rarity === "all" || pokemon.meta?.rarity === rarity;

      return inQuery && inHabitat && inLocation && inFavorite && inRarity;
    });
  }, [dataset.pokemon, favorite, habitat, location, query, rarity]);

  return (
    <section className='space-y-5'>
      <div className='rounded-xl border border-[#3a3a5c] bg-[rgba(10,10,20,.9)] p-4 shadow-[0_8px_30px_rgba(0,0,0,.25)] md:p-5'>
        <div className='grid gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-5'>
          <label className='space-y-1 text-sm'>
            <span className='text-[16px] font-semibold uppercase tracking-[0.12em] text-[#999]'>
              Search
            </span>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder='Name, number, favorite, specialty'
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
        </div>
      </div>

      <div className='flex flex-wrap items-center justify-between gap-2 px-1'>
        <h2 className='text-[15px] font-semibold uppercase tracking-[0.18em] text-[#a0c4ff] sm:text-[16px]'>
          Pokemon Directory
        </h2>
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
        {filtered.map((pokemon) =>
          (() => {
            const cardKey = `${pokemon.number}-${pokemon.name}`;
            const isExpandedOnMobile = Boolean(expandedMobileCards[cardKey]);
            const showCardDetails = !isMobileViewport || isExpandedOnMobile;

            const summaryContent = (
              <>
                <div className='mb-2 flex items-center justify-between gap-2'>
                  <span className='rounded-full border border-[#3a3a5c] bg-[rgba(160,196,255,.14)] px-2 py-1 text-[13px] font-bold tracking-[0.08em] text-[#a0c4ff]'>
                    #{pokemon.number}
                  </span>
                  {isMobileViewport ? (
                    <span className='text-[12px] font-semibold tracking-[0.08em] text-[#8ca2d0]'>
                      {isExpandedOnMobile ? "Hide" : "Show"}
                    </span>
                  ) : null}
                </div>

                <div className='flex items-center gap-2'>
                  {pokemon.meta?.spriteUrl ? (
                    <Image
                      aria-hidden='true'
                      className='inline-block h-14 w-14 object-contain sm:h-16 sm:w-16 md:h-20 md:w-20'
                      src={pokemon.meta.spriteUrl}
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
              </>
            );

            return (
              <article
                key={cardKey}
                className='rounded-xl border border-[#3a3a5c] bg-[rgba(10,10,20,.9)] p-3 shadow-[inset_0_1px_0_rgba(160,196,255,.08)] transition duration-150 hover:-translate-y-0.5 hover:border-[#a0c4ff] sm:p-4'
              >
                {isMobileViewport ? (
                  <button
                    className='w-full text-left'
                    onClick={() =>
                      setExpandedMobileCards((prev) => ({
                        ...prev,
                        [cardKey]: !prev[cardKey],
                      }))
                    }
                    type='button'
                  >
                    {summaryContent}
                  </button>
                ) : (
                  <div>{summaryContent}</div>
                )}

                {showCardDetails ? (
                  <>
                    <p className='mt-1 text-[15px] text-[#8a8aa8] sm:text-sm'>
                      {pokemon.primaryLocation}
                    </p>

                    <div className='mt-2 flex items-center gap-2 text-sm text-[#a9a9c2]'>
                      <span className='font-semibold text-[#999]'>Ideal:</span>
                      <span
                        className={`${CHIP_BASE_CLASS} ${chipTone(pokemon.idealHabitat, IDEAL_CHIP_CLASSES)}`}
                      >
                        {pokemon.idealHabitat}
                      </span>
                    </div>

                    {pokemon.meta?.rarity ? (
                      <div className='mt-1 flex items-center gap-2 text-sm text-[#a9a9c2]'>
                        <span className='font-semibold text-[#999]'>
                          Rarity:
                        </span>
                        <span
                          className={`${CHIP_BASE_CLASS} ${chipTone(pokemon.meta.rarity, RARITY_CHIP_CLASSES)}`}
                        >
                          {pokemon.meta.rarity}
                        </span>
                      </div>
                    ) : null}

                    <div className='mt-3 space-y-2'>
                      <div>
                        <p className='text-[12px] font-semibold uppercase tracking-[0.14em] text-[#777]'>
                          Favorites
                          <span className='ml-1 text-xs font-normal tracking-[0.02em] text-[#5cf73d]'>
                            (tappable to filter items)
                          </span>
                        </p>
                        {pokemon.favorites.length > 0 ? (
                          <div className='mt-1 flex flex-wrap gap-1'>
                            {pokemon.favorites.map((favoriteName, index) => (
                              <Link
                                key={`${pokemon.number}-${pokemon.name}-favorite-${favoriteName}-${index}`}
                                className={`${CHIP_BASE_CLASS} ${chipTone(favoriteName, FAVORITE_CHIP_CLASSES)} transition hover:brightness-110 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#a0c4ff]/60`}
                                href={`/items?favorite=${encodeURIComponent(favoriteName)}`}
                              >
                                {favoriteName}
                              </Link>
                            ))}
                          </div>
                        ) : (
                          <p className='text-sm text-[#666]'>-</p>
                        )}
                      </div>

                      <div>
                        <p className='text-[12px] font-semibold uppercase tracking-[0.14em] text-[#777]'>
                          Specialties
                        </p>
                        {Array.isArray(pokemon.meta?.specialtyDetails) &&
                        pokemon.meta.specialtyDetails.length > 0 ? (
                          <ul className='mt-1 flex flex-wrap gap-1'>
                            {pokemon.meta.specialtyDetails.map((specialty) => (
                              <li
                                key={`${pokemon.number}-${pokemon.name}-${specialty.name}`}
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
                                      <span className='mx-1 text-[#666]'>
                                        |
                                      </span>
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
                            ))}
                          </ul>
                        ) : pokemon.specialties.length > 0 ? (
                          <div className='mt-1 flex flex-wrap gap-1'>
                            {pokemon.specialties.map((specialtyName) => (
                              <span
                                key={`${pokemon.number}-${pokemon.name}-specialty-${specialtyName}`}
                                className={`${CHIP_BASE_CLASS} ${chipTone(specialtyName, SPECIALTY_CHIP_CLASSES)}`}
                              >
                                {(() => {
                                  const specialtyDetail =
                                    pokemon.meta?.specialtyDetails.find(
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
                            ))}
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
                            pokemon.meta?.areaDetails &&
                            pokemon.meta.areaDetails.length > 0
                              ? pokemon.meta.areaDetails
                              : pokemon.availableAreas.map((areaName) => ({
                                  name: areaName,
                                }));

                          return areaEntries.length > 0 ? (
                            <div className='mt-1 flex flex-wrap gap-1'>
                              {areaEntries.map((area) => (
                                <span
                                  key={`${pokemon.number}-${pokemon.name}-area-${area.name}`}
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
                  </>
                ) : null}
              </article>
            );
          })(),
        )}
      </div>
    </section>
  );
}
