import React, { useState } from "react";
import { useTranslation } from "react-i18next";
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
import { schoolsApi } from "@/services/schools";
import { authApi } from "@/services/auth";
import { useDisciplines } from "@/hooks/useDisciplines";
import { toast } from "react-hot-toast";
import { useErrorTranslation } from "@/hooks/useErrorTranslation";
import { CustomUploadButton } from "@/components/schools/CustomUploadButton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuthStore } from "@/store/auth";

const schoolSchema = z.object({
  name: z.string().min(2, "School name must be at least 2 characters"),
  description: z.string().optional(),
  address: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email("Please enter a valid email address").optional(),
  website: z.string().url("Please enter a valid website URL").optional(),
  logo: z.union([
    z.string().url("Logo must be a valid URL"),
    z.literal(""),
    z.undefined(),
  ]).optional(),
  disciplines: z
    .array(z.string())
    .min(1, "At least one discipline is required"),
});

type SchoolFormData = z.infer<typeof schoolSchema>;

interface SchoolCreationFormProps {
  onSchoolCreated: (schoolId: string) => void;
  onSkip: () => void;
  isLoading?: boolean;
}

const SchoolCreationForm: React.FC<SchoolCreationFormProps> = ({
  onSchoolCreated,
  onSkip,
  isLoading = false,
}) => {
  const { t } = useTranslation();
  const { getTranslatedError } = useErrorTranslation();
  const { token } = useAuthStore();
  const { disciplines, isLoading: disciplinesLoading } = useDisciplines();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedDisciplines, setSelectedDisciplines] = useState<string[]>([]);
  const [logoUrl, setLogoUrl] = useState<string>("");

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<SchoolFormData>({
    resolver: zodResolver(schoolSchema),
    defaultValues: {
      name: "",
      description: "",
      address: "",
      phone: "",
      email: "",
      website: "",
      logo: "",
      disciplines: [],
    },
  });

  // Handle discipline selection
  const handleDisciplineChange = (discipline: string, checked: boolean) => {
    if (checked) {
      const newDisciplines = [...selectedDisciplines, discipline];
      setSelectedDisciplines(newDisciplines);
      setValue("disciplines", newDisciplines);
    } else {
      const newDisciplines = selectedDisciplines.filter(
        (d) => d !== discipline,
      );
      setSelectedDisciplines(newDisciplines);
      setValue("disciplines", newDisciplines);
    }
  };

  const onSubmit = async (data: SchoolFormData) => {
    setIsSubmitting(true);
    try {
      const schoolData = {
        ...data,
        logo: logoUrl || data.logo || undefined,
      };
      const school = await schoolsApi.create(schoolData);
      toast.success(t("school.schoolCreatedSuccess"));

      // Update user's school assignment
      try {
        await authApi.updateSchool(school.id);
        toast.success(t("auth.schoolCreated"));
      } catch (error) {
        console.error("Failed to update user school:", error);
        // Don't show error to user as school was created successfully
      }

      onSchoolCreated(school.id);
    } catch (error: any) {
      console.error("Failed to create school:", error);
      toast.error(getTranslatedError(error) || t("school.schoolCreateFailed"));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="bg-white rounded-lg shadow-sm p-6 mb-6 inline-block">
            <Logo size="lg" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            {t("school.createSchool")}
          </h1>
          <p className="text-gray-600">{t("school.schoolSetup")}</p>
        </div>

        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>{t("school.schoolInformation")}</CardTitle>
            <CardDescription>{t("school.schoolDetails")}</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              {/* Logo Upload Section */}
              <div className="space-y-3">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0">
                    <Avatar className="h-24 w-24 border-2 border-gray-300">
                      <AvatarImage 
                        src={logoUrl || undefined} 
                        alt="School logo" 
                        className="object-cover"
                      />
                      <AvatarFallback className="bg-gray-100 text-gray-700 text-xl font-semibold">
                        {(() => {
                          const name = watch("name") || "";
                          const words = name.trim().split(/\s+/);
                          if (words.length >= 2) {
                            return (words[0].charAt(0) + words[words.length - 1].charAt(0)).toUpperCase();
                          } else if (words.length === 1 && words[0].length >= 2) {
                            return words[0].substring(0, 2).toUpperCase();
                          }
                          return "SC";
                        })()}
                      </AvatarFallback>
                    </Avatar>
                  </div>
                  
                  <div className="flex-1 space-y-2">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        {t("schoolProfile.schoolLogo") || "School Logo"} (Optional)
                      </label>
                    </div>
                    
                    <p className="text-xs text-gray-500">
                      {t("schoolProfile.logoFormat")}
                    </p>
                    
                    {token && (
                      <div className="pt-2">
                        <CustomUploadButton
                          endpoint="schoolLogo"
                          headers={() => ({
                            Authorization: `Bearer ${token}`,
                          })}
                          onClientUploadComplete={(res: Array<{ url: string; name: string; size: number; key: string; ufsUrl?: string }>) => {
                            if (res && res[0]) {
                              const newLogoUrl = res[0].ufsUrl || res[0].url;
                              setLogoUrl(newLogoUrl);
                              setValue("logo", newLogoUrl);
                                  toast.success(t("schoolProfile.logoUpdated"));
                                }
                              }}
                              onUploadError={(error: Error) => {
                                console.error("Upload failed:", error);
                                toast.error(`${t("schoolProfile.uploadFailed")}: ${error.message}`);
                              }}
                              buttonText={logoUrl ? t("schoolProfile.changeLogo") : t("schoolProfile.addLogo")}
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* School Name */}
              <div>
                <label
                  htmlFor="name"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  {t("school.schoolName")} *
                </label>
                <Input
                  id="name"
                  type="text"
                  placeholder="Ridesk Watersports School"
                  {...register("name")}
                  className={errors.name ? "border-red-500" : ""}
                />
                {errors.name && (
                  <p className="text-red-500 text-sm mt-1">
                    {errors.name.message}
                  </p>
                )}
              </div>

              {/* Description */}
              <div>
                <label
                  htmlFor="description"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Description
                </label>
                <textarea
                  id="description"
                  rows={3}
                  placeholder="Tell us about your school..."
                  {...register("description")}
                  className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 ${
                    errors.description ? "border-red-500" : "border-gray-300"
                  }`}
                />
                {errors.description && (
                  <p className="text-red-500 text-sm mt-1">
                    {errors.description.message}
                  </p>
                )}
              </div>

              {/* Address */}
              <div>
                <label
                  htmlFor="address"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Address
                </label>
                <Input
                  id="address"
                  type="text"
                  placeholder="123 Beach Road, Coastal City"
                  {...register("address")}
                  className={errors.address ? "border-red-500" : ""}
                />
                {errors.address && (
                  <p className="text-red-500 text-sm mt-1">
                    {errors.address.message}
                  </p>
                )}
              </div>

              {/* Contact Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="phone"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Phone
                  </label>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="+1 (555) 123-4567"
                    {...register("phone")}
                    className={errors.phone ? "border-red-500" : ""}
                  />
                  {errors.phone && (
                    <p className="text-red-500 text-sm mt-1">
                      {errors.phone.message}
                    </p>
                  )}
                </div>

                <div>
                  <label
                    htmlFor="email"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Email
                  </label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="info@yourschool.com"
                    {...register("email")}
                    className={errors.email ? "border-red-500" : ""}
                  />
                  {errors.email && (
                    <p className="text-red-500 text-sm mt-1">
                      {errors.email.message}
                    </p>
                  )}
                </div>
              </div>

              {/* Website */}
              <div>
                <label
                  htmlFor="website"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Website
                </label>
                <Input
                  id="website"
                  type="url"
                  placeholder="https://yourschool.com"
                  {...register("website")}
                  className={errors.website ? "border-red-500" : ""}
                />
                {errors.website && (
                  <p className="text-red-500 text-sm mt-1">
                    {errors.website.message}
                  </p>
                )}
              </div>

              {/* Disciplines */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Disciplines *
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {disciplinesLoading ? (
                    <div className="col-span-3 text-center py-2">
                      <span className="text-sm text-gray-500">Loading disciplines...</span>
                    </div>
                  ) : (
                    disciplines.map((discipline) => (
                      <label
                        key={discipline.id}
                        className="flex items-center space-x-2"
                      >
                        <input
                          type="checkbox"
                          checked={selectedDisciplines.includes(discipline.slug)}
                          onChange={(e) =>
                            handleDisciplineChange(discipline.slug, e.target.checked)
                          }
                          className="rounded border-gray-300 text-pink-600 focus:ring-pink-500"
                        />
                        <span className="text-sm text-gray-700">
                          {discipline.display_name}
                        </span>
                      </label>
                    ))
                  )}
                </div>
                {errors.disciplines && (
                  <p className="text-red-500 text-sm mt-1">
                    {errors.disciplines.message}
                  </p>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-4 pt-4">
                <Button
                  type="submit"
                  className="flex-1"
                  disabled={isSubmitting || isLoading}
                >
                  {isSubmitting ? t("school.creatingSchool") : t("school.createSchool")}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={onSkip}
                  className="flex-1"
                  disabled={isSubmitting || isLoading}
                >
                  Skip for Now
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SchoolCreationForm;
