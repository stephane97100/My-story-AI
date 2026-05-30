export interface PresetPrompt {
  title: string;
  excerpt: string;
  prompt: string;
  genre: string;
  tone: string;
  audience: string;
}

export const GENRES = [
  { id: "Merveilleux", label: "Merveilleux & Contes", icon: "Sparkles" },
  { id: "Science-fiction", label: "Science-Fiction", icon: "Rocket" },
  { id: "Fantasy", label: "Fantasy Épique", icon: "ShieldAlert" },
  { id: "Policier", label: "Policier & Thriller", icon: "Search" },
  { id: "Drame historique", label: "Historique & Époque", icon: "Calendar" },
  { id: "Philosophique", label: "Conte Philosophique", icon: "BookOpen" }
];

export const TONES = [
  { id: "Poétique", label: "Poétique & Lyrique", desc: "Phrasangces imagées" },
  { id: "Humoristique", label: "Humoristique & Satirique", desc: "Ton drôle et loufoque" },
  { id: "Sombre", label: "Sombre & Mystérieux", desc: "Atmosphère de suspense" },
  { id: "Héroïque", label: "Épique & Héroïque", desc: "Sens du grandiose" },
  { id: "Doux", label: "Doux & Apaisant", desc: "Idéal pour s'endormir" }
];

export const AUDIENCES = [
  { id: "Enfants", label: "Pour Enfants", desc: "Vocabulaire simple et merveilleux" },
  { id: "Adolescents", label: "Pour Adolescents", desc: "Intrigues complexes, action" },
  { id: "Adultes", label: "Pour Adultes", desc: "Profondeur psychologique, métaphores" }
];

export const SYSTEM_VOICES = [
  { id: "fr-FR", name: "Français (Standard)", lang: "fr-FR" },
  { id: "fr-CA", name: "Français Canadien", lang: "fr-CA" }
];

export const GEMINI_PREBUILT_VOICES = [
  { id: "Kore", label: "Kore (Voix chaleureuse)" },
  { id: "Puck", label: "Puck (Voix enjouée)" },
  { id: "Charon", label: "Charon (Voix profonde)" },
  { id: "Fenrir", label: "Fenrir (Voix mystérieuse)" },
  { id: "Zephyr", label: "Zephyr (Voix apaisante)" }
];

export const PRESET_PROMPTS: PresetPrompt[] = [
  {
    title: "Le Luthier du Silence",
    excerpt: "Un vieil artisan crée des violons capables de suspendre le temps...",
    prompt: "Un vieux luthier solitaire dans une ville de brume fabrique secrètement des instruments magiques. Un jour, en accordant un violon fendu, il s'aperçoit que les notes suspendues figent le mouvement du vent et les cœurs des hommes.",
    genre: "Fantasy",
    tone: "Poétique",
    audience: "Adultes"
  },
  {
    title: "L'Odyssée de Pixel",
    excerpt: "Un petit robot d'exploration minière coincé sur un astéroïde brillant...",
    prompt: "Un petit robot d'exploration nommé Pixel se retrouve seul sur une planète de cristal fluorescent. Il tente de reprogrammer son émetteur radio pour envoyer un poème en morse vers la Terre.",
    genre: "Science-fiction",
    tone: "Humoristique",
    audience: "Enfants"
  },
  {
    title: "La Clef des Songes",
    excerpt: "Une fillette découvre un passage secret dissimulé derrière un vieux miroir...",
    prompt: "Dans le grenier poussiéreux de sa grand-mére, Sarah découvre un miroir dont le reflet n'est pas tout à fait le sien. En le touchant, elle bascule dans une forêt d'arbres bavards à la recherche d'une clé oubliée.",
    genre: "Merveilleux",
    tone: "Doux",
    audience: "Enfants"
  },
  {
    title: "L'Ombre du Louvre",
    excerpt: "Une œuvre d'art murmure des secrets d'une affaire non résolue...",
    prompt: "Un gardien de musée de nuit s'aperçoit qu'un personnage d'un vieux tableau de maître change de posture chaque soir, lui laissant d'étranges indices sur une énigme datant de la cour de Louis XIV.",
    genre: "Policier",
    tone: "Sombre",
    audience: "Adolescents"
  }
];

export const PRESET_LOADING_STEPS = [
  "Inspiration en cours...",
  "Tissage de la trame narrative...",
  "Création de l'introduction poétique...",
  "Mise en scène du développement de l'intrigue...",
  "Montée de la tension dramatique (climax)...",
  "Fin de la rédaction et formulation d'une conclusion émouvante...",
  "Imagination des prompts d'illustrations artistiques...",
  "Affinage littéraire final..."
];
