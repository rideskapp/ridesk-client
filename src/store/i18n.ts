import { create } from "zustand";
import { persist } from "zustand/middleware";

interface I18nState {
  language: "en" | "it" | "pt-BR";
  setLanguage: (language: "en" | "it" | "pt-BR") => void;
}

export const useI18nStore = create<I18nState>()(
  persist(
    (set) => ({
      language: "en",
      setLanguage: (language) => set({ language }),
    }),
    {
      name: "i18n-storage",
    },
  ),
);
