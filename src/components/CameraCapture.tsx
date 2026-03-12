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
  const [streaming, setStreaming] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);

  const startCamera = useCallback(async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        videoRef.current.play();
      }
      setStream(mediaStream);
      setStreaming(true);
    } catch {
      alert("Camera access denied. Please allow camera access to take photos.");
    }
  }, []);

  const stopCamera = useCallback(() => {
    stream?.getTracks().forEach((t) => t.stop());
    setStream(null);
    setStreaming(false);
  }, [stream]);

  const capture = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0);
    canvas.toBlob((blob) => {
      if (blob) onCapture(blob);
      stopCamera();
    }, "image/jpeg", 0.8);
  }, [onCapture, stopCamera]);

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
          </div>
          <div className="flex gap-2">
            <Button type="button" onClick={capture} size="sm" className="flex-1 gap-1">
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
