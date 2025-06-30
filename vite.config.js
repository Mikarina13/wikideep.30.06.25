import { defineConfig } from 'vite'
import { resolve } from 'path'

export default defineConfig({
  root: process.cwd(),
  server: {
    // Configure security headers with relaxed settings for development
    headers: {
      // Only add HSTS in development for consistency
      'Strict-Transport-Security': 'max-age=63072000; includeSubDomains; preload',
      
      // Development-friendly Content Security Policy
      // Allow unsafe-eval for dev hot-reloading and WebContainer API
      'Content-Security-Policy': "default-src 'self' https://*.webcontainer-api.io https://*.stackblitz.io; script-src 'self' 'unsafe-inline' 'unsafe-eval' data: https://cdnjs.cloudflare.com https://*.webcontainer-api.io; style-src 'self' 'unsafe-inline' https://cdnjs.cloudflare.com; img-src 'self' https: data:; font-src 'self' https://cdnjs.cloudflare.com; connect-src 'self' https://brisxbmbsdomvfkxrwbf.supabase.co https://*.webcontainer-api.io https://*.stackblitz.io ws://localhost:* wss://*.stackblitz.io wss://*.webcontainer-api.io; frame-src 'self' https://*.webcontainer-api.io https://*.stackblitz.io; worker-src 'self' blob:; object-src 'none';",
      
      // Standard security headers
      'X-Frame-Options': 'SAMEORIGIN',
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'Permissions-Policy': 'geolocation=(), microphone=(), camera=()',
      
      // Add cross-origin headers for WebContainer
      'Cross-Origin-Embedder-Policy': 'credentialless', 
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    }
  },
  build: {
    rollupOptions: {
      input: {
        index: resolve(__dirname, 'index.html'),
        activity: resolve(__dirname, 'activity.html'),
        browseArchive: resolve(__dirname, 'browse-archive.html'),
        browseCollab: resolve(__dirname, 'browse-collab.html'),
        collab: resolve(__dirname, 'collab.html'),
        contact: resolve(__dirname, 'contact.html'),
        favorites: resolve(__dirname, 'favorites.html'),
        help: resolve(__dirname, 'help.html'),
        infoHub: resolve(__dirname, 'info-hub.html'),
        login: resolve(__dirname, 'login.html'),
        profile: resolve(__dirname, 'profile.html'),
        publish: resolve(__dirname, 'publish.html'),
        resetPassword: resolve(__dirname, 'reset-password.html'),
        settings: resolve(__dirname, 'settings.html'),
        support: resolve(__dirname, 'support.html'),
        acceptTerms: resolve(__dirname, 'accept-terms.html'),
        forum: resolve(__dirname, 'forum.html'),
        ourVision: resolve(__dirname, 'our-vision.html'),
        viewPost: resolve(__dirname, 'view-post.html'),
        publicProfile: resolve(__dirname, 'public-profile.html'),
        notifications: resolve(__dirname, 'notifications.html'),
        adminPanel: resolve(__dirname, 'admin-panel.html')
      },
    },
    outDir: 'dist',
    // Optimize output for production
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true
      }
    },
    // Enable chunk splitting for better caching
    chunkSizeWarningLimit: 1000,
    cssCodeSplit: true,
    sourcemap: false,
    // Improve asset optimization
    assetsInlineLimit: 4096
  },
  // Optimize CSS output
  css: {
    devSourcemap: true,
    preprocessorOptions: {
      scss: {
        quietDeps: true
      }
    }
  },
  // Improve caching and pre-loading
  optimizeDeps: {
    include: ['@supabase/supabase-js'],
    exclude: []
  }
})