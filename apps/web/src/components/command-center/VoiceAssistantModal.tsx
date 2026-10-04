"use client";

import React, { useState, useEffect, useRef } from "react";
import { useWorldStore } from "@/store/useWorldStore";
import {
  Mic,
  MicOff,
  Send,
  Sparkles,
  Terminal,
  Volume2,
  VolumeX,
  X,
  Zap,
  CheckCircle2,
  ArrowRight,
  Globe2,
  Layers,
  MapPin,
} from "lucide-react";

interface SuggestedCommand {
  label: string;
  category: "INTEL" | "SPATIAL" | "SIMULATION" | "DISPATCH";
}

const PREDEFINED_VOICE_COMMANDS: SuggestedCommand[] = [
  { label: "What is happening near R17?", category: "INTEL" },
  { label: "Switch to Satellite view", category: "SPATIAL" },
  { label: "Switch to 3D Living Twin", category: "SPATIAL" },
  { label: "Switch to 2D Dark Map", category: "SPATIAL" },
  { label: "What is the critical impact?", category: "INTEL" },
  { label: "Run What-If simulation for R17 flood", category: "SIMULATION" },
  { label: "Generate authorized dispatch plan", category: "DISPATCH" },
  { label: "Verify water clearance and resolve incident", category: "DISPATCH" },
];

