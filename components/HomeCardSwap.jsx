"use client";

import Image from "next/image";
import Link from "next/link";
import { forwardRef, useEffect, useMemo, useRef, useState } from "react";
import gsap from "gsap";

const ELASTIC_TIMING = {
  ease: "elastic.out(0.6, 0.9)",
  dropDuration: 1.8,
  moveDuration: 1.6,
  returnDuration: 1.6,
  overlapRatio: 0.9,
  returnDelayRatio: 0.08,
};

const LINEAR_TIMING = {
  ease: "power1.inOut",
  dropDuration: 0.7,
  moveDuration: 0.75,
  returnDuration: 0.75,
  overlapRatio: 0.4,
  returnDelayRatio: 0.22,
};

const MOBILE_AUTOPLAY_DELAY = 5400;
const MOBILE_SWIPE_THRESHOLD = 36;
const MOBILE_CARD_WIDTH_PERCENT = 86;
const MOBILE_CARD_GAP_PERCENT = 3;
const MOBILE_CARD_STEP_PERCENT =
  MOBILE_CARD_WIDTH_PERCENT + MOBILE_CARD_GAP_PERCENT;

const DEFAULT_BUILD_GRID = [
  "...RRRR...",
  "..RRRRRR..",
  ".RRWWWWRR.",
  ".RWBBBBWR.",
  ".RWB..BWR.",
  ".RWBDDBWR.",
  ".RWBBBBWR.",
  ".RRRRRRRR.",
];

const BUILD_CELL_STYLES = {
  ".": "bg-[rgba(255,255,255,.05)]",
  B: "bg-[#4e75ad]",
  R: "bg-[#cd8750]",
  D: "bg-[#356d3d]",
  W: "bg-[#7bb4e6]",
};

const BUILD_LEGEND = [
  { key: "B", label: "Wall Block" },
  { key: "D", label: "Door" },
  { key: "W", label: "Window" },
  { key: "R", label: "Roof" },
];

const DEFAULT_ITEM_ROWS = [
  {
    name: "Brick Wall",
    section: "Materials",
    tag: "Construction",
    iconSrc: "/images/items/brickwall.png",
  },
  {
    name: "Boat Door",
    section: "Doors",
    tag: "Wooden stuff",
    iconSrc: "/images/items/boatdoor.png",
  },
  {
    name: "Berry Chair",
    section: "Decoration",
    tag: "Cute stuff",
    iconSrc: "/images/items/berrychair.png",
  },
  {
    name: "Brick Hipped Roof",
    section: "Roof",
    tag: "Blocky stuff",
    iconSrc: "/images/items/brickhippedroof.png",
  },
];

const DEFAULT_POKEMON = {
  name: "Pikachu",
  number: "079",
  rarity: "Rare",
  habitat: "Bright",
  location: "Palette Town",
  favorites: ["Electronics", "Glass stuff", "Group activities"],
  specialties: ["Electric Tech", "Playful Spaces", "Bright Decor"],
  areas: ["Palette Town", "Saffron City", "Dream Island"],
  spriteUrl:
    "https://img.rankedboost.com/wp-content/plugins/k-Pokemon/assets/optimized/pokemon-images/sprites-official/pikachu.webp",
};

function makeSlot(index, horizontalDistance, verticalDistance, totalCards) {
  return {
    x: index * horizontalDistance,
    y: -index * verticalDistance,
    z: -index * horizontalDistance * 1.4,
    zIndex: totalCards - index,
  };
}

function placeCardNow(element, slot, skewAmount) {
  gsap.set(element, {
    x: slot.x,
    y: slot.y,
    z: slot.z,
    xPercent: -50,
    yPercent: -50,
    skewY: skewAmount,
    transformOrigin: "center center",
    zIndex: slot.zIndex,
    force3D: true,
  });
}

