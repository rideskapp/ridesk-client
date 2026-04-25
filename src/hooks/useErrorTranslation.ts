import { useTranslation } from "react-i18next";
import { getTranslatedErrorMessage } from "@/utils/errorTranslator";

export function useErrorTranslation() {
  const { t } = useTranslation();

  const getTranslatedError = (error: any): string => {
    return getTranslatedErrorMessage(error, t);
  };

  return { getTranslatedError };
}

