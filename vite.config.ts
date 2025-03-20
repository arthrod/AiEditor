import { resolve } from 'path';
import { defineConfig, loadEnv } from 'vite';
import dts from 'vite-plugin-dts';

export default defineConfig(({ mode }) => {
    // Load env variables from .env file based on mode
    const env = loadEnv(mode, process.cwd(), '');
    
    return {
        define: {
            // Expose env variables to the client
            'process.env.OPENAI_API_KEY': JSON.stringify(env.OPENAI_API_KEY || ''),
            'process.env.OPENROUTER_API_KEY': JSON.stringify(env.OPENROUTER_API_KEY || ''),
            'process.env.XINGHUO_API_KEY': JSON.stringify(env.XINGHUO_API_KEY || ''),
            'process.env.WENXIN_API_KEY': JSON.stringify(env.WENXIN_API_KEY || ''),
            'process.env.SPARK_API_KEY': JSON.stringify(env.SPARK_API_KEY || ''),
        },
        // Ensure public directory is properly handled
        publicDir: 'public',
        build: {
            minify: "esbuild",
            lib: {
                entry: resolve(__dirname, './src/index.ts'),
                name: 'aieditor',
                fileName: `index`,
                formats: ['es', 'cjs']
            },
            rollupOptions: {
                // Externalize deps that shouldn't be bundled
                external: [
                    // We don't need to bundle these as they'll be dependencies
                    'mammoth',
                    // Don't bundle the PDF.js worker - we're using CDN with offline fallback
                    /pdfjs-dist\/build\/pdf\.worker.*/
                ],
            }
        },
        plugins: [
            dts({rollupTypes: true}),
        ],
    }
})
