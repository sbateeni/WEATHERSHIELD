// Lightweight shims to quiet editor "Cannot find module" diagnostics when node_modules are not installed.
// These make TypeScript treat missing packages as `any` for editing only. They do NOT add real type safety.

declare module 'react';
declare module 'react/jsx-runtime';
declare module 'react-dom';
declare module 'vite';
declare module '@vitejs/plugin-react';
declare module 'path';
declare module 'url';
declare module '@google/genai';
declare module 'leaflet';
