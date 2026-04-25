import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "react-hot-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { schoolsApi, School } from "@/services/schools";
import { lessonCreationApi, LessonStatus, PaymentStatus } from "@/services/lessonCreation";

interface DefaultStatusSettingsProps {
  schoolId: string;
}

const DefaultStatusSettings: React.FC<DefaultStatusSettingsProps> = ({ schoolId }) => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [defaultLessonStatusId, setDefaultLessonStatusId] = useState<string>("__none__");
  const [defaultPaymentStatusId, setDefaultPaymentStatusId] = useState<string>("__none__");

  const { data: school, isLoading: schoolLoading } = useQuery<School>({
    queryKey: ["school", schoolId],
    queryFn: () => schoolsApi.getById(schoolId),
  });

  // Fetch lesson statuses
  const { data: lessonStatuses = [], isLoading: lessonStatusesLoading } = useQuery<LessonStatus[]>({
    queryKey: ["lesson-statuses"],
    queryFn: () => lessonCreationApi.getLessonStatuses(),
    staleTime: 300000,
  });

  // Fetch payment statuses
  const { data: paymentStatuses = [], isLoading: paymentStatusesLoading } = useQuery<PaymentStatus[]>({
    queryKey: ["payment-statuses"],
    queryFn: () => lessonCreationApi.getPaymentStatuses(),
    staleTime: 300000,
  });

  useEffect(() => {
    if (school) {
      setDefaultLessonStatusId(school.defaultLessonStatusId || "__none__");
      setDefaultPaymentStatusId(school.defaultPaymentStatusId || "__none__");
    }
  }, [school]);

  const updateSchoolMutation = useMutation({
    mutationFn: async (data: { defaultLessonStatusId?: string; defaultPaymentStatusId?: string }) => {
      return schoolsApi.update(schoolId, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["school", schoolId] });
      toast.success(t("systemConfig.defaultStatuses.saved"));
    },
    onError: () => {
      toast.error(t("systemConfig.defaultStatuses.saveFailed"));
    },
  });

  const handleSave = () => {
    const updateData: { defaultLessonStatusId?: string; defaultPaymentStatusId?: string } = {};
    if (defaultLessonStatusId !== "__none__") {
      updateData.defaultLessonStatusId = defaultLessonStatusId;
    }
    if (defaultPaymentStatusId !== "__none__") {
      updateData.defaultPaymentStatusId = defaultPaymentStatusId;
    }
    updateSchoolMutation.mutate(updateData);
  };

  const isLoading = schoolLoading || lessonStatusesLoading || paymentStatusesLoading;

  const translateStatusName = (name: string, type: "lesson" | "payment"): string => {
    const key = `systemConfig.statuses.${type}.${name}`;
    const translation = t(key);
    if (translation === key) {
      return name
        .split('_')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ');
    }
    return translation;
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pink-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{t("systemConfig.defaultStatuses.title")}</CardTitle>
          <CardDescription>
            {t("systemConfig.defaultStatuses.description")}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">
              {t("systemConfig.defaultStatuses.defaultLessonStatus")}
            </label>
            <Select
              value={defaultLessonStatusId}
              onValueChange={setDefaultLessonStatusId}
            >
              <SelectTrigger>
                <SelectValue placeholder={t("systemConfig.defaultStatuses.selectLessonStatus")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">{t("systemConfig.defaultStatuses.none")}</SelectItem>
                {lessonStatuses.map((status) => (
                  <SelectItem key={status.id} value={status.id}>
                    {translateStatusName(status.name, "lesson")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-gray-500">
              {t("systemConfig.defaultStatuses.defaultLessonStatusHelp")}
            </p>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">
              {t("systemConfig.defaultStatuses.defaultPaymentStatus")}
            </label>
            <Select
              value={defaultPaymentStatusId}
              onValueChange={setDefaultPaymentStatusId}
            >
              <SelectTrigger>
                <SelectValue placeholder={t("systemConfig.defaultStatuses.selectPaymentStatus")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">{t("systemConfig.defaultStatuses.none")}</SelectItem>
                {paymentStatuses.map((status) => (
                  <SelectItem key={status.id} value={status.id}>
                    {translateStatusName(status.name, "payment")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-gray-500">
              {t("systemConfig.defaultStatuses.defaultPaymentStatusHelp")}
            </p>
          </div>

          {/* Save Button */}
          <div className="flex justify-end pt-4">
            <Button
              onClick={handleSave}
              disabled={updateSchoolMutation.isPending}
            >
              {updateSchoolMutation.isPending ? (
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

export default DefaultStatusSettings;

