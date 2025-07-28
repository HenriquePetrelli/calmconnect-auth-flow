export interface Sound {
  id: string;
  name: string;
  duration: string;
  category: string;
  file: string;
  cover?: string;
}

export interface Category {
  title: string;
  description?: string;
  sounds: Sound[];
}

export const soundsData = {
  categories: {
    sleep: {
      title: "Para Dormir",
      description: "Sons que induzem relaxamento profundo e sono reparador",
      sounds: [
        {
          id: "sleep-1",
          name: "432 Hz",
          duration: "60:00",
          category: "Tons Terapêuticos",
          file: "/sounds/sleep/432hz.wav"
        },
        {
          id: "sleep-2", 
          name: "Piano Relaxante",
          duration: "35:00",
          category: "Música Instrumental",
          file: "/sounds/sleep/piano.mp3"
        },
        {
          id: "sleep-3",
          name: "Ruído Rosa",
          duration: "60:00",
          category: "Tons Terapêuticos",
          file: "/sounds/sleep/pink_noise.wav"
        },
        {
          id: "sleep-4",
          name: "Chuva Suave",
          duration: "45:00",
          category: "Sons da Natureza",
          file: "/sounds/sleep/rain.wav"
        },
        {
          id: "sleep-5",
          name: "Ondas do Mar",
          duration: "60:00",
          category: "Sons da Natureza",
          file: "/sounds/sleep/wave.wav"
        },
        {
          id: "sleep-6",
          name: "Ruído Branco",
          duration: "60:00",
          category: "Tons Terapêuticos",
          file: "/sounds/sleep/white_noise.ogg"
        }
      ]
    },
    meditate: {
      title: "Para Meditar",
      description: "Paisagens sonoras para meditação e mindfulness",
      sounds: [
        {
          id: "meditate-1",
          name: "Om Mantra",
          duration: "20:00",
          category: "Meditação e Mantras",
          file: "/sounds/meditate/aum.wav"
        },
        {
          id: "meditate-2",
          name: "Binaural Beats",
          duration: "30:00",
          category: "Tons Terapêuticos",
          file: "/sounds/meditate/binaural.mp3"
        },
        {
          id: "meditate-3",
          name: "Canto Gregoriano",
          duration: "25:00",
          category: "Meditação e Mantras",
          file: "/sounds/meditate/gregorian.wav"
        },
        {
          id: "meditate-4",
          name: "Sino Tibetano",
          duration: "18:00",
          category: "Meditação e Mantras",
          file: "/sounds/meditate/tibetan.wav"
        },
        {
          id: "meditate-5",
          name: "Cachoeira",
          duration: "35:00",
          category: "Sons da Natureza",
          file: "/sounds/meditate/waterfall.wav"
        }
      ]
    },
    focus: {
      title: "Para Focar",
      description: "Ambiente sonoro ideal para concentração e produtividade",
      sounds: [
        {
          id: "focus-1",
          name: "528 Hz Frequência",
          duration: "60:00",
          category: "Tons Terapêuticos",
          file: "/sounds/focus/528hz.wav"
        },
        {
          id: "focus-2",
          name: "Canto dos Pássaros",
          duration: "45:00",
          category: "Sons da Natureza",
          file: "/sounds/focus/birds.wav"
        },
        {
          id: "focus-3",
          name: "Ruído Marrom",
          duration: "60:00",
          category: "Tons Terapêuticos",
          file: "/sounds/focus/brown_noise.mp3"
        },
        {
          id: "focus-4",
          name: "Música Clássica",
          duration: "50:00",
          category: "Música Instrumental",
          file: "/sounds/focus/classical.mp3"
        },
        {
          id: "focus-5",
          name: "Harpa Relaxante",
          duration: "35:00",
          category: "Música Instrumental",
          file: "/sounds/focus/harp.wav"
        }
      ]
    }
  },
  
  subcategories: {
    nature: {
      title: "Sons da Natureza",
      sounds: [] // Will be populated by filtering from categories
    },
    instrumental: {
      title: "Músicas Instrumentais",
      sounds: []
    },
    therapeutic: {
      title: "Tons Terapêuticos", 
      sounds: []
    },
    meditation: {
      title: "Meditação e Mantras",
      sounds: []
    }
  }
};

// Populate subcategories by filtering sounds from main categories
const allSounds = Object.values(soundsData.categories).flatMap(cat => cat.sounds);

soundsData.subcategories.nature.sounds = allSounds.filter(s => s.category === "Sons da Natureza");
soundsData.subcategories.instrumental.sounds = allSounds.filter(s => s.category === "Música Instrumental");
soundsData.subcategories.therapeutic.sounds = allSounds.filter(s => s.category === "Tons Terapêuticos");
soundsData.subcategories.meditation.sounds = allSounds.filter(s => s.category === "Meditação e Mantras");