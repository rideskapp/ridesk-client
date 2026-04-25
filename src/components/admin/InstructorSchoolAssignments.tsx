import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { useErrorTranslation } from "@/hooks/useErrorTranslation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "../ui/button";
import { Card } from "../ui/card";
import { X, Plus, Trash2, Star } from "lucide-react";
import { schoolsApi } from "../../services/schools";
import { api } from "../../lib/api";
import toast from "react-hot-toast";

interface School {
  id: string;
  name: string;
  slug: string;
}

interface InstructorSchoolAssignment {
  id: string;
  instructorId: string;
  schoolId: string;
  schoolName: string;
  schoolSlug: string;
  isPrimary: boolean;
  hourlyRate?: number;
  commissionRate?: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface InstructorSchoolAssignmentsProps {
  instructorId: string;
  instructorName: string;
  isOpen: boolean;
  onClose: () => void;
  onAssignmentChange?: () => void;
}

export const InstructorSchoolAssignments: React.FC<
  InstructorSchoolAssignmentsProps
> = ({ instructorId, instructorName, isOpen, onClose, onAssignmentChange }) => {
  const { t } = useTranslation();
  const { getTranslatedError } = useErrorTranslation();
  const queryClient = useQueryClient();
  const [showAddForm, setShowAddForm] = useState(false);
  const [newAssignment, setNewAssignment] = useState({
    schoolId: "",
    isPrimary: false,
  });

  const { data: assignments = [], isLoading: isLoadingAssignments } = useQuery<InstructorSchoolAssignment[]>({
    queryKey: ['instructor-schools', instructorId],
    queryFn: async () => {
      try {
        const response = await api.get(
          `/instructor-schools/instructor/${instructorId}`,
        );
        return response.data.data || [];
      } catch (error: any) {
        console.error("Failed to fetch assignments:", error);
        toast.error(getTranslatedError(error) || t("admin.assignmentsLoadFailed"));
        throw error;
      }
    },
    enabled: isOpen && !!instructorId,
    staleTime: 60000,
  });

  const { data: schools = [] } = useQuery<School[]>({
    queryKey: ['schools', 1, 100],
    queryFn: async () => {
      try {
        const schoolsData = await schoolsApi.getAll();
        return schoolsData || [];
      } catch (error: any) {
        console.error("Failed to fetch schools:", error);
        toast.error(getTranslatedError(error) || t("admin.schoolsLoadFailed"));
        throw error;
      }
    },
    enabled: isOpen,
    staleTime: 120000,
  });

  const isLoading = isLoadingAssignments;

  const handleAddAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAssignment.schoolId) return;

