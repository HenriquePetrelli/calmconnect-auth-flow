export interface BreathingPattern {
  inhale: number;
  hold: number;
  exhale: number;
  pause: number;
  type: string;
  description: string;
  name: string;
}

export const breathingPatterns: Record<string, BreathingPattern> = {
  "4-7-8": {
    inhale: 4,
    hold: 7,
    exhale: 8,
    pause: 0,
    type: "relaxation",
    description: "Técnica para redução de ansiedade",
    name: "Respiração 4-7-8"
  },
  "5-5-5": {
    inhale: 5,
    hold: 5,
    exhale: 5,
    pause: 0,
    type: "balance",
    description: "Balanceamento emocional",
    name: "Respiração Equilibrada"
  },
  "box": {
    inhale: 4,
    hold: 4,
    exhale: 4,
    pause: 4,
    type: "focus",
    description: "Melhora de foco e concentração",
    name: "Box Breathing"
  },
  "tactical": {
    inhale: 4,
    hold: 4,
    exhale: 4,
    pause: 0,
    type: "control",
    description: "Controle sob pressão",
    name: "Respiração Tática"
  },
  "deep": {
    inhale: 4,
    hold: 0,
    exhale: 6,
    pause: 0,
    type: "calm",
    description: "Respiração profunda para iniciantes",
    name: "Respiração Profunda"
  },
  "emergency": {
    inhale: 2,
    hold: 1,
    exhale: 3,
    pause: 0,
    type: "crisis",
    description: "Para momentos de crise",
    name: "Respiração de Emergência"
  }
};

export const getPatternByTechniqueId = (techniqueId: string): BreathingPattern => {
  const patterns = {
    '1': breathingPatterns["4-7-8"],
    '2': breathingPatterns["tactical"],
    '3': breathingPatterns["deep"],
    '4': breathingPatterns["emergency"],
    '5': breathingPatterns["5-5-5"],
    '6': breathingPatterns["5-5-5"], // Respiração Alternada -> 5-5-5
    '7': breathingPatterns["box"],
    '8': breathingPatterns["5-5-5"], // Respiração Equilibrada -> 5-5-5
    '9': breathingPatterns["4-7-8"] // 4-7-8 Profundo -> 4-7-8
  };
  
  return patterns[techniqueId as keyof typeof patterns] || breathingPatterns["4-7-8"];
};