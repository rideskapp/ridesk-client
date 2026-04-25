/**
 * @fileoverview Student Form Component
 * @description Form for creating and editing students
 * @author Ridesk Team
 * @version 1.0.0
 */

import React, { useEffect, useRef, useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useForm, Controller } from "react-hook-form";
import { PhoneInput } from "../ui/PhoneInput";
import {
  X,
  Calendar,
  FileText,
  ChevronRight,
  User,
  Phone,
  Info,
} from "lucide-react";
import {
  Student,
  CreateStudentRequest,
  UpdateStudentRequest,
} from "../../services/students";
import { useDisciplines } from "../../hooks/useDisciplines";
import { useStudentLevels } from "../../hooks/useStudentLevels";
import { useAuthStore } from "../../store/auth";
import { useQuery } from "@tanstack/react-query";
import { schoolSettingsApi, SchoolSettings } from "../../services/schoolSettings";
import { getCountries } from "react-phone-number-input/input";
import enLocale from "react-phone-number-input/locale/en.json";
import itLocale from "react-phone-number-input/locale/it.json";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { MultiSelect } from "../ui/multi-select";
import { SUPPORTED_LANGUAGES } from "../../constants/languages";
import {
  isRequiredText,
  isValidEmail,
  validateStudentFormData,
} from "../../validation/studentValidation";

interface StudentFormProps {
  student?: Student | null;
  onSubmit: (data: CreateStudentRequest | UpdateStudentRequest) => void;
  onClose: () => void;
  isLoading: boolean;
  schoolId?: string;
  scrollToSection?: string | null;
}

