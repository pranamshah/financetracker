import { useRef, useState } from 'react'

// Small secondary mic icon that fills a field via the Web Speech API.
// onResult(text) receives the recognized transcript.
export default function MicButton({ onResult, lang = 'en-US' }) {
  const [listening, setListening] = useState(false)
  const recRef = useRef(null)

  const SR = typeof window !== 'undefined'
    ? window.SpeechRecognition || window.webkitSpeechRecognition
    : null

  if (!SR) return null

  const toggle = () => {
    if (listening) {
      recRef.current?.stop()
      return
    }
    const rec = new SR()
    rec.lang = lang
    rec.interimResults = false
    rec.maxAlternatives = 1
    rec.onresult = (e) => {
      const text = e.results[0][0].transcript
      onResult?.(text)
    }
    rec.onend = () => setListening(false)
    rec.onerror = () => setListening(false)
    recRef.current = rec
    setListening(true)
    rec.start()
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label="Voice input"
      className={`shrink-0 rounded-full p-2 transition ${
        listening ? 'bg-red-100 text-red-600 animate-pulse' : 'text-slate-400 hover:text-slate-600'
      }`}
    >
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z" />
        <path d="M19 10v1a7 7 0 0 1-14 0v-1" />
        <line x1="12" y1="19" x2="12" y2="22" />
      </svg>
    </button>
  )
}
