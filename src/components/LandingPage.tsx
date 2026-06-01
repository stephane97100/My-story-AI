import React from "react";
import { motion } from "motion/react";
import { 
  Sparkles, 
  BookOpen, 
  Volume2, 
  Wand2, 
  Share2, 
  Heart, 
  ArrowRight,
  BookMarked,
  Printer,
  ChevronRight,
  UserCheck
} from "lucide-react";
import { PresetPrompt, PRESET_PROMPTS } from "../presets";

interface LandingPageProps {
  onStartWriting: () => void;
  onSelectPreset: (preset: PresetPrompt) => void;
  onOpenAuth: () => void;
  isAuthenticated: boolean;
  userEmail: string | null;
  onGoToMemberArea: () => void;
}

export default function LandingPage({
  onStartWriting,
  onSelectPreset,
  onOpenAuth,
  isAuthenticated,
  userEmail,
  onGoToMemberArea
}: LandingPageProps) {
  
  return (
    <div className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16 flex flex-col gap-16 relative">
      
      {/* 1. HERO SECTION */}
      <section className="text-center relative max-w-4xl mx-auto flex flex-col items-center gap-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6 }}
          className="inline-flex items-center gap-1.5 bg-indigo-500/10 border border-indigo-500/20 px-3.5 py-1.5 rounded-full"
        >
          <Sparkles className="w-3.5 h-3.5 text-indigo-400 animate-pulse" />
          <span className="text-[10px] font-mono uppercase tracking-widest text-indigo-300 font-bold">
            Studio Littéraire Multimodal 2.0
          </span>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.1 }}
          className="font-serif font-light text-4xl sm:text-5xl md:text-6xl text-white leading-tight tracking-wide"
        >
          Donnez vie à vos récits avec <br/>
          <span className="font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-400 to-amber-300">
            l'Intelligence Artificielle
          </span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.2 }}
          className="text-white/60 text-sm sm:text-base md:text-lg max-w-2xl leading-relaxed font-light"
        >
          My Story AI fusionne la plume narrative de Gemini, la création de tableaux d'illustrations artistiques et la lecture sonore théâtrale pour concevoir des contes épiques uniques.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.3 }}
          className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto mt-4"
        >
          <button
            onClick={onStartWriting}
            className="w-full sm:w-auto flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm px-6 py-3.5 rounded-xl transition cursor-pointer shadow-lg shadow-indigo-600/30 group"
          >
            <span>Lancer la création de conte</span>
            <ArrowRight className="w-4 h-4 text-indigo-200 group-hover:translate-x-1 transition-transform" />
          </button>

          {isAuthenticated ? (
            <button
              onClick={onGoToMemberArea}
              className="w-full sm:w-auto flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 text-white font-semibold text-sm px-6 py-3.5 rounded-xl transition cursor-pointer"
            >
              <BookMarked className="w-4 h-4 text-indigo-400" />
              <span>Accéder à mon Espace Membre</span>
            </button>
          ) : (
            <button
              onClick={onOpenAuth}
              className="w-full sm:w-auto flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 text-white font-semibold text-sm px-6 py-3.5 rounded-xl transition cursor-pointer"
            >
              <UserCheck className="w-4 h-4 text-amber-400" />
              <span>Rejoindre l'Atelier (S'inscrire)</span>
            </button>
          )}
        </motion.div>
      </section>

      {/* 2. CORE FEATURES BENTO GRID */}
      <section className="flex flex-col gap-6">
        <div className="text-center sm:text-left">
          <h2 className="font-serif font-light text-2xl sm:text-3xl text-white">
            Un Atelier Créatif complet
          </h2>
          <p className="text-xs sm:text-sm text-white/40 mt-1">
            Découvrez les puissantes technologies intégrées à votre salon littéraire.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="glass p-6 rounded-2xl border border-white/5 relative overflow-hidden flex flex-col gap-3 group hover:border-indigo-500/20 transition-all">
            <div className="bg-indigo-950/50 border border-indigo-500/15 text-indigo-400 w-10 h-10 rounded-xl flex items-center justify-center">
              <BookOpen className="w-5 h-5" />
            </div>
            <h3 className="font-serif font-bold text-white text-base">Écriture Plume IA</h3>
            <p className="text-xs text-white/50 leading-relaxed">
              Un moteur d'agencement littéraire qui organise votre récit en 4 chapitres équilibrés (Introduction, Intrigue, Climax, Épilogue) d'une grande richesse.
            </p>
          </div>

          <div className="glass p-6 rounded-2xl border border-white/5 relative overflow-hidden flex flex-col gap-3 group hover:border-purple-500/20 transition-all">
            <div className="bg-purple-950/50 border border-purple-500/15 text-purple-400 w-10 h-10 rounded-xl flex items-center justify-center">
              <Wand2 className="w-5 h-5" />
            </div>
            <h3 className="font-serif font-bold text-white text-base">Ajustement Intelligent</h3>
            <p className="text-xs text-white/50 leading-relaxed">
              Vous n'aimez pas un paragraphe ? La baguette de réécriture magique permet de donner des directions artistiques précises à l'IA pour remodeler chaque instant.
            </p>
          </div>

          <div className="glass p-6 rounded-2xl border border-white/5 relative overflow-hidden flex flex-col gap-3 group hover:border-amber-500/20 transition-all">
            <div className="bg-amber-950/50 border border-amber-500/15 text-amber-400 w-10 h-10 rounded-xl flex items-center justify-center">
              <Volume2 className="w-5 h-5" />
            </div>
            <h3 className="font-serif font-bold text-white text-base">Voix Théâtrales</h3>
            <p className="text-xs text-white/50 leading-relaxed">
              Ascoutez vos récits grâce à nos deux moteurs de synthèse vocale : la voix fluide de votre système local ou la narration théâtrale haut de gamme de Gemini.
            </p>
          </div>

          <div className="glass p-6 rounded-2xl border border-white/5 relative overflow-hidden flex flex-col gap-3 group hover:border-emerald-500/20 transition-all">
            <div className="bg-emerald-950/50 border border-emerald-500/15 text-emerald-400 w-10 h-10 rounded-xl flex items-center justify-center">
              <Share2 className="w-5 h-5" />
            </div>
            <h3 className="font-serif font-bold text-white text-base">Partage communautaire</h3>
            <p className="text-xs text-white/50 leading-relaxed">
              Hébergez vos meilleures fables en ligne d'un simple clic pour générer un lien de lecture public, ou exportez en un fichier PDF haute qualité prêt pour l'impression.
            </p>
          </div>
        </div>
      </section>

      {/* 3. LITERARY INSPIRATION CORNER */}
      <section className="flex flex-col gap-6">
        <div className="text-center sm:text-left">
          <h2 className="font-serif font-light text-2xl sm:text-3xl text-white">
            L'allée des inspirations
          </h2>
          <p className="text-xs sm:text-sm text-white/40 mt-1">
            Sélectionnez une graine d'histoire pré-configurée pour essayer le studio et voir l'IA à l'œuvre.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {PRESET_PROMPTS.slice(0, 3).map((preset, index) => (
            <div
              key={index}
              className="glass p-5 rounded-2xl border border-white/5 flex flex-col justify-between gap-4 relative overflow-hidden group hover:border-white/10 transition-all"
            >
              <div className="flex flex-col gap-2">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] bg-indigo-500/10 text-indigo-300 font-mono px-2 py-0.5 rounded border border-indigo-500/15 uppercase font-semibold">
                    {preset.genre}
                  </span>
                  <span className="text-[10px] text-white/40 italic font-mono">{preset.tone}</span>
                </div>
                <h3 className="font-serif font-bold text-white text-base mt-1 group-hover:text-indigo-300 transition-colors">
                  {preset.title}
                </h3>
                <p className="text-xs text-white/50 line-clamp-3 leading-relaxed italic">
                  "{preset.excerpt}"
                </p>
              </div>

              <button
                onClick={() => onSelectPreset(preset)}
                className="flex items-center gap-1.5 self-start text-indigo-400 hover:text-indigo-300 text-xs font-semibold mt-2 cursor-pointer transition-colors"
              >
                <span>Utiliser ce template</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* 4. CALL TO ACTION STAGE */}
      <section className="glass rounded-3xl p-8 sm:p-12 border border-white/10 relative overflow-hidden text-center flex flex-col items-center gap-6 mt-4">
        <div className="absolute top-0 right-0 w-80 h-80 rounded-full bg-indigo-500/5 blur-3xl" />
        <span className="text-xs font-mono font-bold text-amber-400 uppercase tracking-widest bg-amber-500/10 border border-amber-500/20 px-3 py-1 rounded-full">
          Prêt à conter ?
        </span>
        <h2 className="font-serif font-black text-white text-2xl sm:text-4xl max-w-xl">
          Chaque écrivain a une légende qui sommeille.
        </h2>
        <p className="text-white/55 text-xs sm:text-sm max-w-md leading-relaxed">
          Inscrivez-vous pour conserver éternellement vos fables créées, et les organiser directement au sein de votre espace membre sécurisé.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto mt-2 z-10">
          <button
            onClick={onStartWriting}
            className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs px-6 py-3.5 rounded-xl cursor-pointer shadow-lg transition-all"
          >
            Commencer à rédiger
          </button>
          
          {!isAuthenticated && (
            <button
              onClick={onOpenAuth}
              className="w-full sm:w-auto bg-white/5 hover:bg-white/10 border border-white/10 text-white font-bold text-xs px-6 py-3.5 rounded-xl cursor-pointer transition-all"
            >
              Créer mon espace membre
            </button>
          )}
        </div>
      </section>
      
    </div>
  );
}
