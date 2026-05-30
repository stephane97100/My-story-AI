import React, { useState, useEffect, useRef } from "react";
import {
  BookOpen,
  Sparkles,
  Play,
  Pause,
  Square,
  Edit,
  Check,
  X,
  Plus,
  Volume2,
  VolumeX,
  Trash2,
  Wand2,
  FileText,
  ChevronRight,
  Info,
  Layers,
  ArrowRight,
  RefreshCw,
  Image as ImageIcon,
  BookMarked,
  Clock,
  User,
  Heart
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import {
  PRESET_PROMPTS,
  GENRES,
  TONES,
  AUDIENCES,
  SYSTEM_VOICES,
  GEMINI_PREBUILT_VOICES,
  PRESET_LOADING_STEPS,
  PresetPrompt
} from "./presets";
import { Story, StorySection, SectionType, StoryGenerationResponse } from "./types";

export default function App() {
  // Application general states
  const [prompt, setPrompt] = useState("");
  const [selectedGenre, setSelectedGenre] = useState("Merveilleux");
  const [selectedTone, setSelectedTone] = useState("Poétique");
  const [selectedAudience, setSelectedAudience] = useState("Tout public");
  
  // Storage shelf
  const [savedStories, setSavedStories] = useState<Story[]>([]);
  const [selectedStoryId, setSelectedStoryId] = useState<string | null>(null);
  
  // Progress & Generation states
  const [isGenerating, setIsGenerating] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [loadingInterval, setLoadingInterval] = useState<NodeJS.Timeout | null>(null);
  const [errorLine, setErrorLine] = useState<string | null>(null);

  // Audio system states
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [audioPaused, setAudioPaused] = useState(false);
  const [ttsMode, setTtsMode] = useState<"system" | "gemini">("system");
  const [systemVoice, setSystemVoice] = useState("fr-FR");
  const [geminiVoice, setGeminiVoice] = useState("Kore");
  const [speechRate, setSpeechRate] = useState(1);
  const [isTtsLoading, setIsTtsLoading] = useState(false);
  const [activeSpeakingSectionId, setActiveSpeakingSectionId] = useState<SectionType | null>(null);

  // Inline editing & refine AI states
  const [editingSectionId, setEditingSectionId] = useState<SectionType | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editText, setEditText] = useState("");
  const [isRefining, setIsRefining] = useState(false);
  const [refinementInstruction, setRefinementInstruction] = useState("");
  const [refineError, setRefineError] = useState<string | null>(null);

  // References
  const globalAudioRef = useRef<HTMLAudioElement | null>(null);
  const speakingUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  // Load saved stories from localstorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem("mystoryai_stories");
      if (stored) {
        const parsed = JSON.parse(stored) as Story[];
        if (parsed && parsed.length > 0) {
          setSavedStories(parsed);
          setSelectedStoryId(parsed[0].id);
        }
      }
    } catch (e) {
      console.error("Local storage load failed", e);
    }
  }, []);

  // Save stories to localstorage when they change
  const saveStoriesToStorage = (updatedList: Story[]) => {
    setSavedStories(updatedList);
    try {
      localStorage.setItem("mystoryai_stories", JSON.stringify(updatedList));
    } catch (e) {
      console.error("Local storage save failed", e);
    }
  };

  // Rotation of loading steps
  useEffect(() => {
    if (isGenerating) {
      setLoadingStep(0);
      const interval = setInterval(() => {
        setLoadingStep((prev) => (prev + 1) % PRESET_LOADING_STEPS.length);
      }, 3500);
      setLoadingInterval(interval);
      return () => clearInterval(interval);
    } else {
      if (loadingInterval) clearInterval(loadingInterval);
    }
  }, [isGenerating]);

  // Handle preset selection
  const selectPreset = (preset: PresetPrompt) => {
    setPrompt(preset.prompt);
    setSelectedGenre(preset.genre);
    setSelectedTone(preset.tone);
    setSelectedAudience(preset.audience);
  };

  // Find selected story
  const currentStory = savedStories.find((s) => s.id === selectedStoryId) || null;

  // 1. Core Service: Generate Entire Story
  const handleGenerateStory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) return;

    setIsGenerating(true);
    setErrorLine(null);
    setEditingSectionId(null);

    try {
      const response = await fetch("/api/generate-story", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: prompt,
          genre: selectedGenre,
          tone: selectedTone,
          audience: selectedAudience,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Une erreur est survenue.");
      }

      const generatedData = data as StoryGenerationResponse;

      // Map back to our structural Story format
      const newStory: Story = {
        id: "story_" + Date.now(),
        title: generatedData.title || "Histoire Sans Nom",
        genre: selectedGenre,
        tone: selectedTone,
        audience: selectedAudience,
        createdAt: new Date().toLocaleDateString("fr-FR", {
          day: "numeric",
          month: "long",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        }),
        sections: {
          introduction: {
            id: "introduction",
            title: generatedData.introduction.title || "Introduction",
            text: generatedData.introduction.text,
            imagePrompt: generatedData.introduction.imagePrompt,
            imageUrl: null,
            isGeneratingImage: false,
          },
          developpement: {
            id: "developpement",
            title: generatedData.developpement.title || "Développement",
            text: generatedData.developpement.text,
            imagePrompt: generatedData.developpement.imagePrompt,
            imageUrl: null,
            isGeneratingImage: false,
          },
          climax: {
            id: "climax",
            title: generatedData.climax.title || "Le Climax",
            text: generatedData.climax.text,
            imagePrompt: generatedData.climax.imagePrompt,
            imageUrl: null,
            isGeneratingImage: false,
          },
          conclusion: {
            id: "conclusion",
            title: generatedData.conclusion.title || "Conclusion",
            text: generatedData.conclusion.text,
            imagePrompt: generatedData.conclusion.imagePrompt,
            imageUrl: null,
            isGeneratingImage: false,
          },
        },
      };

      // Add to list and select it
      const updatedList = [newStory, ...savedStories];
      saveStoriesToStorage(updatedList);
      setSelectedStoryId(newStory.id);

      // Trigger automatic image generation backdrop for the first section to welcome user!
      triggerImageGeneration(newStory.id, "introduction", newStory.sections.introduction.imagePrompt);

    } catch (err: any) {
      console.error(err);
      setErrorLine(err.message || "Erreur de connexion avec le serveur d'écriture.");
    } finally {
      setIsGenerating(false);
    }
  };

  // 2. Core Service: Image Generation
  const triggerImageGeneration = async (storyId: string, sectionId: SectionType, visualPrompt: string) => {
    // Set loading state in story
    const targetStory = savedStories.find((s) => s.id === storyId);
    if (!targetStory) return;

    const updatedStories = savedStories.map((story) => {
      if (story.id === storyId) {
        return {
          ...story,
          sections: {
            ...story.sections,
            [sectionId]: {
              ...story.sections[sectionId],
              isGeneratingImage: true,
              imageError: undefined,
            },
          },
        };
      }
      return story;
    });
    setSavedStories(updatedStories);

    try {
      const response = await fetch("/api/generate-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: visualPrompt }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Impossible de joindre le générateur de tableaux.");
      }

      // Update story with image URL
      const finalStories = savedStories.map((story) => {
        if (story.id === storyId) {
          return {
            ...story,
            sections: {
              ...story.sections,
              [sectionId]: {
                ...story.sections[sectionId],
                imageUrl: data.imageUrl,
                isGeneratingImage: false,
                imageError: data.warning || undefined, // Notify user if mock fallback was loaded
              },
            },
          };
        }
        return story;
      });
      saveStoriesToStorage(finalStories);

    } catch (err: any) {
      console.error("Image generation error", err);
      const finalStories = savedStories.map((story) => {
        if (story.id === storyId) {
          return {
            ...story,
            sections: {
              ...story.sections,
              [sectionId]: {
                ...story.sections[sectionId],
                isGeneratingImage: false,
                imageError: "La création visuelle a échoué. Utilisez le bouton pour réessayer.",
              },
            },
          };
        }
        return story;
      });
      setSavedStories(finalStories);
    }
  };

  // 3. Core Service: Refine section via AI Wand
  const handleRefineSection = async (storyId: string, sectionId: SectionType) => {
    if (!refinementInstruction.trim() || !currentStory) return;

    setIsRefining(true);
    setRefineError(null);

    try {
      const response = await fetch("/api/regenerate-section", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          originalPrompt: prompt || currentStory.title,
          sectionId: sectionId,
          currentText: currentStory.sections[sectionId].text,
          instruction: refinementInstruction,
          genre: currentStory.genre,
          tone: currentStory.tone,
          audience: currentStory.audience,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Le modèle de raffinement n'a pas pu traiter cette réécriture.");
      }

      // Apply revised section data to the story
      const updatedStories = savedStories.map((story) => {
        if (story.id === storyId) {
          const updatedSection: StorySection = {
            ...story.sections[sectionId],
            title: data.title || story.sections[sectionId].title,
            text: data.text,
            imagePrompt: data.imagePrompt || story.sections[sectionId].imagePrompt,
            // Clear current image since prompt changed, let them regenerate illustration if they want to
            imageUrl: null, 
          };
          return {
            ...story,
            sections: {
              ...story.sections,
              [sectionId]: updatedSection,
            },
          };
        }
        return story;
      });

      saveStoriesToStorage(updatedStories);
      setEditingSectionId(null);
      setRefinementInstruction("");

      // Trigger automatic image update since the narrative scenery shifted!
      const newPrompt = data.imagePrompt || currentStory.sections[sectionId].imagePrompt;
      triggerImageGeneration(storyId, sectionId, newPrompt);

    } catch (err: any) {
      console.error(err);
      setRefineError(err.message || "Erreur de communication lors du raffinement narratif.");
    } finally {
      setIsRefining(false);
    }
  };

  // 4. Save manual textual modifications
  const handleSaveManualEdit = (storyId: string, sectionId: SectionType) => {
    if (!editText.trim() || !currentStory) return;

    const updatedStories = savedStories.map((story) => {
      if (story.id === storyId) {
        return {
          ...story,
          sections: {
            ...story.sections,
            [sectionId]: {
              ...story.sections[sectionId],
              title: editTitle || story.sections[sectionId].title,
              text: editText,
            },
          },
        };
      }
      return story;
    });

    saveStoriesToStorage(updatedStories);
    setEditingSectionId(null);
  };

  // Delete story from shelf
  const handleDeleteStory = (storyId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm("Êtes-vous certain de vouloir archiver et supprimer définitivement ce récit ?")) {
      stopAudio();
      const updated = savedStories.filter((s) => s.id !== storyId);
      saveStoriesToStorage(updated);
      if (selectedStoryId === storyId) {
        setSelectedStoryId(updated.length > 0 ? updated[0].id : null);
      }
    }
  };

  // Toggle Edit Modal/In-line inputs
  const startEditingSection = (section: StorySection) => {
    stopAudio();
    setEditingSectionId(section.id);
    setEditTitle(section.title);
    setEditText(section.text);
    setRefinementInstruction("");
    setRefineError(null);
  };

  // --- AUDIO / NARRATION CONTROLLER SYSTEM ---

  // Client-Side Speak (Web Speech Synthesis in flawless French)
  const speakClientTts = (textToSpeak: string, sectionId?: SectionType) => {
    try {
      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(textToSpeak);
      utterance.lang = systemVoice; // fr-FR or fr-CA
      utterance.rate = speechRate;

      // Match selected voice language
      const availableVoices = window.speechSynthesis.getVoices();
      const matchedVoice = availableVoices.find((v) => v.lang.startsWith(systemVoice));
      if (matchedVoice) {
        utterance.voice = matchedVoice;
      }

      utterance.onstart = () => {
        setIsSpeaking(true);
        setAudioPaused(false);
        if (sectionId) setActiveSpeakingSectionId(sectionId);
      };

      utterance.onend = () => {
        setIsSpeaking(false);
        setActiveSpeakingSectionId(null);
      };

      utterance.onerror = (evt) => {
        console.error("Speech Synthesis Error", evt);
        setIsSpeaking(false);
        setActiveSpeakingSectionId(null);
      };

      speakingUtteranceRef.current = utterance;
      window.speechSynthesis.speak(utterance);
    } catch (err) {
      console.error("Client TTS speech crash", err);
      setIsSpeaking(false);
    }
  };

  // Server-Side Speak (Gemini Premium TTS Route)
  const speakGeminiTts = async (textToSpeak: string, sectionId?: SectionType) => {
    setIsTtsLoading(true);
    try {
      if (globalAudioRef.current) {
        globalAudioRef.current.pause();
      }

      const res = await fetch("/api/generate-tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: textToSpeak, voice: geminiVoice }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Une erreur est apparue sur la synthèse cloud.");
      }

      if (data.audio) {
        const audioUrl = `data:audio/wav;base64,${data.audio}`;
        const audioObj = new Audio(audioUrl);
        globalAudioRef.current = audioObj;

        audioObj.onloadstart = () => {
          setIsSpeaking(true);
          setAudioPaused(false);
          if (sectionId) setActiveSpeakingSectionId(sectionId);
        };

        audioObj.onended = () => {
          setIsSpeaking(false);
          setActiveSpeakingSectionId(null);
        };

        audioObj.onerror = (e) => {
          console.warn("Playback of custom Gemini stream audio failed.", e);
          setIsSpeaking(false);
          setActiveSpeakingSectionId(null);
        };

        await audioObj.play();
      }
    } catch (err: any) {
      console.warn("Premium TTS issue:", err.message);
      alert("Le service vocal premium Gemini IA réclame des identifiants API enrichis. Lecture automatique basculée vers la voix système gratuite!");
      setTtsMode("system");
      speakClientTts(textToSpeak, sectionId);
    } finally {
      setIsTtsLoading(false);
    }
  };

  // Main voice narration director
  const startNarration = (text: string, sectionId?: SectionType) => {
    if (ttsMode === "system") {
      speakClientTts(text, sectionId);
    } else {
      speakGeminiTts(text, sectionId);
    }
  };

  // Pause speech
  const pauseAudio = () => {
    if (ttsMode === "system") {
      window.speechSynthesis.pause();
      setAudioPaused(true);
    } else {
      if (globalAudioRef.current) {
        globalAudioRef.current.pause();
        setAudioPaused(true);
      }
    }
  };

  // Resume Speech
  const resumeAudio = () => {
    if (ttsMode === "system") {
      window.speechSynthesis.resume();
      setAudioPaused(false);
    } else {
      if (globalAudioRef.current) {
        globalAudioRef.current.play().catch(() => {});
        setAudioPaused(false);
      }
    }
  };

  // Stop everything
  const stopAudio = () => {
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    if (globalAudioRef.current) {
      globalAudioRef.current.pause();
      globalAudioRef.current = null;
    }
    setIsSpeaking(false);
    setAudioPaused(false);
    setActiveSpeakingSectionId(null);
  };

  // Narration of full stories
  const playFullStory = () => {
    if (!currentStory) return;
    const fullText = `${currentStory.title}. Introduction. ${currentStory.sections.introduction.text}. Étape suivante, développement. ${currentStory.sections.developpement.text}. Troisième phase, le climax. ${currentStory.sections.climax.text}. Conclusion. ${currentStory.sections.conclusion.text}`;
    startNarration(fullText);
  };

  return (
    <div className="min-h-screen relative overflow-hidden bg-[#050505] text-[#E0E0E0] flex flex-col font-sans transition-all duration-300">
      
      {/* Decorative Warm Backgrop Lights */}
      <div className="absolute top-0 left-1/4 p-1 w-96 h-96 rounded-full bg-indigo-500/10 ambient-indigo pointer-events-none" />
      <div className="absolute bottom-20 right-1/4 w-[28rem] h-[28rem] rounded-full bg-purple-500/10 ambient-indigo pointer-events-none" />

      {/* 1. Header Area with story bookcase selection */}
      <header className="sticky top-0 z-40 bg-black/60 backdrop-blur-md border-b border-white/10 py-3.5 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          
          <div className="flex items-center gap-3">
            <div className="bg-indigo-600 text-white w-10 h-10 rounded-xl flex items-center justify-center font-bold text-lg italic shadow-lg shadow-indigo-500/20">
              S
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-light tracking-widest uppercase text-white flex items-center gap-1.5">
                My story <span className="font-bold text-indigo-500">AI</span>
              </h1>
              <p className="text-[10px] sm:text-xs text-white/40 font-mono tracking-wider uppercase">
                Studio Littéraire Multimodal
              </p>
            </div>
          </div>

          {/* Shelves Selection */}
          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-end">
            {savedStories.length > 0 && (
              <div className="flex items-center gap-2 bg-white/5 px-3 py-1.5 rounded-xl border border-white/10 w-full sm:w-auto">
                <BookMarked className="w-4 h-4 text-indigo-400 shrink-0" />
                <select
                  value={selectedStoryId || ""}
                  onChange={(e) => {
                    stopAudio();
                    setSelectedStoryId(e.target.value);
                  }}
                  className="bg-transparent text-xs font-medium text-white/80 focus:outline-none cursor-pointer pr-4 max-w-[160px] truncate"
                >
                  {savedStories.map((s) => (
                    <option key={s.id} value={s.id} className="bg-[#121212] text-white">
                      📖 {s.title}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <button
              id="new_story_btn"
              onClick={() => {
                stopAudio();
                setSelectedStoryId(null);
                setPrompt("");
              }}
              className="flex items-center justify-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold px-4 py-2.5 rounded-xl transition duration-200 cursor-pointer shadow-lg shadow-indigo-600/20 w-full sm:w-auto"
            >
              <Plus className="w-4 h-4" />
              <span>Nouvelle Histoire</span>
            </button>
          </div>
        </div>
      </header>

      {/* 2. Main Workstation Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 flex flex-col lg:flex-row gap-8">
        {/* SIDE A: Setup Story or display Book Shelf */}
        <div className="w-full lg:w-[38%] flex flex-col gap-6">
          
          {/* Preset Prompts Block */}
          {(!selectedStoryId || currentStory === null) && (
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass p-5 rounded-2xl"
            >
              <div className="flex items-center gap-2 mb-3">
                <Sparkles className="w-5 h-5 text-indigo-400" />
                <h3 className="font-serif font-bold text-white">Suggestions d'écrivain</h3>
              </div>
              <p className="text-xs text-white/60 mb-4">
                Inspirez-vous instantanément avec de magnifiques départs d'histoires :
              </p>
              <div className="grid grid-cols-1 gap-2.5">
                {PRESET_PROMPTS.map((preset, idx) => (
                  <button
                    key={idx}
                    onClick={() => selectPreset(preset)}
                    className="text-left bg-white/5 hover:bg-indigo-500/10 hover:border-indigo-500/40 border border-white/10 p-3 rounded-xl transition-all cursor-pointer group"
                  >
                    <div className="flex justify-between items-center mb-1">
                      <span className="font-serif font-bold text-xs text-white/90 group-hover:text-indigo-300">
                        {preset.title}
                      </span>
                      <span className="text-[9px] bg-white/10 group-hover:bg-indigo-500/20 text-white/60 group-hover:text-indigo-200 font-mono px-1.5 py-0.5 rounded uppercase">
                        {preset.genre}
                      </span>
                    </div>
                    <p className="text-[11px] text-white/40 line-clamp-2 leading-relaxed">
                      {preset.excerpt}
                    </p>
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          {/* Core Configuration & Writing Machine Card */}
          <div className="glass rounded-2xl p-5 sm:p-6 sticky top-24">
            <div className="flex items-center gap-2.5 mb-5 border-b border-white/10 pb-3">
              <Plus className="w-5 h-5 text-indigo-400" />
              <h2 className="font-serif font-bold text-lg text-white">
                {selectedStoryId && currentStory ? "Aperçu de la Séance" : "Configurez votre Récit"}
              </h2>
            </div>

            {selectedStoryId && currentStory ? (
              // Story Metadata Side view if a story is active
              <div className="flex flex-col gap-4 text-xs">
                <div className="bg-white/5 p-4 rounded-xl border border-white/10 flex flex-col gap-2">
                  <h3 className="font-serif font-black text-white text-sm mb-1">
                    {currentStory.title}
                  </h3>
                  <div className="flex items-center gap-1.5 text-white/55">
                    <Clock className="w-3.5 h-3.5" />
                    <span>Créée le {currentStory.createdAt}</span>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div className="bg-white/5 border border-white/10 p-2.5 rounded-xl text-center">
                    <span className="text-[9px] text-white/40 uppercase font-mono block">Genre</span>
                    <span className="font-semibold text-white/90">{currentStory.genre}</span>
                  </div>
                  <div className="bg-white/5 border border-white/10 p-2.5 rounded-xl text-center">
                    <span className="text-[9px] text-white/40 uppercase font-mono block">Ton</span>
                    <span className="font-semibold text-white/90">{currentStory.tone}</span>
                  </div>
                  <div className="bg-white/5 border border-white/10 p-2.5 rounded-xl text-center">
                    <span className="text-[9px] text-white/40 uppercase font-mono block">Public</span>
                    <span className="font-semibold text-white/90 text-[11px] truncate block">{currentStory.audience}</span>
                  </div>
                </div>

                <div className="border-t border-white/10 pt-3">
                  <h4 className="font-medium text-white/80 mb-2">Options Audio</h4>
                  <div className="flex flex-col gap-2.5">
                    
                    {/* TTS Mode Selection */}
                    <div className="flex gap-1.5 bg-black/40 p-1 rounded-xl border border-white/5">
                      <button
                        onClick={() => setTtsMode("system")}
                        className={`flex-1 text-center py-1.5 rounded-lg text-[10px] uppercase tracking-wider font-mono font-bold transition-all ${
                          ttsMode === "system"
                            ? "bg-white/10 text-white border border-white/15"
                            : "text-white/40 hover:text-white/70"
                        }`}
                      >
                        Voix Système (Gratuite)
                      </button>
                      <button
                        onClick={() => setTtsMode("gemini")}
                        className={`flex-1 text-center py-1.5 rounded-lg text-[10px] uppercase tracking-wider font-mono font-bold transition-all ${
                          ttsMode === "gemini"
                            ? "bg-white/10 text-indigo-300 border border-white/15"
                            : "text-white/40 hover:text-white/70"
                        }`}
                      >
                        Gemini IA Voice (Premium)
                      </button>
                    </div>

                    {/* Speech Customizations */}
                    {ttsMode === "system" ? (
                      <div className="grid grid-cols-2 gap-2">
                        <div className="flex flex-col gap-1">
                          <label className="text-[10px] text-white/40 uppercase font-mono">Accent</label>
                          <select
                            value={systemVoice}
                            onChange={(e) => setSystemVoice(e.target.value)}
                            className="bg-black/40 border border-white/10 p-1.5 rounded-lg text-xs text-white"
                          >
                            {SYSTEM_VOICES.map((v) => (
                              <option key={v.id} value={v.id} className="bg-[#121212] text-white">{v.name}</option>
                            ))}
                          </select>
                        </div>
                        <div className="flex flex-col gap-1">
                          <label className="text-[10px] text-white/40 uppercase font-mono">Vitesse ({speechRate}x)</label>
                          <input
                            type="range"
                            min="0.7"
                            max="1.6"
                            step="0.1"
                            value={speechRate}
                            onChange={(e) => setSpeechRate(parseFloat(e.target.value))}
                            className="accent-indigo-500"
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col gap-1">
                        <label className="text-[10px] text-white/40 uppercase font-mono">Timbre de la voix IA</label>
                        <select
                          value={geminiVoice}
                          onChange={(e) => setGeminiVoice(e.target.value)}
                          className="bg-black/40 border border-white/10 p-1.5 rounded-lg text-xs text-white"
                        >
                          {GEMINI_PREBUILT_VOICES.map((v) => (
                            <option key={v.id} value={v.id} className="bg-[#121212] text-white">{v.label}</option>
                          ))}
                        </select>
                      </div>
                    )}

                    {/* Master Action Reads */}
                    <div className="flex flex-wrap gap-2 mt-2">
                      <button
                        onClick={playFullStory}
                        disabled={isSpeaking || isTtsLoading}
                        className="flex-1 flex items-center justify-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold py-2.5 rounded-xl transition cursor-pointer shadow-lg shadow-indigo-600/10 disabled:opacity-40"
                      >
                        <Volume2 className="w-4 h-4" />
                        <span>Écouter Tout le Texte</span>
                      </button>

                      {isSpeaking && (
                        <div className="flex gap-1">
                          <button
                            onClick={audioPaused ? resumeAudio : pauseAudio}
                            className="bg-purple-600 hover:bg-purple-500 text-white p-2.5 rounded-xl transition cursor-pointer"
                            title={audioPaused ? "Reprendre" : "Pause"}
                          >
                            {audioPaused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
                          </button>
                          <button
                            onClick={stopAudio}
                            className="bg-zinc-800 hover:bg-zinc-700 text-white p-2.5 rounded-xl transition cursor-pointer"
                            title="Arrêter"
                          >
                            <Square className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>

                    {isTtsLoading && (
                      <p className="text-[10px] font-mono text-indigo-400 animate-pulse text-center">
                        ⏳ Synthèse vocale Gemini IA en cours de chargement...
                      </p>
                    )}

                  </div>
                </div>

                <div className="border-t border-white/10 pt-4 flex gap-2">
                  <button
                    onClick={(e) => handleDeleteStory(currentStory.id, e)}
                    className="flex-1 flex items-center justify-center gap-1.5 bg-white/5 hover:bg-red-900/20 border border-white/10 text-white/60 hover:text-red-400 text-xs py-2 rounded-xl transition cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>Effacer le conte</span>
                  </button>
                  <button
                    onClick={() => {
                      stopAudio();
                      setSelectedStoryId(null);
                    }}
                    className="flex-1 flex items-center justify-center gap-1.5 bg-indigo-650 hover:bg-indigo-600 bg-indigo-600/20 text-indigo-300 border border-indigo-500/20 text-xs py-2 rounded-xl transition cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Nouveau récit</span>
                  </button>
                </div>
              </div>
            ) : (
              // Formulation inputs
              <form onSubmit={handleGenerateStory} className="flex flex-col gap-4">
                
                {/* Creative prompt theme block */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-mono uppercase tracking-wider text-white/50 font-bold">
                    Votre Idée ou Thème d'Histoire
                  </label>
                  <textarea
                    required
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="Ex: Le voyage nocturne d'un vieux phare qui rêve d'explorer la forêt..."
                    rows={4}
                    className="bg-black/30 hover:bg-black/50 focus:bg-black text-white border border-white/15 focus:border-indigo-500 p-3 rounded-xl text-xs placeholder:text-white/20 focus:outline-none transition leading-relaxed resize-none"
                  />
                </div>

                {/* Genre Option Grid */}
                <div className="flex flex-col gap-2">
                  <label className="text-[11px] font-mono uppercase tracking-wider text-white/50 font-bold">
                    Genre Littéraire
                  </label>
                  <div className="grid grid-cols-2 gap-1.5">
                    {GENRES.map((g) => (
                      <button
                        key={g.id}
                        type="button"
                        onClick={() => setSelectedGenre(g.id)}
                        className={`text-left p-2.5 rounded-xl border text-xs font-semibold cursor-pointer transition ${
                          selectedGenre === g.id
                            ? "bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-600/20"
                            : "bg-white/5 hover:bg-white/10 border-white/10 text-white/70"
                        }`}
                      >
                        {g.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Tone / Mood Option List */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-mono uppercase tracking-wider text-white/50 font-bold">
                    Ton / Style
                  </label>
                  <select
                    value={selectedTone}
                    onChange={(e) => setSelectedTone(e.target.value)}
                    className="bg-[#121212] border border-white/10 focus:border-indigo-500 rounded-xl p-2.5 text-xs font-medium focus:outline-none cursor-pointer text-white"
                  >
                    {TONES.map((t) => (
                      <option key={t.id} value={t.id} className="bg-[#121212] text-white">
                        🎨 {t.label} — ({t.desc})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Audience targets */}
                <div className="flex flex-col gap-2">
                  <label className="text-[11px] font-mono uppercase tracking-wider text-white/50 font-bold">
                    Auditoire (Public cible)
                  </label>
                  <div className="grid grid-cols-3 gap-1.5">
                    {AUDIENCES.map((aud) => (
                      <button
                        key={aud.id}
                        type="button"
                        onClick={() => setSelectedAudience(aud.id)}
                        className={`p-2 rounded-xl text-center border text-[11px] font-bold cursor-pointer transition flex flex-col items-center justify-center ${
                          selectedAudience === aud.id
                            ? "bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-600/20"
                            : "bg-white/5 hover:bg-white/10 border-white/10 text-white/70"
                        }`}
                        title={aud.desc}
                      >
                        <span>{aud.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Trigger Button */}
                <button
                  type="submit"
                  disabled={isGenerating || !prompt.trim()}
                  className="w-full mt-4 flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white py-3 rounded-xl text-sm font-bold shadow-lg shadow-indigo-600/30 transition cursor-pointer disabled:opacity-40"
                >
                  <Sparkles className="w-4 h-4 text-amber-300" />
                  <span>Donner Vie au Récit par l'IA</span>
                </button>

                {errorLine && (
                  <div className="bg-red-950/40 border border-red-900/50 p-3 rounded-xl text-[11px] text-red-300">
                    <p className="font-semibold mb-1">Désolé, l'écriture a buté :</p>
                    <p className="font-mono">{errorLine}</p>
                  </div>
                )}
              </form>
            )}
          </div>
        </div>

        {/* SIDE B: STORY CONTINUUM BOOKSHELF */}
        <div className="flex-1 glass rounded-3xl p-6 sm:p-8">
          
          <AnimatePresence mode="wait">
            
            {/* 1. Loader screen when AI writes */}
            {isGenerating && (
              <motion.div
                key="loading-canvas"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="min-h-[450px] flex flex-col items-center justify-center text-center p-8 bg-white/3 border border-white/5 rounded-2xl"
              >
                <div className="relative mb-6">
                  {/* Glowing circles */}
                  <div className="absolute inset-0 bg-indigo-500/20 rounded-full blur-xl animate-ping" />
                  <div className="bg-indigo-600 text-white p-5 rounded-full inline-block relative shadow-lg shadow-indigo-500/30">
                    <BookOpen className="w-10 h-10 animate-bounce" />
                  </div>
                </div>

                <h3 className="font-serif font-black text-white text-xl md:text-2xl mb-2">
                  Votre œuvre prend forme...
                </h3>
                <p className="font-mono text-xs uppercase tracking-wide text-indigo-400 animate-pulse font-semibold mb-4">
                  {PRESET_LOADING_STEPS[loadingStep]}
                </p>

                <p className="text-white/60 max-w-sm text-xs leading-relaxed">
                  L'écriture structurée par intelligence artificielle nécessite quelques instants pour filer l'intrigue parfaite de l'Introduction au Climax final...
                </p>

                <div className="w-48 bg-white/10 h-1 rounded-full overflow-hidden mt-6">
                  <div
                    className="bg-indigo-500 h-full transition-all duration-1000 ease-in-out"
                    style={{ width: `${((loadingStep + 1) / PRESET_LOADING_STEPS.length) * 100}%` }}
                  />
                </div>
              </motion.div>
            )}

            {/* 2. Empty Shelf Screen */}
            {!isGenerating && (!selectedStoryId || currentStory === null) && (
              <motion.div
                key="empty-shelf"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="min-h-[450px] flex flex-col items-center justify-center text-center p-6 border-2 border-dashed border-white/10 rounded-2xl bg-white/3"
              >
                <div className="bg-white/5 text-white/40 p-4 rounded-2xl mb-4">
                  <BookOpen className="w-12 h-12" />
                </div>
                <h3 className="font-serif font-bold text-white text-lg mb-1.5">
                  Aucun secret n'est encore couché sur papier
                </h3>
                <p className="text-white/50 text-xs max-w-sm leading-relaxed mb-6">
                  Formulez une idée à gauche ou sollicitez une de nos suggestions inspirantes pour générer votre première histoire illustrée.
                </p>

                {savedStories.length > 0 && (
                  <div className="w-full max-w-md border border-white/10 bg-black/40 p-4 rounded-xl shadow-lg text-left">
                    <h4 className="font-serif font-bold text-xs text-indigo-400 uppercase tracking-widest mb-2.5">
                      Contes déjà conservés :
                    </h4>
                    <div className="flex flex-col gap-2 max-h-[160px] overflow-y-auto">
                      {savedStories.map((story) => (
                        <button
                          key={story.id}
                          onClick={() => setSelectedStoryId(story.id)}
                          className="w-full text-left bg-white/5 hover:bg-indigo-500/10 p-2.5 rounded-lg border border-white/5 flex items-center justify-between text-xs transition cursor-pointer"
                        >
                          <span className="font-serif font-semibold text-white/90 truncate pr-4">
                            📖 {story.title}
                          </span>
                          <span className="text-[10px] text-indigo-350 font-mono italic">
                            {story.genre}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </motion.div>
            )}

            {/* 3. The Story Paper Presentation */}
            {!isGenerating && currentStory && (
              <motion.div
                key={currentStory.id}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="flex flex-col gap-10"
              >
                
                {/* Book Title Header */}
                <div className="text-center py-6 border-b border-white/10">
                  <span className="font-mono text-[9px] uppercase tracking-widest text-[#6366f1] bg-indigo-500/10 border border-indigo-500/20 px-2.5 py-1 rounded-full font-bold">
                    ✦ {currentStory.genre} • {currentStory.tone} ✦
                  </span>
                  <h2 className="font-serif font-light text-3xl sm:text-4xl text-white mt-3 mb-2 tracking-wide block italic">
                    {currentStory.title}
                  </h2>
                  <p className="text-white/40 font-serif italic text-xs">
                    Rédigé en collaboration littéraire avec My Story AI
                  </p>
                </div>

                {/* Structured Sections layout (Introduction, Developpement, Climax, Conclusion) */}
                <div className="flex flex-col gap-14 mt-4">
                  {(["introduction", "developpement", "climax", "conclusion"] as SectionType[]).map((secKey) => {
                    const sectionObj = currentStory.sections[secKey];
                    const isSecSpeaking = activeSpeakingSectionId === secKey && isSpeaking;

                    return (
                      <div
                        key={secKey}
                        className={`grid grid-cols-1 md:grid-cols-12 gap-6 items-start relative border-l-2 pl-4 md:pl-0 md:border-l-0 ${
                          isSecSpeaking ? "border-indigo-500 md:bg-indigo-500/5 md:-mx-4 md:px-4 md:py-4 md:rounded-2xl" : "border-white/10"
                        } transition-all duration-300`}
                      >
                        
                        {/* LEFT COLUMN/Illustration (Span 5) */}
                        <div className="md:col-span-5 flex flex-col gap-2.5">
                          
                          {/* Image Box */}
                          <div className="relative aspect-[4/3] rounded-2xl overflow-hidden bg-[#121212] border border-white/10 shadow-lg group">
                            {sectionObj.imageUrl ? (
                              <>
                                <img
                                  src={sectionObj.imageUrl}
                                  alt={sectionObj.title}
                                  referrerPolicy="no-referrer"
                                  className="w-full h-full object-cover select-none transition-transform duration-700 group-hover:scale-105"
                                />
                                {/* Bottom prompt hover overlay */}
                                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity p-3 flex flex-col justify-end text-white pointer-events-none">
                                  <span className="text-[8px] uppercase tracking-widest font-mono text-indigo-400 mb-1">
                                    Prompt Visuel d'illustration
                                  </span>
                                  <p className="text-[10px] italic leading-snug line-clamp-3 text-white/80">
                                    {sectionObj.imagePrompt}
                                  </p>
                                </div>
                              </>
                            ) : (
                              // Blank image placeholder
                              <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center">
                                {sectionObj.isGeneratingImage ? (
                                  <div className="flex flex-col items-center gap-2">
                                    <RefreshCw className="w-7 h-7 text-indigo-400 animate-spin" />
                                    <span className="text-[10px] font-mono text-white/50 animate-pulse">
                                      Peinture IA en cours...
                                    </span>
                                  </div>
                                ) : (
                                  <div className="flex flex-col items-center gap-2">
                                    <div className="bg-white/5 text-white/40 p-2.5 rounded-full border border-white/15 shadow-inner">
                                      <ImageIcon className="w-5 h-5" />
                                    </div>
                                    <span className="text-[10px] text-white/30 font-mono italic max-w-[150px]">
                                      Pas d'image générée
                                    </span>
                                    <button
                                      onClick={() => triggerImageGeneration(currentStory.id, secKey, sectionObj.imagePrompt)}
                                      className="mt-1 flex items-center gap-1 bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-bold px-3 py-1.5 rounded-lg cursor-pointer transition shadow-lg shadow-indigo-600/30"
                                    >
                                      <Sparkles className="w-3 h-3 text-amber-300" />
                                      <span>Peindre la scène</span>
                                    </button>
                                  </div>
                                )}
                              </div>
                            )}

                            {/* Warning notification about previews (Picsum fallback metadata) */}
                            {sectionObj.imageError && !sectionObj.isGeneratingImage && (
                              <div className="absolute top-2 left-2 bg-black/90 backdrop-blur-md px-2 py-1 rounded-md border border-white/10 flex items-center gap-1">
                                <Info className="w-3 h-3 text-amber-400 shrink-0" />
                                <span className="text-[8px] font-mono text-white/80 tracking-tight">
                                  Aperçu standard activé
                                </span>
                              </div>
                            )}
                          </div>

                          {/* Quick Regenerate Image Action */}
                          {sectionObj.imageUrl && !sectionObj.isGeneratingImage && (
                            <button
                              onClick={() => triggerImageGeneration(currentStory.id, secKey, sectionObj.imagePrompt)}
                              className="text-white/40 hover:text-indigo-400 flex items-center justify-center gap-1 text-[10px] font-mono hover:underline self-center transition cursor-pointer mt-1"
                            >
                              <RefreshCw className="w-3 h-3" />
                              <span>Générer un autre tableau IA</span>
                            </button>
                          )}
                        </div>

                        {/* RIGHT COLUMN/Narrative Text (Span 7) */}
                        <div className="md:col-span-7 flex flex-col gap-3">
                          
                          {/* Heading structure */}
                          <div className="flex items-center justify-between gap-3 border-b border-white/10 pb-2">
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] font-mono bg-white/5 text-indigo-300 border border-white/10 px-1.5 py-0.5 rounded uppercase font-bold">
                                {secKey === "introduction" ? "1. Introduction" :
                                 secKey === "developpement" ? "2. Intrigue" :
                                 secKey === "climax" ? "3. Climax" : "4. Épilogue"}
                              </span>
                              <h3 className="font-serif font-black text-white text-base md:text-lg">
                                {sectionObj.title}
                              </h3>
                            </div>

                            {/* Section Controls */}
                            <div className="flex items-center gap-1.5">
                              <button
                                onClick={() => startNarration(sectionObj.text, secKey)}
                                disabled={isTtsLoading}
                                className={`p-1.5 rounded-lg border transition cursor-pointer ${
                                  isSecSpeaking ? "bg-indigo-650 text-white border-indigo-500 scale-105" : "bg-[#161616] border-white/10 text-white/60 hover:text-indigo-400"
                                }`}
                                title="Lire cette section"
                              >
                                <Volume2 className="w-3.5 h-3.5" />
                              </button>
                              
                              <button
                                onClick={() => startEditingSection(sectionObj)}
                                className="p-1.5 rounded-lg border border-white/10 bg-[#161616] text-white/60 hover:text-indigo-400 transition cursor-pointer"
                                title="Éditer et Affiner la section"
                              >
                                <Edit className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>

                          {/* Speaking live visual feedback wave */}
                          {isSecSpeaking && (
                            <div className="flex items-center gap-1 bg-indigo-500/5 border border-indigo-500/20 px-2.5 py-1 rounded-lg self-start">
                              <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-ping inline-block" />
                              <span className="text-[9px] text-indigo-400 tracking-wide font-mono uppercase font-bold">
                                Narration active...
                              </span>
                            </div>
                          )}

                          {/* Literary body text reading space */}
                          <p className="font-serif text-sm sm:text-base text-white/80 leading-relaxed tracking-wide italic font-light">
                            {sectionObj.text}
                          </p>

                          {/* Metadata Image Prompt Display (Educational/AI power transparent) */}
                          <div className="mt-3 bg-white/3 p-2.5 rounded-xl border border-white/5 flex flex-col gap-1">
                            <span className="text-[9px] font-mono text-indigo-400 uppercase font-bold">
                              Prompt Illustration IA (Suggéré) :
                            </span>
                            <span className="text-[10px] text-white/60 italic leading-snug">
                              {sectionObj.imagePrompt}
                            </span>
                          </div>
                        </div>

                      </div>
                    );
                  })}
                </div>

                {/* Book Conclusion Sign-off */}
                <div className="text-center py-6 mt-6 border-t border-white/10">
                  <p className="text-white/30 font-mono text-[10px] uppercase tracking-widest">
                    ✦ Fin du Tome ✦
                  </p>
                </div>

              </motion.div>
            )}

          </AnimatePresence>
        </div>

      </main>

      {/* 4. MODAL/DRAWER FOR EDITING & AI REWRITE WAND */}
      <AnimatePresence>
        {editingSectionId !== null && currentStory !== null && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="glass max-w-2xl w-full p-6 relative overflow-hidden rounded-3xl border border-white/10 shadow-2xl"
            >
              
              {/* Header */}
              <div className="flex items-center justify-between border-b border-white/10 pb-3 mb-4">
                <div className="flex items-center gap-2">
                  <Wand2 className="w-5 h-5 text-indigo-400" />
                  <h3 className="font-serif font-black text-white text-lg">
                    Ajustement de la section — {editingSectionId.toUpperCase()}
                  </h3>
                </div>
                <button
                  onClick={() => setEditingSectionId(null)}
                  className="p-1.5 rounded-full hover:bg-white/10 text-white/40 hover:text-white transition cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Mode A: Direct Manual Editing */}
              <div className="flex flex-col gap-4">
                
                <div className="grid grid-cols-1 gap-3">
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-mono text-white/50 uppercase">Sous-titre littéraire</label>
                    <input
                      type="text"
                      className="bg-black/40 border border-white/10 focus:border-indigo-500 text-white p-2.5 rounded-xl text-xs font-serif font-semibold focus:outline-none"
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-mono text-white/50 uppercase">Texte du récit</label>
                    <textarea
                      rows={6}
                      className="bg-black/30 border border-white/10 focus:border-indigo-500 text-white p-3 rounded-xl text-xs sm:text-sm leading-relaxed focus:outline-none resize-none"
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 border-b border-white/10 pb-4">
                  <button
                    onClick={() => setEditingSectionId(null)}
                    className="px-3.5 py-2 text-white/60 hover:text-white font-medium text-xs rounded-xl cursor-pointer"
                  >
                    Annuler
                  </button>
                  <button
                    onClick={() => handleSaveManualEdit(currentStory.id, editingSectionId)}
                    className="flex items-center gap-1 bg-indigo-600 hover:bg-indigo-505 hover:bg-indigo-500 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition cursor-pointer shadow-lg shadow-indigo-600/20"
                  >
                    <Check className="w-4 h-4" />
                    <span>Enregistrer ces modifications</span>
                  </button>
                </div>

                {/* Mode B: Rewrite using AI input instruction */}
                <div className="bg-[#121212] p-4 rounded-2xl border border-white/5 mt-1">
                  <div className="flex items-center gap-1.5 mb-2">
                    <Sparkles className="w-4 h-4 text-indigo-400" />
                    <span className="text-xs font-serif font-bold text-white">
                      Raffiner ou Réécrire cette phase par l'IA
                    </span>
                  </div>
                  <p className="text-[10px] text-white/50 leading-normal mb-3">
                    Donnez une directive de modification à l'intelligence artificielle (ex : "Rends le texte plus mystérieux et ajoute l'apparition d'un vieux grimoire poussiéreux"). L'IA adaptera l'écriture et le prompt d'image !
                  </p>

                  <div className="flex gap-2">
                    <input
                      type="text"
                      className="flex-1 bg-black/40 border border-white/10 focus:border-indigo-500 text-white px-3 py-2.5 rounded-xl text-xs placeholder:text-white/20 focus:outline-none focus:ring-0"
                      placeholder="Ex: Rends cela plus épique et chaleureux..."
                      value={refinementInstruction}
                      onChange={(e) => setRefinementInstruction(e.target.value)}
                      disabled={isRefining}
                    />
                    <button
                      onClick={() => handleRefineSection(currentStory.id, editingSectionId)}
                      disabled={isRefining || !refinementInstruction.trim()}
                      className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition cursor-pointer disabled:opacity-40 shrink-0 flex items-center gap-1.5"
                    >
                      {isRefining ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          <span>Ajustement...</span>
                        </>
                      ) : (
                        <>
                          <Wand2 className="w-3.5 h-3.5" />
                          <span>Réécrire</span>
                        </>
                      )}
                    </button>
                  </div>

                  {refineError && (
                    <p className="text-[10px] text-red-400 font-mono mt-2 bg-red-950/40 border border-red-900/50 p-2 rounded-lg">
                      {refineError}
                    </p>
                  )}
                </div>

              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 5. Footer Layout */}
      <footer className="mt-auto border-t border-white/10 bg-[#090909] py-10 px-4">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6 text-center text-xs text-white/40">
          <div className="flex items-center justify-center gap-2">
            <span className="font-serif font-bold tracking-widest uppercase text-white/80">My story AI</span>
            <span>—</span>
            <span>Récits et légendes illustrés créés par IA</span>
          </div>
          <div className="flex items-center justify-center gap-1.5 text-[11px]">
            <span>Propulsé par</span>
            <span className="text-indigo-400 font-bold bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">Gemini 2.5 Flash</span>
            <span>&</span>
            <span className="text-white/80 font-mono">Modality Playback</span>
          </div>
          <p className="text-[10px] text-white/20">
            © 2026 My Story AI. Fait avec passion pour des lectures hors du temps.
          </p>
        </div>
      </footer>

    </div>
  );
}
