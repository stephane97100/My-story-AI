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
  Printer,
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
  Heart,
  Share2,
  Copy,
  ExternalLink,
  Sun,
  Moon
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
  PresetPrompt,
  IMAGE_STYLES
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
  const [narrationProgress, setNarrationProgress] = useState(0);

  // Inline editing & refine AI states
  const [editingSectionId, setEditingSectionId] = useState<SectionType | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editText, setEditText] = useState("");
  const [isRefining, setIsRefining] = useState(false);
  const [refinementInstruction, setRefinementInstruction] = useState("");
  const [refineError, setRefineError] = useState<string | null>(null);

  // New features states: Image Style & Series generation
  const [selectedImageStyle, setSelectedImageStyle] = useState<string>("aquarelle");
  const [isGeneratingAllImages, setIsGeneratingAllImages] = useState(false);

  // New features states: Sharing & Guest flow
  const [isSharing, setIsSharing] = useState(false);
  const [shareId, setShareId] = useState<string | null>(null);
  const [linkCopied, setLinkCopied] = useState(false);
  const [sharedStory, setSharedStory] = useState<Story | null>(null);
  const [isFetchingShared, setIsFetchingShared] = useState(false);
  const [sharedFetchError, setSharedFetchError] = useState<string | null>(null);

  // Theme support (mode nuit par défaut, mode jour alternatif)
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem("mystoryai_theme");
      return saved ? saved === "dark" : true;
    } catch (_) {
      return true;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem("mystoryai_theme", isDarkMode ? "dark" : "light");
    } catch (_) {}
    if (isDarkMode) {
      document.body.classList.remove("light");
      document.body.classList.add("dark");
    } else {
      document.body.classList.remove("dark");
      document.body.classList.add("light");
    }
  }, [isDarkMode]);

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

  // Fetch shared story if sharedId in URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sharedId = params.get("sharedId");
    if (sharedId) {
      const fetchShared = async () => {
        setIsFetchingShared(true);
        setSharedFetchError(null);
        try {
          const res = await fetch(`/api/share/${sharedId}`);
          if (!res.ok) {
            throw new Error("L'histoire partagée n'existe pas ou le lien est inactif.");
          }
          const data = await res.json();
          if (data.story) {
            setSharedStory(data.story);
          }
        } catch (err: any) {
          console.error("Error fetching shared story:", err);
          setSharedFetchError(err.message || "Erreur de chargement de l'histoire partagée.");
        } finally {
          setIsFetchingShared(false);
        }
      };
      fetchShared();
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
      const selectedStyleObject = IMAGE_STYLES.find(s => s.id === selectedImageStyle);
      const response = await fetch("/api/generate-story", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: prompt,
          genre: selectedGenre,
          tone: selectedTone,
          audience: selectedAudience,
          styleLabel: selectedStyleObject?.label,
          styleAddon: selectedStyleObject?.promptAddon
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

    } catch (err: any) {
      console.error(err);
      setErrorLine(err.message || "Erreur de connexion avec le serveur d'écriture.");
    } finally {
      setIsGenerating(false);
    }
  };

  // 2. Core Service: Image Generation
  const triggerImageGeneration = async (storyId: string, sectionId: SectionType, visualPrompt: string, styleAddonOverride?: string) => {
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
      const activeStyleObj = IMAGE_STYLES.find(s => s.id === selectedImageStyle);
      const styleAddonToSend = styleAddonOverride !== undefined ? styleAddonOverride : (activeStyleObj ? activeStyleObj.promptAddon : "");

      const response = await fetch("/api/generate-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          prompt: visualPrompt,
          styleAddon: styleAddonToSend
        }),
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

  // Generate all 4 moment images sequentially under the selected style
  const triggerAllImagesGeneration = async (storyId: string) => {
    const story = savedStories.find((s) => s.id === storyId);
    if (!story) return;

    setIsGeneratingAllImages(true);
    try {
      const activeStyleObj = IMAGE_STYLES.find(s => s.id === selectedImageStyle);
      const styleAddon = activeStyleObj ? activeStyleObj.promptAddon : "";
      
      const sectionsToGen: SectionType[] = ["introduction", "developpement", "climax", "conclusion"];
      for (const sectionId of sectionsToGen) {
        const visualPrompt = story.sections[sectionId].imagePrompt;
        // Generate with the chosen style, waiting for each to complete
        await triggerImageGeneration(storyId, sectionId, visualPrompt, styleAddon);
      }
    } catch (e) {
      console.error("Failed generating series of styled illustrations", e);
    } finally {
      setIsGeneratingAllImages(false);
    }
  };

  // Share story on server and prepare unique share URL
  const handleShareStory = async (story: Story) => {
    setIsSharing(true);
    setLinkCopied(false);
    setShareId(null);
    try {
      const response = await fetch("/api/share", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ story }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Une erreur est survenue lors du partage.");
      }
      if (data.shareId) {
        setShareId(data.shareId);
      }
    } catch (err) {
      console.error("Failed to share story", err);
      alert("Erreur réseau: impossible d'héberger l'histoire pour le partage.");
    } finally {
      setIsSharing(false);
    }
  };

  // Copy share link helper
  const handleCopyShareLink = () => {
    if (!shareId) return;
    const shareUrl = `${window.location.origin}${window.location.pathname}?sharedId=${shareId}`;
    navigator.clipboard.writeText(shareUrl)
      .then(() => {
        setLinkCopied(true);
        setTimeout(() => setLinkCopied(false), 3000);
      })
      .catch((err) => {
        console.error("Failed to copy", err);
      });
  };

  // Import a shared story into the user's personal shelf
  const handleImportSharedStory = () => {
    if (!sharedStory) return;
    
    // Check if copy already exists to avoid duplication
    if (savedStories.some((s) => s.id === sharedStory.id)) {
      alert("Ce récit est déjà conservé dans votre bibliothèque !");
      setSharedStory(null);
      // Strip search query
      window.history.replaceState({}, document.title, window.location.pathname);
      return;
    }

    const updated = [sharedStory, ...savedStories];
    saveStoriesToStorage(updated);
    setSelectedStoryId(sharedStory.id);
    
    // Clear shared Story reading mode, welcoming them to their newly imported story!
    setSharedStory(null);
    window.history.replaceState({}, document.title, window.location.pathname);
    alert(`Félicitations ! « ${sharedStory.title} » a été ajouté à votre bibliothèque de contes.`);
  };

  // Exporter l'histoire au format PDF via impression optimisée
  const exportStoryToPDF = (story: Story) => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      alert("Veuillez autoriser les fenêtres contextuelles pour exporter l'histoire.");
      return;
    }
    
    const sectionsHtml = (["introduction", "developpement", "climax", "conclusion"] as SectionType[]).map((key, index) => {
      const sec = story.sections[key];
      const sectionNum = index + 1;
      const sectionLabel = key === "introduction" ? "Introduction" :
                         key === "developpement" ? "Développement" :
                         key === "climax" ? "Climax" : "Épilogue";
                         
      return `
        <div class="chapter-block">
          <div class="chapter-number">Chapitre ${sectionNum}</div>
          <div class="chapter-tag">${sectionLabel}</div>
          <h2 class="chapter-title">${sec.title}</h2>
          
          <p class="chapter-text">${sec.text.replace(/\n/g, "<br/>")}</p>
          
          <div class="prompt-box">
            <div class="prompt-title">Prompt d'illustration d'écriture (Sujet visuel suggéré) :</div>
            <div class="prompt-body">“ ${sec.imagePrompt} ”</div>
          </div>
        </div>
      `;
    }).join('<div class="page-break"></div>');

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>${story.title} — Export PDF</title>
        <meta charset="utf-8">
        <link rel="preconnect" href="https://fonts.googleapis.com">
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
        <link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@500;700;950&family=EB+Garamond:ital,wght@0,400;0,500;0,600;1,400&family=JetBrains+Mono:ital,wght@0,300;1,300&display=swap" rel="stylesheet">
        <style>
          @page {
            size: A4;
            margin: 20mm 20mm 20mm 20mm;
          }
          body {
            font-family: 'EB Garamond', serif;
            color: #1a1512;
            background-color: #ffffff;
            line-height: 1.8;
            font-size: 11pt;
            margin: 0;
            padding: 30px;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .book-container {
            max-width: 650px;
            margin: 0 auto;
          }
          .header-meta {
            text-align: center;
            text-transform: uppercase;
            font-family: 'Cinzel', serif;
            font-size: 8pt;
            letter-spacing: 2px;
            color: #878580;
            border-bottom: 1px double #e5e5e0;
            padding-bottom: 10px;
            margin-bottom: 50px;
          }
          .book-title-section {
            text-align: center;
            margin-top: 120px;
            margin-bottom: 200px;
            page-break-after: always;
          }
          .decorative-symbol {
            font-size: 24pt;
            color: #7c2d12;
            margin-bottom: 20px;
            line-height: 1;
          }
          .book-title {
            font-family: 'Cinzel', serif;
            font-size: 32pt;
            font-weight: 950;
            color: #1c1917;
            line-height: 1.25;
            margin: 20px 0 15px 0;
          }
          .book-subtitle {
            font-family: 'EB Garamond', serif;
            font-size: 14pt;
            font-style: italic;
            color: #57534e;
            margin-bottom: 60px;
          }
          .book-details {
            font-family: 'JetBrains Mono', monospace;
            font-size: 8.5pt;
            color: #878681;
            margin-top: 100px;
            line-height: 1.6;
            border-top: 1px dashed #e7e5e4;
            padding-top: 20px;
            display: inline-block;
          }
          .chapter-block {
            page-break-inside: avoid;
            margin-bottom: 60px;
            padding-top: 20px;
          }
          .chapter-number {
            font-family: 'Cinzel', serif;
            font-size: 10pt;
            letter-spacing: 3px;
            text-transform: uppercase;
            color: #7c2d12;
            text-align: center;
            margin-bottom: 4px;
            font-weight: bold;
          }
          .chapter-tag {
            font-family: 'JetBrains Mono', monospace;
            font-size: 7.5pt;
            text-transform: uppercase;
            color: #a8a29e;
            text-align: center;
            letter-spacing: 1px;
            margin-bottom: 20px;
          }
          .chapter-title {
            font-family: 'Cinzel', serif;
            font-size: 20pt;
            font-weight: 700;
            text-align: center;
            color: #1a1512;
            margin-top: 0;
            margin-bottom: 35px;
          }
          .chapter-text {
            font-size: 12.5pt;
            text-align: justify;
            text-justify: inter-word;
            text-indent: 2em;
            margin-bottom: 40px;
            color: #1a1512;
            white-space: pre-wrap;
          }
          .prompt-box {
            background-color: #fafaf9;
            border-left: 3px solid #7c2d12;
            padding: 16px 20px;
            margin-top: 30px;
            page-break-inside: avoid;
            border-radius: 0 8px 8px 0;
          }
          .prompt-title {
            font-family: 'JetBrains Mono', monospace;
            font-size: 8pt;
            text-transform: uppercase;
            letter-spacing: 1px;
            color: #7c2d12;
            font-weight: bold;
            margin-bottom: 6px;
          }
          .prompt-body {
            font-size: 10pt;
            font-style: italic;
            color: #44403c;
            line-height: 1.5;
          }
          .page-break {
            page-break-before: always;
            height: 1px;
          }
          .print-btn {
            position: fixed;
            top: 20px;
            right: 20px;
            background-color: #4f46e5;
            color: white;
            border: none;
            padding: 12px 20px;
            font-family: system-ui, -apple-system, sans-serif;
            font-size: 13px;
            font-weight: bold;
            border-radius: 10px;
            cursor: pointer;
            box-shadow: 0 4px 14px rgba(79, 70, 229, 0.4);
            transition: background-color 0.2s, transform 0.1s;
            display: flex;
            align-items: center;
            gap: 8px;
            z-index: 9999;
          }
          .print-btn:hover {
            background-color: #4338ca;
          }
          .print-btn:active {
            transform: scale(0.97);
          }
          @media print {
            .print-btn {
              display: none !important;
            }
            body {
              padding: 0;
            }
          }
        </style>
      </head>
      <body>
        <button class="print-btn" onclick="window.print()">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9V2h12v7"></path><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>
          Imprimer / Enregistrer en PDF
        </button>
        
        <div class="book-container">
          <div class="header-meta">Manuscrit Littéraire — My Story AI</div>
          
          <div class="book-title-section">
            <div class="decorative-symbol">✦ ⚖ ✦</div>
            <h1 class="book-title">${story.title}</h1>
            <div class="book-subtitle">Un récit raffiné écrit en collaboration avec l'intelligence artificielle</div>
            
            <div class="book-details">
              <div><strong>Genre :</strong> ${story.genre}</div>
              <div><strong>Ton dramatique :</strong> ${story.tone}</div>
              <div><strong>Auditoire cible :</strong> Public ${story.audience}</div>
              <div><strong>Date du manuscrit :</strong> ${story.createdAt}</div>
              <div><strong>Éditeur :</strong> My Story AI</div>
            </div>
          </div>
          
          ${sectionsHtml}
        </div>
        
        <script>
          window.addEventListener('DOMContentLoaded', () => {
            setTimeout(() => {
              window.print();
            }, 800);
          });
        </script>
      </body>
      </html>
    `);
    printWindow.document.close();
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
        setNarrationProgress(0);
        if (sectionId) setActiveSpeakingSectionId(sectionId);
      };

      utterance.onend = () => {
        setIsSpeaking(false);
        setNarrationProgress(100);
        setActiveSpeakingSectionId(null);
      };

      utterance.onboundary = (event) => {
        if (event.name === "word") {
          const progress = textToSpeak.length > 0 ? (event.charIndex / textToSpeak.length) * 100 : 0;
          setNarrationProgress(Math.min(progress, 100));
        }
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
          setNarrationProgress(0);
          if (sectionId) setActiveSpeakingSectionId(sectionId);
        };

        audioObj.ontimeupdate = () => {
          if (audioObj.duration) {
            const progress = (audioObj.currentTime / audioObj.duration) * 100;
            setNarrationProgress(Math.min(progress, 100));
          }
        };

        audioObj.onended = () => {
          setIsSpeaking(false);
          setNarrationProgress(100);
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
    setNarrationProgress(0);
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

            {/* Theme Switcher */}
            <button
              onClick={() => setIsDarkMode((prev) => !prev)}
              className="flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 text-white text-xs font-semibold px-3.5 py-2.5 rounded-xl transition duration-200 cursor-pointer w-full sm:w-auto"
              title={isDarkMode ? "Passer en mode jour (Littéraire)" : "Passer en mode nuit"}
            >
              {isDarkMode ? (
                <>
                  <Sun className="w-4 h-4 text-amber-400" />
                  <span>Mode Jour</span>
                </>
              ) : (
                <>
                  <Moon className="w-4 h-4 text-indigo-400" />
                  <span>Mode Nuit</span>
                </>
              )}
            </button>

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

      {/* 2. Loading / Shared Read modes */}
      {isFetchingShared ? (
        <div className="flex-1 max-w-3xl w-full mx-auto px-4 py-20 flex flex-col items-center justify-center text-center gap-4">
          <RefreshCw className="w-10 h-10 text-indigo-400 animate-spin mb-2" />
          <h2 className="font-serif font-light text-2xl text-white">Création du portail magique...</h2>
          <p className="font-mono text-xs text-indigo-300 animate-pulse">Récupération du manuscrit hébergé sur les nuées d'écritures</p>
          <p className="text-xs text-white/50 max-w-md mt-2">Veuillez patienter quelques instants pendant que nous rassemblons les peintures vocales et visuelles de ce conte.</p>
        </div>
      ) : sharedFetchError ? (
        <div className="flex-1 max-w-md w-full mx-auto px-4 py-20 flex flex-col items-center justify-center text-center gap-4">
          <div className="bg-red-600/10 border border-red-500/20 text-red-400 p-4 rounded-full">
            <Info className="w-8 h-8" />
          </div>
          <h2 className="font-serif font-bold text-xl text-white">Récit introuvable</h2>
          <p className="text-xs text-white/60">Le lien de partage que vous tentez de visiter est erroné, expiré ou n'existe pas dans notre bibliothèque globale.</p>
          <button
            onClick={() => {
              setSharedFetchError(null);
              window.history.replaceState({}, document.title, window.location.pathname);
            }}
            className="mt-2 bg-indigo-600 hover:bg-indigo-505 hover:bg-indigo-500 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition cursor-pointer"
          >
            Aller au studio de création
          </button>
        </div>
      ) : sharedStory ? (
        // Immersive Guest/Reader viewport for the shared story!
        <div className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 py-10 flex flex-col gap-8">
          
          {/* Header Actions Card */}
          <div className="glass p-5 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-4 border border-white/10 shadow-lg">
            <div className="text-left">
              <span className="text-[10px] font-mono text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/15 uppercase font-bold">Livre Partagé</span>
              <h3 className="font-serif font-black text-white text-base mt-1">Vous lisez un conte offert par notre communauté</h3>
            </div>
            
            <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
              <button
                onClick={handleImportSharedStory}
                className="flex-1 md:flex-none flex items-center justify-center gap-1.5 bg-indigo-600 hover:bg-indigo-505 hover:bg-indigo-500 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition cursor-pointer shadow-md"
              >
                <Sparkles className="w-4 h-4 text-amber-300" />
                <span>✦ Conserver dans ma bibliothèque</span>
              </button>
              
              <button
                onClick={() => {
                  stopAudio();
                  setSharedStory(null);
                  setSelectedStoryId(null);
                  window.history.replaceState({}, document.title, window.location.pathname);
                }}
                className="flex-1 md:flex-none flex items-center justify-center gap-1.5 bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 text-xs py-2.5 rounded-xl transition cursor-pointer"
              >
                <span>Créer mon histoire</span>
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Book Title block */}
          <div className="text-center py-6 border-b border-white/10">
            <span className="font-mono text-[9px] uppercase tracking-widest text-[#6366f1] bg-indigo-500/10 border border-indigo-500/20 px-2.5 py-1 rounded-full font-bold">
              ✦ {sharedStory.genre} • {sharedStory.tone} • Public {sharedStory.audience} ✦
            </span>
            <h2 className="font-serif font-light text-3xl sm:text-4xl text-white mt-3 mb-2 tracking-wide block italic">
              {sharedStory.title}
            </h2>
            <p className="text-white/40 font-serif italic text-xs">
              Rédigé sur My Story AI
            </p>
            
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              <button
                onClick={() => {
                  const fullText = `${sharedStory.title}. Introduction. ${sharedStory.sections.introduction.text}. Étape suivante, développement. ${sharedStory.sections.developpement.text}. Troisième phase, le climax. ${sharedStory.sections.climax.text}. Conclusion. ${sharedStory.sections.conclusion.text}`;
                  startNarration(fullText);
                }}
                disabled={isSpeaking || isTtsLoading}
                className="inline-flex items-center gap-1.5 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/35 text-indigo-400 font-bold text-xs px-4 py-2 rounded-xl transition cursor-pointer font-sans"
              >
                <Volume2 className="w-4 h-4" />
                <span>Jouer l'audio-livre complet</span>
              </button>

              <button
                onClick={() => exportStoryToPDF(sharedStory)}
                className="inline-flex items-center gap-1.5 bg-white/5 hover:bg-white/10 border border-white/10 text-white hover:text-indigo-300 font-bold text-xs px-4 py-2 rounded-xl transition cursor-pointer font-sans"
              >
                <Printer className="w-4 h-4 text-indigo-400" />
                <span>Exporter en PDF / Imprimer</span>
              </button>
            </div>
          </div>

          {/* Render structured grid in guest mode */}
          <div className="flex flex-col gap-8 mt-2 max-w-3xl mx-auto w-full">
            
            {/* Barre de progression de la narration */}
            {isSpeaking && (
              <div className="glass p-4 rounded-xl border border-indigo-500/20 bg-indigo-500/5 shadow-md flex flex-col gap-2">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
                    </span>
                    <span className="font-mono text-white/80 font-bold uppercase tracking-wider text-[10px]">
                      Narration active : {
                        activeSpeakingSectionId === "introduction" ? "Partie 1 — Introduction" :
                        activeSpeakingSectionId === "developpement" ? "Partie 2 — Intrigue" :
                        activeSpeakingSectionId === "climax" ? "Partie 3 — Climax" :
                        activeSpeakingSectionId === "conclusion" ? "Partie 4 — Épilogue" :
                        "Récit complet"
                      }
                    </span>
                  </div>
                  <span className="font-mono text-indigo-400 font-bold text-[11px]">{Math.round(narrationProgress)}%</span>
                </div>

                <div className="w-full bg-white/5 h-2 rounded-full overflow-hidden border border-white/5 relative">
                  <div 
                    className="bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-600 h-full rounded-full transition-all duration-300"
                    style={{ width: `${narrationProgress}%` }}
                  />
                </div>
              </div>
            )}

            {(["introduction", "developpement", "climax", "conclusion"] as SectionType[]).map((secKey) => {
              const secObj = sharedStory.sections[secKey];
              const isSecSpeaking = activeSpeakingSectionId === secKey && isSpeaking;

              return (
                <div
                  key={secKey}
                  className={`border-l-2 pl-4 md:pl-6 w-full flex flex-col gap-3 ${
                    isSecSpeaking ? "border-indigo-500 md:bg-indigo-500/5 md:px-5 md:py-4 md:rounded-2xl" : "border-white/10"
                  } transition-all duration-300`}
                >
                  <div className="flex flex-col gap-3">
                    <div className="flex items-center justify-between border-b border-white/10 pb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono bg-white/5 text-indigo-300 border border-white/10 px-1.5 py-0.5 rounded uppercase font-bold">
                          {secKey === "introduction" ? "1. Introduction" :
                           secKey === "developpement" ? "2. Intrigue" :
                           secKey === "climax" ? "3. Climax" : "4. Épilogue"}
                        </span>
                        <h3 className="font-serif font-black text-white text-base">
                          {secObj.title}
                        </h3>
                      </div>
                      
                      <button
                        onClick={() => startNarration(secObj.text, secKey)}
                        className={`p-1.5 rounded-lg border transition cursor-pointer ${
                          isSecSpeaking ? "bg-indigo-650 text-white border-indigo-500 scale-105" : "bg-[#161616] border-white/10 text-white/60 hover:text-indigo-400"
                        }`}
                        title="Écouter"
                      >
                        <Volume2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <p className="font-serif text-sm sm:text-base text-white/80 leading-relaxed tracking-wide italic font-light">
                      {secObj.text}
                    </p>

                    {/* Prompt de l'illustration */}
                    <div className="mt-2 bg-white/3 p-2.5 rounded-xl border border-white/5 flex flex-col gap-1">
                      <span className="text-[9px] font-mono text-indigo-400 uppercase font-bold">
                        Aperçu visuel (Prompt d'illustration) :
                      </span>
                      <span className="text-[10px] text-white/60 italic leading-snug">
                        {secObj.imagePrompt}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

        </div>
      ) : (
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

                {/* ✦ EXPORTATION PAPIER & PDF ✦ */}
                <div className="bg-white/5 p-4 rounded-xl border border-white/10 flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <h4 className="font-serif font-bold text-white text-xs flex items-center gap-1.5">
                      <FileText className="w-4 h-4 text-indigo-400" />
                      <span>Manuscrit & Export PDF</span>
                    </h4>
                    <span className="text-[8px] font-mono text-indigo-400 bg-indigo-500/10 px-1.5 py-0.5 rounded border border-indigo-500/20 uppercase font-bold">Livre</span>
                  </div>
                  <p className="text-[10px] text-white/40 leading-relaxed">
                    Téléchargez un livre élégamment mis en page (Format A4 classique), complet avec les chapitres d'or et les prompts suggestifs d'illustration.
                  </p>

                  <button
                    onClick={() => exportStoryToPDF(currentStory)}
                    className="w-full flex items-center justify-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold py-2.5 rounded-xl transition cursor-pointer shadow-lg shadow-indigo-650/30"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>Exporter le conte en PDF</span>
                  </button>
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

                {/* Style de Peinture d'Illustration Option Selector */}
                <div className="flex flex-col gap-2">
                  <label className="text-[11px] font-mono uppercase tracking-wider text-white/50 font-bold flex items-center justify-between">
                    <span>Style de Peinture d'Illustration</span>
                    <span className="text-[9px] text-indigo-400 font-mono">Dédié</span>
                  </label>
                  <p className="text-[10px] text-white/40 leading-normal">
                    Sélectionnez la signature artistique de l'illustrateur IA :
                  </p>
                  <div className="grid grid-cols-2 gap-1.5 max-h-[160px] overflow-y-auto pr-1">
                    {IMAGE_STYLES.map((style) => (
                      <button
                        key={style.id}
                        type="button"
                        onClick={() => setSelectedImageStyle(style.id)}
                        className={`text-left p-2 rounded-lg border text-xs cursor-pointer transition flex flex-col gap-0.5 ${
                          selectedImageStyle === style.id
                            ? "bg-indigo-600/20 border-indigo-500 text-white shadow-md"
                            : "bg-white/5 hover:bg-white/10 border-white/15 text-white/70"
                        }`}
                      >
                        <span className="font-bold text-[10px] block truncate">{style.label}</span>
                        <span className="text-[8px] text-white/40 line-clamp-1">{style.description}</span>
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
                  <p className="text-white/40 font-serif italic text-xs mb-3">
                    Rédigé en collaboration littéraire avec My Story AI
                  </p>
                  <div className="flex justify-center">
                    <button
                      onClick={() => handleShareStory(currentStory)}
                      className="flex items-center gap-1.5 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/25 hover:border-indigo-500/50 text-indigo-400 font-bold text-xs px-4 py-2 rounded-xl transition cursor-pointer shadow-sm"
                    >
                      <Share2 className="w-3.5 h-3.5" />
                      <span>Partager ce conte</span>
                    </button>
                  </div>
                </div>

                {/* Structured Sections layout (Introduction, Developpement, Climax, Conclusion) */}
                <div className="flex flex-col gap-10 mt-4 max-w-3xl mx-auto w-full">

                  {/* Barre de progression de la narration */}
                  {isSpeaking && (
                    <div className="glass p-4 rounded-xl border border-indigo-500/20 bg-indigo-500/5 shadow-md flex flex-col gap-2">
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
                          </span>
                          <span className="font-mono text-white/80 font-bold uppercase tracking-wider text-[10px]">
                            Narration active : {
                              activeSpeakingSectionId === "introduction" ? "Partie 1 — Introduction" :
                              activeSpeakingSectionId === "developpement" ? "Partie 2 — Intrigue" :
                              activeSpeakingSectionId === "climax" ? "Partie 3 — Climax" :
                              activeSpeakingSectionId === "conclusion" ? "Partie 4 — Épilogue" :
                              "Récit complet"
                            }
                          </span>
                        </div>
                        <span className="font-mono text-indigo-400 font-bold text-[11px]">{Math.round(narrationProgress)}%</span>
                      </div>

                      <div className="w-full bg-white/5 h-2 rounded-full overflow-hidden border border-white/5 relative">
                        <div 
                          className="bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-600 h-full rounded-full transition-all duration-300"
                          style={{ width: `${narrationProgress}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {(["introduction", "developpement", "climax", "conclusion"] as SectionType[]).map((secKey) => {
                    const sectionObj = currentStory.sections[secKey];
                    const isSecSpeaking = activeSpeakingSectionId === secKey && isSpeaking;

                    return (
                      <div
                        key={secKey}
                        className={`border-l-2 pl-4 md:pl-6 relative ${
                          isSecSpeaking ? "border-indigo-500 bg-indigo-500/5 px-4 md:px-5 py-3 rounded-2xl" : "border-white/10"
                        } transition-all duration-300 flex flex-col gap-3 w-full`}
                      >
                        
                        {/* Narrative Content */}
                        <div className="flex flex-col gap-3 w-full">
                          
                          {/* Heading structure */}
                          <div className="flex items-center justify-between gap-3 border-b border-white/10 pb-2">
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] font-mono bg-white/5 text-indigo-300 border border-white/10 px-1.5 py-0.5 rounded uppercase font-bold text-center">
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
                          <p className="font-serif text-sm sm:text-base text-white/80 leading-relaxed tracking-wide italic font-light whitespace-pre-line">
                            {sectionObj.text}
                          </p>

                          {/* Metadata Image Prompt Display (Educational/AI power transparent) */}
                          <div className="mt-2 bg-white/3 p-2.5 rounded-xl border border-white/5 flex flex-col gap-1">
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
      )}

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

      {/* 4.5. THE SHARING SHIELD MODAL */}
      <AnimatePresence>
        {(shareId !== null || isSharing) && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="glass max-w-md w-full p-6 relative overflow-hidden rounded-3xl border border-white/10 shadow-2xl"
            >
              
              {/* Header */}
              <div className="flex items-center justify-between border-b border-white/10 pb-3 mb-4">
                <div className="flex items-center gap-2">
                  <Share2 className="w-5 h-5 text-indigo-400 animate-pulse" />
                  <h3 className="font-serif font-black text-white text-lg">
                    Partager votre histoire
                  </h3>
                </div>
                <button
                  onClick={() => {
                    setShareId(null);
                    setIsSharing(false);
                  }}
                  className="p-1.5 rounded-full hover:bg-white/10 text-white/40 hover:text-white transition cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {isSharing ? (
                <div className="flex flex-col items-center justify-center py-8 text-center gap-3">
                  <RefreshCw className="w-8 h-8 text-indigo-400 animate-spin" />
                  <p className="text-sm font-semibold text-white/90">Hébergement de votre conte sur les nuées...</p>
                  <p className="text-xs text-white/40 max-w-xs text-center">Génération d'un lien d'accès universel sécurisé pour vos lecteurs.</p>
                </div>
              ) : (
                <div className="flex flex-col gap-4">
                  <p className="text-xs text-white/60 leading-relaxed">
                    Votre conte est maintenant disponible publiquement ! Toute personne disposant du lien ci-dessous pourra écouter, admirer et importer votre création dans sa propre bibliothèque.
                  </p>

                  <div className="flex flex-col gap-1">
                    <label className="text-[9px] font-mono text-white/40 uppercase">Lien de lecture direct</label>
                    <div className="flex gap-1.5">
                      <input
                        type="text"
                        readOnly
                        value={`${window.location.origin}${window.location.pathname}?sharedId=${shareId}`}
                        className="flex-1 bg-black/50 border border-white/10 text-white px-3 py-2 rounded-xl text-xs font-mono focus:outline-none"
                      />
                      <button
                        onClick={handleCopyShareLink}
                        className={`flex items-center justify-center gap-1.5 px-4 rounded-xl text-xs font-bold transition cursor-pointer shrink-0 ${
                          linkCopied
                            ? "bg-green-655 bg-green-600/35 text-green-300 border border-green-500/40"
                            : "bg-indigo-600 hover:bg-indigo-505 hover:bg-indigo-500 text-white"
                        }`}
                      >
                        {linkCopied ? (
                          <>
                            <Check className="w-3.5 h-3.5" />
                            <span>Copié !</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            <span>Copier</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Social sharing links helper */}
                  <div className="border-t border-white/10 pt-4 flex flex-col gap-2.5">
                    <span className="text-[9px] font-mono text-white/40 uppercase">Diffuser sur vos réseaux</span>
                    <div className="grid grid-cols-2 gap-2">
                      <a
                        href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(
                          `Admirez ce conte magnifique sur My Story AI ! ✨ « ${currentStory?.title} »\n${window.location.origin}${window.location.pathname}?sharedId=${shareId}`
                        )}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-center gap-1.5 bg-sky-500/10 hover:bg-sky-500/20 border border-sky-500/20 text-sky-400 hover:text-sky-300 text-xs py-2 rounded-xl transition font-semibold"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>Twitter / X</span>
                      </a>
                      <a
                        href={`mailto:?subject=${encodeURIComponent(
                          `Lecture magique : ${currentStory?.title}`
                        )}&body=${encodeURIComponent(
                          `Bonjour !\n\nJ'ai écrit un conte incroyable intitulé « ${currentStory?.title} » sur le salon My Story AI. Tu peux l'admirer et l'écouter ici :\n\n${window.location.origin}${window.location.pathname}?sharedId=${shareId}`
                        )}`}
                        className="flex items-center justify-center gap-1.5 bg-white/5 hover:bg-white/10 border border-white/10 text-white/75 text-xs py-2 rounded-xl transition font-semibold"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>Par E-mail</span>
                      </a>
                    </div>
                  </div>
                  
                  <div className="flex justify-end mt-2">
                    <button
                      onClick={() => {
                        setShareId(null);
                        setIsSharing(false);
                      }}
                      className="bg-zinc-850 hover:bg-zinc-800 text-white border border-white/15 px-4 py-2 rounded-xl text-xs font-semibold cursor-pointer"
                    >
                      Fermer
                    </button>
                  </div>
                </div>
              )}

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
