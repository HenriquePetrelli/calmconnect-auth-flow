import * as sloth from './species/sloth';

export type MascotPose = 'wave' | 'sleep' | 'celebrate' | 'thinking' | 'hug';

type MascotSpecies = Record<MascotPose, React.ComponentType<{ className?: string }>>;

const SPECIES: Record<string, MascotSpecies> = {
  sloth,
};

// Trocar o mascote do app inteiro é mudar só esta linha (e adicionar o
// novo animal em ./species/<nome>, com os mesmos 5 poses).
const ACTIVE_SPECIES = 'sloth';

interface MascotProps {
  pose: MascotPose;
  className?: string;
}

const Mascot = ({ pose, className }: MascotProps) => {
  const Illustration = SPECIES[ACTIVE_SPECIES][pose];
  return <Illustration className={className} />;
};

export default Mascot;
