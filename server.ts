import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

// Initialize Gemini SDK with User-Agent telemetry as mandated.
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

// Helper to call generateContent with automatic retry and model fallback in case of high demand (503)
async function generateContentWithFallback(params: {
  contents: any;
  config?: any;
}) {
  const models = ["gemini-3.5-flash", "gemini-flash-latest", "gemini-3.1-flash-lite"];
  let lastError: any = null;

  for (const model of models) {
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        console.log(`[Gemini] Attempting generation with model: ${model} (attempt ${attempt}/2)`);
        const response = await ai.models.generateContent({
          model: model,
          contents: params.contents,
          config: params.config,
        });

        if (response && response.text) {
          console.log(`[Gemini] Success using model: ${model}`);
          return response;
        }
        throw new Error("Aucune réponse textuelle reçue.");
      } catch (err: any) {
        lastError = err;
        console.warn(`[Gemini] Model ${model} attempt ${attempt} failed: ${err.message || err.status || err}`);

        // If it's a structural/client issue (like 400 Bad Request / INVALID_ARGUMENT), do not retry or switch models as it is a bug or restriction.
        if (
          err.status === 400 || 
          err.code === 400 || 
          (err.message && (err.message.includes("400") || err.message.includes("INVALID_ARGUMENT") || err.message.includes("SchemaType")))
        ) {
          throw err;
        }

        if (attempt < 2) {
          await new Promise((resolve) => setTimeout(resolve, attempt * 600));
        }
      }
    }
  }

  throw lastError;
}

app.use(express.json({ limit: "15mb" }));

// 1. API: Story Generation
app.post("/api/generate-story", async (req, res) => {
  try {
    const { prompt, genre, tone, audience, styleLabel, styleAddon } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: "Le prompt ou thème de l'histoire est requis." });
    }

    const systemInstruction = `Tu es un romancier professionnel, poète et conteur d'élite de langue française.
Construis une superbe histoire complète, extrêmement immersive, richement détaillée, touchante et bien rythmée en français, structurée précisément en 4 étapes : Introduction, Développement, Climax et Conclusion.
IMPORTANT : L'histoire totale doit impérativement faire plus de 3000 mots (environ 750 à 800 mots par section). Prends le temps de développer les dialogues, l'atmosphère, les descriptions psychologiques et l'environnement pour atteindre cette longueur littéraire.
Adapte l'histoire selon les choix de l'utilisateur :
- Genre : ${genre || "Merveilleux"}
- Ton / Style : ${tone || "Poétique"}
- Public Cible : ${audience || "Tout public"}

Pour chaque section, génère également un 'imagePrompt'. Ce prompt d'image doit être rédigé en ANGLAIS, extrêmement descriptif visuellement, adapté au style de la scène et adapté au genre (par exemple, "fantasy style watercolor, cinematic lighting..."). Évite les concepts abstraits dans l'imagePrompt, décris des éléments visuels concrets.
${styleLabel ? `L'utilisateur a demandé un style visuel spécifique de type : "${styleLabel}". Fais en sorte que chaque 'imagePrompt' de chaque section contienne des mots-clés stylistiques de la forme : "${styleAddon}".` : ""}`;

    const contents = `Crée une histoire originale basée sur le thème suivant : "${prompt}". Écris au moins 3000 mots de narration de haute volée répartis équitablement (environ 750-800 mots par section).`;

    const response = await generateContentWithFallback({
      contents: contents,
      config: {
        systemInstruction: systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING, description: "Le titre général captivant de l'histoire." },
            introduction: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING, description: "Sous-titre poétique de cette étape (l'introduction)." },
                text: { type: Type.STRING, description: "Le texte narratif de l'introduction extrêmement détaillé (au moins 750 mots)." },
                imagePrompt: { type: Type.STRING, description: "A detailed visual image prompt in English for illustration, containing specific artistic style (e.g. digital art, cinematic lighting, 8k)." }
              },
              required: ["title", "text", "imagePrompt"]
            },
            developpement: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING, description: "Sous-titre de la phase de développement de l'intrigue." },
                text: { type: Type.STRING, description: "Le corps du texte de développement extrêmement fouillé et dialogué (au moins 800 mots)." },
                imagePrompt: { type: Type.STRING, description: "Detailed English prompt for illustration describing the setting and ongoing narrative action." }
              },
              required: ["title", "text", "imagePrompt"]
            },
            climax: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING, description: "Sous-titre de l'épreuve reine ou l'instant d'intensité maximale (le climax)." },
                text: { type: Type.STRING, description: "Le texte palpitant, intense, dramatique et détaillé du climax (au moins 750 mots)." },
                imagePrompt: { type: Type.STRING, description: "High-intensity visual scene prompt in English representing the dramatic turning point." }
              },
              required: ["title", "text", "imagePrompt"]
            },
            conclusion: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING, description: "Sous-titre de la fin du récit." },
                text: { type: Type.STRING, description: "Le texte de la conclusion apportant une morale philosophique ou un apaisement détaillé (au moins 700 mots)." },
                imagePrompt: { type: Type.STRING, description: "Calm and concluding visual scene illustration prompt in English." }
              },
              required: ["title", "text", "imagePrompt"]
            }
          },
          required: ["title", "introduction", "developpement", "climax", "conclusion"]
        }
      }
    });

    if (!response.text) {
      throw new Error("Aucune réponse n'a été reçue du modèle.");
    }

    const storyData = JSON.parse(response.text.trim());
    return res.json(storyData);
  } catch (err: any) {
    console.error("Error generating story:", err);
    return res.status(500).json({ error: err.message || "Une erreur est survenue lors de la création de l'histoire." });
  }
});

