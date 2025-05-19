declare module 'react-speech-recognition' {
  export interface SpeechRecognitionOptions {
    continuous?: boolean;
    interimResults?: boolean;
    lang?: string;
  }

  export interface SpeechRecognitionListenOptions {
    continuous?: boolean;
    language?: string;
  }

  export interface SpeechRecognitionResults {
    transcript: string;
    interimTranscript: string;
    finalTranscript: string;
    listening: boolean;
    resetTranscript: () => void;
    browserSupportsSpeechRecognition: boolean;
  }

  export default function useSpeechRecognition(): SpeechRecognitionResults;

  export function SpeechRecognition(): {
    startListening: (options?: SpeechRecognitionListenOptions) => void;
    stopListening: () => void;
    abortListening: () => void;
  };
}
