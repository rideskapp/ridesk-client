import React, { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { schoolsApi, School } from "@/services/schools";
import { useAllDisciplines } from "@/hooks/useDisciplines";
import { toast } from "react-hot-toast";
import { Mail, Phone, MapPin, Globe, Clock, Send, Link as LinkIcon, Copy } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { invitationsApi } from "@/services/invitations";
import { useTranslation } from "react-i18next";
import { useErrorTranslation } from "@/hooks/useErrorTranslation";
import { CustomUploadButton } from "./CustomUploadButton";
import { useAuthStore } from "@/store/auth";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { useSchoolSettings } from "@/hooks/useSchoolSettings";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  MOST_USED_CURRENCIES,
  OTHER_CURRENCIES,
  CurrencyDefinition,
} from "@/lib/currency";

interface SuperAdminSchoolFormProps {
  school?: School;
  onSchoolSaved: (school: School) => void;
  isLoading?: boolean;
  readOnly?: boolean;
  showDisciplineNote?: boolean;
}

const SuperAdminSchoolForm: React.FC<SuperAdminSchoolFormProps> = ({
  school,
  onSchoolSaved,
  isLoading = false,
  readOnly = false,
  showDisciplineNote = true,
}) => {
  const { t } = useTranslation();
  const { getTranslatedError } = useErrorTranslation();
  const { token } = useAuthStore();
  const { disciplines: schoolDisciplines } = useAllDisciplines(school?.id);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedDisciplines, setSelectedDisciplines] = useState<string[]>([]);
  const [logoUrl, setLogoUrl] = useState<string>(school?.logo || "");
  const { settings: schoolSettings } = useSchoolSettings(school?.id);
  const [selectedCurrency, setSelectedCurrency] = useState<string>("EUR");
  const [copied, setCopied] = useState(false);
  const [copiedStudent, setCopiedStudent] = useState(false);

  const isEditing = !!school;
  const isReadOnly = readOnly === true;

  const baseSchema = z.object({
    name: z.string().min(2, t("schoolProfile.validations.nameMinLength")),
    address: z.string().optional(),
    phone: z.string().optional(),
    email: z.union([
      z.string().email(t("schoolProfile.validations.invalidEmail")),
      z.literal("")
    ]).optional(),
    website: z.union([
      z.string().url(t("schoolProfile.validations.invalidWebsite")),
      z.literal("")
    ]).optional(),
    openHoursStart: z.string().min(1, t("schoolProfile.validations.openTimeRequired")),
    openHoursEnd: z.string().min(1, t("schoolProfile.validations.closeTimeRequired")),
    disciplines: z.array(z.string()).default([]),
  });

  const schoolSchema = isEditing
    ? baseSchema // When editing, disciplines are optional
    : baseSchema.refine(
      (data) => data.disciplines.length > 0,
      {
        message: t("schoolProfile.validations.disciplineRequired"),
        path: ["disciplines"],
      }
    );

  type SchoolFormData = z.infer<typeof schoolSchema>;

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
    reset,
  } = useForm<SchoolFormData>({
    resolver: zodResolver(schoolSchema),
    defaultValues: {
      name: school?.name || "",
      address: school?.address || "",
      phone: school?.phone || "",
      email: school?.email || "",
      website: school?.website || "",
      openHoursStart: (school?.openHoursStart || "09:00").slice(0, 5),
      openHoursEnd: (school?.openHoursEnd || "18:00").slice(0, 5),
      disciplines: school?.disciplines || [],
    },
  });

  useEffect(() => {
    if (school?.id) {
      reset({
        name: school.name || "",
        address: school.address ?? "",
        phone: school.phone ?? "",
        email: school.email ?? "",
        website: school.website ?? "",
        openHoursStart: (school.openHoursStart || "09:00").slice(0, 5),
        openHoursEnd: (school.openHoursEnd || "18:00").slice(0, 5),
        disciplines: school.disciplines || [],
      }, {
        keepDefaultValues: false,
      });
    }
  }, [school, reset]);

  useEffect(() => {
    if (school?.logo !== undefined) {
      setLogoUrl(school.logo || "");
    }

    if (school?.id) {
      if (schoolDisciplines.length > 0) {
        const disciplineSlugs = schoolDisciplines.map((d) => d.slug);
        setSelectedDisciplines(disciplineSlugs);
        setValue("disciplines", disciplineSlugs);
      } else if (school?.disciplines && school.disciplines.length > 0) {
        setSelectedDisciplines(school.disciplines);
        setValue("disciplines", school.disciplines);
      } else {
        setSelectedDisciplines([]);
        setValue("disciplines", []);
      }
    }
  }, [school, schoolDisciplines, setValue]);

  useEffect(() => {
    if (schoolSettings?.defaultCurrency) {
      setSelectedCurrency(schoolSettings.defaultCurrency);
    } else {
      setSelectedCurrency("EUR");
    }

  }, [schoolSettings]);

  const toHHMM = (v?: string) => (v ? v.slice(0, 5) : v);

  const instructorRegistrationLink =
    school?.id
      ? `${window.location.origin}/instructor-registration/${school.id}`
      : "";
  const studentRegistrationLink = school?.id
    ? `${window.location.origin}/student-registration/${school.id}`
    : "";

  const onSubmit = async (data: SchoolFormData) => {
    setIsSubmitting(true);
    try {
      const payload: any = {
        ...data,
        openHoursStart: toHHMM(data.openHoursStart) || "",
        openHoursEnd: toHHMM(data.openHoursEnd) || "",
        disciplines: data.disciplines || [],
      };

      if (isEditing && school) {
        payload.email = data.email === "" ? null : (data.email || undefined);
        payload.website = data.website === "" ? null : (data.website || undefined);
        payload.address = data.address === "" ? null : (data.address || undefined);
        payload.phone = data.phone === "" ? null : (data.phone || undefined);
      } else {
        payload.email = data.email === "" ? undefined : data.email;
        payload.website = data.website === "" ? undefined : data.website;
        payload.address = data.address === "" ? undefined : data.address;
        payload.phone = data.phone === "" ? undefined : data.phone;
      }

      let saved: School;
      if (isEditing && school) {
        saved = await schoolsApi.update(school.id, payload);
        toast.success(t("schoolProfile.schoolUpdated"));
      } else {
        if (!payload.disciplines || payload.disciplines.length === 0) {
          toast.error(t("schoolProfile.validations.disciplineRequired"));
          setIsSubmitting(false);
          return;
        }
        saved = await schoolsApi.create(payload);
        toast.success(t("schoolProfile.schoolCreated"));
      }

      // Update school settings with default currency when a school exists
      if (saved.id) {
        try {
          const { schoolSettingsApi } = await import("@/services/schoolSettings");
          await schoolSettingsApi.update(saved.id, {
            defaultCurrency: selectedCurrency,
          });
        } catch (error) {
          console.error("Failed to update default currency:", error);
          toast.error(
            t("schoolProfile.failedToSave") ||
              "Failed to update school operational settings",
          );
        }
      }
      onSchoolSaved(saved);
    } catch (error: any) {
      console.error("School save error:", error);
      toast.error(getTranslatedError(error) || t("schoolProfile.failedToSave"));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-3 sm:p-4 lg:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-0 mb-4 sm:mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold text-gray-900">{t("schoolProfile.title")}</h1>
          <p className="text-xs sm:text-sm text-gray-600">{t("schoolProfile.subtitle")}</p>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3 w-full sm:w-auto">
          <LanguageSwitcher />
          <Button
            type="button"
            onClick={handleSubmit(onSubmit)}
            disabled={isSubmitting || isLoading}
            className="bg-pink-600 hover:bg-pink-700 text-sm sm:text-base px-3 sm:px-4 py-2 w-full sm:w-auto"
            style={{ display: isReadOnly ? "none" : undefined }}
          >
            {isSubmitting ? t("schoolProfile.saving") : isEditing ? t("schoolProfile.saveChanges") : t("schoolProfile.createSchool")}
          </Button>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          {/* Left: School Information */}
          <Card>
            <CardHeader>
              <CardTitle>{t("schoolProfile.schoolInformation")}</CardTitle>
              <CardDescription>{t("schoolProfile.primaryDetails")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Logo Upload Section */}
              <div className="space-y-3">
                <div className="flex flex-col sm:flex-row items-start gap-3 sm:gap-4">
                  <div className="flex-shrink-0 self-center sm:self-start">
                    <Avatar className="h-20 w-20 sm:h-24 sm:w-24 border-2 border-gray-300">
                      <AvatarImage
                        src={logoUrl || undefined}
                        alt="School logo"
                        className="object-cover"
                      />
                      <AvatarFallback className="bg-gray-100 text-gray-700 text-xl font-semibold">
                        {(() => {
                          const name = school?.name || watch("name") || "";
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
                      <span className="block text-sm font-medium text-gray-700">
                        {t("schoolProfile.schoolLogo") || "School Logo"}
                      </span>
                    </div>

                    <p className="text-xs text-gray-500">
                      {t("schoolProfile.logoFormat")}
                    </p>

                    {!isReadOnly && token && (
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

                              if (school?.id) {
                                schoolsApi.update(school.id, { logo: newLogoUrl })
                                  .then((updatedSchool) => {
                                    toast.success(t("schoolProfile.logoUpdated"));
                                    onSchoolSaved(updatedSchool);
                                  })
                                  .catch((error) => {
                                    console.error("Failed to update logo:", error);
                                    toast.error(getTranslatedError(error) || t("schoolProfile.logoUpdateFailed"));
                                  });
                              }
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

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">{t("schoolProfile.schoolNameRequired")}</label>
                <Input {...register("name")} placeholder={t("schoolProfile.enterSchoolName")} disabled={isReadOnly} />
                {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name.message}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">{t("schoolProfile.email")}</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input {...register("email")} type="email" placeholder={t("schoolProfile.enterEmail")} className="pl-9" disabled={isReadOnly} />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">{t("schoolProfile.phone")}</label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input {...register("phone")} placeholder={t("schoolProfile.enterPhone")} className="pl-9" disabled={isReadOnly} />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">{t("schoolProfile.website")}</label>
                <div className="relative">
                  <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input {...register("website")} placeholder={t("schoolProfile.enterWebsite")} className="pl-9" disabled={isReadOnly} />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Right: Operational Settings */}
          <Card>
            <CardHeader>
              <CardTitle>{t("schoolProfile.operationalSettings")}</CardTitle>
              <CardDescription>{t("schoolProfile.openingHoursAndDisciplines")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 sm:space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">{t("schoolProfile.openingTime")}</label>
                  <div className="relative">
                    <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input {...register("openHoursStart")} type="time" className="pl-9" disabled={isReadOnly} />
                  </div>
                  {errors.openHoursStart && (
                    <p className="text-red-500 text-sm mt-1">{errors.openHoursStart.message}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">{t("schoolProfile.closingTime")}</label>
                  <div className="relative">
                    <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input {...register("openHoursEnd")} type="time" className="pl-9" disabled={isReadOnly} />
                  </div>
                  {errors.openHoursEnd && (
                    <p className="text-red-500 text-sm mt-1">{errors.openHoursEnd.message}</p>
                  )}
                </div>
              </div>

              {school?.id && (
                <div className="border-t pt-4 mt-2">
                  <label className="text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                    <LinkIcon className="h-4 w-4 text-gray-500" />
                    Instructor registration link
                  </label>
                  <p className="text-xs text-gray-500 mb-2">
                    Share this link with instructors so they can register or link their account to this school.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <Input
                      value={instructorRegistrationLink}
                      readOnly
                      className="text-xs"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={async () => {
                        try {
                          await navigator.clipboard.writeText(instructorRegistrationLink);
                          setCopied(true);
                          setTimeout(() => setCopied(false), 2000);
                          toast.success("Link copied to clipboard");
                        } catch (error) {
                          console.error("Failed to copy link:", error);
                          toast.error("Failed to copy link");
                        }
                      }}
                      className="flex items-center gap-2 whitespace-nowrap"
                    >
                      <Copy className="h-4 w-4" />
                      {copied ? "Copied" : "Copy link"}
                    </Button>
                  </div>
                </div>
              )}

              {school?.id && (
                <div className="pt-2">
                  <label className="text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                    <LinkIcon className="h-4 w-4 text-gray-500" />
                    Student registration link
                  </label>
                  <p className="text-xs text-gray-500 mb-2">
                    Share this link with students so they can register or link their account to this school.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <Input value={studentRegistrationLink} readOnly className="text-xs" />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={async () => {
                        try {
                          await navigator.clipboard.writeText(studentRegistrationLink);
                          setCopiedStudent(true);
                          setTimeout(() => setCopiedStudent(false), 2000);
                          toast.success("Link copied to clipboard");
                        } catch (error) {
                          console.error("Failed to copy link:", error);
                          toast.error("Failed to copy link");
                        }
                      }}
                      className="flex items-center gap-2 whitespace-nowrap"
                    >
                      <Copy className="h-4 w-4" />
                      {copiedStudent ? "Copied" : "Copy link"}
                    </Button>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">{t("schoolProfile.address")}</label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input {...register("address")} placeholder={t("schoolProfile.enterAddress")} className="pl-9" disabled={isReadOnly} />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t("schoolProfile.defaultCurrency")}
                  </label>
                  <p className="text-xs text-gray-500 mb-2">
                    {t("schoolProfile.defaultCurrencyDescription")}
                  </p>
                  <Select
                    value={selectedCurrency}
                    onValueChange={setSelectedCurrency}
                    disabled={isReadOnly || !isEditing || !school}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder={t("settings.currency")} />
                    </SelectTrigger>
                    <SelectContent>
                      <div className="px-2 py-1 text-xs font-semibold text-gray-500">
                        {t("schoolProfile.mostUsedCurrencies", {
                          defaultValue: "Most used currencies",
                        })}
                      </div>
                      {MOST_USED_CURRENCIES.map(
                        ({ code, symbol }: CurrencyDefinition) => (
                          <SelectItem key={code} value={code}>
                            {code} ({symbol})
                          </SelectItem>
                        ),
                      )}
                      <div className="mt-2 px-2 py-1 text-xs font-semibold text-gray-500">
                        {t("schoolProfile.otherCurrencies", {
                          defaultValue: "Other currencies",
                        })}
                      </div>
                      {OTHER_CURRENCIES.map(
                        ({ code, symbol }: CurrencyDefinition) => (
                          <SelectItem key={code} value={code}>
                            {code} ({symbol})
                          </SelectItem>
                        ),
                      )}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">{t("schoolProfile.disciplinesOffered")}</label>
                <div className="flex flex-wrap gap-2">
                  {schoolDisciplines.length > 0 ? (
                    schoolDisciplines.map((discipline) => {
                      const label = discipline.display_name || discipline.slug;
                      const defaultColor = discipline.slug?.includes("wing")
                        ? "bg-orange-100 text-orange-800"
                        : discipline.slug?.includes("surf")
                          ? "bg-teal-100 text-teal-800"
                          : discipline.slug?.includes("kite")
                            ? "bg-sky-100 text-sky-800"
                            : "bg-pink-100 text-pink-800";
                      return (
                        <span
                          key={discipline.id}
                          className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${defaultColor}`}
                          style={discipline.color ? {
                            backgroundColor: `${discipline.color}20`,
                            color: discipline.color,
                            borderColor: discipline.color
                          } : {}}
                        >
                          {label}
                        </span>
                      );
                    })
                  ) : (selectedDisciplines.length ? selectedDisciplines : school?.disciplines || []).length > 0 ? (
                    (selectedDisciplines.length ? selectedDisciplines : school?.disciplines || []).map((slug) => {
                      const label = slug;
                      const color = slug.includes("wing")
                        ? "bg-orange-100 text-orange-800"
                        : slug.includes("surf")
                          ? "bg-teal-100 text-teal-800"
                          : slug.includes("kite")
                            ? "bg-sky-100 text-sky-800"
                            : "bg-pink-100 text-pink-800";
                      return (
                        <span key={slug} className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${color}`}>
                          {label}
                        </span>
                      );
                    })
                  ) : (
                    <span className="text-sm text-gray-500">{t("schoolProfile.noDisciplines") || "No disciplines assigned"}</span>
                  )}
                </div>
                {errors.disciplines && (
                  <p className="text-red-500 text-sm mt-1">{errors.disciplines.message}</p>
                )}
                {showDisciplineNote && (
                  <p className="text-sm text-gray-500 mt-2">
                    {t("schoolProfile.disciplineNote")}
                  </p>
                )}
                {/* {isEditing && (schoolDisciplines.length === 0 && (!school?.disciplines || school.disciplines.length === 0)) && (
                  <p className="text-sm text-amber-600 mt-2">
                    {t("schoolProfile.noDisciplinesNote") }
                  </p>
                )} */}
              </div>
            </CardContent>
          </Card>
        </div>

      </form>

      {/* Pending Invitations Section */}
      {isEditing && school && (
        <div className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>{t("schoolProfile.pendingInvitations")}</CardTitle>
              <CardDescription>{t("schoolProfile.pendingInvitationsDesc")}</CardDescription>
            </CardHeader>
            <CardContent>
              <PendingInvitationsList schoolId={school.id} />
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

// Sub-component for invitations list
const PendingInvitationsList: React.FC<{ schoolId: string }> = ({ schoolId }) => {
  const { t, i18n } = useTranslation();
  const [resendingId, setResendingId] = useState<string | null>(null);

  const { data: invitationsResponse, isLoading, isError, error } = useQuery({
    queryKey: ['invitations', 'school', schoolId],
    queryFn: async () => {
      // Fetch pending invitations (isUsed=false) for this school with pagination
      return await invitationsApi.getInvitations(1, 20, schoolId, false);
    },
    // Refresh every minute
    refetchInterval: 60000
  });

  const invitationsData = invitationsResponse?.data || [];

  const handleResend = async (invitationId: string) => {
    setResendingId(invitationId);
    try {
      await invitationsApi.resendInvitation(invitationId);
      toast.success(t("schoolProfile.invitationResent"));
    } catch (error) {
      console.error("Failed to resend invitation:", error);
      toast.error(t("schoolProfile.failedToResendInvitation"));
    } finally {
      setResendingId(null);
    }
  };

  if (isLoading) {
    return <div className="text-sm text-gray-500">{t("schoolProfile.loadingInvitations")}</div>;
  }

  // Show error only for actual failures (network/server errors), not for empty results
  if (isError) {
    // Check if it's a 404 that might indicate the endpoint doesn't exist (old behavior)
    // or if it's a real error
    const is404 = (error as any)?.response?.status === 404;
    if (is404) {
      // For 404, treat as empty state (endpoint might not exist yet or no invitations)
      // This handles the transition period gracefully
      return <div className="text-sm text-gray-500">{t("schoolProfile.noPendingInvitations")}</div>;
    }
    console.error("Failed to load invitations:", error);
    return <div className="text-sm text-red-500">{t("schoolProfile.failedToLoadInvitations")}</div>;
  }

  // Empty state - show when there are no invitations (successful response with empty array)
  if (!invitationsData || invitationsData.length === 0) {
    return <div className="text-sm text-gray-500">{t("schoolProfile.noPendingInvitations")}</div>;
  }

  return (
    <div className="space-y-4">
      {invitationsData.map((inv) => (
        <div key={inv.id} className="flex items-center justify-between p-4 border rounded-lg bg-white">
          <div>
            <p className="font-medium text-gray-900">{inv.email}</p>
            <div className="flex items-center gap-2 mt-1">
              <span className={`text-xs px-2 py-0.5 rounded-full ${inv.role === 'INSTRUCTOR' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'
                }`}>
                {inv.role}
              </span>
              <span className="text-xs text-gray-500">
                {t("schoolProfile.invitedOn")} {new Date(inv.createdAt).toLocaleDateString(i18n.language)}
              </span>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleResend(inv.id)}
            disabled={resendingId === inv.id}
          >
            {resendingId === inv.id ? (
              <>
                <div className="h-4 w-4 animate-spin rounded-full border-b-2 border-gray-600" />
                <span className="sr-only">{t("schoolProfile.resending")}</span>
              </>
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                {t("schoolProfile.resendInvite")}
              </>
            )}
          </Button>
        </div>
      ))}
    </div>
  );
};

export default SuperAdminSchoolForm;


