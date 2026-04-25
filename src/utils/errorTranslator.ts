import type { TFunction } from "i18next";
import { getErrorCodeFromMessage } from "@/constants/apiErrors";

function extractErrorMessage(error: any): string | null {
  if (!error) return null;

  if (error.response?.data?.errors) {
    const validationErrors = error.response.data.errors;
    if (
      validationErrors !== null &&
      typeof validationErrors === "object" &&
      !Array.isArray(validationErrors) &&
      Object.keys(validationErrors).length > 0
    ) {
      return null;
    }
  }

  // Check error.response.data.error 
  if (error.response?.data?.error) {
    return error.response.data.error;
  }

  // Check error.response.data.message
  if (error.response?.data?.message) {
    return error.response.data.message;
  }

  // Check error.message
  if (error.message) {
    return error.message;
  }

  // Check error.error 
  if (error.error) {
    return error.error;
  }

  return null;
}

function translateSingleError(message: string, t: TFunction): string {
  const errorCode = getErrorCodeFromMessage(message);

  if (errorCode) {
    const translationKey = `apiErrors.${errorCode}`;
    const translated = t(translationKey);

    if (translated === translationKey) {
      return message;
    }

    if (errorCode === "BOOKING_STUDENTS_SKILL_LEVEL_REQUIRED" && message.includes(":")) {
      const parts = message.split(":");
      if (parts.length >= 2) {
        const studentNames = parts[1].split(".")[0].trim();
        return t(translationKey, { studentNames });
      }
    }

    return translated;
  }

  if (message.startsWith("Cannot create booking: The following student(s) must have a skill level set:")) {
    const match = message.match(/Cannot create booking: The following student\(s\) must have a skill level set: (.+?)\. Please update their profile first\./);
    if (match && match[1]) {
      return t("apiErrors.BOOKING_STUDENTS_SKILL_LEVEL_REQUIRED", { studentNames: match[1] });
    }
  }

  return message;
}

function translateValidationErrors(
  errors: Record<string, string[]>,
  t: TFunction,
): string {
  const translatedErrors: string[] = [];

  for (const field in errors) {
    if (errors[field] && Array.isArray(errors[field])) {
      errors[field].forEach((errorMessage) => {
        const translated = translateSingleError(errorMessage, t);
        translatedErrors.push(translated);
      });
    }
  }

  return translatedErrors.join(". ");
}

export function getTranslatedErrorMessage(
  error: any,
  t: TFunction,
): string {
  if (!error) {
    return t("apiErrors.INTERNAL_SERVER_ERROR");
  }

  const validationErrors = error.response?.data?.errors;
  
  if (validationErrors !== undefined && validationErrors !== null) {
    const isValidErrorsObject =
      typeof validationErrors === "object" &&
      !Array.isArray(validationErrors) &&
      Object.keys(validationErrors).length > 0;

    if (isValidErrorsObject) {
      return translateValidationErrors(validationErrors, t);
    }
  }

  const errorMessage = extractErrorMessage(error);

  if (errorMessage) {
    if (errorMessage.startsWith("Request failed with status code")) {
      if (error.response?.data?.errors) {
        const validationErrors = error.response.data.errors;
        if (
          validationErrors !== null &&
          typeof validationErrors === "object" &&
          !Array.isArray(validationErrors) &&
          Object.keys(validationErrors).length > 0
        ) {
          return translateValidationErrors(validationErrors, t);
        }
      }

      const actualError = error.response?.data?.error || error.response?.data?.message;
      
      if (error.response?.data?.errors && Object.keys(error.response.data.errors).length > 0) {
        const validationErrors = error.response.data.errors;
        if (
          validationErrors !== null &&
          typeof validationErrors === "object" &&
          !Array.isArray(validationErrors)
        ) {
          return translateValidationErrors(validationErrors, t);
        }
      }

      if (actualError && actualError !== "Validation failed") {
        return translateSingleError(actualError, t);
      }
      
      if (error.response?.status === 400) {
        return t("apiErrors.VALIDATION_FAILED");
      }
      
      return t("apiErrors.INTERNAL_SERVER_ERROR");
    }

    return translateSingleError(errorMessage, t);
  }

  return t("apiErrors.INTERNAL_SERVER_ERROR");
}

