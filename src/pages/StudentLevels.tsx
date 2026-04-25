import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Loader2, Plus, Pencil, Trash2 } from "lucide-react";
import { useStudentLevels, StudentLevel } from "@/hooks/useStudentLevels";
import { ColorPalette, DEFAULT_COLOR } from "@/components/ui/ColorPalette";

interface StudentLevelsProps {
  schoolId?: string;
}

const StudentLevels: React.FC<StudentLevelsProps> = ({ schoolId }) => {
  const { t } = useTranslation();
  const { 
    studentLevels, 
    isLoading, 
    toggleStatus, 
    deleteLevel,
    createLevel,
    updateLevel,
    isToggling,
    isDeleting,
    isCreating,
    isUpdating
  } = useStudentLevels(schoolId);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isFormDialogOpen, setIsFormDialogOpen] = useState(false);
  const [selectedLevel, setSelectedLevel] = useState<StudentLevel | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    slug: "",
    description: "",
    color: DEFAULT_COLOR,
    active: true,
  });

  const handleDeleteLevel = (level: StudentLevel) => {
    setSelectedLevel(level);
    setIsDeleteDialogOpen(true);
  };

  const handleCreateLevel = () => {
    setSelectedLevel(null);
    setFormData({
      name: "",
      slug: "",
      description: "",
      color: DEFAULT_COLOR,
      active: true,
    });
    setIsFormDialogOpen(true);
  };

  const handleEditLevel = (level: StudentLevel) => {
    setSelectedLevel(level);
    setFormData({
      name: level.name,
      slug: level.slug,
      description: level.description || "",
      color: level.color,
      active: level.active,
    });
    setIsFormDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const submitData = {
        ...formData,
        slug: formData.slug || undefined, 
        description: formData.description || undefined,
      };
      
      if (selectedLevel) {
        await updateLevel({ id: selectedLevel.id, data: submitData });
      } else {
        await createLevel(submitData);
      }
      setIsFormDialogOpen(false);
      setSelectedLevel(null);
      setFormData({
        name: "",
        slug: "",
        description: "",
        color: DEFAULT_COLOR,
        active: true,
      });
    } catch (error) {
      // Error is handled by the hook (toast notification)
    }
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === "number" 
        ? (value === "" ? "" : (isNaN(parseInt(value)) ? prev[name as keyof typeof prev] : parseInt(value)))
        : type === "checkbox" 
        ? (e.target as HTMLInputElement).checked 
        : value,
    }));
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pink-600"></div>
        <span className="ml-3 text-sm text-gray-500">{t("common.loading")}</span>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-0">
        <div>
          <h2 className="text-lg sm:text-xl font-bold text-gray-900">{t("studentLevels.title")}</h2>
          <p className="text-sm sm:text-base text-gray-600">{t("studentLevels.subtitle")}</p>
        </div>
        <Button onClick={handleCreateLevel} className="bg-pink-600 hover:bg-pink-700 w-full sm:w-auto">
          <Plus className="h-4 w-4 mr-2" />
          {t("studentLevels.newLevel")}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("studentLevels.levelsList")}</CardTitle>
          <p className="text-sm text-gray-600">{t("studentLevels.levelsListSubtitle")}</p>
        </CardHeader>
        <CardContent>
          {studentLevels.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500">{t("studentLevels.noLevelsFound")}</p>
            </div>
          ) : (
            <>
              {/* Desktop Table View */}
              <div className="hidden md:block overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t("studentLevels.colorColumn")}</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t("studentLevels.nameColumn")}</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t("studentLevels.statusColumn")}</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t("studentLevels.actionsColumn")}</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {studentLevels.map((level) => (
                      <tr key={level.id} className={!level.active ? "opacity-60" : ""}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div
                            className="w-6 h-6 rounded-full border border-gray-300"
                            style={{ backgroundColor: level.color }}
                          />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{level.name}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => toggleStatus(level.id)}
                            disabled={isToggling}
                            className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full cursor-pointer transition-all duration-200 ${
                              level.active
                                ? "bg-green-100 text-green-800 hover:bg-green-200"
                                : "bg-red-100 text-red-800 hover:bg-red-200"
                            } disabled:opacity-50 disabled:cursor-not-allowed`}
                            aria-label={level.active ? t("common.deactivate") : t("common.activate")}
                            title={level.active ? t("common.deactivate") : t("common.activate")}
                          >
                            {level.active ? t("common.active") : t("common.inactive")}
                          </button>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => handleEditLevel(level)}
                              className="text-blue-600 hover:text-blue-800"
                            >
                              <Pencil className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteLevel(level)}
                              className="text-red-600 hover:text-red-800"
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
                {studentLevels.map((level) => (
                  <Card key={level.id} className={!level.active ? "opacity-60" : ""}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div
                            className="w-8 h-8 rounded-full border border-gray-300"
                            style={{ backgroundColor: level.color }}
                          />
                          <div>
                            <h3 className="font-semibold text-gray-900">{level.name}</h3>
                            {level.description && (
                              <p className="text-sm text-gray-600 mt-1">{level.description}</p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => toggleStatus(level.id)}
                            disabled={isToggling}
                            className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full cursor-pointer transition-all duration-200 ${
                              level.active
                                ? "bg-green-100 text-green-800 hover:bg-green-200"
                                : "bg-red-100 text-red-800 hover:bg-red-200"
                            } disabled:opacity-50 disabled:cursor-not-allowed`}
                            aria-label={level.active ? t("common.deactivate") : t("common.activate")}
                            title={level.active ? t("common.deactivate") : t("common.activate")}
                          >
                            {level.active ? t("common.active") : t("common.inactive")}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleEditLevel(level)}
                            className="text-blue-600 hover:text-blue-800"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteLevel(level)}
                            className="text-red-600 hover:text-red-800"
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

      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("studentLevels.confirmDelete")}</DialogTitle>
            <DialogDescription>
              {t("studentLevels.confirmDeleteMessage")}
              {selectedLevel && (
                <span className="block mt-2 font-medium text-gray-900">{selectedLevel.name}</span>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              {t("common.cancel")}
            </Button>
            <Button
              variant="destructive"
              onClick={async () => {
                if (selectedLevel) {
                  await deleteLevel(selectedLevel.id);
                  setIsDeleteDialogOpen(false);
                }
              }}
              disabled={isDeleting}
            >
              {isDeleting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              {t("common.delete")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create/Edit Form Dialog */}
      <Dialog open={isFormDialogOpen} onOpenChange={setIsFormDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {selectedLevel ? t("studentLevels.edit") : t("studentLevels.createNew")}
            </DialogTitle>
            <DialogDescription>
              {selectedLevel
                ? t("studentLevels.updateInfo")
                : t("studentLevels.addNew")}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t("studentLevels.nameRequired")}
              </label>
              <Input
                name="name"
                value={formData.name}
                onChange={(e) => {
                  const value = e.target.value;
                  handleInputChange(e);
                  const generateSlug = (text: string): string => {
                    return text
                      .toLowerCase()
                      .trim()
                      .replace(/[^\w\s-]/g, "")
                      .replace(/\s+/g, "-")
                      .replace(/-+/g, "-")
                      .replace(/^-+|-+$/g, "");
                  };
                  setFormData(prev => ({
                    ...prev,
                    slug: generateSlug(value)
                  }));
                }}
                placeholder={t("studentLevels.namePlaceholder")}
                required
                minLength={2}
                maxLength={50}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t("studentLevels.description")}
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                placeholder={t("studentLevels.descriptionPlaceholder")}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-pink-500"
                rows={3}
              />
              <p className="text-xs text-gray-500 mt-1">
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t("studentLevels.colorRequired")}
              </label>
              <ColorPalette
                selectedColor={formData.color}
                onColorSelect={(color) => {
                  setFormData(prev => ({ ...prev, color }));
                }}
                disabled={isCreating || isUpdating}
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="active"
                name="active"
                checked={formData.active}
                onChange={handleInputChange}
                className="rounded border-gray-300 text-pink-600 focus:ring-pink-500"
              />
              <label htmlFor="active" className="text-sm font-medium text-gray-700">
                {t("studentLevels.active")}
              </label>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsFormDialogOpen(false);
                  setSelectedLevel(null);
                  setFormData({
                    name: "",
                    slug: "",
                    description: "",
                    color: "#6B7280",
                    active: true,
                  });
                }}
              >
                {t("common.cancel")}
              </Button>
              <Button
                type="submit"
                disabled={isCreating || isUpdating}
                className="bg-pink-600 hover:bg-pink-700 text-white"
              >
                {isCreating || isUpdating ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    {selectedLevel ? t("studentLevels.updating") : t("studentLevels.creating")}
                  </>
                ) : (
                  selectedLevel ? t("common.update") : t("common.create")
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default StudentLevels;
