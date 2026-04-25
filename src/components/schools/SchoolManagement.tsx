import React from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/store/auth";
import { schoolsApi, School } from "@/services/schools";
import SuperAdminSchoolForm from "./SuperAdminSchoolForm";
import { toast } from "react-hot-toast";

const SchoolManagement: React.FC = () => {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const queryClient = useQueryClient();

  const { data: school, isLoading } = useQuery<School | null>({
    queryKey: ['school', 'by-user-id', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      try {
        const schoolData = await schoolsApi.getByUserId(user.id);
        return schoolData || null;
      } catch (error: any) {
        console.error("Error fetching school:", error);
        toast.error(t("school.schoolFetchFailed"));
        throw error;
      }
    },
    enabled: !!user?.id,
    staleTime: 300000,
  });

  const handleSchoolSaved = async (_savedSchool: School) => {
    await queryClient.invalidateQueries({ queryKey: ['school', 'by-user-id', user?.id] });
    if (_savedSchool?.id) {
      await queryClient.invalidateQueries({ queryKey: ['school', _savedSchool.id] });
    }
  };

  // const handleEditSchool = () => {
  //   setShowForm(true);
  // };

  // No cancel action needed in readonly view

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">{t("common.loading")}</p>
        </div>
      </div>
    );
  }


  if (!school) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-xl w-full bg-white rounded-lg shadow-sm p-6 text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            {t("school.noSchoolAssigned")}
          </h2>
          <p className="text-gray-600">
            {t("school.contactSuperAdminToAssign")}
          </p>
        </div>
      </div>
    );
  }

  return (
    <SuperAdminSchoolForm
      school={school || undefined}
      onSchoolSaved={handleSchoolSaved}
      isLoading={isLoading}
      showDisciplineNote={false}
    />
  );
};

export default SchoolManagement;
