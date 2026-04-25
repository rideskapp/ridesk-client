import React from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Settings } from "lucide-react";
import LanguageSwitcher from "@/components/LanguageSwitcher";

const SuperAdminSettings: React.FC = () => {
  const { t } = useTranslation();

  return (
    <div className="py-4">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">{t("navigation.settings")}</h1>
      </div>

      <div className="space-y-6">
        {/* Language Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              {t("settings.language", { defaultValue: "Language Settings" })}
            </CardTitle>
            <CardDescription>
              {t("settings.languageDescription", { defaultValue: "Select your preferred language for the application" })}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-600 min-w-[120px]">
                {t("settings.selectLanguage", { defaultValue: "Select Language" })}:
              </span>
              <LanguageSwitcher />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SuperAdminSettings;

