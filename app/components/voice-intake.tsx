'use client';

import { useCallback, useRef, useState } from 'react';
import { Mic, Square, Loader2, AlertTriangle } from 'lucide-react';
import { t, type Lang } from '../lib/assist';

export interface Heard {
  transcript: string;
  journey: 'before' | 'waiting' | 'rejected' | null;
  daysWaiting: number | null;
  amount: number | null;
  rejectionText: string | null;
}

/**
 * One button. A member who cannot read the form is not helped by a language
 * picker above it, so there isn't one: the model works out what was spoken.
 */
export function VoiceIntake({ lang, onHeard }: { lang: Lang; onHeard: (h: Heard) => void }) {
  const [state, setState] = useState<'idle' | 'recording' | 'working' | 'error'>('idle');
  const [msg, setMsg] = useState<string | null>(null);
  const [secs, setSecs] = useState(0);
  const rec = useRef<MediaRecorder | null>(null);
  const chunks = useRef<BlobPart[]>([]);
  const tick = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearTick = () => { if (tick.current) clearInterval(tick.current); tick.current = null; };

  const send = useCallback(async (blob: Blob) => {
    setState('working');
    const fd = new FormData();
    const ext = blob.type.includes('mp4') ? 'mp4' : blob.type.includes('ogg') ? 'ogg' : 'webm';
    fd.append('audio', new File([blob], `speech.${ext}`, { type: blob.type }));
    try {
      const res = await fetch('/api/listen', { method: 'POST', body: fd });
      const data = await res.json();
      if (!res.ok) { setMsg(data.error ?? t('voice_failed', lang)); setState('error'); return; }
      setState('idle'); setMsg(null); onHeard(data as Heard);
    } catch { setMsg(t('voice_failed', lang)); setState('error'); }
  }, [onHeard, lang]);

  const start = useCallback(async () => {
    setMsg(null);
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      setMsg(t('voice_nomic', lang)); setState('error'); return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const r = new MediaRecorder(stream);
      chunks.current = [];
      r.ondataavailable = (e) => { if (e.data.size > 0) chunks.current.push(e.data); };
      r.onstop = () => {
        stream.getTracks().forEach((t2) => t2.stop());
        const blob = new Blob(chunks.current, { type: r.mimeType || 'audio/webm' });
        if (blob.size > 0) void send(blob); else { setMsg(t('voice_failed', lang)); setState('error'); }
      };
      r.start(); rec.current = r; setSecs(0); setState('recording');
      tick.current = setInterval(() => {
        setSecs((s) => { if (s >= 59) { rec.current?.stop(); clearTick(); } return s + 1; });
      }, 1000);
    } catch { setMsg(t('voice_denied', lang)); setState('error'); }
  }, [send, lang]);

  return (
    <div className="voice-box">
      <p className="voice-prompt">{t('voice_prompt', lang)}</p>
      <p className="voice-hint">{t('voice_hint', lang)}</p>
      {state === 'recording' ? (
        <button type="button" className="voice-btn rec" onClick={() => { clearTick(); rec.current?.stop(); }}>
          <Square size={20} aria-hidden /> {t('voice_stop', lang)} ({60 - secs}s)
        </button>
      ) : (
        <button type="button" className="voice-btn" onClick={start} disabled={state === 'working'}>
          {state === 'working'
            ? <><Loader2 size={20} className="spin" aria-hidden /> {t('voice_working', lang)}</>
            : <><Mic size={20} aria-hidden /> {t('voice_speak', lang)}</>}
        </button>
      )}
      {msg && <p className="voice-err"><AlertTriangle size={15} aria-hidden /> {msg}</p>}
      <p className="voice-note">{t('voice_note', lang)}</p>
    </div>
  );
}
