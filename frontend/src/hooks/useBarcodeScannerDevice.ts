import { useEffect, useCallback, useRef } from "react";

/**
 * Hook to detect input from USB/Bluetooth barcode scanner devices.
 * These devices act like keyboards — they type characters rapidly and press Enter.
 */
export function useBarcodeScannerDevice(onScan: (barcode: string) => void) {
  const bufferRef = useRef("");
  const lastKeyTimeRef = useRef(0);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      // Ignore if user is typing in an input/textarea
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;

      const now = Date.now();
      const timeDiff = now - lastKeyTimeRef.current;

      // Scanner inputs come in very fast (<50ms between keys)
      // Reset buffer if too slow (manual typing)
      if (timeDiff > 100) {
        bufferRef.current = "";
      }

      lastKeyTimeRef.current = now;

      if (e.key === "Enter") {
        const barcode = bufferRef.current.trim();
        if (barcode.length >= 4) {
          e.preventDefault();
          onScan(barcode);
        }
        bufferRef.current = "";
      } else if (e.key.length === 1) {
        bufferRef.current += e.key;
      }
    },
    [onScan]
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);
}
