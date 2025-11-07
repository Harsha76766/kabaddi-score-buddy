import { useEffect, useState } from "react";
import { Scanner } from "@yudiel/react-qr-scanner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Camera } from "lucide-react";

interface QRScannerProps {
  onScan: (result: string) => void;
  onError?: (error: string) => void;
}

export const QRScanner = ({ onScan, onError }: QRScannerProps) => {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [error, setError] = useState<string>("");

  useEffect(() => {
    // Check for camera permissions
    navigator.mediaDevices
      .getUserMedia({ video: true })
      .then(() => setHasPermission(true))
      .catch((err) => {
        setHasPermission(false);
        const errorMsg = "Camera access denied. Please enable camera permissions in your browser settings.";
        setError(errorMsg);
        onError?.(errorMsg);
      });
  }, [onError]);

  if (hasPermission === null) {
    return (
      <div className="flex flex-col items-center justify-center py-8 space-y-4">
        <Camera className="h-12 w-12 animate-pulse text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Requesting camera access...</p>
      </div>
    );
  }

  if (hasPermission === false) {
    return (
      <Alert variant="destructive">
        <AlertDescription>
          {error}
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg overflow-hidden border-2 border-primary">
        <Scanner
          onScan={(result) => {
            if (result && result[0]?.rawValue) {
              onScan(result[0].rawValue);
            }
          }}
          onError={(error: Error | unknown) => {
            const errorMsg = error instanceof Error ? error.message : "Failed to scan QR code";
            setError(errorMsg);
            onError?.(errorMsg);
          }}
          styles={{
            container: {
              width: '100%',
              paddingTop: '100%',
              position: 'relative',
            },
            video: {
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              objectFit: 'cover',
            },
          }}
        />
      </div>
      <p className="text-sm text-muted-foreground text-center">
        Position the QR code within the frame to scan
      </p>
    </div>
  );
};
