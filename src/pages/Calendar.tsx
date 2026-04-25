import React, { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useErrorTranslation } from "@/hooks/useErrorTranslation";
import { useNavigate } from "react-router-dom";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Calendar as CalendarIcon,
  User,
} from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { lessonsApi } from "@/services/lessons";
import { roleAwareApi } from "@/services/role-aware-api";
import { studentsApi } from "@/services/students";
import { availabilityApi, AvailabilitySlot } from "@/services/availability";
import { api } from "@/lib/api";
import { useUserRole } from "@/hooks/useUserRole";
import { useDisciplines } from "@/hooks/useDisciplines";
import { useAuthStore } from "@/store/auth";
import { useSchoolSelectionStore } from "@/store/schoolSelection";
import { useSpecialDates, useWeeklyAvailability } from "@/hooks/useSchoolCalendar";
import { UserRole } from "@/types";
import DailyCalendar from "@/components/DailyCalendar";
import LessonWizard from "@/components/LessonWizard";
import EditLessonDialog from "@/components/EditLessonDialog";
import InstructorAvailabilityEditor from "@/components/instructor/InstructorAvailabilityEditor";
import { toast } from "react-hot-toast";
import { formatDateLocal } from "@/utils/dateHelpers";
import { useInstructorLessonPermission } from "@/hooks/useInstructorLessonPermission";

type ViewMode = "day" | "week";

const getWeekDays = (currentDate: Date) => {
  const monday = new Date(currentDate);
  const dow = currentDate.getDay();
  const back = dow === 0 ? 6 : dow - 1;
  monday.setDate(currentDate.getDate() - back);
  return Array.from({ length: 7 }, (_, i) => {
    const day = new Date(monday);
    day.setDate(monday.getDate() + i);
    return day;
  });
};

