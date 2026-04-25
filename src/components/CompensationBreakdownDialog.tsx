//compensation breakdown dialog when clicked lesson details page eye icon

import React from "react";
import { useTranslation } from "react-i18next";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DollarSign,
  Package,
  Calculator,
  BarChart3,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useAuthStore } from "@/store/auth";
import { useSchoolSelectionStore } from "@/store/schoolSelection";
import { UserRole } from "@/types";
import { useSchoolSettings } from "@/hooks/useSchoolSettings";

interface CompensationBreakdownDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  instructorId: string;
  categoryId: string;
  durationHours: number;
  productId?: string;
  productName?: string;
}

interface CompensationBreakdown {
  amount: number;
  hourlyRate: number;
  hours: number;
  rateType: "hourly" | "lesson" | "percentage";
  formula: string;
  instructorId: string;
  productId?: string;
  productName?: string;
  categoryId: string;
  categoryName?: string;
  rateId?: string;
  isVisible?: boolean;
  isCalculated?: boolean;
}

export const CompensationBreakdownDialog: React.FC<CompensationBreakdownDialogProps> = ({
  open,
  onOpenChange,
  instructorId,
  categoryId,
  durationHours,
  productId,
  productName,
}) => {
  const { t, i18n } = useTranslation();
  const { user } = useAuthStore();
  const { selectedSchoolId } = useSchoolSelectionStore();

  const effectiveSchoolId =
    user?.role === UserRole.SUPER_ADMIN ? (selectedSchoolId ?? undefined) : user?.schoolId;

  const { settings: schoolSettings } = useSchoolSettings(effectiveSchoolId);

  const {
    data: breakdown,
    
  } = useQuery<CompensationBreakdown | null>({
    queryKey: ["compensation-breakdown", instructorId, categoryId, durationHours, productId],
    queryFn: async () => {
      const params = new URLSearchParams({
        instructorId,
        categoryId,
        duration: durationHours.toString(),
      });
      if (productId) params.append("productId", productId);
      if (productName) params.append("productName", productName);
      if (effectiveSchoolId) params.append("schoolId", effectiveSchoolId);

      const response = await api.get(`/compensation/lesson/breakdown?${params.toString()}`);
      return response.data.data;
    },
    enabled: open && !!instructorId && !!categoryId && durationHours > 0,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  if (!breakdown) {
    return null;
  }

  const formattedAmount = new Intl.NumberFormat(i18n.language === "it" ? "it-IT" : "en-US", {
    style: "currency",
    currency: schoolSettings?.defaultCurrency || "EUR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(breakdown.amount);

  const formattedHourlyRate = new Intl.NumberFormat(i18n.language === "it" ? "it-IT" : "en-US", {
    style: "currency",
    currency: schoolSettings?.defaultCurrency || "EUR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(breakdown.hourlyRate);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-2xl">
            <DollarSign className="h-6 w-6" />
            {t("compensation.title", { defaultValue: "Instructor Compensation" })}
          </DialogTitle>
          <DialogDescription>
            {t("compensation.breakdown.description", {
              defaultValue: "Detailed breakdown of compensation calculation",
            })}
          </DialogDescription>
        </DialogHeader>

        {/* Main Amount Display */}
        <div className="text-center py-4">
          <div className="text-4xl font-bold text-green-600">{formattedAmount}</div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          {/* Input Data Card */}
          <Card className="border-2 border-orange-200 bg-orange-50/30">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                {t("compensation.breakdown.inputData", { defaultValue: "Input Data" })}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div>
                <label className="text-xs text-gray-600">
                  {t("compensation.breakdown.instructorId", { defaultValue: "Instructor ID" })}
                </label>
                <p className="text-sm font-mono bg-white p-2 rounded border">{breakdown.instructorId}</p>
              </div>
              {breakdown.productId && (
                <div>
                  <label className="text-xs text-gray-600">
                    {t("compensation.breakdown.productId", { defaultValue: "Product ID" })}
                  </label>
                  <p className="text-sm font-mono bg-white p-2 rounded border">{breakdown.productId}</p>
                </div>
              )}
              <div>
                <label className="text-xs text-gray-600">
                  {t("compensation.breakdown.duration", { defaultValue: "Duration" })}
                </label>
                <p className="text-sm font-medium bg-white p-2 rounded border">
                  {breakdown.hours} {t("compensation.breakdown.hours", { defaultValue: "hours" })}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Product and Category Card */}
          <Card className="border-2 border-blue-200 bg-blue-50/30">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Package className="h-4 w-4" />
                {t("compensation.breakdown.productCategory", {
                  defaultValue: "Product and Category",
                })}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {breakdown.productName && (
                <div>
                  <label className="text-xs text-gray-600">
                    {t("compensation.breakdown.product", { defaultValue: "Product" })}
                  </label>
                  <p className="text-sm font-medium bg-white p-2 rounded border">
                    {breakdown.productName}
                  </p>
                  {breakdown.productId && (
                    <p className="text-xs text-gray-500 mt-1">
                      {t("compensation.breakdown.categoryId", { defaultValue: "Category ID" })}:{" "}
                      {breakdown.categoryId}
                    </p>
                  )}
                </div>
              )}
              <div>
                <label className="text-xs text-gray-600">
                  {t("compensation.breakdown.category", { defaultValue: "Category" })}
                </label>
                <p className="text-sm font-medium bg-white p-2 rounded border">
                  {breakdown.categoryName || t("compensation.unknown", { defaultValue: "Unknown" })}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {t("compensation.breakdown.id", { defaultValue: "ID" })}: {breakdown.categoryId}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Instructor Rate Card */}
          <Card className="border-2 border-green-200 bg-green-50/30">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                {t("compensation.breakdown.instructorRate", {
                  defaultValue: "Instructor Rate",
                })}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div>
                <p className="text-lg font-bold text-green-700">
                  {breakdown.rateType === "hourly"
                    ? `${formattedHourlyRate}/${t("compensation.breakdown.perHour", {
                        defaultValue: "per hour",
                      })}`
                    : breakdown.rateType === "lesson"
                      ? `${formattedAmount} ${t("compensation.breakdown.perLesson", {
                          defaultValue: "per lesson",
                        })}`
                      : `${breakdown.hourlyRate}%`}
                </p>
                {breakdown.rateId && (
                  <p className="text-xs text-gray-500 mt-1">
                    {t("compensation.breakdown.rateId", { defaultValue: "Rate ID" })}:{" "}
                    {breakdown.rateId}
                  </p>
                )}
                <p className="text-xs text-gray-600 mt-2">
                  {t("compensation.breakdown.category", { defaultValue: "Category" })}:{" "}
                  {breakdown.categoryName || t("compensation.unknown", { defaultValue: "Unknown" })}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Calculation Card */}
          <Card className="border-2 border-purple-200 bg-purple-50/30">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Calculator className="h-4 w-4" />
                {t("compensation.breakdown.calculation", { defaultValue: "Calculation" })}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {breakdown.rateType === "hourly" && (
                <>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-600">
                      {t("compensation.breakdown.hourlyRate", {
                        defaultValue: "Hourly Rate",
                      })}
                    </span>
                    <span className="text-sm font-medium">{formattedHourlyRate}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-600">
                      {t("compensation.breakdown.hours", { defaultValue: "Hours" })}
                    </span>
                    <span className="text-sm font-medium">{breakdown.hours}</span>
                  </div>
                  <div className="border-t pt-2 mt-2">
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-gray-600">
                        {t("compensation.breakdown.formula", { defaultValue: "Formula" })}
                      </span>
                      <span className="text-sm font-mono">{breakdown.formula}</span>
                    </div>
                  </div>
                  <div className="border-t pt-2 mt-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-bold">
                        {t("compensation.breakdown.total", { defaultValue: "Total" })}
                      </span>
                      <span className="text-lg font-bold text-green-600">{formattedAmount}</span>
                    </div>
                  </div>
                </>
              )}
              {breakdown.rateType === "lesson" && (
                <div>
                  <p className="text-sm text-gray-600">{breakdown.formula}</p>
                  <p className="text-lg font-bold text-green-600 mt-2">{formattedAmount}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
};

