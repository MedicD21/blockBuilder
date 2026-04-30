"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
const CHIP_BASE_CLASS = "rounded-full border px-2 py-1 text-xs font-medium";

const FAVORITE_CHIP_CLASSES = [
  "border-rose-200 bg-rose-100 text-rose-900",
  "border-fuchsia-200 bg-fuchsia-100 text-fuchsia-900",
  "border-pink-200 bg-pink-100 text-pink-900",
  "border-orange-200 bg-orange-100 text-orange-900",
  "border-lime-200 bg-lime-100 text-lime-900",
  "border-teal-200 bg-teal-100 text-teal-900",
  "border-sky-200 bg-sky-100 text-sky-900",
  "border-indigo-200 bg-indigo-100 text-indigo-900",
];

const SPECIALTY_CHIP_CLASSES = [
  "border-amber-200 bg-amber-100 text-amber-900",
  "border-yellow-200 bg-yellow-100 text-yellow-900",
  "border-cyan-200 bg-cyan-100 text-cyan-900",
  "border-violet-200 bg-violet-100 text-violet-900",
  "border-emerald-200 bg-emerald-100 text-emerald-900",
  "border-slate-200 bg-slate-100 text-slate-900",
  "border-blue-200 bg-blue-100 text-blue-900",
  "border-red-200 bg-red-100 text-red-900",
];

const AREA_CHIP_CLASSES = [
  "border-sky-200 bg-sky-100 text-sky-900",
  "border-blue-200 bg-blue-100 text-blue-900",
  "border-cyan-200 bg-cyan-100 text-cyan-900",
  "border-emerald-200 bg-emerald-100 text-emerald-900",
  "border-teal-200 bg-teal-100 text-teal-900",
  "border-indigo-200 bg-indigo-100 text-indigo-900",
  "border-lime-200 bg-lime-100 text-lime-900",
  "border-purple-200 bg-purple-100 text-purple-900",
];

const IDEAL_CHIP_CLASSES = [
  "border-emerald-200 bg-emerald-100 text-emerald-900",
  "border-teal-200 bg-teal-100 text-teal-900",
  "border-lime-200 bg-lime-100 text-lime-900",
  "border-cyan-200 bg-cyan-100 text-cyan-900",
  "border-sky-200 bg-sky-100 text-sky-900",
  "border-violet-200 bg-violet-100 text-violet-900",
];

