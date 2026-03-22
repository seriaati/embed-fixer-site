import en from "./locales/en.json";
import zhCN from "./locales/zh-CN.json";

export const DEFAULT_LOCALE = "en" as const;

export const localeOptions = [
    { code: "en", label: "English" },
    { code: "zh-CN", label: "简体中文" },
] as const;

export type LocaleCode = (typeof localeOptions)[number]["code"];
export type TranslationDictionary = typeof en;

const dictionaries: Record<LocaleCode, TranslationDictionary> = {
    en,
    "zh-CN": zhCN,
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

export function getDictionary(locale: string | null | undefined): TranslationDictionary {
    return dictionaries[normalizeLocale(locale)];
}

export const localeDictionaries = dictionaries;

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
