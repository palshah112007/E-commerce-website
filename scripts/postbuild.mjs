// Post-build step: GitHub Pages serves dist/404.html for any unknown URL,
// which lets deep links like /E-commerce-website/cart load the SPA and let
// React Router resolve the route client-side.
import { copyFileSync } from 'node:fs';

copyFileSync('dist/index.html', 'dist/404.html');
console.log('Created dist/404.html (SPA fallback for GitHub Pages)');
