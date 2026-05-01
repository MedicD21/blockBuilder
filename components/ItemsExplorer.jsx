"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

const FILTER_INPUT_CLASS =
  "w-full rounded-md border border-[#3a3a5c] bg-[rgba(12,12,24,.95)] px-3 py-2 text-[16px] text-[#e0e0e0] outline-none transition placeholder:text-[#666] focus:border-[#a0c4ff] focus:ring-1 focus:ring-[#a0c4ff]/40";

const CHIP_BASE_CLASS =
  "inline-flex items-center rounded-full border px-2 py-1 text-[13px] font-medium tracking-[0.02em]";

const FAVORITE_CHIP_CLASSES = [
  "border-rose-400/35 bg-rose-500/15 text-rose-200",
  "border-fuchsia-400/35 bg-fuchsia-500/15 text-fuchsia-200",
  "border-pink-400/35 bg-pink-500/15 text-pink-200",
  "border-orange-400/35 bg-orange-500/15 text-orange-200",
  "border-amber-400/35 bg-amber-500/15 text-amber-200",
  "border-lime-400/35 bg-lime-500/15 text-lime-200",
  "border-emerald-400/35 bg-emerald-500/15 text-emerald-200",
  "border-teal-400/35 bg-teal-500/15 text-teal-200",
  "border-cyan-400/35 bg-cyan-500/15 text-cyan-200",
  "border-sky-400/35 bg-sky-500/15 text-sky-200",
  "border-indigo-400/35 bg-indigo-500/15 text-indigo-200",
  "border-violet-400/35 bg-violet-500/15 text-violet-200",
];

function hashLabel(label) {
  let hash = 0;
  for (let i = 0; i < label.length; i += 1) {
    hash = (hash * 31 + label.charCodeAt(i)) >>> 0;
  }
  return hash;
}

function chipTone(label) {
  if (!label) return "border-[#3a3a5c] bg-[rgba(255,255,255,.04)] text-[#e0e0e0]";
  const index = hashLabel(label.toLowerCase()) % FAVORITE_CHIP_CLASSES.length;
  return FAVORITE_CHIP_CLASSES[index];
}

function normalizeFavoriteValue(value) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function normalizePokemonValue(value) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function normalizeTagValue(value) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function getCanonicalFavorite(rawValue, favoriteTypes) {
  if (!rawValue) return "all";

  const trimmedValue = rawValue.trim();
  if (!trimmedValue) return "all";

  const exactMatch = favoriteTypes.find(
    (favoriteType) => favoriteType.toLowerCase() === trimmedValue.toLowerCase(),
  );
  if (exactMatch) return exactMatch;

  const normalizedValue = normalizeFavoriteValue(trimmedValue);
  if (!normalizedValue) return "all";

  return (
    favoriteTypes.find(
      (favoriteType) => normalizeFavoriteValue(favoriteType) === normalizedValue,
    ) ?? "all"
  );
}

function getCanonicalPokemon(rawValue, pokemonOptions) {
  if (!rawValue) return "all";

  const trimmedValue = rawValue.trim();
  if (!trimmedValue) return "all";

  const exactMatch = pokemonOptions.find(
    (pokemonOption) => pokemonOption.id.toLowerCase() === trimmedValue.toLowerCase(),
  );
  if (exactMatch) return exactMatch.id;

  const normalizedValue = normalizePokemonValue(trimmedValue);
  if (!normalizedValue) return "all";

  return (
    pokemonOptions.find(
      (pokemonOption) => normalizePokemonValue(pokemonOption.id) === normalizedValue,
    )?.id ?? "all"
  );
}

function toPublicImageSrc(src) {
  if (!src) return "";
  if (src.startsWith("http://") || src.startsWith("https://")) return src;
  if (src.startsWith("/")) return src;
  return `/${src}`;
}

