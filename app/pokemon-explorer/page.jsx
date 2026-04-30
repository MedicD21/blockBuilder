import dataset from '@/data/pokemon-data.json';
import { PokemonExplorer } from '@/components/PokemonExplorer';
import Image from 'next/image';
import Link from 'next/link';

export const metadata = {
  title: 'Pokemon Explorer',
  description: 'Search and filter Pokemon with habitat, location, favorites, and rarity facets.',
};

export default function PokemonExplorerPage() {
  return (
    <div className='min-h-[100dvh] bg-[#1a1a2e] text-[#e0e0e0]'>
      <header className='z-10 flex flex-wrap items-center gap-x-3 gap-y-2 border-b-2 border-[#3a3a5c] bg-[rgba(10,10,20,.95)] px-4 py-4 sm:px-6 sm:py-5'>
        <div className='flex items-center gap-2'>
          <Image
            alt='Pokopia logo'
            className='h-14 w-14 rounded-md border border-[#3a3a5c] bg-[rgba(255,255,255,.03)] object-contain p-0.5 sm:h-16 sm:w-16'
            height={64}
            priority
            src='/images/logo/pokopiaplannerdb.png'
            width={64}
          />
          <h1 className='whitespace-nowrap text-[18px] font-bold uppercase tracking-[0.21em] text-[#a0c4ff] sm:text-[21px]'>
            Pokemon Explorer
          </h1>
        </div>
        <div className='flex-1' />
        <nav className='flex w-full justify-end gap-3 border-t border-[#3a3a5c] pt-2 sm:w-auto sm:border-t-0 sm:pt-0'>
          <Link
            className='whitespace-nowrap text-[12px] tracking-[0.1em] text-[#666] transition-colors hover:text-[#a0c4ff] sm:text-[13px]'
            href='/'
          >
            BUILDER ↖
          </Link>
          <Link
            className='whitespace-nowrap text-[12px] tracking-[0.1em] text-[#666] transition-colors hover:text-[#a0c4ff] sm:text-[13px]'
            href='/items'
          >
            ITEMS ↗
          </Link>
        </nav>
      </header>

      <main className='mx-auto w-full max-w-[1400px] px-3 py-5 sm:px-4 md:px-6 md:py-8 lg:px-8 lg:py-10'>
        <PokemonExplorer dataset={dataset} />
      </main>
    </div>
  );
}
