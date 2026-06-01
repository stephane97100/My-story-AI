import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  X, 
  Mail, 
  Lock, 
  Chrome, 
  Twitter, 
  Facebook, 
  Linkedin, 
  Sparkles, 
  RefreshCw,
  AlertCircle,
  CheckCircle2
} from "lucide-react";
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signInWithPopup, 
  GoogleAuthProvider 
} from "firebase/auth";
import { auth } from "../firebase";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (email: string) => void;
}

export default function AuthModal({ isOpen, onClose, onSuccess }: AuthModalProps) {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) return;

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      if (mode === "login") {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        setSuccess("Connexion réussie ! Heureux de vous revoir.");
        setTimeout(() => {
          onSuccess(userCredential.user.email || "");
          onClose();
        }, 1500);
      } else {
        if (password.length < 6) {
          throw new Error("Le mot de passe doit contenir au moins 6 caractères.");
        }
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        setSuccess("Inscription complétée avec succès ! Bienvenue à bord.");
        setTimeout(() => {
          onSuccess(userCredential.user.email || "");
          onClose();
        }, 1550);
      }
    } catch (err: any) {
      console.error(err);
      let localizedError = err.message;
      if (err.code === "auth/invalid-credential") {
        localizedError = "Identifiants invalides ou incorrects.";
      } else if (err.code === "auth/email-already-in-use") {
        localizedError = "Cette adresse e-mail est déjà utilisée par un autre compte.";
      } else if (err.code === "auth/weak-password") {
        localizedError = "Le mot de passe choisi est trop faible (6 caractères minimum).";
      } else if (err.code === "auth/invalid-email") {
        localizedError = "Veuillez saisir une adresse e-mail valide.";
      }
      setError(localizedError);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleAuth = async () => {
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const provider = new GoogleAuthProvider();
      const userCredential = await signInWithPopup(auth, provider);
      setSuccess("Authentifié avec succès via Google !");
      setTimeout(() => {
        onSuccess(userCredential.user.email || "");
        onClose();
      }, 1500);
    } catch (err: any) {
      console.error(err);
      if (err.code !== "auth/popup-closed-by-user") {
        setError(err.message || "La connexion Google a échoué.");
      }
    } finally {
      setLoading(false);
    }
  };

  // Simulated integrations for X, Facebook, LinkedIn as requested
  const handleSimulatedAuth = (providerName: string) => {
    setLoading(true);
    setError(null);
    setSuccess(null);
    
    setTimeout(() => {
      setSuccess(`[Démo] Connexion réussie avec votre compte ${providerName} !`);
      setTimeout(() => {
        // Mock successful sign in with safe state fallback
        onSuccess(`plume.${providerName.toLowerCase()}@mystory.ai`);
        onClose();
        setLoading(false);
      }, 1000);
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
      <motion.div
        initial={{ scale: 0.94, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.94, opacity: 0 }}
        className="relative bg-zinc-950 border border-white/10 p-6 sm:p-8 rounded-3xl max-w-md w-full shadow-2xl overflow-hidden"
      >
        {/* Decorative backdrop light */}
        <div className="absolute -top-20 -left-20 w-44 h-44 rounded-full bg-indigo-500/10 blur-3xl" />

        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-1.5">
            <Sparkles className="w-5 h-5 text-indigo-400" />
            <span className="font-serif font-bold text-white tracking-wide text-lg">
              {mode === "login" ? "Connexion Écrivain" : "Rejoindre l'Atelier"}
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-white/10 text-white/40 hover:text-white transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Success & Error alerts */}
        <AnimatePresence mode="wait">
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mb-4 bg-red-550/10 border border-red-500/20 text-red-400 p-3 rounded-xl flex items-start gap-2 text-xs"
            >
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </motion.div>
          )}

          {success && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mb-4 bg-emerald-550/10 border border-emerald-500/25 text-emerald-400 p-3 rounded-xl flex items-start gap-2 text-xs"
            >
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 font-bold" />
              <span>{success}</span>
            </motion.div>
          )}
        </AnimatePresence>

        <form onSubmit={handleEmailAuth} className="flex flex-col gap-3.5">
          {mode === "signup" && (
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-mono text-white/40 uppercase tracking-wider">Votre Nom d'artiste</label>
              <input
                type="text"
                placeholder="Ex. Alexandre Dumas"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="bg-white/5 border border-white/10 text-white rounded-xl px-3.5 py-2.5 text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-none"
              />
            </div>
          )}

          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-mono text-white/40 uppercase tracking-wider">Adresse Email</label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-3.5 w-4 h-4 text-white/30" />
              <input
                type="email"
                placeholder="nom@exemple.com"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-white/5 border border-white/10 text-white rounded-xl pl-10 pr-3.5 py-2.5 text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-mono text-white/40 uppercase tracking-wider">Mot de passe</label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-3.5 w-4 h-4 text-white/30" />
              <input
                type="password"
                placeholder="••••••"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-white/5 border border-white/10 text-white rounded-xl pl-10 pr-3.5 py-2.5 text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-none"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="mt-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs py-2.5 rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            {loading ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <span>{mode === "login" ? "Se connecter" : "S'inscrire"}</span>
            )}
          </button>
        </form>

        <div className="relative flex py-4 items-center">
          <div className="flex-grow border-t border-white/10"></div>
          <span className="flex-shrink mx-4 text-[9px] font-mono text-white/35 uppercase">Ou se connecter avec</span>
          <div className="flex-grow border-t border-white/10"></div>
        </div>

        {/* Social Authentication Providers */}
        <div className="flex flex-col gap-2">
          {/* Google Button - Actual Integration */}
          <button
            onClick={handleGoogleAuth}
            disabled={loading}
            className="flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 text-white text-xs font-semibold py-2.5 rounded-xl transition cursor-pointer"
          >
            <Chrome className="w-4 h-4 text-amber-500 shrink-0" />
            <span>Continuer avec Google</span>
          </button>

          {/* Social grid for LinkedIn, X, Facebook */}
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => handleSimulatedAuth("X / Twitter")}
              disabled={loading}
              className="flex items-center justify-center gap-1.5 bg-white/5 hover:bg-white/10 border border-white/10 text-white text-[11px] font-medium py-2 rounded-xl transition cursor-pointer"
              title="Connexion X"
            >
              <Twitter className="w-3.5 h-3.5 text-sky-400 shrink-0" />
              <span>X</span>
            </button>

            <button
              onClick={() => handleSimulatedAuth("Facebook")}
              disabled={loading}
              className="flex items-center justify-center gap-1.5 bg-white/5 hover:bg-white/10 border border-white/10 text-white text-[11px] font-medium py-2 rounded-xl transition cursor-pointer"
              title="Connexion Facebook"
            >
              <Facebook className="w-3.5 h-3.5 text-blue-500 shrink-0" />
              <span>Facebook</span>
            </button>

            <button
              onClick={() => handleSimulatedAuth("LinkedIn")}
              disabled={loading}
              className="flex items-center justify-center gap-1.5 bg-white/5 hover:bg-white/10 border border-white/10 text-white text-[11px] font-medium py-2 rounded-xl transition cursor-pointer"
              title="Connexion LinkedIn"
            >
              <Linkedin className="w-3.5 h-3.5 text-blue-400 shrink-0" />
              <span>LinkedIn</span>
            </button>
          </div>
        </div>

        {/* Mode Switch toggle */}
        <div className="text-center mt-6 pt-4 border-t border-white/5">
          <button
            onClick={() => setMode(mode === "login" ? "signup" : "login")}
            className="text-[11px] text-white/50 hover:text-indigo-400 font-medium transition cursor-pointer"
          >
            {mode === "login" 
              ? "Pas encore de compte de conteur ? Créer un compte" 
              : "Déjà membre de l'atelier ? Se connecter"}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
