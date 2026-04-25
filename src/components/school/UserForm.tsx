/**
 * @fileoverview User Form Component for School Admins
 * @description Form for creating and editing users (instructors and students)
 * @author Ridesk Team
 * @version 1.0.0
 */

import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { X, User, Mail, Phone, Star, Ruler, Weight } from "lucide-react";
import { User as UserType, useAuthStore } from "../../store/auth";
import { useStudentLevels } from "../../hooks/useStudentLevels";
import { useSchool } from "../../hooks/useSchool";
import { SUPPORTED_LANGUAGES } from "../../constants/languages";

interface UserFormProps {
  user?: UserType | null;
  onSubmit: (data: any, isInvite?: boolean) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export const UserForm: React.FC<UserFormProps> = ({
  user,
  onSubmit,
  onCancel,
  isLoading = false,
}) => {
  const { t } = useTranslation();
  const { user: currentUser } = useAuthStore();
  const { studentLevels, isLoading: levelsLoading } = useStudentLevels(
    currentUser?.schoolId,
  );
  const { school } = useSchool(currentUser?.schoolId);
  const isEditing = !!user;

  // Default to invitation mode for new users, manual mode for editing
  const [isInvite, setIsInvite] = useState(!isEditing);

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    role: "USER" as "INSTRUCTOR" | "USER",
    whatsappNumber: "",
    // Instructor fields
    specialties: [] as string[],
    languages: [] as string[],
    // Student fields
    studentLevel: "beginner",
    preferredLanguage: "",
    secondaryLanguage: "",
    specialNeeds: [] as string[],
    specialNeedsOther: "",
    height: 0,
    weight: 0,
    // New Student Fields
    dateOfBirth: "",
    nationality: "",
    canSwim: null as boolean | null,
    primarySport: "",
    ridingBackground: "",
    preferredDays: [] as string[],
    preferredTimeSlots: [] as string[],
    preferredLessonTypes: [] as string[],
    consentPhysicalCondition: true, // Default true
    consentTermsConditions: true, // Default true
    consentGdpr: true, // Default true
    consentPhotosVideos: true, // Default true (requested)
    consentMarketing: true, // Default true (requested)
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (user) {
      setIsInvite(false); // Always manual mode when editing
      setFormData({
        firstName: user.firstName || "",
        lastName: user.lastName || "",
        email: user.email || "",
        password: "",
        role: user.role === "INSTRUCTOR" ? "INSTRUCTOR" : "USER",
        whatsappNumber: "",
        specialties: [],
        languages: [],
        // Student fields - not available on User type during edit, use defaults
        studentLevel: "beginner",
        preferredLanguage: "",
        secondaryLanguage: "",
        specialNeeds: [],
        specialNeedsOther: "",
        height: 0,
        weight: 0,
        dateOfBirth: "",
        nationality: "",
        canSwim: null as boolean | null,
        primarySport: "",
        ridingBackground: "",
        preferredDays: [],
        preferredTimeSlots: [],
        preferredLessonTypes: [],
        consentPhysicalCondition: true,
        consentTermsConditions: true,
        consentGdpr: true,
        consentPhotosVideos: true,
        consentMarketing: true,
      });
    }
  }, [user]);

  const handleInputChange = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }));
    }
  };

  const handleArrayChange = (field: string, value: string) => {
    const newArray = value
      .split(",")
      .map((item) => item.trim())
      .filter((item) => item);
    handleInputChange(field, newArray);
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.email) {
      newErrors.email = t("users.validation.emailRequired");
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = t("users.validation.emailInvalid");
    }

    if (!formData.firstName) {
      newErrors.firstName = t("users.validation.firstNameRequired");
    }

    if (!formData.lastName) {
      newErrors.lastName = t("users.validation.lastNameRequired");
    }

    // Password validation only if NOT inviting and (creating new OR editing with new password)
    if (!isInvite && !isEditing && !formData.password) {
      newErrors.password = t("users.validation.passwordRequired");
    } else if (!isInvite && formData.password && formData.password.length < 6) {
      newErrors.password = t("users.validation.passwordMinLength");
    }

    if (formData.role === "INSTRUCTOR") {
      if (!formData.whatsappNumber) {
        newErrors.whatsappNumber = t("users.validation.whatsappRequired");
      }
      if (!formData.specialties || formData.specialties.length === 0) {
        newErrors.specialties = t("users.validation.specialtiesRequired");
      }
      if (!formData.languages || formData.languages.length === 0) {
        newErrors.languages = t("users.validation.languagesRequired");
      }
    }

    if (formData.role === "USER") {
      if (!formData.whatsappNumber) {
        newErrors.whatsappNumber = t("users.validation.whatsappRequired");
      }
      if (!formData.nationality) {
        newErrors.nationality = t("users.validation.nationalityRequired");
      }
      if (!formData.weight) {
        newErrors.weight = t("users.validation.weightRequired");
      }
      if (!formData.height) {
        newErrors.height = t("users.validation.heightRequired");
      }
      if (!formData.dateOfBirth) {
        newErrors.dateOfBirth = t("users.validation.dateOfBirthRequired");
      }
      if (formData.canSwim === null || formData.canSwim === undefined) {
        newErrors.canSwim = t("users.validation.canSwimRequired");
      }
      // Only require primarySport if disciplines are configured
      if (
        school?.disciplines &&
        school.disciplines.length > 0 &&
        !formData.primarySport
      ) {
        newErrors.primarySport = t("users.validation.disciplineRequired");
      }
      if (
        !formData.consentPhysicalCondition ||
        !formData.consentTermsConditions ||
        !formData.consentGdpr
      ) {
        newErrors.consents = t("users.validation.consentsRequired");
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateForm()) {
      // Remove password if empty (for editing) or if inviting
      const submitData = { ...formData };

      if (isInvite) {
        // If inviting, password is not needed
        const { password, ...dataWithoutPassword } = submitData;
        onSubmit(dataWithoutPassword, true);
        return;
      }

      if (isEditing && !submitData.password) {
        const { password, ...dataWithoutPassword } = submitData;
        onSubmit(dataWithoutPassword, false);
        return;
      }
      onSubmit(submitData, false);
    }
  };

  const isInstructor = formData.role === "INSTRUCTOR";
  const isStudent = formData.role === "USER";

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">
            {isEditing
              ? t("users.editUser")
              : isInvite
                ? t("users.inviteUser")
                : t("users.createUser")}
          </h3>
          <button
            onClick={onCancel}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Creation Method Switch - Only show when creating new user */}
          {!isEditing && (
            <div className="bg-gray-50 p-4 rounded-lg mb-6 border border-gray-200">
              {/* Creation Method toggle: choose invite vs manual.
                  Note: the visible <label> here does not target a specific form control.
                  For better accessibility, consider adding `id`/`htmlFor` or ARIA attributes
                  so screen readers can properly associate the label with the control. */}
              <label className="block text-sm font-medium text-gray-700 mb-3">
                {t("users.creationMethod")}
              </label>
              <div className="flex space-x-4">
                <button
                  type="button"
                  onClick={() => setIsInvite(true)}
                  className={`flex-1 flex flex-col items-center p-3 rounded-lg border-2 transition-all ${
                    isInvite
                      ? "border-pink-500 bg-pink-50 text-pink-700"
                      : "border-transparent bg-white hover:bg-gray-100 text-gray-600"
                  }`}
                >
                  <Mail
                    className={`h-6 w-6 mb-2 ${isInvite ? "text-pink-600" : "text-gray-400"}`}
                  />
                  <span className="font-medium text-sm">
                    {t("users.viaInvitation")}
                  </span>
                  <span className="text-xs mt-1 text-center opacity-75">
                    {t("users.inviteDescription")}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsInvite(false)}
                  className={`flex-1 flex flex-col items-center p-3 rounded-lg border-2 transition-all ${
                    !isInvite
                      ? "border-pink-500 bg-pink-50 text-pink-700"
                      : "border-transparent bg-white hover:bg-gray-100 text-gray-600"
                  }`}
                >
                  <User
                    className={`h-6 w-6 mb-2 ${!isInvite ? "text-pink-600" : "text-gray-400"}`}
                  />
                  <span className="font-medium text-sm">
                    {t("users.manualCreation")}
                  </span>
                  <span className="text-xs mt-1 text-center opacity-75">
                    {t("users.manualDescription")}
                  </span>
                </button>
              </div>
            </div>
          )}

          {/* Basic Information */}
          <div className="space-y-4">
            <h4 className="text-md font-medium text-gray-900 flex items-center">
              <User className="h-5 w-5 mr-2" />
              {t("users.basicInformation")}
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t("users.firstName")} *
                </label>
                <input
                  type="text"
                  value={formData.firstName}
                  onChange={(e) =>
                    handleInputChange("firstName", e.target.value)
                  }
                  className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-pink-500 focus:border-transparent ${
                    errors.firstName ? "border-red-500" : "border-gray-300"
                  }`}
                  placeholder={t("users.firstNamePlaceholder")}
                />
                {errors.firstName && (
                  <p className="mt-1 text-sm text-red-600">
                    {errors.firstName}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t("users.lastName")} *
                </label>
                <input
                  type="text"
                  value={formData.lastName}
                  onChange={(e) =>
                    handleInputChange("lastName", e.target.value)
                  }
                  className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-pink-500 focus:border-transparent ${
                    errors.lastName ? "border-red-500" : "border-gray-300"
                  }`}
                  placeholder={t("users.lastNamePlaceholder")}
                />
                {errors.lastName && (
                  <p className="mt-1 text-sm text-red-600">{errors.lastName}</p>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t("users.email")} *
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange("email", e.target.value)}
                  className={`w-full pl-10 pr-3 py-2 border rounded-md focus:ring-2 focus:ring-pink-500 focus:border-transparent ${
                    errors.email ? "border-red-500" : "border-gray-300"
                  }`}
                  placeholder={t("users.emailPlaceholder")}
                />
              </div>
              {errors.email && (
                <p className="mt-1 text-sm text-red-600">{errors.email}</p>
              )}
            </div>

            {!isInvite && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t("users.password")} {!isEditing && "*"}
                </label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) =>
                    handleInputChange("password", e.target.value)
                  }
                  className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-pink-500 focus:border-transparent ${
                    errors.password ? "border-red-500" : "border-gray-300"
                  }`}
                  placeholder={
                    isEditing
                      ? t("users.passwordPlaceholderEdit")
                      : t("users.passwordPlaceholder")
                  }
                />
                {isEditing && (
                  <p className="mt-1 text-sm text-gray-500">
                    {t("users.passwordHelp")}
                  </p>
                )}
                {errors.password && (
                  <p className="mt-1 text-sm text-red-600">{errors.password}</p>
                )}
              </div>
            )}

            {/* WhatsApp Number for Instructors */}
            {isInstructor && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t("users.whatsAppNumber", {
                    defaultValue: "WhatsApp Number",
                  })}
                </label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="tel"
                    value={formData.whatsappNumber}
                    onChange={(e) =>
                      handleInputChange("whatsappNumber", e.target.value)
                    }
                    className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                    placeholder={t("users.whatsAppNumberPlaceholder", {
                      defaultValue: "WhatsApp Number",
                    })}
                  />
                </div>
                {errors.whatsappNumber && (
                  <p className="mt-1 text-sm text-red-600">
                    {errors.whatsappNumber}
                  </p>
                )}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t("users.role")} *
              </label>
              <select
                value={formData.role}
                onChange={(e) =>
                  handleInputChange(
                    "role",
                    e.target.value as "INSTRUCTOR" | "USER",
                  )
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-pink-500 focus:border-transparent"
              >
                <option value="USER">{t("roles.user")}</option>
                <option value="INSTRUCTOR">{t("roles.instructor")}</option>
              </select>
            </div>
          </div>

          {/* Instructor-specific fields */}
          {isInstructor && (
            <div className="space-y-4">
              <h4 className="text-md font-medium text-gray-900 flex items-center">
                <Star className="h-5 w-5 mr-2" />
                {t("users.instructorInformation")}
              </h4>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t("users.specialties")} *
                </label>
                <input
                  type="text"
                  value={formData.specialties.join(", ")}
                  onChange={(e) =>
                    handleArrayChange("specialties", e.target.value)
                  }
                  className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-pink-500 focus:border-transparent ${
                    errors.specialties ? "border-red-500" : "border-gray-300"
                  }`}
                  placeholder={t("users.specialtiesPlaceholder")}
                />
                <p className="mt-1 text-sm text-gray-500">
                  {t("users.specialtiesHelp")}
                </p>
                {errors.specialties && (
                  <p className="mt-1 text-sm text-red-600">
                    {errors.specialties}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t("users.languages")} *
                </label>
                <input
                  type="text"
                  value={formData.languages.join(", ")}
                  onChange={(e) =>
                    handleArrayChange("languages", e.target.value)
                  }
                  className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-pink-500 focus:border-transparent ${
                    errors.languages ? "border-red-500" : "border-gray-300"
                  }`}
                  placeholder={t("users.languagesPlaceholder")}
                />
                <p className="mt-1 text-sm text-gray-500">
                  {t("users.languagesHelp")}
                </p>
                {errors.languages && (
                  <p className="mt-1 text-sm text-red-600">
                    {errors.languages}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Student-specific fields */}
          {isStudent && (
            <div className="space-y-4">
              <h4 className="text-md font-medium text-gray-900 flex items-center">
                <User className="h-5 w-5 mr-2" />
                {t("users.studentInformation")}
              </h4>

              {/* WhatsApp & Discipline */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t("users.whatsAppNumber")} *
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      type="tel"
                      value={formData.whatsappNumber}
                      onChange={(e) =>
                        handleInputChange("whatsappNumber", e.target.value)
                      }
                      className={`w-full pl-10 pr-3 py-2 border rounded-md focus:ring-2 focus:ring-pink-500 focus:border-transparent ${
                        errors.whatsappNumber
                          ? "border-red-500"
                          : "border-gray-300"
                      }`}
                      placeholder={t("users.phoneNumberPlaceholder")}
                    />
                  </div>
                  {errors.whatsappNumber && (
                    <p className="mt-1 text-sm text-red-600">
                      {errors.whatsappNumber}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t("users.preferredDiscipline")} *
                  </label>
                  {!school?.disciplines || school.disciplines.length === 0 ? (
                    <div className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-500 text-sm">
                      {t("users.noDisciplinesConfigured", {
                        defaultValue: "No disciplines configured.",
                      })}
                    </div>
                  ) : (
                    <select
                      value={formData.primarySport}
                      onChange={(e) =>
                        handleInputChange("primarySport", e.target.value)
                      }
                      className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-pink-500 focus:border-transparent ${
                        errors.primarySport
                          ? "border-red-500"
                          : "border-gray-300"
                      }`}
                    >
                      <option value="">{t("common.select")}</option>
                      {school.disciplines.map((discipline) => (
                        <option key={discipline} value={discipline}>
                          {discipline}
                        </option>
                      ))}
                    </select>
                  )}
                  {errors.primarySport && (
                    <p className="mt-1 text-sm text-red-600">
                      {errors.primarySport}
                    </p>
                  )}
                </div>
              </div>

              {/* DOB & Nationality */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t("common.dateOfBirth")} *
                  </label>
                  <input
                    type="date"
                    value={formData.dateOfBirth}
                    onChange={(e) =>
                      handleInputChange("dateOfBirth", e.target.value)
                    }
                    className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-pink-500 focus:border-transparent ${
                      errors.dateOfBirth ? "border-red-500" : "border-gray-300"
                    }`}
                  />
                  {errors.dateOfBirth && (
                    <p className="mt-1 text-sm text-red-600">
                      {errors.dateOfBirth}
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t("users.nationality")} *
                  </label>
                  <input
                    type="text"
                    value={formData.nationality}
                    onChange={(e) =>
                      handleInputChange("nationality", e.target.value)
                    }
                    className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-pink-500 focus:border-transparent ${
                      errors.nationality ? "border-red-500" : "border-gray-300"
                    }`}
                    placeholder={t("users.placeholders.nationality")}
                  />
                  {errors.nationality && (
                    <p className="mt-1 text-sm text-red-600">
                      {errors.nationality}
                    </p>
                  )}
                </div>
              </div>

              {/* Height & Weight */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t("users.height")} *
                  </label>
                  <div className="relative">
                    <Ruler className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      type="number"
                      min="0"
                      value={formData.height || ""}
                      onChange={(e) => {
                        const value = e.target.value;
                        handleInputChange(
                          "height",
                          value === ""
                            ? ""
                            : isNaN(parseInt(value))
                              ? formData.height
                              : parseInt(value),
                        );
                      }}
                      className={`w-full pl-10 pr-3 py-2 border rounded-md focus:ring-2 focus:ring-pink-500 focus:border-transparent ${
                        errors.height ? "border-red-500" : "border-gray-300"
                      }`}
                      placeholder="170"
                    />
                    <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 text-sm">
                      cm
                    </span>
                  </div>
                  {errors.height && (
                    <p className="mt-1 text-sm text-red-600">{errors.height}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t("users.weight")} *
                  </label>
                  <div className="relative">
                    <Weight className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      type="number"
                      min="0"
                      value={formData.weight || ""}
                      onChange={(e) => {
                        const value = e.target.value;
                        handleInputChange(
                          "weight",
                          value === ""
                            ? ""
                            : isNaN(parseInt(value))
                              ? formData.weight
                              : parseInt(value),
                        );
                      }}
                      className={`w-full pl-10 pr-3 py-2 border rounded-md focus:ring-2 focus:ring-pink-500 focus:border-transparent ${
                        errors.weight ? "border-red-500" : "border-gray-300"
                      }`}
                      placeholder="70"
                    />
                    <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 text-sm">
                      kg
                    </span>
                  </div>
                  {errors.weight && (
                    <p className="mt-1 text-sm text-red-600">{errors.weight}</p>
                  )}
                </div>
              </div>

              {/* Can Swim & Student Level */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t("users.canSwim")} *
                  </label>
                  <div className="flex space-x-4 mt-2">
                    <label className="inline-flex items-center">
                      <input
                        type="radio"
                        className="form-radio text-pink-600"
                        name="canSwim"
                        checked={formData.canSwim === true}
                        onChange={() => handleInputChange("canSwim", true)}
                      />
                      <span className="ml-2">{t("users.yes")}</span>
                    </label>
                    <label className="inline-flex items-center">
                      <input
                        type="radio"
                        className="form-radio text-pink-600"
                        name="canSwim"
                        checked={formData.canSwim === false}
                        onChange={() => handleInputChange("canSwim", false)}
                      />
                      <span className="ml-2">{t("users.no")}</span>
                    </label>
                  </div>
                  {errors.canSwim && (
                    <p className="mt-1 text-sm text-red-600">
                      {errors.canSwim}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t("users.studentLevel")}
                  </label>
                  {levelsLoading ? (
                    <div className="text-sm text-gray-500">Loading...</div>
                  ) : (
                    <select
                      value={formData.studentLevel}
                      onChange={(e) =>
                        handleInputChange("studentLevel", e.target.value)
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                    >
                      {studentLevels
                        ?.filter(
                          (level: any) => level.active || level.is_active,
                        )
                        .map((level: any) => (
                          <option key={level.id} value={level.slug}>
                            {level.name}
                          </option>
                        ))}
                    </select>
                  )}
                </div>
              </div>

              {/* Riding Background */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t("users.ridingBackground")}
                </label>
                <textarea
                  value={formData.ridingBackground}
                  onChange={(e) =>
                    handleInputChange("ridingBackground", e.target.value)
                  }
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                  placeholder={t("users.placeholders.shortText")}
                />
              </div>

              {/* Preferences: Days, Times, Lesson Types, Language */}
              <div className="space-y-4 border-t pt-4">
                <h5 className="font-medium text-gray-900">
                  {t("users.preferences")}
                </h5>

                {/* Preferred Days */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t("users.preferredDays")}
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {[
                      "monday",
                      "tuesday",
                      "wednesday",
                      "thursday",
                      "friday",
                      "saturday",
                      "sunday",
                    ].map((day) => (
                      <label
                        key={day}
                        className="inline-flex items-center space-x-1 border rounded px-2 py-1 bg-gray-50 cursor-pointer hover:bg-gray-100"
                      >
                        <input
                          type="checkbox"
                          className="rounded text-pink-600 focus:ring-pink-500"
                          checked={formData.preferredDays.includes(day)}
                          onChange={(e) => {
                            const current = formData.preferredDays;
                            const newArr = e.target.checked
                              ? [...current, day]
                              : current.filter((d) => d !== day);
                            handleInputChange("preferredDays", newArr);
                          }}
                        />
                        <span className="text-sm capitalize">
                          {t(`users.days.${day}`)}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Preferred Time Slots */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t("users.preferredTimeSlots")}
                  </label>
                  <div className="flex gap-4">
                    {["morning", "afternoon"].map((slot) => (
                      <label
                        key={slot}
                        className="inline-flex items-center space-x-2"
                      >
                        <input
                          type="checkbox"
                          className="rounded text-pink-600 focus:ring-pink-500"
                          checked={formData.preferredTimeSlots.includes(slot)}
                          onChange={(e) => {
                            const current = formData.preferredTimeSlots;
                            const newArr = e.target.checked
                              ? [...current, slot]
                              : current.filter((s) => s !== slot);
                            handleInputChange("preferredTimeSlots", newArr);
                          }}
                        />
                        <span className="text-sm">{t(`users.${slot}`)}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Lesson Type */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t("users.lessonType")}
                  </label>
                  <div className="flex gap-4">
                    {["private", "semiPrivate", "group"].map((type) => (
                      <label
                        key={type}
                        className="inline-flex items-center space-x-2"
                      >
                        <input
                          type="checkbox"
                          className="rounded text-pink-600 focus:ring-pink-500"
                          checked={formData.preferredLessonTypes.includes(type)}
                          onChange={(e) => {
                            const current = formData.preferredLessonTypes;
                            const newArr = e.target.checked
                              ? [...current, type]
                              : current.filter((t) => t !== type);
                            handleInputChange("preferredLessonTypes", newArr);
                          }}
                        />
                        <span className="text-sm">{t(`users.${type}`)}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Preferred Language */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t("users.preferredLanguageLesson")}
                  </label>
                  <select
                    value={formData.preferredLanguage}
                    onChange={(e) =>
                      handleInputChange("preferredLanguage", e.target.value)
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                  >
                    <option value="">{t("common.select")}</option>
                    {SUPPORTED_LANGUAGES.map((lang) => (
                      <option key={lang.value} value={lang.value}>
                        {t(lang.labelKey)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Special Needs */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t("users.specialNeeds")}
                </label>
                <input
                  type="text"
                  value={formData.specialNeeds.join(", ")}
                  onChange={(e) =>
                    handleArrayChange("specialNeeds", e.target.value)
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                  placeholder={t("users.specialNeedsPlaceholder")}
                />
                <p className="mt-1 text-sm text-gray-500">
                  {t("users.specialNeedsHelp")}
                </p>
              </div>

              {/* Consents */}
              <div className="border-t pt-4 space-y-3 bg-gray-50 p-4 rounded-md">
                <h5 className="font-medium text-gray-900">
                  {t("users.declarationsConsents")}
                </h5>
                <label className="flex items-start space-x-3">
                  <input
                    type="checkbox"
                    className="mt-1 rounded text-pink-600 focus:ring-pink-500"
                    checked={formData.consentPhysicalCondition}
                    onChange={(e) =>
                      handleInputChange(
                        "consentPhysicalCondition",
                        e.target.checked,
                      )
                    }
                  />
                  <span className="text-sm text-gray-700">
                    {t("users.consents.physicalCondition")} *
                  </span>
                </label>

                <label className="flex items-start space-x-3">
                  <input
                    type="checkbox"
                    className="mt-1 rounded text-pink-600 focus:ring-pink-500"
                    checked={formData.consentTermsConditions}
                    onChange={(e) =>
                      handleInputChange(
                        "consentTermsConditions",
                        e.target.checked,
                      )
                    }
                  />
                  <span className="text-sm text-gray-700">
                    {t("users.consents.termsConditions")} *
                  </span>
                </label>

                <label className="flex items-start space-x-3">
                  <input
                    type="checkbox"
                    className="mt-1 rounded text-pink-600 focus:ring-pink-500"
                    checked={formData.consentGdpr}
                    onChange={(e) =>
                      handleInputChange("consentGdpr", e.target.checked)
                    }
                  />
                  <span className="text-sm text-gray-700">
                    {t("users.consents.gdpr")} *
                  </span>
                </label>

                <label className="flex items-start space-x-3">
                  <input
                    type="checkbox"
                    className="mt-1 rounded text-pink-600 focus:ring-pink-500"
                    checked={formData.consentPhotosVideos}
                    onChange={(e) =>
                      handleInputChange("consentPhotosVideos", e.target.checked)
                    }
                  />
                  <span className="text-sm text-gray-700">
                    {t("users.consents.photosVideos")}
                  </span>
                </label>

                <label className="flex items-start space-x-3">
                  <input
                    type="checkbox"
                    className="mt-1 rounded text-pink-600 focus:ring-pink-500"
                    checked={formData.consentMarketing}
                    onChange={(e) =>
                      handleInputChange("consentMarketing", e.target.checked)
                    }
                  />
                  <span className="text-sm text-gray-700">
                    {t("users.consents.marketing")}
                  </span>
                </label>

                {errors.consents && (
                  <p className="mt-1 text-sm text-red-600">{errors.consents}</p>
                )}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-pink-500"
            >
              {t("common.cancel")}
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-4 py-2 text-sm font-medium text-white bg-pink-600 border border-transparent rounded-md hover:bg-pink-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-pink-500 disabled:bg-pink-400"
            >
              {isLoading
                ? isInvite
                  ? t("users.sendingInvitation", { defaultValue: "Sending..." })
                  : isEditing
                    ? t("common.updating")
                    : t("common.creating")
                : isEditing
                  ? t("users.updateUser")
                  : isInvite
                    ? t("users.sendInvitation")
                    : t("users.createUser")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
