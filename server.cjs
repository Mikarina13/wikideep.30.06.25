// CommonJS version of server.js for use with Node.js environments
// This file is used by the 'start' script in package.json

const express = require('express');
const path = require('path');
const helmet = require('helmet');
const compression = require('compression');

// Create Express app
const app = express();
const PORT = process.env.PORT || 3000;

// Enable gzip compression for all requests
app.use(compression());

// Security middleware (helmet)
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'", "data:", "https://cdnjs.cloudflare.com"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://cdnjs.cloudflare.com"],
        imgSrc: ["'self'", "https:", "data:"],
        fontSrc: ["'self'", "https://cdnjs.cloudflare.com"],
        connectSrc: ["'self'", "https://brisxbmbsdomvfkxrwbf.supabase.co"],
        frameAncestors: ["'none'"],
        objectSrc: ["'none'"],
      },
    },
    // Set HSTS with preload
    hsts: {
      maxAge: 63072000, // 2 years in seconds
      includeSubDomains: true,
      preload: true
    }
  })
);

// Additional headers not covered by helmet
app.use((req, res, next) => {
  // Permissions Policy
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  next();
});

// Serve static files from 'dist' directory
app.use(express.static(path.join(__dirname, 'dist')));

// For SPA - handle all routes by serving index.html
app.get('*', (req, res) => {
  res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});