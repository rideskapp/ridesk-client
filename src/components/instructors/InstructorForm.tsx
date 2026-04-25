/**
 * @fileoverview Instructor Form Component
 * @description Form for creating and editing instructors
 * @author Ridesk Team
 * @version 1.0.0
 */

import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useForm, Controller } from "react-hook-form";
import { X, Plus, Trash2 } from "lucide-react";
import { PhoneInput } from "../ui/PhoneInput";
import { MultiSelect } from "../ui/multi-select";

import { LANGUAGE_OPTIONS } from "../../constants/languages";
import {
  Instructor,
  CreateInstructorRequest,
  UpdateInstructorRequest,
} from "../../services/instructors";
import { useDisciplines } from "../../hooks/useDisciplines";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { CustomUploadButton } from "../schools/CustomUploadButton";
import { useAuthStore } from "@/store/auth";
import { useSchoolSelectionStore } from "@/store/schoolSelection";
import { UserRole } from "@/types";
import { toast } from "react-hot-toast";
import { useErrorTranslation } from "@/hooks/useErrorTranslation";
import { instructorsApi } from "../../services/instructors";

interface InstructorFormProps {
  instructor?: Instructor | null;
  onSubmit: (data: CreateInstructorRequest | UpdateInstructorRequest) => void;
  onClose: () => void;
  isLoading: boolean;
  schoolId?: string;
}

