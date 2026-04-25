import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { schoolsApi } from "@/services/schools";
import { useSchoolSelectionStore } from "@/store/schoolSelection";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import StudentLevels from "./StudentLevels";
import Products from "./Products";
import ProductCategories from "./ProductCategories";
import SystemSettings from "./SystemSettings";
import DefaultStatusSettings from "@/components/DefaultStatusSettings";
import CompensationSettings from "@/components/CompensationSettings";
import VisualizationSettings from "@/components/VisualizationSettings";
import ConsentSettings from "@/components/ConsentSettings";

const SuperAdminSystemConfigurationEditor: React.FC = () => {
  const { t } = useTranslation();
  const { schoolId } = useParams();
  const navigate = useNavigate();
  const { selectedSchoolId } = useSchoolSelectionStore();
  const [activeTab, setActiveTab] = useState("levels");

  const { data: school, isLoading: loading } = useQuery({
    queryKey: ['school', schoolId],
    queryFn: () => schoolsApi.getById(schoolId!),
    enabled: !!schoolId,
    staleTime: 300000,
  });

  // Redirect when selected school changes
  useEffect(() => {
    if (selectedSchoolId && selectedSchoolId !== schoolId) {
      navigate(`/admin/system-configurations/${selectedSchoolId}`, { replace: true });
    }
  }, [selectedSchoolId, schoolId, navigate]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-full py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-600"></div>
        <span className="ml-3 text-gray-700">{t("common.loading")}</span>
      </div>
    );
  }

  if (!school || !schoolId) {
    return (
      <div className="py-6">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-semibold">{t("systemConfig.schoolNotFound")}</h1>
          <Button variant="outline" onClick={() => navigate("/admin/system-configurations")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            {t("systemConfig.backToList")}
          </Button>
        </div>
        <p className="text-sm text-gray-600">{t("systemConfig.schoolNotFoundMessage")}</p>
      </div>
    );
  }

  return (
    <div className="py-4">
      <div className="mb-4">
        <Button variant="outline" onClick={() => navigate("/admin/system-configurations")}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          {t("systemConfig.backToSystemConfigurations")}
        </Button>
      </div>

      <div className="space-y-6">
        {/* Header */}
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900">{t("systemConfig.title")}</h1>
          </div>
          <p className="text-gray-600">{t("systemConfig.configureFor", { name: school?.name || "School" })}</p>
        </div>

        {/* Tab Navigation */}
        <div className="border-b border-gray-200">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <div className="overflow-x-auto">
              <TabsList className="inline-flex h-10 items-center justify-start rounded-lg bg-gray-100 p-1 text-gray-600 min-w-max">
              <TabsTrigger 
                value="levels" 
                className="rounded-md px-3 py-1.5 text-sm font-medium transition-all data-[state=active]:bg-white data-[state=active]:text-gray-900 data-[state=active]:shadow-sm"
              >
                {t("systemConfig.tabs.levels")}
              </TabsTrigger>
              <TabsTrigger 
                value="disciplines"
                className="rounded-md px-3 py-1.5 text-sm font-medium transition-all data-[state=active]:bg-white data-[state=active]:text-gray-900 data-[state=active]:shadow-sm"
              >
                {t("systemConfig.tabs.disciplines")}
              </TabsTrigger>
              <TabsTrigger 
                value="categories"
                className="rounded-md px-3 py-1.5 text-sm font-medium transition-all data-[state=active]:bg-white data-[state=active]:text-gray-900 data-[state=active]:shadow-sm"
              >
                {t("systemConfig.tabs.categories")}
              </TabsTrigger>
              <TabsTrigger 
                value="products"
                className="rounded-md px-3 py-1.5 text-sm font-medium transition-all data-[state=active]:bg-white data-[state=active]:text-gray-900 data-[state=active]:shadow-sm"
              >
                {t("systemConfig.tabs.products")}
              </TabsTrigger>
              <TabsTrigger 
                value="status"
                className="rounded-md px-3 py-1.5 text-sm font-medium transition-all data-[state=active]:bg-white data-[state=active]:text-gray-900 data-[state=active]:shadow-sm"
              >
                {t("systemConfig.tabs.status")}
              </TabsTrigger>
              <TabsTrigger 
                value="compensation"
                className="rounded-md px-3 py-1.5 text-sm font-medium transition-all data-[state=active]:bg-white data-[state=active]:text-gray-900 data-[state=active]:shadow-sm"
              >
                {t("systemConfig.tabs.compensation")}
              </TabsTrigger>
              <TabsTrigger
                value="visualization"
                className="rounded-md px-3 py-1.5 text-sm font-medium transition-all data-[state=active]:bg-white data-[state=active]:text-gray-900 data-[state=active]:shadow-sm"
              >
                {t("systemConfig.tabs.visualization")}
              </TabsTrigger>
              <TabsTrigger
                value="consent"
                className="rounded-md px-3 py-1.5 text-sm font-medium transition-all data-[state=active]:bg-white data-[state=active]:text-gray-900 data-[state=active]:shadow-sm"
              >
                {t("systemConfig.tabs.consent", { defaultValue: "Consent" })}
              </TabsTrigger>
            </TabsList>
            </div>

            {/* Tab Contents */}
            <div className="mt-6">
              <TabsContent value="levels" className="mt-0">
                <StudentLevels schoolId={schoolId} />
              </TabsContent>

              <TabsContent value="disciplines" className="mt-0">
                <SystemSettings schoolId={schoolId} />
              </TabsContent>

              <TabsContent value="categories" className="mt-0">
                <ProductCategories schoolId={schoolId} />
              </TabsContent>

              <TabsContent value="products" className="mt-0">
                <Products schoolId={schoolId} />
              </TabsContent>

              <TabsContent value="status" className="mt-0">
                <DefaultStatusSettings schoolId={schoolId} />
              </TabsContent>

              <TabsContent value="compensation" className="mt-0">
                <CompensationSettings schoolId={schoolId} />
              </TabsContent>

              <TabsContent value="visualization" className="mt-0">
                <VisualizationSettings schoolId={schoolId} />
              </TabsContent>

              <TabsContent value="consent" className="mt-0">
                <ConsentSettings schoolId={schoolId} />
              </TabsContent>
            </div>
          </Tabs>
        </div>
      </div>
    </div>
  );
};

export default SuperAdminSystemConfigurationEditor;

