import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { App, URLOpenListenerEvent } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';

const AppUrlListener: React.FC = () => {
    const navigate = useNavigate();

    useEffect(() => {
        if (!Capacitor.isNativePlatform()) {
            return;
        }

        App.addListener('appUrlOpen', (event: URLOpenListenerEvent) => {
            // Example url: https://www.only20.shop/#/tournaments/123
            // We need to extract the path after the domain or after the hash if using HashRouter

            const slug = event.url.split('.shop').pop();
            if (slug) {
                // If we use HashRouter, the URL will look like https://www.only20.shop/#/path
                // Capacitor might give us the full URL.
                const hashPath = slug.includes('#') ? slug.split('#')[1] : slug;

                if (hashPath) {
                    navigate(hashPath);
                }
            }
        });
    }, [navigate]);

    return null;
};

export default AppUrlListener;
