import React from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { schoolsApi } from "@/services/schools";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import SystemSettings from "./SystemSettings";

const SuperAdminSystemSettingsEditor: React.FC = () => {
  const { schoolId } = useParams();
  const navigate = useNavigate();

  const { data: school, isLoading: loading } = useQuery({
    queryKey: ['school', schoolId],
    queryFn: () => schoolsApi.getById(schoolId!),
    enabled: !!schoolId,
    staleTime: 300000,
  });

  if (loading) {
    return (
      <div className="flex justify-center items-center h-full py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-600"></div>
        <span className="ml-3 text-gray-700">Loading...</span>
      </div>
    );
  }

  if (!school || !schoolId) {
    return (
      <div className="py-6">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-semibold">School Not Found</h1>
          <Button variant="outline" onClick={() => navigate("/admin/settings")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to List
          </Button>
        </div>
        <p className="text-sm text-gray-600">The requested school could not be loaded.</p>
      </div>
    );
  }

  return (
    <div className="py-4">
      <div className="mb-4">
        <Button variant="outline" onClick={() => navigate("/admin/settings")}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to System Settings
        </Button>
      </div>

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">System Settings - {school.name}</h1>
        <p className="text-gray-600">Manage disciplines for {school.name}</p>
      </div>

      <SystemSettings schoolId={schoolId} />
    </div>
  );
};

export default SuperAdminSystemSettingsEditor;

