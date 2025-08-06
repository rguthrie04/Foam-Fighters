import { defineConfig } from 'vite'

export default defineConfig({
  root: '.',
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: true,
    // Performance optimizations
    target: 'es2018',
    minify: 'esbuild', // Use esbuild for faster builds
    // Remove console.logs in production via esbuild
    esbuild: {
      drop: ['console', 'debugger']
    },
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
      },
      output: {
        // Code splitting and chunk optimization
        manualChunks: {
          // Firebase will be bundled automatically
          // vendor: ['firebase'], // Commented out due to Firebase v10+ module issues
          // bootstrap: [], // Will be loaded from CDN
        },
        // File naming with hash for automatic cache busting
        chunkFileNames: 'assets/js/[name]-[hash].js',
        entryFileNames: 'assets/js/[name]-[hash].js',
        assetFileNames: 'assets/[ext]/[name]-[hash].[ext]'
      }
    },
    // Enable gzip compression
    reportCompressedSize: true,
    // Optimize CSS
    cssCodeSplit: true,
    // Preload optimization
    assetsInlineLimit: 4096 // Inline small assets as base64
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