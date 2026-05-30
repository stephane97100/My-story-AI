import express from "express";
import path from "path";
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

app.use(express.json({ limit: "15mb" }));

// 1. API: Story Generation
app.post("/api/generate-story", async (req, res) => {
  try {
    const { prompt, genre, tone, audience } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: "Le prompt ou thème de l'histoire est requis." });
    }

    const systemInstruction = `Tu es un romancier professionnel, poète et conteur d'élite francophone.
Construis une superbe histoire complète, immersive, touchante et bien rythmée en français, structurée précisément en 4 étapes: Introduction, Développement, Climax et Conclusion.
Adapte l'histoire selon les choix de l'utilisateur :
- Genre : ${genre || "Merveilleux"}
- Ton / Style : ${tone || "Poétique"}
- Public Cible : ${audience || "Tout public"}

Pour chaque section, génère également un 'imagePrompt'. Ce prompt d'image doit être rédigé en ANGLAIS, extrêmement descriptif visuellement, adapté au style de la scène et adapté au genre (par exemple, "fantasy style watercolor, cinematic lighting..."). Évite les concepts abstraits dans l'imagePrompt, décris des éléments visuels concrets.`;

    const contents = `Crée une histoire originale basée sur le thème suivant : "${prompt}".`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
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
                text: { type: Type.STRING, description: "Le texte narratif de l'introduction (environ 100 à 150 mots)." },
                imagePrompt: { type: Type.STRING, description: "A detailed visual image prompt in English for illustration, containing specific artistic style (e.g. digital art, cinematic lighting, 8k)." }
              },
              required: ["title", "text", "imagePrompt"]
            },
            developpement: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING, description: "Sous-titre de la phase de développement de l'intrigue." },
                text: { type: Type.STRING, description: "Le corps du texte de développement (environ 150-200 mots)." },
                imagePrompt: { type: Type.STRING, description: "Detailed English prompt for illustration describing the setting and ongoing narrative action." }
              },
              required: ["title", "text", "imagePrompt"]
            },
            climax: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING, description: "Sous-titre de l'épreuve reine ou l'instant d'intensité maximale (le climax)." },
                text: { type: Type.STRING, description: "Le texte palpitant et intense du climax (environ 100-150 mots)." },
                imagePrompt: { type: Type.STRING, description: "High-intensity visual scene prompt in English representing the dramatic turning point." }
              },
              required: ["title", "text", "imagePrompt"]
            },
            conclusion: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING, description: "Sous-titre de la fin du récit." },
                text: { type: Type.STRING, description: "Le texte de la conclusion apportant une morale ou un apaisement (environ 100 mots)." },
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

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
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
    const { prompt } = req.body;
    if (!prompt) {
      return res.status(400).json({ error: "Le prompt de l'image est requis." });
    }

    console.log(`Generating image for prompt: ${prompt}`);

    // Call gemini-2.5-flash-image.
    // If it fails (such as unpaid plan or billing restrictions), we catch it and fallback gracefully.
    try {
      const gResponse = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: {
          parts: [{ text: `${prompt}, artistic illustration style. Make it vibrant, colorful, and highly immersive.` }]
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
      const cleanSeed = encodeURIComponent(prompt.trim().slice(0, 32).toLowerCase().replace(/[^a-z0-9]/g, '-'));
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

    try {
      const response = await ai.models.generateContent({
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

      const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (base64Audio) {
        return res.json({ audio: base64Audio });
      } else {
        throw new Error("Le flux audio Gemini-TTS n'a retourné aucun contenu.");
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

// 5. Serve React SPA in Dev vs Production
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
