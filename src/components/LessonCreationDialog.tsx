import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useErrorTranslation } from "@/hooks/useErrorTranslation";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Clock, CheckCircle, AlertCircle, X } from "lucide-react";
import {
  lessonCreationApi,
  LessonCreationData,
} from "@/services/lessonCreation";
import { useDisciplines } from "@/hooks/useDisciplines";
import { toast } from "react-hot-toast";
import { useAuthStore } from "@/store/auth";
import { useQuery } from "@tanstack/react-query";
import { schoolsApi } from "@/services/schools";
import {
  GLOBAL_TIME_INCREMENT_MINUTES,
  formatDateLocal,
} from "@/utils/dateHelpers";

interface LessonCreationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedSlot?: {
    time: string;
    instructorId: string;
    date: string;
    duration: number;
  };
  currentDate: Date;
  instructors: Array<{
    id: string;
    firstName: string;
    lastName: string;
    isActive: boolean;
  }>;
  students: Array<{
    id: string;
    firstName: string;
    lastName: string;
    isActive?: boolean;
  }>;
  onCreateLesson: (lessonData: LessonCreationData) => Promise<void>;
}

const LessonCreationDialog: React.FC<LessonCreationDialogProps> = ({
  open,
  onOpenChange,
  selectedSlot,
  currentDate,
  instructors,
  students,
  onCreateLesson,
}) => {
  const { t } = useTranslation();
  const { getTranslatedError } = useErrorTranslation();
  const { disciplines } = useDisciplines();
  const { user } = useAuthStore();

  const { data: school } = useQuery({
    queryKey: ["school", user?.schoolId],
    queryFn: () => schoolsApi.getById(user!.schoolId!),
    enabled: !!user?.schoolId,
  });


  const { data: lessonStatuses = [], isLoading: lessonStatusesLoading } = useQuery({
    queryKey: ["lesson-statuses"],
    queryFn: () => lessonCreationApi.getLessonStatuses(),
    staleTime: 300000,
  });

  const [formData, setFormData] = useState<LessonCreationData>({
    instructorId: selectedSlot?.instructorId || "",
    studentId: "",
    date: selectedSlot?.date || formatDateLocal(currentDate),
    time: selectedSlot?.time || "",
    duration: Math.max(selectedSlot?.duration || 0, 60),
    discipline: disciplines[0]?.slug || "",
    level: "beginner",
    notes: "",
  });

  const [isInstructorAvailable, setIsInstructorAvailable] = useState<
    boolean | null
  >(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Reset form when dialog opens/closes
  useEffect(() => {
    if (open) {
      let instructorId = selectedSlot?.instructorId || "";

      // If no instructor is preselected and there's only one instructor, preselect them
      if (!instructorId && instructors.length === 1) {
        instructorId = instructors[0].id;
      }

      const increment = GLOBAL_TIME_INCREMENT_MINUTES;
      const initialDuration =
        selectedSlot?.duration && selectedSlot.duration > 0
          ? Math.max(selectedSlot.duration, 60)
          : Math.max(increment, 60);

      setFormData({
        instructorId,
        studentId: "",
        date: selectedSlot?.date || formatDateLocal(currentDate),
        time: selectedSlot?.time || "",
        duration: initialDuration,
        discipline: disciplines[0]?.slug || "",
        level: "beginner",
        notes: "",
        lessonStatusId: school?.defaultLessonStatusId || undefined,
      });
      setError("");
      setIsInstructorAvailable(null);

      // Debug logging
      console.log("CreateLessonDialog opened with:", {
        selectedSlot,
        instructors: instructors.length,
        students: students.length,
        schoolDefaults: {
          lessonStatusId: school?.defaultLessonStatusId,
        },
      });
    }
  }, [
    open,
    selectedSlot,
    instructors,
    currentDate,
    school,
    disciplines,
  ]);

  // Check instructor availability when form data changes
  useEffect(() => {
    const checkAvailability = async () => {
      if (
        formData.instructorId &&
        formData.date &&
        formData.time &&
        formData.duration
      ) {
        try {
          const startTime = new Date(`2000-01-01T${formData.time}`);
          const endTime = new Date(
            startTime.getTime() + formData.duration * 60000,
          );
          const timeEnd = endTime.toTimeString().slice(0, 5);

          const result = await lessonCreationApi.checkAvailability(
            formData.instructorId,
            formData.date,
            formData.time,
            timeEnd,
          );
          setIsInstructorAvailable(result.available);
        } catch (err) {
          setIsInstructorAvailable(false);
        }
      }
    };

    checkAvailability();
  }, [formData.instructorId, formData.date, formData.time, formData.duration]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.instructorId || !formData.studentId) {
      setError(t("calendar.createLessonDialog.selectBoth"));
      return;
    }

    setLoading(true);
    setError("");

    try {
      await onCreateLesson(formData);
      onOpenChange(false);
    } catch (err: any) {
      // Handle lesson conflicts with toast
      if (err?.response?.data?.error?.includes("already has a lesson scheduled") ||
        err?.response?.data?.error?.includes("Instructor already has a lesson")) {
        toast.error(getTranslatedError(err) || t("lessons.instructorNotAvailable"));
        onOpenChange(false); // Close the dialog
        return;
      }

      if (err?.response?.data?.error?.includes("School is closed") ||
        err?.response?.status === 409 && err?.response?.data?.error?.includes("closed")) {
        toast.error(getTranslatedError(err) || t("lessons.schoolClosedError"));
        onOpenChange(false);
        return;
      }

      toast.error(getTranslatedError(err) || t("common.error"));
      onOpenChange(false);
    } finally {
      setLoading(false);
    }
  };

  const updateFormData = (field: keyof LessonCreationData, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const selectedInstructor = instructors.find(
    (i) => i.id === formData.instructorId,
  );
  const selectedStudent = students.find((s) => s.id === formData.studentId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader className="space-y-3">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-2xl font-bold text-gray-900">
              {t("calendar.createLessonDialog.title")}
            </DialogTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="h-8 w-8 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-sm text-gray-600">
            {t("calendar.createLessonDialog.subtitle", {
              time: selectedSlot?.time,
              date: currentDate.toLocaleDateString(),
            })}
          </p>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Time Slot Display */}
          <Card className="bg-gradient-to-r from-pink-50 to-rose-50 border-pink-200">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-pink-100 rounded-full flex items-center justify-center">
                  <Clock className="h-5 w-5 text-pink-600" />
                </div>
                <div className="flex-1">
                  <div className="font-semibold text-pink-900 text-lg">
                    {formData.time} -{" "}
                    {(() => {
                      const startTime = new Date(`2000-01-01T${formData.time}`);
                      const endTime = new Date(
                        startTime.getTime() + formData.duration * 60000,
                      );
                      return endTime.toTimeString().slice(0, 5);
                    })()}
                  </div>
                  <div className="text-sm text-pink-700">
                    {t("calendar.createLessonDialog.duration")}:{" "}
                    {formData.duration} {t("common.minutes")}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-gray-500">Date</div>
                  <div className="font-medium text-gray-900">
                    {currentDate.toLocaleDateString()}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Error Display */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-red-600" />
              <span className="text-sm text-red-700">{error}</span>
            </div>
          )}

          {/* Form Fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Instructor Selection */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                {t("calendar.createLessonDialog.instructor")}{" "}
                <span className="text-red-500">*</span>
              </label>
              <Select
                value={formData.instructorId}
                onValueChange={(value) => updateFormData("instructorId", value)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue
                    placeholder={t(
                      "calendar.createLessonDialog.selectInstructor",
                    )}
                  />
                </SelectTrigger>
                <SelectContent>
                  {instructors.length === 0 ? (
                    <SelectItem value="" disabled>
                      <div className="p-2 text-sm text-gray-500">
                        {t("calendar.createLessonDialog.noInstructors")}
                      </div>
                    </SelectItem>
                  ) : (
                    instructors.map((instructor) => (
                      <SelectItem key={instructor.id} value={instructor.id}>
                        {instructor.firstName} {instructor.lastName}
                        {!instructor.isActive && ` ${t("instructors.inactiveParentheses")}`}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              {selectedInstructor && (
                <div className="text-xs text-gray-600 mt-1">
                  Selected: {selectedInstructor.firstName}{" "}
                  {selectedInstructor.lastName}
                </div>
              )}
            </div>

            {/* Student Selection */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                {t("calendar.createLessonDialog.student")}{" "}
                <span className="text-red-500">*</span>
              </label>
              <Select
                value={formData.studentId}
                onValueChange={(value) => updateFormData("studentId", value)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue
                    placeholder={t("calendar.createLessonDialog.selectStudent")}
                  />
                </SelectTrigger>
                <SelectContent>
                  {students.length === 0 ? (
                    <SelectItem value="" disabled>
                      <div className="p-2 text-sm text-gray-500">
                        {t("calendar.createLessonDialog.noStudents")}
                      </div>
                    </SelectItem>
                  ) : (
                    students
                      // .filter((student) => student.isActive !== false)
                      .map((student) => (
                        <SelectItem key={student.id} value={student.id}>
                          {student.firstName} {student.lastName}
                        </SelectItem>
                      ))
                  )}
                </SelectContent>
              </Select>
              {selectedStudent && (
                <div className="text-xs text-gray-600 mt-1">
                  Selected: {selectedStudent.firstName}{" "}
                  {selectedStudent.lastName}
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Duration */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                {t("calendar.createLessonDialog.duration")}
              </label>
              <Select
                value={formData.duration.toString()}
                onValueChange={(value) => updateFormData("duration", Number(value))}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select duration" />
                </SelectTrigger>
                <SelectContent>
                  {(() => {
                    const increment = GLOBAL_TIME_INCREMENT_MINUTES;
                    const options: number[] = [];
                    const maxMinutes = 180;
                    for (
                      let d = increment;
                      d <= maxMinutes;
                      d += increment
                    ) {
                      options.push(d);
                    }
                    return options.map((d) => (
                      <SelectItem key={d} value={String(d)}>
                        {d} {t("common.minutes")}
                      </SelectItem>
                    ));
                  })()}
                </SelectContent>
              </Select>
            </div>

            {/* Discipline */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                {t("calendar.createLessonDialog.discipline")}
              </label>
              <Select
                value={formData.discipline}
                onValueChange={(value) => updateFormData("discipline", value)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue
                    placeholder={t(
                      "calendar.createLessonDialog.selectDiscipline",
                    )}
                  />
                </SelectTrigger>
                <SelectContent>
                  {disciplines.map((discipline) => (
                    <SelectItem key={discipline.id} value={discipline.slug} textValue={discipline.display_name}>
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: discipline.color || "#3B82F6" }}
                        ></div>
                        {discipline.display_name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Level */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                {t("calendar.createLessonDialog.level")}
              </label>
              <Select
                value={formData.level}
                onValueChange={(value) => updateFormData("level", value)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue
                    placeholder={t("calendar.createLessonDialog.selectLevel")}
                  />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="beginner">
                    {t("calendar.createLessonDialog.beginner")}
                  </SelectItem>
                  <SelectItem value="intermediate">
                    {t("calendar.createLessonDialog.intermediate")}
                  </SelectItem>
                  <SelectItem value="advanced">
                    {t("calendar.createLessonDialog.advanced")}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              {t("calendar.createLessonDialog.notes")}
            </label>
            <Input
              value={formData.notes}
              onChange={(e) => updateFormData("notes", e.target.value)}
              placeholder={t("calendar.createLessonDialog.notesPlaceholder")}
              className="w-full"
            />
          </div>

          {/* Status Fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Lesson Status */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                {t("calendar.createLessonDialog.lessonStatus")}
              </label>
              <Select
                value={formData.lessonStatusId || ""}
                onValueChange={(value) => updateFormData("lessonStatusId", value || undefined)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue
                    placeholder={t("calendar.createLessonDialog.selectLessonStatus")}
                  />
                </SelectTrigger>
                <SelectContent>
                  {lessonStatusesLoading ? (
                    <SelectItem value="" disabled>
                      {t("common.loading")}
                    </SelectItem>
                  ) : (
                    lessonStatuses.map((status) => (
                      <SelectItem key={status.id} value={status.id}>
                        {t(`systemConfig.statuses.lesson.${status.name}`, { defaultValue: (status as any).display_name || status.name })}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

          </div>

          {/* Availability Status */}
          {isInstructorAvailable !== null && (
            <div
              className={`p-3 rounded-lg flex items-center gap-2 ${isInstructorAvailable
                  ? "bg-green-50 text-green-700 border border-green-200"
                  : "bg-red-50 text-red-700 border border-red-200"
                }`}
            >
              {isInstructorAvailable ? (
                <CheckCircle className="h-4 w-4" />
              ) : (
                <AlertCircle className="h-4 w-4" />
              )}
              <span className="text-sm font-medium">
                {isInstructorAvailable
                  ? t("calendar.createLessonDialog.instructorAvailable")
                  : t("calendar.createLessonDialog.instructorNotAvailable")}
              </span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-6 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="px-6"
            >
              {t("calendar.createLessonDialog.cancel")}
            </Button>
            <Button
              type="submit"
              disabled={
                !formData.instructorId || !formData.studentId || loading
              }
              className="px-6 bg-pink-600 hover:bg-pink-700 text-white"
            >
              {loading
                ? t("calendar.createLessonDialog.creating")
                : t("calendar.createLessonDialog.create")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default LessonCreationDialog;
