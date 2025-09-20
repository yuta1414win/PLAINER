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

const STEP_MARKER = /(?:^|\s)(?:ステップ\s*\d+[:：]?|step\s*\d+[:：]?)/gi;

export function useSpeechToSteps(lang: 'ja-JP' | 'en-US' = 'ja-JP') {
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [steps, setSteps] = useState<SpeechStepDraft[]>([]);
  const recRef = useRef<RecognitionLike | null>(null);

  useEffect(() => {
    const w = window as any;
    const Ctor = w.SpeechRecognition || w.webkitSpeechRecognition || w.mozSpeechRecognition;
    setSupported(Boolean(Ctor));

    return () => {
      recRef.current?.abort?.();
      recRef.current = null;
    };
  }, []);

  const parse = useCallback((raw: string) => {
    const normalized = raw.replace(/\s+/g, ' ').trim();
    if (!normalized) return [];

    const segments = normalized
      .split(STEP_MARKER)
      .map((segment) => segment.trim())
      .filter((segment) => segment.length > 0);

    const source = segments.length > 1 ? segments : [normalized];

    return source.slice(0, 10).map((segment, index) => {
      const cleaned = segment.replace(/^[\-・\s]+/, '');
      if (!cleaned) {
        return { title: `音声ステップ ${index + 1}` } satisfies SpeechStepDraft;
      }

      const words = cleaned.split(/\s+/);
      const [firstWord = ''] = words;
      const titleCandidate = firstWord.length >= 3 ? firstWord : cleaned.slice(0, 30);
      const description = words.slice(1).join(' ').trim();

      return {
        title: titleCandidate || `音声ステップ ${index + 1}`,
        ...(description ? { description: description.slice(0, 140) } : {}),
      } satisfies SpeechStepDraft;
    });
  }, []);

  const start = useCallback(() => {
    if (!supported || listening) return;

    const w = window as any;
    const Ctor = w.SpeechRecognition || w.webkitSpeechRecognition || w.mozSpeechRecognition;
    if (!Ctor) return;

    const rec: RecognitionLike = new Ctor();
    rec.lang = lang;
    rec.interimResults = true;
    rec.continuous = true;

    rec.onresult = (event: any) => {
      const results: string[] = Array.from(event.results || [], (result: any) => {
        const transcriptValue = result?.[0]?.transcript ?? '';
        return typeof transcriptValue === 'string' ? transcriptValue : '';
      });

      const combined = results.join(' ').replace(/\s+/g, ' ').trim();
      setTranscript(combined);
      setSteps(parse(combined));
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
    recRef.current?.abort?.();
    setTranscript('');
    setSteps([]);
    setListening(false);
  }, []);

  return { supported, listening, transcript, steps, start, stop, reset };
}

