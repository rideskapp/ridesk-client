import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { useErrorTranslation } from "@/hooks/useErrorTranslation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "react-hot-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Loader2, Settings, Plus, Pencil, Trash2 } from "lucide-react";
import { useAllDisciplines } from "@/hooks/useDisciplines";
import { disciplinesApi, type Discipline } from "@/services/disciplines";
import { DisciplineForm } from "@/components/admin/DisciplineForm";

interface SystemSettingsProps {
  schoolId?: string;
}

const SystemSettings: React.FC<SystemSettingsProps> = ({ schoolId }) => {
  const { t } = useTranslation();
  const { getTranslatedError } = useErrorTranslation();
  const queryClient = useQueryClient();
  const { disciplines, isLoading, error } = useAllDisciplines(schoolId);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedDiscipline, setSelectedDiscipline] = useState<Discipline | null>(null);
  const [isFormLoading, setIsFormLoading] = useState(false);

  const toggleStatusMutation = useMutation({
    mutationFn: (id: string) => disciplinesApi.toggleDisciplineStatus(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['disciplines'] });
      queryClient.invalidateQueries({ queryKey: ['disciplines', 'all'] });
      toast.success(t("disciplines.statusUpdated"));
    },
    onError: (error: any) => {
      toast.error(getTranslatedError(error) || t("disciplines.statusUpdateFailed"));
    },
  });

  const createMutation = useMutation({
    mutationFn: (data: Partial<Discipline>) => disciplinesApi.createDiscipline(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['disciplines'] });
      queryClient.invalidateQueries({ queryKey: ['disciplines', 'all'] });
      toast.success(t("disciplines.created"));
      setIsFormOpen(false);
      setSelectedDiscipline(null);
    },
    onError: (error: any) => {
      toast.error(getTranslatedError(error) || t("disciplines.createFailed"));
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Discipline> }) =>
      disciplinesApi.updateDiscipline(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['disciplines'] });
      queryClient.invalidateQueries({ queryKey: ['disciplines', 'all'] });
      toast.success(t("disciplines.updated"));
      setIsFormOpen(false);
      setSelectedDiscipline(null);
    },
    onError: (error: any) => {
      toast.error(getTranslatedError(error) || t("disciplines.updateFailed"));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => disciplinesApi.deleteDiscipline(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['disciplines'] });
      queryClient.invalidateQueries({ queryKey: ['disciplines', 'all'] });
      toast.success(t("disciplines.deleted"));
      setIsDeleteDialogOpen(false);
      setSelectedDiscipline(null);
    },
    onError: (error: any) => {
      toast.error(getTranslatedError(error) || t("disciplines.deleteFailed"));
    },
  });

  const handleToggleStatus = (discipline: Discipline) => {
    toggleStatusMutation.mutate(discipline.id);
  };

  const handleCreateDiscipline = () => {
    setSelectedDiscipline(null);
    setIsFormOpen(true);
  };

  const handleEditDiscipline = (discipline: Discipline) => {
    const latestDiscipline = disciplines.find(d => d.id === discipline.id) || discipline;
    setSelectedDiscipline(latestDiscipline);
    setIsFormOpen(true);
  };

  const handleDeleteDiscipline = (discipline: Discipline) => {
    setSelectedDiscipline(discipline);
    setIsDeleteDialogOpen(true);
  };

  const handleSaveDiscipline = async (data: Partial<Discipline>) => {
    setIsFormLoading(true);
    try {
      if (selectedDiscipline) {
        await updateMutation.mutateAsync({ id: selectedDiscipline.id, data });
      } else {
        if (!schoolId) {
          toast.error(t("common.error", { defaultValue: "School ID is required. Please ensure you're accessing this page from a valid school configuration." }));
          setIsFormLoading(false);
          return;
        }
        const payload: Partial<Discipline> & { school_id: string } = { 
          ...data, 
          school_id: schoolId 
        };
        await createMutation.mutateAsync(payload);
      }
    } catch (error) {
      // Error is handled by mutation
    } finally {
      setIsFormLoading(false);
    }
  };

  const handleConfirmDelete = () => {
    if (selectedDiscipline) {
      deleteMutation.mutate(selectedDiscipline.id);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pink-600"></div>
        <span className="ml-3 text-sm text-gray-500">{t("common.loading")}</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-red-500">{t("disciplines.noDisciplines")}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-0">
        <div className="flex items-center space-x-3">
          <Settings className="h-6 w-6 sm:h-8 sm:w-8 text-pink-600" />
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
              {t("admin.systemSettings")}
            </h1>
            <p className="text-sm sm:text-base text-gray-600">{t("disciplines.management")}</p>
          </div>
        </div>
        <Button onClick={handleCreateDiscipline} className="bg-pink-600 hover:bg-pink-700 w-full sm:w-auto">
          <Plus className="h-4 w-4 mr-2" />
          {t("disciplines.createDiscipline")}
        </Button>
      </div>

      {/* Disciplines Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg sm:text-xl">{t("disciplines.title")}</CardTitle>
        </CardHeader>
        <CardContent>
          {disciplines.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500">{t("disciplines.noDisciplines")}</p>
            </div>
          ) : (
            <>
              {/* Desktop Table View */}
              <div className="hidden md:block overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {t("disciplines.color")}
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {t("disciplines.name")}
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {t("disciplines.status")}
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {t("disciplines.actions")}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {disciplines.map((discipline) => (
                      <tr
                        key={discipline.id}
                        className={!discipline.is_active ? "opacity-60" : ""}
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div
                            className="w-6 h-6 rounded-full border border-gray-300"
                            style={{ backgroundColor: discipline.color || '#cccccc' }}
                            aria-label={t("disciplines.colorIndicator", { color: discipline.name, defaultValue: `${discipline.name} color indicator` })}
                            role="img"
                          />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            {discipline.name}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => handleToggleStatus(discipline)}
                            disabled={toggleStatusMutation.isPending}
                            className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full cursor-pointer transition-all duration-200 ${
                              discipline.is_active
                                ? "bg-green-100 text-green-800 hover:bg-green-200"
                                : "bg-red-100 text-red-800 hover:bg-red-200"
                            } disabled:opacity-50 disabled:cursor-not-allowed`}
                          >
                            {discipline.is_active
                              ? t("disciplines.active")
                              : t("disciplines.inactive")}
                          </button>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => handleEditDiscipline(discipline)}
                              className="text-blue-600 hover:text-blue-800 transition-colors"
                              title={t("disciplines.editDiscipline")}
                            >
                              <Pencil className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteDiscipline(discipline)}
                              className="text-red-600 hover:text-red-800 transition-colors"
                              title={t("disciplines.deleteDiscipline")}
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Card View */}
              <div className="md:hidden space-y-4">
                {disciplines.map((discipline) => (
                  <Card key={discipline.id} className={!discipline.is_active ? "opacity-60" : ""}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div
                            className="w-8 h-8 rounded-full border border-gray-300"
                            style={{ backgroundColor: discipline.color || '#cccccc' }}
                            aria-label={t("disciplines.colorIndicator", { color: discipline.name, defaultValue: `${discipline.name} color indicator` })}
                            role="img"
                          />
                          <div>
                            <h3 className="font-semibold text-gray-900">{discipline.name}</h3>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleToggleStatus(discipline)}
                            disabled={toggleStatusMutation.isPending}
                            className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full cursor-pointer transition-all duration-200 ${
                              discipline.is_active
                                ? "bg-green-100 text-green-800 hover:bg-green-200"
                                : "bg-red-100 text-red-800 hover:bg-red-200"
                            } disabled:opacity-50 disabled:cursor-not-allowed`}
                          >
                            {discipline.is_active
                              ? t("disciplines.active")
                              : t("disciplines.inactive")}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleEditDiscipline(discipline)}
                            className="text-blue-600 hover:text-blue-800 transition-colors"
                            title={t("disciplines.editDiscipline")}
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteDiscipline(discipline)}
                            className="text-red-600 hover:text-red-800 transition-colors"
                            title={t("disciplines.deleteDiscipline")}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Discipline Form Dialog */}
      <DisciplineForm
        discipline={selectedDiscipline}
        open={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setSelectedDiscipline(null);
        }}
        onSave={handleSaveDiscipline}
        isLoading={isFormLoading || createMutation.isPending || updateMutation.isPending}
      />

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("common.confirm")}</DialogTitle>
            <DialogDescription>
              {t("disciplines.confirmDelete")}
              {selectedDiscipline && (
                <span className="block mt-2 font-medium text-gray-900">
                  {selectedDiscipline.name}
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsDeleteDialogOpen(false)}
              disabled={deleteMutation.isPending}
            >
              {t("common.cancel")}
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmDelete}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                t("common.delete")
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SystemSettings;

