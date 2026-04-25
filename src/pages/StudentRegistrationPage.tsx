import React, { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "react-hot-toast";
import { useTranslation } from "react-i18next";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PhoneInput } from "@/components/ui/PhoneInput";
import { MultiSelect } from "@/components/ui/multi-select";
import { SUPPORTED_LANGUAGES } from "@/constants/languages";
import { getCountries } from "react-phone-number-input/input";
import enLocale from "react-phone-number-input/locale/en.json";
import itLocale from "react-phone-number-input/locale/it.json";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  studentRegistrationApi,
  PublicStudentRegistrationPayload,
} from "@/services/studentRegistration";
import { validateStudentFormData } from "@/validation/studentValidation";

const DAY_OPTIONS = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
];
const TIME_SLOT_OPTIONS = ["morning", "afternoon"];
const LESSON_TYPE_OPTIONS = ["private", "semi-private", "group"];

const getConsentLabel = (
  labels: Record<string, string> | null | undefined,
  fallback: string,
): string => labels?.en || labels?.it || fallback;

export const StudentRegistrationPage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { schoolIdentifier } = useParams<{ schoolIdentifier: string }>();
  const navigate = useNavigate();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formData, setFormData] = useState<PublicStudentRegistrationPayload>({
    firstName: "",
    lastName: "",
    email: "",
    whatsappNumber: "",
    dateOfBirth: "",
    emergencyContact: "",
    emergencyPhone: "",
    medicalConditions: "",
    skillLevel: "",
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
    consentCustom1: false,
    consentCustom2: false,
    arrivalDate: "",
    departureDate: "",
    stayNotes: "",
    notes: "",
  });
  const countryLocale = i18n.language.startsWith("it") ? itLocale : enLocale;
  const countryOptions = useMemo(
    () =>
      getCountries().map((code) => ({
        code,
        label: countryLocale[code as keyof typeof countryLocale] || code,
      })),
    [countryLocale],
  );

  const contextQuery = useQuery({
    queryKey: ["student-registration-context", schoolIdentifier],
    queryFn: async () => {
      if (!schoolIdentifier) throw new Error("Missing school identifier");
      return studentRegistrationApi.getContext(schoolIdentifier);
    },
    enabled: !!schoolIdentifier,
  });

  const skillLevelOptions = useMemo(() => {
    return (contextQuery.data?.studentLevels || [])
      .filter((l) => l.active !== false && l.is_active !== false)
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [contextQuery.data?.studentLevels]);

  const update = (field: keyof PublicStudentRegistrationPayload, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field as string]) {
      setErrors((prev) => ({ ...prev, [field]: "" }));
    }
  };

  const toggleInArray = (
    field: "preferredDisciplines" | "preferredDays" | "preferredTimeSlots" | "preferredLessonTypes",
    value: string,
    checked: boolean,
  ) => {
    setFormData((prev) => {
      const curr = (prev[field] || []) as string[];
      return {
        ...prev,
        [field]: checked ? [...curr, value] : curr.filter((v) => v !== value),
      };
    });
  };

  const validate = () => {
    const e: Record<string, string> = {};
    const sharedErrors = validateStudentFormData(formData, {
      requireEmail: true,
      requireConsents: true,
    });
    if (sharedErrors.firstName) e.firstName = t("students.required");
    if (sharedErrors.lastName) e.lastName = t("students.required");
    if (sharedErrors.email === "required") {
      e.email = t("students.required");
    } else if (sharedErrors.email === "invalidEmail") {
      e.email = t("students.invalidEmail", {
        defaultValue: "Please enter a valid email address",
      });
    }
    if (sharedErrors.whatsappNumber)
      e.whatsappNumber = t("students.whatsappNumberRequired");
    if (sharedErrors.skillLevel) e.skillLevel = t("students.required");
    if (sharedErrors.preferredDisciplines)
      e.preferredDisciplines = t("students.required");
    if (sharedErrors.preferredLanguage)
      e.preferredLanguage = t("students.required");
    if (sharedErrors.consentPhysicalCondition)
      e.consentPhysicalCondition = t("students.required");
    if (sharedErrors.consentTermsConditions)
      e.consentTermsConditions = t("students.required");
    if (sharedErrors.consentGdpr) e.consentGdpr = t("students.required");

    const consent = contextQuery.data?.consentSettings;
    if (
      consent?.customCheckbox1Enabled &&
      consent?.customCheckbox1Mandatory &&
      !formData.consentCustom1
    ) {
      e.consentCustom1 = t("students.required");
    }
    if (
      consent?.customCheckbox2Enabled &&
      consent?.customCheckbox2Mandatory &&
      !formData.consentCustom2
    ) {
      e.consentCustom2 = t("students.required");
    }

    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const mutation = useMutation({
    mutationFn: async () => {
      if (!schoolIdentifier) throw new Error("Missing school identifier");
      return studentRegistrationApi.register(schoolIdentifier, formData);
    },
    onSuccess: (res) => {
      if (res.alreadyLinked) {
        toast.success(res.message || "Profile updated for this school.");
      } else if (res.reactivated) {
        toast.success(res.message || "School access reactivated.");
      } else {
        toast.success(res.message || "Registration submitted");
      }
      navigate("/login");
    },
    onError: (error: any) => {
      toast.error(
        error?.response?.data?.message ||
          error?.response?.data?.error ||
          "Failed to submit registration",
      );
    },
  });

  if (contextQuery.isLoading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }
  if (contextQuery.isError || !contextQuery.data) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle>Invalid registration link</CardTitle>
            <CardDescription>
              This student registration link is invalid or expired.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const consent = contextQuery.data.consentSettings;

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-4xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>Join {contextQuery.data.name || "school"} as a student</CardTitle>
            <CardDescription>
              {t("students.registrationSubtitle", {
                defaultValue:
                  "Please fill in your details to register for your lessons. Your information will help us organize your activities and ensure a safe experience.",
              })}
            </CardDescription>
            {contextQuery.data.logo ? (
              <div className="pt-3">
                <img
                  src={contextQuery.data.logo}
                  alt={`${contextQuery.data.name || "School"} logo`}
                  className="h-12 w-auto object-contain"
                />
              </div>
            ) : null}
          </CardHeader>
          <CardContent className="space-y-8">
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900">
                {t("students.studentDetails", { defaultValue: "Student Details" })}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">{t("students.firstName")} <span className="text-red-500">*</span></label>
                  <Input placeholder={t("students.firstName")} value={formData.firstName} onChange={(e) => update("firstName", e.target.value)} />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">{t("students.lastName")} <span className="text-red-500">*</span></label>
                  <Input placeholder={t("students.lastName")} value={formData.lastName} onChange={(e) => update("lastName", e.target.value)} />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">{t("students.email")} <span className="text-red-500">*</span></label>
                  <Input type="email" placeholder={t("students.email")} value={formData.email} onChange={(e) => update("email", e.target.value)} />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">{t("students.whatsappNumber")} <span className="text-red-500">*</span></label>
                  <PhoneInput value={formData.whatsappNumber} onChange={(v) => update("whatsappNumber", (v as string) || "")} placeholder={t("students.whatsappNumberPlaceholder")} />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">{t("students.dateOfBirth")}</label>
                  <Input type="date" value={formData.dateOfBirth || ""} onChange={(e) => update("dateOfBirth", e.target.value)} />
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900">
                {t("students.emergencyContact", { defaultValue: "Emergency Contact" })}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">{t("students.emergencyContact")}</label>
                  <Input placeholder={t("students.emergencyContact")} value={formData.emergencyContact || ""} onChange={(e) => update("emergencyContact", e.target.value)} />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">{t("students.emergencyPhone")}</label>
                  <Input placeholder={t("students.emergencyPhone")} value={formData.emergencyPhone || ""} onChange={(e) => update("emergencyPhone", e.target.value)} />
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900">
                {t("students.additionalInformation", {
                  defaultValue: "Additional Information",
                })}
              </h3>
              <div>
              <label className="text-sm font-medium">{t("students.skillLevel")} <span className="text-red-500">*</span></label>
              <select className="w-full border rounded px-3 py-2 mt-1" value={formData.skillLevel || ""} onChange={(e) => update("skillLevel", e.target.value)}>
                <option value="">{t("students.skillLevel")}</option>
                {skillLevelOptions.map((l) => (
                  <option key={l.id} value={l.slug}>{l.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-sm font-medium">{t("students.preferredDisciplines")} <span className="text-red-500">*</span></label>
              <div className="grid grid-cols-2 gap-2 mt-2">
                {(contextQuery.data.disciplines || []).map((d) => (
                  <label key={d.id} className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={formData.preferredDisciplines?.includes(d.slug) || false} onChange={(e) => toggleInArray("preferredDisciplines", d.slug, e.target.checked)} />
                    <span>{d.display_name || d.name}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input type="number" placeholder={t("students.weightPlaceholder")} value={formData.weight ?? ""} onChange={(e) => update("weight", e.target.value ? Number(e.target.value) : undefined)} />
              <Input type="number" placeholder={t("students.heightPlaceholder")} value={formData.height ?? ""} onChange={(e) => update("height", e.target.value ? Number(e.target.value) : undefined)} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">{t("students.nationality")}</label>
                <Select
                  value={formData.nationality || ""}
                  onValueChange={(value) => update("nationality", value)}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder={t("students.nationalityPlaceholder")} />
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
                <label className="text-sm font-medium">{t("students.primarySport")}</label>
                <select
                  className="w-full border rounded px-3 py-2 mt-1"
                  value={formData.primarySport || ""}
                  onChange={(e) =>
                    update(
                      "primarySport",
                      e.target.value
                        ? (e.target.value as PublicStudentRegistrationPayload["primarySport"])
                        : undefined,
                    )
                  }
                >
                  <option value="">{t("common.select")}</option>
                  <option value="surf">{t("students.surf")}</option>
                  <option value="kitesurf">{t("students.kitesurf")}</option>
                  <option value="wingfoil">{t("students.wingfoil")}</option>
                  <option value="foil">{t("students.foil")}</option>
                </select>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">{t("students.canSwim")}</label>
              <div className="flex gap-4 mt-1">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="radio"
                    name="canSwim"
                    checked={formData.canSwim === true}
                    onChange={() => update("canSwim", true)}
                  />
                  {t("students.canSwimYes")}
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="radio"
                    name="canSwim"
                    checked={formData.canSwim === false}
                    onChange={() => update("canSwim", false)}
                  />
                  {t("students.canSwimNo")}
                </label>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-sm font-medium">{t("students.preferredDays")}</label>
                <div className="space-y-1 mt-1">
                  {DAY_OPTIONS.map((d) => (
                    <label key={d} className="flex items-center gap-2 text-sm">
                      <input type="checkbox" checked={formData.preferredDays?.includes(d) || false} onChange={(e) => toggleInArray("preferredDays", d, e.target.checked)} />
                      <span className="capitalize">{t(`students.${d}`)}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-sm font-medium">{t("students.preferredTimeSlots")}</label>
                <div className="space-y-1 mt-1">
                  {TIME_SLOT_OPTIONS.map((d) => (
                    <label key={d} className="flex items-center gap-2 text-sm">
                      <input type="checkbox" checked={formData.preferredTimeSlots?.includes(d) || false} onChange={(e) => toggleInArray("preferredTimeSlots", d, e.target.checked)} />
                      <span className="capitalize">{t(`students.${d}`)}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-sm font-medium">{t("students.preferredLessonTypes")}</label>
                <div className="space-y-1 mt-1">
                  {LESSON_TYPE_OPTIONS.map((d) => (
                    <label key={d} className="flex items-center gap-2 text-sm">
                      <input type="checkbox" checked={formData.preferredLessonTypes?.includes(d) || false} onChange={(e) => toggleInArray("preferredLessonTypes", d, e.target.checked)} />
                      <span className="capitalize">
                        {t(`students.${d === "semi-private" ? "semiPrivate" : d}`)}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium">{t("students.preferredLanguageLabel")} <span className="text-red-500">*</span></label>
              <MultiSelect
                options={SUPPORTED_LANGUAGES.map((lang) => ({
                  value: lang.value,
                  label: t(lang.labelKey),
                }))}
                selected={formData.preferredLanguage || []}
                onChange={(value) => update("preferredLanguage", typeof value === "function" ? value(formData.preferredLanguage || []) : value)}
                placeholder={t("students.selectLanguage")}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">{t("students.medicalConditions")}</label>
              <textarea className="w-full border rounded px-3 py-2" placeholder={t("students.medicalConditions")} value={formData.medicalConditions || ""} onChange={(e) => update("medicalConditions", e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">{t("students.ridingBackground")}</label>
              <textarea className="w-full border rounded px-3 py-2" placeholder={t("students.ridingBackgroundPlaceholder")} value={formData.ridingBackground || ""} onChange={(e) => update("ridingBackground", e.target.value)} />
            </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900">
                {t("students.stay", { defaultValue: "Stay" })}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">{t("students.arrivalDate")}</label>
                  <Input type="date" value={formData.arrivalDate || ""} onChange={(e) => update("arrivalDate", e.target.value)} />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">{t("students.departureDate")}</label>
                  <Input type="date" value={formData.departureDate || ""} onChange={(e) => update("departureDate", e.target.value)} />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">{t("students.stayNotes")}</label>
                <textarea className="w-full border rounded px-3 py-2" placeholder={t("students.stayNotes")} value={formData.stayNotes || ""} onChange={(e) => update("stayNotes", e.target.value)} />
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900">
                {t("students.notes", { defaultValue: "Notes" })}
              </h3>
              <div>
                <label className="block text-sm font-medium mb-1">{t("students.generalNotes")}</label>
                <textarea className="w-full border rounded px-3 py-2" placeholder={t("students.generalNotes")} value={formData.notes || ""} onChange={(e) => update("notes", e.target.value)} />
              </div>
            </div>

            <div className="space-y-2 text-sm">
              <h3 className="text-lg font-medium text-gray-900">
                {t("students.declarationsConsents", {
                  defaultValue: "Declarations & Consents",
                })}
              </h3>
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={!!formData.consentPhysicalCondition} onChange={(e) => update("consentPhysicalCondition", e.target.checked)} />
                {t("students.consentPhysicalCondition")}
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={!!formData.consentTermsConditions} onChange={(e) => update("consentTermsConditions", e.target.checked)} />
                {t("students.consentTermsConditions")} {consent.termsConditionsUrl ? <a className="text-blue-600 underline" href={consent.termsConditionsUrl} target="_blank" rel="noreferrer">view</a> : null}
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={!!formData.consentGdpr} onChange={(e) => update("consentGdpr", e.target.checked)} />
                {t("students.consentGdpr")}
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={!!formData.consentPhotosVideos} onChange={(e) => update("consentPhotosVideos", e.target.checked)} />
                {t("students.consentPhotosVideos")}
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={!!formData.consentMarketing} onChange={(e) => update("consentMarketing", e.target.checked)} />
                {t("students.consentMarketing")}
              </label>
              {consent.customCheckbox1Enabled && (
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={!!formData.consentCustom1} onChange={(e) => update("consentCustom1", e.target.checked)} />
                  {getConsentLabel(consent.customCheckbox1Label, "Additional consent 1")}
                </label>
              )}
              {consent.customCheckbox2Enabled && (
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={!!formData.consentCustom2} onChange={(e) => update("consentCustom2", e.target.checked)} />
                  {getConsentLabel(consent.customCheckbox2Label, "Additional consent 2")}
                </label>
              )}
            </div>

            {Object.keys(errors).length > 0 && (
              <div className="text-sm text-red-600">{t("students.requiredFieldsMessage", { defaultValue: "Please complete all required fields." })}</div>
            )}

            <Button
              className="w-full"
              disabled={mutation.isPending}
              onClick={() => {
                if (!validate()) return;
                mutation.mutate();
              }}
            >
              {mutation.isPending ? t("common.loading") : t("students.submitRegistration", { defaultValue: "Submit registration" })}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default StudentRegistrationPage;
