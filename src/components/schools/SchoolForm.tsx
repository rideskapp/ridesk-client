import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { useErrorTranslation } from "@/hooks/useErrorTranslation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import Logo from "@/components/Logo";
import { schoolsApi, School } from "@/services/schools";
import { toast } from "react-hot-toast";

const schoolSchema = z.object({
  name: z.string().min(2, "School name must be at least 2 characters"),
  address: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email("Please enter a valid email address").optional(),
  website: z.string().url("Please enter a valid website URL").optional(),
  openHoursStart: z.string().min(1, "Open time is required"),
  openHoursEnd: z.string().min(1, "Close time is required"),
  disciplines: z.array(z.string()).optional(),
});

type SchoolFormData = z.infer<typeof schoolSchema>;

interface SchoolFormProps {
  school?: School; // If provided, we're editing; if not, we're creating
  onSchoolSaved: (school: School) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

const SchoolForm: React.FC<SchoolFormProps> = ({
  school,
  onSchoolSaved,
  onCancel,
  isLoading = false,
}) => {
  const { t } = useTranslation();
  const { getTranslatedError } = useErrorTranslation();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isEditing = !!school;

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SchoolFormData>({
    resolver: zodResolver(schoolSchema),
    defaultValues: {
      name: school?.name || "",
      address: school?.address || "",
      phone: school?.phone || "",
      email: school?.email || "",
      website: school?.website || "",
      openHoursStart: school?.openHoursStart || "09:00",
      openHoursEnd: school?.openHoursEnd || "18:00",
      disciplines: school?.disciplines || [],
    },
  });

  const onSubmit = async (data: SchoolFormData) => {
    setIsSubmitting(true);
    try {
      let savedSchool: School;

      if (isEditing && school) {
        // Update existing school
        savedSchool = await schoolsApi.update(school.id, data);
        toast.success(t("school.schoolUpdated"));
      } else {
        // Create new school
        savedSchool = await schoolsApi.create({
          ...data,
          disciplines: data.disciplines || [],
        });
        toast.success(t("school.schoolCreated"));
      }

      onSchoolSaved(savedSchool);
    } catch (error: any) {
      console.error("School save error:", error);
      const errorMessage = getTranslatedError(error) ||
        (isEditing
          ? t("school.schoolUpdateFailed")
          : t("school.schoolCreateFailed"));
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        <div className="text-center mb-8">
          <Logo />
          <h1 className="text-3xl font-bold text-gray-900 mt-6">
            {isEditing ? t("school.editSchool") : t("school.createSchool")}
          </h1>
          <p className="text-gray-600 mt-2">
            {isEditing
              ? t("school.editSchoolDescription")
              : t("school.schoolSetup")}
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{t("school.schoolInformation")}</CardTitle>
            <CardDescription>
              {isEditing
                ? t("school.editSchoolDetails")
                : t("school.schoolDetails")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t("school.schoolName")} *
                </label>
                <Input
                  {...register("name")}
                  placeholder={t("school.schoolNamePlaceholder")}
                  className="w-full"
                />
                {errors.name && (
                  <p className="text-red-500 text-sm mt-1">
                    {errors.name.message}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t("school.address")}
                </label>
                <Input
                  {...register("address")}
                  placeholder={t("school.addressPlaceholder")}
                  className="w-full"
                />
                {errors.address && (
                  <p className="text-red-500 text-sm mt-1">
                    {errors.address.message}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t("school.openHoursStart")} *
                  </label>
                  <Input
                    {...register("openHoursStart")}
                    type="time"
                    className="w-full"
                  />
                  {errors.openHoursStart && (
                    <p className="text-red-500 text-sm mt-1">
                      {errors.openHoursStart.message}
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t("school.openHoursEnd")} *
                  </label>
                  <Input
                    {...register("openHoursEnd")}
                    type="time"
                    className="w-full"
                  />
                  {errors.openHoursEnd && (
                    <p className="text-red-500 text-sm mt-1">
                      {errors.openHoursEnd.message}
                    </p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t("school.phone")}
                  </label>
                  <Input
                    {...register("phone")}
                    placeholder={t("school.phonePlaceholder")}
                    className="w-full"
                  />
                  {errors.phone && (
                    <p className="text-red-500 text-sm mt-1">
                      {errors.phone.message}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t("school.email")}
                  </label>
                  <Input
                    {...register("email")}
                    type="email"
                    placeholder={t("school.emailPlaceholder")}
                    className="w-full"
                  />
                  {errors.email && (
                    <p className="text-red-500 text-sm mt-1">
                      {errors.email.message}
                    </p>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t("school.website")}
                </label>
                <Input
                  {...register("website")}
                  placeholder={t("school.websitePlaceholder")}
                  className="w-full"
                />
                {errors.website && (
                  <p className="text-red-500 text-sm mt-1">
                    {errors.website.message}
                  </p>
                )}
              </div>

              <div className="flex justify-end space-x-4 pt-6">
                <Button
                  type="button"
                  variant="outline"
                  onClick={onCancel}
                  disabled={isSubmitting || isLoading}
                >
                  {t("common.cancel")}
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting || isLoading}
                  className="bg-pink-600 hover:bg-pink-700"
                >
                  {isSubmitting
                    ? t("common.loading")
                    : isEditing
                    ? t("common.save")
                    : t("common.create")}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SchoolForm;
