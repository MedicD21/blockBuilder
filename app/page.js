import Image from 'next/image';
import Link from 'next/link';

export default function HomePage() {
  return (
    <main className='relative min-h-[100dvh] overflow-hidden bg-[#1a1a2e] text-[#e0e0e0]'>
      <div
        aria-hidden='true'
        className='pointer-events-none absolute inset-0 opacity-70'
        style={{
          background:
            'radial-gradient(circle at 20% 20%, rgba(160,196,255,.24), transparent 42%), radial-gradient(circle at 80% 18%, rgba(242,160,103,.18), transparent 36%), linear-gradient(180deg, rgba(10,10,20,.9), rgba(10,10,20,.98))',
        }}
      />

      <div className='relative mx-auto flex min-h-[100dvh] w-full max-w-[1280px] flex-col px-4 py-8 sm:px-6 sm:py-10 md:px-8 md:py-14'>
        <div className='mx-auto flex max-w-4xl flex-col items-center text-center'>
          <Image
            alt='Pokopia logo'
            className='h-44 w-44 rounded-2xl border border-[#3a3a5c] bg-[rgba(255,255,255,.03)] object-contain p-2 shadow-[0_20px_65px_rgba(0,0,0,.42)] sm:h-52 sm:w-52 lg:h-64 lg:w-64'
            height={256}
            priority
            src='/images/logo/pokopiaplannerdb.png'
            width={256}
          />
          <h1 className='mt-6 text-3xl font-extrabold uppercase tracking-[0.2em] text-[#a0c4ff] sm:text-4xl lg:text-5xl'>
            Pokopia Planner DB
          </h1>
          <p className='mt-3 max-w-2xl text-sm tracking-[0.08em] text-[#9aa6c7] sm:text-base'>
            Build layouts, browse item data, and discover Pokemon favorites in one place.
          </p>
        </div>

        <section className='mt-10 grid gap-4 sm:mt-12 md:grid-cols-3 md:gap-5 lg:mt-14 lg:gap-6'>
          <Link
            className='group rounded-2xl border border-[#3a3a5c] bg-[rgba(12,12,24,.86)] p-5 shadow-[0_10px_30px_rgba(0,0,0,.28)] transition hover:-translate-y-0.5 hover:border-[#a0c4ff] hover:bg-[rgba(20,20,40,.95)]'
            href='/builder'
          >
            <p className='text-[11px] font-semibold uppercase tracking-[0.14em] text-[#8da2ce]'>
              Section 01
            </p>
            <h2 className='mt-2 text-2xl font-bold text-[#e8eeff]'>Block Builder</h2>
            <p className='mt-2 text-[13px] leading-relaxed text-[#a8b6d6]'>
              Create layered structures with blocks, doors, windows, and roof parts.
            </p>
          </Link>

          <Link
            className='group rounded-2xl border border-[#3a3a5c] bg-[rgba(12,12,24,.86)] p-5 shadow-[0_10px_30px_rgba(0,0,0,.28)] transition hover:-translate-y-0.5 hover:border-[#a0c4ff] hover:bg-[rgba(20,20,40,.95)]'
            href='/items'
          >
            <p className='text-[11px] font-semibold uppercase tracking-[0.14em] text-[#8da2ce]'>
              Section 02
            </p>
            <h2 className='mt-2 text-2xl font-bold text-[#e8eeff]'>Items Explorer</h2>
            <p className='mt-2 text-[13px] leading-relaxed text-[#a8b6d6]'>
              Filter items by favorites, Pokemon profiles, tags, and locations.
            </p>
          </Link>

          <Link
            className='group rounded-2xl border border-[#3a3a5c] bg-[rgba(12,12,24,.86)] p-5 shadow-[0_10px_30px_rgba(0,0,0,.28)] transition hover:-translate-y-0.5 hover:border-[#a0c4ff] hover:bg-[rgba(20,20,40,.95)]'
            href='/pokemon-explorer'
          >
            <p className='text-[11px] font-semibold uppercase tracking-[0.14em] text-[#8da2ce]'>
              Section 03
            </p>
            <h2 className='mt-2 text-2xl font-bold text-[#e8eeff]'>
              Pokemon Explorer
            </h2>
            <p className='mt-2 text-[13px] leading-relaxed text-[#a8b6d6]'>
              Browse Pokemon habitats and favorites to plan matching item sets.
            </p>
          </Link>
        </section>
      </div>
    </main>
  );
}
