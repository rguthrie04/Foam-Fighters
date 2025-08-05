import { defineConfig } from 'vite'

export default defineConfig({
  root: '.',
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: true,
    rollupOptions: {
      input: {
        main: './index.html',
        contact: './contact.html',
        gallery: './gallery.html',
        'case-studies': './case-studies.html',
        'mortgage-insurance': './mortgage-insurance.html',
        'removal-process': './removal-process.html',
        'spf-guide': './spf-guide.html',
        'why-spf-problem': './why-spf-problem.html'
      }
    }
  },
  server: {
    port: 3001,
    host: true,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:5001',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, '/foam-fighters-2700b/europe-west2/api'),
        secure: false,
        configure: (proxy, options) => {
          proxy.on('error', (err, req, res) => {
            console.log('Proxy error:', err);
          });
          proxy.on('proxyReq', (proxyReq, req, res) => {
            console.log('Sending Request:', req.method, req.url);
          });
          proxy.on('proxyRes', (proxyRes, req, res) => {
            console.log('Received Response:', proxyRes.statusCode, req.url);
          });
        }
      }
    }
  },
  preview: {
    port: 3001,
    host: true
  }
})