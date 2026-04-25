import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { useAuthStore } from "@/store/auth";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import StudentLevels from "./StudentLevels";
import Products from "./Products";
import ProductCategories from "./ProductCategories";
import SystemSettings from "./SystemSettings";
import DefaultStatusSettings from "@/components/DefaultStatusSettings";
import CompensationSettings from "@/components/CompensationSettings";
import VisualizationSettings from "@/components/VisualizationSettings";
import ConsentSettings from "@/components/ConsentSettings";

const SchoolAdminSystemConfigurations: React.FC = () => {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState("levels");

  const schoolId = user?.schoolId;

  if (!schoolId) {
    return (
      <div className="py-6">
        <div className="text-center">
          <div className="text-orange-500 text-lg mb-2">{t("systemConfig.noSchoolAssociated")}</div>
          <div className="text-gray-600 mb-4">
            {t("systemConfig.noSchoolAssociatedMessage")}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-2xl font-bold text-gray-900">{t("systemConfig.title")}</h1>
        <p className="text-gray-600">{t("systemConfig.subtitle")}</p>
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
  );
};

export default SchoolAdminSystemConfigurations;