export const InstructorForm: React.FC<InstructorFormProps> = ({
  instructor,
  onSubmit,
  onClose,
  isLoading,
  schoolId,
}) => {
  const { t } = useTranslation();
  const { getTranslatedError } = useErrorTranslation();
  const { user, token } = useAuthStore();
  const { selectedSchoolId } = useSchoolSelectionStore();

  const effectiveSchoolId = schoolId
    ? schoolId
    : user?.role === UserRole.SUPER_ADMIN
      ? (selectedSchoolId ?? undefined)
      : user?.schoolId;

  const { disciplines, isLoading: disciplinesLoading } =
    useDisciplines(effectiveSchoolId);
  const isEditing = !!instructor;

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
    setValue,
    control,
  } = useForm<CreateInstructorRequest>({
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      whatsappNumber: "",
      specialties: [],
      certifications: [],
      languages: [],
      isPrimary: false,
    },
    mode: "onChange",
  });

  const [certifications, setCertifications] = useState<string[]>([]);
  const [newCertification, setNewCertification] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string>(instructor?.avatar || "");

  // Initialize form with instructor data if editing
  useEffect(() => {
    if (instructor) {
      console.log("Initializing form with instructor data:", instructor);
      reset({
        firstName: instructor.firstName,
        lastName: instructor.lastName,
        email: instructor.email,
        whatsappNumber: instructor.whatsappNumber || "",
        specialties: instructor.specialties || [],
        certifications: instructor.certifications || [],
        languages: instructor.languages || [],
        isPrimary: instructor.isPrimary,
      });
      setCertifications(instructor.certifications || []);
      setAvatarUrl(instructor.avatar || "");
    } else {
      setAvatarUrl("");
    }
  }, [instructor, reset]);

  const handleFormSubmit = (data: CreateInstructorRequest) => {
    // Filter out empty strings and only send changed fields
    const filteredData: any = {};

    // Only include fields that have values (not empty strings)
    if (data.firstName && data.firstName.trim())
      filteredData.firstName = data.firstName.trim();
    if (data.lastName && data.lastName.trim())
      filteredData.lastName = data.lastName.trim();
    if (!isEditing && data.email && data.email.trim()) {
      filteredData.email = data.email.trim();
    }
    if (data.whatsappNumber && data.whatsappNumber.trim())
      filteredData.whatsappNumber = data.whatsappNumber.trim();
    if (avatarUrl) filteredData.avatar = avatarUrl;
    if (data.specialties && data.specialties.length > 0)
      filteredData.specialties = data.specialties;
    if (certifications && certifications.length > 0)
      filteredData.certifications = certifications;
    if (data.languages && data.languages.length > 0)
      filteredData.languages = data.languages;
    if (data.isPrimary !== undefined) filteredData.isPrimary = data.isPrimary;

    console.log("Filtered instructor data to send:", filteredData);
    onSubmit(filteredData);
  };

  const handleSpecialtyChange = (specialty: string, checked: boolean) => {
    const currentSpecialties = watch("specialties");
    if (checked) {
      setValue("specialties", [...currentSpecialties, specialty]);
    } else {
      setValue(
        "specialties",
        currentSpecialties.filter((s) => s !== specialty),
      );
    }
  };

  const handleAddCertification = () => {
    if (newCertification.trim()) {
      setCertifications([...certifications, newCertification.trim()]);
      setNewCertification("");
    }
  };

  const handleRemoveCertification = (index: number) => {
    setCertifications(certifications.filter((_, i) => i !== index));
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-2 sm:p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[95vh] sm:max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-6 border-b">
          <h2 className="text-lg sm:text-xl font-semibold text-gray-900">
            {isEditing
              ? t("instructors.editInstructor")
              : t("instructors.createInstructor")}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>
        </div>

        {/* Form */}
        <form
          key={instructor?.id || "new"}
          onSubmit={handleSubmit(handleFormSubmit)}
          className="p-4 sm:p-6 space-y-4 sm:space-y-6"
        >
          {/* Avatar Upload Section */}
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row items-start gap-3 sm:gap-4">
              <div className="flex-shrink-0 self-center sm:self-start">
                <Avatar className="h-20 w-20 sm:h-24 sm:w-24 border-2 border-gray-300">
                  <AvatarImage
                    src={avatarUrl || undefined}
                    alt="Instructor profile"
                    className="object-cover"
                  />
                  <AvatarFallback className="bg-gray-100 text-gray-700 text-xl font-semibold">
                    {(() => {
                      const firstName =
                        instructor?.firstName || watch("firstName") || "";
                      const lastName =
                        instructor?.lastName || watch("lastName") || "";
                      if (firstName && lastName) {
                        return (
                          firstName.charAt(0) + lastName.charAt(0)
                        ).toUpperCase();
                      } else if (firstName) {
                        return firstName.substring(0, 2).toUpperCase();
                      }
                      return "IN";
                    })()}
                  </AvatarFallback>
                </Avatar>
              </div>

              <div className="flex-1 space-y-2">
                <div>
                  <span className="block text-sm font-medium text-gray-700">
                    {t("instructors.profilePicture") || "Profile Picture"}
                  </span>
                </div>

                <p className="text-xs text-gray-500">
                  {t("schoolProfile.logoFormat") || "PNG or JPEG, max 1MB"}
                </p>

                {token && (
                  <div className="pt-2">
                    <CustomUploadButton
                      endpoint="instructorProfilePic"
                      headers={() => ({
                        Authorization: `Bearer ${token}`,
                      })}
                      onClientUploadComplete={(
                        res: Array<{
                          url: string;
                          name: string;
                          size: number;
                          key: string;
                          ufsUrl?: string;
                        }>,
                      ) => {
                        if (res && res[0]) {
                          const newAvatarUrl = res[0].ufsUrl || res[0].url;
                          setAvatarUrl(newAvatarUrl);

                          if (instructor?.id) {
                            instructorsApi
                              .updateInstructor(instructor.id, {
                                avatar: newAvatarUrl,
                              })
                              .then(() => {
                                toast.success(
                                  t("instructors.profilePictureUpdated") ||
                                    "Profile picture updated",
                                );
                              })
                              .catch((error: any) => {
                                console.error(
                                  "Failed to update profile picture:",
                                  error,
                                );
                                toast.error(
                                  getTranslatedError(error) ||
                                    t(
                                      "instructors.profilePictureUpdateFailed",
                                    ) ||
                                    "Failed to update profile picture",
                                );
                              });
                          }
                        }
                      }}
                      onUploadError={(error: Error) => {
                        console.error("Upload failed:", error);
                        toast.error(
                          `${t("schoolProfile.uploadFailed") || "Upload failed"}: ${error.message}`,
                        );
                      }}
                      buttonText={
                        avatarUrl
                          ? t("instructors.changeProfilePicture") ||
                            "Change Picture"
                          : t("instructors.addProfilePicture") || "Add Picture"
                      }
                    />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Basic Information */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              {t("instructors.instructorDetails")}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* First Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t("instructors.firstName")}{" "}
                  <span className="text-red-500">*</span>
                </label>
                <input
                  {...register("firstName", { required: true })}
                  type="text"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-pink-500"
                  placeholder={t("instructors.firstName")}
                />
                {errors.firstName && (
                  <p className="text-red-500 text-sm mt-1">
                    {t("instructors.required")}
                  </p>
                )}
              </div>

              {/* Last Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t("instructors.lastName")}{" "}
                  <span className="text-red-500">*</span>
                </label>
                <input
                  {...register("lastName", { required: true })}
                  type="text"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-pink-500"
                  placeholder={t("instructors.lastName")}
                />
                {errors.lastName && (
                  <p className="text-red-500 text-sm mt-1">
                    {t("instructors.required")}
                  </p>
                )}
              </div>

              {/* Email - Always show, but disable when editing */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t("instructors.email")}{" "}
                  <span className="text-red-500">*</span>
                </label>
                <input
                  {...register("email", {
                    required: true,
                    pattern: /^\S+@\S+$/i,
                  })}
                  type="email"
                  disabled={isEditing}
                  className={`w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-pink-500 ${
                    isEditing ? "bg-gray-100 cursor-not-allowed" : ""
                  }`}
                  placeholder={t("instructors.email")}
                />
                {errors.email && (
                  <p className="text-red-500 text-sm mt-1">
                    {t("instructors.required")}
                  </p>
                )}
              </div>

              {/* WhatsApp Number */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t("instructors.whatsappNumber", {
                    defaultValue: "WhatsApp Number",
                  })}{" "}
                  <span className="text-red-500">*</span>
                </label>
                <Controller
                  name="whatsappNumber"
                  control={control}
                  rules={{
                    required: t("instructors.whatsappNumberRequired", {
                      defaultValue: "WhatsApp number is required",
                    }),
                  }}
                  render={({ field: { onChange, value } }) => (
                    <PhoneInput
                      value={value || ""}
                      onChange={onChange}
                      error={errors.whatsappNumber?.message}
                      placeholder={t("instructors.whatsappNumberPlaceholder", {
                        defaultValue: "WhatsApp Number",
                      })}
                      defaultCountry="US"
                    />
                  )}
                />
              </div>
            </div>
          </div>

          {/* Specialties */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t("instructors.specialties")}{" "}
              <span className="text-red-500">*</span>
            </label>
            <div className="space-y-2">
              {disciplinesLoading ? (
                <div className="text-center py-2">
                  <span className="text-sm text-gray-500">
                    {t("common.loadingDisciplines")}
                  </span>
                </div>
              ) : (
                disciplines.map((discipline) => (
                  <label key={discipline.id} className="flex items-center">
                    <input
                      type="checkbox"
                      checked={
                        watch("specialties")?.includes(discipline.slug) || false
                      }
                      onChange={(e) =>
                        handleSpecialtyChange(discipline.slug, e.target.checked)
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
            {errors.specialties && (
              <p className="text-red-500 text-sm mt-1">
                {t("instructors.required")}
              </p>
            )}
          </div>

          {/* Languages - Shifted above Certifications */}
          <div>
            <label
              htmlFor="languages"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              {t("instructors.languages")}{" "}
              <span className="text-red-500">*</span>
            </label>
            <Controller
              name="languages"
              control={control}
              rules={{ required: t("instructors.required") }}
              render={({ field: { onChange, value, name } }) => (
                <MultiSelect
                  id={name}
                  options={LANGUAGE_OPTIONS.map((lang) => ({
                    value: lang,
                    label: lang,
                  }))}
                  selected={value || []}
                  onChange={onChange}
                  placeholder={t("instructors.selectLanguages")}
                  aria-describedby={
                    errors.languages ? `${name}-error` : undefined
                  }
                />
              )}
            />
            {errors.languages && (
              <p id="languages-error" className="text-red-500 text-sm mt-1">
                {errors.languages.message as string}
              </p>
            )}
          </div>

          {/* Certifications - Now below Languages */}
          <div>
            <label
              className="block text-sm font-medium text-gray-700 mb-2"
              htmlFor="certification-input"
            >
              {t("instructors.certifications")}
            </label>
            <div className="space-y-2">
              {(certifications || []).map((cert, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between bg-gray-50 p-2 rounded"
                >
                  <span className="text-sm text-gray-700">{cert}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveCertification(index)}
                    className="text-red-500 hover:text-red-700"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
              <div className="flex space-x-2">
                <input
                  id="certification-input"
                  type="text"
                  value={newCertification}
                  onChange={(e) => setNewCertification(e.target.value)}
                  placeholder={t("instructors.addCertificationPlaceholder")}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-pink-500"
                />
                <button
                  type="button"
                  onClick={handleAddCertification}
                  className="px-3 py-2 bg-pink-600 text-white rounded-md hover:bg-pink-700"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Primary Instructor */}
          <div>
            <label className="flex items-center">
              <input
                {...register("isPrimary")}
                type="checkbox"
                className="h-4 w-4 text-pink-600 focus:ring-pink-500 border-gray-300 rounded"
              />
              <span className="ml-2 text-sm text-gray-700">
                {t("instructors.isPrimary")}
              </span>
            </label>
          </div>

          {/* Form Actions */}
          <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 sm:gap-4 pt-4 sm:pt-6 border-t">
            <button
              type="button"
              onClick={onClose}
              className="w-full sm:w-auto px-4 sm:px-6 py-2 sm:py-3 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              {t("common.cancel")}
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="w-full sm:w-auto px-4 sm:px-6 py-2 sm:py-3 bg-pink-600 text-white rounded-lg hover:bg-pink-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading
                ? isEditing
                  ? t("instructors.updatingInstructor")
                  : t("instructors.creatingInstructor")
                : isEditing
                  ? t("common.save")
                  : t("instructors.createInstructor")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
