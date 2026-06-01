import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Heart, 
  Trash2, 
  BookOpen, 
  Search, 
  Sparkles, 
  Clock, 
  BookMarked,
  Filter,
  Edit2,
  X,
  Plus,
  Compass,
  Check,
  Music,
  Printer
} from "lucide-react";
import { Story, SectionType } from "../types";
import { GENRES, TONES, AUDIENCES } from "../presets";

interface MemberAreaProps {
  savedStories: Story[];
  onSelectStory: (storyId: string) => void;
  onToggleFavorite: (storyId: string) => void;
  onDeleteStory: (storyId: string) => void;
  onRenameStory: (storyId: string, newTitle: string) => void;
  onNewStory: () => void;
  onStartConfigureStory?: (promptValue: string, genreValue: string, toneValue: string, audienceValue: string) => void;
  userEmail: string | null;
}

export default function MemberArea({
  savedStories,
  onSelectStory,
  onToggleFavorite,
  onDeleteStory,
  onRenameStory,
  onNewStory,
  onStartConfigureStory,
  userEmail
}: MemberAreaProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedGenre, setSelectedGenre] = useState<string>("Tous");
  const [showOnlyFavorites, setShowOnlyFavorites] = useState(false);
  
  // Local configuration states for empty member space
  const [memberPrompt, setMemberPrompt] = useState("");
  const [memberGenre, setMemberGenre] = useState("Merveilleux");
  const [memberTone, setMemberTone] = useState("Poétique");
  const [memberAudience, setMemberAudience] = useState("Enfants");

  // Inline rename tracking
  const [editingStoryId, setEditingStoryId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");

  // Statistics
  const totalStories = savedStories.length;
  const favoritesCount = savedStories.filter((s) => s.isFavorite).length;
  const genresUsedCount = Array.from(new Set(savedStories.map((s) => s.genre))).length;

  // Filter lists
  const filteredStories = savedStories.filter((story) => {
    const matchesSearch = story.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          story.genre.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesGenre = selectedGenre === "Tous" ? true : story.genre === selectedGenre;
    const matchesFavorites = showOnlyFavorites ? !!story.isFavorite : true;
    return matchesSearch && matchesGenre && matchesFavorites;
  });

  const handleStartRename = (story: Story, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingStoryId(story.id);
    setRenameValue(story.title);
  };

  const handleSaveRename = (storyId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (renameValue.trim()) {
      onRenameStory(storyId, renameValue.trim());
    }
    setEditingStoryId(null);
  };

  return (
    <div className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 flex flex-col gap-10">
      
      {/* 1. MEMBER HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 border-b border-white/10 pb-8">
        <div>
          <span className="text-[10px] font-mono text-indigo-400 bg-indigo-500/10 px-2.5 py-1 rounded border border-indigo-500/15 uppercase font-bold">
            Espace Écrivain Sécurisé
          </span>
          <h1 className="font-serif font-light text-3xl sm:text-4xl text-white mt-2">
            Ravi de vous revoir, <span className="font-bold text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">{userEmail?.split("@")[0] || "Conteur"}</span>
          </h1>
          <p className="text-xs sm:text-sm text-white/40 mt-1">
            Gérez vos manuscrits fantastiques, triez vos chefs-d'œuvre et perfectionnez vos écrits.
          </p>
        </div>

        <button
          onClick={onNewStory}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs px-4.5 py-3 rounded-xl transition cursor-pointer shadow-lg shadow-indigo-600/20"
        >
          <Plus className="w-4 h-4" />
          <span>Rédiger un nouveau conte</span>
        </button>
      </div>

      {/* 2. STATS BAR CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="glass p-5 rounded-2xl border border-white/5 relative overflow-hidden flex items-center justify-between">
          <div>
            <span className="text-[10px] font-mono text-white/40 uppercase block">Manuscrits rédigés</span>
            <span className="text-3xl font-serif font-black text-white mt-1 block">{totalStories}</span>
          </div>
          <div className="bg-indigo-500/10 text-indigo-400 w-11 h-11 rounded-xl flex items-center justify-center border border-indigo-400/10">
            <BookMarked className="w-5 h-5" />
          </div>
        </div>

        <div className="glass p-5 rounded-2xl border border-white/5 relative overflow-hidden flex items-center justify-between">
          <div>
            <span className="text-[10px] font-mono text-white/40 uppercase block">Coups de cœur</span>
            <span className="text-3xl font-serif font-black text-red-400 mt-1 block">{favoritesCount}</span>
          </div>
          <div className="bg-red-500/10 text-red-400 w-11 h-11 rounded-xl flex items-center justify-center border border-red-400/10">
            <Heart className="w-5 h-5 fill-red-400" />
          </div>
        </div>

        <div className="glass p-5 rounded-2xl border border-white/5 relative overflow-hidden flex items-center justify-between">
          <div>
            <span className="text-[10px] font-mono text-white/40 uppercase block">Genres littéraires</span>
            <span className="text-3xl font-serif font-black text-amber-400 mt-1 block">{genresUsedCount}</span>
          </div>
          <div className="bg-amber-500/10 text-amber-400 w-11 h-11 rounded-xl flex items-center justify-center border border-amber-400/10">
            <Compass className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* 3. SHELF CONTROLS (Search & Filters) */}
      <div className="glass p-5 rounded-2xl border border-white/5 flex flex-col md:flex-row items-center gap-4">
        {/* Search */}
        <div className="relative w-full md:flex-1">
          <Search className="absolute left-3.5 top-3.5 w-4.5 h-4.5 text-white/30" />
          <input
            type="text"
            placeholder="Rechercher par titre ou genre..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-black/40 border border-white/10 text-white rounded-xl pl-11 pr-4 py-3 text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-none"
          />
        </div>

        {/* Genre Selector */}
        <div className="flex items-center gap-2 bg-black/40 border border-white/10 px-3.5 py-1.5 rounded-xl w-full md:w-auto">
          <Filter className="w-4 h-4 text-white/35 shrink-0" />
          <select
            value={selectedGenre}
            onChange={(e) => setSelectedGenre(e.target.value)}
            className="bg-transparent text-xs text-white/80 focus:outline-none cursor-pointer pr-4 w-full md:w-auto"
          >
            <option value="Tous" className="bg-[#121212] text-white">Tous les genres</option>
            {GENRES.map((g) => (
              <option key={g.id} value={g.id} className="bg-[#121212] text-white">{g.label}</option>
            ))}
          </select>
        </div>

        {/* Favorites only Toggle */}
        <button
          onClick={() => setShowOnlyFavorites((prev) => !prev)}
          className={`flex items-center justify-center gap-2 px-4 py-3 rounded-xl border text-xs font-semibold cursor-pointer w-full md:w-auto transition-all ${
            showOnlyFavorites
              ? "bg-red-500/10 border-red-500/30 text-red-400"
              : "bg-black/40 border-white/10 text-white/60 hover:text-white"
          }`}
        >
          <Heart className={`w-4 h-4 ${showOnlyFavorites ? "fill-red-400" : ""}`} />
          <span>Favoris uniquement</span>
        </button>
      </div>

      {/* 4. BOOKSHELF GRID */}
      <div className="flex-1">
        <AnimatePresence mode="wait">
          {savedStories.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 15 }}
              className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch"
            >
              {/* Left Column: Greeting & Info */}
              <div className="lg:col-span-5 glass rounded-3xl border border-white/5 p-6 sm:p-8 flex flex-col justify-between relative overflow-hidden bg-black/45">
                <div className="absolute top-0 right-0 w-48 h-48 rounded-full bg-indigo-500/5 blur-3xl pointer-events-none" />
                <div className="flex flex-col gap-5">
                  <div className="bg-indigo-500/10 text-indigo-400 w-12 h-12 rounded-2xl flex items-center justify-center border border-indigo-400/10 shadow-inner">
                    <Sparkles className="w-6 h-6 animate-pulse" />
                  </div>
                  <div>
                    <h3 className="font-serif font-bold text-2xl text-white">Votre Bibliothèque attend vos chefs-d'œuvre</h3>
                    <p className="text-xs text-white/50 leading-relaxed mt-2.5">
                      C'est ici que l'ensemble de vos contes et illustrations fantastiques seront stockés de manière sécurisée. Prenez votre plume pour inventer votre premier récit grâce à la puissance de l'IA.
                    </p>
                  </div>
                  <ul className="flex flex-col gap-3.5 text-xs text-white/75 mt-3">
                    <li className="flex items-start gap-2.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 mt-1.5 shrink-0" />
                      <span><b>Multi-chapitres équilibrés</b> : Chaque récit est organisé en Introduction, Intrigue, Climax et Conclusion.</span>
                    </li>
                    <li className="flex items-start gap-2.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 mt-1.5 shrink-0" />
                      <span><b>Synthèse Sonore</b> : Écoutez vos récits lus par une voix off théâtrale réaliste.</span>
                    </li>
                    <li className="flex items-start gap-2.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 mt-1.5 shrink-0" />
                      <span><b>Illustrations d'exception</b> : Créez des tableaux d'inspiration artistique accordés à votre ton.</span>
                    </li>
                  </ul>
                </div>

                <div className="pt-6 border-t border-white/5 mt-8 text-[11px] font-mono text-indigo-300 flex items-center gap-1.5">
                  <Compass className="w-4 h-4 animate-spin" style={{ animationDuration: '20s' }} />
                  <span>Niveau Écrivain : Initialisation des encres...</span>
                </div>
              </div>

              {/* Right Column: Configurez votre récit form box */}
              <div className="lg:col-span-7 glass rounded-3xl border border-white/10 p-6 sm:p-8 relative bg-[#0b0b0b]/80 flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-5 border-b border-white/5 pb-3.5">
                    <Plus className="w-5 h-5 text-indigo-400" />
                    <h3 className="font-serif font-bold text-lg text-white">Configurez votre Récit</h3>
                  </div>

                  <form 
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (onStartConfigureStory) {
                        onStartConfigureStory(memberPrompt, memberGenre, memberTone, memberAudience);
                      }
                    }}
                    className="flex flex-col gap-4.5"
                  >
                    {/* Theme text area */}
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-mono uppercase tracking-wider text-white/40 font-bold">
                        Votre Idée ou Thème d'Histoire
                      </label>
                      <textarea
                        required
                        value={memberPrompt}
                        onChange={(e) => setMemberPrompt(e.target.value)}
                        placeholder="Ex: Le voyage nocturne d'un vieux phare qui rêve d'explorer la forêt..."
                        rows={4}
                        className="bg-black/45 hover:bg-black/60 focus:bg-black text-white border border-white/10 focus:border-indigo-500 p-3.5 rounded-xl text-xs placeholder:text-white/20 focus:outline-none transition leading-relaxed resize-none"
                      />
                    </div>

                    {/* Horizontal genre chips */}
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-mono uppercase tracking-wider text-white/40 font-bold">
                        Genre Littéraire
                      </label>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {GENRES.map((g) => (
                          <button
                            key={g.id}
                            type="button"
                            onClick={() => setMemberGenre(g.id)}
                            className={`p-2.5 rounded-xl text-left border text-xs font-semibold cursor-pointer transition ${
                              memberGenre === g.id
                                ? "bg-indigo-600 border-indigo-500 text-white shadow"
                                : "bg-white/5 hover:bg-white/10 border-white/5 text-white/70"
                            }`}
                          >
                            {g.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Tone Selection */}
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] font-mono uppercase tracking-wider text-white/40 font-bold">
                          Ton de l'Écrit
                        </label>
                        <select
                          value={memberTone}
                          onChange={(e) => setMemberTone(e.target.value)}
                          className="bg-[#121212] border border-white/10 focus:border-indigo-500 rounded-xl p-2.5 text-xs font-medium focus:outline-none cursor-pointer text-white"
                        >
                          {TONES.map((t) => (
                            <option key={t.id} value={t.id} className="bg-[#121212] [color-scheme:dark] text-white">
                              🎨 {t.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Target Audience selection */}
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] font-mono uppercase tracking-wider text-white/40 font-bold">
                          Auditoire de Destination
                        </label>
                        <div className="grid grid-cols-3 gap-1.5">
                          {AUDIENCES.map((aud) => (
                            <button
                              key={aud.id}
                              type="button"
                              onClick={() => setMemberAudience(aud.id)}
                              className={`p-2 rounded-xl text-center border text-[11px] font-bold cursor-pointer transition ${
                                memberAudience === aud.id
                                  ? "bg-indigo-600 border-indigo-500 text-white shadow"
                                  : "bg-white/5 hover:bg-white/10 border-white/5 text-white/70"
                              }`}
                            >
                              <span>{aud.label}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    <button
                      type="submit"
                      className="mt-3 w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs py-3.5 rounded-xl transition cursor-pointer flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/20"
                    >
                      <Sparkles className="w-4 h-4 text-indigo-200" />
                      <span>Rédiger mon Histoire IA</span>
                    </button>
                  </form>
                </div>
              </div>
            </motion.div>
          ) : filteredStories.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="glass rounded-2xl border border-white/5 p-16 text-center flex flex-col items-center gap-4 bg-[#0b0b0b]/40"
            >
              <div className="bg-white/5 text-white/20 p-4 rounded-full">
                <Compass className="w-10 h-10 animate-spin" style={{ animationDuration: '10s' }} />
              </div>
              <h3 className="font-serif font-bold text-white text-lg mt-2">Aucun manuscrit correspondant</h3>
              <p className="text-xs text-white/40 max-w-sm leading-relaxed">
                Modifiez vos termes de recherche ou vos choix thématiques pour retrouver vos contes sauvegardés.
              </p>
              <button
                onClick={() => {
                  setSearchQuery("");
                  setSelectedGenre("Tous");
                  setShowOnlyFavorites(false);
                }}
                className="mt-2 bg-indigo-600/15 hover:bg-indigo-600/25 border border-indigo-500/25 text-indigo-300 font-bold text-xs px-4 py-2.5 rounded-xl transition cursor-pointer"
              >
                Réinitialiser les filtres
              </button>
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
            >
              {filteredStories.map((story) => {
                const isStoryEditing = editingStoryId === story.id;
                
                return (
                  <motion.div
                    key={story.id}
                    layoutId={`story-card-${story.id}`}
                    whileHover={{ scale: 1.01 }}
                    className="glass border border-white/10 p-5 rounded-2xl flex flex-col justify-between gap-5 relative overflow-hidden group hover:border-indigo-500/20 transition-all shadow-md bg-[#0b0b0b]/60"
                  >
                    {/* Background decor */}
                    <div className="absolute top-0 right-0 w-32 h-32 rounded-full bg-indigo-500/3 blur-2xl pointer-events-none" />

                    <div className="flex flex-col gap-3 z-10">
                      {/* Top stats header */}
                      <div className="flex justify-between items-center pb-2.5 border-b border-white/5">
                        <span className="text-[9px] bg-indigo-500/10 text-indigo-300 font-mono px-2 py-0.5 rounded border border-indigo-500/15 uppercase font-bold">
                          {story.genre}
                        </span>
                        
                        <div className="flex items-center gap-2">
                          {/* Favorite toggle */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onToggleFavorite(story.id);
                            }}
                            className="p-1 rounded-lg hover:bg-white/5 transition text-white/30 hover:text-red-400 group/fav"
                            title={story.isFavorite ? "Retirer de vos favoris" : "Marquer coup de cœur"}
                          >
                            <Heart className={`w-4 h-4 transition ${story.isFavorite ? "fill-red-400 text-red-500 animate-pulse" : "text-white/40 font-bold group-hover/fav:scale-110"}`} />
                          </button>
                        </div>
                      </div>

                      {/* Title block */}
                      {isStoryEditing ? (
                        <div className="flex gap-1.5 items-center mt-1 select-none">
                          <input
                            type="text"
                            value={renameValue}
                            onChange={(e) => setRenameValue(e.target.value)}
                            className="bg-black/60 border border-white/20 focus:border-indigo-500 text-white rounded-lg p-1.5 text-xs font-serif font-bold focus:outline-none flex-1"
                          />
                          <button
                            onClick={(e) => handleSaveRename(story.id, e)}
                            className="p-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingStoryId(null);
                            }}
                            className="p-1.5 bg-white/5 hover:bg-white/10 border border-white/10 text-white/50 rounded-lg transition"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-start justify-between gap-1.5 mt-1">
                          <h3 
                            onClick={() => onSelectStory(story.id)}
                            className="font-serif font-bold text-white text-base leading-snug cursor-pointer hover:text-indigo-300 transition-colors line-clamp-2"
                          >
                            {story.title}
                          </h3>
                          <button
                            onClick={(e) => handleStartRename(story, e)}
                            className="p-1 rounded opacity-0 group-hover:opacity-100 transition hover:bg-white/5 text-white/30 hover:text-white shrink-0"
                            title="Renommer l'histoire"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}

                      <div className="flex items-center gap-1.5 text-[10px] text-white/40 mt-1">
                        <Clock className="w-3.5 h-3.5 shrink-0" />
                        <span>Créé le {story.createdAt}</span>
                      </div>
                    </div>

                    <div className="flex flex-col gap-3.5 z-10">
                      {/* Sub metadata details */}
                      <div className="grid grid-cols-2 gap-2 bg-white/3 p-2 rounded-xl text-center text-[10px]">
                        <div>
                          <span className="text-[9px] text-white/30 uppercase font-mono block">Audience</span>
                          <span className="font-semibold text-white/70 block truncate">{story.audience}</span>
                        </div>
                        <div>
                          <span className="text-[9px] text-white/30 uppercase font-mono block">Ton</span>
                          <span className="font-semibold text-white/70 block truncate">{story.tone}</span>
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          onClick={() => onSelectStory(story.id)}
                          className="flex items-center justify-center gap-1.5 bg-indigo-600/10 hover:bg-indigo-600/20 border border-indigo-500/20 text-indigo-400 font-bold text-xs py-2 rounded-xl transition cursor-pointer"
                        >
                          <BookOpen className="w-3.5 h-3.5" />
                          <span>Lire le conte</span>
                        </button>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteStory(story.id);
                          }}
                          className="flex items-center justify-center gap-1 bg-white/5 hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/20 border border-white/10 text-white/55 font-semibold text-xs py-2 rounded-xl transition cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Supprimer</span>
                        </button>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

    </div>
  );
}
