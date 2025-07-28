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
          name: "Chuva Suave",
          duration: "45:00",
          category: "Sons da Natureza",
          file: "/sounds/sleep/chuva_suave.wav"
        },
        {
          id: "sleep-2", 
          name: "Ondas do Mar",
          duration: "60:00",
          category: "Sons da Natureza",
          file: "/sounds/sleep/ondas_mar.wav"
        },
        {
          id: "sleep-3",
          name: "Floresta Noturna",
          duration: "40:00",
          category: "Sons da Natureza",
          file: "/sounds/sleep/floresta_noturna.wav"
        },
        {
          id: "sleep-4",
          name: "Piano Suave",
          duration: "35:00",
          category: "Música Instrumental",
          file: "/sounds/sleep/piano_suave.wav"
        },
        {
          id: "sleep-5",
          name: "432 Hz Relaxamento",
          duration: "60:00",
          category: "Tons Terapêuticos",
          file: "/sounds/sleep/432hz_relaxamento.wav"
        },
        {
          id: "sleep-6",
          name: "Harpa Celestial",
          duration: "38:00",
          category: "Música Instrumental",
          file: "/sounds/sleep/harpa_celestial.wav"
        },
        {
          id: "sleep-7",
          name: "Ruído Branco",
          duration: "60:00",
          category: "Tons Terapêuticos",
          file: "/sounds/sleep/ruido_branco.wav"
        },
        {
          id: "sleep-8",
          name: "Vento Suave",
          duration: "50:00",
          category: "Sons da Natureza",
          file: "/sounds/sleep/vento_suave.wav"
        },
        {
          id: "sleep-9",
          name: "Sino Tibetano",
          duration: "25:00",
          category: "Meditação e Mantras",
          file: "/sounds/sleep/sino_tibetano.wav"
        },
        {
          id: "sleep-10",
          name: "Fogo na Lareira",
          duration: "45:00",
          category: "Sons da Natureza",
          file: "/sounds/sleep/fogo_lareira.wav"
        },
        {
          id: "sleep-11",
          name: "528 Hz Cura",
          duration: "60:00",
          category: "Tons Terapêuticos",
          file: "/sounds/sleep/528hz_cura.wav"
        },
        {
          id: "sleep-12",
          name: "Mantra Om",
          duration: "30:00",
          category: "Meditação e Mantras",
          file: "/sounds/sleep/mantra_om.wav"
        }
      ]
    },
    meditate: {
      title: "Para Meditar",
      description: "Paisagens sonoras para meditação e mindfulness",
      sounds: [
        {
          id: "meditate-1",
          name: "Singing Bowl",
          duration: "20:00",
          category: "Meditação e Mantras",
          file: "/sounds/meditate/singing_bowl.wav"
        },
        {
          id: "meditate-2",
          name: "Floresta Zen",
          duration: "30:00",
          category: "Sons da Natureza",
          file: "/sounds/meditate/floresta_zen.wav"
        },
        {
          id: "meditate-3",
          name: "741 Hz Limpeza",
          duration: "40:00",
          category: "Tons Terapêuticos",
          file: "/sounds/meditate/741hz_limpeza.wav"
        },
        {
          id: "meditate-4",
          name: "Flauta Meditativa",
          duration: "25:00",
          category: "Música Instrumental",
          file: "/sounds/meditate/flauta_meditativa.wav"
        },
        {
          id: "meditate-5",
          name: "Água Corrente",
          duration: "35:00",
          category: "Sons da Natureza",
          file: "/sounds/meditate/agua_corrente.wav"
        },
        {
          id: "meditate-6",
          name: "Mantra So Hum",
          duration: "18:00",
          category: "Meditação e Mantras",
          file: "/sounds/meditate/mantra_so_hum.wav"
        },
        {
          id: "meditate-7",
          name: "Violão Fingerstyle",
          duration: "28:00",
          category: "Música Instrumental",
          file: "/sounds/meditate/violao_fingerstyle.wav"
        },
        {
          id: "meditate-8",
          name: "963 Hz Despertar",
          duration: "45:00",
          category: "Tons Terapêuticos",
          file: "/sounds/meditate/963hz_despertar.wav"
        }
      ]
    },
    focus: {
      title: "Para Focar",
      description: "Ambiente sonoro ideal para concentração e produtividade",
      sounds: [
        {
          id: "focus-1",
          name: "Café com Chuva",
          duration: "60:00",
          category: "Sons da Natureza",
          file: "/sounds/focus/cafe_chuva.wav"
        },
        {
          id: "focus-2",
          name: "Lo-fi Instrumental",
          duration: "45:00",
          category: "Música Instrumental",
          file: "/sounds/focus/lofi_instrumental.wav"
        },
        {
          id: "focus-3",
          name: "Ruído Rosa",
          duration: "60:00",
          category: "Tons Terapêuticos",
          file: "/sounds/focus/ruido_rosa.wav"
        },
        {
          id: "focus-4",
          name: "Biblioteca Silenciosa",
          duration: "90:00",
          category: "Sons da Natureza",
          file: "/sounds/focus/biblioteca_silenciosa.wav"
        },
        {
          id: "focus-5",
          name: "Piano Ambient",
          duration: "50:00",
          category: "Música Instrumental",
          file: "/sounds/focus/piano_ambient.wav"
        },
        {
          id: "focus-6",
          name: "40 Hz Concentração",
          duration: "60:00",
          category: "Tons Terapêuticos",
          file: "/sounds/focus/40hz_concentracao.wav"
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