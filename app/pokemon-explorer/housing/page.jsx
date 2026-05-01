import pokemonDataset from "@/data/pokemon-data.json";
import habitatDataset from "@/data/habitats-data.json";
import { getItemsDataset } from "@/lib/items-dataset";
import { HousingPlanner } from "@/components/HousingPlanner";
import { PokemonExplorerShell } from "@/components/PokemonExplorerShell";

export const metadata = {
  title: "Housing Planner",
  description:
    "Plan pokemon housing, tune happiness scores, and save your habitat configurations.",
};

export default function HousingPage() {
  const itemsDataset = getItemsDataset();

  return (
    <PokemonExplorerShell activeSection='housing' title='Housing Planner'>
      <HousingPlanner
        habitatDataset={habitatDataset}
        itemsDataset={itemsDataset}
        pokemonDataset={pokemonDataset}
      />
    </PokemonExplorerShell>
  );
}
