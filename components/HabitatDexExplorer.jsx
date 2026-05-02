"use client";

import Image from "next/image";
import { useMemo, useState } from "react";

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

function matchesHabitat(habitat, query) {
  if (!query) return true;

  const lowerQuery = query.toLowerCase();
  return (
    habitat.name.toLowerCase().includes(lowerQuery) ||
    habitat.flavorText.toLowerCase().includes(lowerQuery) ||
    habitat.requirements.some((requirement) =>
      requirement.name.toLowerCase().includes(lowerQuery),
    ) ||
    habitat.spawnPokemon.some((pokemon) =>
      pokemon.name.toLowerCase().includes(lowerQuery),
    ) ||
    habitat.spawnPokemon.some((pokemon) =>
      pokemon.locations.some((location) =>
        location.toLowerCase().includes(lowerQuery),
      ),
    )
  );
}

export function HabitatDexExplorer({ habitatDataset }) {
  const [query, setQuery] = useState("");
  const [locationFilter, setLocationFilter] = useState("all");
  const [activePokemonModal, setActivePokemonModal] = useState(null);

  const locationOptions = useMemo(() => {
    const values = new Set();

    habitatDataset.habitats.forEach((habitat) => {
      habitat.spawnPokemon.forEach((pokemon) => {
        pokemon.locations.forEach((location) => {
          if (location) values.add(location);
        });
      });
    });

    return Array.from(values).sort((a, b) => a.localeCompare(b));
  }, [habitatDataset.habitats]);

  const filteredHabitats = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return habitatDataset.habitats.filter((habitat) => {
      const inQuery = matchesHabitat(habitat, normalizedQuery);
      const inLocation =
        locationFilter === "all" ||
        habitat.spawnPokemon.some((pokemon) =>
          pokemon.locations.includes(locationFilter),
        );

      return inQuery && inLocation;
    });
  }, [habitatDataset.habitats, locationFilter, query]);

  return (
    <section className='space-y-5'>
      <div className='rounded-xl border border-[#3a3a5c] bg-[rgba(10,10,20,.9)] p-4 shadow-[0_8px_30px_rgba(0,0,0,.25)] md:p-5'>
        <div className='grid gap-3 md:grid-cols-2'>
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

          <label className='space-y-1 text-sm'>
            <span className='text-[16px] font-semibold uppercase tracking-[0.12em] text-[#999]'>
              Location
            </span>
            <select
              className={INPUT_CLASS}
              onChange={(event) => setLocationFilter(event.target.value)}
              value={locationFilter}
            >
              <option value='all'>All</option>
              {locationOptions.map((location) => (
                <option key={location} value={location}>
                  {location}
                </option>
              ))}
            </select>
          </label>
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

      <div className='grid gap-3 rounded-xl border border-[#3a3a5c] bg-[rgba(10,10,20,.65)] p-3 lg:grid-cols-2'>
        {filteredHabitats.map((habitat) => (
          <article
            className='rounded-xl border border-[#3a3a5c] bg-[rgba(10,10,20,.9)] p-3 shadow-[inset_0_1px_0_rgba(160,196,255,.08)] sm:p-4'
            key={`${habitat.id}-${habitat.detailPath || habitat.slug || habitat.name}`}
          >
            <div className='mb-2 flex items-start justify-between gap-2'>
              <div>
                <p className='text-[12px] tracking-[0.14em] text-[#7e97c8]'>
                  #{habitat.number}
                </p>
                <h3 className='text-[22px] font-bold text-[#e8efff] sm:text-[26px]'>
                  {habitat.name}
                </h3>
              </div>
              {habitat.imageUrl ? (
                <Image
                  alt={habitat.imageAlt || habitat.name}
                  className='h-24 w-24 rounded-md border border-[#3a3a5c] bg-[rgba(255,255,255,.03)] object-contain p-1 sm:h-28 sm:w-28'
                  height={112}
                  src={toPublicImageSrc(habitat.imageUrl)}
                  unoptimized
                  width={112}
                />
              ) : null}
            </div>

            {habitat.flavorText ? (
              <p className='mb-3 text-[14px] text-[#aeb8d8]'>
                {habitat.flavorText}
              </p>
            ) : null}

            <div className='mb-3'>
              <p className='mb-1 text-[12px] font-semibold uppercase tracking-[0.14em] text-[#87a2d4]'>
                Requirements
              </p>
              <ul className='space-y-1'>
                {habitat.requirements.map((requirement) => (
                  <li
                    className='flex items-center justify-between gap-2 rounded-md border border-[#3a3a5c] bg-[rgba(160,196,255,.08)] px-2 py-1 text-[14px]'
                    key={`${habitat.id}-${requirement.id}`}
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
                {habitat.spawnPokemon.map((pokemon, index) => {
                  const key = `${habitat.id}-${pokemon.id}-${index}`;
                  const previewLocations = pokemon.locations.slice(0, 2);

                  return (
                    <button
                      className='rounded-md border border-[#3a3a5c] bg-[rgba(242,160,103,.08)] p-2 text-left transition hover:border-[#a0c4ff] hover:bg-[rgba(160,196,255,.12)]'
                      key={key}
                      onClick={() =>
                        setActivePokemonModal({
                          habitatName: habitat.name,
                          pokemon,
                        })
                      }
                      type='button'
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
                    </button>
                  );
                })}
              </div>
            </div>
          </article>
        ))}
      </div>

      {activePokemonModal ? (
        <div className='fixed inset-0 z-50 flex items-center justify-center bg-[rgba(0,0,0,.7)] p-3'>
          <div className='w-full max-w-[560px] rounded-xl border border-[#3a3a5c] bg-[rgba(10,10,20,.98)] p-4 shadow-[0_20px_50px_rgba(0,0,0,.4)]'>
            <div className='flex items-start justify-between gap-3'>
              <div>
                <p className='text-[12px] uppercase tracking-[0.12em] text-[#8ea4cf]'>
                  {activePokemonModal.habitatName}
                </p>
                <h3 className='text-[24px] font-bold text-[#e8efff]'>
                  {activePokemonModal.pokemon.name}
                </h3>
                {activePokemonModal.pokemon.rarity ? (
                  <p className='text-[13px] text-[#9fb0d6]'>
                    Rarity: {activePokemonModal.pokemon.rarity}
                  </p>
                ) : null}
              </div>
              <button
                className='rounded border border-[#3a3a5c] px-2 py-1 text-[12px] tracking-[0.1em] text-[#a0c4ff] transition hover:bg-white/10'
                onClick={() => setActivePokemonModal(null)}
                type='button'
              >
                CLOSE
              </button>
            </div>

            <div className='mt-3 flex items-center gap-3'>
              {activePokemonModal.pokemon.spriteUrl ? (
                <Image
                  alt={
                    activePokemonModal.pokemon.spriteAlt ||
                    activePokemonModal.pokemon.name
                  }
                  className='h-20 w-20 rounded border border-[#3a3a5c] bg-[rgba(255,255,255,.03)] object-contain p-1'
                  height={80}
                  src={toPublicImageSrc(activePokemonModal.pokemon.spriteUrl)}
                  unoptimized
                  width={80}
                />
              ) : null}

              <div className='space-y-2'>
                <div>
                  <p className='text-[12px] uppercase tracking-[0.12em] text-[#8ea4cf]'>
                    Time
                  </p>
                  <div className='mt-1 flex flex-wrap gap-1'>
                    {(activePokemonModal.pokemon.timeOfDay || []).map(
                      (timeValue) => (
                        <span
                          className='inline-flex items-center rounded-full border border-[#3a3a5c] bg-[rgba(160,196,255,.1)] p-0.5'
                          key={`modal-time-${timeValue}`}
                          title={`Time: ${timeValue}`}
                        >
                          {iconForTime(timeValue) ? (
                            <Image
                              alt={timeValue}
                              className='h-4 w-4 rounded-full border border-[#3a3a5c] object-cover'
                              height={16}
                              src={iconForTime(timeValue)}
                              unoptimized
                              width={16}
                            />
                          ) : null}
                        </span>
                      ),
                    )}
                  </div>
                </div>

                <div>
                  <p className='text-[12px] uppercase tracking-[0.12em] text-[#8ea4cf]'>
                    Weather
                  </p>
                  <div className='mt-1 flex flex-wrap gap-1'>
                    {(activePokemonModal.pokemon.weather || []).map(
                      (weatherValue) => (
                        <span
                          className='inline-flex items-center rounded-full border border-[#3a3a5c] bg-[rgba(160,196,255,.1)] p-0.5'
                          key={`modal-weather-${weatherValue}`}
                          title={`Weather: ${weatherValue}`}
                        >
                          {iconForWeather(weatherValue) ? (
                            <Image
                              alt={weatherValue}
                              className='h-4 w-4 rounded-full border border-[#3a3a5c] object-cover'
                              height={16}
                              src={iconForWeather(weatherValue)}
                              unoptimized
                              width={16}
                            />
                          ) : null}
                        </span>
                      ),
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className='mt-3'>
              <p className='text-[12px] uppercase tracking-[0.12em] text-[#8ea4cf]'>
                Locations
              </p>
              <div className='mt-1 flex flex-wrap gap-1'>
                {(activePokemonModal.pokemon.locations || []).map(
                  (location) => (
                    <span
                      className='rounded-full border border-[#3a3a5c] bg-[rgba(255,255,255,.06)] px-2 py-0.5 text-[12px] text-[#d7e7ff]'
                      key={`modal-location-${location}`}
                    >
                      {location}
                    </span>
                  ),
                )}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