export const VoiceAssistantModal: React.FC = () => {
  const {
    isVoiceModalOpen,
    toggleVoiceModal,
    sendVoiceCommand,
    voiceResult,
    setMapDisplayMode,
    runSimulationScenario,
    runFullFlagshipDrill,
  } = useWorldStore();

  const [inputQuery, setInputQuery] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [transcript, setTranscript] = useState("");

  const recognitionRef = useRef<any>(null);

  // Initialize Speech Recognition if supported
  useEffect(() => {
    if (typeof window !== "undefined") {
      const SpeechRecognition =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = true;
        recognition.lang = "en-US";

        recognition.onresult = (event: any) => {
          const current = event.resultIndex;
          const text = event.results[current][0].transcript;
          setInputQuery(text);
          setTranscript(text);
        };

        recognition.onend = () => {
          setIsListening(false);
        };

        recognition.onerror = () => {
          setIsListening(false);
        };

        recognitionRef.current = recognition;
      }
    }
  }, []);

  // Speak out voice responses using Web Speech Synthesis API
  useEffect(() => {
    if (voiceResult?.spokenResponse && !isMuted && typeof window !== "undefined") {
      try {
        window.speechSynthesis.cancel(); // Stop prior audio
        const utterance = new SpeechSynthesisUtterance(voiceResult.spokenResponse);
        utterance.rate = 1.05;
        utterance.pitch = 1.0;
        window.speechSynthesis.speak(utterance);
      } catch (err) {
        // Speech synthesis gracefully silenced if blocked by browser policy
      }
    }
  }, [voiceResult, isMuted]);

  if (!isVoiceModalOpen) return null;

  const handleSubmit = async (queryText: string) => {
    if (!queryText.trim() || isProcessing) return;
    setIsProcessing(true);
    setIsListening(false);
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {}
    }

    const lower = queryText.toLowerCase();

    // Direct spatial switcher shortcuts
    if (lower.includes("satellite")) {
      setMapDisplayMode("SATELLITE");
    } else if (lower.includes("3d") || lower.includes("living twin") || lower.includes("cesium")) {
      setMapDisplayMode("3D_CESIUM");
    } else if (lower.includes("2d") || lower.includes("dark map") || lower.includes("vector")) {
      setMapDisplayMode("2D_DARK");
    }

    try {
      await sendVoiceCommand(queryText);
      setInputQuery("");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSimulateVoice = (promptText: string) => {
    setInputQuery(promptText);
    setIsListening(true);
    setTimeout(() => {
      handleSubmit(promptText);
    }, 900);
  };

  const toggleMic = () => {
    if (isListening) {
      setIsListening(false);
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {}
      }
    } else {
      setIsListening(true);
      if (recognitionRef.current) {
        try {
          recognitionRef.current.start();
        } catch (e) {
          // Fallback simulation
          setTimeout(() => {
            handleSubmit(inputQuery || "What is happening near R17?");
          }, 2000);
        }
      } else {
        // Fallback simulation
        setTimeout(() => {
          handleSubmit(inputQuery || "What is happening near R17?");
        }, 1800);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-xl bg-slate-900/95 border border-cyan-500/40 rounded-xl shadow-[0_0_50px_rgba(6,182,212,0.25)] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-cyan-500/20 border border-cyan-500/50 flex items-center justify-center text-cyan-400">
              <Sparkles className="w-4 h-4 animate-pulse" />
            </div>
            <div>
              <div className="text-sm font-bold text-white tracking-wider mono-telemetry flex items-center gap-2">
                VOICE COMMAND CENTER
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-950 text-cyan-400 border border-cyan-800 font-mono">
                  SPEECH & TYPED TOOLS
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Natural Operational Intelligence, Map Switching & Tool Dispatch
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                if (!isMuted) window.speechSynthesis?.cancel();
                setIsMuted(!isMuted);
              }}
              title={isMuted ? "Unmute Voice Responses" : "Mute Voice Responses"}
              className={`p-1.5 rounded-lg border transition-colors ${
                isMuted
                  ? "bg-amber-950/50 border-amber-800 text-amber-400"
                  : "bg-slate-800 border-slate-700 text-slate-300 hover:text-white"
              }`}
            >
              {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>
            <button
              onClick={() => {
                window.speechSynthesis?.cancel();
                toggleVoiceModal(false);
              }}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-5 space-y-4">
          {/* Audio Waveform Animation when listening */}
          <div className="p-4 rounded-lg bg-slate-950 border border-slate-800 flex flex-col items-center justify-center min-h-[110px] relative overflow-hidden">
            {isListening ? (
              <div className="flex flex-col items-center gap-3">
                <div className="flex items-center gap-1.5 h-10">
                  {[40, 75, 90, 50, 85, 100, 60, 45, 95, 70, 55, 30].map((h, i) => (
                    <div
                      key={i}
                      className="w-1.5 bg-gradient-to-t from-cyan-500 to-blue-400 rounded-full animate-pulse"
                      style={{
                        height: `${h}%`,
                        animationDelay: `${i * 80}ms`,
                        animationDuration: "600ms",
                      }}
                    />
                  ))}
                </div>
                <span className="text-xs text-cyan-400 mono-telemetry font-medium animate-pulse">
                  {inputQuery ? `"${inputQuery}"` : "LISTENING FOR VOICE OR CLICK..."}
                </span>
              </div>
            ) : isProcessing ? (
              <div className="flex flex-col items-center gap-2">
                <div className="w-8 h-8 border-2 border-cyan-500/30 border-t-cyan-400 rounded-full animate-spin" />
                <span className="text-xs text-slate-300 mono-telemetry">
                  DISPATCHING TYPED TOOLS & REASONING...
                </span>
              </div>
            ) : voiceResult ? (
              <div className="w-full space-y-2.5">
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <div className="flex items-center gap-2">
                    <Terminal className="w-3.5 h-3.5 text-cyan-400" />
                    <span className="font-mono text-cyan-300">Tool: {voiceResult.toolCalled}</span>
                    <span className="text-slate-600">|</span>
                    <span className="font-mono text-emerald-400">Intent: {voiceResult.intent}</span>
                  </div>
                  <span className="text-[10px] text-slate-500 font-mono">Audio Active</span>
                </div>
                <div className="p-3.5 rounded-lg bg-cyan-950/40 border border-cyan-500/30 text-xs text-slate-200 leading-relaxed flex items-start gap-2.5">
                  <Volume2 className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5 animate-pulse" />
                  <div>
                    <span className="font-bold text-cyan-300 mr-1.5">NEXUS VOICE:</span>
                    {voiceResult.spokenResponse}
                  </div>
                </div>
                {voiceResult.clientAction && (
                  <div className="flex items-center gap-2 text-[11px] text-emerald-400 font-mono">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Dispatched UI action: {voiceResult.clientAction.action}</span>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center text-slate-400 text-xs">
                Speak into the microphone or click any predefined operational query below.
              </div>
            )}
          </div>

          {/* Predefined Voice Commands */}
          <div>
            <div className="flex items-center justify-between text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
              <span>Predefined Operational Queries</span>
              <span className="text-[10px] text-cyan-400 font-mono">Click to Execute</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {PREDEFINED_VOICE_COMMANDS.map((cmd) => (
                <button
                  key={cmd.label}
                  onClick={() => handleSimulateVoice(cmd.label)}
                  disabled={isProcessing}
                  className="px-3 py-2 rounded-lg bg-slate-800/60 hover:bg-cyan-950/60 border border-slate-700/60 hover:border-cyan-500/50 text-left text-xs text-slate-300 hover:text-cyan-300 transition-all flex items-center justify-between group"
                >
                  <span className="truncate">{cmd.label}</span>
                  <ArrowRight className="w-3 h-3 text-slate-500 group-hover:text-cyan-400 shrink-0 ml-1 transition-transform group-hover:translate-x-0.5" />
                </button>
              ))}
            </div>
          </div>

          {/* Text input / Mic Toggle */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSubmit(inputQuery);
            }}
            className="flex items-center gap-2 pt-2"
          >
            <div className="relative flex-1">
              <input
                type="text"
                value={inputQuery}
                onChange={(e) => setInputQuery(e.target.value)}
                placeholder="Ask about R17, switch to satellite, simulation, or response plans..."
                disabled={isProcessing}
                className="w-full px-3.5 py-2.5 rounded-lg bg-slate-950 border border-slate-800 focus:border-cyan-500 text-xs text-slate-200 placeholder-slate-500 outline-none transition-colors font-mono"
              />
            </div>
            <button
              type="button"
              onClick={toggleMic}
              title="Toggle Microphone Voice Recognition"
              className={`p-2.5 rounded-lg border transition-all ${
                isListening
                  ? "bg-red-500/20 border-red-500/50 text-red-400 animate-pulse"
                  : "bg-slate-800 border-slate-700 text-slate-300 hover:text-white"
              }`}
            >
              {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            </button>
            <button
              type="submit"
              disabled={!inputQuery.trim() || isProcessing}
              className="px-4 py-2.5 rounded-lg bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-all shadow-[0_0_12px_rgba(6,182,212,0.3)] disabled:opacity-40"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Run</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
