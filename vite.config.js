import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// While developing, the site asks for /api/... on http://localhost:3000 and Vite forwards it to
// the backend, so the login cookie is simply "same site". Where it goes:
//   default                      http://localhost:5000   (your own backend: npm run server)
//   VITE_API_PROXY=https://...   a deployed backend, for example the live Render site, so you can
//                                work on the website without running the backend or MongoDB
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const target = env.VITE_API_PROXY || 'http://localhost:5000';
  const isLocal = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?(\/|$)/.test(target);

  return {
    plugins: [react()],
    server: {
      port: 3000,
      proxy: {
        '/api': {
          target,
          changeOrigin: true,
          configure(proxy) {
            // The deployed server only accepts writes whose Origin is its own address.
            // Present the dev proxy's requests as coming from there.
            if (!isLocal) {
              proxy.on('proxyReq', (proxyReq) => proxyReq.setHeader('origin', new URL(target).origin));
            }
          },
        },
      },
    },
  };
});
