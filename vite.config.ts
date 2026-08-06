import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [
        react(),
        VitePWA({
          registerType: 'autoUpdate',
          includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'masked-icon.svg'],
          manifest: {
            name: '백년서원 강사 확인서',
            short_name: '강사 확인서',
            description: '모바일에서 평생교육 프로그램 모니터링 보고서를 작성하는 앱',
            theme_color: '#004aad',
            background_color: '#ffffff',
            display: 'standalone',
            icons: [
              {
                src: 'https://fonts.gstatic.com/s/i/short-term/release/googlesymbols/assignment/default/192px.svg',
                sizes: '192x192',
                type: 'image/svg+xml'
              },
              {
                src: 'https://fonts.gstatic.com/s/i/short-term/release/googlesymbols/assignment/default/512px.svg',
                sizes: '512x512',
                type: 'image/svg+xml'
              }
            ]
          }
        })
      ],
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