const Calendar: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { getTranslatedError } = useErrorTranslation();
  const { role, permissions } = useUserRole();
  const { user } = useAuthStore();
  const { selectedSchoolId } = useSchoolSelectionStore();
  const permissionSchoolId =
    user?.role === UserRole.SUPER_ADMIN
      ? (selectedSchoolId ?? undefined)
      : (selectedSchoolId ?? user?.schoolId);
  const { canEditLessons: canInstructorEditLessons } =
    useInstructorLessonPermission(permissionSchoolId);

  const effectiveSchoolId = user?.role === UserRole.SUPER_ADMIN
    ? (selectedSchoolId ?? undefined)
    : user?.schoolId;

  const { disciplines, colorMap } = useDisciplines(effectiveSchoolId);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [viewMode, setViewMode] = useState<ViewMode>("day");
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [isCreatingLesson, setIsCreatingLesson] = useState(false);
  const [error, setError] = useState<string>("");

  // New state for comprehensive calendar
  const [filterInstructor, setFilterInstructor] = useState<string>("all");
  const [filterDiscipline, setFilterDiscipline] = useState<string>("all");
  const [visibleInstructors, setVisibleInstructors] = useState<Set<string>>(new Set());
  const [showLessonWizard, setShowLessonWizard] = useState(false);
  const [preselectedLessonData, setPreselectedLessonData] = useState<any>(null);
  const [editingLesson, setEditingLesson] = useState<any>(null);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const dateRange = useMemo(() => {
    if (viewMode === "day") {
      const d = formatDateLocal(currentDate);
      return { start: d, end: d };
    }
    const days = getWeekDays(currentDate);
    return { start: formatDateLocal(days[0]), end: formatDateLocal(days[6]) };
  }, [viewMode, currentDate]);

  const { data: instructorsData } = useQuery({
    queryKey: ['instructors', 'calendar', effectiveSchoolId, user?.role, role],
    queryFn: async () => {
      if (user?.role === UserRole.SUPER_ADMIN && effectiveSchoolId) {
        const response = await api.get(`/instructors?page=1&limit=100&schoolId=${effectiveSchoolId}`);
        return response.data.data.instructors || [];
      } else {
        const data = await roleAwareApi.getInstructors(role, 1, 100);
        return data.instructors || [];
      }
    },
    enabled: (user?.role !== UserRole.SUPER_ADMIN || !!effectiveSchoolId) && !!user?.role,
    staleTime: 60000,
  });

  const instructors = instructorsData || [];

  useEffect(() => {
    if (user?.role === UserRole.SUPER_ADMIN && effectiveSchoolId) {
      setFilterInstructor("all");
      setFilterDiscipline("all");
    }
  }, [effectiveSchoolId, user?.role]);

  // instructor select
  useEffect(() => {
    if (filterInstructor === "all") {
      if (instructors.length > 0) {
        setVisibleInstructors(new Set(instructors.map((i: any) => i.id)));
      }
    } else if (filterInstructor) {
      setVisibleInstructors(new Set([filterInstructor]));
    }
  }, [filterInstructor, instructors]);

  useEffect(() => {
    if (instructors.length > 0 && visibleInstructors.size === 0) {
      setVisibleInstructors(new Set(instructors.map((i: any) => i.id)));
    }
  }, [instructors, visibleInstructors.size]);

  const navigateDate = (dir: "prev" | "next") => {
    const d = new Date(currentDate);
    if (viewMode === "day") {
      d.setDate(currentDate.getDate() + (dir === "next" ? 1 : -1));
    } else {
      d.setDate(currentDate.getDate() + (dir === "next" ? 7 : -7));
    }
    setCurrentDate(d);
  };

  // New handler functions
  const handleCreateLesson = (data: any) => {
    // Check if user has permission to create lessons
    if (!permissions.canCreateLessons) {
      setError(t("calendar.errors.noPermissionToCreateLesson"));
      return;
    }

    setPreselectedLessonData(data);
    setShowLessonWizard(true);
  };

  const handleLessonClick = (lesson: any) => {
    navigate(`/lessons/${lesson.id}`, { state: { from: 'calendar' } });
  };

  const handleSaveLesson = async (lessonData: any) => {
    setIsCreatingLesson(true);
    try {
      console.log("Creating lesson:", lessonData);

      // Import the lesson creation API
      const { lessonCreationApi } = await import("@/services/lessonCreation");

      // Call the lesson creation API
      const result = await lessonCreationApi.createLesson(lessonData);
      console.log("Lesson creation API response:", result);

      // Close wizard and refresh data
      setShowLessonWizard(false);
      setPreselectedLessonData(null);
      setRefreshTrigger(prev => prev + 1); // Trigger refresh
      await queryClient.invalidateQueries({ queryKey: ['lessons'] });
    } catch (err: any) {
      console.error("Error creating lesson:", err);

      if (err?.response?.data?.error?.includes("already has a lesson scheduled") ||
        err?.response?.data?.error?.includes("Instructor already has a lesson")) {
        toast.error(getTranslatedError(err) || t("lessons.instructorNotAvailable"));
        return;
      }

      if (err?.response?.data?.error?.includes("School is closed") ||
        err?.response?.status === 409 && err?.response?.data?.error?.includes("closed")) {
        toast.error(getTranslatedError(err) || t("lessons.schoolClosedError"));
        return;
      }

      if (err?.response?.status === 403 && err?.response?.data?.error?.includes("not associated with any school")) {
        setError(getTranslatedError(err) || err?.message || "Failed to create lesson");
      } else {
        toast.error(getTranslatedError(err) || err?.message || t("lessons.createFailed"));
      }
    } finally {
      setIsCreatingLesson(false);
    }
  };

  const handleDeleteLesson = async (lessonId: string) => {
    if (!window.confirm(t("lessons.confirmDelete"))) return;
    try {
      await lessonsApi.delete(lessonId);
      setRefreshTrigger(prev => prev + 1);
      await queryClient.invalidateQueries({ queryKey: ['lessons'] });
      toast.success(t("lessons.deleted"));
    } catch (err: any) {
      console.error("Error deleting lesson:", err);
      toast.error(getTranslatedError(err) || t("lessons.deleteFailed"));
    }
  };

  const handleEditLesson = (lesson: any) => {
    if (user?.role === UserRole.INSTRUCTOR && !canInstructorEditLessons) {
      toast.error(t("lessons.instructorEditNotAuthorized"));
      return;
    }
    setEditingLesson(lesson);
    setShowEditDialog(true);
  };

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
      if (user?.role === UserRole.INSTRUCTOR && !canInstructorEditLessons) {
        toast.error(t("lessons.instructorEditNotAuthorized"));
        return;
      }
      await lessonsApi.update(lessonId, data);
      setRefreshTrigger(prev => prev + 1);
      setShowEditDialog(false);
      setEditingLesson(null);
      await queryClient.invalidateQueries({ queryKey: ['lessons'] });
    } catch (err: any) {
      console.error("Error updating lesson:", err);
      toast.error(getTranslatedError(err) || t("lessons.updateFailed"));
      throw err;
    }
  };

  const handleRescheduleLesson = async (lessonId: string, newDate: string, newTime: string, _newInstructorId: string, duration: number) => {
    try {
      await lessonsApi.reschedule(lessonId, { date: newDate, timeStart: newTime, durationMinutes: duration, ...(!!_newInstructorId && { instructorId: _newInstructorId }) });
      setRefreshTrigger(prev => prev + 1);
      await queryClient.invalidateQueries({ queryKey: ['lessons'] });
      toast.success(t("lessons.rescheduled"));
    } catch (err: any) {
      console.error("Error rescheduling lesson:", err);
      toast.error(getTranslatedError(err) || t("lessons.rescheduleFailed"));
    }
  };

  const daysToRender = useMemo(() => {
    return viewMode === "day" ? [currentDate] : getWeekDays(currentDate);
  }, [viewMode, currentDate]);

  // Bulk data fetching for week view
  const { data: weeklyAvailability } = useWeeklyAvailability(effectiveSchoolId);
  const { data: specialDates } = useSpecialDates(
    dateRange.start,
    dateRange.end,
    effectiveSchoolId
  );

  // Fetch students only when lesson wizard is open (lazy loading)
  const { data: studentsData } = useQuery({
    queryKey: ["students", effectiveSchoolId, "bulk"],
    queryFn: async () => {
      if (!permissions.canViewStudents) return { students: [] };
      if (user?.role === UserRole.SUPER_ADMIN && effectiveSchoolId) {
        const response = await studentsApi.getStudents(1, 100, "", effectiveSchoolId);
        return response;
      } else {
        const response = await roleAwareApi.getStudents(role, 1, 100);
        return response;
      }
    },
    enabled: showLessonWizard && (user?.role !== UserRole.SUPER_ADMIN || !!effectiveSchoolId),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });

  const { data: weekLessons } = useQuery({
    queryKey: ["lessons", "week", dateRange.start, dateRange.end, filterInstructor, filterDiscipline, effectiveSchoolId],
    queryFn: async () => {
      if (user?.role === UserRole.SUPER_ADMIN && !effectiveSchoolId) {
        return [];
      }
      return await lessonsApi.listByRange({
        startDate: dateRange.start,
        endDate: dateRange.end,
        instructorId: filterInstructor !== "all" ? filterInstructor : undefined,
        discipline: filterDiscipline !== "all" ? filterDiscipline : undefined,
        limit: 500,
        schoolId: effectiveSchoolId,
      });
    },
    enabled: viewMode === "week" && (user?.role !== UserRole.SUPER_ADMIN || !!effectiveSchoolId),
    staleTime: 1 * 60 * 1000, // 1 minute
    gcTime: 5 * 60 * 1000, // 5 minutes
  });

  const { data: weekAvailability } = useQuery({
    queryKey: ["availability", "week", dateRange.start, dateRange.end, effectiveSchoolId, instructors.map((i: any) => i.id).join(",")],
    queryFn: async () => {
      if (instructors.length === 0) return [];
      // Use batch endpoint for single request instead of multiple parallel requests
      return await availabilityApi.getBatchRange(
        instructors.map((i: any) => i.id),
        dateRange.start,
        dateRange.end
      );
    },
    enabled: viewMode === "week" && instructors.length > 0 && (user?.role !== UserRole.SUPER_ADMIN || !!effectiveSchoolId),
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 5 * 60 * 1000, // 5 minutes
  });

  // Fetch all instructor lessons across all schools for conflict detection
  const { data: conflicts = [] } = useQuery({
    queryKey: ["lessons", "conflicts", dateRange.start, dateRange.end, Array.from(visibleInstructors).join(",")],
    queryFn: async () => {
      const visibleInstructorIds = Array.from(visibleInstructors);

      if (visibleInstructorIds.length === 0) return [];

      return await lessonsApi.getInstructorConflicts({
        instructorIds: visibleInstructorIds,
        startDate: dateRange.start,
        endDate: dateRange.end,
      });
    },
    enabled: visibleInstructors.size > 0 && (user?.role !== UserRole.SUPER_ADMIN || !!effectiveSchoolId),
    staleTime: 1 * 60 * 1000, // 1 minute
    gcTime: 5 * 60 * 1000, // 5 minutes
  });

  // "select school" message if no school is selected
  if (user?.role === UserRole.SUPER_ADMIN && !selectedSchoolId) {
    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-gray-900">
            {t("calendar.title")}
          </h1>
          <p className="text-sm md:text-base text-gray-600 mt-2">
            {t("calendar.subtitle")}
          </p>
        </div>
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <p className="text-lg text-gray-600">
                {t("admin.selectSchoolFromDropdown", { defaultValue: "Please select a school from the dropdown above" })}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show different content based on user role
  if (permissions.canManageOwnAvailability && !permissions.canCreateLessons) {
    // Instructor view - show availability editor
    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight bg-gradient-to-r from-pink-600 to-rose-600 bg-clip-text text-transparent">
            {t("availability.title")}
          </h1>
          <p className="text-sm md:text-base text-gray-600 mt-2">
            {t("availability.instructorDescription")}
          </p>
        </div>

        <InstructorAvailabilityEditor />
      </div>
    );
  }

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="space-y-4 sm:space-y-6">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 sm:gap-4 mb-4 sm:mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight text-gray-900">
              {t("calendar.title")}
            </h1>
            <p className="text-xs sm:text-sm md:text-base text-gray-600 mt-1 sm:mt-2">
              {t("calendar.subtitle")}
            </p>
          </div>
          <div className="flex items-center gap-4">

          </div>
        </div>

        <div className="space-y-3 sm:space-y-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-4">
            {/* Date Navigation */}
            <div className="flex items-center gap-2 flex-1">
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigateDate("prev")}
                className="hover:bg-gray-50 hover:border-gray-300 flex-shrink-0"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <div className="flex items-center gap-2 px-2 sm:px-4 py-2 bg-gray-50 rounded-lg flex-1 justify-center border border-gray-200 min-w-0">
                <CalendarIcon className="h-3 w-3 sm:h-4 sm:w-4 text-gray-600 flex-shrink-0" />
                <span className="text-xs sm:text-sm font-medium text-gray-700 truncate">
                  {currentDate.toLocaleDateString(i18n.language, {
                    weekday: "long",
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigateDate("next")}
                className="hover:bg-gray-50 hover:border-gray-300 flex-shrink-0"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            {/* View Mode Toggle */}
            <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1 flex-shrink-0">
              <Button
                variant={viewMode === "day" ? "default" : "ghost"}
                size="sm"
                onClick={() => setViewMode("day")}
                className={`h-8 px-2 sm:px-3 text-xs sm:text-sm ${viewMode === "day"
                  ? "bg-pink-600 text-white"
                  : "hover:bg-gray-200"
                  }`}
              >
                {t("calendar.today")}
              </Button>
              <Button
                variant={viewMode === "week" ? "default" : "ghost"}
                size="sm"
                onClick={() => setViewMode("week")}
                className={`h-8 px-2 sm:px-3 text-xs sm:text-sm ${viewMode === "week"
                  ? "bg-pink-600 text-white"
                  : "hover:bg-gray-200"
                  }`}
              >
                {t("calendar.week")}
              </Button>
            </div>
          </div>

          {/* Filters - Next Line */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
            <Select
              value={filterDiscipline}
              onValueChange={setFilterDiscipline}
            >
              <SelectTrigger className="w-full sm:w-32 border-gray-300 focus:border-gray-500 focus:ring-gray-500 bg-gray-50">
                <div className="flex items-center gap-2">
                  <CalendarIcon className="h-4 w-4 text-gray-600" />
                  <SelectValue placeholder={t("disciplines.title")} />
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                {disciplines.map((discipline) => (
                  <SelectItem key={discipline.id} value={discipline.slug}>
                    {discipline.display_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={filterInstructor}
              onValueChange={setFilterInstructor}
            >
              <SelectTrigger className="w-full sm:w-32 border-gray-300 focus:border-gray-500 focus:ring-gray-500 bg-gray-50">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-gray-600" />
                  <SelectValue placeholder={t("roles.instructor")} />
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                {instructors.map((instructor: any) => (
                  <SelectItem key={instructor.id} value={instructor.id}>
                    {instructor.firstName} {instructor.lastName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Visible Instructors */}
          {instructors.length > 0 && (
            <div className="flex items-center gap-4 flex-wrap p-3 bg-gray-50 rounded-lg border border-gray-200">
              <span className="text-sm font-medium text-gray-700">{t("instructors.title")}</span>
              {instructors.map((instructor: any) => (
                <div
                  key={instructor.id}
                  className="flex items-center gap-2"
                >
                  <button
                    onClick={() => {
                      const newSet = new Set(visibleInstructors);
                      if (newSet.has(instructor.id)) {
                        newSet.delete(instructor.id);
                      } else {
                        newSet.add(instructor.id);
                      }
                      setVisibleInstructors(newSet);
                    }}
                    className="flex items-center gap-2"
                  >
                    {/* Checkbox */}
                    <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${visibleInstructors.has(instructor.id)
                      ? "bg-pink-600 border-pink-600"
                      : "border-gray-300"
                      }`}>
                      {visibleInstructors.has(instructor.id) && (
                        <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      )}
                    </div>
                    {/* Name */}
                    <span className="text-sm text-gray-700">
                      {instructor.firstName} {instructor.lastName}
                    </span>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {error && error.includes("not associated with any school") && (
          <Card>
            <CardContent className="p-4">
              <div className="text-center">
                <div className="text-orange-500 text-lg mb-2">{t("school.createSchoolFirst")}</div>
                <div className="text-gray-600 mb-4">
                  {t("school.createSchoolFirstMessage", { action: t("school.viewCalendar") })}
                </div>
                <button
                  onClick={() => navigate('/school')}
                  className="inline-flex items-center px-4 py-2 bg-pink-600 text-white rounded-lg hover:bg-pink-700 transition-colors"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  {t("school.createSchool")}
                </button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Calendar Content */}
        {viewMode === "day" ? (
          <DailyCalendar
            key={`day-${currentDate.toISOString()}-${refreshTrigger}`}
            currentDate={currentDate}
            onCreateLesson={handleCreateLesson}
            onLessonClick={handleLessonClick}
            disciplineColors={colorMap}
            visibleInstructorIds={Array.from(visibleInstructors)}
            onDeleteLesson={handleDeleteLesson}
            onEditLesson={user?.role === UserRole.INSTRUCTOR && !canInstructorEditLessons ? undefined : handleEditLesson}
            onRescheduleLesson={handleRescheduleLesson}
            activeDiscipline={filterDiscipline !== "all" ? filterDiscipline : undefined}
            schoolId={effectiveSchoolId}
            conflictLessons={conflicts}
          />
        ) : (
          <div className="space-y-6">
            {daysToRender.map((day) => {
              const dayStr = formatDateLocal(day);
              const dayLessons = weekLessons ? weekLessons.filter((lesson: any) => lesson.date === dayStr) : [];
              const dayAvailability = weekAvailability ? weekAvailability.filter((slot: AvailabilitySlot) => slot.date === dayStr) : [];
              const daySpecialDates = specialDates ? specialDates.filter((special: any) => special.date === dayStr) : [];

              return (
                <div key={`week-day-${day.toISOString()}`} className="space-y-2">
                  <h2 className="text-lg font-semibold">
                    {day.toLocaleDateString(i18n.language, {
                      weekday: "long",
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                    {day.toDateString() === new Date().toDateString() && ` • ${t("calendar.today")}`}
                  </h2>
                  <DailyCalendar
                    key={`${day.toISOString()}-${refreshTrigger}-${viewMode}`}
                    currentDate={day}
                    onCreateLesson={handleCreateLesson}
                    onLessonClick={handleLessonClick}
                    disciplineColors={colorMap}
                    visibleInstructorIds={Array.from(visibleInstructors)}
                    onDeleteLesson={handleDeleteLesson}
                    onEditLesson={user?.role === UserRole.INSTRUCTOR && !canInstructorEditLessons ? undefined : handleEditLesson}
                    onRescheduleLesson={handleRescheduleLesson}
                    activeDiscipline={filterDiscipline !== "all" ? filterDiscipline : undefined}
                    schoolId={effectiveSchoolId}
                    lessons={dayLessons}
                    instructors={instructors}
                    students={studentsData?.students || []}
                    availability={dayAvailability}
                    specialDates={daySpecialDates}
                    weeklyAvailability={weeklyAvailability}
                    conflictLessons={conflicts.filter((conflict: any) => conflict.date === dayStr)}
                  />
                </div>
              );
            })}
          </div>
        )}

        {/* Lesson Wizard */}
        <LessonWizard
          open={showLessonWizard}
          onOpenChange={setShowLessonWizard}
          onSave={handleSaveLesson}
          preselectedData={preselectedLessonData}
          isLoading={isCreatingLesson}
        />

        <EditLessonDialog
          open={showEditDialog}
          onOpenChange={setShowEditDialog}
          lesson={editingLesson}
          onSave={handleUpdateLesson}
          canEdit={!(user?.role === UserRole.INSTRUCTOR) || canInstructorEditLessons}
        />
      </div>
    </DndProvider>
  );
};

export default Calendar;