function matchesQuery(item, query) {
  if (!query) return true;

  const lowerQuery = query.toLowerCase();
  return (
    item.name.toLowerCase().includes(lowerQuery) ||
    item.description.toLowerCase().includes(lowerQuery) ||
    item.sectionTitle.toLowerCase().includes(lowerQuery) ||
    item.favorites.some((favorite) => favorite.toLowerCase().includes(lowerQuery)) ||
    item.locations.some((location) => location.toLowerCase().includes(lowerQuery))
  );
}

export function ItemsExplorer({ dataset, pokemonDataset, tagSpriteMap = {} }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const pokemonPickerRef = useRef(null);
  const [query, setQuery] = useState("");
  const [favoriteFilter, setFavoriteFilter] = useState("all");
  const [pokemonFilter, setPokemonFilter] = useState("all");
  const [isPokemonPickerOpen, setIsPokemonPickerOpen] = useState(false);
  const [collapsedBySection, setCollapsedBySection] = useState({});

  const favoriteCanonicalByNormalized = useMemo(() => {
    const lookup = new Map();
    dataset.favoriteTypes.forEach((favoriteType) => {
      lookup.set(normalizeFavoriteValue(favoriteType), favoriteType);
    });
    return lookup;
  }, [dataset.favoriteTypes]);

  const pokemonOptions = useMemo(() => {
    const pokemonRecords = pokemonDataset?.pokemon ?? [];
    const deduped = new Map();

    pokemonRecords.forEach((pokemon) => {
      if (!pokemon?.name) return;

      const canonicalFavorites = Array.from(
        new Set(
          (pokemon.favorites ?? [])
            .map((favorite) => favoriteCanonicalByNormalized.get(normalizeFavoriteValue(favorite)))
            .filter(Boolean),
        ),
      );

      deduped.set(pokemon.name, {
        id: pokemon.name,
        name: pokemon.name,
        spriteSrc: toPublicImageSrc(pokemon.meta?.spriteUrl || ""),
        favoriteKeys: canonicalFavorites.map((favorite) =>
          normalizeFavoriteValue(favorite),
        ),
      });
    });

    return Array.from(deduped.values()).sort((a, b) =>
      a.name.localeCompare(b.name),
    );
  }, [favoriteCanonicalByNormalized, pokemonDataset?.pokemon]);

  const pokemonOptionById = useMemo(
    () => new Map(pokemonOptions.map((pokemonOption) => [pokemonOption.id, pokemonOption])),
    [pokemonOptions],
  );

  const selectedPokemonOption =
    pokemonFilter === "all" ? null : (pokemonOptionById.get(pokemonFilter) ?? null);

  const selectedPokemonFavoriteKeySet = useMemo(
    () => new Set(selectedPokemonOption?.favoriteKeys ?? []),
    [selectedPokemonOption],
  );

  const queryPokemonFavoriteKeySet = useMemo(() => {
    const trimmedQuery = query.trim().toLowerCase();
    if (!trimmedQuery) return new Set();

    const normalizedQuery = normalizePokemonValue(trimmedQuery);
    const queryTerms = trimmedQuery
      .split(/[^a-z0-9]+/g)
      .map((term) => term.trim())
      .filter((term) => term.length >= 3);

    const favoriteKeys = new Set();
    pokemonOptions.forEach((pokemonOption) => {
      const pokemonNameLower = pokemonOption.name.toLowerCase();
      const normalizedPokemonName = normalizePokemonValue(pokemonOption.name);
      const matchesPokemonName =
        pokemonNameLower.includes(trimmedQuery) ||
        trimmedQuery.includes(pokemonNameLower) ||
        (normalizedQuery.length >= 3 &&
          normalizedPokemonName.includes(normalizedQuery)) ||
        queryTerms.some((term) => pokemonNameLower.includes(term));

      if (!matchesPokemonName) return;
      pokemonOption.favoriteKeys.forEach((favoriteKey) => {
        favoriteKeys.add(favoriteKey);
      });
    });

    return favoriteKeys;
  }, [pokemonOptions, query]);

  const tagSpriteByTag = useMemo(() => {
    const lookup = new Map();

    Object.entries(tagSpriteMap).forEach(([tagLabel, spriteSrc]) => {
      const normalizedTag = normalizeTagValue(tagLabel);
      if (!normalizedTag || !spriteSrc) return;
      lookup.set(normalizedTag, toPublicImageSrc(spriteSrc));
    });

    dataset.sections.forEach((section) => {
      section.items.forEach((item) => {
        if (!item.tagText || !item.imageSrc) return;

        const normalizedTag = normalizeTagValue(item.tagText);
        if (!normalizedTag || lookup.has(normalizedTag)) return;

        lookup.set(normalizedTag, toPublicImageSrc(item.imageSrc));
      });
    });

    return lookup;
  }, [dataset.sections, tagSpriteMap]);

  const favoriteFromUrl = useMemo(
    () => getCanonicalFavorite(searchParams.get("favorite"), dataset.favoriteTypes),
    [dataset.favoriteTypes, searchParams],
  );
  const pokemonFromUrl = useMemo(
    () => getCanonicalPokemon(searchParams.get("pokemon"), pokemonOptions),
    [pokemonOptions, searchParams],
  );

  const applyFavoriteFilter = useCallback(
    (nextFavorite) => {
      const canonicalFavorite =
        nextFavorite === "all"
          ? "all"
          : getCanonicalFavorite(nextFavorite, dataset.favoriteTypes);

      setFavoriteFilter(canonicalFavorite);

      const nextParams = new URLSearchParams(searchParams.toString());
      if (canonicalFavorite === "all") {
        nextParams.delete("favorite");
      } else {
        nextParams.set("favorite", canonicalFavorite);
      }

      const nextQuery = nextParams.toString();
      const nextHref = nextQuery ? `${pathname}?${nextQuery}` : pathname;
      router.replace(nextHref, { scroll: false });
    },
    [dataset.favoriteTypes, pathname, router, searchParams],
  );

  const applyPokemonFilter = useCallback(
    (nextPokemon) => {
      const canonicalPokemon =
        nextPokemon === "all"
          ? "all"
          : getCanonicalPokemon(nextPokemon, pokemonOptions);

      setPokemonFilter(canonicalPokemon);
      setIsPokemonPickerOpen(false);

      const nextParams = new URLSearchParams(searchParams.toString());
      if (canonicalPokemon === "all") {
        nextParams.delete("pokemon");
      } else {
        nextParams.set("pokemon", canonicalPokemon);
      }

      const nextQuery = nextParams.toString();
      const nextHref = nextQuery ? `${pathname}?${nextQuery}` : pathname;
      router.replace(nextHref, { scroll: false });
    },
    [pathname, pokemonOptions, router, searchParams],
  );

  const resetFilters = useCallback(() => {
    setQuery("");
    setFavoriteFilter("all");
    setPokemonFilter("all");
    setIsPokemonPickerOpen(false);

    const nextParams = new URLSearchParams(searchParams.toString());
    nextParams.delete("favorite");
    nextParams.delete("pokemon");

    const nextQuery = nextParams.toString();
    const nextHref = nextQuery ? `${pathname}?${nextQuery}` : pathname;
    router.replace(nextHref, { scroll: false });
  }, [pathname, router, searchParams]);

  useEffect(() => {
    const initialState = {};
    dataset.sections.forEach((section) => {
      initialState[section.id] = true;
    });
    setCollapsedBySection(initialState);
  }, [dataset.sections]);

  useEffect(() => {
    setFavoriteFilter((currentFavorite) =>
      currentFavorite === favoriteFromUrl ? currentFavorite : favoriteFromUrl,
    );
  }, [favoriteFromUrl]);

  useEffect(() => {
    setPokemonFilter((currentPokemon) =>
      currentPokemon === pokemonFromUrl ? currentPokemon : pokemonFromUrl,
    );
  }, [pokemonFromUrl]);

  useEffect(() => {
    if (!isPokemonPickerOpen) return undefined;

    const handlePointerDown = (event) => {
      if (!pokemonPickerRef.current?.contains(event.target)) {
        setIsPokemonPickerOpen(false);
      }
    };
    const handleKeyDown = (event) => {
      if (event.key === "Escape") setIsPokemonPickerOpen(false);
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("touchstart", handlePointerDown);
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("touchstart", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isPokemonPickerOpen]);

  const isFiltering =
    query.trim().length > 0 ||
    favoriteFilter !== "all" ||
    pokemonFilter !== "all";

  const processedSections = useMemo(() => {
    return dataset.sections.map((section) => {
      const filteredItems = section.items.filter((item) => {
        const trimmedQuery = query.trim();
        const matchesFavorite =
          favoriteFilter === "all" || item.favorites.includes(favoriteFilter);
        const matchesPokemon =
          pokemonFilter === "all" ||
          item.favorites.some((favorite) =>
            selectedPokemonFavoriteKeySet.has(normalizeFavoriteValue(favorite)),
          );
        const matchesPokemonFromQuery =
          queryPokemonFavoriteKeySet.size > 0 &&
          item.favorites.some((favorite) =>
            queryPokemonFavoriteKeySet.has(normalizeFavoriteValue(favorite)),
          );
        const matchesSearch =
          matchesQuery(item, trimmedQuery) || matchesPokemonFromQuery;

        return matchesFavorite && matchesPokemon && matchesSearch;
      });

      return {
        ...section,
        filteredItems,
      };
    });
  }, [
    dataset.sections,
    favoriteFilter,
    pokemonFilter,
    query,
    queryPokemonFavoriteKeySet,
    selectedPokemonFavoriteKeySet,
  ]);

  const visibleSections = useMemo(() => {
    if (!isFiltering) return processedSections;
    return processedSections.filter((section) => section.filteredItems.length > 0);
  }, [isFiltering, processedSections]);

  const totalVisibleItems = useMemo(
    () => visibleSections.reduce((sum, section) => sum + section.filteredItems.length, 0),
    [visibleSections],
  );

  const hasNoResults = totalVisibleItems === 0;

  return (
    <section className='space-y-5'>
      <div className='rounded-xl border border-[#3a3a5c] bg-[rgba(10,10,20,.9)] p-4 shadow-[0_8px_30px_rgba(0,0,0,.25)] md:p-5'>
        <div className='grid gap-3 sm:grid-cols-2 lg:grid-cols-4'>
          <label className='space-y-1 text-sm lg:col-span-2'>
            <span className='text-[13px] font-semibold uppercase tracking-[0.12em] text-[#999]'>
              Search Items
            </span>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder='Name, section, location, favorite type, pokemon'
              className={FILTER_INPUT_CLASS}
            />
          </label>

          <div className='space-y-1 text-sm'>
            <span className='text-[13px] font-semibold uppercase tracking-[0.12em] text-[#999]'>
              Pokemon
            </span>
            <div className='relative' ref={pokemonPickerRef}>
              <button
                aria-expanded={isPokemonPickerOpen}
                className={`${FILTER_INPUT_CLASS} flex items-center justify-between gap-2 text-left`}
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
                    {selectedPokemonOption?.name || "All Pokemon Favorites"}
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
                    onClick={() => applyPokemonFilter("all")}
                    type='button'
                  >
                    <span className='inline-flex h-5 w-5 flex-shrink-0 items-center justify-center rounded border border-[#3a3a5c] bg-white/5 text-[12px] text-[#7f8bb0]'>
                      *
                    </span>
                    <span className='truncate'>All Pokemon Favorites</span>
                  </button>

                  {pokemonOptions.map((pokemonOption) => (
                    <button
                      className={`flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-[15px] transition ${
                        pokemonFilter === pokemonOption.id
                          ? "bg-[rgba(160,196,255,.16)] text-[#e6edff]"
                          : "text-[#c7d1ea] hover:bg-white/8"
                      }`}
                      key={pokemonOption.id}
                      onClick={() => applyPokemonFilter(pokemonOption.id)}
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
            <span className='text-[13px] font-semibold uppercase tracking-[0.12em] text-[#999]'>
              Favorite Type
            </span>
            <select
              value={favoriteFilter}
              onChange={(event) => applyFavoriteFilter(event.target.value)}
              className={FILTER_INPUT_CLASS}
            >
              <option value='all'>All Favorite Types</option>
              {dataset.favoriteTypes.map((favoriteType) => (
                <option key={favoriteType} value={favoriteType}>
                  {favoriteType}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className='mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-[#3a3a5c] pt-3'>
          <p className='text-[14px] tracking-[0.08em] text-[#777]'>
            Showing {totalVisibleItems} of {dataset.totalItems} items
          </p>
          <div className='flex items-center gap-2'>
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
            <button
              className='rounded border border-[#3a3a5c] bg-white/5 px-2 py-1 text-[13px] tracking-[0.08em] text-[#9ba9cb] transition hover:bg-white/10'
              onClick={() => {
                const nextState = {};
                dataset.sections.forEach((section) => {
                  nextState[section.id] = false;
                });
                setCollapsedBySection(nextState);
              }}
              type='button'
            >
              EXPAND ALL
            </button>
            <button
              className='rounded border border-[#3a3a5c] bg-white/5 px-2 py-1 text-[13px] tracking-[0.08em] text-[#9ba9cb] transition hover:bg-white/10'
              onClick={() => {
                const nextState = {};
                dataset.sections.forEach((section) => {
                  nextState[section.id] = true;
                });
                setCollapsedBySection(nextState);
              }}
              type='button'
            >
              COLLAPSE ALL
            </button>
          </div>
        </div>
      </div>

      <div className='rounded-xl border border-[#3a3a5c] bg-[rgba(10,10,20,.65)] p-3'>
        <div className='mb-2 flex flex-wrap gap-2'>
          {visibleSections.map((section) => (
            <button
              key={`nav-${section.id}`}
              className='rounded border border-[#3a3a5c] bg-white/5 px-2 py-1 text-[13px] uppercase tracking-[0.08em] text-[#8c9cc2] transition hover:border-[#a0c4ff] hover:text-[#a0c4ff]'
              onClick={() => {
                setCollapsedBySection((prev) => ({
                  ...prev,
                  [section.id]: false,
                }));

                const targetId = `section-${section.id}`;
                window.requestAnimationFrame(() => {
                  document.getElementById(targetId)?.scrollIntoView({
                    behavior: "smooth",
                    block: "start",
                  });
                });
              }}
              type='button'
            >
              {section.title}
            </button>
          ))}
        </div>
      </div>

      {hasNoResults ? (
        <div className='rounded-xl border border-[#3a3a5c] bg-[rgba(10,10,20,.75)] p-6 text-center text-[15px] tracking-[0.08em] text-[#777]'>
          No items match the current filters.
        </div>
      ) : null}

      <div className='space-y-3'>
        {visibleSections.map((section) => {
          const collapsed = isFiltering ? false : Boolean(collapsedBySection[section.id]);

          return (
            <section
              className='scroll-mt-[150px] rounded-xl border border-[#3a3a5c] bg-[rgba(10,10,20,.75)] sm:scroll-mt-[170px]'
              id={`section-${section.id}`}
              key={section.id}
            >
              <button
                className='flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition hover:bg-white/5'
                onClick={() => {
                  setCollapsedBySection((prev) => ({
                    ...prev,
                    [section.id]: !prev[section.id],
                  }));
                }}
                type='button'
              >
                <span className='text-[15px] font-semibold uppercase tracking-[0.16em] text-[#a0c4ff]'>
                  {section.title}
                </span>
                <span className='flex items-center gap-3'>
                  <span className='rounded-full border border-[#3a3a5c] bg-[rgba(160,196,255,.14)] px-2 py-1 text-[13px] text-[#a0c4ff]'>
                    {section.filteredItems.length}
                  </span>
                  <span className='text-[14px] text-[#7e8aac]'>
                    {collapsed ? "Show" : "Hide"}
                  </span>
                </span>
              </button>

              {!collapsed ? (
                <div className='grid gap-3 border-t border-[#3a3a5c] p-3 md:grid-cols-2 xl:grid-cols-3'>
                  {section.filteredItems.map((item) => {
                    const visibleFavoriteTags =
                      favoriteFilter === "all"
                        ? item.favorites
                        : item.favorites.filter((favorite) => favorite === favoriteFilter);
                    const tagSpriteSrc = item.tagText
                      ? tagSpriteByTag.get(normalizeTagValue(item.tagText))
                      : "";

                    return (
                      <article
                        className='rounded-xl border border-[#3a3a5c] bg-[rgba(10,10,20,.92)] p-3 shadow-[inset_0_1px_0_rgba(160,196,255,.08)]'
                        key={item.id}
                      >
                        <div className='flex items-start gap-3'>
                          {item.imageSrc ? (
                            <Image
                              alt={item.imageAlt || item.name}
                              className='h-16 w-16 flex-shrink-0 rounded border border-[#3a3a5c] bg-[rgba(255,255,255,.03)] object-contain p-1'
                              height={64}
                              src={toPublicImageSrc(item.imageSrc)}
                              width={64}
                              unoptimized
                            />
                          ) : null}
                          <div className='min-w-0'>
                            <h3 className='text-[18px] font-semibold leading-tight text-[#e6edff]'>
                              {item.name}
                            </h3>
                            <p className='mt-1 text-[15px] leading-relaxed text-[#aeb9d3]'>
                              {item.description || "No description provided."}
                            </p>
                          </div>
                        </div>

                        {visibleFavoriteTags.length > 0 ? (
                          <div className='mt-3'>
                            <p className='mb-1 text-[12px] uppercase tracking-[0.12em] text-[#777]'>
                              Favorite Tags
                            </p>
                            <div className='flex flex-wrap gap-1'>
                              {visibleFavoriteTags.map((favoriteTag, index) => (
                                <button
                                  aria-pressed={favoriteFilter === favoriteTag}
                                  className={`${CHIP_BASE_CLASS} ${chipTone(favoriteTag)} cursor-pointer transition hover:brightness-110 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#a0c4ff]/60 ${
                                    favoriteFilter === favoriteTag
                                      ? "ring-1 ring-[#a0c4ff]/60"
                                      : ""
                                  }`}
                                  key={`${item.id}-${favoriteTag}-${index}`}
                                  onClick={() => applyFavoriteFilter(favoriteTag)}
                                  type='button'
                                >
                                  {favoriteTag}
                                </button>
                              ))}
                            </div>
                          </div>
                        ) : null}

                        {item.tagText ? (
                          <div className='mt-3'>
                            <p className='mb-1 text-[12px] uppercase tracking-[0.12em] text-[#777]'>
                              Tag
                            </p>
                            <div className='inline-flex items-center gap-2 rounded-md border border-[#3a3a5c] bg-white/5 px-2 py-1 text-[13px] tracking-[0.05em] text-[#c6d1eb]'>
                              {tagSpriteSrc ? (
                                <Image
                                  alt=''
                                  aria-hidden='true'
                                  className='h-8 w-8 flex-shrink-0 rounded-sm border border-[#3a3a5c] bg-[rgba(255,255,255,.03)] object-contain p-[1px]'
                                  height={32}
                                  src={tagSpriteSrc}
                                  unoptimized
                                  width={32}
                                />
                              ) : (
                                <span className='inline-flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-sm border border-[#3a3a5c] bg-white/5 text-[12px] text-[#7f8bb0]'>
                                  ?
                                </span>
                              )}
                              <span>{item.tagText}</span>
                            </div>
                          </div>
                        ) : null}

                        {item.locations.length > 0 ? (
                          <div className='mt-3'>
                            <p className='mb-1 text-[12px] uppercase tracking-[0.12em] text-[#777]'>
                              Locations
                            </p>
                            <ul className='space-y-1 text-[14px] leading-relaxed text-[#93a0c0]'>
                              {item.locations.map((location, index) => (
                                <li key={`${item.id}-${location}-${index}`}>• {location}</li>
                              ))}
                            </ul>
                          </div>
                        ) : null}
                      </article>
                    );
                  })}
                </div>
              ) : null}
            </section>
          );
        })}
      </div>
    </section>
  );
}
