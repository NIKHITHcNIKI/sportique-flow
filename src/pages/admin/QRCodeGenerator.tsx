import { useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Download, QrCode, Copy, Check } from "lucide-react";
import { toast } from "@/components/ui/sonner";

const QRCodeGenerator = () => {
  const baseUrl = window.location.origin;
  const [customUrl, setCustomUrl] = useState(`${baseUrl}/login`);
  const [copied, setCopied] = useState(false);

  const presetLinks = [
    { label: "Student Login", url: `${baseUrl}/login` },
    { label: "Student Register", url: `${baseUrl}/register` },
    { label: "Browse Equipment", url: `${baseUrl}/student/browse` },
  ];

  const handleDownload = () => {
    const svg = document.getElementById("qr-code-svg");
    if (!svg) return;

    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const img = new Image();

    img.onload = () => {
      canvas.width = 512;
      canvas.height = 512;
      ctx!.fillStyle = "#ffffff";
      ctx!.fillRect(0, 0, 512, 512);
      ctx!.drawImage(img, 0, 0, 512, 512);
      const pngUrl = canvas.toDataURL("image/png");
      const link = document.createElement("a");
      link.download = "sports-equip-qr.png";
      link.href = pngUrl;
      link.click();
    };

    img.src = "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(svgData)));
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(customUrl);
    setCopied(true);
    toast.success("Link copied!");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-5xl text-secondary" style={{ fontFamily: "'Bebas Neue', sans-serif" }}>
            QR CODE GENERATOR
          </h1>
          <p className="text-muted-foreground mt-1">
            Generate QR codes for students to scan and access the system
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* QR Code Preview */}
          <Card className="border-0 shadow-lg">
            <CardContent className="p-8 flex flex-col items-center gap-6">
              <div className="bg-white p-6 rounded-2xl shadow-inner">
                <QRCodeSVG
                  id="qr-code-svg"
                  value={customUrl}
                  size={256}
                  level="H"
                  includeMargin
                />
              </div>
              <p className="text-sm text-muted-foreground text-center break-all max-w-xs">
                {customUrl}
              </p>
              <Button onClick={handleDownload} className="w-full max-w-xs gap-2 font-semibold">
                <Download className="h-4 w-4" />
                Download QR Code
              </Button>
            </CardContent>
          </Card>

          {/* Settings */}
          <div className="space-y-4">
            <Card className="border-0 shadow-lg">
              <CardContent className="p-6 space-y-4">
                <h3 className="text-lg font-bold flex items-center gap-2">
                  <QrCode className="h-5 w-5 text-primary" />
                  Quick Links
                </h3>
                <div className="space-y-2">
                  {presetLinks.map((link) => (
                    <Button
                      key={link.url}
                      variant={customUrl === link.url ? "default" : "outline"}
                      className="w-full justify-start font-medium"
                      onClick={() => setCustomUrl(link.url)}
                    >
                      {link.label}
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg">
              <CardContent className="p-6 space-y-4">
                <h3 className="text-lg font-bold">Custom URL</h3>
                <div className="flex gap-2">
                  <Input
                    value={customUrl}
                    onChange={(e) => setCustomUrl(e.target.value)}
                    placeholder="Enter URL..."
                    className="h-11"
                  />
                  <Button variant="outline" size="icon" className="h-11 w-11 shrink-0" onClick={handleCopy}>
                    {copied ? <Check className="h-4 w-4 text-primary" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg bg-primary/5">
              <CardContent className="p-6 space-y-2">
                <h3 className="text-lg font-bold">How it works</h3>
                <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
                  <li>Generate a QR code for the login or register page</li>
                  <li>Students scan the QR code with their phone</li>
                  <li>New students register, existing students login</li>
                  <li>After login, students can browse & borrow equipment</li>
                </ol>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default QRCodeGenerator;
