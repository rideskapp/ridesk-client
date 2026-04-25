import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { lessonCreationApi } from "@/services/lessonCreation";
import { useQuery } from "@tanstack/react-query";

interface EditLessonDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lesson: any;
  onSave: (lessonId: string, data: { lessonStatusId?: string; duration?: number; time?: string }) => void;
  canEdit?: boolean;
}

const EditLessonDialog: React.FC<EditLessonDialogProps> = ({
  open,
  onOpenChange,
  lesson,
  onSave,
  canEdit = true,
}) => {
  const { t } = useTranslation();
  const [lessonStatusId, setLessonStatusId] = useState<string>("");
  const [duration, setDuration] = useState<string>("");
  const [time, setTime] = useState<string>("");
  const [isSaving, setIsSaving] = useState(false);

  const { data: lessonStatuses = [], isLoading: lessonStatusesLoading } = useQuery({
    queryKey: ["lesson-statuses"],
    queryFn: () => lessonCreationApi.getLessonStatuses(),
    staleTime: 300000,
  });

  useEffect(() => {
    if (lesson && open) {
      setLessonStatusId(lesson.lesson_status_id || "__none__");
      setDuration(String(lesson.duration || ""));
      setTime(String(lesson.time || "").slice(0, 5));
    }
  }, [lesson, open]);

  const handleSave = async () => {
    if (!lesson?.id) return;

    setIsSaving(true);
    try {
      const lessonStatusIdToSave = lessonStatusId === "__none__" ? undefined : lessonStatusId;

      await onSave(lesson.id, {
        lessonStatusId: lessonStatusIdToSave,
        duration: duration ? Number(duration) : undefined,
        time: time || undefined,
      });
      onOpenChange(false);
    } catch (error: any) {
      console.error("Error updating lesson:", error);
      // Parent containers already translate and show toast errors for save failures.
      // Avoid duplicate notifications from both parent and dialog.
    } finally {
      setIsSaving(false);
    }
  };

  if (!lesson) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t("lessons.editLesson", { defaultValue: "Edit Lesson" })}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Lesson Info */}
          <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
            <div className="text-sm text-gray-600 space-y-1">
              <div>
                <span className="font-medium">{t("lessons.date")}:</span> {lesson.date}
              </div>
              <div>
                <span className="font-medium">{t("lessons.time")}:</span> {lesson.time} ({lesson.duration} {t("common.minutes")})
              </div>
              {lesson.student_first_name && lesson.student_last_name && (
                <div>
                  <span className="font-medium">{t("lessons.student")}:</span> {lesson.student_first_name} {lesson.student_last_name}
                </div>
              )}
            </div>
          </div>

          {/* Lesson Status */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t("lessons.lessonStatus", { defaultValue: "Lesson Status" })}
            </label>
            <Select
              value={lessonStatusId || "__none__"}
              onValueChange={(value) => setLessonStatusId(value)}
              disabled={!canEdit}
            >
              <SelectTrigger>
                <SelectValue placeholder={t("calendar.createLessonDialog.selectLessonStatus")} />
              </SelectTrigger>
              <SelectContent>
                {lessonStatusesLoading ? (
                  <SelectItem value="__loading__" disabled>
                    {t("common.loading")}
                  </SelectItem>
                ) : (
                  <>
                    <SelectItem value="__none__">
                      {t("common.none", { defaultValue: "None" })}
                    </SelectItem>
                    {lessonStatuses.map((status) => (
                      <SelectItem key={status.id} value={status.id} textValue={status.display_name || status.name}>
                        <div className="flex items-center gap-2">
                          <Badge
                            style={{
                              backgroundColor: status.color,
                              color: "white",
                            }}
                            className="text-xs"
                          >
                            {status.display_name || status.name}
                          </Badge>
                        </div>
                      </SelectItem>
                    ))}
                  </>
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Duration */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t("lessons.duration", { defaultValue: "Duration (minutes)" })}
            </label>
            <input
              type="number"
              min={15}
              step={15}
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
              disabled={!canEdit}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t("lessons.time", { defaultValue: "Time" })}
            </label>
            <input
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
              disabled={!canEdit}
            />
          </div>

          {!canEdit && (
            <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-md p-2">
              {t("lessons.instructorEditNotAuthorized")}
            </p>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSaving}
            >
              {t("common.cancel")}
            </Button>
            <Button
              onClick={handleSave}
              disabled={isSaving || !canEdit}
              className="bg-pink-600 hover:bg-pink-700 text-white"
            >
              {isSaving ? t("common.saving") : t("common.save")}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default EditLessonDialog;