    try {
      await api.post("/instructor-schools/assign", {
        instructorId,
        schoolId: newAssignment.schoolId,
        isPrimary: newAssignment.isPrimary,
      });

      toast.success(t("admin.assignmentSuccess"));
      setNewAssignment({
        schoolId: "",
        isPrimary: false,
      });
      setShowAddForm(false);
      await queryClient.invalidateQueries({ queryKey: ['instructor-schools', instructorId] });
      onAssignmentChange?.();
    } catch (error: any) {
      console.error("Failed to assign instructor:", error);
      toast.error(
        getTranslatedError(error) ||
          t("admin.assignmentFailed"),
      );
    }
  };

  const handleRemoveAssignment = async (assignmentId: string) => {
    try {
      const assignment = assignments.find((a) => a.id === assignmentId);
      if (!assignment) return;

      await api.delete(
        `/instructor-schools/remove?instructorId=${instructorId}&schoolId=${assignment.schoolId}`,
      );
      toast.success(t("admin.removalSuccess"));
      await queryClient.invalidateQueries({ queryKey: ['instructor-schools', instructorId] });
      onAssignmentChange?.();
    } catch (error: any) {
      console.error("Failed to remove assignment:", error);
      toast.error(getTranslatedError(error) || t("admin.removalFailed"));
    }
  };

  const handleTogglePrimary = async (assignmentId: string) => {
    try {
      const assignment = assignments.find((a) => a.id === assignmentId);
      if (!assignment) return;

      await api.put(`/instructor-schools/${assignmentId}`, {
        isPrimary: !assignment.isPrimary,
      });

      toast.success(t("admin.primaryUpdated"));
      await queryClient.invalidateQueries({ queryKey: ['instructor-schools', instructorId] });
      onAssignmentChange?.();
    } catch (error: any) {
      console.error("Failed to update primary school:", error);
      toast.error(getTranslatedError(error) || t("admin.primaryUpdateFailed"));
    }
  };

  const availableSchools = schools.filter(
    (school) =>
      !assignments.some((assignment) => assignment.schoolId === school.id),
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-4xl max-h-[90vh] overflow-hidden">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                {t("admin.instructorSchoolAssignments")}
              </h2>
              <p className="text-sm text-gray-600 mt-1">{instructorName}</p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="h-8 w-8 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Current Assignments */}
          <div className="mb-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              {t("admin.currentAssignments")}
            </h3>
            {assignments.length === 0 ? (
              <p className="text-gray-500 text-sm">
                {t("admin.noSchoolAssignments")}
              </p>
            ) : (
              <div className="space-y-3">
                {assignments.map((assignment) => (
                  <div
                    key={assignment.id}
                    className="flex items-center justify-between p-4 border border-gray-200 rounded-lg"
                  >
                    <div className="flex items-center space-x-3">
                      {assignment.isPrimary && (
                        <Star className="h-5 w-5 text-yellow-500 fill-current" />
                      )}
                      <div>
                        <p className="font-medium text-gray-900">
                          {assignment.schoolName}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleTogglePrimary(assignment.id)}
                      >
                        {assignment.isPrimary
                          ? "Remove Primary"
                          : "Set Primary"}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleRemoveAssignment(assignment.id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Add New Assignment */}
          {availableSchools.length > 0 && (
            <div>
              {!showAddForm ? (
                <Button onClick={() => setShowAddForm(true)} className="w-full">
                  <Plus className="h-4 w-4 mr-2" />
                  {t("admin.addSchoolAssignment")}
                </Button>
              ) : (
                <form
                  onSubmit={handleAddAssignment}
                  className="space-y-4 p-4 border border-gray-200 rounded-lg"
                >
                  <h4 className="font-medium text-gray-900">
                    {t("admin.addNewAssignment")}
                  </h4>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {t("admin.school")}
                      </label>
                      <select
                        value={newAssignment.schoolId}
                        onChange={(e) =>
                          setNewAssignment((prev) => ({
                            ...prev,
                            schoolId: e.target.value,
                          }))
                        }
                        className="w-full appearance-none pr-10 bg-[right_0.75rem_center] bg-no-repeat bg-[length:16px_16px] px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-pink-500"
                        style={{
                          backgroundImage:
                            "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='16' height='16' fill='none' viewBox='0 0 24 24' stroke='%236b7280' stroke-width='2'><path stroke-linecap='round' stroke-linejoin='round' d='M19 9l-7 7-7-7'/></svg>\")",
                        }}
                        required
                      >
                        <option value="">{t("admin.selectSchool")}</option>
                        {availableSchools.map((school) => (
                          <option key={school.id} value={school.id}>
                            {school.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="flex items-center space-x-4">
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={newAssignment.isPrimary}
                          onChange={(e) =>
                            setNewAssignment((prev) => ({
                              ...prev,
                              isPrimary: e.target.checked,
                            }))
                          }
                          className="rounded border-gray-300 text-pink-600 focus:ring-pink-500"
                        />
                        <span className="ml-2 text-sm text-gray-700">
                          {t("admin.setAsPrimary")}
                        </span>
                      </label>
                    </div>
                  </div>

                  <div className="flex justify-end space-x-3">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setShowAddForm(false);
                        setNewAssignment({
                          schoolId: "",
                          isPrimary: false,
                        });
                      }}
                    >
                      {t("common.cancel")}
                    </Button>
                    <Button
                      type="submit"
                      disabled={isLoading || !newAssignment.schoolId}
                    >
                      {isLoading
                        ? t("common.loading")
                        : t("admin.addAssignment")}
                    </Button>
                  </div>
                </form>
              )}
            </div>
          )}
        </div>
      </Card>
    </div>
  );
};
