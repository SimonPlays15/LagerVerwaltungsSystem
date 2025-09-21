import { useState, useCallback, useRef } from "react";
import { BrowserMultiFormatReader } from "@zxing/library";

export interface ScanResult {
  text: string;
  format: string;
}

export function useScanner() {
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const codeReaderRef = useRef<BrowserMultiFormatReader | null>(null);

  const startScanning = useCallback(
    async (
      videoElement: HTMLVideoElement,
      onResult: (result: ScanResult) => void,
    ) => {
      setIsScanning(true);
      setError(null);

      try {
        // Check if getUserMedia is available
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          throw new Error(
            "Kamera-Zugriff wird von diesem Browser nicht unterstützt",
          );
        }

        // Request camera permission first
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: "environment", // Prefer back camera
          },
        });

        // Assign stream to video element
        videoElement.srcObject = stream;
        await videoElement.play();

        const codeReader = new BrowserMultiFormatReader();
        codeReaderRef.current = codeReader;

        // Start continuous scanning with timeout
        const scanPromise = codeReader.decodeFromVideoDevice(
          null,
          videoElement,
          (result, error) => {
            if (result) {
              // Sound feedback for successful scan
              try {
                const audioContext = new (window.AudioContext ||
                  (window as any).webkitAudioContext)();
                const oscillator = audioContext.createOscillator();
                const gainNode = audioContext.createGain();

                oscillator.connect(gainNode);
                gainNode.connect(audioContext.destination);

                oscillator.frequency.value = 800;
                oscillator.type = "sine";
                gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
                gainNode.gain.exponentialRampToValueAtTime(
                  0.01,
                  audioContext.currentTime + 0.2,
                );

                oscillator.start(audioContext.currentTime);
                oscillator.stop(audioContext.currentTime + 0.2);
              } catch (audioErr) {
                // Silent fallback if audio is not available
              }

              onResult({
                text: result.getText(),
                format: result.getBarcodeFormat().toString(),
              });
            }

            if (
              error &&
              !(error.name === "NotFoundException") &&
              !(error.name === "NotFoundException2")
            ) {
              // Only show error if it's critical
              if (
                error.name !== "ChecksumException" &&
                error.name !== "FormatException"
              ) {
                setError("Scanner Fehler: " + error.message);
              }
            }
          },
        );
      } catch (err) {
        let errorMessage = "Scanner konnte nicht gestartet werden";
        if (err instanceof Error) {
          if (err.name === "NotAllowedError") {
            errorMessage =
              "Kamera-Berechtigung verweigert. Bitte erlauben Sie den Kamera-Zugriff.";
          } else if (err.name === "NotFoundError") {
            errorMessage =
              "Keine Kamera gefunden. Bitte stellen Sie sicher, dass eine Kamera angeschlossen ist.";
          } else if (err.name === "NotSupportedError") {
            errorMessage = "Kamera wird von diesem Browser nicht unterstützt.";
          } else {
            errorMessage = err.message;
          }
        }

        setError(errorMessage);
        setIsScanning(false);
      }
    },
    [],
  );

  const stopScanning = useCallback(() => {
    if (codeReaderRef.current) {
      codeReaderRef.current.reset();
      codeReaderRef.current = null;
    }
    setIsScanning(false);
    setError(null);
  }, []);

  return {
    isScanning,
    error,
    startScanning,
    stopScanning,
  };
}
