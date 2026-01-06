import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';

const AppUrlListener: React.FC = () => {
    const navigate = useNavigate();

    useEffect(() => {
        const setupListener = async () => {
            if (!Capacitor.isNativePlatform()) {
                return;
            }

            try {
                const { App } = await import('@capacitor/app');
                App.addListener('appUrlOpen', (event: any) => {
                    const slug = event.url.split('.shop').pop();
                    if (slug) {
                        const hashPath = slug.includes('#') ? slug.split('#')[1] : slug;
                        if (hashPath) {
                            navigate(hashPath);
                        }
                    }
                });
            } catch (error) {
                console.error('Failed to setup AppUrlListener:', error);
            }
        };

        setupListener();
    }, [navigate]);

    return null;
};

export default AppUrlListener;
