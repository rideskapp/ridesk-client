//compensation badge (lesson details page) shows compensation amount for an instructor

import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Eye } from "lucide-react";
import { useInstructorCompensation } from "@/hooks/useInstructorCompensation";
import { CompensationBreakdownDialog } from "@/components/CompensationBreakdownDialog";
import { useSchoolSettings } from "@/hooks/useSchoolSettings";

interface InstructorCompensationBadgeProps {
  instructorId: string;
  categoryId: string;
  durationHours: number;
  className?: string;
  showIcon?: boolean;
  productId?: string;
  productName?: string;
}

export const InstructorCompensationBadge: React.FC<InstructorCompensationBadgeProps> = ({
  instructorId,
  categoryId,
  durationHours,
  className,
  productId,
  productName,
}) => {
  const { t } = useTranslation();
  const { compensation, loading } = useInstructorCompensation(
    instructorId,
    categoryId,
    durationHours,
  );
  const [showBreakdown, setShowBreakdown] = useState(false);
  const { settings: schoolSettings } = useSchoolSettings();

  if (loading) {
    return (
      <Badge variant="outline" className={className}>
        <span className="text-xs">...</span>
      </Badge>
    );
  }

  if (compensation === null || compensation === 0) {
    return null;
  }

  const formattedAmount = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: schoolSettings?.defaultCurrency || "EUR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(compensation);

  return (
    <>
      <div className={`flex items-center gap-2 ${className || ""}`}>
        <span className="text-sm font-medium text-green-600">{formattedAmount}</span>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 w-6 p-0 hover:bg-gray-100"
          onClick={(e) => {
            e.stopPropagation();
            setShowBreakdown(true);
          }}
          title={t("compensation.viewBreakdown")}
        >
          <Eye className="h-3.5 w-3.5" />
        </Button>
      </div>
      <CompensationBreakdownDialog
        open={showBreakdown}
        onOpenChange={setShowBreakdown}
        instructorId={instructorId}
        categoryId={categoryId}
        durationHours={durationHours}
        productId={productId}
        productName={productName}
      />
    </>
  );
};

