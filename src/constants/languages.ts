export const LANGUAGE_OPTIONS = [
  "English",
  "Spanish",
  "French",
  "Italian",
  "German",
  "Portuguese",
  "Dutch",
  "Russian",
  "Chinese",
  "Japanese",
] as const;

/** Student form preferred-language options (value + i18n labelKey). */
export const SUPPORTED_LANGUAGES = [
  { value: "English", labelKey: "students.languageEnglish" },
  { value: "Italian", labelKey: "students.languageItalian" },
  { value: "Spanish", labelKey: "students.languageSpanish" },
  { value: "French", labelKey: "students.languageFrench" },
  { value: "German", labelKey: "students.languageGerman" },
  { value: "Portuguese", labelKey: "students.languagePortuguese" },
  { value: "Dutch", labelKey: "students.languageDutch" },
  { value: "Russian", labelKey: "students.languageRussian" },
  { value: "Chinese", labelKey: "students.languageChinese" },
  { value: "Japanese", labelKey: "students.languageJapanese" },
] as const;
