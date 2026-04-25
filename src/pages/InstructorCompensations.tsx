//compensation page (super admin and school admin) allows viewing compensation reports for instructors

import React, { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useInstructorCompensations, type PeriodType } from "@/hooks/useInstructorCompensations";
import { useAuthStore } from "@/store/auth";
import { useSchoolSelectionStore } from "@/store/schoolSelection";
import { UserRole, ALL_SCHOOLS_ID } from "@/types";
import { useCompensationMode } from "@/hooks/useCompensationMode";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DollarSign,
  Users,
  Calendar as CalendarIcon,
  Clock,
  ChevronDown,
  ChevronUp,
  Search,
  BookOpen,
  Info,
  Loader2,
  CheckCircle2,
} from "lucide-react";
import { format, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from "date-fns";
import { Input } from "@/components/ui/input";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { compensationApi, type LessonCompensationDetail } from "@/services/compensation";
import toast from "react-hot-toast";
import { PeriodDateSelector } from "@/components/common/PeriodDateSelector";

import { api } from "@/lib/api";
import { useSchoolSettings } from "@/hooks/useSchoolSettings";
import { formatCurrency } from "@/lib/utils";

const InstructorCompensationsPage: React.FC = () => {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const { selectedSchoolId, instructorSelectedSchoolId, setInstructorSelectedSchoolId } = useSchoolSelectionStore();
  const [period, setPeriod] = useState<PeriodType>("month");
  const [expandedInstructors, setExpandedInstructors] = useState<Set<string>>(new Set());
  const [customDateRange, setCustomDateRange] = useState<{ startDate?: string; endDate?: string }>({});
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [showBulkPaidDialog, setShowBulkPaidDialog] = useState(false);
  const [updatingLessonId, setUpdatingLessonId] = useState<string | null>(null);
  const queryClient = useQueryClient();


  const effectiveSchoolId = user?.role === UserRole.INSTRUCTOR
    ? (instructorSelectedSchoolId || undefined)
    : (user?.role === UserRole.SUPER_ADMIN ? (selectedSchoolId || undefined) : user?.schoolId);

  const instructorId = user?.role === UserRole.INSTRUCTOR ? user.id : undefined;

  const { isEnabled, isLoading: isModeLoading, compensationMode } = useCompensationMode();

  // Fetch instructor's schools (only for INSTRUCTOR role)
  const { data: instructorSchools = [] } = useQuery({
    queryKey: ['instructor-schools', user?.id],
    queryFn: async () => {
      const response = await api.get(`/instructor-schools/instructor/${user?.id}`);
      return (response.data.data as Array<{
        id: string;
        schoolId: string;
        schoolName: string;
        isPrimary: boolean;
        compensationMode?: 'fixed' | 'variable';
      }>).map(school => ({
        ...school,
        schoolName: school.schoolName
      }));
    },
    enabled: user?.role === UserRole.INSTRUCTOR && !!user?.id,
    staleTime: 120000,
  });

  const availableSchools = useMemo(() => {
    return instructorSchools.filter(school => school.compensationMode !== 'fixed');
  }, [instructorSchools]);

  // Set default school to primary (if available) or first available when schools load
  React.useEffect(() => {
    if (user?.role === UserRole.INSTRUCTOR && availableSchools.length > 0) {
      // If no school selected, or currently selected school is not in available schools (e.g. was fixed)
      const isCurrentSelectionValid = instructorSelectedSchoolId === ALL_SCHOOLS_ID ||
        availableSchools.some(s => s.schoolId === instructorSelectedSchoolId);

      if (!instructorSelectedSchoolId || !isCurrentSelectionValid) {
        const primary = availableSchools.find(s => s.isPrimary);
        setInstructorSelectedSchoolId(primary?.schoolId || availableSchools[0]?.schoolId);
      }
    }
  }, [availableSchools, user?.role, instructorSelectedSchoolId, setInstructorSelectedSchoolId]);

  const { report, instructorSummary, stats, dateRange, loading, error } = useInstructorCompensations({
    instructorId,
    period,
    startDate: customDateRange.startDate,
    endDate: customDateRange.endDate,
    schoolId: effectiveSchoolId,
  });

  // Move data derivations before early returns to ensure hooks are called unconditionally
  const displayData = instructorSummary
    ? [instructorSummary]
    : report?.instructorSummaries || [];

  // Filter instructors and calculate unpaid metrics in a single memoized block
  const { filteredData, unpaidLessonsCount, totalUnpaidAmount } = useMemo(() => {
    const filtered = displayData.filter((summary) =>
      summary.instructorName.toLowerCase().includes(searchQuery.toLowerCase())
    );
    let count = 0;
    let amount = 0;
    for (const instructor of filtered) {
      for (const lesson of instructor.lessons) {
        if (!lesson.compensationPaid) {
          count++;
          amount += lesson.compensation;
        }
      }
    }
    return { filteredData: filtered, unpaidLessonsCount: count, totalUnpaidAmount: amount };
  }, [displayData, searchQuery]);

  // Mutation for marking single lesson as paid
  const markLessonPaidMutation = useMutation({
    mutationFn: async ({ lessonId, paid }: { lessonId: string; paid: boolean }) => {
      await compensationApi.markLessonPaid(lessonId, paid);
    },
    onMutate: async ({ lessonId }) => {
      setUpdatingLessonId(lessonId);
    },
    onSuccess: (_, { paid }) => {
      queryClient.invalidateQueries({ queryKey: ["instructor-compensation"] });
      queryClient.invalidateQueries({ queryKey: ["compensation-report"] });
      toast.success(paid
        ? t("compensation.markedAsPaid")
        : t("compensation.markedAsUnpaid")
      );
    },
    onError: (error: Error) => {
      toast.error(error.message || t("compensation.failedToUpdate"));
    },
    onSettled: () => {
      setUpdatingLessonId(null);
    },
  });

  // Mutation for bulk marking lessons as paid
  const bulkMarkPaidMutation = useMutation({
    mutationFn: async () => {
      const allVisibleLessonIds = filteredData.flatMap(summary =>
        summary.lessons.filter(l => !l.compensationPaid).map(l => l.lessonId)
      );

      // Safety check for empty array
      if (allVisibleLessonIds.length === 0) {
        throw new Error(t("compensation.noUnpaidLessons") || "No unpaid lessons to mark");
      }

      // Safety check for max bulk size
      const MAX_BULK_SIZE = 500;
      if (allVisibleLessonIds.length > MAX_BULK_SIZE) {
        throw new Error(t("compensation.tooManyLessons") || `Cannot mark more than ${MAX_BULK_SIZE} lessons at once`);
      }

      return await compensationApi.bulkMarkLessonsPaid(allVisibleLessonIds);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["instructor-compensation"] });
      queryClient.invalidateQueries({ queryKey: ["compensation-report"] });
      setShowBulkPaidDialog(false);
      toast.success(t("compensation.bulkMarkedAsPaid", { count: data.updatedCount }));
    },
    onError: (error: Error) => {
      toast.error(error.message || t("compensation.failedToBulkUpdate"));
    },
  });

  const handleToggleLessonPaid = (lessonId: string, currentPaidStatus: boolean) => {
    markLessonPaidMutation.mutate({ lessonId, paid: !currentPaidStatus });
  };

  const handleBulkMarkAsPaid = () => {
    setShowBulkPaidDialog(true);
  };

  const confirmBulkMarkAsPaid = () => {
    bulkMarkPaidMutation.mutate();
  };

  const toggleInstructorExpansion = (instructorId: string) => {
    setExpandedInstructors((prev) => {
      const next = new Set(prev);
      if (next.has(instructorId)) {
        next.delete(instructorId);
      } else {
        next.add(instructorId);
      }
      return next;
    });
  };

  const handleDateSelect = (date: Date) => {
    setSelectedDate(date);

    let start: Date;
    let end: Date;

    switch (period) {
      case "day":
        start = startOfDay(date);
        end = endOfDay(date);
        break;
      case "week":
        start = startOfWeek(date, { weekStartsOn: 1 });
        end = endOfWeek(date, { weekStartsOn: 1 });
        break;
      case "month":
        start = startOfMonth(date);
        end = endOfMonth(date);
        break;
      default:
        return;
    }

    setCustomDateRange({
      startDate: format(start, "yyyy-MM-dd"),
      endDate: format(end, "yyyy-MM-dd"),
    });
  };

  const handlePeriodChange = (value: PeriodType) => {
    setPeriod(value);
    setCustomDateRange({});
  };

  const { settings: schoolSettings } = useSchoolSettings(effectiveSchoolId);
  const formatAmount = (amount: number) =>
    formatCurrency(
      amount,
      schoolSettings?.defaultCurrency || "EUR",
      "it-IT",
    );

  if (!isModeLoading && !isEnabled && user?.role !== UserRole.INSTRUCTOR) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex flex-col items-center justify-center h-64 space-y-4">
          <DollarSign className="h-12 w-12 text-gray-400" />
          <div className="text-center">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              {t("compensation.disabled.title", { defaultValue: "Compensations not enabled" })}
            </h2>
            <p className="text-gray-600">
              {t("compensation.disabled.description", {
                defaultValue: "Compensation management is available only when the mode is set to \"Variable\" in school configurations."
              })}
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (loading || isModeLoading) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        {/* Skeleton loading */}
        <div className="flex items-center justify-between">
          <div>
            <div className="h-9 w-64 bg-gray-200 rounded animate-pulse mb-2"></div>
            <div className="h-5 w-48 bg-gray-200 rounded animate-pulse"></div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-2">
                    <div className="h-4 w-24 bg-gray-200 rounded animate-pulse"></div>
                    <div className="h-8 w-32 bg-gray-200 rounded animate-pulse"></div>
                  </div>
                  <div className="h-12 w-12 bg-gray-200 rounded-full animate-pulse"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <div className="h-10 flex-1 bg-gray-200 rounded animate-pulse"></div>
              <div className="h-10 w-32 bg-gray-200 rounded animate-pulse"></div>
              <div className="h-10 w-48 bg-gray-200 rounded animate-pulse"></div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="h-6 w-48 bg-gray-200 rounded animate-pulse"></div>
            <div className="h-4 w-64 bg-gray-200 rounded animate-pulse mt-2"></div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[1, 2].map((i) => (
                <div key={i} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 bg-gray-200 rounded-full animate-pulse"></div>
                      <div className="space-y-2">
                        <div className="h-4 w-32 bg-gray-200 rounded animate-pulse"></div>
                        <div className="h-3 w-24 bg-gray-200 rounded animate-pulse"></div>
                      </div>
                    </div>
                    <div className="h-6 w-24 bg-gray-200 rounded animate-pulse"></div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-red-500">{t("compensation.errorLoading")}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 sm:p-6 space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
            {t("compensation.title")}
          </h1>
          <p className="text-sm sm:text-base text-gray-500 mt-1">
            {t("compensation.subtitle")}
          </p>
        </div>
      </div>

      {/* Info banner when All Schools is selected */}
      {user?.role === UserRole.INSTRUCTOR && instructorSelectedSchoolId === ALL_SCHOOLS_ID && compensationMode !== 'fixed' && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start gap-3">
          <div className="text-blue-600 mt-0.5">
            <Info className="w-5 h-5 text-blue-600" />
          </div>
          <p className="text-sm text-blue-700">
            {t("compensation.allSchoolsNote", {
              defaultValue: "You are viewing compensation data combined from all your schools. To view data for a specific school, select it from the dropdown."
            })}
          </p>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Card className="bg-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">
                  {t("compensation.stats.period")}
                </p>
                <p className="text-2xl font-bold mt-1">
                  {period === "day" && format(new Date(dateRange.startDate), "d MMMM yyyy")}
                  {period === "week" && `${format(new Date(dateRange.startDate), "d MMM")} - ${format(new Date(dateRange.endDate), "d MMM yyyy")}`}
                  {period === "month" && format(new Date(dateRange.startDate), "MMMM yyyy")}
                </p>
              </div>
              <div className="h-12 w-12 rounded-full bg-pink-100 flex items-center justify-center">
                <CalendarIcon className="h-6 w-6 text-pink-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">
                  {t("compensation.stats.unpaidCompensation")}
                </p>
                <p className="text-2xl font-bold mt-1 text-amber-600">
                  {formatAmount(stats?.unpaidCompensation || 0)}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {stats?.unpaidLessonCount || 0} {t("compensation.unpaidLessons")}
                </p>
              </div>
              <div className="h-12 w-12 rounded-full bg-amber-100 flex items-center justify-center">
                <DollarSign className="h-6 w-6 text-amber-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">
                  {t("compensation.stats.paidCompensation")}
                </p>
                <p className="text-2xl font-bold mt-1 text-green-600">
                  {formatAmount(stats?.paidCompensation || 0)}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {stats?.paidLessonCount || 0} {t("compensation.paidLessons")}
                </p>
              </div>
              <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
                <DollarSign className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">
                  {t("compensation.stats.instructors")}
                </p>
                <p className="text-2xl font-bold mt-1">
                  {stats?.activeInstructors || 0}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {t("compensation.stats.activeInPeriod")}
                </p>
              </div>
              <div className="h-12 w-12 rounded-full bg-purple-100 flex items-center justify-center">
                <Users className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">
                  {t("compensation.stats.lessons")}
                </p>
                <p className="text-2xl font-bold mt-1">
                  {stats?.totalLessons || 0}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {t("compensation.stats.confirmed")}
                </p>
              </div>
              <div className="h-12 w-12 rounded-full bg-pink-100 flex items-center justify-center">
                <BookOpen className="h-6 w-6 text-pink-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-3 sm:p-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4">
            {user?.role !== UserRole.INSTRUCTOR && (
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  type="search"
                  placeholder={t("compensation.searchPlaceholder")}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            )}




            <PeriodDateSelector
              period={period}
              onPeriodChange={handlePeriodChange}
              date={selectedDate}
              onDateChange={handleDateSelect}
              baseTranslationKey="compensation.period"
            />

            {
              user?.role !== UserRole.INSTRUCTOR && unpaidLessonsCount > 0 && (
                <Button
                  onClick={handleBulkMarkAsPaid}
                  disabled={bulkMarkPaidMutation.isPending}
                  className="bg-green-600 hover:bg-green-700 w-full sm:w-auto"
                >
                  {bulkMarkPaidMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {t("compensation.marking")}
                    </>
                  ) : (
                    <>
                      <DollarSign className="mr-2 h-4 w-4" />
                      {t("compensation.markAllAsPaid")} ({unpaidLessonsCount})
                    </>
                  )}
                </Button>
              )
            }
          </div >
        </CardContent >
      </Card >

      <Card>
        <CardHeader>
          <CardTitle>{t("compensation.summaryTitle")}</CardTitle>
          <p className="text-sm text-gray-500">
            {t("compensation.summaryDescription", { count: filteredData.length })}
          </p>
        </CardHeader>
        <CardContent>
          {filteredData.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              {searchQuery
                ? t("compensation.noResultsFound")
                : t("compensation.noData")}
            </div>
          ) : (
            <div className="space-y-3">
              {filteredData.map((summary) => (
                <div key={summary.instructorId} className="border rounded-lg">
                  <div
                    className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50"
                    onClick={() => toggleInstructorExpansion(summary.instructorId)}
                  >
                    <div className="flex items-center gap-4 flex-1 min-w-0">
                      <div className="flex items-center gap-3 min-w-0">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="p-0 h-auto flex-shrink-0"
                        >
                          {expandedInstructors.has(summary.instructorId) ? (
                            <ChevronDown className="h-5 w-5" />
                          ) : (
                            <ChevronUp className="h-5 w-5" />
                          )}
                        </Button>
                        <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                          <span className="text-sm font-semibold text-blue-600">
                            {summary.instructorName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                          </span>
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-gray-900 truncate" title={summary.instructorName}>{summary.instructorName}</p>
                          <p className="text-sm text-gray-500 truncate">{summary.lessonCount} {t("compensation.lessons")}</p>
                        </div>
                      </div>
                    </div>

                    <div className="text-right flex-shrink-0 ml-4">
                      <p className="text-xl font-bold">{formatAmount(summary.totalCompensation)}</p>
                    </div>
                  </div>

                  {/* Expanded Lesson Details */}
                  {expandedInstructors.has(summary.instructorId) && (
                    <div className="border-t bg-gray-50 overflow-x-auto">
                      <div className="space-y-4">
                        {/* Mobile: Card View */}
                        <div className="block lg:hidden space-y-4">
                          {summary.lessons.map((lesson: LessonCompensationDetail) => (
                            <div key={lesson.lessonId} className="bg-white border rounded-lg p-4 shadow-sm space-y-3">
                              <div className="flex justify-between items-start">
                                <div>
                                  <div className="font-medium text-gray-900">{format(new Date(lesson.date), "MMM d, yyyy")}</div>
                                  <div className="text-sm text-gray-500">{lesson.time?.substring(0, 5) || "--:--"} ({lesson.duration?.toFixed(1) ?? "-"}h)</div>
                                </div>
                                <div className="text-right">
                                  <div className="font-medium text-gray-900">
                                    {user?.role === UserRole.SUPER_ADMIN && (
                                      <div className="text-xs text-gray-500 mb-0.5">{summary.instructorName}</div>
                                    )}
                                    {formatAmount(lesson.compensation)}
                                  </div>
                                  {lesson.compensationPaid ? (
                                    <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
                                      {t("compensation.paid")}
                                    </Badge>
                                  ) : (
                                    <span className="text-gray-400 text-xs">{t("compensation.unpaid")}</span>
                                  )}
                                </div>
                              </div>

                              <div className="pt-2 border-t border-gray-100 grid grid-cols-2 gap-2 text-sm">
                                <div>
                                  <span className="text-gray-500 block text-xs">{t("compensation.table.student", { defaultValue: "Student" })}</span>
                                  <span className="font-medium block truncate" title={lesson.studentName || ""}>{lesson.studentName || "-"}</span>
                                </div>
                                <div>
                                  <span className="text-gray-500 block text-xs">{t("compensation.table.product", { defaultValue: "Product" })}</span>
                                  <span className="font-medium block truncate" title={lesson.productName || lesson.categoryName || ""}>{lesson.productName || lesson.categoryName || "-"}</span>
                                </div>
                              </div>

                              {user?.role !== UserRole.INSTRUCTOR && !lesson.compensationPaid && (
                                <div className="pt-2 border-t border-gray-100 flex justify-end">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="w-full sm:w-auto"
                                    onClick={() => handleToggleLessonPaid(lesson.lessonId, lesson.compensationPaid)}
                                    disabled={updatingLessonId === lesson.lessonId}
                                  >
                                    {updatingLessonId === lesson.lessonId ? (
                                      <Loader2 className="h-3 w-3 animate-spin mr-2" />
                                    ) : (
                                      <CheckCircle2 className="h-3 w-3 mr-2" />
                                    )}
                                    {t("compensation.markAsPaid", { defaultValue: "Mark as Paid" })}
                                  </Button>
                                </div>
                              )}
                            </div>
                          ))}
                          {summary.lessons.length === 0 && (
                            <div className="text-center py-8 text-gray-500 italic">
                              {t("compensation.noLessonsFound", { defaultValue: "No lessons found for this period." })}
                            </div>
                          )}
                        </div>

                        {/* Desktop: Table View */}
                        <div className="hidden lg:block overflow-x-auto rounded-md border">
                          <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-100">
                              <tr>
                                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  {t("compensation.table.dateTime")}
                                </th>
                                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  {t("compensation.table.student")}
                                </th>
                                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  {t("compensation.table.product")}
                                </th>
                                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  {t("compensation.table.duration")}
                                </th>
                                <th scope="col" className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  {t("compensation.table.compensation")}
                                </th>
                                <th scope="col" className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  {t("compensation.table.paid")}
                                </th>
                                {user?.role !== UserRole.INSTRUCTOR && (
                                  <th scope="col" className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    {t("compensation.table.actions")}
                                  </th>
                                )}
                              </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                              {summary.lessons.length > 0 ? (
                                summary.lessons.map((lesson: LessonCompensationDetail) => {
                                  const isLoading = updatingLessonId === lesson.lessonId;
                                  return (
                                    <tr key={lesson.lessonId} className={lesson.compensationPaid ? 'bg-green-50' : ''}>
                                      <td className="px-4 py-4 whitespace-nowrap">
                                        <div className="font-medium text-gray-900">{format(new Date(lesson.date), "dd/MM/yyyy")}</div>
                                        <div className="text-sm text-gray-500">
                                          <Clock className="inline h-3 w-3 mr-1" />
                                          {lesson.time?.substring(0, 5) || "--:--"}
                                        </div>
                                      </td>
                                      <td className="px-4 py-4 whitespace-nowrap text-gray-900">
                                        {lesson.studentName || "-"}
                                      </td>
                                      <td className="px-4 py-4 whitespace-nowrap">
                                        <div className="font-medium text-gray-900">{lesson.productName || lesson.categoryName || "-"}</div>
                                        <div className="text-gray-500 text-xs">{lesson.categoryName}</div>
                                      </td>
                                      <td className="px-4 py-4 whitespace-nowrap text-gray-900">
                                        {lesson.duration?.toFixed(1) ?? "-"}h
                                      </td>
                                      <td className="px-4 py-4 whitespace-nowrap text-right">
                                        <div className="font-semibold text-gray-900">{formatAmount(lesson.compensation)}</div>
                                      </td>
                                      <td className="px-4 py-4 whitespace-nowrap text-center">
                                        {lesson.compensationPaid ? (
                                          <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
                                            {t("compensation.paid")}
                                          </Badge>
                                        ) : (
                                          <span className="text-gray-400 text-xs">{t("compensation.unpaid")}</span>
                                        )}
                                      </td>
                                      {user?.role !== UserRole.INSTRUCTOR && (
                                        <td className="px-4 py-4 whitespace-nowrap text-right text-sm font-medium">
                                          {!lesson.compensationPaid && (
                                            <Button
                                              size="sm"
                                              variant="ghost"
                                              className="h-8 px-2 text-green-600 hover:text-green-700 hover:bg-green-50"
                                              onClick={() => handleToggleLessonPaid(lesson.lessonId, lesson.compensationPaid)}
                                              disabled={isLoading}
                                            >
                                              {isLoading ? (
                                                <Loader2 className="h-4 w-4 animate-spin" />
                                              ) : (
                                                <>
                                                  <CheckCircle2 className="h-4 w-4 mr-1" />
                                                  <span className="sr-only">{t("compensation.markAsPaid")}</span>
                                                </>
                                              )}
                                            </Button>
                                          )}
                                        </td>
                                      )}
                                    </tr>
                                  );
                                })
                              ) : (
                                <tr>
                                  <td colSpan={user?.role !== UserRole.INSTRUCTOR ? 7 : 6} className="px-4 py-8 text-center text-gray-500">
                                    {t("compensation.noLessonsFound")}
                                  </td>
                                </tr>
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Bulk Mark as Paid Confirmation Dialog */}
      <AlertDialog open={showBulkPaidDialog} onOpenChange={setShowBulkPaidDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("compensation.bulkMarkPaidTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("compensation.bulkMarkPaidDescription", { count: unpaidLessonsCount })}
              <div className="mt-4 p-4 bg-amber-50 rounded-md border border-amber-200">
                <p className="text-sm font-medium text-amber-900">
                  {t("compensation.totalAmount")}: {formatAmount(totalUnpaidAmount)}
                </p>
                <p className="text-xs text-amber-700 mt-1">
                  {t("compensation.bulkMarkPaidWarning")}
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={bulkMarkPaidMutation.isPending}>
              {t("common.cancel")}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
                e.preventDefault();
                confirmBulkMarkAsPaid();
              }}
              disabled={bulkMarkPaidMutation.isPending}
              className="bg-green-600 hover:bg-green-700"
            >
              {bulkMarkPaidMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t("compensation.marking")}
                </>
              ) : (
                t("compensation.confirmMarkAsPaid")
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div >
  );
};

export default InstructorCompensationsPage;

