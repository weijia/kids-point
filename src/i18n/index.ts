import { createI18n } from 'vue-i18n';
import en from './locales/en.json';
import zh from './locales/zh.json';

export type SupportedLocale = 'en' | 'zh';

export const supportedLocales: { code: SupportedLocale; name: string; flag: string }[] = [
  { code: 'en', name: 'English', flag: '🇺🇸' },
  { code: 'zh', name: '中文', flag: '🇨🇳' },
];

export function getDefaultLocale(): SupportedLocale {
  const savedLocale = localStorage.getItem('kidpoints-locale');
  if (savedLocale && (savedLocale === 'en' || savedLocale === 'zh')) {
    return savedLocale;
  }
  
  const browserLang = navigator.language.toLowerCase();
  if (browserLang.startsWith('zh')) {
    return 'zh';
  }
  return 'en';
}

export function setLocale(locale: SupportedLocale): void {
  localStorage.setItem('kidpoints-locale', locale);
}

export const i18n = createI18n({
  legacy: false,
  locale: getDefaultLocale(),
  fallbackLocale: 'en',
  messages: {
    en,
    zh,
  },
});

export default i18n;
