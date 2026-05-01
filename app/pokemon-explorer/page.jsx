import dataset from "@/data/pokemon-data.json";
import { PokemonExplorer } from "@/components/PokemonExplorer";
import { PokemonExplorerShell } from "@/components/PokemonExplorerShell";

export const metadata = {
  title: "Pokemon Explorer",
  description:
    "Search and filter Pokemon with habitat, location, favorites, and rarity facets.",
};

export default function PokemonExplorerPage() {
  return (
    <PokemonExplorerShell activeSection='directory' title='Pokemon Explorer'>
      <PokemonExplorer dataset={dataset} />
    </PokemonExplorerShell>
  );
}