function BuilderPreview({ card, compact = false }) {
  const grid = card.sampleBuild?.gridRows ?? DEFAULT_BUILD_GRID;
  const totals = card.sampleBuild?.totals ?? [
    "Blocks: 24",
    "Doors: 2",
    "Windows: 1",
    "Roof: 6",
  ];
  const tools = card.sampleBuild?.tools ?? [
    "Blocks: 1x1",
    "Doors: Single",
    "Windows: Sash 1x2",
    "Roof: Pitched",
  ];
  const columnCount = grid[0]?.length ?? 10;
  const activeLayer = card.sampleBuild?.activeLayer ?? "Layer 2";

  return (
    <div className='mt-3 flex h-full min-h-[260px] flex-col rounded-xl border border-[#353a5b] bg-[rgba(20,24,44,.5)] p-3'>
      <div className='flex items-center justify-between text-[10px] font-semibold uppercase tracking-[0.12em] text-[#91a9d9]'>
        <span>Sample Build</span>
        <span>
          {card.sampleBuild?.gridLabel ?? "10 x 8 Grid"} • {activeLayer}
        </span>
      </div>

      <div
        className={`mt-2 grid flex-1 gap-2 ${compact ? "grid-cols-1" : "grid-cols-[minmax(0,1fr)_190px]"}`}
      >
        <div className='rounded-lg border border-[#30375a] bg-[rgba(12,15,30,.75)] p-2'>
          <div
            className='grid gap-1'
            style={{ gridTemplateColumns: `repeat(${columnCount}, minmax(0, 1fr))` }}
          >
            {grid.flatMap((row, rowIndex) =>
              row.split("").map((cell, cellIndex) => (
                <span
                  className={`h-4 rounded-[3px] border border-[rgba(0,0,0,.2)] ${BUILD_CELL_STYLES[cell] ?? BUILD_CELL_STYLES["."]}`}
                  key={`${rowIndex}-${cellIndex}-${cell}`}
                />
              )),
            )}
          </div>

          <div className='mt-2 flex flex-wrap gap-1.5'>
            {BUILD_LEGEND.map((entry) => (
              <span
                className='inline-flex items-center gap-1 rounded-full border border-[#43517f] bg-[rgba(22,29,56,.85)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-[#d6e2ff]'
                key={entry.key}
              >
                <span
                  className={`h-2.5 w-2.5 rounded-[2px] ${BUILD_CELL_STYLES[entry.key]}`}
                />
                {entry.label}
              </span>
            ))}
          </div>
        </div>

        <div className='grid content-start gap-1.5 rounded-lg border border-[#30375a] bg-[rgba(12,15,30,.75)] p-2'>
          <p className='text-[10px] font-semibold uppercase tracking-[0.12em] text-[#91a9d9]'>
            Active Tools
          </p>
          {tools.map((tool) => (
            <span
              className='rounded-md border border-[#44507a] bg-[rgba(24,31,60,.86)] px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-[#d6e2ff]'
              key={tool}
            >
              {tool}
            </span>
          ))}

          <p className='mt-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#91a9d9]'>
            Totals
          </p>
          {totals.map((label) => (
            <span
              className='rounded-md border border-[#44507a] bg-[rgba(24,31,60,.86)] px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-[#d6e2ff]'
              key={label}
            >
              {label}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

function ItemsPreview({ card }) {
  const rows = card.sampleItems ?? DEFAULT_ITEM_ROWS;

  return (
    <div className='mt-3 rounded-xl border border-[#353a5b] bg-[rgba(20,24,44,.5)] p-3'>
      <div className='text-[10px] font-semibold uppercase tracking-[0.12em] text-[#91a9d9]'>
        Sample Item Results
      </div>

      <div className='mt-2 grid gap-1.5'>
        {rows.slice(0, 4).map((item) => (
          <div
            className='flex items-center gap-2 rounded-md border border-[#2f3554] bg-[rgba(13,16,30,.72)] px-2 py-1.5'
            key={`${item.name}-${item.section}-${item.tag}`}
          >
            <Image
              alt={`${item.name} icon`}
              className='h-8 w-8 rounded border border-[#3f466b] bg-[rgba(255,255,255,.04)] object-contain p-1'
              height={32}
              src={item.iconSrc}
              unoptimized
              width={32}
            />
            <div className='min-w-0 flex-1'>
              <p className='truncate text-sm font-semibold text-[#e7edff]'>
                {item.name}
              </p>
              <div className='mt-0.5 flex flex-wrap gap-1'>
                <span className='rounded-full border border-[#45507a] bg-[rgba(25,30,56,.85)] px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-[#d4e0ff]'>
                  {item.section}
                </span>
                <span className='rounded-full border border-[#416572] bg-[rgba(26,52,62,.78)] px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-[#b7edf2]'>
                  {item.tag}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function PokemonPreview({ card }) {
  const pokemon = card.samplePokemon ?? DEFAULT_POKEMON;
  const favorites = pokemon.favorites ?? [];
  const specialties = pokemon.specialties ?? [];
  const areas = pokemon.areas ?? [pokemon.location].filter(Boolean);

  return (
    <div className='mt-3 flex h-full min-h-[260px] flex-col rounded-xl border border-[#353a5b] bg-[rgba(20,24,44,.5)] p-3'>
      <div className='flex items-start gap-3 rounded-lg border border-[#2f3554] bg-[rgba(13,16,30,.72)] p-2'>
        <Image
          alt={`${pokemon.name} sprite`}
          className='h-16 w-16 rounded-lg border border-[#45507a] bg-[rgba(255,255,255,.06)] object-contain p-1'
          height={64}
          src={pokemon.spriteUrl}
          unoptimized
          width={64}
        />
        <div className='min-w-0'>
          <p className='text-[10px] font-semibold uppercase tracking-[0.12em] text-[#91a9d9]'>
            #{pokemon.number}
          </p>
          <h4 className='text-lg font-bold text-[#eef3ff]'>{pokemon.name}</h4>
          <span className='mt-1 inline-flex rounded-full border border-[#6c4f8c] bg-[rgba(58,37,84,.78)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-[#e4c8ff]'>
            {pokemon.rarity}
          </span>
        </div>
      </div>

      <div className='mt-2 grid grid-cols-2 gap-1.5'>
        <span className='rounded-md border border-[#45507a] bg-[rgba(25,30,56,.85)] px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-[#d4e0ff]'>
          Habitat: {pokemon.habitat}
        </span>
        <span className='rounded-md border border-[#45507a] bg-[rgba(25,30,56,.85)] px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-[#d4e0ff]'>
          Area: {pokemon.location}
        </span>
        <span className='rounded-md border border-[#45507a] bg-[rgba(25,30,56,.85)] px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-[#d4e0ff]'>
          Favorites: {favorites.length}
        </span>
        <span className='rounded-md border border-[#45507a] bg-[rgba(25,30,56,.85)] px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-[#d4e0ff]'>
          Specialty: {specialties.length}
        </span>
      </div>

      <div className='mt-2 grid flex-1 gap-2 lg:grid-cols-2'>
        <div className='rounded-lg border border-[#2f3554] bg-[rgba(13,16,30,.72)] p-2'>
          <p className='text-[10px] font-semibold uppercase tracking-[0.12em] text-[#91a9d9]'>
            Favorite Tags
          </p>
          <div className='mt-1.5 flex flex-wrap gap-1'>
            {favorites.slice(0, 6).map((favorite) => (
              <span
                className='rounded-full border border-[#3d6780] bg-[rgba(22,56,74,.78)] px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-[#b7e9ff]'
                key={favorite}
              >
                {favorite}
              </span>
            ))}
          </div>
        </div>

        <div className='rounded-lg border border-[#2f3554] bg-[rgba(13,16,30,.72)] p-2'>
          <p className='text-[10px] font-semibold uppercase tracking-[0.12em] text-[#91a9d9]'>
            Specialty
          </p>
          <div className='mt-1.5 flex flex-wrap gap-1'>
            {specialties.slice(0, 6).map((specialty) => (
              <span
                className='rounded-full border border-[#5d5a82] bg-[rgba(40,40,74,.8)] px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-[#ddd8ff]'
                key={specialty}
              >
                {specialty}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className='mt-2 rounded-lg border border-[#2f3554] bg-[rgba(13,16,30,.72)] p-2'>
        <p className='text-[10px] font-semibold uppercase tracking-[0.12em] text-[#91a9d9]'>
          Available Areas
        </p>
        <div className='mt-1.5 flex flex-wrap gap-1'>
          {areas.slice(0, 6).map((area) => (
            <span
              className='rounded-full border border-[#475e8a] bg-[rgba(30,44,76,.82)] px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-[#d8e5ff]'
              key={area}
            >
              {area}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

function CardPreviewPanel({ card, compact = false }) {
  if (card.previewType === "items") {
    return <ItemsPreview card={card} />;
  }

  if (card.previewType === "pokemon") {
    return <PokemonPreview card={card} />;
  }

  return <BuilderPreview card={card} compact={compact} />;
}

const HomePreviewCard = forwardRef(function HomePreviewCard(
  { card, cardHeight, cardWidth },
  ref,
) {
  return (
    <Link
      className='absolute left-1/2 top-1/2 block rounded-2xl border border-[#4b4b72] bg-[rgba(8,10,22,.94)] p-4 text-left shadow-[0_18px_50px_rgba(0,0,0,.45)] transition-colors hover:border-[#a0c4ff]'
      href={card.href}
      ref={ref}
      style={{ width: cardWidth, height: cardHeight }}
    >
      <div className='flex h-full flex-col'>
        <div className='flex items-start justify-between gap-3'>
          <div>
            <p className='text-[11px] font-semibold uppercase tracking-[0.14em] text-[#89a2d8]'>
              {card.kicker}
            </p>
            <h3 className='mt-1 text-xl font-bold text-[#eef3ff]'>
              {card.title}
            </h3>
          </div>
          <Image
            alt={card.iconAlt}
            className='h-12 w-12 rounded-lg border border-[#3f4466] bg-[rgba(255,255,255,.04)] object-contain p-1.5'
            height={48}
            src={card.iconSrc}
            unoptimized
            width={48}
          />
        </div>

        <p className='mt-2 text-sm leading-relaxed text-[#b1bfdc]'>
          {card.description}
        </p>

        <div className='flex-1'>
          <CardPreviewPanel card={card} />
        </div>

        <div className='mt-3 inline-flex w-fit items-center rounded-lg border border-[#4b5279] bg-[rgba(29,34,62,.85)] px-2.5 py-1.5 text-xs font-semibold uppercase tracking-[0.1em] text-[#d8e4ff]'>
          Open {card.shortTitle}
        </div>
      </div>
    </Link>
  );
});

export default function HomeCardSwap({
  cards,
  width = 800,
  height = 550,
  horizontalDistance = 50,
  verticalDistance = 56,
  delay = 4600,
  skewAmount = 5,
  easing = "elastic",
}) {
  const containerRef = useRef(null);
  const cardRefs = useRef([]);
  const orderRef = useRef(cards.map((_, index) => index));
  const intervalRef = useRef(0);
  const timelineRef = useRef(null);
  const [isDesktopViewport, setIsDesktopViewport] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const [mobileIndex, setMobileIndex] = useState(0);
  const touchStartXRef = useRef(0);
  const touchDeltaXRef = useRef(0);

  const timingConfig = useMemo(() => {
    return easing === "elastic" ? ELASTIC_TIMING : LINEAR_TIMING;
  }, [easing]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return undefined;
    }

    const desktopMedia = window.matchMedia("(min-width: 1024px)");
    const motionMedia = window.matchMedia("(prefers-reduced-motion: reduce)");

    const updateDesktop = (event) => {
      setIsDesktopViewport(event.matches);
    };
    const updateMotion = (event) => {
      setPrefersReducedMotion(event.matches);
    };

    setIsDesktopViewport(desktopMedia.matches);
    setPrefersReducedMotion(motionMedia.matches);

    desktopMedia.addEventListener("change", updateDesktop);
    motionMedia.addEventListener("change", updateMotion);

    return () => {
      desktopMedia.removeEventListener("change", updateDesktop);
      motionMedia.removeEventListener("change", updateMotion);
    };
  }, []);

  useEffect(() => {
    orderRef.current = cards.map((_, index) => index);
  }, [cards]);

  useEffect(() => {
    setMobileIndex((previous) => {
      if (cards.length === 0) {
        return 0;
      }
      return Math.min(previous, cards.length - 1);
    });
  }, [cards.length]);

  useEffect(() => {
    if (isDesktopViewport || prefersReducedMotion || cards.length < 2) {
      return undefined;
    }

    const rotateId = window.setInterval(() => {
      setMobileIndex((previous) => (previous + 1) % cards.length);
    }, MOBILE_AUTOPLAY_DELAY);

    return () => {
      window.clearInterval(rotateId);
    };
  }, [cards.length, isDesktopViewport, prefersReducedMotion]);

  useEffect(() => {
    if (!isDesktopViewport) {
      return undefined;
    }

    const cardNodes = cardRefs.current.filter(Boolean);
    if (cardNodes.length < 2) {
      return undefined;
    }

    if (prefersReducedMotion) {
      cardNodes.forEach((node, index) => {
        const slot = makeSlot(
          index,
          horizontalDistance,
          verticalDistance,
          cardNodes.length,
        );
        placeCardNow(node, slot, skewAmount);
      });
      return undefined;
    }

    cardNodes.forEach((node, index) => {
      const slot = makeSlot(
        index,
        horizontalDistance,
        verticalDistance,
        cardNodes.length,
      );
      placeCardNow(node, slot, skewAmount);
    });

    const runSwap = () => {
      if (orderRef.current.length < 2) {
        return;
      }

      const [frontIndex, ...restIndices] = orderRef.current;
      const frontCard = cardRefs.current[frontIndex];
      if (!frontCard) {
        return;
      }

      const tl = gsap.timeline();
      timelineRef.current = tl;

      tl.to(frontCard, {
        y: "+=460",
        duration: timingConfig.dropDuration,
        ease: timingConfig.ease,
      });

      tl.addLabel(
        "promote",
        `-=${timingConfig.dropDuration * timingConfig.overlapRatio}`,
      );

      restIndices.forEach((cardIndex, slotIndex) => {
        const cardNode = cardRefs.current[cardIndex];
        if (!cardNode) {
          return;
        }

        const newSlot = makeSlot(
          slotIndex,
          horizontalDistance,
          verticalDistance,
          cardNodes.length,
        );

        tl.set(cardNode, { zIndex: newSlot.zIndex }, "promote");
        tl.to(
          cardNode,
          {
            x: newSlot.x,
            y: newSlot.y,
            z: newSlot.z,
            duration: timingConfig.moveDuration,
            ease: timingConfig.ease,
          },
          `promote+=${slotIndex * 0.12}`,
        );
      });

      const backSlot = makeSlot(
        cardNodes.length - 1,
        horizontalDistance,
        verticalDistance,
        cardNodes.length,
      );
      tl.addLabel(
        "return",
        `promote+=${timingConfig.moveDuration * timingConfig.returnDelayRatio}`,
      );
      tl.call(
        () => {
          gsap.set(frontCard, { zIndex: backSlot.zIndex });
        },
        undefined,
        "return",
      );
      tl.to(
        frontCard,
        {
          x: backSlot.x,
          y: backSlot.y,
          z: backSlot.z,
          duration: timingConfig.returnDuration,
          ease: timingConfig.ease,
        },
        "return",
      );
      tl.call(() => {
        orderRef.current = [...restIndices, frontIndex];
      });
    };

    runSwap();
    intervalRef.current = window.setInterval(runSwap, delay);

    const hostNode = containerRef.current;
    const pauseOnHover = () => {
      timelineRef.current?.pause();
      window.clearInterval(intervalRef.current);
    };
    const resumeOnHoverLeave = () => {
      timelineRef.current?.play();
      intervalRef.current = window.setInterval(runSwap, delay);
    };

    if (hostNode) {
      hostNode.addEventListener("mouseenter", pauseOnHover);
      hostNode.addEventListener("mouseleave", resumeOnHoverLeave);
    }

    return () => {
      if (hostNode) {
        hostNode.removeEventListener("mouseenter", pauseOnHover);
        hostNode.removeEventListener("mouseleave", resumeOnHoverLeave);
      }
      timelineRef.current?.kill();
      window.clearInterval(intervalRef.current);
    };
  }, [
    cards,
    delay,
    horizontalDistance,
    isDesktopViewport,
    prefersReducedMotion,
    skewAmount,
    timingConfig,
    verticalDistance,
  ]);

  const showPreviousMobileCard = () => {
    setMobileIndex((previous) => {
      if (cards.length === 0) {
        return 0;
      }
      return (previous - 1 + cards.length) % cards.length;
    });
  };

  const showNextMobileCard = () => {
    setMobileIndex((previous) => {
      if (cards.length === 0) {
        return 0;
      }
      return (previous + 1) % cards.length;
    });
  };

  const handleTouchStart = (event) => {
    touchStartXRef.current = event.changedTouches[0]?.clientX ?? 0;
    touchDeltaXRef.current = 0;
  };

  const handleTouchMove = (event) => {
    const currentX = event.changedTouches[0]?.clientX ?? 0;
    touchDeltaXRef.current = currentX - touchStartXRef.current;
  };

  const handleTouchEnd = () => {
    if (Math.abs(touchDeltaXRef.current) < MOBILE_SWIPE_THRESHOLD) {
      return;
    }

    if (touchDeltaXRef.current < 0) {
      showNextMobileCard();
      return;
    }

    showPreviousMobileCard();
  };

  return (
    <>
      <div
        className='relative hidden h-[430px] w-full overflow-visible lg:block'
        ref={containerRef}
      >
        {cards.map((card, index) => (
          <HomePreviewCard
            card={card}
            cardHeight={height}
            cardWidth={width}
            key={card.href}
            ref={(node) => {
              cardRefs.current[index] = node;
            }}
          />
        ))}
      </div>

      <div className='grid gap-3 lg:hidden'>
        <div className='flex items-center justify-between'>
          <p className='text-[11px] font-semibold uppercase tracking-[0.12em] text-[#91a9d9]'>
            Swipe Or Tap
          </p>
          <div className='flex items-center gap-2'>
            <button
              aria-label='Show previous section preview'
              className='rounded-md border border-[#47527a] bg-[rgba(23,28,52,.9)] px-2 py-1 text-xs font-bold text-[#d8e4ff]'
              onClick={showPreviousMobileCard}
              type='button'
            >
              Prev
            </button>
            <button
              aria-label='Show next section preview'
              className='rounded-md border border-[#47527a] bg-[rgba(23,28,52,.9)] px-2 py-1 text-xs font-bold text-[#d8e4ff]'
              onClick={showNextMobileCard}
              type='button'
            >
              Next
            </button>
          </div>
        </div>

        <div
          className='overflow-hidden rounded-2xl'
          onTouchEnd={handleTouchEnd}
          onTouchMove={handleTouchMove}
          onTouchStart={handleTouchStart}
        >
          <div
            className='flex gap-[3%] pl-[1%] transition-transform duration-300 ease-out'
            style={{
              transform: `translateX(-${mobileIndex * MOBILE_CARD_STEP_PERCENT}%)`,
            }}
          >
            {cards.map((card, index) => (
              <div
                className={`shrink-0 transition-all duration-300 ${index === mobileIndex ? "scale-100 opacity-100" : "scale-[0.97] opacity-70"}`}
                key={card.href}
                style={{ width: `${MOBILE_CARD_WIDTH_PERCENT}%` }}
              >
                <Link
                  className='block rounded-2xl border border-[#40496e] bg-[rgba(8,10,22,.94)] p-3 shadow-[0_10px_26px_rgba(0,0,0,.36)]'
                  href={card.href}
                >
                  <div className='flex items-start justify-between gap-3'>
                    <div>
                      <p className='text-[11px] font-semibold uppercase tracking-[0.14em] text-[#89a2d8]'>
                        {card.kicker}
                      </p>
                      <h2 className='mt-1 text-xl font-bold text-[#eef3ff]'>
                        {card.title}
                      </h2>
                    </div>
                    <Image
                      alt={card.iconAlt}
                      className='h-10 w-10 rounded-lg border border-[#3f4466] bg-[rgba(255,255,255,.04)] object-contain p-1'
                      height={40}
                      src={card.iconSrc}
                      unoptimized
                      width={40}
                    />
                  </div>

                  <p className='mt-2 text-sm leading-relaxed text-[#b1bfdc]'>
                    {card.description}
                  </p>

                  <CardPreviewPanel card={card} compact />
                </Link>
              </div>
            ))}
          </div>
        </div>

        <div className='flex items-center justify-center gap-1.5'>
          {cards.map((card, index) => (
            <button
              aria-label={`Show ${card.shortTitle} preview`}
              className={`h-2.5 w-2.5 rounded-full border ${index === mobileIndex ? "border-[#d8e4ff] bg-[#d8e4ff]" : "border-[#5f6992] bg-[rgba(17,22,44,.75)]"}`}
              key={`${card.href}-dot`}
              onClick={() => setMobileIndex(index)}
              type='button'
            />
          ))}
        </div>
      </div>
    </>
  );
}
