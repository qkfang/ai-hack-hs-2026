// Web Speech API types not yet in all TypeScript DOM lib versions

interface SpeechRecognitionEventMap {
  result: SpeechRecognitionEvent
  end: Event
  error: Event
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean
  interimResults: boolean
  lang: string
  onresult: ((ev: SpeechRecognitionEvent) => void) | null
  onerror: ((ev: Event) => void) | null
  onend: (() => void) | null
  start(): void
  stop(): void
}

declare var SpeechRecognition: {
  new(): SpeechRecognition
}

interface SpeechRecognitionEvent extends Event {
  readonly results: SpeechRecognitionResultList
}
