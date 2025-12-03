/** @type {import('next').NextConfig} */
const isTurbopack = process.env.TURBOPACK === '1';

const nextConfig = {
    images: {
        unoptimized: true,
        remotePatterns: [
            { protocol: 'https', hostname: 'path.to' },
            { protocol: 'https', hostname: 'anilibria.top' },
            { protocol: 'https', hostname: 'via.placeholder.com' },
            { protocol: 'http', hostname: 'localhost' },
            { protocol: 'https', hostname: 'anicat2.storage.yandexcloud.net' },
            { protocol: 'https', hostname: 'storage.yandexcloud.net' },
            { protocol: 'https', hostname: 'server.yumeko.ru' },
            { protocol: 'https', hostname: 'server2.yumeko.ru' },
            { protocol: 'https', hostname: 'server3.yumeko.ru' },
        ],
    },
    env: {
        NEXT_PUBLIC_API_SERVER: process.env.NEXT_PUBLIC_API_SERVER,
        NEXT_PUBLIC_FRONTEND_URL: process.env.NEXT_PUBLIC_FRONTEND_URL,
        NEXT_PUBLIC_S3_ENDPOINT: process.env.NEXT_PUBLIC_S3_ENDPOINT,
        NEXT_PUBLIC_DEBUG: process.env.NEXT_PUBLIC_DEBUG,
    },
    // Убираем webpack-конфиг при использовании Turbopack
    ...(isTurbopack ? {} : {
        webpack: (config, { dev, isServer }) => {
            if (dev && !isServer) {
                config.watchOptions = {
                    poll: 1000,
                    aggregateTimeout: 300,
                    ignored: /node_modules/,
                };
            }
            // Добавляем наблюдение за SCSS при стандартном вебпаке (на всякий случай)
            config.module = config.module || {};
            config.module.rules = config.module.rules || [];
            // Ничего не меняем по SCSS-лоадерам — сборка выполняется отдельным watcher'ом из package.json
            return config;
        }
    }),
};

module.exports = nextConfig;
