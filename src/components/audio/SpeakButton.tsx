import { Volume2, VolumeX } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";

interface SpeakButtonProps {
  text: string;
  size?: "default" | "sm" | "icon";
}

/**
 * Lightweight read-aloud button using the browser's Web Speech API.
 * No backend cost, no API key. Falls back gracefully if unsupported.
 */
export const SpeakButton = ({ text, size = "sm" }: SpeakButtonProps) => {
  const [speaking, setSpeaking] = useState(false);
  const [supported, setSupported] = useState(true);
  const utterRef = useRef<SpeechSynthesisUtterance | null>(null);

  useEffect(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      setSupported(false);
    }
    return () => {
      try { window.speechSynthesis?.cancel(); } catch { /* noop */ }
    };
  }, []);

  if (!supported) return null;

  const handleToggle = () => {
    if (speaking) {
      window.speechSynthesis.cancel();
      setSpeaking(false);
      return;
    }
    const u = new SpeechSynthesisUtterance(text);
    u.rate = 1;
    u.pitch = 1;
    u.lang = "en-NG";
    u.onend = () => setSpeaking(false);
    u.onerror = () => setSpeaking(false);
    utterRef.current = u;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(u);
    setSpeaking(true);
  };

  return (
    <Button
      type="button"
      size={size}
      variant="ghost"
      onClick={handleToggle}
      aria-label={speaking ? "Stop reading" : "Read aloud"}
    >
      {speaking ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
      {size !== "icon" && <span className="ml-1.5 text-xs">{speaking ? "Stop" : "Listen"}</span>}
    </Button>
  );
};

export default SpeakButton;
