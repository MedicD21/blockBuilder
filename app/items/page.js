import Link from 'next/link';
import { ItemsExplorer } from '@/components/ItemsExplorer';
import { getItemsDataset } from '@/lib/items-dataset';

export const metadata = {
  title: 'Pokopia Items',
  description: 'Card-based item explorer with section collapse and favorite-type filters.',
};

export default function ItemsPage() {
  const dataset = getItemsDataset();

  return (
    <div className='min-h-[100dvh] bg-[#1a1a2e] text-[#e0e0e0]'>
      <header className='z-10 flex flex-wrap items-center gap-x-3 gap-y-2 border-b-2 border-[#3a3a5c] bg-[rgba(10,10,20,.95)] px-3 py-2'>
        <h1 className='whitespace-nowrap text-[15px] font-bold uppercase tracking-[0.21em] text-[#a0c4ff] sm:text-[17px] lg:text-[20px]'>
          Pokopia Items
        </h1>
        <p className='hidden whitespace-nowrap text-[10px] tracking-[0.1em] text-[#666] lg:block'>
          CARD VIEW | COLLAPSIBLE SECTIONS | FAVORITE TYPE FILTERS
        </p>
        <div className='flex-1' />
        <Link
          className='whitespace-nowrap text-[11px] tracking-[0.1em] text-[#f2a067] transition-colors hover:text-[#a0c4ff] sm:text-[12px] lg:text-[16px]'
          href='/pokemon-explorer'
        >
          POKEMON ↗
        </Link>
        <Link
          className='whitespace-nowrap text-[11px] tracking-[0.1em] text-[#f2a067] transition-colors hover:text-[#a0c4ff] sm:text-[12px] lg:text-[16px]'
          href='/'
        >
          BUILDER ↖
        </Link>
      </header>

      <main className='mx-auto w-full max-w-[1400px] px-3 py-5 sm:px-4 md:px-6 md:py-8 lg:px-8 lg:py-10'>
        <ItemsExplorer dataset={dataset} />
      </main>
    </div>
  );
}
