import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
export default defineConfig({
    plugins: [react()],
    base: '/',
    build: {
        outDir: 'dist',
        emptyOutDir: true,
        chunkSizeWarningLimit: 650,
        rollupOptions: {
            output: {
                manualChunks: {
                    vendor: ['react', 'react-dom', 'react-router-dom'],
                    charts: ['recharts'],
                    pdfTools: ['jspdf', 'html2canvas', 'pdf-lib'],
                    http: ['axios'],
                },
            },
        },
    },
    server: {
        port: 5174,
        open: true,
        proxy: { '/api': { target: 'http://localhost:5000', changeOrigin: true } },
    },
});
