import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "react-hot-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, FileCheck } from "lucide-react";
import { schoolSettingsApi, SchoolSettings, MultilingualText } from "@/services/schoolSettings";

interface ConsentSettingsProps {
  schoolId: string;
}

interface ConsentFormState {
  termsConditionsUrl: string;
  termsConditionsLabelEn: string;
  termsConditionsLabelIt: string;
  customCheckbox1Enabled: boolean;
  customCheckbox1LabelEn: string;
  customCheckbox1LabelIt: string;
  customCheckbox1Url: string;
  customCheckbox1Mandatory: boolean;
  customCheckbox2Enabled: boolean;
  customCheckbox2LabelEn: string;
  customCheckbox2LabelIt: string;
  customCheckbox2Url: string;
  customCheckbox2Mandatory: boolean;
}

const defaultState: ConsentFormState = {
  termsConditionsUrl: "",
  termsConditionsLabelEn: "",
  termsConditionsLabelIt: "",
  customCheckbox1Enabled: false,
  customCheckbox1LabelEn: "",
  customCheckbox1LabelIt: "",
  customCheckbox1Url: "",
  customCheckbox1Mandatory: true,
  customCheckbox2Enabled: false,
  customCheckbox2LabelEn: "",
  customCheckbox2LabelIt: "",
  customCheckbox2Url: "",
  customCheckbox2Mandatory: true,
};