const RARITY_CHIP_CLASSES = [
  "border-zinc-200 bg-zinc-100 text-zinc-900",
  "border-indigo-200 bg-indigo-100 text-indigo-900",
  "border-amber-200 bg-amber-100 text-amber-900",
  "border-fuchsia-200 bg-fuchsia-100 text-fuchsia-900",
  "border-red-200 bg-red-100 text-red-900",
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
    return "border-black/10 bg-black/5 text-black/80";
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
      <div className='rounded-3xl border border-black/10 bg-white/80 p-4 shadow-sm backdrop-blur-sm'>
        <div className='grid gap-3 md:grid-cols-5'>
          <label className='space-y-1 text-sm'>
            <span className='font-medium'>Search</span>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder='Name, number, favorite, specialty'
              className='w-full rounded-xl border border-black/10 bg-white px-3 py-2 outline-none transition focus:border-black/25'
            />
          </label>

          <label className='space-y-1 text-sm'>
            <span className='font-medium'>Ideal Habitat</span>
            <select
              value={habitat}
              onChange={(event) => setHabitat(event.target.value)}
              className='w-full rounded-xl border border-black/10 bg-white px-3 py-2 outline-none transition focus:border-black/25'
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
            <span className='font-medium'>Primary Location</span>
            <select
              value={location}
              onChange={(event) => setLocation(event.target.value)}
              className='w-full rounded-xl border border-black/10 bg-white px-3 py-2 outline-none transition focus:border-black/25'
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
            <span className='font-medium'>Favorite Category</span>
            <select
              value={favorite}
              onChange={(event) => setFavorite(event.target.value)}
              className='w-full rounded-xl border border-black/10 bg-white px-3 py-2 outline-none transition focus:border-black/25'
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
            <span className='font-medium'>Rarity</span>
            <select
              value={rarity}
              onChange={(event) => setRarity(event.target.value)}
              className='w-full rounded-xl border border-black/10 bg-white px-3 py-2 outline-none transition focus:border-black/25'
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

      <div className='flex items-center justify-between px-1'>
        <h2 className='text-lg font-semibold'>Pokemon Explorer</h2>
        <p className='text-sm text-black/60'>
          Showing {filtered.length} of {dataset.count}
        </p>
      </div>

      <div className='grid gap-3 sm:grid-cols-2 xl:grid-cols-3 bg-green-300/20 p-3 rounded-2xl'>
        {filtered.map((pokemon) => (
          <article
            key={pokemon.number + pokemon.name}
            className='rounded-2xl border-2 border-black/20 bg-green-500/20 p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md'
          >
            <div className='mb-2 flex items-center justify-end gap-2'>
              <h3 className='hidden text-base font-semibold'>{pokemon.name}</h3>
              <span className='flex rounded-full bg-green-500/20 px-2 py-1 text-xs border-2 font-medium'>
                #{pokemon.number}
              </span>
            </div>
            <div className='flex items-center gap-2'>
              {pokemon.meta?.spriteUrl ? (
                <Image
                  aria-hidden='true'
                  className='inline-block h-25 w-25 object-contain'
                  src={pokemon.meta.spriteUrl}
                  alt=''
                  width={24}
                  height={24}
                  unoptimized
                />
              ) : null}
              <span className='text-4xl text-black/70 font-bold'>
                {pokemon.name}
              </span>
            </div>

            <p className='text-sm text-black/70'>{pokemon.primaryLocation}</p>
            <div className='mt-1 flex items-center gap-2 text-sm'>
              <span className='font-medium'>Ideal:</span>
              <span
                className={`${CHIP_BASE_CLASS} ${chipTone(pokemon.idealHabitat, IDEAL_CHIP_CLASSES)}`}
              >
                {pokemon.idealHabitat}
              </span>
            </div>

            {pokemon.meta?.rarity ? (
              <div className='mt-1 flex items-center gap-2 text-sm'>
                <span className='font-medium'>Rarity:</span>
                <span
                  className={`${CHIP_BASE_CLASS} ${chipTone(pokemon.meta.rarity, RARITY_CHIP_CLASSES)}`}
                >
                  {pokemon.meta.rarity}
                </span>
              </div>
            ) : null}

            <div className='mt-3 space-y-2'>
              <div>
                <p className='text-xs font-semibold uppercase tracking-wide text-black/55'>
                  Favorites
                </p>
                {pokemon.favorites.length > 0 ? (
                  <div className='mt-1 flex flex-wrap gap-1'>
                    {pokemon.favorites.map((favoriteName) => (
                      <span
                        key={`${pokemon.number}-${pokemon.name}-favorite-${favoriteName}`}
                        className={`${CHIP_BASE_CLASS} ${chipTone(favoriteName, FAVORITE_CHIP_CLASSES)}`}
                      >
                        {favoriteName}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className='text-sm'>-</p>
                )}
              </div>

              <div>
                <p className='text-xs font-semibold uppercase tracking-wide text-black/55'>
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
                          className={`${CHIP_BASE_CLASS} inline-flex items-center gap-1 ${chipTone(specialty.name, SPECIALTY_CHIP_CLASSES)}`}
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
                              <span className='mx-1 text-black/40'>|</span>
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
                        className={`${CHIP_BASE_CLASS} inline-flex items-center gap-1 ${chipTone(specialtyName, SPECIALTY_CHIP_CLASSES)}`}
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
                  <p className='text-sm'>-</p>
                )}
              </div>

              <div>
                <p className='text-xs font-semibold uppercase tracking-wide text-black/55'>
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
                          className={`${CHIP_BASE_CLASS} inline-flex items-center gap-1 ${chipTone(area.name, AREA_CHIP_CLASSES)}`}
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
                    <p className='text-sm'>-</p>
                  );
                })()}
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
