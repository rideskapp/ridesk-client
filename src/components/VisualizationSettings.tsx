import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "react-hot-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Calendar, Palette, Eye } from "lucide-react";
import { schoolSettingsApi, SchoolSettings } from "@/services/schoolSettings";
import { useDisciplines } from "@/hooks/useDisciplines";
import { useStudentLevels } from "@/hooks/useStudentLevels";
import { useProductCategories } from "@/hooks/useProductCategories";

interface VisualizationSettingsProps {
  schoolId: string;
}

const VisualizationSettings: React.FC<VisualizationSettingsProps> = ({ schoolId }) => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [lessonColorScheme, setLessonColorScheme] = useState<'discipline' | 'student_level' | 'category'>('discipline');

  const { data: settings, isLoading: settingsLoading } = useQuery<SchoolSettings>({
    queryKey: ["school-settings", schoolId],
    queryFn: () => schoolSettingsApi.getBySchoolId(schoolId),
  });

  const { disciplines, isLoading: disciplinesLoading } = useDisciplines(schoolId);
  const { studentLevels, isLoading: levelsLoading } = useStudentLevels(schoolId);
  const { categories, isLoading: categoriesLoading } = useProductCategories(schoolId);

  useEffect(() => {
    if (settings) {
      setLessonColorScheme(settings.lessonColorScheme);
    }
  }, [settings]);

  const updateSettingsMutation = useMutation({
    mutationFn: async (data: { lessonColorScheme: 'discipline' | 'student_level' | 'category' }) => {
      return schoolSettingsApi.update(schoolId, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["school-settings", schoolId] });
      toast.success(t("systemConfig.visualization.saved"));
    },
    onError: () => {
      toast.error(t("systemConfig.visualization.saveFailed"));
    },
  });

  const handleSave = () => {
    updateSettingsMutation.mutate({ lessonColorScheme });
  };

  const isLoading = settingsLoading || disciplinesLoading || levelsLoading || categoriesLoading;

  // Get preview items based on selected scheme
  const getPreviewItems = () => {
    switch (lessonColorScheme) {
      case 'discipline':
        return disciplines.slice(0, 4).map(d => ({
          name: d.display_name || d.name,
          color: d.color || '#6B7280',
        }));
      case 'student_level':
        return studentLevels.slice(0, 4).map(l => ({
          name: l.name,
          color: l.color || '#6B7280',
        }));
      case 'category':
        return categories.slice(0, 4).map(c => ({
          name: c.name,
          color: c.color || '#6B7280',
        }));
      default:
        return [];
    }
  };

  const previewItems = getPreviewItems();

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pink-600"></div>
        <span className="ml-3 text-sm text-gray-500">{t("common.loading")}</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Calendar Visualization Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <Calendar className="h-5 w-5 text-pink-600" />
            <CardTitle>{t("systemConfig.visualization.title")}</CardTitle>
          </div>
          <CardDescription>
            {t("systemConfig.visualization.description")}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Color Scheme Selection */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <Palette className="h-5 w-5 text-pink-600" />
              <div>
                <h3 className="text-sm font-semibold text-gray-900">
                  {t("systemConfig.visualization.colorScheme.title")}
                </h3>
                <p className="text-sm text-gray-600">
                  {t("systemConfig.visualization.colorScheme.description")}
                </p>
              </div>
            </div>

            <div className="space-y-3 pl-8">
              <label className="flex items-start gap-3 cursor-pointer group">
                <input
                  type="radio"
                  name="colorScheme"
                  value="discipline"
                  checked={lessonColorScheme === 'discipline'}
                  onChange={(e) => setLessonColorScheme(e.target.value as 'discipline')}
                  className="mt-1 h-4 w-4 border-gray-300 text-pink-600 focus:ring-pink-500 focus:ring-2 focus:ring-offset-0 accent-pink-600"
                  style={{
                    accentColor: '#EC4899'
                  }}
                />
                <div className="flex-1">
                  <div className="text-sm font-medium text-gray-900">
                    {t("systemConfig.visualization.colorScheme.byDiscipline")}
                  </div>
                  <div className="text-sm text-gray-600">
                    {t("systemConfig.visualization.colorScheme.byDisciplineDescription")}
                  </div>
                </div>
              </label>

              <label className="flex items-start gap-3 cursor-pointer group">
                <input
                  type="radio"
                  name="colorScheme"
                  value="student_level"
                  checked={lessonColorScheme === 'student_level'}
                  onChange={(e) => setLessonColorScheme(e.target.value as 'student_level')}
                  className="mt-1 h-4 w-4 border-gray-300 text-pink-600 focus:ring-pink-500 focus:ring-2 focus:ring-offset-0 accent-pink-600"
                  style={{
                    accentColor: '#EC4899'
                  }}
                />
                <div className="flex-1">
                  <div className="text-sm font-medium text-gray-900">
                    {t("systemConfig.visualization.colorScheme.byStudentLevel")}
                  </div>
                  <div className="text-sm text-gray-600">
                    {t("systemConfig.visualization.colorScheme.byStudentLevelDescription")}
                  </div>
                </div>
              </label>

              <label className="flex items-start gap-3 cursor-pointer group">
                <input
                  type="radio"
                  name="colorScheme"
                  value="category"
                  checked={lessonColorScheme === 'category'}
                  onChange={(e) => setLessonColorScheme(e.target.value as 'category')}
                  className="mt-1 h-4 w-4 border-gray-300 text-pink-600 focus:ring-pink-500 focus:ring-2 focus:ring-offset-0 accent-pink-600"
                  style={{
                    accentColor: '#EC4899'
                  }}
                />
                <div className="flex-1">
                  <div className="text-sm font-medium text-gray-900">
                    {t("systemConfig.visualization.colorScheme.byProductCategory")}
                  </div>
                  <div className="text-sm text-gray-600">
                    {t("systemConfig.visualization.colorScheme.byProductCategoryDescription")}
                  </div>
                </div>
              </label>
            </div>
          </div>

          {/* Color Preview */}
          <div className="space-y-4 pt-4 border-t border-gray-200">
            <div className="flex items-center gap-3">
              <Eye className="h-5 w-5 text-pink-600" />
              <div>
                <h3 className="text-sm font-semibold text-gray-900">
                  {t("systemConfig.visualization.colorPreview.title")}
                </h3>
                <p className="text-sm text-gray-600">
                  {t("systemConfig.visualization.colorPreview.description")}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-3 pl-8">
              {previewItems.length > 0 ? (
                previewItems.map((item, index) => (
                  <div
                    key={index}
                    className="inline-flex items-center px-4 py-2 rounded-md text-sm font-medium text-white shadow-sm"
                    style={{ backgroundColor: item.color }}
                  >
                    {item.name}
                  </div>
                ))
              ) : (
                <p className="text-sm text-gray-500">
                  {t("systemConfig.visualization.colorPreview.noItems")}
                </p>
              )}
            </div>
          </div>

          {/* Save Button */}
          <div className="flex justify-end pt-4 border-t border-gray-200">
            <Button
              onClick={handleSave}
              disabled={updateSettingsMutation.isPending || lessonColorScheme === settings?.lessonColorScheme}
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

export default VisualizationSettings;