const ConsentSettings: React.FC<ConsentSettingsProps> = ({ schoolId }) => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [form, setForm] = useState<ConsentFormState>(defaultState);

  const { data: settings, isLoading: settingsLoading } = useQuery<SchoolSettings>({
    queryKey: ["school-settings", schoolId],
    queryFn: () => schoolSettingsApi.getBySchoolId(schoolId),
  });

  useEffect(() => {
    if (settings) {
      setForm({
        termsConditionsUrl: settings.termsConditionsUrl || "",
        termsConditionsLabelEn: settings.termsConditionsLabel?.en || "",
        termsConditionsLabelIt: settings.termsConditionsLabel?.it || "",
        customCheckbox1Enabled: settings.customCheckbox1Enabled ?? false,
        customCheckbox1LabelEn: settings.customCheckbox1Label?.en || "",
        customCheckbox1LabelIt: settings.customCheckbox1Label?.it || "",
        customCheckbox1Url: settings.customCheckbox1Url || "",
        customCheckbox1Mandatory: settings.customCheckbox1Mandatory ?? true,
        customCheckbox2Enabled: settings.customCheckbox2Enabled ?? false,
        customCheckbox2LabelEn: settings.customCheckbox2Label?.en || "",
        customCheckbox2LabelIt: settings.customCheckbox2Label?.it || "",
        customCheckbox2Url: settings.customCheckbox2Url || "",
        customCheckbox2Mandatory: settings.customCheckbox2Mandatory ?? true,
      });
    }
  }, [settings]);

  const updateSettingsMutation = useMutation({
    mutationFn: async () => {
      const termsConditionsLabel: MultilingualText | null =
        form.termsConditionsLabelEn || form.termsConditionsLabelIt
          ? { en: form.termsConditionsLabelEn, it: form.termsConditionsLabelIt }
          : null;

      const customCheckbox1Label: MultilingualText | null =
        form.customCheckbox1LabelEn || form.customCheckbox1LabelIt
          ? { en: form.customCheckbox1LabelEn, it: form.customCheckbox1LabelIt }
          : null;

      const customCheckbox2Label: MultilingualText | null =
        form.customCheckbox2LabelEn || form.customCheckbox2LabelIt
          ? { en: form.customCheckbox2LabelEn, it: form.customCheckbox2LabelIt }
          : null;

      return schoolSettingsApi.update(schoolId, {
        termsConditionsUrl: form.termsConditionsUrl || null,
        termsConditionsLabel,
        customCheckbox1Enabled: form.customCheckbox1Enabled,
        customCheckbox1Label,
        customCheckbox1Url: form.customCheckbox1Url || null,
        customCheckbox1Mandatory: form.customCheckbox1Mandatory,
        customCheckbox2Enabled: form.customCheckbox2Enabled,
        customCheckbox2Label,
        customCheckbox2Url: form.customCheckbox2Url || null,
        customCheckbox2Mandatory: form.customCheckbox2Mandatory,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["school-settings", schoolId] });
      toast.success(t("systemConfig.consent.saved", { defaultValue: "Consent settings saved" }));
    },
    onError: () => {
      toast.error(t("systemConfig.consent.saveFailed", { defaultValue: "Failed to save consent settings" }));
    },
  });

  const handleSave = () => {
    updateSettingsMutation.mutate();
  };

  if (settingsLoading) {
    return (
      <div className="flex justify-center items-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pink-600"></div>
        <span className="ml-3 text-sm text-gray-500">{t("common.loading")}</span>
      </div>
    );
  }

  const inputClass = "w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-pink-500 text-sm";

  return (
    <div className="space-y-6">
      {/* Terms & Conditions */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <FileCheck className="h-5 w-5 text-pink-600" />
            <CardTitle>{t("systemConfig.consent.termsTitle", { defaultValue: "Terms & Conditions" })}</CardTitle>
          </div>
          <CardDescription>
            {t("systemConfig.consent.termsDescription", { defaultValue: "Customize the Terms & Conditions checkbox shown in the student form." })}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t("systemConfig.consent.termsUrl", { defaultValue: "Terms & Conditions URL" })}
            </label>
            <input
              type="url"
              value={form.termsConditionsUrl}
              onChange={(e) => setForm(prev => ({ ...prev, termsConditionsUrl: e.target.value }))}
              className={inputClass}
              placeholder="https://example.com/terms"
            />
            <p className="mt-1 text-xs text-gray-500">
              {t("systemConfig.consent.termsUrlHint", { defaultValue: "If set, the checkbox label will be clickable and open this URL in a new tab." })}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t("systemConfig.consent.labelEn", { defaultValue: "Label (Default language)" })}
              </label>
              <input
                type="text"
                value={form.termsConditionsLabelEn}
                onChange={(e) => setForm(prev => ({ ...prev, termsConditionsLabelEn: e.target.value }))}
                className={inputClass}
                placeholder="I accept the Terms & Conditions and Liability Waiver"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t("systemConfig.consent.labelIt", { defaultValue: "Secondary language label (optional)" })}
              </label>
              <input
                type="text"
                value={form.termsConditionsLabelIt}
                onChange={(e) => setForm(prev => ({ ...prev, termsConditionsLabelIt: e.target.value }))}
                className={inputClass}
                placeholder="Accetto i Termini e Condizioni e la Liberatoria"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Custom Checkbox 1 */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <FileCheck className="h-5 w-5 text-pink-600" />
              <CardTitle>{t("systemConfig.consent.customCheckbox1Title", { defaultValue: "Custom Checkbox 1" })}</CardTitle>
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <span className="text-sm text-gray-600">{t("systemConfig.consent.enabled", { defaultValue: "Enabled" })}</span>
              <input
                type="checkbox"
                checked={form.customCheckbox1Enabled}
                onChange={(e) => setForm(prev => ({ ...prev, customCheckbox1Enabled: e.target.checked }))}
                className="h-4 w-4 text-pink-600 focus:ring-pink-500 border-gray-300 rounded"
              />
            </label>
          </div>
          <CardDescription>
            {t("systemConfig.consent.customCheckboxDescription", { defaultValue: "Configure an additional consent checkbox for the student form." })}
          </CardDescription>
        </CardHeader>
        {form.customCheckbox1Enabled && (
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t("systemConfig.consent.labelEn", { defaultValue: "Label (Default language)" })}
                </label>
                <input
                  type="text"
                  value={form.customCheckbox1LabelEn}
                  onChange={(e) => setForm(prev => ({ ...prev, customCheckbox1LabelEn: e.target.value }))}
                  className={inputClass}
                  placeholder={t("systemConfig.consent.customLabelPlaceholder", { defaultValue: "Enter checkbox label..." })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t("systemConfig.consent.labelIt", { defaultValue: "Secondary language label (optional)" })}
                </label>
                <input
                  type="text"
                  value={form.customCheckbox1LabelIt}
                  onChange={(e) => setForm(prev => ({ ...prev, customCheckbox1LabelIt: e.target.value }))}
                  className={inputClass}
                  placeholder={t("systemConfig.consent.customLabelPlaceholder", { defaultValue: "Enter checkbox label..." })}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t("systemConfig.consent.url", { defaultValue: "URL (optional)" })}
              </label>
              <input
                type="url"
                value={form.customCheckbox1Url}
                onChange={(e) => setForm(prev => ({ ...prev, customCheckbox1Url: e.target.value }))}
                className={inputClass}
                placeholder="https://example.com/document"
              />
            </div>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.customCheckbox1Mandatory}
                onChange={(e) => setForm(prev => ({ ...prev, customCheckbox1Mandatory: e.target.checked }))}
                className="h-4 w-4 text-pink-600 focus:ring-pink-500 border-gray-300 rounded"
              />
              <span className="text-sm text-gray-700">
                {t("systemConfig.consent.mandatory", { defaultValue: "Mandatory (student must check this to submit the form)" })}
              </span>
            </label>
          </CardContent>
        )}
      </Card>

      {/* Custom Checkbox 2 */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <FileCheck className="h-5 w-5 text-pink-600" />
              <CardTitle>{t("systemConfig.consent.customCheckbox2Title", { defaultValue: "Custom Checkbox 2" })}</CardTitle>
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <span className="text-sm text-gray-600">{t("systemConfig.consent.enabled", { defaultValue: "Enabled" })}</span>
              <input
                type="checkbox"
                checked={form.customCheckbox2Enabled}
                onChange={(e) => setForm(prev => ({ ...prev, customCheckbox2Enabled: e.target.checked }))}
                className="h-4 w-4 text-pink-600 focus:ring-pink-500 border-gray-300 rounded"
              />
            </label>
          </div>
          <CardDescription>
            {t("systemConfig.consent.customCheckboxDescription", { defaultValue: "Configure an additional consent checkbox for the student form." })}
          </CardDescription>
        </CardHeader>
        {form.customCheckbox2Enabled && (
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t("systemConfig.consent.labelEn", { defaultValue: "Label (Default language)" })}
                </label>
                <input
                  type="text"
                  value={form.customCheckbox2LabelEn}
                  onChange={(e) => setForm(prev => ({ ...prev, customCheckbox2LabelEn: e.target.value }))}
                  className={inputClass}
                  placeholder={t("systemConfig.consent.customLabelPlaceholder", { defaultValue: "Enter checkbox label..." })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t("systemConfig.consent.labelIt", { defaultValue: "Secondary language label (optional)" })}
                </label>
                <input
                  type="text"
                  value={form.customCheckbox2LabelIt}
                  onChange={(e) => setForm(prev => ({ ...prev, customCheckbox2LabelIt: e.target.value }))}
                  className={inputClass}
                  placeholder={t("systemConfig.consent.customLabelPlaceholder", { defaultValue: "Enter checkbox label..." })}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t("systemConfig.consent.url", { defaultValue: "URL (optional)" })}
              </label>
              <input
                type="url"
                value={form.customCheckbox2Url}
                onChange={(e) => setForm(prev => ({ ...prev, customCheckbox2Url: e.target.value }))}
                className={inputClass}
                placeholder="https://example.com/document"
              />
            </div>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.customCheckbox2Mandatory}
                onChange={(e) => setForm(prev => ({ ...prev, customCheckbox2Mandatory: e.target.checked }))}
                className="h-4 w-4 text-pink-600 focus:ring-pink-500 border-gray-300 rounded"
              />
              <span className="text-sm text-gray-700">
                {t("systemConfig.consent.mandatory", { defaultValue: "Mandatory (student must check this to submit the form)" })}
              </span>
            </label>
          </CardContent>
        )}
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button
          onClick={handleSave}
          disabled={updateSettingsMutation.isPending}
          className="bg-pink-600 hover:bg-pink-700"
        >
          {updateSettingsMutation.isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {t("common.saving")}
            </>
          ) : (
            t("common.save")
          )}
        </Button>
      </div>
    </div>
  );
};

export default ConsentSettings;
