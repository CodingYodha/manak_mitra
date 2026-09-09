import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const projectDir = path.dirname(fileURLToPath(import.meta.url));
const certificatePath = path.join(projectDir, '.certs', 'dev-cert.pem');
const certificateKeyPath = path.join(projectDir, '.certs', 'dev-key.pem');
const hasLocalCertificate = fs.existsSync(certificatePath) && fs.existsSync(certificateKeyPath);

const backendProxy = {
  target: 'http://127.0.0.1:8000',
  changeOrigin: true
};

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: true,
    https: hasLocalCertificate ? {
      cert: fs.readFileSync(certificatePath),
      key: fs.readFileSync(certificateKeyPath)
    } : undefined,
    proxy: {
      '/api': backendProxy,
      '/chat': backendProxy,
      '/graph': backendProxy,
      '/labs': backendProxy,
      '/passport': backendProxy,
      '/search': backendProxy,
      '/stats': backendProxy,
      '/verify': backendProxy,
      '/ws': { ...backendProxy, ws: true }
    }
  }
});