export const StudentForm: React.FC<StudentFormProps> = ({
  student,
  onSubmit,
  onClose,
  isLoading,
  schoolId,
  scrollToSection,
}) => {
  const { t, i18n } = useTranslation();
  const { user } = useAuthStore();
  const effectiveSchoolId = schoolId || user?.schoolId;
  const { disciplines, isLoading: disciplinesLoading } =
    useDisciplines(effectiveSchoolId);
  const { studentLevels, isLoading: levelsLoading } =
    useStudentLevels(effectiveSchoolId);
  const { data: schoolSettings } = useQuery<SchoolSettings>({
    queryKey: ["school-settings", effectiveSchoolId],
    queryFn: () => schoolSettingsApi.getBySchoolId(effectiveSchoolId!),
    enabled: !!effectiveSchoolId,
  });
  const isEditing = !!student;

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

  const hasInitializedStudent = useRef(false);
  const hasSetDefaultLevel = useRef(false);
  const lastStudentId = useRef<string | null>(null);

  // State for collapsible sections
  const [expandedSections, setExpandedSections] = useState({
    studentDetails: true, // Expanded by default
    emergencyContact: true, // Expanded by default
    additionalInfo: false, // Collapsed by default
    stay: false, // Collapsed by default
    notes: false, // Collapsed by default
  });

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
    setValue,
    control,
    trigger,
    setError,
  } = useForm<CreateStudentRequest>({
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      whatsappNumber: "",
      dateOfBirth: "",
      emergencyContact: "",
      emergencyPhone: "",
      medicalConditions: "",
      skillLevel: "beginner",
      preferredDisciplines: [],
      nationality: "",
      weight: undefined,
      height: undefined,
      canSwim: undefined,
      primarySport: undefined,
      ridingBackground: "",
      preferredDays: [],
      preferredTimeSlots: [],
      preferredLessonTypes: [],
      preferredLanguage: [],
      consentPhysicalCondition: true,
      consentTermsConditions: true,
      consentGdpr: true,
      consentPhotosVideos: true,
      consentMarketing: true,
      arrivalDate: "",
      departureDate: "",
      stayNotes: "",
      notes: "",
    },
  });

  // Initialize form with student data if editing
  useEffect(() => {
    const currentStudentId = student?.id || null;

    if (lastStudentId.current !== currentStudentId) {
      hasInitializedStudent.current = false;
      lastStudentId.current = currentStudentId;
    }

    if (student && !hasInitializedStudent.current) {
      reset({
        firstName: student.firstName,
        lastName: student.lastName,
        email: student.email,
        whatsappNumber: student.whatsappNumber || "",
        preferredDisciplines: student.preferredDisciplines,
        skillLevel: student.skillLevel,
        dateOfBirth: student.dateOfBirth || "",
        emergencyContact: student.emergencyContact || "",
        emergencyPhone: student.emergencyPhone || "",
        medicalConditions: student.medicalConditions || "",
        nationality: student.nationality || "",
        weight: student.weight,
        height: student.height,
        canSwim: student.canSwim,
        primarySport: student.primarySport,
        ridingBackground: student.ridingBackground || "",
        preferredDays: student.preferredDays || [],
        preferredTimeSlots: student.preferredTimeSlots || [],
        preferredLessonTypes: student.preferredLessonTypes || [],
        preferredLanguage: student.preferredLanguage || [],
        consentPhysicalCondition:
          student.consentPhysicalCondition !== undefined
            ? student.consentPhysicalCondition
            : true,
        consentTermsConditions:
          student.consentTermsConditions !== undefined
            ? student.consentTermsConditions
            : true,
        consentGdpr:
          student.consentGdpr !== undefined ? student.consentGdpr : true,
        consentPhotosVideos:
          student.consentPhotosVideos !== undefined
            ? student.consentPhotosVideos
            : true,
        consentMarketing:
          student.consentMarketing !== undefined
            ? student.consentMarketing
            : true,
        arrivalDate: student.arrivalDate || "",
        departureDate: student.departureDate || "",
        stayNotes: student.stayNotes || "",
        notes: student.notes || "",
      });
      hasInitializedStudent.current = true;
    } else if (!student) {
      reset({
        firstName: "",
        lastName: "",
        email: "",
        whatsappNumber: "",
        preferredDisciplines: [],
        skillLevel: "beginner",
        dateOfBirth: "",
        emergencyContact: "",
        emergencyPhone: "",
        medicalConditions: "",
        nationality: "",
        weight: undefined,
        height: undefined,
        canSwim: undefined,
        primarySport: undefined,
        ridingBackground: "",
        preferredDays: [],
        preferredTimeSlots: [],
        preferredLessonTypes: [],
        preferredLanguage: [],
        consentPhysicalCondition: true,
        consentTermsConditions: true,
        consentGdpr: true,
        consentPhotosVideos: true,
        consentMarketing: true,
        arrivalDate: "",
        departureDate: "",
        stayNotes: "",
        notes: "",
      });
      hasInitializedStudent.current = false;
      hasSetDefaultLevel.current = false;
    }
  }, [student, reset]);

  useEffect(() => {
    if (
      !student &&
      !hasSetDefaultLevel.current &&
      studentLevels.length > 0 &&
      !levelsLoading
    ) {
      const firstLevel = studentLevels
        .filter((l) => l.active || l.is_active)
        .sort((a, b) => a.name.localeCompare(b.name))[0];
      if (firstLevel) {
        setValue("skillLevel", firstLevel.slug);
        hasSetDefaultLevel.current = true;
      }
    }
  }, [student, studentLevels.length, levelsLoading, setValue]);

  useEffect(() => {
    if (studentLevels.length === 0 || levelsLoading) {
      hasSetDefaultLevel.current = false;
    }
  }, [studentLevels.length, levelsLoading]);

  // Handle scrolling to a specific section
  useEffect(() => {
    if (scrollToSection === "stay") {
      setExpandedSections((prev) => ({ ...prev, stay: true }));
      setTimeout(() => {
        const staySection = document.getElementById("stay-section");
        if (staySection) {
          staySection.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      }, 100);
    }
  }, [scrollToSection]);

  const arrivalDate = watch("arrivalDate");
  const departureDate = watch("departureDate");

  useEffect(() => {
    if (arrivalDate || departureDate) {
      trigger("arrivalDate");
      trigger("departureDate");
    }
  }, [arrivalDate, departureDate, trigger]);

  const consentPhysicalCondition = watch("consentPhysicalCondition");
  const consentTermsConditions = watch("consentTermsConditions");
  const consentGdpr = watch("consentGdpr");

  const areRequiredConsentsChecked =
    consentPhysicalCondition === true &&
    consentTermsConditions === true &&
    consentGdpr === true;

  const handleFormSubmit = (data: CreateStudentRequest) => {
    const validationErrors = validateStudentFormData(data, {
      requireEmail: true,
      requireConsents: true,
    });
    if (Object.keys(validationErrors).length > 0) {
      Object.keys(validationErrors).forEach((fieldKey) => {
        setError(fieldKey as keyof CreateStudentRequest, {
          type: "manual",
          message: t("students.required"),
        });
      });
      const firstSectionId = validationErrors.preferredDisciplines
        ? "preferredDisciplines-section"
        : validationErrors.preferredLanguage
          ? "preferredLanguage-section"
          : "firstName";
      const section = document.getElementById(firstSectionId);
      if (section) {
        section.scrollIntoView({ behavior: "smooth", block: "center" });
      }
      return;
    }

    // Filter out empty strings and only send changed fields
    const filteredData: any = {};

    // Only include fields that have values (not empty strings)
    filteredData.firstName = data.firstName.trim();
    filteredData.lastName = data.lastName.trim();
    filteredData.email = data.email.trim();

    // Required field
    filteredData.whatsappNumber = data.whatsappNumber.trim();

    if (data.dateOfBirth && data.dateOfBirth.trim())
      filteredData.dateOfBirth = data.dateOfBirth;
    if (data.emergencyContact && data.emergencyContact.trim())
      filteredData.emergencyContact = data.emergencyContact.trim();
    if (data.emergencyPhone && data.emergencyPhone.trim())
      filteredData.emergencyPhone = data.emergencyPhone.trim();
    if (data.medicalConditions && data.medicalConditions.trim())
      filteredData.medicalConditions = data.medicalConditions.trim();
    if (data.skillLevel && data.skillLevel.trim())
      filteredData.skillLevel = data.skillLevel;
    if (data.preferredDisciplines && data.preferredDisciplines.length > 0)
      filteredData.preferredDisciplines = data.preferredDisciplines;
    if (data.nationality && data.nationality.trim())
      filteredData.nationality = data.nationality.trim();
    if (
      data.weight !== undefined &&
      data.weight !== null &&
      typeof data.weight === "number" &&
      !isNaN(data.weight)
    ) {
      filteredData.weight = data.weight;
    }
    if (
      data.height !== undefined &&
      data.height !== null &&
      typeof data.height === "number" &&
      !isNaN(data.height)
    ) {
      filteredData.height = data.height;
    }
    if (data.canSwim === true || data.canSwim === false) {
      filteredData.canSwim = data.canSwim;
    }
    if (data.ridingBackground && data.ridingBackground.trim())
      filteredData.ridingBackground = data.ridingBackground.trim();
    if (data.preferredDays && data.preferredDays.length > 0)
      filteredData.preferredDays = data.preferredDays;
    if (data.preferredTimeSlots && data.preferredTimeSlots.length > 0)
      filteredData.preferredTimeSlots = data.preferredTimeSlots;
    if (data.preferredLessonTypes && data.preferredLessonTypes.length > 0)
      filteredData.preferredLessonTypes = data.preferredLessonTypes;
    if (data.preferredLanguage && data.preferredLanguage.length > 0)
      filteredData.preferredLanguage = data.preferredLanguage;
    if (data.consentPhysicalCondition !== undefined)
      filteredData.consentPhysicalCondition = data.consentPhysicalCondition;
    if (data.consentTermsConditions !== undefined)
      filteredData.consentTermsConditions = data.consentTermsConditions;
    if (data.consentGdpr !== undefined)
      filteredData.consentGdpr = data.consentGdpr;
    if (data.consentPhotosVideos !== undefined)
      filteredData.consentPhotosVideos = data.consentPhotosVideos;
    if (data.consentMarketing !== undefined)
      filteredData.consentMarketing = data.consentMarketing;
    if (data.arrivalDate && data.arrivalDate.trim())
      filteredData.arrivalDate = data.arrivalDate.trim();
    if (data.departureDate && data.departureDate.trim())
      filteredData.departureDate = data.departureDate.trim();
    if (data.stayNotes && data.stayNotes.trim())
      filteredData.stayNotes = data.stayNotes.trim();
    if (data.notes && data.notes.trim()) filteredData.notes = data.notes.trim();

    onSubmit(filteredData);
  };

  const handleDisciplineChange = (discipline: string, checked: boolean) => {
    const currentDisciplines = watch("preferredDisciplines");
    if (checked) {
      setValue("preferredDisciplines", [...currentDisciplines, discipline]);
    } else {
      setValue(
        "preferredDisciplines",
        currentDisciplines.filter((d) => d !== discipline),
      );
    }
  };

  // Get skill levels from system configuration
  const skillLevels = studentLevels
    .filter((level) => level.active || level.is_active)
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((level) => ({
      value: level.slug,
      label: level.name,
    }));

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold text-gray-900">
            {isEditing
              ? t("students.editStudent")
              : t("students.createStudent")}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Form */}
        <form
          key={student?.id || "new"}
          onSubmit={handleSubmit(handleFormSubmit)}
          className="p-6 space-y-6"
        >
          {/* Basic Information */}
          <div>
            <button
              type="button"
              onClick={() => toggleSection("studentDetails")}
              className="w-full flex items-center justify-between text-lg font-medium text-gray-900 mb-4 hover:text-gray-700 transition-colors"
            >
              <div className="flex items-center gap-2">
                <User className="w-5 h-5" />
                <span>
                  {t("students.studentDetails", {
                    defaultValue: "Student Details",
                  })}
                </span>
              </div>
              <ChevronRight
                className={`w-5 h-5 text-gray-400 transition-transform ${expandedSections.studentDetails ? "rotate-90" : ""}`}
              />
            </button>
            {expandedSections.studentDetails && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* First Name */}
                <div>
                  <label
                    htmlFor="firstName"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    {t("students.firstName")}{" "}
                    <span className="text-red-500">*</span>
                  </label>
                  <input
                    {...register("firstName", {
                      validate: (value) =>
                        isRequiredText(value) || t("students.required"),
                    })}
                    id="firstName"
                    type="text"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-pink-500"
                    placeholder={t("students.firstName")}
                  />
                  {errors.firstName && (
                    <p className="text-red-500 text-sm mt-1">
                      {t("students.required")}
                    </p>
                  )}
                </div>

                {/* Last Name */}
                <div>
                  <label
                    htmlFor="lastName"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    {t("students.lastName")}{" "}
                    <span className="text-red-500">*</span>
                  </label>
                  <input
                    {...register("lastName", {
                      validate: (value) =>
                        isRequiredText(value) || t("students.required"),
                    })}
                    id="lastName"
                    type="text"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-pink-500"
                    placeholder={t("students.lastName")}
                  />
                  {errors.lastName && (
                    <p className="text-red-500 text-sm mt-1">
                      {t("students.required")}
                    </p>
                  )}
                </div>

                {/* Email */}
                <div>
                  <label
                    htmlFor="email"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    {t("students.email")}{" "}
                    <span className="text-red-500">*</span>
                  </label>
                  <input
                    {...register("email", {
                      validate: (value) => {
                        if (!isRequiredText(value)) return t("students.required");
                        if (!isValidEmail(value)) {
                          return t("students.invalidEmail", {
                            defaultValue: "Please enter a valid email address",
                          });
                        }
                        return true;
                      },
                    })}
                    id="email"
                    type="email"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-pink-500"
                    placeholder={t("students.email")}
                  />
                  {errors.email && (
                    <p className="text-red-500 text-sm mt-1">
                      {errors.email.message as string}
                    </p>
                  )}
                </div>

                {/* WhatsApp Number */}
                <div>
                  <label
                    htmlFor="whatsappNumber"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    {t("students.whatsappNumber")}{" "}
                    <span className="text-red-500">*</span>
                  </label>
                  <Controller
                    name="whatsappNumber"
                    control={control}
                    rules={{
                      validate: (value) =>
                        isRequiredText(value) || t("students.whatsappNumberRequired"),
                    }}
                    render={({ field: { onChange, value } }) => (
                      <PhoneInput
                        value={value || ""}
                        onChange={onChange}
                        error={errors.whatsappNumber?.message}
                        placeholder={t("students.whatsappNumberPlaceholder")}
                        defaultCountry="US"
                        id="whatsappNumber"
                      />
                    )}
                  />
                </div>

                {/* Preferred Disciplines */}
                <div className="mb-4" id="preferredDisciplines-section">
                  <fieldset className="border-0 p-0 m-0">
                    <legend className="block text-sm font-medium text-gray-700 mb-2">
                      {t("students.preferredDisciplines")}{" "}
                      <span className="text-red-500">*</span>
                    </legend>
                    <div className="space-y-2">
                      {disciplinesLoading ? (
                        <div className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-50 text-gray-500 text-sm">
                          {t("students.loadingDisciplines")}
                        </div>
                      ) : disciplines.length === 0 ? (
                        <div className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-50 text-gray-500 text-sm">
                          {t("students.noDisciplinesConfigured", {
                            defaultValue: "No disciplines configured",
                          })}
                        </div>
                      ) : (
                        disciplines.map((discipline) => (
                          <label
                            key={discipline.id}
                            className="flex items-center"
                          >
                            <input
                              type="checkbox"
                              checked={
                                watch("preferredDisciplines")?.includes(
                                  discipline.slug,
                                ) || false
                              }
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
                        ))
                      )}
                    </div>
                    {errors.preferredDisciplines && (
                      <p className="text-red-500 text-sm mt-1">
                        {t("students.required")}
                      </p>
                    )}
                  </fieldset>
                </div>

                {/* Skill Level */}
                <div>
                  <label
                    htmlFor="skillLevel"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    {t("students.skillLevel")}{" "}
                    <span className="text-red-500">*</span>
                  </label>
                  {levelsLoading ? (
                    <div className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-50 text-gray-500 text-sm">
                      {t("students.loadingLevels")}
                    </div>
                  ) : skillLevels.length === 0 ? (
                    <div className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-50 text-gray-500 text-sm">
                      {t("students.noSkillLevelsConfigured", {
                        defaultValue: "No skill levels configured.",
                      })}
                    </div>
                  ) : (
                    <select
                      {...register("skillLevel", {
                        validate: (value) =>
                          isRequiredText(value) || t("students.required"),
                      })}
                      id="skillLevel"
                      className="w-full appearance-none pr-10 bg-[right_0.75rem_center] bg-no-repeat bg-[length:16px_16px] px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-pink-500"
                      style={{
                        backgroundImage:
                          "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='16' height='16' fill='none' viewBox='0 0 24 24' stroke='%236b7280' stroke-width='2'><path stroke-linecap='round' stroke-linejoin='round' d='M19 9l-7 7-7-7'/></svg>\")",
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
                    <p className="text-red-500 text-sm mt-1">
                      {t("students.required")}
                    </p>
                  )}
                </div>

                {/* Date of Birth */}
                <div>
                  <label
                    htmlFor="dateOfBirth"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    {t("students.dateOfBirth")}
                  </label>
                  <input
                    {...register("dateOfBirth")}
                    id="dateOfBirth"
                    type="date"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-pink-500"
                  />
                </div>

                {/* Languages that you speak */}
                <div id="preferredLanguage-section">
                  <label
                    htmlFor="preferredLanguage"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    {t("students.preferredLanguageLabel")}{" "}
                    <span className="text-red-500">*</span>
                  </label>
                  <Controller
                    name="preferredLanguage"
                    control={control}
                    rules={{ required: t("students.required") }}
                    render={({ field: { onChange, value, name } }) => (
                      <MultiSelect
                        id={name}
                        options={SUPPORTED_LANGUAGES.map(
                          ({ value: langValue, labelKey }) => ({
                            value: langValue,
                            label: t(labelKey),
                          }),
                        )}
                        selected={(value || []) as string[]}
                        onChange={onChange}
                        placeholder={t("students.selectLanguage")}
                        aria-describedby={
                          errors.preferredLanguage ? `${name}-error` : undefined
                        }
                      />
                    )}
                  />
                  {errors.preferredLanguage && (
                    <p
                      id="preferredLanguage-error"
                      className="text-red-500 text-sm mt-1"
                    >
                      {t("students.required")}
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Emergency Contact */}
          <div>
            <button
              type="button"
              onClick={() => toggleSection("emergencyContact")}
              className="w-full flex items-center justify-between text-lg font-medium text-gray-900 mb-4 hover:text-gray-700 transition-colors"
            >
              <div className="flex items-center gap-2">
                <Phone className="w-5 h-5" />
                <span>
                  {t("students.emergencyContact", {
                    defaultValue: "Emergency Contact",
                  })}
                </span>
              </div>
              <ChevronRight
                className={`w-5 h-5 text-gray-400 transition-transform ${expandedSections.emergencyContact ? "rotate-90" : ""}`}
              />
            </button>
            {expandedSections.emergencyContact && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="emergencyContact"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    {t("students.emergencyContact")}
                  </label>
                  <input
                    {...register("emergencyContact")}
                    id="emergencyContact"
                    type="text"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-pink-500"
                    placeholder={t("students.emergencyContact")}
                  />
                </div>
                <div>
                  <label
                    htmlFor="emergencyPhone"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    {t("students.emergencyPhone")}
                  </label>
                  <input
                    {...register("emergencyPhone")}
                    id="emergencyPhone"
                    type="tel"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-pink-500"
                    placeholder={t("students.emergencyPhone")}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Additional Information */}
          <div>
            <button
              type="button"
              onClick={() => toggleSection("additionalInfo")}
              className="w-full flex items-center justify-between text-lg font-medium text-gray-900 mb-4 hover:text-gray-700 transition-colors"
            >
              <div className="flex items-center gap-2">
                <Info className="w-5 h-5" />
                <span>
                  {t("students.additionalInformation", {
                    defaultValue: "Additional Information",
                  })}
                </span>
              </div>
              <ChevronRight
                className={`w-5 h-5 text-gray-400 transition-transform ${expandedSections.additionalInfo ? "rotate-90" : ""}`}
              />
            </button>
            {expandedSections.additionalInfo && (
              <>
                {/* Medical Conditions */}
                <div className="mb-4">
                  <label
                    htmlFor="medicalConditions"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    {t("students.medicalConditions")}
                  </label>
                  <textarea
                    {...register("medicalConditions")}
                    id="medicalConditions"
                    rows={3}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-pink-500"
                    placeholder={t("students.medicalConditions")}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label
                      htmlFor="nationality"
                      className="block text-sm font-medium text-gray-700 mb-1"
                    >
                      {t("students.nationality")}
                    </label>
                    <Controller
                      name="nationality"
                      control={control}
                      render={({ field }) => (
                        <Select
                          value={field.value || ""}
                          onValueChange={field.onChange}
                        >
                          <SelectTrigger className="w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-pink-500 bg-white h-auto">
                            <SelectValue
                              placeholder={t("students.nationalityPlaceholder")}
                            />
                          </SelectTrigger>
                          <SelectContent className="max-h-[300px]">
                            {countryOptions.map((country) => (
                              <SelectItem
                                key={country.code}
                                value={country.code}
                              >
                                {country.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="weight"
                      className="block text-sm font-medium text-gray-700 mb-1"
                    >
                      {t("students.weightLabel")}
                    </label>
                    <input
                      {...register("weight", { valueAsNumber: true })}
                      id="weight"
                      type="number"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-pink-500"
                      placeholder={t("students.weightPlaceholder")}
                      min="20"
                      max="200"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="height"
                      className="block text-sm font-medium text-gray-700 mb-1"
                    >
                      {t("students.heightLabel")}
                    </label>
                    <input
                      {...register("height", { valueAsNumber: true })}
                      id="height"
                      type="number"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-pink-500"
                      placeholder={t("students.heightPlaceholder")}
                      min="50"
                      max="250"
                    />
                  </div>

                  <div className="mb-4">
                    <fieldset className="border-0 p-0 m-0">
                      <legend className="block text-sm font-medium text-gray-700 mb-1">
                        {t("students.canSwim")}
                      </legend>
                      <div className="flex gap-4">
                        <label
                          htmlFor="canSwimYes"
                          className="flex items-center cursor-pointer"
                        >
                          <input
                            id="canSwimYes"
                            name="canSwim"
                            type="radio"
                            checked={watch("canSwim") === true}
                            onChange={() => setValue("canSwim", true)}
                            className="h-4 w-4 text-pink-600 focus:ring-pink-500 border-gray-300"
                          />
                          <span className="ml-2 text-sm text-gray-700">
                            {t("students.canSwimYes")}
                          </span>
                        </label>
                        <label
                          htmlFor="canSwimNo"
                          className="flex items-center cursor-pointer"
                        >
                          <input
                            id="canSwimNo"
                            name="canSwim"
                            type="radio"
                            checked={watch("canSwim") === false}
                            onChange={() => setValue("canSwim", false)}
                            className="h-4 w-4 text-pink-600 focus:ring-pink-500 border-gray-300"
                          />
                          <span className="ml-2 text-sm text-gray-700">
                            {t("students.canSwimNo")}
                          </span>
                        </label>
                      </div>
                    </fieldset>
                  </div>
                </div>

                <div className="mt-4 mb-4">
                  <label
                    htmlFor="ridingBackground"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    {t("students.ridingBackground")}
                  </label>
                  <textarea
                    {...register("ridingBackground")}
                    id="ridingBackground"
                    rows={3}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-pink-500"
                    placeholder={t("students.ridingBackgroundPlaceholder")}
                  />
                </div>

                {/* Preferred Days */}
                <div className="mb-4">
                  <fieldset className="border-0 p-0 m-0">
                    <legend className="block text-sm font-medium text-gray-700 mb-2">
                      {t("students.preferredDays")}
                    </legend>
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
                            checked={
                              watch("preferredDays")?.includes(day) || false
                            }
                            onChange={(e) => {
                              const current = watch("preferredDays") || [];
                              if (e.target.checked) {
                                setValue("preferredDays", [...current, day]);
                              } else {
                                setValue(
                                  "preferredDays",
                                  current.filter((d) => d !== day),
                                );
                              }
                            }}
                            className="h-4 w-4 text-pink-600 focus:ring-pink-500 border-gray-300 rounded"
                          />
                          <span className="ml-2 text-sm text-gray-700">
                            {t(`students.${day}`)}
                          </span>
                        </label>
                      ))}
                    </div>
                  </fieldset>
                </div>

                {/* Preferred Time Slots */}
                <div className="mb-4">
                  <fieldset className="border-0 p-0 m-0">
                    <legend className="block text-sm font-medium text-gray-700 mb-2">
                      {t("students.preferredTimeSlots")}
                    </legend>
                    <div className="flex gap-4">
                      {["morning", "afternoon"].map((slot) => (
                        <label key={slot} className="flex items-center">
                          <input
                            type="checkbox"
                            checked={
                              watch("preferredTimeSlots")?.includes(slot) ||
                              false
                            }
                            onChange={(e) => {
                              const current = watch("preferredTimeSlots") || [];
                              if (e.target.checked) {
                                setValue("preferredTimeSlots", [
                                  ...current,
                                  slot,
                                ]);
                              } else {
                                setValue(
                                  "preferredTimeSlots",
                                  current.filter((s) => s !== slot),
                                );
                              }
                            }}
                            className="h-4 w-4 text-pink-600 focus:ring-pink-500 border-gray-300 rounded"
                          />
                          <span className="ml-2 text-sm text-gray-700">
                            {t(`students.${slot}`)}
                          </span>
                        </label>
                      ))}
                    </div>
                  </fieldset>
                </div>

                {/* Preferred Lesson Types */}
                <div className="mb-4">
                  <fieldset className="border-0 p-0 m-0">
                    <legend className="block text-sm font-medium text-gray-700 mb-2">
                      {t("students.preferredLessonTypes")}
                    </legend>
                    <div className="flex gap-4">
                      {["private", "semi-private", "group"].map((type) => (
                        <label key={type} className="flex items-center">
                          <input
                            type="checkbox"
                            checked={
                              watch("preferredLessonTypes")?.includes(type) ||
                              false
                            }
                            onChange={(e) => {
                              const current =
                                watch("preferredLessonTypes") || [];
                              if (e.target.checked) {
                                setValue("preferredLessonTypes", [
                                  ...current,
                                  type,
                                ]);
                              } else {
                                setValue(
                                  "preferredLessonTypes",
                                  current.filter((item) => item !== type),
                                );
                              }
                            }}
                            className="h-4 w-4 text-pink-600 focus:ring-pink-500 border-gray-300 rounded"
                          />
                          <span className="ml-2 text-sm text-gray-700">
                            {t(
                              `students.${type === "semi-private" ? "semiPrivate" : type}`,
                            )}
                          </span>
                        </label>
                      ))}
                    </div>
                  </fieldset>
                </div>
              </>
            )}
          </div>

          {/* Stay */}
          <div id="stay-section">
            <button
              type="button"
              onClick={() => toggleSection("stay")}
              className="w-full flex items-center justify-between text-lg font-medium text-gray-900 mb-4 hover:text-gray-700 transition-colors"
            >
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                <span>{t("students.stay", { defaultValue: "Stay" })}</span>
              </div>
              <ChevronRight
                className={`w-5 h-5 text-gray-400 transition-transform ${expandedSections.stay ? "rotate-90" : ""}`}
              />
            </button>
            {expandedSections.stay && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label
                      htmlFor="arrivalDate"
                      className="block text-sm font-medium text-gray-700 mb-1"
                    >
                      {t("students.arrivalDate")}
                    </label>
                    <input
                      {...register("arrivalDate", {
                        validate: (value) => {
                          const departureDate = watch("departureDate");
                          if (value && departureDate) {
                            const arrival = new Date(value);
                            const departure = new Date(departureDate);
                            if (arrival > departure) {
                              return t("students.arrivalDateAfterDeparture", {
                                defaultValue:
                                  "Arrival date must be before departure date",
                              });
                            }
                          }
                          return true;
                        },
                      })}
                      id="arrivalDate"
                      type="date"
                      className={`w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-pink-500 ${
                        errors.arrivalDate ? "border-red-500" : ""
                      }`}
                      placeholder="dd-mm-yyyy"
                    />
                    {errors.arrivalDate && (
                      <p className="mt-1 text-sm text-red-600">
                        {errors.arrivalDate.message as string}
                      </p>
                    )}
                  </div>
                  <div>
                    <label
                      htmlFor="departureDate"
                      className="block text-sm font-medium text-gray-700 mb-1"
                    >
                      {t("students.departureDate")}
                    </label>
                    <input
                      {...register("departureDate", {
                        validate: (value) => {
                          const arrivalDate = watch("arrivalDate");
                          if (value && arrivalDate) {
                            const arrival = new Date(arrivalDate);
                            const departure = new Date(value);
                            if (arrival > departure) {
                              return t("students.departureDateBeforeArrival", {
                                defaultValue:
                                  "Departure date must be after arrival date",
                              });
                            }
                          }
                          return true;
                        },
                      })}
                      id="departureDate"
                      type="date"
                      className={`w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-pink-500 ${
                        errors.departureDate ? "border-red-500" : ""
                      }`}
                      placeholder="dd-mm-yyyy"
                    />
                    {errors.departureDate && (
                      <p className="mt-1 text-sm text-red-600">
                        {errors.departureDate.message as string}
                      </p>
                    )}
                  </div>
                </div>
                <div>
                  <label
                    htmlFor="stayNotes"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    {t("students.stayNotes")}
                  </label>
                  <textarea
                    {...register("stayNotes")}
                    id="stayNotes"
                    rows={3}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-pink-500"
                    placeholder={t("students.stayNotesPlaceholder", {
                      defaultValue:
                        "Regular customer, first time, special preferences...",
                    })}
                  />
                </div>
              </>
            )}
          </div>

          {/* Notes */}
          <div>
            <button
              type="button"
              onClick={() => toggleSection("notes")}
              className="w-full flex items-center justify-between text-lg font-medium text-gray-900 mb-4 hover:text-gray-700 transition-colors"
            >
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                <span>{t("students.notes", { defaultValue: "Notes" })}</span>
              </div>
              <ChevronRight
                className={`w-5 h-5 text-gray-400 transition-transform ${expandedSections.notes ? "rotate-90" : ""}`}
              />
            </button>
            {expandedSections.notes && (
              <div>
                <label
                  htmlFor="notes"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  {t("students.generalNotes")}
                </label>
                <textarea
                  {...register("notes")}
                  id="notes"
                  rows={3}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-pink-500"
                  placeholder={t("students.notesPlaceholder", {
                    defaultValue: "Additional notes about the student...",
                  })}
                />
              </div>
            )}
          </div>

          {/* Declarations & Consents */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              {t("students.declarationsConsents", {
                defaultValue: "Declarations & Consents",
              })}
            </h3>
            <div className="space-y-3">
              <label className="flex items-start">
                <input
                  type="checkbox"
                  {...register("consentPhysicalCondition")}
                  className="h-4 w-4 text-pink-600 focus:ring-pink-500 border-gray-300 rounded mt-1"
                />
                <span className="ml-2 text-sm text-gray-700">
                  {t("students.consentPhysicalCondition", {
                    defaultValue:
                      "I confirm that I am in good physical condition to practice water sports",
                  })}{" "}
                  <span className="text-red-500">*</span>
                </span>
              </label>

              <label className="flex items-start">
                <input
                  type="checkbox"
                  {...register("consentTermsConditions")}
                  className="h-4 w-4 text-pink-600 focus:ring-pink-500 border-gray-300 rounded mt-1"
                />
                <span className="ml-2 text-sm text-gray-700">
                  {(() => {
                    const lang = i18n.language.startsWith("it") ? "it" : "en";
                    const customLabel = schoolSettings?.termsConditionsLabel?.[lang];
                    const label = customLabel || t("students.consentTermsConditions", {
                      defaultValue: "I accept the Terms & Conditions and Liability Waiver",
                    });
                    const rawUrl = schoolSettings?.termsConditionsUrl;
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

              {/* Custom Checkbox 1 */}
              {(schoolSettings?.customCheckbox1Enabled || student?.consentCustom1 != null) && (
                <label className="flex items-start">
                  <input
                    type="checkbox"
                    {...register("consentCustom1")}
                    className="h-4 w-4 text-pink-600 focus:ring-pink-500 border-gray-300 rounded mt-1"
                  />
                  <span className="ml-2 text-sm text-gray-700">
                    {(() => {
                      const lang = i18n.language.startsWith("it") ? "it" : "en";
                      const label = schoolSettings?.customCheckbox1Label?.[lang] || schoolSettings?.customCheckbox1Label?.en || "";
                      const rawUrl = schoolSettings?.customCheckbox1Url;
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
                    {schoolSettings?.customCheckbox1Mandatory && (
                      <>{" "}<span className="text-red-500">*</span></>
                    )}
                  </span>
                </label>
              )}

              {/* Custom Checkbox 2 */}
              {(schoolSettings?.customCheckbox2Enabled || student?.consentCustom2 != null) && (
                <label className="flex items-start">
                  <input
                    type="checkbox"
                    {...register("consentCustom2")}
                    className="h-4 w-4 text-pink-600 focus:ring-pink-500 border-gray-300 rounded mt-1"
                  />
                  <span className="ml-2 text-sm text-gray-700">
                    {(() => {
                      const lang = i18n.language.startsWith("it") ? "it" : "en";
                      const label = schoolSettings?.customCheckbox2Label?.[lang] || schoolSettings?.customCheckbox2Label?.en || "";
                      const rawUrl = schoolSettings?.customCheckbox2Url;
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
                    {schoolSettings?.customCheckbox2Mandatory && (
                      <>{" "}<span className="text-red-500">*</span></>
                    )}
                  </span>
                </label>
              )}

              <label className="flex items-start">
                <input
                  type="checkbox"
                  {...register("consentGdpr")}
                  className="h-4 w-4 text-pink-600 focus:ring-pink-500 border-gray-300 rounded mt-1"
                />
                <span className="ml-2 text-sm text-gray-700">
                  {t("students.consentGdpr", {
                    defaultValue:
                      "I give consent to the processing of my personal data (GDPR)",
                  })}{" "}
                  <span className="text-red-500">*</span>
                </span>
              </label>

              <label className="flex items-start">
                <input
                  type="checkbox"
                  {...register("consentPhotosVideos")}
                  className="h-4 w-4 text-pink-600 focus:ring-pink-500 border-gray-300 rounded mt-1"
                />
                <span className="ml-2 text-sm text-gray-700">
                  {t("students.consentPhotosVideos", {
                    defaultValue:
                      "I authorize the use of photos/videos for promotional purposes",
                  })}
                </span>
              </label>

              <label className="flex items-start">
                <input
                  type="checkbox"
                  {...register("consentMarketing")}
                  className="h-4 w-4 text-pink-600 focus:ring-pink-500 border-gray-300 rounded mt-1"
                />
                <span className="ml-2 text-sm text-gray-700">
                  {t("students.consentMarketing", {
                    defaultValue:
                      "I agree to receive marketing communications and promotions (email / WhatsApp)",
                  })}
                </span>
              </label>
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex justify-end space-x-4 pt-6 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-3 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              {t("common.cancel")}
            </button>
            <button
              type="submit"
              disabled={isLoading || !areRequiredConsentsChecked}
              className="px-6 py-3 bg-pink-600 text-white rounded-lg hover:bg-pink-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title={
                !areRequiredConsentsChecked
                  ? "Please check all required consent boxes"
                  : ""
              }
            >
              {isLoading
                ? isEditing
                  ? t("students.updatingStudent")
                  : t("students.creatingStudent")
                : isEditing
                  ? t("common.save")
                  : t("students.createStudent")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
