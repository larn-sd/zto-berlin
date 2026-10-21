import { useEffect, useRef } from 'react';
import { cleanScannedBarcode } from '../utils/barcode';

interface UseBarcodeScannerGunOptions {
  onScan: (barcode: string) => void;
  enabled?: boolean;
  minChars?: number;
  maxIntervalMs?: number;
}

/**
 * Global Hardware Barcode Scanner Gun Listener
 * Intercepts high-speed keystrokes from USB / Bluetooth handheld barcode scanners
 * even when the input element is not focused or loses focus.
 */
export function useBarcodeScannerGun({
  onScan,
  enabled = true,
  minChars = 3,
  maxIntervalMs = 60
}: UseBarcodeScannerGunOptions) {
  const bufferRef = useRef<string>('');
  const lastKeyTimeRef = useRef<number>(0);
  const onScanRef = useRef(onScan);

  useEffect(() => {
    onScanRef.current = onScan;
  }, [onScan]);

  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept if user is typing in standard textareas or certain inputs unless they are rapid scanner strokes
      const target = e.target as HTMLElement | null;
      const isInput = target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA');

      const now = Date.now();
      const timeDiff = now - lastKeyTimeRef.current;
      lastKeyTimeRef.current = now;

      if (e.key === 'Enter') {
        if (bufferRef.current.length >= minChars) {
          const rawCode = bufferRef.current;
          bufferRef.current = '';
          const cleaned = cleanScannedBarcode(rawCode);
          if (cleaned) {
            e.preventDefault();
            e.stopPropagation();
            onScanRef.current(cleaned);
          }
        } else {
          bufferRef.current = '';
        }
        return;
      }

      // Ignore modifier keys
      if (e.key.length > 1 && e.key !== 'Backspace') {
        return;
      }

      // If typing speed is human (> 80ms) and user is in an input field, reset buffer to not interfere with typing
      if (isInput && timeDiff > maxIntervalMs && bufferRef.current.length > 0) {
        bufferRef.current = '';
      }

      // If time difference is small (< maxIntervalMs) or buffer is just starting, append char
      if (timeDiff <= maxIntervalMs || bufferRef.current.length === 0) {
        if (e.key.length === 1) {
          bufferRef.current += e.key;
        }
      } else {
        // Human typing or gap: restart buffer with current key
        if (e.key.length === 1) {
          bufferRef.current = e.key;
        } else {
          bufferRef.current = '';
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown, { capture: true });
    return () => {
      window.removeEventListener('keydown', handleKeyDown, { capture: true });
    };
  }, [enabled, minChars, maxIntervalMs]);
}
