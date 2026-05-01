import Image from "next/image";
import Link from "next/link";
import HomeCardSwap from "@/components/HomeCardSwap";
import Particles from "@/components/Particles";

const HOME_CARDS = [
  {
    href: "/builder",
    shortTitle: "Builder",
    previewType: "builder",
    kicker: "Section 01",
    title: "Block Builder",
    description:
      "Place blocks, walls, doors, windows, and roof pieces with layer tools and shortcuts.",
    iconSrc: "/images/items/brick.png",
    iconAlt: "Block Builder icon",
    sampleBuild: {
      gridLabel: "12 x 10 Grid",
      gridRows: [
        "...RRRR...",
        "..RRRRRR..",
        ".RRWWWWRR.",
        ".RWBBBBWR.",
        ".RWB..BWR.",
        ".RWBDDBWR.",
        ".RWBBBBWR.",
        ".RRRRRRRR.",
      ],
      tools: [
        "Blocks: 1x1",
        "Doors: Single",
        "Windows: Sash 1x2",
        "Roof: Pitched",
      ],
      activeLayer: "Layer 2",
      totals: ["Blocks: 24", "Doors: 2", "Windows: 1", "Roof: 6"],
    },
  },
  {
    href: "/items",
    shortTitle: "Items",
    previewType: "items",
    kicker: "Section 02",
    title: "Items Explorer",
    description:
      "Search by item, Pokemon, favorite tags, and section filters with collapsible category views.",
    iconSrc: "/images/tags/decoration.png",
    iconAlt: "Items Explorer icon",
    sampleItems: [
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
    ],
  },
  {
    href: "/pokemon-explorer",
    shortTitle: "Pokemon",
    previewType: "pokemon",
    kicker: "Section 03",
    title: "Pokemon Explorer",
    description:
      "Browse Pokemon data, discover favorite groups, and jump directly into matching item filters.",
    iconSrc: "/images/items/pikachudoll.png",
    iconAlt: "Pokemon Explorer icon",
    samplePokemon: {
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
    },
  },
];

export default function HomePage() {
  return (
    <main className='relative min-h-[100dvh] overflow-hidden bg-[#1a1a2e] text-[#e0e0e0]'>
      <div aria-hidden='true' className='absolute inset-0 z-[1]'>
        <Particles
          alphaParticles
          cameraDistance={22}
          className='h-full w-full'
          disableRotation={false}
          moveParticlesOnHover={false}
          particleBaseSize={120}
          particleColors={["#a0c4ff", "#f2a067", "#79d6d7"]}
          particleCount={900}
          particleSpread={26}
          pixelRatio={1}
          sizeRandomness={0.95}
          speed={0.08}
        />
      </div>

      <div
        aria-hidden='true'
        className='pointer-events-none absolute inset-0 z-[2] opacity-70'
        style={{
          background:
            "radial-gradient(circle at 20% 20%, rgba(160,196,255,.24), transparent 42%), radial-gradient(circle at 80% 18%, rgba(242,160,103,.18), transparent 36%), linear-gradient(180deg, rgba(10,10,20,.9), rgba(10,10,20,.98))",
        }}
      />

      <div className='relative z-[3] mx-auto flex min-h-[100dvh] w-full max-w-[1320px] px-4 py-8 sm:px-6 sm:py-10 md:px-8 md:py-14'>
        <section className='grid w-full items-center gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,580px)] lg:gap-12'>
          <div className='mx-auto w-full max-w-xl text-center lg:mx-0 lg:text-left'>
            <Link
              aria-label='Go to home screen'
              className='inline-block'
              href='/'
            >
              <Image
                alt='Pokopia logo'
                className='mx-auto h-300 w-300 rounded-2xl border border-[#3a3a5c] bg-[rgba(255,255,255,.03)] object-contain p-2 shadow-[0_20px_65px_rgba(0,0,0,.42)] sm:h-300 sm:w-300 lg:mx-0 lg:h-300 lg:w-300'
                height={620}
                priority
                src='/images/logo/pokopiaplannerdb.png'
                width={620}
              />
            </Link>

            <h1 className='mt-6 text-3xl font-extrabold uppercase tracking-[0.2em] text-[#a0c4ff] sm:text-4xl lg:text-5xl'>
              Building Planner & DB
            </h1>
            <p className='mt-3 text-base leading-relaxed tracking-[0.06em] text-[#9aa6c7] sm:text-lg'>
              Build layouts, browse item data, and discover Pokemon favorites in
              one place. Use the preview cards to jump straight into each
              section.
            </p>

            <div className='mt-6 hidden flex-wrap gap-2 lg:flex'>
              {HOME_CARDS.map((card) => (
                <Link
                  className='rounded-full border items-center border-[#47527a] bg-[rgba(23,28,52,.9)] px-3 py-1.5 text-sm font-semibold uppercase tracking-[0.08em] text-[#d8e4ff] transition hover:border-[#a0c4ff] hover:bg-[rgba(33,41,74,.95)]'
                  href={card.href}
                  key={card.href}
                >
                  {card.shortTitle}
                </Link>
              ))}
            </div>
          </div>

          <div className='w-full'>
            <HomeCardSwap cards={HOME_CARDS} />
          </div>
        </section>
      </div>
    </main>
  );
}
