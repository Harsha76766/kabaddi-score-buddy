import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, QrCode, Camera, Check, AlertCircle, Loader2 } from "lucide-react";

interface QRData {
    type: 'team_invite' | 'player_registration';
    teamId?: string;
    teamName?: string;
    inviteCode?: string;
}

const ScanQR = () => {
    const navigate = useNavigate();
    const { toast } = useToast();
    const [hasPermission, setHasPermission] = useState<boolean | null>(null);
    const [scanning, setScanning] = useState(true);
    const [processing, setProcessing] = useState(false);
    const [result, setResult] = useState<QRData | null>(null);
    const [error, setError] = useState<string>("");
    const [joinStatus, setJoinStatus] = useState<'idle' | 'joining' | 'success' | 'error'>('idle');
    const [ScannerComponent, setScannerComponent] = useState<any>(null);
    const [debugInfo, setDebugInfo] = useState<string>("");

    // Dynamically import Scanner to avoid SSR/type issues
    useEffect(() => {
        import("@yudiel/react-qr-scanner").then((mod) => {
            setScannerComponent(() => mod.Scanner);
        }).catch((err) => {
            console.error("Failed to load QR scanner:", err);
            setError("Failed to load QR scanner");
        });
    }, []);

    useEffect(() => {
        // Try multiple camera configurations for better mobile support
        const tryCamera = async () => {
            const configs = [
                { video: { facingMode: { ideal: 'environment' } } },
                { video: { facingMode: 'environment' } },
                { video: { facingMode: 'user' } },
                { video: true },
            ];

            for (const config of configs) {
                try {
                    const stream = await navigator.mediaDevices.getUserMedia(config);
                    stream.getTracks().forEach(track => track.stop());
                    setHasPermission(true);
                    console.log('Camera access granted with config:', config);
                    return;
                } catch (err) {
                    console.log('Camera config failed:', config, err);
                    continue;
                }
            }

            setError("Camera access denied or not available. Please enable camera permissions in your browser settings.");
            setHasPermission(false);
        };

        tryCamera();
    }, []);

    const parseQRData = useCallback((rawData: string): QRData | null => {
        console.log("Parsing QR data:", rawData);
        setDebugInfo(rawData.substring(0, 100));

        // Try 1: Parse as JSON (for JSON-formatted QR codes)
        try {
            const data = JSON.parse(rawData);
            if (data.type === 'team_invite' && data.teamId) {
                return data;
            }
            if (data.teamId) {
                return { type: 'team_invite', teamId: data.teamId };
            }
        } catch {
            // Not JSON, continue
        }

        // Try 2: Parse as URL with various param names
        try {
            // Handle both full URLs and hash URLs
            let url: URL;
            if (rawData.includes('://')) {
                url = new URL(rawData);
            } else if (rawData.startsWith('/')) {
                url = new URL(rawData, 'http://dummy.com');
            } else {
                throw new Error('Not a URL');
            }

            // Check for team parameter (from AddPlayerDialog format: /join-team?code=X&team=Y)
            const teamId = url.searchParams.get('team') || url.searchParams.get('teamId') || url.searchParams.get('t');
            const inviteCode = url.searchParams.get('code') || url.searchParams.get('invite') || url.searchParams.get('c');

            if (teamId) {
                console.log("Found teamId:", teamId);
                return {
                    type: 'team_invite',
                    teamId,
                    inviteCode: inviteCode || undefined
                };
            }

            // Check in hash params (for hash router URLs like /#/join-team?...)
            if (url.hash) {
                const hashUrl = new URL(url.hash.slice(1), 'http://dummy.com');
                const hashTeamId = hashUrl.searchParams.get('team') || hashUrl.searchParams.get('teamId');
                if (hashTeamId) {
                    return { type: 'team_invite', teamId: hashTeamId };
                }
            }
        } catch (e) {
            console.log("URL parse error:", e);
        }

        // Try 3: Extract UUID directly if it looks like one
        const uuidRegex = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;
        const uuidMatch = rawData.match(uuidRegex);
        if (uuidMatch) {
            console.log("Found UUID in data:", uuidMatch[0]);
            return { type: 'team_invite', teamId: uuidMatch[0] };
        }

        // Try 4: If it contains 'team=' anywhere, extract it
        const teamMatch = rawData.match(/[?&]team=([^&\s]+)/i);
        if (teamMatch) {
            console.log("Found team param:", teamMatch[1]);
            return { type: 'team_invite', teamId: teamMatch[1] };
        }

        console.log("Could not parse QR data");
        return null;
    }, []);

    const handleJoinTeam = async (teamId: string) => {
        setJoinStatus('joining');

        try {
            const { data: { user }, error: authError } = await supabase.auth.getUser();
            if (authError || !user) {
                throw new Error("You must be logged in to join a team");
            }

            const { data: profile, error: profileError } = await supabase
                .from('profiles')
                .select('id, name, phone')
                .eq('id', user.id)
                .single();

            if (profileError || !profile) {
                throw new Error("Profile not found. Please complete your profile first.");
            }

            const { data: team, error: teamError } = await supabase
                .from('teams')
                .select('id, name')
                .eq('id', teamId)
                .single();

            if (teamError || !team) {
                throw new Error("Team not found. The invite may be expired.");
            }

            // @ts-ignore - avoid deep type instantiation
            const { data: existingPlayer } = await (supabase
                .from('players')
                .select('id, team_id')
                .eq('user_id', user.id)
                .maybeSingle() as any);

            if (existingPlayer?.team_id === teamId) {
                throw new Error("You are already a member of this team!");
            }

            if (existingPlayer) {
                const { error: updateError } = await supabase
                    .from('players')
                    .update({ team_id: teamId })
                    .eq('id', existingPlayer.id);
                if (updateError) throw updateError;
            } else {
                const { error: insertError } = await supabase
                    .from('players')
                    .insert({
                        user_id: user.id,
                        name: profile.name,
                        phone: profile.phone,
                        team_id: teamId,
                    });
                if (insertError) throw insertError;
            }

            setJoinStatus('success');
            setResult(prev => prev ? { ...prev, teamName: team.name } : { type: 'team_invite', teamName: team.name });
            toast({ title: "🎉 Joined Team!", description: `Welcome to ${team.name}!` });

            setTimeout(() => navigate(`/teams/${teamId}`), 2000);
        } catch (err: any) {
            console.error("Join team error:", err);
            setJoinStatus('error');
            setError(err.message || "Failed to join team");
            toast({ variant: "destructive", title: "Failed to Join", description: err.message });
        }
    };

    const handleScan = useCallback((scanResult: any) => {
        if (!scanResult || processing) return;

        const rawData = scanResult[0]?.rawValue;
        if (!rawData) return;

        console.log("Scanned raw data:", rawData);
        setScanning(false);
        setProcessing(true);

        const qrData = parseQRData(rawData);
        if (!qrData || !qrData.teamId) {
            setError(`Could not find team info in QR code.\n\nScanned: ${rawData.substring(0, 80)}...`);
            setProcessing(false);
            return;
        }

        setResult(qrData);
        handleJoinTeam(qrData.teamId);
    }, [processing, parseQRData]);

    const resetScanner = () => {
        setScanning(true);
        setProcessing(false);
        setResult(null);
        setError("");
        setJoinStatus('idle');
        setDebugInfo("");
    };

    if (hasPermission === null || !ScannerComponent) {
        return (
            <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center text-white p-6">
                <Camera className="h-16 w-16 animate-pulse mb-4" />
                <p className="text-lg font-medium text-center">
                    {!ScannerComponent ? "Loading scanner..." : "Requesting camera access..."}
                </p>
                <p className="text-white/50 text-sm mt-2 text-center">
                    Please allow camera access when prompted
                </p>
            </div>
        );
    }

    if (hasPermission === false) {
        return (
            <div className="min-h-screen bg-slate-50 p-6">
                <Button variant="ghost" onClick={() => navigate(-1)} className="mb-6">
                    <ArrowLeft className="w-5 h-5 mr-2" /> Back
                </Button>
                <Card className="rounded-3xl border-0 shadow-lg">
                    <CardContent className="p-8 text-center">
                        <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
                        <h2 className="text-xl font-bold text-slate-900 mb-2">Camera Access Required</h2>
                        <p className="text-slate-500 mb-4">{error}</p>
                        <p className="text-slate-400 text-sm mb-6">
                            On mobile, please check your browser settings and ensure camera permissions are enabled for this site.
                        </p>
                        <Button onClick={() => window.location.reload()} className="rounded-2xl">
                            Try Again
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    if (joinStatus === 'success') {
        return (
            <div className="min-h-screen bg-gradient-to-b from-green-400 to-green-600 flex flex-col items-center justify-center p-6">
                <div className="w-28 h-28 bg-white rounded-full flex items-center justify-center mb-6 shadow-2xl animate-bounce">
                    <Check className="w-14 h-14 text-green-500" />
                </div>
                <h1 className="text-3xl font-black text-white mb-2">You're In!</h1>
                <p className="text-white/90 text-center text-lg">
                    Welcome to <span className="font-bold">{result?.teamName}</span>
                </p>
                <p className="text-white/60 text-sm mt-6 flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Redirecting to team...
                </p>
            </div>
        );
    }

    const Scanner = ScannerComponent;

    return (
        <div className="min-h-screen bg-slate-900 flex flex-col">
            {/* Header */}
            <div className="p-4 flex items-center gap-4 bg-black/30">
                <Button
                    variant="ghost"
                    onClick={() => navigate(-1)}
                    className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 p-0 text-white"
                >
                    <ArrowLeft className="w-5 h-5" />
                </Button>
                <h1 className="text-white font-black text-lg uppercase tracking-tight flex items-center gap-2">
                    <QrCode className="w-5 h-5 text-orange-500" />
                    Scan Team Invite
                </h1>
            </div>

            {/* Scanner Area */}
            <div className="flex-1 flex flex-col items-center justify-center p-4">
                {scanning && !error ? (
                    <div className="w-full max-w-sm">
                        <div className="relative rounded-3xl overflow-hidden border-4 border-orange-500 shadow-2xl shadow-orange-500/30">
                            <Scanner
                                onScan={handleScan}
                                onError={(err: any) => {
                                    console.error('Scanner error:', err);
                                    // Don't show constraint errors
                                    if (err?.message && !err.message.includes('constraint')) {
                                        setError(err.message);
                                    }
                                }}
                                scanDelay={500}
                                styles={{
                                    container: { width: '100%', paddingTop: '100%', position: 'relative' as const },
                                    video: { position: 'absolute' as const, top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover' as const },
                                }}
                            />
                            {/* Corner overlays */}
                            <div className="absolute inset-0 pointer-events-none">
                                <div className="absolute inset-12 border-2 border-white/40 rounded-2xl"></div>
                                <div className="absolute top-12 left-12 w-8 h-8 border-t-4 border-l-4 border-orange-400 rounded-tl-xl"></div>
                                <div className="absolute top-12 right-12 w-8 h-8 border-t-4 border-r-4 border-orange-400 rounded-tr-xl"></div>
                                <div className="absolute bottom-12 left-12 w-8 h-8 border-b-4 border-l-4 border-orange-400 rounded-bl-xl"></div>
                                <div className="absolute bottom-12 right-12 w-8 h-8 border-b-4 border-r-4 border-orange-400 rounded-br-xl"></div>
                                <div className="absolute inset-x-12 top-1/2 h-0.5 bg-orange-500/50 animate-pulse"></div>
                            </div>
                        </div>
                        <p className="text-white/60 text-center mt-6 text-sm">
                            Point your camera at a team invite QR code
                        </p>
                    </div>
                ) : processing ? (
                    <div className="text-center">
                        <div className="w-20 h-20 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                        <p className="text-white font-medium text-lg">
                            {joinStatus === 'joining' ? 'Joining team...' : 'Processing QR...'}
                        </p>
                    </div>
                ) : error ? (
                    <Card className="w-full max-w-sm rounded-3xl border-0 shadow-lg">
                        <CardContent className="p-6 text-center">
                            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                            <h2 className="text-lg font-bold text-slate-900 mb-2">Scan Failed</h2>
                            <p className="text-slate-500 text-sm mb-4 whitespace-pre-wrap">{error}</p>
                            <Button onClick={resetScanner} className="w-full rounded-2xl bg-orange-600 hover:bg-orange-700">
                                Scan Again
                            </Button>
                        </CardContent>
                    </Card>
                ) : null}
            </div>

            {/* Bottom info */}
            <div className="p-6 text-center space-y-2">
                <p className="text-white/40 text-xs">
                    Don't have a QR code? Ask your team captain to generate one
                </p>
                <p className="text-white/30 text-[10px]">
                    Go to Team → Add Player → QR Tab → Generate QR
                </p>
            </div>
        </div>
    );
};

export default ScanQR;
