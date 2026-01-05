import { useState } from 'react';
import AdminLayout from '@/components/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { Settings, Bell, Shield, Database, Palette, Users, Save, Moon, Sun } from 'lucide-react';

const AdminSettings = () => {
    const { toast } = useToast();

    const [settings, setSettings] = useState({
        darkMode: true,
        pushNotifications: true,
        emailNotifications: false,
        autoBackup: true,
        maintenanceMode: false,
        allowRegistration: true,
        requirePhoneVerification: true,
        allowGuestViewing: false,
    });

    const handleSave = () => {
        toast({ title: 'Settings Saved', description: 'Admin settings updated successfully' });
    };

    const toggleSetting = (key: keyof typeof settings) => {
        setSettings({ ...settings, [key]: !settings[key] });
    };

    return (
        <AdminLayout title="Settings">
            <div className="flex justify-end mb-6">
                <Button className="bg-[#1e3a5f]" onClick={handleSave}>
                    <Save className="w-4 h-4 mr-2" /> Save Changes
                </Button>
            </div>

            <div className="grid grid-cols-2 gap-6">
                {/* Appearance */}
                <Card className="bg-white border-none shadow-sm">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-base font-semibold text-slate-800 flex items-center gap-2">
                            <Palette className="w-4 h-4 text-purple-500" /> Appearance
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-center justify-between py-2">
                            <div className="flex items-center gap-3">
                                {settings.darkMode ? <Moon className="w-5 h-5 text-blue-500" /> : <Sun className="w-5 h-5 text-amber-500" />}
                                <div>
                                    <p className="text-sm font-medium text-slate-800">Dark Mode</p>
                                    <p className="text-xs text-slate-500">Use dark theme across admin</p>
                                </div>
                            </div>
                            <Switch checked={settings.darkMode} onCheckedChange={() => toggleSetting('darkMode')} />
                        </div>
                    </CardContent>
                </Card>

                {/* Notifications */}
                <Card className="bg-white border-none shadow-sm">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-base font-semibold text-slate-800 flex items-center gap-2">
                            <Bell className="w-4 h-4 text-amber-500" /> Notifications
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-center justify-between py-2">
                            <div>
                                <p className="text-sm font-medium text-slate-800">Push Notifications</p>
                                <p className="text-xs text-slate-500">Send push notifications to users</p>
                            </div>
                            <Switch checked={settings.pushNotifications} onCheckedChange={() => toggleSetting('pushNotifications')} />
                        </div>
                        <div className="flex items-center justify-between py-2">
                            <div>
                                <p className="text-sm font-medium text-slate-800">Email Notifications</p>
                                <p className="text-xs text-slate-500">Send email for important updates</p>
                            </div>
                            <Switch checked={settings.emailNotifications} onCheckedChange={() => toggleSetting('emailNotifications')} />
                        </div>
                    </CardContent>
                </Card>

                {/* Security */}
                <Card className="bg-white border-none shadow-sm">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-base font-semibold text-slate-800 flex items-center gap-2">
                            <Shield className="w-4 h-4 text-green-500" /> Security
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-center justify-between py-2">
                            <div>
                                <p className="text-sm font-medium text-slate-800">Allow Registration</p>
                                <p className="text-xs text-slate-500">New users can create accounts</p>
                            </div>
                            <Switch checked={settings.allowRegistration} onCheckedChange={() => toggleSetting('allowRegistration')} />
                        </div>
                        <div className="flex items-center justify-between py-2">
                            <div>
                                <p className="text-sm font-medium text-slate-800">Phone Verification</p>
                                <p className="text-xs text-slate-500">Require phone verification</p>
                            </div>
                            <Switch checked={settings.requirePhoneVerification} onCheckedChange={() => toggleSetting('requirePhoneVerification')} />
                        </div>
                        <div className="flex items-center justify-between py-2">
                            <div>
                                <p className="text-sm font-medium text-slate-800">Guest Viewing</p>
                                <p className="text-xs text-slate-500">Allow guests to view matches</p>
                            </div>
                            <Switch checked={settings.allowGuestViewing} onCheckedChange={() => toggleSetting('allowGuestViewing')} />
                        </div>
                    </CardContent>
                </Card>

                {/* System */}
                <Card className="bg-white border-none shadow-sm">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-base font-semibold text-slate-800 flex items-center gap-2">
                            <Database className="w-4 h-4 text-blue-500" /> System
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-center justify-between py-2">
                            <div>
                                <p className="text-sm font-medium text-slate-800">Auto Backup</p>
                                <p className="text-xs text-slate-500">Daily automatic database backups</p>
                            </div>
                            <Switch checked={settings.autoBackup} onCheckedChange={() => toggleSetting('autoBackup')} />
                        </div>
                        <div className="flex items-center justify-between py-2">
                            <div>
                                <p className="text-sm font-medium text-red-600">Maintenance Mode</p>
                                <p className="text-xs text-slate-500">Disable app access for all users</p>
                            </div>
                            <Switch checked={settings.maintenanceMode} onCheckedChange={() => toggleSetting('maintenanceMode')} />
                        </div>
                    </CardContent>
                </Card>

                {/* Admin Roles */}
                <Card className="bg-white border-none shadow-sm col-span-2">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-base font-semibold text-slate-800 flex items-center gap-2">
                            <Users className="w-4 h-4 text-pink-500" /> Admin Roles
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-5 gap-4">
                            {[
                                { role: 'Super Admin', desc: 'Full access', color: 'bg-red-100 text-red-700' },
                                { role: 'Tournament Admin', desc: 'Own tournaments', color: 'bg-purple-100 text-purple-700' },
                                { role: 'Scorer', desc: 'Scoreboard only', color: 'bg-blue-100 text-blue-700' },
                                { role: 'Content Mod', desc: 'Feed moderation', color: 'bg-pink-100 text-pink-700' },
                                { role: 'Support', desc: 'User reports', color: 'bg-green-100 text-green-700' },
                            ].map((item) => (
                                <div key={item.role} className={`${item.color} p-4 rounded-lg text-center`}>
                                    <p className="font-semibold text-sm">{item.role}</p>
                                    <p className="text-xs opacity-70 mt-1">{item.desc}</p>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </AdminLayout>
    );
};

export default AdminSettings;
