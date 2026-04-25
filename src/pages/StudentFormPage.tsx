/**
 * @fileoverview Student Form Page
 * @description Page for students to complete and submit their information form
 * @author Ridesk Team
 * @version 1.0.0
 */

import React, { useState, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useErrorTranslation } from "@/hooks/useErrorTranslation";
import { useSearchParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "react-hot-toast";
import { PhoneInput } from "../components/ui/PhoneInput";
import { CheckCircle, XCircle } from "lucide-react";
import {
  studentFormApi,
  StudentFormValidationResponse,
  SubmitStudentFormRequest,
} from "../services/studentForm";
import { getCountries } from "react-phone-number-input/input";
import enLocale from "react-phone-number-input/locale/en.json";
import itLocale from "react-phone-number-input/locale/it.json";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import { MultiSelect } from "../components/ui/multi-select";
import { SUPPORTED_LANGUAGES } from "@/constants/languages";
import { validateStudentFormData } from "@/validation/studentValidation";

export const StudentFormPage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { getTranslatedError } = useErrorTranslation();
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();

  // Select country locale based on current language
  const countryLocale = i18n.language.startsWith("it") ? itLocale : enLocale;

  // Memoize country options to avoid recomputing on every render
  const countryOptions = useMemo(
    () =>
      getCountries().map((code) => ({
        code,
        label: countryLocale[code] || code,
      })),
    [countryLocale],
  );

  const CHEVRON_DOWN_ICON =
    "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='16' height='16' fill='none' viewBox='0 0 24 24' stroke='%236b7280' stroke-width='2'><path stroke-linecap='round' stroke-linejoin='round' d='M19 9l-7 7-7-7'/></svg>\")";

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    whatsappNumber: "",
    dateOfBirth: "",
    emergencyContact: "",
    emergencyPhone: "",
    medicalConditions: "",
    skillLevel: "",
    preferredDisciplines: [] as string[],
    nationality: "",
    weight: undefined as number | undefined,
    height: undefined as number | undefined,
    canSwim: undefined as boolean | undefined,
    ridingBackground: "",
    preferredDays: [] as string[],
    preferredTimeSlots: [] as string[],
    preferredLessonTypes: [] as string[],
    preferredLanguage: [] as string[],
    arrivalDate: "",
    departureDate: "",
    stayNotes: "",
    notes: "",
    consentPhysicalCondition: true,
    consentTermsConditions: true,
    consentGdpr: true,
    consentPhotosVideos: true,
    consentMarketing: true,
    consentCustom1: false,
    consentCustom2: false,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const token = searchParams.get("token");

  const {
    data: formResponse,
    isLoading,
    error: queryError,
  } = useQuery<StudentFormValidationResponse>({
    queryKey: ["student-form-validation", token],
    queryFn: () => studentFormApi.validateToken(token!),
    enabled: !!token,
    staleTime: 300000,
    retry: false,
  });

  const studentData = formResponse?.data?.student || null;
  const formSubmitted = formResponse?.data?.formSubmitted || false;
  const formSubmittedAt = formResponse?.data?.formSubmittedAt;
  const disciplines = formResponse?.data?.disciplines || [];
  const rawStudentLevels = formResponse?.data?.studentLevels || [];
  const consentSettings = formResponse?.data?.consentSettings || null;

  const skillLevels = rawStudentLevels
    .filter((level) => level.is_active !== false && level.active !== false)
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((level) => ({
      value: level.slug,
      label: level.name,
    }));

  useEffect(() => {
    if (studentData) {
      setFormData({
        firstName: studentData.firstName || "",
        lastName: studentData.lastName || "",
        whatsappNumber: studentData.whatsappNumber || "",
        dateOfBirth: studentData.dateOfBirth || "",
        emergencyContact: studentData.emergencyContact || "",
        emergencyPhone: studentData.emergencyPhone || "",
        medicalConditions: studentData.medicalConditions || "",
        skillLevel: studentData.skillLevel || "",
        preferredDisciplines: studentData.preferredDisciplines || [],
        nationality: studentData.nationality || "",
        weight:
          studentData.weight !== undefined && studentData.weight !== null
            ? studentData.weight
            : undefined,
        height:
          studentData.height !== undefined && studentData.height !== null
            ? studentData.height
            : undefined,
        canSwim: studentData.canSwim,
        ridingBackground: studentData.ridingBackground || "",
        preferredDays: studentData.preferredDays || [],
        preferredTimeSlots: studentData.preferredTimeSlots || [],
        preferredLessonTypes: studentData.preferredLessonTypes || [],
        preferredLanguage: studentData.preferredLanguage || [],
        arrivalDate: studentData.arrivalDate || "",
        departureDate: studentData.departureDate || "",
        stayNotes: studentData.stayNotes || "",
        notes: studentData.notes || "",
        consentPhysicalCondition:
          studentData.consentPhysicalCondition !== undefined
            ? studentData.consentPhysicalCondition
            : true,
        consentTermsConditions:
          studentData.consentTermsConditions !== undefined
            ? studentData.consentTermsConditions
            : true,
        consentGdpr:
          studentData.consentGdpr !== undefined
            ? studentData.consentGdpr
            : true,
        consentPhotosVideos:
          studentData.consentPhotosVideos !== undefined
            ? studentData.consentPhotosVideos
            : true,
        consentMarketing:
          studentData.consentMarketing !== undefined
            ? studentData.consentMarketing
            : true,
        consentCustom1: studentData.consentCustom1 ?? false,
        consentCustom2: studentData.consentCustom2 ?? false,
      });
    }
  }, [studentData]);

  const handleInputChange = (
    field: string,
    value: string | string[] | boolean | undefined | number,
  ) => {
    setFormData((prev) => {
      if (field === "weight" || field === "height") {
        const numValue =
          value === "" || value === undefined
            ? undefined
            : typeof value === "number"
              ? value
              : parseFloat(value as string);
        return {
          ...prev,
          [field]: isNaN(numValue as number) ? undefined : numValue,
        };
      }
      return { ...prev, [field]: value };
    });
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }));
    }
  };

  const handleArrayChange = (
    field: string,
    value: string,
    checked: boolean,
  ) => {
    setFormData((prev) => {
      const current = (prev[field as keyof typeof prev] as string[]) || [];
      if (checked) {
        return { ...prev, [field]: [...current, value] };
      } else {
        return { ...prev, [field]: current.filter((item) => item !== value) };
      }
    });
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }));
    }
  };

  const handleMultiSelectChange = (field: string, values: string[]) => {
    setFormData((prev) => ({
      ...prev,
      [field]: values,
    }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }));
    }
  };

  const handleDisciplineChange = (disciplineSlug: string, checked: boolean) => {
    setFormData((prev) => {
      const current = prev.preferredDisciplines || [];
      if (checked) {
        return {
          ...prev,
          preferredDisciplines: [...current, disciplineSlug],
        };
      } else {
        return {
          ...prev,
          preferredDisciplines: current.filter((d) => d !== disciplineSlug),
        };
      }
    });
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    const sharedErrors = validateStudentFormData(
      {
        ...formData,
        email: studentData?.email || "",
      },
      { requireEmail: false, requireConsents: true },
    );
    if (sharedErrors.firstName) {
      newErrors.firstName = t("students.publicForm.validation.firstNameRequired");
    }
    if (sharedErrors.lastName) {
      newErrors.lastName = t("students.publicForm.validation.lastNameRequired");
    }
    if (sharedErrors.whatsappNumber) {
      newErrors.whatsappNumber = t("students.publicForm.validation.whatsappRequired");
    }
    if (sharedErrors.preferredDisciplines) {
      newErrors.preferredDisciplines = t("students.publicForm.validation.disciplineRequired");
    }
    if (sharedErrors.skillLevel) {
      newErrors.skillLevel = t("students.publicForm.validation.skillLevelRequired");
    }
    if (sharedErrors.preferredLanguage) {
      newErrors.preferredLanguage = t("students.publicForm.validation.preferredLanguageRequired");
    }
    if (sharedErrors.consentPhysicalCondition) {
      newErrors.consentPhysicalCondition = t("students.publicForm.validation.physicalConditionRequired");
    }
    if (sharedErrors.consentTermsConditions) {
      newErrors.consentTermsConditions = t("students.publicForm.validation.termsRequired");
    }
    if (sharedErrors.consentGdpr) {
      newErrors.consentGdpr = t("students.publicForm.validation.gdprRequired");
    }

    // Validate custom checkboxes if enabled and mandatory
    if (
      consentSettings?.customCheckbox1Enabled &&
      consentSettings?.customCheckbox1Mandatory &&
      !formData.consentCustom1
    ) {
      newErrors.consentCustom1 = t("students.publicForm.validation.customCheckboxRequired", {
        defaultValue: "This field is required",
      });
    }
    if (
      consentSettings?.customCheckbox2Enabled &&
      consentSettings?.customCheckbox2Mandatory &&
      !formData.consentCustom2
    ) {
      newErrors.consentCustom2 = t("students.publicForm.validation.customCheckboxRequired", {
        defaultValue: "This field is required",
      });
    }

    // Validate arrival and departure dates
    if (
      formData.arrivalDate &&
      formData.arrivalDate.trim() &&
      formData.departureDate &&
      formData.departureDate.trim()
    ) {
      const arrival = new Date(formData.arrivalDate);
      const departure = new Date(formData.departureDate);
      if (arrival > departure) {
        newErrors.departureDate = t(
          "students.publicForm.validation.departureAfterArrival",
        );
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm() || !token) {
      return;
    }

    try {
      setIsSubmitting(true);
      const submitData: SubmitStudentFormRequest = {
        token,
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        whatsappNumber: formData.whatsappNumber.trim(),
        skillLevel: formData.skillLevel.trim(),
        preferredDisciplines: formData.preferredDisciplines,
        preferredLanguage: formData.preferredLanguage,
        consentPhysicalCondition: formData.consentPhysicalCondition,
        consentTermsConditions: formData.consentTermsConditions,
        consentGdpr: formData.consentGdpr,
      };

      if (formData.canSwim === true || formData.canSwim === false) {
        submitData.canSwim = formData.canSwim;
      }

      if (formData.dateOfBirth && formData.dateOfBirth.trim()) {
        submitData.dateOfBirth = formData.dateOfBirth.trim();
      }
      if (formData.emergencyContact && formData.emergencyContact.trim()) {
        submitData.emergencyContact = formData.emergencyContact.trim();
      }
      if (formData.emergencyPhone && formData.emergencyPhone.trim()) {
        submitData.emergencyPhone = formData.emergencyPhone.trim();
      }
      if (formData.medicalConditions && formData.medicalConditions.trim()) {
        submitData.medicalConditions = formData.medicalConditions.trim();
      }
      if (formData.nationality && formData.nationality.trim()) {
        submitData.nationality = formData.nationality.trim();
      }
      if (formData.weight !== undefined && formData.weight !== null) {
        submitData.weight = formData.weight;
      }
      if (formData.height !== undefined && formData.height !== null) {
        submitData.height = formData.height;
      }
      if (formData.ridingBackground && formData.ridingBackground.trim()) {
        submitData.ridingBackground = formData.ridingBackground.trim();
      }
      if (formData.preferredDays && formData.preferredDays.length > 0) {
        submitData.preferredDays = formData.preferredDays;
      }
      if (
        formData.preferredTimeSlots &&
        formData.preferredTimeSlots.length > 0
      ) {
        submitData.preferredTimeSlots = formData.preferredTimeSlots;
      }
      if (
        formData.preferredLessonTypes &&
        formData.preferredLessonTypes.length > 0
      ) {
        submitData.preferredLessonTypes = formData.preferredLessonTypes;
      }
      if (formData.consentPhotosVideos !== undefined) {
        submitData.consentPhotosVideos = formData.consentPhotosVideos;
      }
      if (formData.consentMarketing !== undefined) {
        submitData.consentMarketing = formData.consentMarketing;
      }
      if (consentSettings?.customCheckbox1Enabled) {
        submitData.consentCustom1 = formData.consentCustom1;
      }
      if (consentSettings?.customCheckbox2Enabled) {
        submitData.consentCustom2 = formData.consentCustom2;
      }
      if (formData.arrivalDate && formData.arrivalDate.trim()) {
        submitData.arrivalDate = formData.arrivalDate.trim();
      }
      if (formData.departureDate && formData.departureDate.trim()) {
        submitData.departureDate = formData.departureDate.trim();
      }
      if (formData.stayNotes && formData.stayNotes.trim()) {
        submitData.stayNotes = formData.stayNotes.trim();
      }
      if (formData.notes && formData.notes.trim()) {
        submitData.notes = formData.notes.trim();
      }

      await studentFormApi.submitForm(submitData);

      toast.success(t("students.publicForm.submitSuccess"));
      await queryClient.invalidateQueries({
        queryKey: ["student-form-validation", token],
      });
    } catch (error: any) {
      toast.error(
        getTranslatedError(error) || t("students.publicForm.submitError"),
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const error = !token
    ? "No token provided"
    : queryError
      ? (queryError as any)?.response?.data?.message ||
        t("students.publicForm.invalidLinkTitle")
      : null;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">
            {t("students.publicForm.loading")}
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
          <div className="text-red-600 mb-4">
            <XCircle className="h-16 w-16 mx-auto" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            {t("students.publicForm.invalidLinkTitle")}
          </h2>
          <p className="text-gray-600 mb-6">{error}</p>
        </div>
      </div>
    );
  }

  if (!studentData) {
    return null;
  }

  if (formSubmitted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
          <div className="text-green-600 mb-4">
            <CheckCircle className="h-16 w-16 mx-auto" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            {t("students.publicForm.successTitle")}
          </h2>
          <p className="text-gray-600 mb-4">
            {t("students.publicForm.successMessage")}
          </p>
          {formSubmittedAt && (
            <p className="text-sm text-gray-500 mb-6">
              {t("students.publicForm.submittedOn", {
                date: new Date(formSubmittedAt).toLocaleString(),
              })}
            </p>
          )}
          <p className="text-sm text-gray-500">
            {t("students.publicForm.contactAdmin")}
          </p>
        </div>
      </div>
    );
  }

  const areRequiredConsentsChecked =
    formData.consentPhysicalCondition === true &&
    formData.consentTermsConditions === true &&
    formData.consentGdpr === true;

  // Disable submit button if not all required consents are checked
  const isSubmitDisabled = isSubmitting || !areRequiredConsentsChecked;

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="text-green-600 mb-4">
            <CheckCircle className="h-16 w-16 mx-auto" />
          </div>
          <h2 className="text-3xl font-bold text-gray-900">
            {t("students.publicForm.title")}
          </h2>
          <p className="mt-2 text-gray-600">
            {t("students.publicForm.description")}
          </p>
        </div>

        {/* Form */}
        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-lg shadow-lg p-6 space-y-6"
        >
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Student Details
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  First Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.firstName}
                  onChange={(e) =>
                    handleInputChange("firstName", e.target.value)
                  }
                  className={`w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-pink-500 ${
                    errors.firstName ? "border-red-500" : ""
                  }`}
                  placeholder={t("students.publicForm.placeholders.firstName")}
                />
                {errors.firstName && (
                  <p className="mt-1 text-sm text-red-600">
                    {errors.firstName}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Last Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.lastName}
                  onChange={(e) =>
                    handleInputChange("lastName", e.target.value)
                  }
                  className={`w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-pink-500 ${
                    errors.lastName ? "border-red-500" : ""
                  }`}
                  placeholder={t("students.publicForm.placeholders.lastName")}
                />
                {errors.lastName && (
                  <p className="mt-1 text-sm text-red-600">{errors.lastName}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  value={studentData.email || ""}
                  readOnly
                  disabled
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm bg-gray-50 text-gray-600 cursor-not-allowed"
                  tabIndex={-1}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  WhatsApp Number <span className="text-red-500">*</span>
                </label>
                <PhoneInput
                  value={formData.whatsappNumber}
                  onChange={(value) =>
                    handleInputChange("whatsappNumber", value || "")
                  }
                  error={errors.whatsappNumber}
                  placeholder={t(
                    "students.publicForm.placeholders.whatsappNumber",
                  )}
                  defaultCountry="US"
                />
              </div>

              {/* Preferred Disciplines */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Preferred Disciplines <span className="text-red-500">*</span>
                </label>
                {disciplines.length === 0 ? (
                  <div className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-50 text-gray-500 text-sm">
                    {t("students.publicForm.noDisciplines")}
                  </div>
                ) : (
                  <div className="space-y-2">
                    {disciplines.map((discipline) => (
                      <label key={discipline.id} className="flex items-center">
                        <input
                          type="checkbox"
                          checked={formData.preferredDisciplines.includes(
                            discipline.slug,
                          )}
                          onChange={(e) =>
                            handleDisciplineChange(
                              discipline.slug,
                              e.target.checked,
                            )
                          }
                          className="h-4 w-4 text-pink-600 focus:ring-pink-500 border-gray-300 rounded"
                        />
                        <span className="ml-2 text-sm text-gray-700">
                          {discipline.display_name}
                        </span>
                      </label>
                    ))}
                  </div>
                )}
                {errors.preferredDisciplines && (
                  <p className="mt-1 text-sm text-red-600">
                    {errors.preferredDisciplines}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Skill Level <span className="text-red-500">*</span>
                </label>
                {skillLevels.length === 0 ? (
                  <div className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-50 text-gray-500 text-sm">
                    {t("students.publicForm.noSkillLevels")}
                  </div>
                ) : (
                  <select
                    value={formData.skillLevel}
                    onChange={(e) =>
                      handleInputChange("skillLevel", e.target.value)
                    }
                    className={`w-full appearance-none pr-10 bg-[right_0.75rem_center] bg-no-repeat bg-[length:16px_16px] px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-pink-500 ${
                      errors.skillLevel ? "border-red-500" : ""
                    }`}
                    style={{
                      backgroundImage: CHEVRON_DOWN_ICON,
                    }}
                  >
                    {skillLevels.map((level) => (
                      <option key={level.value} value={level.value}>
                        {level.label}
                      </option>
                    ))}
                  </select>
                )}
                {errors.skillLevel && (
                  <p className="mt-1 text-sm text-red-600">
                    {errors.skillLevel}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Date of Birth
                </label>
                <input
                  type="date"
                  value={formData.dateOfBirth}
                  onChange={(e) =>
                    handleInputChange("dateOfBirth", e.target.value)
                  }
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-pink-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Preferred Language(s) <span className="text-red-500">*</span>
                </label>
                <MultiSelect
                  id="preferredLanguage"
                  options={SUPPORTED_LANGUAGES.map(
                    ({ value, labelKey }) => ({
                      value,
                      label: t(labelKey),
                    }),
                  )}
                  selected={formData.preferredLanguage}
                  onChange={(values) =>
                    handleMultiSelectChange(
                      "preferredLanguage",
                      values as string[],
                    )
                  }
                  placeholder={t("students.selectLanguage")}
                  aria-describedby={
                    errors.preferredLanguage ? "preferredLanguage-error" : undefined
                  }
                />
                {errors.preferredLanguage && (
                  <p
                    id="preferredLanguage-error"
                    className="mt-1 text-sm text-red-600"
                  >
                    {errors.preferredLanguage}
                  </p>
                )}
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Emergency Contact
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Emergency Contact
                </label>
                <input
                  type="text"
                  value={formData.emergencyContact}
                  onChange={(e) =>
                    handleInputChange("emergencyContact", e.target.value)
                  }
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-pink-500"
                  placeholder={t(
                    "students.publicForm.placeholders.emergencyContact",
                  )}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Emergency Phone
                </label>
                <input
                  type="tel"
                  value={formData.emergencyPhone}
                  onChange={(e) =>
                    handleInputChange("emergencyPhone", e.target.value)
                  }
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-pink-500"
                  placeholder={t(
                    "students.publicForm.placeholders.emergencyPhone",
                  )}
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Medical Conditions
            </label>
            <textarea
              value={formData.medicalConditions}
              onChange={(e) =>
                handleInputChange("medicalConditions", e.target.value)
              }
              rows={3}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-pink-500"
              placeholder={t(
                "students.publicForm.placeholders.medicalConditions",
              )}
            />
          </div>

          {/* Additional Information */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Additional Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t("students.nationality")}
                </label>
                <Select
                  value={formData.nationality}
                  onValueChange={(value) =>
                    handleInputChange("nationality", value)
                  }
                >
                  <SelectTrigger className="w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-pink-500 bg-white h-auto">
                    <SelectValue
                      placeholder={t(
                        "students.publicForm.placeholders.nationality",
                      )}
                    />
                  </SelectTrigger>
                  <SelectContent className="max-h-[300px]">
                    {countryOptions.map((country) => (
                      <SelectItem key={country.code} value={country.code}>
                        {country.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Weight (kg)
                </label>
                <input
                  type="number"
                  value={formData.weight ?? ""}
                  onChange={(e) => {
                    if (e.target.value === "") {
                      handleInputChange("weight", undefined);
                    } else {
                      const value = parseFloat(e.target.value);
                      handleInputChange(
                        "weight",
                        isNaN(value) ? undefined : value,
                      );
                    }
                  }}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-pink-500"
                  placeholder={t("students.publicForm.placeholders.weight")}
                  min="20"
                  max="200"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Height (cm)
                </label>
                <input
                  type="number"
                  value={formData.height ?? ""}
                  onChange={(e) => {
                    if (e.target.value === "") {
                      handleInputChange("height", undefined);
                    } else {
                      const value = parseFloat(e.target.value);
                      handleInputChange(
                        "height",
                        isNaN(value) ? undefined : value,
                      );
                    }
                  }}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-pink-500"
                  placeholder={t("students.publicForm.placeholders.height")}
                  min="50"
                  max="250"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Can you swim?
                </label>
                <div className="flex gap-4">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="canSwim"
                      checked={formData.canSwim === true}
                      onChange={() => handleInputChange("canSwim", true)}
                      className="h-4 w-4 text-pink-600 focus:ring-pink-500 border-gray-300"
                    />
                    <span className="ml-2 text-sm text-gray-700">
                      {t("common.yes")}
                    </span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="canSwim"
                      checked={formData.canSwim === false}
                      onChange={() => handleInputChange("canSwim", false)}
                      className="h-4 w-4 text-pink-600 focus:ring-pink-500 border-gray-300"
                    />
                    <span className="ml-2 text-sm text-gray-700">
                      {t("common.no")}
                    </span>
                  </label>
                </div>
                {errors.canSwim && (
                  <p className="mt-1 text-sm text-red-600">{errors.canSwim}</p>
                )}
              </div>
            </div>

            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Riding Background
              </label>
              <textarea
                value={formData.ridingBackground}
                onChange={(e) =>
                  handleInputChange("ridingBackground", e.target.value)
                }
                rows={3}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-pink-500"
                placeholder={t(
                  "students.publicForm.placeholders.ridingBackground",
                )}
              />
            </div>
          </div>

          {/* Preferred Days */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Preferred Days
            </label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {[
                "monday",
                "tuesday",
                "wednesday",
                "thursday",
                "friday",
                "saturday",
                "sunday",
              ].map((day) => (
                <label key={day} className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.preferredDays.includes(day)}
                    onChange={(e) =>
                      handleArrayChange("preferredDays", day, e.target.checked)
                    }
                    className="h-4 w-4 text-pink-600 focus:ring-pink-500 border-gray-300 rounded"
                  />
                  <span className="ml-2 text-sm text-gray-700 capitalize">
                    {t(`students.${day}`)}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Preferred Time Slots */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Preferred Time Slots
            </label>
            <div className="flex gap-4">
              {["morning", "afternoon"].map((slot) => (
                <label key={slot} className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.preferredTimeSlots.includes(slot)}
                    onChange={(e) =>
                      handleArrayChange(
                        "preferredTimeSlots",
                        slot,
                        e.target.checked,
                      )
                    }
                    className="h-4 w-4 text-pink-600 focus:ring-pink-500 border-gray-300 rounded"
                  />
                  <span className="ml-2 text-sm text-gray-700 capitalize">
                    {t(`students.${slot}`)}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Preferred Lesson Types */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Lesson Type
            </label>
            <div className="flex gap-4">
              {["private", "semi-private", "group"].map((type) => (
                <label key={type} className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.preferredLessonTypes.includes(type)}
                    onChange={(e) =>
                      handleArrayChange(
                        "preferredLessonTypes",
                        type,
                        e.target.checked,
                      )
                    }
                    className="h-4 w-4 text-pink-600 focus:ring-pink-500 border-gray-300 rounded"
                  />
                  <span className="ml-2 text-sm text-gray-700 capitalize">
                    {t(`students.${type.replace("-", "")}`)}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Stay */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Stay</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label
                  htmlFor="arrivalDate"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Arrival Date
                </label>
                <input
                  id="arrivalDate"
                  type="date"
                  value={formData.arrivalDate}
                  onChange={(e) =>
                    handleInputChange("arrivalDate", e.target.value)
                  }
                  className={`w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-pink-500 ${
                    errors.arrivalDate ? "border-red-500" : ""
                  }`}
                />
                {errors.arrivalDate && (
                  <p className="mt-1 text-sm text-red-600">
                    {errors.arrivalDate}
                  </p>
                )}
              </div>
              <div>
                <label
                  htmlFor="departureDate"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Departure Date
                </label>
                <input
                  id="departureDate"
                  type="date"
                  value={formData.departureDate}
                  onChange={(e) =>
                    handleInputChange("departureDate", e.target.value)
                  }
                  className={`w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-pink-500 ${
                    errors.departureDate ? "border-red-500" : ""
                  }`}
                />
                {errors.departureDate && (
                  <p className="mt-1 text-sm text-red-600">
                    {errors.departureDate}
                  </p>
                )}
              </div>
            </div>
            <div>
              <label
                htmlFor="stayNotes"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Stay Notes
              </label>
              <textarea
                id="stayNotes"
                value={formData.stayNotes}
                onChange={(e) => handleInputChange("stayNotes", e.target.value)}
                rows={3}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-pink-500"
                placeholder={t("students.publicForm.placeholders.stayNotes")}
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Notes</h3>
            <div>
              <label
                htmlFor="notes"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                General Notes
              </label>
              <textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => handleInputChange("notes", e.target.value)}
                rows={3}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-pink-500"
                placeholder={t("students.publicForm.placeholders.notes")}
              />
            </div>
          </div>

          {/* Declarations & Consents */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Declarations & Consents
            </h3>
            <div className="space-y-3">
              <label className="flex items-start">
                <input
                  type="checkbox"
                  checked={formData.consentPhysicalCondition}
                  onChange={(e) =>
                    handleInputChange(
                      "consentPhysicalCondition",
                      e.target.checked,
                    )
                  }
                  className="h-4 w-4 text-pink-600 focus:ring-pink-500 border-gray-300 rounded mt-1"
                />
                <span className="ml-2 text-sm text-gray-700">
                  {t("students.consentPhysicalCondition")}{" "}
                  <span className="text-red-500">*</span>
                </span>
              </label>
              {errors.consentPhysicalCondition && (
                <p className="ml-6 text-sm text-red-600">
                  {errors.consentPhysicalCondition}
                </p>
              )}

              <label className="flex items-start">
                <input
                  type="checkbox"
                  checked={formData.consentTermsConditions}
                  onChange={(e) =>
                    handleInputChange(
                      "consentTermsConditions",
                      e.target.checked,
                    )
                  }
                  className="h-4 w-4 text-pink-600 focus:ring-pink-500 border-gray-300 rounded mt-1"
                />
                <span className="ml-2 text-sm text-gray-700">
                  {(() => {
                    const lang = i18n.language.startsWith("it") ? "it" : "en";
                    const customLabel = consentSettings?.termsConditionsLabel?.[lang];
                    const label = customLabel || t("students.consentTermsConditions");
                    const rawUrl = consentSettings?.termsConditionsUrl;
                    const url = rawUrl && !rawUrl.match(/^https?:\/\//) ? `https://${rawUrl}` : rawUrl;
                    if (url) {
                      return (
                        <a href={url} target="_blank" rel="noopener noreferrer" className="underline text-pink-600 hover:text-pink-700">
                          {label}
                        </a>
                      );
                    }
                    return label;
                  })()}{" "}
                  <span className="text-red-500">*</span>
                </span>
              </label>
              {errors.consentTermsConditions && (
                <p className="ml-6 text-sm text-red-600">
                  {errors.consentTermsConditions}
                </p>
              )}

              {/* Custom Checkbox 1 */}
              {consentSettings?.customCheckbox1Enabled && (
                <>
                  <label className="flex items-start">
                    <input
                      type="checkbox"
                      checked={formData.consentCustom1}
                      onChange={(e) =>
                        handleInputChange("consentCustom1", e.target.checked)
                      }
                      className="h-4 w-4 text-pink-600 focus:ring-pink-500 border-gray-300 rounded mt-1"
                    />
                    <span className="ml-2 text-sm text-gray-700">
                      {(() => {
                        const lang = i18n.language.startsWith("it") ? "it" : "en";
                        const label = consentSettings.customCheckbox1Label?.[lang] || consentSettings.customCheckbox1Label?.en || "";
                        const rawUrl = consentSettings.customCheckbox1Url;
                        const url = rawUrl && !rawUrl.match(/^https?:\/\//) ? `https://${rawUrl}` : rawUrl;
                        if (url) {
                          return (
                            <a href={url} target="_blank" rel="noopener noreferrer" className="underline text-pink-600 hover:text-pink-700">
                              {label}
                            </a>
                          );
                        }
                        return label;
                      })()}
                      {consentSettings.customCheckbox1Mandatory && (
                        <>{" "}<span className="text-red-500">*</span></>
                      )}
                    </span>
                  </label>
                  {errors.consentCustom1 && (
                    <p className="ml-6 text-sm text-red-600">{errors.consentCustom1}</p>
                  )}
                </>
              )}

              {/* Custom Checkbox 2 */}
              {consentSettings?.customCheckbox2Enabled && (
                <>
                  <label className="flex items-start">
                    <input
                      type="checkbox"
                      checked={formData.consentCustom2}
                      onChange={(e) =>
                        handleInputChange("consentCustom2", e.target.checked)
                      }
                      className="h-4 w-4 text-pink-600 focus:ring-pink-500 border-gray-300 rounded mt-1"
                    />
                    <span className="ml-2 text-sm text-gray-700">
                      {(() => {
                        const lang = i18n.language.startsWith("it") ? "it" : "en";
                        const label = consentSettings.customCheckbox2Label?.[lang] || consentSettings.customCheckbox2Label?.en || "";
                        const rawUrl = consentSettings.customCheckbox2Url;
                        const url = rawUrl && !rawUrl.match(/^https?:\/\//) ? `https://${rawUrl}` : rawUrl;
                        if (url) {
                          return (
                            <a href={url} target="_blank" rel="noopener noreferrer" className="underline text-pink-600 hover:text-pink-700">
                              {label}
                            </a>
                          );
                        }
                        return label;
                      })()}
                      {consentSettings.customCheckbox2Mandatory && (
                        <>{" "}<span className="text-red-500">*</span></>
                      )}
                    </span>
                  </label>
                  {errors.consentCustom2 && (
                    <p className="ml-6 text-sm text-red-600">{errors.consentCustom2}</p>
                  )}
                </>
              )}

              <label className="flex items-start">
                <input
                  type="checkbox"
                  checked={formData.consentGdpr}
                  onChange={(e) =>
                    handleInputChange("consentGdpr", e.target.checked)
                  }
                  className="h-4 w-4 text-pink-600 focus:ring-pink-500 border-gray-300 rounded mt-1"
                />
                <span className="ml-2 text-sm text-gray-700">
                  {t("students.consentGdpr")}{" "}
                  <span className="text-red-500">*</span>
                </span>
              </label>
              {errors.consentGdpr && (
                <p className="ml-6 text-sm text-red-600">
                  {errors.consentGdpr}
                </p>
              )}

              <label className="flex items-start">
                <input
                  type="checkbox"
                  checked={formData.consentPhotosVideos}
                  onChange={(e) =>
                    handleInputChange("consentPhotosVideos", e.target.checked)
                  }
                  className="h-4 w-4 text-pink-600 focus:ring-pink-500 border-gray-300 rounded mt-1"
                />
                <span className="ml-2 text-sm text-gray-700">
                  {t("students.consentPhotosVideos")}
                </span>
              </label>

              <label className="flex items-start">
                <input
                  type="checkbox"
                  checked={formData.consentMarketing}
                  onChange={(e) =>
                    handleInputChange("consentMarketing", e.target.checked)
                  }
                  className="h-4 w-4 text-pink-600 focus:ring-pink-500 border-gray-300 rounded mt-1"
                />
                <span className="ml-2 text-sm text-gray-700">
                  {t("students.consentMarketing")}
                </span>
              </label>
            </div>
          </div>

          <div className="pt-4 border-t">
            <button
              type="submit"
              disabled={isSubmitDisabled}
              className="w-full bg-pink-600 hover:bg-pink-700 disabled:bg-pink-400 disabled:cursor-not-allowed text-white py-2 px-4 rounded-md font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-pink-500"
            >
              {isSubmitting
                ? t("students.publicForm.submitting")
                : t("students.publicForm.submit")}
            </button>
            <p className="mt-2 text-sm text-gray-500 text-center">
              {t("students.publicForm.submitDisclaimer")}
            </p>
          </div>
        </form>
      </div>
    </div>
  );
};
