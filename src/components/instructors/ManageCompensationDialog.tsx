//compensation dialog (super admin and school admin) allows setting compensation rates for instructors

import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { useInstructorRates } from "@/hooks/useInstructorRates";
import { useProductCategories } from "@/hooks/useProductCategories";
import { useAuthStore } from "@/store/auth";
import { useSchoolSelectionStore } from "@/store/schoolSelection";
import { UserRole } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DollarSign, Edit, Trash2, X, CheckCircle } from "lucide-react";
import { toast } from "react-hot-toast";
import { useSchoolSettings } from "@/hooks/useSchoolSettings";
import { formatCurrency } from "@/lib/utils";

interface ManageCompensationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  instructorId: string;
  instructorName: string;
}

const ManageCompensationDialog: React.FC<ManageCompensationDialogProps> = ({
  open,
  onOpenChange,
  instructorId,
  instructorName,
}) => {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const { selectedSchoolId } = useSchoolSelectionStore();
  const [editingRate, setEditingRate] = useState<{ id: string } | null>(null);
  const [formData, setFormData] = useState({
    category_id: "",
    rate_type: "hourly" as "hourly",
    rate_value: "",
  });

  const effectiveSchoolId =
    user?.role === UserRole.SUPER_ADMIN
      ? (selectedSchoolId ?? undefined)
      : user?.schoolId;

  const { settings: schoolSettings } = useSchoolSettings(effectiveSchoolId);
  const formatRate = (value: number) =>
    formatCurrency(
      value,
      schoolSettings?.defaultCurrency || "EUR",
      "it-IT",
    );

  const { categories, isLoading: categoriesLoading } = useProductCategories(effectiveSchoolId);
  const {
    rates,
    loading: ratesLoading,
    createRate,
    updateRate,
    deleteRate,
    isCreating,
    isUpdating,
    isDeleting,
  } = useInstructorRates(instructorId, effectiveSchoolId);

  const handleOpenEditDialog = (rateId: string) => {
    const rate = rates.find((r) => r.id === rateId);
    if (rate) {
      setEditingRate({ id: rateId });
      setFormData({
        category_id: rate.category_id,
        rate_type: "hourly", // Always hourly
        rate_value: rate.rate_value.toString(),
      });
      setTimeout(() => {
        const formSection = document.querySelector('[data-rate-form]');
        if (formSection) {
          formSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 100);
    }
  };

  const handleCloseDialog = () => {
    onOpenChange(false);
    setEditingRate(null);
    setFormData({
      category_id: "",
      rate_type: "hourly",
      rate_value: "",
    });
  };

  const handleSubmit = async () => {
    if (!formData.category_id || !formData.rate_value) {
      toast.error(t("compensation.rates.fillRequired"));
      return;
    }

    const rateValue = parseFloat(formData.rate_value);
    if (isNaN(rateValue) || rateValue < 0) {
      toast.error(t("compensation.rates.positiveNumber"));
      return;
    }

    // Guard against missing school ID when creating a new rate
    if (!editingRate) {
      if (!effectiveSchoolId) {
        toast.error(t("compensation.rates.schoolRequired"));
        return;
      }
      // TypeScript narrowing: effectiveSchoolId is guaranteed to be defined here
      const schoolId: string = effectiveSchoolId;
      try {
        await createRate({
          instructor_id: instructorId,
          category_id: formData.category_id,
          school_id: schoolId,
          rate_type: "hourly",
          rate_value: rateValue,
        });
        toast.success(t("compensation.rates.created"));
        setEditingRate(null);
        setFormData({
          category_id: "",
          rate_type: "hourly",
          rate_value: "",
        });
        return;
      } catch (error: any) {
        toast.error(error.message || t("compensation.rates.saveFailed"));
        return;
      }
    }

    try {
      // Editing existing rate
      await updateRate({
        id: editingRate.id,
        updates: {
          category_id: formData.category_id,
          rate_type: formData.rate_type,
          rate_value: rateValue,
        },
      });
      toast.success(t("compensation.rates.updated"));
      setEditingRate(null);
      setFormData({
        category_id: "",
        rate_type: "hourly",
        rate_value: "",
      });
    } catch (error: any) {
      toast.error(error.message || t("compensation.rates.saveFailed"));
    }
  };

  const handleDelete = async (rateId: string) => {
    if (!confirm(t("compensation.rates.confirmDelete"))) {
      return;
    }

    try {
      await deleteRate(rateId);
      toast.success(t("compensation.rates.deleted"));
    } catch (error: any) {
      toast.error(error.message || t("compensation.rates.deleteFailed"));
    }
  };

  // Rate type is always "hourly" - removed other options

  const getCategoryById = (categoryId: string) => {
    return categories.find((cat) => cat.id === categoryId);
  };

  const getCategoriesWithoutRates = () => {
    const ratedCategoryIds = new Set(rates.map((r) => r.category_id));
    return categories.filter((cat) => !ratedCategoryIds.has(cat.id));
  };

  const availableCategories = getCategoriesWithoutRates();
  const noCategoriesExist = categories?.length === 0;
  const allCategoriesSet = !noCategoriesExist && availableCategories.length === 0;

  if (categoriesLoading || ratesLoading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t("compensation.rates.loading")}</DialogTitle>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[85vh] sm:max-h-[80vh] overflow-y-auto w-[95vw] sm:w-full">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg sm:text-xl">
              <DollarSign className="h-4 w-4 sm:h-5 sm:w-5" />
              <span className="break-words">{t("compensation.rates.manageTitle", { name: instructorName })}</span>
            </DialogTitle>
            <DialogDescription className="text-sm">
              {t("compensation.rates.description")}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 sm:space-y-4">
            {/* Existing Rates */}
            <div>
              <h3 className="font-semibold mb-3">{t("compensation.rates.existingRates", { count: rates.length })}</h3>
              {rates.length > 0 ? (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {rates.map((rate) => {
                    const category = getCategoryById(rate.category_id);
                    const isEditing = editingRate?.id === rate.id;
                    return (
                      <div
                        key={rate.id}
                        className={`flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-3 p-3 border rounded-lg ${isEditing ? "ring-2 ring-primary bg-primary/5" : ""
                          }`}
                      >
                        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3 flex-1 min-w-0">
                          <Badge
                            style={{
                              backgroundColor: category?.color || "#6B7280",
                              color: "white",
                            }}
                            className="min-w-[100px] sm:min-w-[120px]"
                          >
                            {category?.name || t("compensation.unknown")}
                          </Badge>
                          <span className="text-sm font-medium whitespace-nowrap">
                            {formatRate(rate.rate_value)}/hour
                          </span>
                          {isEditing && (
                            <Badge variant="outline" className="text-xs">
                              {t("compensation.rates.editing")}
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2 self-end sm:self-auto">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleOpenEditDialog(rate.id)}
                            disabled={isUpdating || isDeleting || isEditing}
                            className="text-xs sm:text-sm"
                            aria-label={t("compensation.rates.edit")}
                          >
                            <Edit className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                            <span className="hidden sm:inline">{t("compensation.rates.edit")}</span>
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(rate.id)}
                            disabled={isDeleting || isEditing}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="h-3 w-3 sm:h-4 sm:w-4" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-sm text-muted-foreground p-4 border rounded-lg text-center">
                  {t("compensation.rates.noRates")}
                </div>
              )}
            </div>

            {/* Add/Edit Rate Form */}
            <div className="border-t pt-4" data-rate-form>
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold">
                  {editingRate ? t("compensation.rates.editRate") : t("compensation.rates.addNewRate")}
                </h3>
                {editingRate && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setEditingRate(null);
                      setFormData({
                        category_id: "",
                        rate_type: "hourly",
                        rate_value: "",
                      });
                    }}
                  >
                    <X className="h-4 w-4 mr-1" />
                    {t("compensation.rates.cancelEdit")}
                  </Button>
                )}
              </div>
              <div className="space-y-4">
                {!editingRate && (noCategoriesExist || allCategoriesSet) ? (
                  <div className="flex flex-col items-center justify-center p-6 border border-dashed rounded-lg bg-muted/30 text-center">
                    <CheckCircle className={`h-8 w-8 mb-2 ${noCategoriesExist ? "text-yellow-500" : "text-green-500"}`} />
                    <p className="text-sm font-medium text-foreground">
                      {noCategoriesExist
                        ? t("compensation.rates.noCategoriesConfigured")
                        : t("compensation.rates.allCategoriesSet")
                      }
                    </p>
                  </div>
                ) : (
                  <>
                    <div>
                      <label htmlFor="rate-category" className="text-sm font-medium mb-2 block">{t("compensation.rates.category")}</label>
                      <Select
                        value={formData.category_id}
                        onValueChange={(value) =>
                          setFormData((prev) => ({ ...prev, category_id: value }))
                        }
                        disabled={!!editingRate}
                      >
                        <SelectTrigger id="rate-category">
                          <SelectValue placeholder={t("compensation.rates.selectCategory")} />
                        </SelectTrigger>
                        <SelectContent>
                          {editingRate
                            ? categories
                              .filter((cat) => cat.id === formData.category_id)
                              .map((category) => (
                                <SelectItem key={category.id} value={category.id} textValue={category.name}>
                                  <div className="flex items-center gap-2">
                                    <div
                                      className="w-3 h-3 rounded-full"
                                      style={{ backgroundColor: category.color }}
                                    />
                                    {category.name}
                                  </div>
                                </SelectItem>
                              ))
                            : availableCategories.map((category) => (
                              <SelectItem key={category.id} value={category.id} textValue={category.name}>
                                <div className="flex items-center gap-2">
                                  <div
                                    className="w-3 h-3 rounded-full"
                                    style={{ backgroundColor: category.color }}
                                  />
                                  {category.name}
                                </div>
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <label htmlFor="rate-value" className="text-sm font-medium mb-2 block">
                        {t("compensation.rates.rateValueEuro")}
                      </label>
                      <Input
                        id="rate-value"
                        type="number"
                        step="0.01"
                        min="0"
                        value={formData.rate_value}
                        onChange={(e) =>
                          setFormData((prev) => ({ ...prev, rate_value: e.target.value }))
                        }
                        placeholder={t("compensation.rates.placeholderEuro")}
                      />
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2 sm:gap-0">
            <Button variant="outline" onClick={handleCloseDialog} disabled={isCreating || isUpdating} className="w-full sm:w-auto">
              {t("compensation.rates.close")}
            </Button>
            {(!noCategoriesExist && (!allCategoriesSet || editingRate)) && (
              <Button
                onClick={handleSubmit}
                disabled={
                  isCreating ||
                  isUpdating ||
                  !formData.category_id ||
                  !formData.rate_value ||
                  (!editingRate && !effectiveSchoolId)
                }
                className="w-full sm:w-auto"
              >
                {isCreating || isUpdating ? (
                  <>{t("compensation.rates.loading")}</>
                ) : editingRate ? (
                  <>{t("compensation.rates.updateRate")}</>
                ) : (
                  <>{t("compensation.rates.addRate")}</>
                )}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ManageCompensationDialog;

