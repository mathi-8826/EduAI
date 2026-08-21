import React, { useState, useEffect, useRef } from "react";
import { Mic, MicOff, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

type VoiceAnswerInputProps = {
  onTranscript: (transcript: string) => void;
  disabled?: boolean;
};

export const VoiceAnswerInput: React.FC<VoiceAnswerInputProps> = ({
  onTranscript,
  disabled = false,
}) => {
  const [isListening, setIsListening] = useState(false);
  const [isSupported, setIsSupported] = useState(true);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    const SpeechRecognitionAPI =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;

    if (!SpeechRecognitionAPI) {
      setIsSupported(false);
      return;
    }

    try {
      const recognition = new SpeechRecognitionAPI();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = "en-US";

      recognition.onresult = (event: any) => {
        let finalTranscript = "";

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript + " ";
          }
        }

        if (finalTranscript.trim()) {
          onTranscript(finalTranscript);
        }
      };

      recognition.onerror = (event: any) => {
        console.warn("[Voice Input] Speech recognition error:", event.error);
        if (event.error !== "no-speech") {
          setIsListening(false);
        }
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
    } catch (err) {
      console.warn("[Voice Input] Could not initialize SpeechRecognition:", err);
      setIsSupported(false);
    }

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {
          // Ignore cleanup error
        }
      }
    };
  }, [onTranscript]);

  const toggleListening = () => {
    if (!recognitionRef.current || !isSupported) return;

    if (isListening) {
      try {
        recognitionRef.current.stop();
      } catch (err) {
        console.warn("Error stopping speech recognition:", err);
      }
      setIsListening(false);
    } else {
      try {
        recognitionRef.current.start();
        setIsListening(true);
      } catch (err) {
        console.warn("Error starting speech recognition:", err);
      }
    }
  };

  if (!isSupported) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-500">
        <AlertCircle className="size-4 shrink-0" />
        <span>
          Voice input is not supported in this browser. Please type your answer instead.
        </span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <Button
        type="button"
        variant={isListening ? "destructive" : "outline"}
        size="sm"
        onClick={toggleListening}
        disabled={disabled}
        className="gap-2 font-medium transition-all"
      >
        {isListening ? (
          <>
            <span className="relative flex size-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-destructive-foreground opacity-75"></span>
              <span className="relative inline-flex size-2.5 rounded-full bg-destructive-foreground"></span>
            </span>
            <MicOff className="size-4" />
            <span>Listening... Stop Recording</span>
          </>
        ) : (
          <>
            <Mic className="size-4 text-primary" />
            <span>🎤 Start Voice Answer</span>
          </>
        )}
      </Button>

      {isListening && (
        <span className="text-xs text-muted-foreground animate-pulse">
          Speak clearly into your microphone...
        </span>
      )}
    </div>
  );
};
