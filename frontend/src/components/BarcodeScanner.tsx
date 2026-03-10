import { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Camera, CameraOff } from "lucide-react";

interface BarcodeScannerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onScan: (barcode: string) => void;
}

export default function BarcodeScanner({ open, onOpenChange, onScan }: BarcodeScannerProps) {
  const [error, setError] = useState<string | null>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const containerRef = useRef<string>("barcode-scanner-container");

  useEffect(() => {
    if (!open) return;

    const startScanner = async () => {
      try {
        setError(null);
        const scanner = new Html5Qrcode(containerRef.current);
        scannerRef.current = scanner;

        await scanner.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 250, height: 100 } },
          (decodedText) => {
            onScan(decodedText);
            scanner.stop().catch(() => {});
            onOpenChange(false);
          },
          () => {}
        );
      } catch (err) {
        setError("Camera access denied or not available. Please allow camera permissions.");
      }
    };

    // Small delay to ensure DOM is ready
    const timer = setTimeout(startScanner, 300);

    return () => {
      clearTimeout(timer);
      if (scannerRef.current) {
        scannerRef.current.stop().catch(() => {});
        scannerRef.current = null;
      }
    };
  }, [open, onScan, onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Camera className="w-5 h-5 text-primary" />
            Scan Barcode
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div
            id={containerRef.current}
            className="w-full min-h-[250px] rounded-lg overflow-hidden bg-muted"
          />
          {error && (
            <div className="flex flex-col items-center gap-2 text-center py-4">
              <CameraOff className="w-8 h-8 text-muted-foreground" />
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}
          <p className="text-xs text-muted-foreground text-center">
            Point your camera at a barcode to scan
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
