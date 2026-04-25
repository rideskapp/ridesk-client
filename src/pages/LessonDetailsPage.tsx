import React, { useState, useMemo } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useQueryClient } from "@tanstack/react-query";
import { useLessonDetails } from "@/hooks/useLessons";
import { lessonsApi } from "@/services/lessons";
import { useDisciplines } from "@/hooks/useDisciplines";
import { useStudentLevels } from "@/hooks/useStudentLevels";
import { useProductCategories } from "@/hooks/useProductCategories";
import { useAuthStore } from "@/store/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  Edit,
  Trash2,
  Clock,
  User,
  Mail,
  Phone,
  MessageCircle,
  Calendar as CalendarIcon,
  CreditCard,
  Users,
  Award,
  Building2,
} from "lucide-react";
import { toast } from "react-hot-toast";
import { useErrorTranslation } from "@/hooks/useErrorTranslation";
import EditLessonDialog from "@/components/EditLessonDialog";
import { InstructorCompensationBadge } from "@/components/InstructorCompensationBadge";
import { useCompensationMode } from "@/hooks/useCompensationMode";
import StudentFormViewModal from "@/components/students/StudentFormViewModal";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useSchoolSettings } from "@/hooks/useSchoolSettings";
import { formatCurrency } from "@/lib/utils";
import { useInstructorLessonPermission } from "@/hooks/useInstructorLessonPermission";

const LessonDetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { t, i18n } = useTranslation();
  const { getTranslatedError } = useErrorTranslation();
  const queryClient = useQueryClient();
  const { lesson, isLoading, error, refetch } = useLessonDetails(id);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showStudentModal, setShowStudentModal] = useState(false);
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(
    null,
  );

  // fetch colors from system config
  const { user } = useAuthStore();
  const schoolId = user?.schoolId;
  const isInstructor = user?.role === "INSTRUCTOR";
  const permissionSchoolId = lesson?.school?.id || schoolId;
  const { canEditLessons: canInstructorEditLessons } =
    useInstructorLessonPermission(permissionSchoolId);
  const canEditLesson = !isInstructor || canInstructorEditLessons;

  const { colorMap: disciplineColorMap } = useDisciplines(
    isInstructor ? undefined : schoolId,
  );
  const { studentLevels } = useStudentLevels(
    isInstructor ? undefined : schoolId,
  );
  const { categories } = useProductCategories(
    isInstructor ? undefined : schoolId,
  );

  const { settings: schoolSettings } = useSchoolSettings(
    isInstructor ? undefined : schoolId,
  );
  const formatPrice = (amount: number) =>
    formatCurrency(
      amount,
      schoolSettings?.defaultCurrency || "EUR",
      "it-IT",
    );

  // Check compensation mode - for instructors, always enabled; for admins, check setting
  const { isEnabled: isCompensationEnabled } = useCompensationMode();

  const levelColorMap = useMemo(() => {
    if (isInstructor) return {};
    return studentLevels.reduce(
      (acc, level) => {
        acc[level.slug] = level.color;
        acc[level.name.toLowerCase()] = level.color;
        return acc;
      },
      {} as Record<string, string>,
    );
  }, [studentLevels, isInstructor]);

  const categoryColorMap = useMemo(() => {
    if (isInstructor) return {};
    return categories.reduce(
      (acc, category) => {
        acc[category.id] = category.color;
        return acc;
      },
      {} as Record<string, string>,
    );
  }, [categories, isInstructor]);

  // Get colors for lesson
  const disciplineColor = useMemo(() => {
    if (!lesson?.discipline) return "#6B7280";
    if (isInstructor) return "#6B7280";
    return disciplineColorMap[lesson.discipline] || "#6B7280";
  }, [lesson?.discipline, disciplineColorMap, isInstructor]);

  const levelColor = useMemo(() => {
    if (!lesson?.level) return "#6B7280";
    if (isInstructor) return "#6B7280";
    return (
      levelColorMap[lesson.level.toLowerCase()] ||
      levelColorMap[lesson.level] ||
      "#6B7280"
    );
  }, [lesson?.level, levelColorMap, isInstructor]);

  const categoryColor = useMemo(() => {
    if (!lesson?.product?.category?.id) return "#6B7280";
    if (isInstructor) {
      return lesson.product.category.color || "#6B7280";
    }
    return (
      categoryColorMap[lesson.product.category.id] ||
      lesson.product.category.color ||
      "#6B7280"
    );
  }, [lesson?.product?.category, categoryColorMap, isInstructor]);

  // date formatting
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString(i18n.language, {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  // Format date short (DD/MM/YYYY)
  const formatDateShort = (dateString: string) => {
    const date = new Date(dateString);
    const day = date.getDate().toString().padStart(2, "0");
    const month = (date.getMonth() + 1).toString().padStart(2, "0");
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  // Format time
  const formatTime = (timeString: string, durationMinutes: number) => {
    const [hours, minutes] = timeString.split(":");
    const startTime = `${hours}:${minutes}`;

    // Calculate end time
    const start = new Date(`2000-01-01T${timeString}`);
    const end = new Date(start.getTime() + durationMinutes * 60000);
    const endHours = String(end.getHours()).padStart(2, "0");
    const endMinutes = String(end.getMinutes()).padStart(2, "0");
    const endTime = `${endHours}:${endMinutes}`;

    const hoursDuration = Math.floor(durationMinutes / 60);
    const minutesDuration = durationMinutes % 60;
    const durationStr =
      hoursDuration > 0
        ? `${hoursDuration}h${minutesDuration > 0 ? ` ${minutesDuration}m` : ""}`
        : `${minutesDuration}m`;

    return `${startTime} - ${endTime} (${durationStr})`;
  };

  // Calculate progress for booking lessons
  const calculateProgress = (
    lessonIndex: number,
    bookingLessons:
      | Array<{ id: string; date: string; time: string; duration: number }>
      | undefined,
    totalMinutes: number,
  ) => {
    if (!bookingLessons || !totalMinutes) return { used: 0, percentage: 0 };

    let cumulativeMinutes = 0;
    for (let i = 0; i <= lessonIndex; i++) {
      cumulativeMinutes += bookingLessons[i]?.duration || 0;
    }

    const percentage =
      totalMinutes > 0 ? (cumulativeMinutes / totalMinutes) * 100 : 0;
    return {
      used: cumulativeMinutes,
      percentage: Math.min(percentage, 100),
    };
  };

  // Handle lesson update
  const handleUpdateLesson = async (
    lessonId: string,
    data: {
      lessonStatusId?: string;
      paymentStatusId?: string;
      duration?: number;
      time?: string;
    },
  ) => {
    try {
      if (!canEditLesson) {
        toast.error(t("lessons.instructorEditNotAuthorized"));
        return;
      }
      await lessonsApi.update(lessonId, data);
      await refetch();
      setShowEditDialog(false);
      toast.success(
        t("lessons.updated", { defaultValue: "Lesson updated successfully" }),
      );
    } catch (error: any) {
      console.error("Error updating lesson:", error);
      toast.error(
        getTranslatedError(error) ||
          t("lessons.updateFailed", {
            defaultValue: "Failed to update lesson",
          }),
      );
      throw error;
    }
  };

  // Get calendar route based on user role
  const getCalendarRoute = () => {
    return user?.role === "INSTRUCTOR" ? "/instructor-calendar" : "/calendar";
  };

  // Type guard to safely narrow location.state
  const isFromState = (obj: unknown): obj is { from?: string } => {
    if (typeof obj !== "object" || obj === null) return false;
    if (!("from" in obj)) return true; // object exists but no 'from' property is valid
    const from = (obj as { from?: unknown }).from;
    return from === undefined || typeof from === "string";
  };

  // Get back route based on where user came from
  const getBackRoute = () => {
    if (isFromState(location.state)) {
      const from = location.state.from;
      if (from === "dashboard") {
        return "/dashboard";
      }
    }
    return getCalendarRoute();
  };

  // Handle lesson delete
  const handleDeleteLesson = async () => {
    if (!lesson) return;

    try {
      await lessonsApi.delete(lesson.id);
      queryClient.invalidateQueries({ queryKey: ["lessons"] });
      toast.success(
        t("lessons.deleted", { defaultValue: "Lesson deleted successfully" }),
      );
      navigate(getCalendarRoute());
    } catch (error: any) {
      console.error("Error deleting lesson:", error);
      toast.error(
        getTranslatedError(error) ||
          t("lessons.deleteFailed", {
            defaultValue: "Failed to delete lesson",
          }),
      );
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        {/* Skeleton loading */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="h-9 w-20 bg-gray-200 rounded animate-pulse"></div>
            <div>
              <div className="h-8 w-64 bg-gray-200 rounded animate-pulse mb-2"></div>
              <div className="h-5 w-48 bg-gray-200 rounded animate-pulse"></div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-9 w-20 bg-gray-200 rounded animate-pulse"></div>
            <div className="h-9 w-20 bg-gray-200 rounded animate-pulse"></div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <div className="h-6 w-48 bg-gray-200 rounded animate-pulse"></div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="h-4 w-12 bg-gray-200 rounded animate-pulse mb-2"></div>
                    <div className="h-5 w-24 bg-gray-200 rounded animate-pulse"></div>
                  </div>
                  <div>
                    <div className="h-4 w-12 bg-gray-200 rounded animate-pulse mb-2"></div>
                    <div className="h-5 w-32 bg-gray-200 rounded animate-pulse"></div>
                  </div>
                  <div>
                    <div className="h-4 w-16 bg-gray-200 rounded animate-pulse mb-2"></div>
                    <div className="h-6 w-20 bg-gray-200 rounded animate-pulse"></div>
                  </div>
                  <div>
                    <div className="h-4 w-12 bg-gray-200 rounded animate-pulse mb-2"></div>
                    <div className="h-6 w-20 bg-gray-200 rounded animate-pulse"></div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="h-6 w-32 bg-gray-200 rounded animate-pulse"></div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="h-4 w-24 bg-gray-200 rounded animate-pulse mb-2"></div>
                  <div className="h-5 w-40 bg-gray-200 rounded animate-pulse"></div>
                </div>
                <div>
                  <div className="h-4 w-16 bg-gray-200 rounded animate-pulse mb-2"></div>
                  <div className="h-6 w-24 bg-gray-200 rounded animate-pulse"></div>
                </div>
                <div className="flex items-center justify-between">
                  <div className="h-4 w-12 bg-gray-200 rounded animate-pulse"></div>
                  <div className="h-6 w-16 bg-gray-200 rounded animate-pulse"></div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="h-6 w-40 bg-gray-200 rounded animate-pulse"></div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="h-5 w-56 bg-gray-200 rounded animate-pulse"></div>
                {[1, 2].map((i) => (
                  <div key={i} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="h-4 w-48 bg-gray-200 rounded animate-pulse"></div>
                      <div className="h-4 w-32 bg-gray-200 rounded animate-pulse"></div>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2.5">
                      <div
                        className="h-2.5 bg-gray-300 rounded-full animate-pulse"
                        style={{ width: `${i * 33}%` }}
                      ></div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="h-6 w-48 bg-gray-200 rounded animate-pulse"></div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="h-4 w-24 bg-gray-200 rounded animate-pulse mb-2"></div>
                  <div className="h-6 w-28 bg-gray-200 rounded animate-pulse"></div>
                </div>
                <div>
                  <div className="h-4 w-28 bg-gray-200 rounded animate-pulse mb-2"></div>
                  <div className="flex items-center gap-2">
                    <div className="h-6 w-24 bg-gray-200 rounded animate-pulse"></div>
                    <div className="h-4 w-16 bg-gray-200 rounded animate-pulse"></div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <div className="h-6 w-32 bg-gray-200 rounded animate-pulse"></div>
              </CardHeader>
              <CardContent className="space-y-4">
                {[1, 2].map((i) => (
                  <div
                    key={i}
                    className="flex items-start gap-4 p-4 border rounded-lg"
                  >
                    <div className="w-10 h-10 rounded-full bg-gray-200 animate-pulse"></div>
                    <div className="flex-1 space-y-2">
                      <div className="h-5 w-32 bg-gray-200 rounded animate-pulse"></div>
                      <div className="h-4 w-48 bg-gray-200 rounded animate-pulse"></div>
                      <div className="h-4 w-36 bg-gray-200 rounded animate-pulse"></div>
                      <div className="h-5 w-20 bg-gray-200 rounded animate-pulse"></div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="h-6 w-28 bg-gray-200 rounded animate-pulse"></div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-start gap-4">
                  <div className="w-16 h-16 rounded-full bg-gray-200 animate-pulse"></div>
                  <div className="flex-1 space-y-2">
                    <div className="h-5 w-40 bg-gray-200 rounded animate-pulse"></div>
                    <div className="h-4 w-56 bg-gray-200 rounded animate-pulse"></div>
                    <div className="h-4 w-44 bg-gray-200 rounded animate-pulse"></div>
                    <div className="flex flex-wrap gap-2 mt-2">
                      <div className="h-5 w-16 bg-gray-200 rounded animate-pulse"></div>
                      <div className="h-5 w-20 bg-gray-200 rounded animate-pulse"></div>
                      <div className="h-5 w-14 bg-gray-200 rounded animate-pulse"></div>
                    </div>
                    <div className="h-9 w-full bg-gray-200 rounded animate-pulse mt-3"></div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="h-6 w-20 bg-gray-200 rounded animate-pulse"></div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="h-4 w-full bg-gray-200 rounded animate-pulse"></div>
                  <div className="h-4 w-full bg-gray-200 rounded animate-pulse"></div>
                  <div className="h-4 w-3/4 bg-gray-200 rounded animate-pulse"></div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  if (error || !lesson) {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4">
        <p className="text-red-600">
          {t("lessons.notFound", { defaultValue: "Lesson not found" })}
        </p>
        <Button onClick={() => navigate(getBackRoute())} variant="outline">
          <ArrowLeft className="mr-2 h-4 w-4" />
          {t("common.back", { defaultValue: "Back" })}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(getBackRoute())}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            {t("common.back", { defaultValue: "Back" })}
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {formatDate(lesson.date)}
            </h1>
            <p className="text-sm text-gray-600">
              {formatTime(lesson.time, lesson.duration)}
            </p>
          </div>
        </div>
        {(canEditLesson || !isInstructor) && (
          <div className="flex items-center gap-2">
            {canEditLesson && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowEditDialog(true)}
                className="flex items-center gap-2"
              >
                <Edit className="h-4 w-4" />
                {t("common.edit", { defaultValue: "Edit" })}
              </Button>
            )}
            {!isInstructor && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowDeleteDialog(true)}
                className="flex items-center gap-2 text-red-600 hover:text-red-700"
              >
                <Trash2 className="h-4 w-4" />
                {t("common.delete", { defaultValue: "Delete" })}
              </Button>
            )}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column */}
        <div className="space-y-6">
          {/* 1. lesson Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CalendarIcon className="h-5 w-5" />
                {t("lessons.lessonInformation", {
                  defaultValue: "Lesson Information",
                })}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">
                    {t("lessons.date", { defaultValue: "Date" })}
                  </p>
                  <p className="font-medium">{formatDateShort(lesson.date)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">
                    {t("lessons.time", { defaultValue: "Time" })}
                  </p>
                  <p className="font-medium">
                    {formatTime(lesson.time, lesson.duration)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">
                    {t("lessons.discipline", { defaultValue: "Discipline" })}
                  </p>
                  <Badge
                    style={{
                      backgroundColor: disciplineColor,
                      color: "white",
                    }}
                    className="text-sm"
                  >
                    {lesson.discipline}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm text-gray-600">
                    {t("lessons.level", { defaultValue: "Level" })}
                  </p>
                  <Badge
                    style={{
                      backgroundColor: levelColor,
                      color: "white",
                    }}
                    className="text-sm"
                  >
                    {lesson.level}
                  </Badge>
                </div>
                {lesson.product?.category && (
                  <div className="col-span-2">
                    <p className="text-sm text-gray-600">
                      {t("products.category", { defaultValue: "Category" })}
                    </p>
                    <Badge
                      style={{
                        backgroundColor: categoryColor,
                        color: "white",
                      }}
                    >
                      {lesson.product.category.name}
                    </Badge>
                  </div>
                )}
                {lesson.instructor?.id &&
                  lesson.product?.category?.id &&
                  isCompensationEnabled && (
                    <div className="col-span-2">
                      <p className="text-sm text-gray-600 mb-2">
                        {t("compensation.title", {
                          defaultValue: "Compensation",
                        })}
                      </p>
                      <InstructorCompensationBadge
                        instructorId={lesson.instructor.id}
                        categoryId={lesson.product.category.id}
                        durationHours={lesson.duration / 60}
                        productId={lesson.product.id}
                        productName={
                          lesson.product.title || lesson.product.name
                        }
                      />
                    </div>
                  )}
              </div>
            </CardContent>
          </Card>

          {/* Product */}
          {lesson.product && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5" />
                  {t("products.product", { defaultValue: "Product" })}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm text-gray-600">
                    {t("products.productName", {
                      defaultValue: "Product Name",
                    })}
                  </p>
                  <p className="font-medium">
                    {lesson.product.title || lesson.product.name}
                  </p>
                </div>
                {lesson.product.category && (
                  <div>
                    <p className="text-sm text-gray-600">
                      {t("products.category", { defaultValue: "Category" })}
                    </p>
                    <Badge
                      style={{
                        backgroundColor: categoryColor,
                        color: "white",
                      }}
                    >
                      {lesson.product.category.name}
                    </Badge>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <p className="text-sm text-gray-600">
                    {t("products.price", { defaultValue: "Price" })}
                  </p>
                  <p className="font-medium text-lg">
                    {formatPrice(lesson.product.price)}
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* 2. hours Progress */}
          {lesson.booking &&
            lesson.bookingLessons &&
            lesson.bookingLessons.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CalendarIcon className="h-5 w-5" />
                    {t("lessons.hoursProgress", {
                      defaultValue: "Hours Progress",
                    })}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="text-sm text-gray-600 mb-4 font-medium">
                    {t("lessons.totalBookingHours", {
                      total: `${Math.floor((lesson.booking?.total_minutes || 0) / 60)}h ${(lesson.booking?.total_minutes || 0) % 60}m`,
                      defaultValue: `Total booking hours: ${Math.floor((lesson.booking?.total_minutes || 0) / 60)}h ${(lesson.booking?.total_minutes || 0) % 60}m`,
                    })}
                  </div>
                  {lesson.bookingLessons.map((bookingLesson, index) => {
                    const progress = calculateProgress(
                      index,
                      lesson.bookingLessons,
                      lesson.booking?.total_minutes || 0,
                    );
                    const isCurrentLesson = bookingLesson.id === lesson.id;
                    const bookingLessonHours = Math.floor(
                      bookingLesson.duration / 60,
                    );
                    const bookingLessonMinutes = bookingLesson.duration % 60;
                    const usedHours = Math.floor(progress.used / 60);
                    const usedMinutes = progress.used % 60;

                    return (
                      <div key={bookingLesson.id} className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-600">
                            {formatDate(bookingLesson.date)} -{" "}
                            {bookingLesson.time.split(":")[0]}:
                            {bookingLesson.time.split(":")[1]} (
                            {bookingLessonHours}h{" "}
                            {bookingLessonMinutes > 0
                              ? `${bookingLessonMinutes}m`
                              : ""}
                            )
                          </span>
                          <span className="text-gray-600">
                            {t("lessons.used", { defaultValue: "Used" })}:{" "}
                            {usedHours}h{" "}
                            {usedMinutes > 0 ? `${usedMinutes}m` : ""} (
                            {progress.percentage.toFixed(0)}%)
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2.5">
                          <div
                            className={`h-2.5 rounded-full transition-all duration-500 ease-out ${isCurrentLesson ? "bg-gray-500" : "bg-gray-300"}`}
                            style={{
                              width: `${Math.min(progress.percentage, 100)}%`,
                            }}
                          ></div>
                        </div>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            )}

          {/* 3. status and payment */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Award className="h-5 w-5" />
                {t("lessons.statusAndPayment", {
                  defaultValue: "Status and Payment",
                })}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Lesson Status */}
              {lesson.lessonStatus && (
                <div>
                  <p className="text-sm text-gray-600 mb-2">
                    {t("lessons.lessonStatus", {
                      defaultValue: "Lesson Status",
                    })}
                  </p>
                  <Badge
                    style={{
                      backgroundColor: lesson.lessonStatus.color,
                      color: "white",
                    }}
                    className="text-sm"
                  >
                    {lesson.lessonStatus.display_name ||
                      lesson.lessonStatus.name}
                  </Badge>
                </div>
              )}

              {/* Payment Status */}
              {lesson.paymentStatus && (
                <div>
                  <p className="text-sm text-gray-600 mb-2">
                    {t("lessons.paymentStatus", {
                      defaultValue: "Payment Status",
                    })}
                  </p>
                  <div className="flex items-center gap-2">
                    <Badge
                      style={{
                        backgroundColor: lesson.paymentStatus.color,
                        color: "white",
                      }}
                      className="text-sm"
                    >
                      {t(
                        `systemConfig.statuses.payment.${lesson.paymentStatus.name}`,
                        {
                          defaultValue:
                            lesson.paymentStatus.display_name ||
                            lesson.paymentStatus.name,
                        },
                      )}
                    </Badge>
                    {lesson.price && (
                      <span className="text-sm font-medium text-gray-700">
                        {formatPrice(lesson.price)}
                      </span>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* School Section - Only visible for INSTRUCTOR */}
          {user?.role === "INSTRUCTOR" && lesson.school && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5" />
                  {t("lessons.school", { defaultValue: "School" })}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="font-medium text-lg">{lesson.school.name}</p>
                {lesson.school.address && (
                  <p className="text-sm text-gray-600 mt-1">
                    {lesson.school.address}
                  </p>
                )}
              </CardContent>
            </Card>
          )}

          {/* 4. participants */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                {t("lessons.participants", { defaultValue: "Participants" })}
                {lesson.participants && lesson.participants.length > 0 && (
                  <Badge variant="destructive" className="ml-2">
                    {lesson.participants.length}/{lesson.participants.length}
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {!lesson.participants || lesson.participants.length === 0 ? (
                <p className="text-sm text-gray-500">
                  {t("lessons.noParticipants", {
                    defaultValue: "No participants",
                  })}
                </p>
              ) : (
                lesson.participants.map((participant) => {
                  const hasData =
                    participant.first_name ||
                    participant.last_name ||
                    participant.email;
                  return (
                    <div
                      key={participant.id}
                      className="flex items-start gap-4 p-4 border rounded-lg"
                    >
                      <div className="w-10 h-10 rounded-full bg-pink-100 flex items-center justify-center flex-shrink-0">
                        <User className="h-5 w-5 text-pink-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        {hasData ? (
                          <>
                            {(participant.first_name ||
                              participant.last_name) && (
                              <p className="font-medium">
                                {participant.first_name || ""}{" "}
                                {participant.last_name || ""}
                              </p>
                            )}
                            {participant.email && (
                              <div className="flex items-center gap-2 mt-1 text-sm text-gray-600">
                                <Mail className="h-3 w-3" />
                                <span className="truncate">
                                  {participant.email}
                                </span>
                              </div>
                            )}
                            {participant.whatsapp_number && (
                              <div className="flex items-center gap-2 mt-1 text-sm text-gray-600">
                                <Phone className="h-3 w-3" />
                                <span>{participant.whatsapp_number}</span>
                              </div>
                            )}
                            {participant.skill_level && (
                              <Badge className="mt-2 text-xs bg-green-500 text-white hover:bg-green-600">
                                {participant.skill_level}
                              </Badge>
                            )}
                            <div className="flex flex-wrap gap-2 mt-3">
                              {participant.whatsapp_number && (
                                <Button
                                  size="sm"
                                  className="flex items-center gap-2 bg-[#25D366] hover:bg-[#20BA5A] text-white"
                                  onClick={() => {
                                    const cleanNumber =
                                      participant.whatsapp_number?.replace(
                                        /\D/g,
                                        "",
                                      );
                                    if (cleanNumber) {
                                      const whatsappWindow = window.open(
                                        `https://wa.me/${cleanNumber}`,
                                        "_blank",
                                        "noopener,noreferrer",
                                      );
                                      if (whatsappWindow) {
                                        whatsappWindow.opener = null;
                                      }
                                    }
                                  }}
                                >
                                  <MessageCircle className="h-4 w-4" />
                                  {t("instructors.sendWhatsApp", {
                                    defaultValue: "Send WhatsApp message",
                                  })}
                                </Button>
                              )}
                              {participant.student_id && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="flex items-center gap-2"
                                  onClick={() => {
                                    setSelectedStudentId(
                                      participant.student_id,
                                    );
                                    setShowStudentModal(true);
                                  }}
                                >
                                  <User className="h-4 w-4" />
                                  {t("lessons.viewStudentProfile", {
                                    defaultValue: "View profile",
                                  })}
                                </Button>
                              )}
                            </div>
                          </>
                        ) : (
                          <p className="text-sm text-gray-500">
                            {t("lessons.participantDataNotAvailable", {
                              defaultValue: "Participant data not available",
                            })}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>

          {/* 5. instructor */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                {t("lessons.instructor", { defaultValue: "Instructor" })}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {lesson.instructor &&
              lesson.instructor.id &&
              (lesson.instructor.first_name ||
                lesson.instructor.last_name ||
                lesson.instructor.email) ? (
                <div className="flex items-start gap-4">
                  {lesson.instructor.avatar ? (
                    <img
                      src={lesson.instructor.avatar}
                      alt={
                        `${lesson.instructor.first_name || ""} ${lesson.instructor.last_name || ""}`.trim() ||
                        "Instructor"
                      }
                      className="w-16 h-16 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-full bg-pink-100 flex items-center justify-center flex-shrink-0">
                      <User className="h-8 w-8 text-pink-600" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    {(lesson.instructor.first_name ||
                      lesson.instructor.last_name) && (
                      <p className="font-medium">
                        {lesson.instructor.first_name || ""}{" "}
                        {lesson.instructor.last_name || ""}
                      </p>
                    )}
                    {lesson.instructor.email && (
                      <div className="flex items-center gap-2 mt-1 text-sm text-gray-600">
                        <Mail className="h-3 w-3" />
                        <span className="truncate">
                          {lesson.instructor.email}
                        </span>
                      </div>
                    )}
                    {lesson.instructor.whatsapp_number && (
                      <div className="flex items-center gap-2 mt-1 text-sm text-gray-600">
                        <Phone className="h-3 w-3" />
                        <span>{lesson.instructor.whatsapp_number}</span>
                      </div>
                    )}
                    {lesson.instructor.specialties &&
                      lesson.instructor.specialties.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-2">
                          {lesson.instructor.specialties.map(
                            (specialty, index) => (
                              <Badge
                                key={index}
                                variant="outline"
                                className="text-xs"
                              >
                                {specialty}
                              </Badge>
                            ),
                          )}
                        </div>
                      )}
                    {lesson.instructor.whatsapp_number && (
                      <Button
                        size="sm"
                        className="mt-3 flex items-center gap-2 w-full bg-[#25D366] hover:bg-[#20BA5A] text-white"
                        onClick={() => {
                          const cleanNumber =
                            lesson.instructor.whatsapp_number?.replace(
                              /\D/g,
                              "",
                            );
                          if (cleanNumber) {
                            const whatsappWindow = window.open(
                              `https://wa.me/${cleanNumber}`,
                              "_blank",
                              "noopener,noreferrer",
                            );
                            if (whatsappWindow) {
                              whatsappWindow.opener = null;
                            }
                          }
                        }}
                      >
                        <MessageCircle className="h-4 w-4" />
                        {t("instructors.sendWhatsApp", {
                          defaultValue: "Send WhatsApp message",
                        })}
                      </Button>
                    )}
                  </div>
                </div>
              ) : (
                <p className="text-sm text-gray-500">
                  {t("lessons.noInstructor", {
                    defaultValue: "No instructor assigned",
                  })}
                </p>
              )}
            </CardContent>
          </Card>

          {/* Notes */}
          {lesson.notes && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  {t("lessons.notes", { defaultValue: "Notes" })}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-700 whitespace-pre-wrap">
                  {lesson.notes}
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Edit lesson dialog */}
      {lesson && (
        <EditLessonDialog
          open={showEditDialog}
          onOpenChange={setShowEditDialog}
          lesson={{
            id: lesson.id,
            date: lesson.date,
            time: lesson.time,
            duration: lesson.duration,
            lesson_status_id: lesson.lesson_status_id,
            payment_status_id: lesson.payment_status_id,
            student_first_name: lesson.participants[0]?.first_name,
            student_last_name: lesson.participants[0]?.last_name,
          }}
          onSave={handleUpdateLesson}
          canEdit={canEditLesson}
        />
      )}

      {/* Delete lesson dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {t("lessons.deleteLesson", { defaultValue: "Delete Lesson" })}
            </DialogTitle>
            <DialogDescription>
              {t("lessons.deleteConfirmation", {
                defaultValue:
                  "Are you sure you want to delete this lesson? This action cannot be undone.",
              })}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDeleteDialog(false)}
            >
              {t("common.cancel", { defaultValue: "Cancel" })}
            </Button>
            <Button
              onClick={handleDeleteLesson}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {t("common.delete", { defaultValue: "Delete" })}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Student form view modal */}
      {selectedStudentId && (
        <StudentFormViewModal
          studentId={selectedStudentId}
          open={showStudentModal}
          onOpenChange={(open) => {
            setShowStudentModal(open);
            if (!open) {
              setSelectedStudentId(null);
            }
          }}
        />
      )}
    </div>
  );
};

export default LessonDetailsPage;
