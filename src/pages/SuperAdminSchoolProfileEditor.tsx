import React, { useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { schoolsApi } from "@/services/schools";
import { useSchoolSelectionStore } from "@/store/schoolSelection";
import SuperAdminSchoolForm from "@/components/schools/SuperAdminSchoolForm";
import { Button } from "@/components/ui/button";

const SuperAdminSchoolProfileEditor: React.FC = () => {
  const { schoolId } = useParams();
  const navigate = useNavigate();
  const { selectedSchoolId } = useSchoolSelectionStore();
  const queryClient = useQueryClient();

  const { data: school, isLoading: loading } = useQuery({
    queryKey: ["school", schoolId],
    queryFn: () => schoolsApi.getById(schoolId!),
    enabled: !!schoolId,
    staleTime: 300000,
  });

  // Redirect when selected school changes
  useEffect(() => {
    // If "All Schools" is selected (selectedSchoolId is null), navigate to the list view
    if (!selectedSchoolId) {
      navigate(`/admin/school-profiles`, { replace: true });
    } else if (selectedSchoolId !== schoolId) {
      // If a different school is selected, navigate to that school's profile
      navigate(`/admin/school-profiles/${selectedSchoolId}`, { replace: true });
    }
  }, [selectedSchoolId, schoolId, navigate]);

  const handleSaved = async () => {
    await queryClient.invalidateQueries({ queryKey: ["school", schoolId] });
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-full py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-600"></div>
        <span className="ml-3 text-gray-700">Loading...</span>
      </div>
    );
  }

  if (!school) {
    return (
      <div className="py-6">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-semibold">School Not Found</h1>
          <Button variant="outline" onClick={() => navigate(-1)}>
            Back
          </Button>
        </div>
        <p className="text-sm text-gray-600">
          The requested school could not be loaded.
        </p>
      </div>
    );
  }

  return (
    <div className="py-4">
      <SuperAdminSchoolForm school={school} onSchoolSaved={handleSaved} />
    </div>
  );
};

export default SuperAdminSchoolProfileEditor;
