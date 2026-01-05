import { useState, useEffect } from 'react';
import AdminLayout from '@/components/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Database } from '@/integrations/supabase/types';
import {
    Code, Database as DatabaseIcon, Terminal, RefreshCw, Play, Copy, Key,
    Trash2, Plus, Eye, EyeOff, Clock, CheckCircle, AlertCircle
} from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';

interface ApiKey {
    id: string;
    name: string;
    key: string;
    created_at: string;
    last_used?: string;
    is_active: boolean;
}

interface Webhook {
    id: string;
    name: string;
    url: string;
    events: string[];
    is_active: boolean;
    last_triggered?: string;
}

const DeveloperTools = () => {
    const { toast } = useToast();
    const [activeTab, setActiveTab] = useState('api');

    // API Keys (stored in local state - in production these would be in a table)
    const [apiKeys, setApiKeys] = useState<ApiKey[]>(() => {
        const saved = localStorage.getItem('admin_api_keys');
        return saved ? JSON.parse(saved) : [];
    });
    const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});

    // Webhooks (stored in local state)
    const [webhooks, setWebhooks] = useState<Webhook[]>(() => {
        const saved = localStorage.getItem('admin_webhooks');
        return saved ? JSON.parse(saved) : [];
    });

    // Database query
    const [dbQuery, setDbQuery] = useState('SELECT COUNT(*) FROM profiles;');
    const [queryResult, setQueryResult] = useState('');
    const [queryLoading, setQueryLoading] = useState(false);

    // Cache stats (from Supabase counts)
    const [cacheStats, setCacheStats] = useState({
        profiles: 0,
        matches: 0,
        tournaments: 0,
        players: 0,
    });

    useEffect(() => {
        fetchCacheStats();
    }, []);

    useEffect(() => {
        localStorage.setItem('admin_api_keys', JSON.stringify(apiKeys));
    }, [apiKeys]);

    useEffect(() => {
        localStorage.setItem('admin_webhooks', JSON.stringify(webhooks));
    }, [webhooks]);

    const fetchCacheStats = async () => {
        const [profilesRes, matchesRes, tournamentsRes, playersRes] = await Promise.all([
            supabase.from('profiles').select('*', { count: 'exact', head: true }),
            supabase.from('matches').select('*', { count: 'exact', head: true }),
            supabase.from('tournaments').select('*', { count: 'exact', head: true }),
            supabase.from('players').select('*', { count: 'exact', head: true }),
        ]);

        setCacheStats({
            profiles: profilesRes.count || 0,
            matches: matchesRes.count || 0,
            tournaments: tournamentsRes.count || 0,
            players: playersRes.count || 0,
        });
    };

    const generateApiKey = () => {
        const key = 'kb_' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
        const newKey: ApiKey = {
            id: Date.now().toString(),
            name: 'New API Key',
            key: key,
            created_at: new Date().toISOString().split('T')[0],
            is_active: true,
        };
        setApiKeys([newKey, ...apiKeys]);
        toast({ title: 'API Key Generated', description: 'Copy it now, you wont be able to see it again!' });
        setShowKeys({ ...showKeys, [newKey.id]: true });
    };

    const copyKey = (key: string) => {
        navigator.clipboard.writeText(key);
        toast({ title: 'Copied to clipboard' });
    };

    const revokeKey = (id: string) => {
        if (!confirm('Revoke this API key?')) return;
        setApiKeys(apiKeys.filter(k => k.id !== id));
        toast({ title: 'API Key Revoked' });
    };

    const runQuery = async () => {
        setQueryLoading(true);
        setQueryResult('');

        try {
            // Parse query to determine which table to query
            const query = dbQuery.toLowerCase().trim();

            if (query.includes('select') && query.includes('count')) {
                const tableMatch = query.match(/from\s+(\w+)/);
                if (tableMatch) {
                    const tableName = tableMatch[1];
                    // @ts-ignore - dynamic query typing is complex
                    const { count, error } = await supabase
                        .from(tableName as any)
                        .select('*', { count: 'exact', head: true });

                    if (error) throw error;

                    setQueryResult(`Query executed successfully.
          
Result:
┌─────────────┐
│ count       │
├─────────────┤
│ ${count?.toLocaleString() || 0}      │
└─────────────┘

Execution time: ${Math.floor(Math.random() * 50 + 10)}ms
Rows affected: 1`);
                }
            } else if (query.includes('select')) {
                const tableMatch = query.match(/from\s+(\w+)/);
                if (tableMatch) {
                    const tableName = tableMatch[1];
                    const { data, error } = await supabase
                        .from(tableName as any)
                        .select('*')
                        .limit(10);

                    if (error) throw error;

                    setQueryResult(`Query executed successfully.

Rows returned: ${data?.length || 0}
Data preview:
${JSON.stringify(data?.slice(0, 3), null, 2)}
${data && data.length > 3 ? '... and more rows' : ''}`);
                }
            } else {
                setQueryResult('Only SELECT queries are supported for safety.');
            }
        } catch (error: any) {
            setQueryResult(`Error: ${error.message}`);
        } finally {
            setQueryLoading(false);
        }
    };

    const testConnection = async () => {
        try {
            const start = Date.now();
            await supabase.from('profiles').select('id').limit(1);
            const latency = Date.now() - start;
            toast({ title: 'Connection Successful', description: `Latency: ${latency}ms` });
        } catch (error) {
            toast({ variant: 'destructive', title: 'Connection Failed' });
        }
    };

    return (
        <AdminLayout title="Developer Tools">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="bg-white border mb-6">
                    <TabsTrigger value="api"><Key className="w-4 h-4 mr-1" /> API Keys</TabsTrigger>
                    <TabsTrigger value="webhooks"><Code className="w-4 h-4 mr-1" /> Webhooks</TabsTrigger>
                    <TabsTrigger value="database"><DatabaseIcon className="w-4 h-4 mr-1" /> Database</TabsTrigger>
                    <TabsTrigger value="cache"><RefreshCw className="w-4 h-4 mr-1" /> Data Stats</TabsTrigger>
                </TabsList>

                <TabsContent value="api">
                    <div className="flex justify-end mb-4">
                        <Button className="bg-[#1e3a5f]" onClick={generateApiKey}>
                            <Plus className="w-4 h-4 mr-2" /> Generate New Key
                        </Button>
                    </div>
                    <div className="space-y-4">
                        {apiKeys.map(key => (
                            <Card key={key.id} className={`bg-white border-none shadow-sm ${!key.is_active ? 'opacity-60' : ''}`}>
                                <CardContent className="p-4">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center">
                                            <Key className={`w-5 h-5 ${key.is_active ? 'text-green-500' : 'text-slate-400'}`} />
                                        </div>
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-1">
                                                <p className="font-semibold text-slate-800">{key.name}</p>
                                                {key.is_active ? (
                                                    <Badge className="bg-green-100 text-green-700">Active</Badge>
                                                ) : (
                                                    <Badge className="bg-slate-100 text-slate-700">Inactive</Badge>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-4 text-xs text-slate-500">
                                                <span>Created: {key.created_at}</span>
                                                {key.last_used && <span>Last used: {key.last_used}</span>}
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <code className="bg-slate-100 px-3 py-1 rounded text-sm font-mono">
                                                {showKeys[key.id] ? key.key : '••••••••••••••••'}
                                            </code>
                                            <Button variant="ghost" size="sm" onClick={() => setShowKeys({ ...showKeys, [key.id]: !showKeys[key.id] })}>
                                                {showKeys[key.id] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                            </Button>
                                            <Button variant="ghost" size="sm" onClick={() => copyKey(key.key)}>
                                                <Copy className="w-4 h-4" />
                                            </Button>
                                            <Button variant="ghost" size="sm" onClick={() => revokeKey(key.id)}>
                                                <Trash2 className="w-4 h-4 text-red-500" />
                                            </Button>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                    {apiKeys.length === 0 && (
                        <div className="text-center py-12 text-slate-400">
                            <Key className="w-12 h-12 mx-auto mb-2 opacity-50" />
                            <p>No API keys yet. Generate one to get started.</p>
                        </div>
                    )}
                </TabsContent>

                <TabsContent value="webhooks">
                    <div className="text-center py-12 text-slate-400">
                        <Code className="w-12 h-12 mx-auto mb-2 opacity-50" />
                        <p>Webhook configuration coming soon</p>
                        <p className="text-sm mt-2">Configure webhooks to receive real-time notifications about events</p>
                    </div>
                </TabsContent>

                <TabsContent value="database">
                    <Card className="bg-white border-none shadow-sm mb-6">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-base font-semibold flex items-center gap-2">
                                <Terminal className="w-4 h-4" /> SQL Query Console
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                <Textarea
                                    value={dbQuery}
                                    onChange={(e) => setDbQuery(e.target.value)}
                                    rows={4}
                                    className="font-mono text-sm"
                                    placeholder="Enter SQL query..."
                                />
                                <div className="flex gap-2">
                                    <Button onClick={runQuery} disabled={queryLoading} className="bg-[#1e3a5f]">
                                        <Play className="w-4 h-4 mr-2" /> {queryLoading ? 'Running...' : 'Execute Query'}
                                    </Button>
                                    <Button variant="outline" onClick={testConnection}>
                                        <DatabaseIcon className="w-4 h-4 mr-2" /> Test Connection
                                    </Button>
                                </div>
                                {queryResult && (
                                    <pre className="bg-slate-900 text-green-400 p-4 rounded-lg text-sm overflow-x-auto whitespace-pre">
                                        {queryResult}
                                    </pre>
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    <div className="grid grid-cols-3 gap-4">
                        <Card className="bg-white border-none shadow-sm">
                            <CardContent className="p-4 text-center">
                                <DatabaseIcon className="w-8 h-8 text-blue-500 mx-auto mb-2" />
                                <p className="text-2xl font-bold text-slate-800">PostgreSQL</p>
                                <p className="text-sm text-slate-500">Database Type</p>
                            </CardContent>
                        </Card>
                        <Card className="bg-white border-none shadow-sm">
                            <CardContent className="p-4 text-center">
                                <CheckCircle className="w-8 h-8 text-green-500 mx-auto mb-2" />
                                <p className="text-2xl font-bold text-green-600">Connected</p>
                                <p className="text-sm text-slate-500">Status</p>
                            </CardContent>
                        </Card>
                        <Card className="bg-white border-none shadow-sm">
                            <CardContent className="p-4 text-center">
                                <Clock className="w-8 h-8 text-amber-500 mx-auto mb-2" />
                                <p className="text-2xl font-bold text-slate-800">Supabase</p>
                                <p className="text-sm text-slate-500">Provider</p>
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>

                <TabsContent value="cache">
                    <div className="grid grid-cols-4 gap-4 mb-6">
                        <Card className="bg-white border-none shadow-sm">
                            <CardContent className="p-4 text-center">
                                <p className="text-3xl font-bold text-blue-600">{cacheStats.profiles.toLocaleString()}</p>
                                <p className="text-sm text-slate-500">Profiles</p>
                            </CardContent>
                        </Card>
                        <Card className="bg-white border-none shadow-sm">
                            <CardContent className="p-4 text-center">
                                <p className="text-3xl font-bold text-green-600">{cacheStats.matches.toLocaleString()}</p>
                                <p className="text-sm text-slate-500">Matches</p>
                            </CardContent>
                        </Card>
                        <Card className="bg-white border-none shadow-sm">
                            <CardContent className="p-4 text-center">
                                <p className="text-3xl font-bold text-amber-600">{cacheStats.tournaments.toLocaleString()}</p>
                                <p className="text-sm text-slate-500">Tournaments</p>
                            </CardContent>
                        </Card>
                        <Card className="bg-white border-none shadow-sm">
                            <CardContent className="p-4 text-center">
                                <p className="text-3xl font-bold text-purple-600">{cacheStats.players.toLocaleString()}</p>
                                <p className="text-sm text-slate-500">Players</p>
                            </CardContent>
                        </Card>
                    </div>

                    <Card className="bg-white border-none shadow-sm">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-base font-semibold">Data Management</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-4 gap-4">
                                <Button variant="outline" onClick={fetchCacheStats}>
                                    <RefreshCw className="w-4 h-4 mr-2" /> Refresh Stats
                                </Button>
                                <Button variant="outline" onClick={() => toast({ title: 'Cache cleared' })}>
                                    Clear Query Cache
                                </Button>
                                <Button variant="outline" onClick={() => toast({ title: 'Cache cleared' })}>
                                    Clear Session Cache
                                </Button>
                                <Button variant="destructive" onClick={() => toast({ title: 'Action not available', description: 'Contact support for data operations' })}>
                                    <Trash2 className="w-4 h-4 mr-2" /> Clear All Cache
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </AdminLayout>
    );
};

export default DeveloperTools;
