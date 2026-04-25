import React from "react";
import { useTranslation } from "react-i18next";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { SimpleAvailabilityManager } from "./SimpleAvailabilityManager";

interface NewAvailabilityManagerProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  instructorId: string;
  instructorName: string;
  schoolId?: string;
  initialDate?: Date;
}

export const NewAvailabilityManager: React.FC<NewAvailabilityManagerProps> = ({
  isOpen,
  onOpenChange,
  instructorId,
  instructorName,
  schoolId,
  initialDate,
}) => {
  const { t } = useTranslation();
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] sm:max-h-[95vh] overflow-y-auto overflow-x-hidden w-[95vw] sm:w-full">
        <DialogHeader>
          <DialogTitle className="text-lg sm:text-xl">
            {t("availability.simpleManager.dialogTitle")}
          </DialogTitle>
          <DialogDescription className="text-sm">
            {t("availability.simpleManager.dialogDescription", { name: instructorName })}
          </DialogDescription>
        </DialogHeader>
        <SimpleAvailabilityManager
          instructorId={instructorId}
          instructorName={instructorName}
          schoolId={schoolId}
          initialDate={initialDate}
          onClose={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
};
