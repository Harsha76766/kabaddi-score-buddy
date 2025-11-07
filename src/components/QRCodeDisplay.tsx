import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";

interface QRCodeDisplayProps {
  value: string;
  size?: number;
}

export const QRCodeDisplay = ({ value, size = 256 }: QRCodeDisplayProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isGenerated, setIsGenerated] = useState(false);

  useEffect(() => {
    if (canvasRef.current && value) {
      QRCode.toCanvas(
        canvasRef.current,
        value,
        {
          width: size,
          margin: 2,
          color: {
            dark: '#000000',
            light: '#FFFFFF',
          },
        },
        (error) => {
          if (error) {
            console.error('QR Code generation error:', error);
          } else {
            setIsGenerated(true);
          }
        }
      );
    }
  }, [value, size]);

  const handleDownload = () => {
    if (canvasRef.current) {
      const url = canvasRef.current.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = 'qr-code.png';
      link.href = url;
      link.click();
    }
  };

  return (
    <div className="flex flex-col items-center space-y-4">
      <div className="p-4 bg-white rounded-lg shadow-lg">
        <canvas ref={canvasRef} />
      </div>
      {isGenerated && (
        <Button onClick={handleDownload} variant="outline" size="sm" className="gap-2">
          <Download className="h-4 w-4" />
          Download QR Code
        </Button>
      )}
    </div>
  );
};
