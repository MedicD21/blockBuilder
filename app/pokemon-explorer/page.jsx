import dataset from '@/data/pokemon-data.json';
import { PokemonExplorer } from '@/components/PokemonExplorer';
import Link from 'next/link';

export const metadata = {
  title: 'Pokemon Explorer',
  description: 'Search and filter Pokemon with habitat, location, favorites, and rarity facets.',
};

export default function PokemonExplorerPage() {
  return (
    <div className='min-h-[100dvh] bg-[#1a1a2e] text-[#e0e0e0]'>
      <header className='z-10 flex items-center gap-3 border-b-2 border-[#3a3a5c] bg-[rgba(10,10,20,.95)] px-3 py-2'>
        <h1 className='whitespace-nowrap text-[14px] font-bold uppercase tracking-[0.21em] text-[#a0c4ff]'>
          Pokemon Explorer
        </h1>
        <div className='flex-1' />
        <Link
          className='whitespace-nowrap text-[10px] tracking-[0.1em] text-[#666] transition-colors hover:text-[#a0c4ff]'
          href='/'
        >
          BUILDER ↖
        </Link>
        <Link
          className='whitespace-nowrap text-[10px] tracking-[0.1em] text-[#666] transition-colors hover:text-[#a0c4ff]'
          href='/items'
        >
          ITEMS ↗
        </Link>
      </header>

      <main className='mx-auto w-full max-w-7xl px-4 py-8 md:px-8 md:py-12'>
        <PokemonExplorer dataset={dataset} />
      </main>
    </div>
  );
}
