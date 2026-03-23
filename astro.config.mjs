// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import sitemap from '@astrojs/sitemap';
import cloudflare from '@astrojs/cloudflare';

// https://astro.build/config
export default defineConfig({
    site: "https://ef.seria.moe",
    i18n: {
        defaultLocale: "en",
        locales: ["en", "zh-CN", "zh-TW", "vi", "nl", "es-ES"],
        routing: {
            prefixDefaultLocale: false,
            fallbackType: "redirect",
        },
    },
    vite: {
        plugins: [tailwindcss()],
    },
    integrations: [
        sitemap()
    ],
    output: "static",
    adapter: cloudflare(),
});
