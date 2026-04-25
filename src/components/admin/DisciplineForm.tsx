import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
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
import { Discipline } from "@/services/disciplines";
import { ColorPalette, DEFAULT_COLOR } from "@/components/ui/ColorPalette";

interface DisciplineFormProps {
  discipline?: Discipline | null;
  open: boolean;
  onClose: () => void;
  onSave: (discipline: Partial<Discipline>) => Promise<void>;
  isLoading?: boolean;
}

export const DisciplineForm: React.FC<DisciplineFormProps> = ({
  discipline,
  open,
  onClose,
  onSave,
  isLoading = false,
}) => {
  const { t } = useTranslation();
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [color, setColor] = useState(DEFAULT_COLOR);
  const [sortOrder, setSortOrder] = useState<number | string>(0);
  const [isActive, setIsActive] = useState(true);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const isEditing = !!discipline;

  useEffect(() => {
    if (discipline) {
      setName(discipline.name || "");
      setSlug(discipline.slug || "");
      setColor(discipline.color || DEFAULT_COLOR);
      setSortOrder(discipline.sort_order || 0);
      setIsActive(discipline.is_active);
    } else {
      setName("");
      setSlug("");
      setColor(DEFAULT_COLOR);
      setSortOrder(0);
      setIsActive(true);
    }
    setErrors({});
  }, [discipline, open]);

  const generateSlug = (text: string): string => {
    return text
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-+|-+$/g, "");
  };

  const handleNameChange = (value: string) => {
    setName(value);
    setSlug(generateSlug(value));
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!name.trim()) {
      newErrors.name = t("common.required");
    }
    if (!slug.trim()) {
      newErrors.slug = t("common.required");
    }
    if (color && !/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(color)) {
      newErrors.color = "Invalid hex color code";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) {
      return;
    }

    try {
      await onSave({
        name,
        slug,
        color,
        is_active: isActive,
        sort_order: typeof sortOrder === "number" ? sortOrder : parseInt(String(sortOrder)) || 0,
      });
    } catch (error) {
        //err handling done in parent component
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? t("disciplines.editDiscipline") : t("disciplines.createDiscipline")}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? t("disciplines.updateDescription")
              : t("disciplines.createDescription")}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t("disciplines.name")} <span className="text-red-500">*</span>
            </label>
            <Input
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="e.g., kitesurf"
              disabled={isLoading}
            />
            {errors.name && (
              <p className="text-red-500 text-xs mt-1">{errors.name}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t("disciplines.sortOrder")}
            </label>
            <Input
              type="number"
              value={sortOrder || ""}
              onChange={(e) => {
                const value = e.target.value;
                setSortOrder(value === "" ? "" : (isNaN(parseInt(value)) ? (typeof sortOrder === "number" ? sortOrder : 0) : parseInt(value)));
              }}
              onBlur={(e) => {
                const value = e.target.value;
                setSortOrder(value === "" ? 0 : (isNaN(parseInt(value)) ? 0 : parseInt(value)));
              }}
              min={0}
              disabled={isLoading}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t("disciplines.color")} <span className="text-red-500">*</span>
            </label>
            <ColorPalette
              selectedColor={color}
              onColorSelect={(selectedColor) => setColor(selectedColor)}
              disabled={isLoading}
            />
            {errors.color && (
              <p className="text-red-500 text-xs mt-1">{errors.color}</p>
            )}
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="w-4 h-4 rounded border-gray-300 text-pink-600 focus:ring-pink-500"
              disabled={isLoading}
            />
            <label className="text-sm font-medium text-gray-700">
              {t("disciplines.active")}
            </label>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isLoading}
            >
              {t("common.cancel")}
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? t("common.saving") : t("common.save")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

