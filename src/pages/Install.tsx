import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Download, Share, Smartphone, CheckCircle } from "lucide-react";
import collegeLogo from "@/assets/college-logo.png";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const Install = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    const ua = navigator.userAgent;
    setIsIOS(/iPad|iPhone|iPod/.test(ua) && !(window as any).MSStream);

    if (window.matchMedia("(display-mode: standalone)").matches) {
      setIsInstalled(true);
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", handler);
    window.addEventListener("appinstalled", () => setIsInstalled(true));

    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") setIsInstalled(true);
    setDeferredPrompt(null);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-secondary p-4">
      <Card className="w-full max-w-md border-0 shadow-2xl bg-card">
        <CardHeader className="text-center pb-4">
          <div className="mx-auto mb-4 w-20 h-20 rounded-full overflow-hidden shadow-lg">
            <img src={collegeLogo} alt="SET Institutions Logo" className="w-full h-full object-contain" />
          </div>
          <CardTitle className="text-3xl text-secondary tracking-widest" style={{ fontFamily: "'Bebas Neue', sans-serif" }}>
            INSTALL APP
          </CardTitle>
          <CardDescription>Install Sports Equip on your phone</CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {isInstalled ? (
            <div className="text-center space-y-3">
              <CheckCircle className="h-16 w-16 text-green-500 mx-auto" />
              <p className="text-lg font-semibold text-foreground">App is already installed!</p>
              <p className="text-muted-foreground text-sm">Open it from your home screen.</p>
            </div>
          ) : isIOS ? (
            <div className="space-y-4">
              <p className="text-center font-medium text-foreground">To install on iPhone/iPad:</p>
              <div className="space-y-3">
                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted">
                  <Share className="h-6 w-6 text-primary shrink-0" />
                  <span className="text-sm">1. Tap the <strong>Share</strong> button in Safari</span>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted">
                  <Download className="h-6 w-6 text-primary shrink-0" />
                  <span className="text-sm">2. Scroll down and tap <strong>"Add to Home Screen"</strong></span>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted">
                  <Smartphone className="h-6 w-6 text-primary shrink-0" />
                  <span className="text-sm">3. Tap <strong>"Add"</strong> to confirm</span>
                </div>
              </div>
            </div>
          ) : deferredPrompt ? (
            <div className="text-center space-y-4">
              <Smartphone className="h-16 w-16 text-primary mx-auto" />
              <p className="text-muted-foreground">Install this app on your device for quick access.</p>
              <Button onClick={handleInstall} className="w-full h-12 text-lg font-semibold gap-2">
                <Download className="h-5 w-5" />
                Install App
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-center font-medium text-foreground">To install on Android:</p>
              <div className="space-y-3">
                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted">
                  <span className="text-sm">1. Open this page in <strong>Chrome</strong></span>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted">
                  <span className="text-sm">2. Tap the <strong>⋮ menu</strong> (top right)</span>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted">
                  <span className="text-sm">3. Tap <strong>"Install app"</strong> or <strong>"Add to Home screen"</strong></span>
                </div>
              </div>
            </div>
          )}

          <Button variant="outline" className="w-full" onClick={() => window.location.href = "/"}>
            Go to Login
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default Install;
