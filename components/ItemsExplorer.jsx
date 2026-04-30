"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

const FILTER_INPUT_CLASS =
  "w-full rounded-md border border-[#3a3a5c] bg-[rgba(12,12,24,.95)] px-3 py-2 text-[14px] text-[#e0e0e0] outline-none transition placeholder:text-[#666] focus:border-[#a0c4ff] focus:ring-1 focus:ring-[#a0c4ff]/40";

const CHIP_BASE_CLASS =
  "inline-flex items-center rounded-full border px-2 py-1 text-[11px] font-medium tracking-[0.02em]";

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

export function ItemsExplorer({ dataset }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState("");
  const [favoriteFilter, setFavoriteFilter] = useState("all");
  const [collapsedBySection, setCollapsedBySection] = useState({});

  const favoriteFromUrl = useMemo(
    () => getCanonicalFavorite(searchParams.get("favorite"), dataset.favoriteTypes),
    [dataset.favoriteTypes, searchParams],
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

  const isFiltering = query.trim().length > 0 || favoriteFilter !== "all";

  const processedSections = useMemo(() => {
    return dataset.sections.map((section) => {
      const filteredItems = section.items.filter((item) => {
        const matchesFavorite =
          favoriteFilter === "all" || item.favorites.includes(favoriteFilter);
        return matchesFavorite && matchesQuery(item, query.trim());
      });

      return {
        ...section,
        filteredItems,
      };
    });
  }, [dataset.sections, favoriteFilter, query]);

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
        <div className='grid gap-3 sm:grid-cols-2 lg:grid-cols-3'>
          <label className='space-y-1 text-sm lg:col-span-2'>
            <span className='text-[11px] font-semibold uppercase tracking-[0.12em] text-[#999]'>
              Search Items
            </span>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder='Name, section, location, favorite type'
              className={FILTER_INPUT_CLASS}
            />
          </label>

          <label className='space-y-1 text-sm'>
            <span className='text-[11px] font-semibold uppercase tracking-[0.12em] text-[#999]'>
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
          <p className='text-[12px] tracking-[0.08em] text-[#777]'>
            Showing {totalVisibleItems} of {dataset.totalItems} items
          </p>
          <div className='flex items-center gap-2'>
            <button
              className='rounded border border-[#3a3a5c] bg-white/5 px-2 py-1 text-[11px] tracking-[0.08em] text-[#9ba9cb] transition hover:bg-white/10'
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
              className='rounded border border-[#3a3a5c] bg-white/5 px-2 py-1 text-[11px] tracking-[0.08em] text-[#9ba9cb] transition hover:bg-white/10'
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
            <a
              key={`nav-${section.id}`}
              className='rounded border border-[#3a3a5c] bg-white/5 px-2 py-1 text-[11px] uppercase tracking-[0.08em] text-[#8c9cc2] transition hover:border-[#a0c4ff] hover:text-[#a0c4ff]'
              href={`#section-${section.id}`}
            >
              {section.title}
            </a>
          ))}
        </div>
      </div>

      {hasNoResults ? (
        <div className='rounded-xl border border-[#3a3a5c] bg-[rgba(10,10,20,.75)] p-6 text-center text-[13px] tracking-[0.08em] text-[#777]'>
          No items match the current filters.
        </div>
      ) : null}

      <div className='space-y-3'>
        {visibleSections.map((section) => {
          const collapsed = isFiltering ? false : Boolean(collapsedBySection[section.id]);

          return (
            <section
              className='rounded-xl border border-[#3a3a5c] bg-[rgba(10,10,20,.75)]'
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
                <span className='text-[13px] font-semibold uppercase tracking-[0.16em] text-[#a0c4ff]'>
                  {section.title}
                </span>
                <span className='flex items-center gap-3'>
                  <span className='rounded-full border border-[#3a3a5c] bg-[rgba(160,196,255,.14)] px-2 py-1 text-[11px] text-[#a0c4ff]'>
                    {section.filteredItems.length}
                  </span>
                  <span className='text-[12px] text-[#7e8aac]'>
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
                            <h3 className='text-[16px] font-semibold leading-tight text-[#e6edff]'>
                              {item.name}
                            </h3>
                            <p className='mt-1 text-[13px] leading-relaxed text-[#aeb9d3]'>
                              {item.description || "No description provided."}
                            </p>
                          </div>
                        </div>

                        {visibleFavoriteTags.length > 0 ? (
                          <div className='mt-3'>
                            <p className='mb-1 text-[10px] uppercase tracking-[0.12em] text-[#777]'>
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
                          <p className='mt-3 text-[11px] uppercase tracking-[0.1em] text-[#7f8bb0]'>
                            Tag: {item.tagText}
                          </p>
                        ) : null}

                        {item.locations.length > 0 ? (
                          <div className='mt-3'>
                            <p className='mb-1 text-[10px] uppercase tracking-[0.12em] text-[#777]'>
                              Locations
                            </p>
                            <ul className='space-y-1 text-[12px] leading-relaxed text-[#93a0c0]'>
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