// 2. API: Regenerate/Refine a specific Section or Story Elements
app.post("/api/regenerate-section", async (req, res) => {
  try {
    const { originalPrompt, sectionId, currentText, instruction, genre, tone, audience } = req.body;

    if (!sectionId || !instruction) {
      return res.status(400).json({ error: "L'identifiant de la section et l'instruction de modification sont requis." });
    }

    const systemInstruction = `Tu es un éditeur littéraire chevronné. Ton travail consiste à réécrire la section "${sectionId}" d'une histoire en français.
Conserve le style global mais applique STRICTEMENT l'instruction de modification de l'utilisateur.
Prends en compte le contexte général :
- Genre : ${genre || "Fantasy"}
- Ton / Ambiance : ${tone || "Merveilleux"}
- Auditoire : ${audience || "Tout public"}

Mets également à jour le 'imagePrompt' (toujours en anglais) pour refléter les nouveaux changements décrits par l'utilisateur.`;

    const message = `Section actuelle (${sectionId}) :
Texte actuel : "${currentText || ""}"

Instruction de modification de l'utilisateur : "${instruction}"
Génère une version révisée de cette section au format JSON.`;

    const response = await generateContentWithFallback({
      contents: message,
      config: {
        systemInstruction: systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING, description: "Un titre de section révisé ou conservé." },
            text: { type: Type.STRING, description: "Le texte de la section réécrit selon la demande en français." },
            imagePrompt: { type: Type.STRING, description: "A revised detailed English image prompt capturing the new details." }
          },
          required: ["title", "text", "imagePrompt"]
        }
      }
    });

    if (!response.text) {
      throw new Error("L'intelligence artificielle n'a pas pu traiter la réécriture.");
    }

    const revisedSection = JSON.parse(response.text.trim());
    return res.json(revisedSection);
  } catch (err: any) {
    console.error("Error modifying section:", err);
    return res.status(500).json({ error: err.message || "Impossible de réécrire la section pour le moment." });
  }
});

// 3. API: Generate image (via gemini-2.5-flash-image, uses fallback if credentials are restricted or it fails)
app.post("/api/generate-image", async (req, res) => {
  try {
    const { prompt, styleAddon } = req.body;
    if (!prompt) {
      return res.status(400).json({ error: "Le prompt de l'image est requis." });
    }

    const finalPrompt = styleAddon ? `${prompt}, ${styleAddon}` : prompt;
    console.log(`Generating image for prompt: ${finalPrompt}`);

    // Call gemini-2.5-flash-image.
    // If it fails (such as unpaid plan or billing restrictions), we catch it and fallback gracefully.
    try {
      const gResponse = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: {
          parts: [{ text: `${finalPrompt}, artistic illustration style. Make it vibrant, colorful, and highly immersive.` }]
        },
        config: {
          imageConfig: {
            aspectRatio: "4:3"
          }
        }
      });

      let base64String = "";
      if (gResponse.candidates && gResponse.candidates[0]?.content?.parts) {
        for (const part of gResponse.candidates[0].content.parts) {
          if (part.inlineData) {
            base64String = part.inlineData.data;
            break;
          }
        }
      }

      if (base64String) {
        return res.json({ imageUrl: `data:image/png;base64,${base64String}` });
      } else {
        throw new Error("Aucune donnée d'image reçue du modèle.");
      }
    } catch (apiErr: any) {
      console.warn("Gemini Image generation failed or is unpaid. Using high-quality contextual fallback.", apiErr.message);
      // Construct a beautiful contextual fallback using a reliable seeded picsum image
      const cleanSeed = encodeURIComponent(finalPrompt.trim().slice(0, 32).toLowerCase().replace(/[^a-z0-9]/g, '-'));
      const fallbackUrl = `https://picsum.photos/seed/${cleanSeed}/800/600`;
      return res.json({
        imageUrl: fallbackUrl,
        warning: "Mode aperçu : Illustration stylisée constructeur.",
        note: apiErr.message
      });
    }
  } catch (error: any) {
    console.error("Error in fallback image generation route:", error);
    return res.status(500).json({ error: error.message || "Erreur de génération d'image." });
  }
});

