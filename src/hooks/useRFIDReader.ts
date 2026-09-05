import { useCallback, useEffect, useRef, useState } from 'react';

export interface UseRFIDReaderOptions {
  enabled?: boolean;
  terminatorKey?: string;
  minimumLength?: number;
  maximumLength?: number;
  maximumIntervalMs?: number;
  readingTimeoutMs?: number;
  duplicateIntervalMs?: number;
  allowedPattern?: RegExp;
  ignoreWhenTyping?: boolean;
  preventDefaultWhenActive?: boolean;
  onRead: (cardCode: string) => void | Promise<void>;
  onInvalidRead?: (value: string) => void;
  onError?: (error: unknown) => void;
}

export interface UseRFIDReaderResult {
  isListening: boolean;
  isReading: boolean;
  lastCardCode: string | null;
  lastReadAt: Date | null;
  clearLastRead: () => void;
  resetBuffer: () => void;
}

const DEFAULTS = {
  enabled: true, terminatorKey: 'Enter', minimumLength: 4, maximumLength: 64,
  maximumIntervalMs: 80, readingTimeoutMs: 150, duplicateIntervalMs: 1000,
  allowedPattern: /^[0-9]+$/, ignoreWhenTyping: true, preventDefaultWhenActive: false,
};

const ignoredKeys = new Set(['Shift', 'Control', 'Alt', 'Meta', 'CapsLock', 'Tab', 'Escape', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight']);

export function isEditableElement(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false;
  const tag = target.tagName.toLowerCase();
  return tag === 'input' || tag === 'textarea' || tag === 'select' || target.closest('[contenteditable="true"]') !== null;
}

function matches(pattern: RegExp, value: string) {
  pattern.lastIndex = 0;
  return pattern.test(value);
}

export function useRFIDReader(options: UseRFIDReaderOptions): UseRFIDReaderResult {
  const settingsRef = useRef({ ...DEFAULTS, ...options });
  settingsRef.current = { ...DEFAULTS, ...options };
  const bufferRef = useRef('');
  const lastKeyAtRef = useRef<number | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastReadRef = useRef<{ code: string; at: number } | null>(null);
  const processingRef = useRef(false);
  const mountedRef = useRef(true);
  const [isReading, setIsReading] = useState(false);
  const [lastCardCode, setLastCardCode] = useState<string | null>(null);
  const [lastReadAt, setLastReadAt] = useState<Date | null>(null);

  const clearTimer = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = null;
  }, []);

  const resetBuffer = useCallback(() => {
    clearTimer(); bufferRef.current = ''; lastKeyAtRef.current = null;
    if (mountedRef.current) setIsReading(false);
  }, [clearTimer]);

  const finalize = useCallback(async () => {
    const value = bufferRef.current;
    const settings = settingsRef.current;
    resetBuffer();
    if (!value || value.length < settings.minimumLength || value.length > settings.maximumLength || !matches(settings.allowedPattern, value)) {
      if (value) settings.onInvalidRead?.(value);
      return;
    }
    const now = performance.now();
    if (lastReadRef.current?.code === value && now - lastReadRef.current.at < settings.duplicateIntervalMs) return;
    if (processingRef.current) return;
    processingRef.current = true;
    lastReadRef.current = { code: value, at: now };
    if (mountedRef.current) { setLastCardCode(value); setLastReadAt(new Date()); }
    try { await settings.onRead(value); }
    catch (error) { settings.onError?.(error); }
    finally { processingRef.current = false; }
  }, [resetBuffer]);

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    const settings = settingsRef.current;
    if (!settings.enabled || processingRef.current || event.repeat || event.ctrlKey || event.altKey || event.metaKey) return;
    if (settings.ignoreWhenTyping && isEditableElement(event.target)) return;
    if (event.key === settings.terminatorKey) {
      if (bufferRef.current) { if (settings.preventDefaultWhenActive) event.preventDefault(); void finalize(); }
      return;
    }
    if (ignoredKeys.has(event.key) || event.key.length !== 1 || !matches(settings.allowedPattern, event.key)) return;
    const now = performance.now();
    if (lastKeyAtRef.current !== null && now - lastKeyAtRef.current > settings.maximumIntervalMs) bufferRef.current = '';
    lastKeyAtRef.current = now;
    bufferRef.current += event.key;
    if (bufferRef.current.length > settings.maximumLength) { settings.onInvalidRead?.(bufferRef.current); resetBuffer(); return; }
    if (settings.preventDefaultWhenActive) event.preventDefault();
    if (mountedRef.current) setIsReading(true);
    clearTimer();
    timeoutRef.current = setTimeout(() => void finalize(), settings.readingTimeoutMs);
  }, [clearTimer, finalize, resetBuffer]);

  useEffect(() => {
    mountedRef.current = true;
    if (options.enabled !== false) window.addEventListener('keydown', handleKeyDown);
    return () => { mountedRef.current = false; window.removeEventListener('keydown', handleKeyDown); resetBuffer(); };
  }, [handleKeyDown, options.enabled, resetBuffer]);

  return {
    isListening: options.enabled !== false, isReading, lastCardCode, lastReadAt,
    clearLastRead: () => { lastReadRef.current = null; setLastCardCode(null); setLastReadAt(null); }, resetBuffer,
  };
}
