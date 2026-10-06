import en from "./locales/en.json";
import zhCN from "./locales/zh-CN.json";
import zhTW from "./locales/zh-TW.json";
import vi from "./locales/vi.json";
import nl from "./locales/nl.json";
import esES from "./locales/es-ES.json";

export const DEFAULT_LOCALE = "en" as const;

export const localeOptions = [
    { code: "en", label: "English" },
    { code: "zh-CN", label: "简体中文" },
    { code: "zh-TW", label: "繁體中文" },
    { code: "vi", label: "Tiếng Việt" },
    { code: "nl", label: "Nederlands" },
    { code: "es-ES", label: "Español (España)" },
] as const;

export type LocaleCode = (typeof localeOptions)[number]["code"];
export type TranslationDictionary = typeof en;

// Translations may lag behind the English source, so their shape isn't guaranteed.
const dictionaries: Record<LocaleCode, unknown> = {
    en,
    "zh-CN": zhCN,
    "zh-TW": zhTW,
    vi,
    nl,
    "es-ES": esES,
};

export function normalizeLocale(locale: string | null | undefined): LocaleCode {
    if (!locale) {
        return DEFAULT_LOCALE;
    }

    const loweredLocale = locale.toLowerCase();
    const exactMatch = localeOptions.find(
        (option) => option.code.toLowerCase() === loweredLocale,
    );

    if (exactMatch) {
        return exactMatch.code;
    }

    const baseLanguage = loweredLocale.split("-")[0];
    const baseMatch = localeOptions.find(
        (option) =>
            option.code.toLowerCase() === baseLanguage ||
            option.code.toLowerCase().startsWith(`${baseLanguage}-`),
    );

    return baseMatch?.code ?? DEFAULT_LOCALE;
}

// Fill keys a locale hasn't translated yet (or whose shape changed) with the English source.
function withFallback(source: unknown, translated: unknown): unknown {
    if (Array.isArray(source)) {
        if (!Array.isArray(translated)) return source;
        return source.map((item, i) => withFallback(item, translated[i]));
    }
    if (source && typeof source === "object") {
        if (!translated || typeof translated !== "object" || Array.isArray(translated)) return source;
        return Object.fromEntries(
            Object.entries(source).map(([key, value]) => [
                key,
                withFallback(value, (translated as Record<string, unknown>)[key]),
            ]),
        );
    }
    return typeof translated === typeof source && translated !== "" ? translated : source;
}

export function getDictionary(locale: string | null | undefined): TranslationDictionary {
    const code = normalizeLocale(locale);
    if (code === DEFAULT_LOCALE) return en;
    return withFallback(en, dictionaries[code]) as TranslationDictionary;
}

export function getLocaleFromHeaders(acceptLanguageHeader: string | null): LocaleCode {
    if (!acceptLanguageHeader) {
        return DEFAULT_LOCALE;
    }

    // Parse Accept-Language header (e.g., "en-US,en;q=0.9,zh-CN;q=0.8")
    const locales = acceptLanguageHeader
        .split(",")
        .map((lang) => {
            const [locale, q] = lang.split(";");
            const quality = q ? parseFloat(q.replace("q=", "")) : 1.0;
            return { locale: locale.trim(), quality };
        })
        .sort((a, b) => b.quality - a.quality)
        .map((item) => item.locale);

    // Try to find a matching locale in order of preference
    for (const locale of locales) {
        const normalized = normalizeLocale(locale);
        if (normalized !== DEFAULT_LOCALE || locale.toLowerCase() === DEFAULT_LOCALE) {
            return normalized;
        }
    }

    return DEFAULT_LOCALE;
}
