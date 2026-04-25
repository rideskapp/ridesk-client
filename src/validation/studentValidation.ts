export type StudentValidationInput = {
  firstName?: string;
  lastName?: string;
  email?: string;
  whatsappNumber?: string;
  skillLevel?: string;
  preferredDisciplines?: string[] | null;
  preferredLanguage?: string[] | null;
  consentPhysicalCondition?: boolean;
  consentTermsConditions?: boolean;
  consentGdpr?: boolean;
};

export type StudentValidationOptions = {
  requireEmail?: boolean;
  requireConsents?: boolean;
};

export const STUDENT_EMAIL_REGEX = /^\S+@\S+\.\S+$/i;

export const isRequiredText = (value?: string | null): boolean =>
  typeof value === "string" && value.trim().length > 0;

export const isValidEmail = (value?: string | null): boolean =>
  isRequiredText(value) && STUDENT_EMAIL_REGEX.test(value!.trim());

export const hasAtLeastOneSelection = (value?: string[] | null): boolean =>
  Array.isArray(value) && value.length > 0;

export const validateStudentFormData = (
  data: StudentValidationInput,
  options: StudentValidationOptions = {},
): Record<string, string> => {
  const { requireEmail = true, requireConsents = true } = options;
  const errors: Record<string, string> = {};

  if (!isRequiredText(data.firstName)) errors.firstName = "required";
  if (!isRequiredText(data.lastName)) errors.lastName = "required";
  if (!isRequiredText(data.whatsappNumber)) errors.whatsappNumber = "required";
  if (!isRequiredText(data.skillLevel)) errors.skillLevel = "required";
  if (!hasAtLeastOneSelection(data.preferredDisciplines))
    errors.preferredDisciplines = "required";
  if (!hasAtLeastOneSelection(data.preferredLanguage))
    errors.preferredLanguage = "required";

  if (requireEmail) {
    if (!isRequiredText(data.email)) {
      errors.email = "required";
    } else if (!isValidEmail(data.email)) {
      errors.email = "invalidEmail";
    }
  } else if (isRequiredText(data.email) && !isValidEmail(data.email)) {
    errors.email = "invalidEmail";
  }

  if (requireConsents) {
    if (data.consentPhysicalCondition !== true)
      errors.consentPhysicalCondition = "required";
    if (data.consentTermsConditions !== true)
      errors.consentTermsConditions = "required";
    if (data.consentGdpr !== true) errors.consentGdpr = "required";
  }

  return errors;
};
