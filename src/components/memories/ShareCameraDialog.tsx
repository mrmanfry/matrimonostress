import { useState, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Copy, Check, Download } from "lucide-react";
import QRCode from "react-qr-code";
import html2canvas from "html2canvas";

interface ShareCameraDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cameraUrl: string;
}

export default function ShareCameraDialog({
  open,
  onOpenChange,
  cameraUrl,
}: ShareCameraDialogProps) {
  const [copied, setCopied] = useState(false);
  const qrRef = useRef<HTMLDivElement>(null);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(cameraUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadQR = async () => {
    if (!qrRef.current) return;
    try {
      const canvas = await html2canvas(qrRef.current, {
        backgroundColor: "#ffffff",
        scale: 3,
      });
      const link = document.createElement("a");
      link.download = "memories-reel-qr.png";
      link.href = canvas.toDataURL("image/png");
      link.click();
    } catch (err) {
      console.error("QR download error:", err);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Condividi il Rullino</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col items-center gap-4">
          <p className="text-sm text-muted-foreground text-center">
            Stampa questo QR code e posizionalo sui tavoli, oppure condividi il
            link con i tuoi ospiti.
          </p>

          {/* QR Code */}
          <div
            ref={qrRef}
            className="bg-white p-6 rounded-xl"
          >
            <QRCode value={cameraUrl} size={200} level="M" />
            <p className="text-center text-xs text-gray-500 mt-3 font-mono">
              📷 Scansiona per scattare!
            </p>
          </div>

          {/* Link */}
          <div className="flex gap-2 w-full">
            <Input value={cameraUrl} readOnly className="text-xs" />
            <Button
              variant="outline"
              size="icon"
              onClick={handleCopy}
            >
              {copied ? <Check size={16} /> : <Copy size={16} />}
            </Button>
          </div>

          {/* Download button */}
          <Button
            variant="outline"
            className="w-full gap-2"
            onClick={handleDownloadQR}
          >
            <Download size={16} />
            Scarica QR Code
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
