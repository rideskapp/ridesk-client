import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent } from "@/components/ui/card";
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
import { Loader2, Plus, Pencil, Trash2, Tag } from "lucide-react";
import { useProductCategories, ProductCategory } from "@/hooks/useProductCategories";
import { ColorPalette, DEFAULT_COLOR } from "@/components/ui/ColorPalette";

interface ProductCategoriesProps {
  schoolId?: string;
}

const ProductCategories: React.FC<ProductCategoriesProps> = ({ schoolId }) => {
  const { t } = useTranslation();
  const { 
    categories, 
    isLoading, 
    toggleStatus, 
    deleteCategory,
    createCategory,
    updateCategory,
    isToggling,
    isDeleting,
    isCreating,
    isUpdating
  } = useProductCategories(schoolId);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isFormDialogOpen, setIsFormDialogOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<ProductCategory | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    slug: "",
    color: DEFAULT_COLOR,
    default_max_participants: 1,
    active: true,
    associable_to_lessons: true,
    order_position: 0,
  });

  const handleDeleteCategory = (category: ProductCategory) => {
    setSelectedCategory(category);
    setIsDeleteDialogOpen(true);
  };

  const handleCreateCategory = () => {
    setSelectedCategory(null);
    setFormData({
      name: "",
      slug: "",
      color: DEFAULT_COLOR,
      default_max_participants: 1,
      active: true,
      associable_to_lessons: true,
      order_position: categories.length > 0 ? Math.max(...categories.map(c => c.order_position || 0)) + 1 : 0,
    });
    setIsFormDialogOpen(true);
  };

  const handleEditCategory = (category: ProductCategory) => {
    const latestCategory = categories.find(c => c.id === category.id) || category;
    setSelectedCategory(latestCategory);
    setFormData({
      name: latestCategory.name,
      slug: latestCategory.slug || "",
      color: latestCategory.color,
      default_max_participants: latestCategory.default_max_participants || 1,
      active: latestCategory.active,
      associable_to_lessons: latestCategory.associable_to_lessons ?? true,
      order_position: latestCategory.order_position || 0,
    });
    setIsFormDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const submitData: any = {
        ...formData,
      };
      
      // Handle empty slug
      if (formData.slug.trim() === "") {
        if (selectedCategory) {
          submitData.slug = "";
        } else {
          delete submitData.slug;
        }
      }
      
      if (selectedCategory) {
        await updateCategory({ id: selectedCategory.id, data: submitData });
      } else {
        await createCategory(submitData);
      }
      setIsFormDialogOpen(false);
      setSelectedCategory(null);
      setFormData({
        name: "",
        slug: "",
        color: DEFAULT_COLOR,
        default_max_participants: 1,
        active: true,
        associable_to_lessons: true,
        order_position: 0,
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

  const handleNumberBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value === "" ? 0 : (isNaN(parseInt(value)) ? 0 : parseInt(value)),
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
        <div className="flex items-center gap-3">
          <Tag className="h-6 w-6 text-pink-600" />
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-gray-900">{t("productCategories.title")}</h2>
            <p className="text-xs sm:text-sm text-gray-600">{t("productCategories.subtitle")} ({categories.length})</p>
          </div>
        </div>
        <Button onClick={handleCreateCategory} className="bg-pink-600 hover:bg-pink-700 w-full sm:w-auto">
          <Plus className="h-4 w-4 mr-2" />
          {t("productCategories.newCategory")}
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          {categories.length === 0 ? (
            <div className="px-6 py-8 text-center text-gray-500">
              {t("productCategories.noCategoriesFound")}
            </div>
          ) : (
            <>
              {/* Desktop Table View */}
              <div className="hidden md:block overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t("productCategories.colorColumn")}</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t("productCategories.nameColumn")}</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t("productCategories.maxParticipantsColumn")}</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t("productCategories.statusColumn")}</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t("productCategories.actionsColumn")}</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {categories.map((category) => (
                      <tr key={category.id} className={!category.active ? "opacity-60" : ""}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div
                            className="w-6 h-6 rounded-full border border-gray-300"
                            style={{ backgroundColor: category.color }}
                          />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{category.name}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{category.default_max_participants}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => toggleStatus(category.id)}
                            disabled={isToggling}
                            className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full cursor-pointer transition-all duration-200 ${
                              category.active
                                ? "bg-green-100 text-green-800 hover:bg-green-200"
                                : "bg-red-100 text-red-800 hover:bg-red-200"
                            } disabled:opacity-50 disabled:cursor-not-allowed`}
                            aria-label={category.active ? t("common.deactivate") : t("common.activate")}
                            title={category.active ? t("common.deactivate") : t("common.activate")}
                          >
                            {category.active ? t("common.active") : t("common.inactive")}
                          </button>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => handleEditCategory(category)}
                              className="text-blue-600 hover:text-blue-800"
                              title={t("common.edit")}
                            >
                              <Pencil className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteCategory(category)}
                              className="text-red-600 hover:text-red-800"
                              title={t("common.delete")}
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
              <div className="md:hidden space-y-4 p-4">
                {categories.map((category) => (
                  <Card key={category.id} className={!category.active ? "opacity-60" : ""}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div
                            className="w-8 h-8 rounded-full border border-gray-300"
                            style={{ backgroundColor: category.color }}
                          />
                          <div>
                            <h3 className="font-semibold text-gray-900">{category.name}</h3>
                            <p className="text-sm text-gray-600">
                              {t("productCategories.maxParticipantsColumn")}: {category.default_max_participants}
                            </p>
                            <p className="text-sm text-gray-600">
                              {t("productCategories.associableToLessons")}:{" "}
                              {(category.associable_to_lessons ?? true)
                                ? t("common.yes")
                                : t("common.no")}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => toggleStatus(category.id)}
                            disabled={isToggling}
                            className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full cursor-pointer transition-all duration-200 ${
                              category.active
                                ? "bg-green-100 text-green-800 hover:bg-green-200"
                                : "bg-red-100 text-red-800 hover:bg-red-200"
                            } disabled:opacity-50 disabled:cursor-not-allowed`}
                            aria-label={category.active ? t("common.deactivate") : t("common.activate")}
                            title={category.active ? t("common.deactivate") : t("common.activate")}
                          >
                            {category.active ? t("common.active") : t("common.inactive")}
                          </button>
                          <button
                            onClick={() => handleEditCategory(category)}
                            className="text-blue-600 hover:text-blue-800"
                            title={t("common.edit")}
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteCategory(category)}
                            className="text-red-600 hover:text-red-800"
                            title={t("common.delete")}
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
            <DialogTitle>{t("productCategories.confirmDelete")}</DialogTitle>
            <DialogDescription>
              {t("productCategories.confirmDeleteMessage")}
              {selectedCategory && (
                <span className="block mt-2 font-medium text-gray-900">{selectedCategory.name}</span>
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
                if (selectedCategory) {
                  await deleteCategory(selectedCategory.id);
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
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedCategory ? t("productCategories.edit") : t("productCategories.createNew")}
            </DialogTitle>
            <DialogDescription>
              {selectedCategory
                ? t("productCategories.updateInfo")
                : t("productCategories.addNew")}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t("productCategories.nameRequired")}
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
                placeholder={t("productCategories.namePlaceholder")}
                required
                minLength={2}
                maxLength={100}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t("productCategories.colorRequired")}
                </label>
                <ColorPalette
                  selectedColor={formData.color}
                  onColorSelect={(color) => {
                    setFormData(prev => ({ ...prev, color }));
                  }}
                  disabled={isCreating || isUpdating}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t("productCategories.defaultMaxParticipants")}
                </label>
                <Input
                  type="number"
                  name="default_max_participants"
                  value={formData.default_max_participants || ""}
                  onChange={handleInputChange}
                  onBlur={handleNumberBlur}
                  min="1"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t("productCategories.orderPosition")}
              </label>
              <Input
                type="number"
                name="order_position"
                value={formData.order_position || ""}
                onChange={handleInputChange}
                onBlur={handleNumberBlur}
                min="0"
              />
              <p className="text-xs text-gray-500 mt-1">
                {t("productCategories.orderPositionHelp")}
              </p>
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
                {t("productCategories.active")}
              </label>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="associable_to_lessons"
                name="associable_to_lessons"
                checked={formData.associable_to_lessons}
                onChange={handleInputChange}
                className="rounded border-gray-300 text-pink-600 focus:ring-pink-500"
              />
              <label htmlFor="associable_to_lessons" className="text-sm font-medium text-gray-700">
                {t("productCategories.associableToLessons")}
              </label>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsFormDialogOpen(false);
                  setSelectedCategory(null);
                  setFormData({
                    name: "",
                    slug: "",
                    color: "#3B82F6",
                    default_max_participants: 1,
                    active: true,
                    associable_to_lessons: true,
                    order_position: 0,
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
                    {selectedCategory ? t("productCategories.updating") : t("productCategories.creating")}
                  </>
                ) : (
                  selectedCategory ? t("common.update") : t("common.create")
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ProductCategories;