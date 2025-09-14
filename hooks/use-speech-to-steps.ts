"use client";

import { useCallback, useEffect, useRef, useState } from 'react';

export interface SpeechStepDraft {
  title: string;
  description?: string;
}

interface RecognitionLike {
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((this: any, ev: any) => any) | null;
  onerror: ((this: any, ev: any) => any) | null;
  onend: ((this: any, ev: any) => any) | null;
  interimResults: boolean;
  continuous: boolean;
  lang: string;
}

export function useSpeechToSteps(lang: 'ja-JP' | 'en-US' = 'ja-JP') {
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [steps, setSteps] = useState<SpeechStepDraft[]>([]);
  const recRef = useRef<RecognitionLike | null>(null);

  useEffect(() => {
    const w = window as any;
    const Ctor =
      w.SpeechRecognition || w.webkitSpeechRecognition || w.mozSpeechRecognition;
    if (Ctor) setSupported(true);
    return () => {
      recRef.current?.abort?.();
      recRef.current = null;
    };
  }, []);

  const parse = useCallback((txt: string) => {
    const out: SpeechStepDraft[] = [];
    const norm = txt.replace(/、/g, '、 ').replace(/。/g, '。 ');
    const parts = norm
      .split(/(?:^|\s)(?:ステップ\s*\d+[:：]?|step\s*\d+[:：]?)/i)
      .map((s) => s.trim())
      .filter(Boolean);
    if (parts.length > 1) {
      for (const p of parts) {
        const [firstLine, ...rest] = p.split(/\s+/);
        const title = firstLine.length > 3 ? firstLine : p.slice(0, 20);
        out.push({ title, description: rest.join(' ').slice(0, 140) });
      }
    } else if (txt.trim()) {
      // Fallback: one step
      out.push({ title: txt.trim().slice(0, 50) });
    }
    return out.slice(0, 10);
  }, []);

  const start = useCallback(() => {
    if (!supported || listening) return;
    const w = window as any;
    const Ctor =
      w.SpeechRecognition || w.webkitSpeechRecognition || w.mozSpeechRecognition;
    if (!Ctor) return;
    const rec: RecognitionLike = new Ctor();
    rec.lang = lang;
    rec.interimResults = true;
    rec.continuous = true;
    rec.onresult = (e: any) => {
      let t = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        t += e.results[i][0].transcript;
      }
      setTranscript((prev) => (prev + ' ' + t).trim());
      setSteps(parse((prev + ' ' + t).trim()));
    };
    rec.onerror = () => setListening(false);
    rec.onend = () => setListening(false);
    recRef.current = rec;
    rec.start();
    setListening(true);
  }, [supported, listening, lang, parse]);

  const stop = useCallback(() => {
    recRef.current?.stop?.();
    setListening(false);
  }, []);

  const reset = useCallback(() => {
    setTranscript('');
    setSteps([]);
  }, []);

  return { supported, listening, transcript, steps, start, stop, reset };
}

