/**
 * Med44 i18n setup — react-i18next with EN/HI/TA support.
 * C08: Missing non-critical translations → EN fallback + console warn.
 * Missing critical keys → "translation pending verification" notice.
 */
import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'

import enCommon from './locales/en/common.json'
import hiCommon from './locales/hi/common.json'
import taCommon from './locales/ta/common.json'

const resources = {
  en: { common: enCommon },
  hi: { common: hiCommon },
  ta: { common: taCommon },
}

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    defaultNS: 'common',
    fallbackLng: 'en',
    supportedLngs: ['en', 'hi', 'ta'],
    // C08: Log missing translations but don't crash
    saveMissing: true,
    missingKeyHandler: (lngs, ns, key, _fallbackValue) => {
      if ((import.meta as any).env?.DEV) {
        console.warn(`[i18n C08] Missing key "${key}" in [${lngs.join(', ')}] ns="${ns}" → falling back to EN`)
      }
    },
    interpolation: {
      escapeValue: false, // React already escapes
    },
    detection: {
      order: ['localStorage', 'navigator', 'htmlTag'],
      caches: ['localStorage'],
      lookupLocalStorage: 'med44-language',
    },
  })

export default i18n

