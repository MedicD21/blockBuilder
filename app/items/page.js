export const metadata = {
  title: 'Pokopia Items',
};

export default function ItemsPage() {
  return (
    <main className="min-h-[100dvh] bg-[#1a1a2e]">
      <iframe
        className="h-[100dvh] w-full border-0"
        src="/items.html"
        title="Pokopia Items"
      />
    </main>
  );
}
