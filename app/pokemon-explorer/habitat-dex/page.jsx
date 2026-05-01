import habitatDataset from "@/data/habitats-data.json";
import { HabitatDexExplorer } from "@/components/HabitatDexExplorer";
import { PokemonExplorerShell } from "@/components/PokemonExplorerShell";

export const metadata = {
  title: "Habitat Dex",
  description:
    "Browse habitat requirements, quantities, and spawn Pokemon from Pokopia habitat data.",
};

export default function HabitatDexPage() {
  return (
    <PokemonExplorerShell activeSection='habitat-dex' title='Habitat Dex'>
      <HabitatDexExplorer habitatDataset={habitatDataset} />
    </PokemonExplorerShell>
  );
}
