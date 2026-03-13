import { useRef, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Camera, RotateCcw, Check } from "lucide-react";

interface CameraCaptureProps {
  onCapture: (blob: Blob) => void;
  capturedPreview?: string | null;
  onClear?: () => void;
  label?: string;
}

const CameraCapture = ({ onCapture, capturedPreview, onClear, label = "Take Photo" }: CameraCaptureProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [streaming, setStreaming] = useState(false);
  const [videoReady, setVideoReady] = useState(false);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setStreaming(false);
    setVideoReady(false);
  }, []);

  const startCamera = useCallback(async () => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        alert("Camera is not available. If you're in a preview, please test on the published site.");
        return;
      }
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      streamRef.current = mediaStream;
      setStreaming(true);
      // Wait for next render so video element is mounted
      setTimeout(() => {
        if (videoRef.current && streamRef.current) {
          videoRef.current.srcObject = streamRef.current;
          videoRef.current.onloadedmetadata = () => {
            videoRef.current?.play().then(() => {
              setVideoReady(true);
            }).catch(() => {
              setVideoReady(true);
            });
          };
        }
      }, 100);
    } catch (err: any) {
      console.error("Camera error:", err);
      if (err?.name === "NotAllowedError") {
        alert("Camera access denied. Please allow camera access in your browser settings.");
      } else if (err?.name === "NotFoundError") {
        alert("No camera found on this device.");
      } else {
        alert("Camera is not available. If you're in a preview iframe, please test on the published site.");
      }
    }
  }, []);

  const capture = useCallback(() => {
    if (!videoRef.current || !canvasRef.current || !videoReady) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob(
      (blob) => {
        if (blob) {
          onCapture(blob);
        }
        stopCamera();
      },
      "image/jpeg",
      0.8
    );
  }, [onCapture, stopCamera, videoReady]);

  if (capturedPreview) {
    return (
      <div className="space-y-2">
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        <div className="relative rounded-lg overflow-hidden border">
          <img src={capturedPreview} alt="Captured" className="w-full h-40 object-cover" />
          <Button
            type="button"
            size="sm"
            variant="destructive"
            className="absolute top-2 right-2 gap-1"
            onClick={() => { onClear?.(); }}
          >
            <RotateCcw className="h-3 w-3" /> Retake
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-muted-foreground">{label}</p>
      {streaming ? (
        <div className="space-y-2">
          <div className="relative rounded-lg overflow-hidden border bg-black">
            <video ref={videoRef} autoPlay playsInline muted className="w-full h-40 object-cover" />
            {!videoReady && (
              <div className="absolute inset-0 flex items-center justify-center text-white text-sm">
                Loading camera...
              </div>
            )}
          </div>
          <div className="flex gap-2">
            <Button type="button" onClick={capture} size="sm" className="flex-1 gap-1" disabled={!videoReady}>
              <Check className="h-3.5 w-3.5" /> Capture
            </Button>
            <Button type="button" onClick={stopCamera} size="sm" variant="outline">
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <Button type="button" onClick={startCamera} variant="outline" size="sm" className="w-full gap-1.5">
          <Camera className="h-4 w-4" /> {label}
        </Button>
      )}
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
};

export default CameraCapture;