// 4. API: Text-to-Speech (supports premium Gemini, handles fallbacks gracefully)
app.post("/api/generate-tts", async (req, res) => {
  try {
    const { text, voice } = req.body;
    if (!text) {
      return res.status(400).json({ error: "Le texte à lire est requis." });
    }

    const voiceName = voice || "Kore"; // Choice from: 'Puck', 'Charon', 'Kore', 'Fenrir', 'Zephyr'
    console.log(`Synthesizing voice for text using Gemini TTS with voice: ${voiceName}`);

    // Try up to 2 times for premium TTS before falling back
    let response = null;
    let base64Audio = null;
    let lastTtsError = null;

    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        console.log(`[Gemini TTS] Requesting synthesis (attempt ${attempt}/2)`);
        response = await ai.models.generateContent({
          model: "gemini-3.1-flash-tts-preview",
          contents: [{ parts: [{ text: `Lis de manière vivante, fluide et théâtrale en français: ${text}` }] }],
          config: {
            responseModalities: ["AUDIO"],
            speechConfig: {
              voiceConfig: {
                prebuiltVoiceConfig: { voiceName: voiceName },
              },
            },
          },
        });

        base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
        if (base64Audio) {
          break; // Success!
        } else {
          throw new Error("Le flux audio Gemini-TTS n'a retourné aucun contenu.");
        }
      } catch (ttsErr: any) {
        lastTtsError = ttsErr;
        console.warn(`[Gemini TTS] Attempt ${attempt} failed:`, ttsErr.message);
        if (attempt < 2) {
          await new Promise((resolve) => setTimeout(resolve, attempt * 600));
        }
      }
    }

    try {
      if (base64Audio) {
        return res.json({ audio: base64Audio });
      } else {
        throw lastTtsError || new Error("Synthèse vocale indisponible.");
      }
    } catch (ttsErr: any) {
      console.warn("Gemini TTS failed or requires billing. Client side speech synthesis is available.", ttsErr.message);
      return res.status(503).json({
        error: "Le service premium Gemini TTS réclame un compte pro. Utilisez notre lecteur vocal système instantané !",
        rawMessage: ttsErr.message
      });
    }
  } catch (error: any) {
    console.error("TTS endpoint general failure:", error);
    return res.status(500).json({ error: error.message || "Échec de génération d'audio." });
  }
});

// 5. API: Share and retrieve stories
const SHARED_STORIES_FILE = path.join(process.cwd(), "shared_stories.json");

function loadSharedStories(): Record<string, any> {
  try {
    if (fs.existsSync(SHARED_STORIES_FILE)) {
      const content = fs.readFileSync(SHARED_STORIES_FILE, "utf-8");
      return JSON.parse(content);
    }
  } catch (err) {
    console.error("Error reading shared stories database file:", err);
  }
  return {};
}

function saveSharedStories(stories: Record<string, any>) {
  try {
    fs.writeFileSync(SHARED_STORIES_FILE, JSON.stringify(stories, null, 2), "utf-8");
  } catch (err) {
    console.error("Error writing shared stories database file:", err);
  }
}

app.post("/api/share", (req, res) => {
  try {
    const { story } = req.body;
    if (!story || !story.id) {
      return res.status(400).json({ error: "Contenu de l'histoire invalide pour le partage." });
    }
    const stories = loadSharedStories();
    stories[story.id] = story;
    saveSharedStories(stories);
    return res.json({ shareId: story.id, success: true });
  } catch (err: any) {
    console.error("Share error:", err);
    return res.status(500).json({ error: err.message || "Erreur lors de l'enregistrement du partage." });
  }
});

app.get("/api/share/:id", (req, res) => {
  try {
    const { id } = req.params;
    const stories = loadSharedStories();
    const story = stories[id];
    if (!story) {
      return res.status(404).json({ error: "Histoire introuvable ou lien expiré." });
    }
    return res.json({ story });
  } catch (err: any) {
    console.error("Get share error:", err);
    return res.status(500).json({ error: err.message || "Impossible de récupérer l'histoire partagée." });
  }
});

// 6. Serve React SPA in Dev vs Production
async function bootstrap() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`My Story AI server running at http://0.0.0.0:${PORT}`);
  });
}

bootstrap();
