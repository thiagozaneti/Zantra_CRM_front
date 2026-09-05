import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { isEditableElement, useRFIDReader } from '../hooks/useRFIDReader';

function key(value: string, init: KeyboardEventInit = {}, target: Window | HTMLElement = window) {
  target.dispatchEvent(new KeyboardEvent('keydown', { key: value, bubbles: true, ...init }));
}

async function read(code: string, terminator = true) {
  await act(async () => {
    code.split('').forEach((value) => key(value));
    if (terminator) key('Enter');
    await Promise.resolve();
  });
}

describe('useRFIDReader', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('preserva zeros e finaliza com Enter', async () => {
    const onRead = vi.fn(); renderHook(() => useRFIDReader({ onRead }));
    await read('0001234567'); expect(onRead).toHaveBeenCalledWith('0001234567');
  });

  it('finaliza por timeout', async () => {
    const onRead = vi.fn(); renderHook(() => useRFIDReader({ onRead, readingTimeoutMs: 150 }));
    await read('12345', false);
    await act(async () => { vi.advanceTimersByTime(151); await Promise.resolve(); });
    expect(onRead).toHaveBeenCalledWith('12345');
  });

  it('rejeita tamanho e caracteres inválidos', async () => {
    const onRead = vi.fn(); const onInvalidRead = vi.fn();
    renderHook(() => useRFIDReader({ onRead, onInvalidRead }));
    await read('123'); await read('123A');
    expect(onRead).not.toHaveBeenCalled(); expect(onInvalidRead).toHaveBeenCalled();
  });

  it('não interpreta digitação lenta como RFID', async () => {
    const onRead = vi.fn(); renderHook(() => useRFIDReader({ onRead, maximumIntervalMs: 80 }));
    let now = 0; vi.spyOn(performance, 'now').mockImplementation(() => now);
    await act(async () => { for (const value of '12345') { key(value); now += 100; vi.advanceTimersByTime(100); } key('Enter'); await Promise.resolve(); });
    expect(onRead).not.toHaveBeenCalled();
  });

  it('ignora repetição, modificadores e campos editáveis', () => {
    const onRead = vi.fn(); renderHook(() => useRFIDReader({ onRead }));
    const input = document.createElement('input'); document.body.appendChild(input);
    expect(isEditableElement(input)).toBe(true);
    key('1', { repeat: true }); key('Control'); key('1', {}, input); key('Enter');
    expect(onRead).not.toHaveBeenCalled(); input.remove();
  });

  it('deduplica leituras e remove o listener ao desmontar', async () => {
    const onRead = vi.fn(); const hook = renderHook(() => useRFIDReader({ onRead, duplicateIntervalMs: 1000 }));
    await read('12345'); await read('12345'); expect(onRead).toHaveBeenCalledTimes(1);
    hook.unmount(); await read('98765'); expect(onRead).toHaveBeenCalledTimes(1);
  });
});
