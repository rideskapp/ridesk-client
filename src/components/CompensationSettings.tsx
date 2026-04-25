import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "react-hot-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, DollarSign } from "lucide-react";
import { schoolSettingsApi, SchoolSettings } from "@/services/schoolSettings";

interface CompensationSettingsProps {
  schoolId: string;
}

const CompensationSettings: React.FC<CompensationSettingsProps> = ({ schoolId }) => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [compensationMode, setCompensationMode] = useState<'fixed' | 'variable'>('fixed');

  const { data: settings, isLoading: settingsLoading } = useQuery<SchoolSettings>({
    queryKey: ["school-settings", schoolId],
    queryFn: () => schoolSettingsApi.getBySchoolId(schoolId),
  });

  useEffect(() => {
    if (settings) {
      setCompensationMode(settings.compensationMode);
    }
  }, [settings]);

  const updateSettingsMutation = useMutation({
    mutationFn: async (data: { compensationMode: 'fixed' | 'variable' }) => {
      return schoolSettingsApi.update(schoolId, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["school-settings", schoolId] });
      toast.success(t("systemConfig.compensation.saved"));
    },
    onError: () => {
      toast.error(t("systemConfig.compensation.saveFailed"));
    },
  });

  const handleSave = () => {
    updateSettingsMutation.mutate({ compensationMode });
  };

  if (settingsLoading) {
    return (
      <div className="flex justify-center items-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pink-600"></div>
        <span className="ml-3 text-sm text-gray-500">{t("common.loading")}</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Compensation Mode Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <DollarSign className="h-5 w-5 text-pink-600" />
            <CardTitle>{t("systemConfig.compensation.title")}</CardTitle>
          </div>
          <CardDescription>
            {t("systemConfig.compensation.description")}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Compensation Mode Selection */}
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-2">
                {t("systemConfig.compensation.mode.title")}
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                {t("systemConfig.compensation.mode.description")}
              </p>
            </div>

            <div className="space-y-3">
              <label className="flex items-start gap-3 cursor-pointer group">
                <input
                  type="radio"
                  name="compensationMode"
                  value="fixed"
                  checked={compensationMode === 'fixed'}
                  onChange={(e) => setCompensationMode(e.target.value as 'fixed')}
                  className="mt-1 h-4 w-4 border-gray-300 text-pink-600 focus:ring-pink-500 focus:ring-2 focus:ring-offset-0 accent-pink-600"
                  style={{
                    accentColor: '#EC4899'
                  }}
                />
                <div className="flex-1">
                  <div className="text-sm font-medium text-gray-900">
                    {t("systemConfig.compensation.mode.fixed")}
                  </div>
                  <div className="text-sm text-gray-600">
                    {t("systemConfig.compensation.mode.fixedDescription")}
                  </div>
                </div>
              </label>

              <label className="flex items-start gap-3 cursor-pointer group">
                <input
                  type="radio"
                  name="compensationMode"
                  value="variable"
                  checked={compensationMode === 'variable'}
                  onChange={(e) => setCompensationMode(e.target.value as 'variable')}
                  className="mt-1 h-4 w-4 border-gray-300 text-pink-600 focus:ring-pink-500 focus:ring-2 focus:ring-offset-0 accent-pink-600"
                  style={{
                    accentColor: '#EC4899'
                  }}
                />
                <div className="flex-1">
                  <div className="text-sm font-medium text-gray-900">
                    {t("systemConfig.compensation.mode.variable")}
                  </div>
                  <div className="text-sm text-gray-600">
                    {t("systemConfig.compensation.mode.variableDescription")}
                  </div>
                </div>
              </label>
            </div>
          </div>

          {/* Save Button */}
          <div className="flex justify-end pt-4 border-t border-gray-200">
            <Button
              onClick={handleSave}
              disabled={updateSettingsMutation.isPending || compensationMode === settings?.compensationMode}
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
        </CardContent>
      </Card>
    </div>
  );
};

export default CompensationSettings;

