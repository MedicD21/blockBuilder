import Link from 'next/link';
import Image from 'next/image';
import { Suspense } from 'react';
import { ItemsExplorer } from '@/components/ItemsExplorer';
import { getItemsDataset } from '@/lib/items-dataset';
import pokemonDataset from '@/data/pokemon-data.json';
import tagSpriteMap from '@/data/serebii-tag-sprites.json';

export const metadata = {
  title: 'Pokopia Items',
  description:
    'Card-based item explorer with section collapse, favorite-type filters, and Pokemon favorite matching.',
};

export default function ItemsPage() {
  const dataset = getItemsDataset();

  return (
    <div className='min-h-[100dvh] bg-[#1a1a2e] text-[#e0e0e0]'>
      <header className='z-10 flex flex-wrap items-center gap-x-3 gap-y-2 border-b-2 border-[#3a3a5c] bg-[rgba(10,10,20,.95)] px-4 py-4 sm:px-6 sm:py-5'>
        <div className='flex items-center gap-2'>
          <Link aria-label='Go to home screen' href='/'>
            <Image
              alt='Pokopia logo'
              className='h-[96px] w-[96px] rounded-md border border-[#3a3a5c] bg-[rgba(255,255,255,.03)] object-contain p-0.5 sm:h-[120px] sm:w-[120px]'
              height={120}
              priority
              src='/images/logo/pokopiaplannerdb.png'
              width={120}
            />
          </Link>
          <h1 className='whitespace-nowrap text-[22px] font-bold uppercase tracking-[0.21em] text-[#a0c4ff] sm:text-[32px]'>
            Pokopia Items
          </h1>
        </div>
        <p className='hidden whitespace-nowrap text-[12px] tracking-[0.1em] text-[#666] lg:block'>
          CARD VIEW | COLLAPSIBLE SECTIONS | FAVORITE TYPE FILTERS
        </p>
        <div className='flex-1' />
        <nav className='flex w-full justify-end gap-3 border-t border-[#49a281] pt-2 sm:w-auto sm:border-t-0 sm:pt-0'>
          <Link
            className='inline-flex items-center whitespace-nowrap rounded-full border border-[#49a281] bg-[rgba(73,162,129,.14)] px-3 py-1 text-[14px] font-semibold tracking-[0.1em] text-[#f2a067] transition hover:border-[#8ad7b9] hover:bg-[rgba(73,162,129,.26)] hover:text-[#a0c4ff] sm:px-4 sm:text-[16px] lg:text-[18px]'
            href='/pokemon-explorer'
          >
            POKEMON ↗
          </Link>
          <Link
            className='inline-flex items-center whitespace-nowrap rounded-full border border-[#49a281] bg-[rgba(73,162,129,.14)] px-3 py-1 text-[14px] font-semibold tracking-[0.1em] text-[#f2a067] transition hover:border-[#8ad7b9] hover:bg-[rgba(73,162,129,.26)] hover:text-[#a0c4ff] sm:px-4 sm:text-[16px] lg:text-[18px]'
            href='/builder'
          >
            BUILDER ↖
          </Link>
        </nav>
      </header>

      <main className='mx-auto w-full max-w-[1400px] px-3 py-5 sm:px-4 md:px-6 md:py-8 lg:px-8 lg:py-10'>
        <Suspense
          fallback={
            <div className='rounded-xl border border-[#3a3a5c] bg-[rgba(10,10,20,.75)] p-6 text-center text-[15px] tracking-[0.08em] text-[#777]'>
              Loading items explorer...
            </div>
          }
        >
          <ItemsExplorer
            dataset={dataset}
            pokemonDataset={pokemonDataset}
            tagSpriteMap={tagSpriteMap}
          />
        </Suspense>
      </main>
    </div>
  );
}
