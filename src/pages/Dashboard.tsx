import React from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  Calendar,
  DollarSign,
  UserCheck,
  Clock,
  AlertCircle,
  RefreshCw,
  MoreVertical,
  User,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { lessonsApi, LessonListItem } from "../services/lessons";
import { instructorsApi } from "../services/instructors";
import { reportingApi } from "../services/reporting";
import { lessonCreationApi } from "../services/lessonCreation";
import { useAuthStore } from "../store/auth";
import { toast } from "react-hot-toast";

import { format } from "date-fns";

import { useSchoolSelectionStore } from "../store/schoolSelection";
import { useSchoolSettings } from "@/hooks/useSchoolSettings";

// Helper functions (shared between Dashboard and LessonCard)
const formatFullName = (firstName?: string | null, lastName?: string | null, fallback: string = 'Unknown'): string =>
  [firstName, lastName].filter(Boolean).join(' ') || fallback;

const getInitials = (firstName?: string | null, lastName?: string | null): string => {
  const first = firstName?.charAt(0)?.toUpperCase() || "";
  const last = lastName?.charAt(0)?.toUpperCase() || "";
  return (first + last) || "?";
};

const getSchoolInitials = (schoolName?: string | null): string => {
  if (!schoolName) return "?";
  const words = schoolName.trim().split(/\s+/);
  if (words.length >= 2) {
    return (words[0].charAt(0) + words[1].charAt(0)).toUpperCase();
  }
  return schoolName.charAt(0).toUpperCase() + (schoolName.charAt(1)?.toUpperCase() || "");
};

const formatDuration = (durationMinutes: number): string => {
  const hours = Math.floor(durationMinutes / 60);
  const minutes = durationMinutes % 60;
  if (hours > 0 && minutes > 0) {
    return `${hours}h ${minutes}m`;
  } else if (hours > 0) {
    return `${hours}h`;
  } else {
    return `${minutes}m`;
  }
};

const formatTime = (time?: string | null): string => {
  if (!time) return '';
  return time.substring(0, 5);
};

// Status constants for stable filtering (not affected by locale)
const WAITING_STATUS_NAME = "waiting";

const getLessonStatusBadgeClass = (statusName?: string | null): string => {
  if (!statusName) return "bg-gray-100 text-gray-800 hover:bg-gray-100 text-xs";
  switch (statusName.toLowerCase()) {
    case "pending":
    case "waiting":
      return "bg-yellow-100 text-yellow-800 hover:bg-yellow-100 text-xs";
    case "confirmed":
      return "bg-green-100 text-green-800 hover:bg-green-100 text-xs";
    default:
      return "bg-gray-100 text-gray-800 hover:bg-gray-100 text-xs";
  }
};

// LessonCard component to avoid duplication
interface LessonCardProps {
  lesson: LessonListItem;
  onLessonClick: (lessonId: string) => void;
  onConfirmLesson: (lessonId: string) => void;
  onMarkAsWaiting: (lessonId: string) => void;
  onMarkAsPaid: (lessonId: string) => void;
  onMarkAsUnpaid: (lessonId: string) => void;
  onMarkAsPartiallyPaid: (lessonId: string) => void;
  isInstructor: boolean;
  confirmedStatusName: string;
  t: (key: string, options?: { defaultValue?: string;[key: string]: any }) => string;
}

const LessonCard: React.FC<LessonCardProps> = ({
  lesson,
  onLessonClick,
  onConfirmLesson,
  onMarkAsWaiting,
  onMarkAsPaid,
  onMarkAsUnpaid,
  onMarkAsPartiallyPaid,
  isInstructor,
  confirmedStatusName,
  t,
}) => {
  const status = lesson.lesson_status_name?.toLowerCase();
  const normalizedConfirmedStatus = confirmedStatusName?.toLowerCase();
  const isWaiting = status === WAITING_STATUS_NAME;
  const isConfirmed = status === normalizedConfirmedStatus;
  const isUnpaid = lesson.payment_status_name === "not_paid" || lesson.payment_status_name == null;
  const isPaid = lesson.payment_status_name === "paid";
  const isPartiallyPaid = lesson.payment_status_name === "partially_paid";
  const studentName = formatFullName(lesson.student_first_name, lesson.student_last_name, t('common.unknownStudent', { defaultValue: 'Unknown Student' }));
  const studentInitials = getInitials(lesson.student_first_name, lesson.student_last_name);
  const instructorName = formatFullName(lesson.instructor_first_name, lesson.instructor_last_name, t('common.unknownInstructor', { defaultValue: 'Unknown Instructor' }));
  const instructorInitials = getInitials(lesson.instructor_first_name, lesson.instructor_last_name);
  const schoolName = lesson.school_name || t('common.unknownSchool', { defaultValue: 'Unknown School' });
  const schoolInitials = getSchoolInitials(lesson.school_name);

  // Determine border color based on lesson status
  let borderColor = "border-l-transparent";
  if (isWaiting) {
    borderColor = "border-l-4 border-l-yellow-400";
  } else if (isConfirmed) {
    borderColor = "border-l-4 border-l-green-500";
  }

  const lessonCardLabel = t("dashboard.lessonCard.ariaLabel", {
    defaultValue: `Lesson at ${formatTime(lesson.time)} with ${studentName}. Click to view details.`
  });

  const handleCardClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    if (
      target.closest('[role="menu"]') ||
      target.closest('[role="menuitem"]') ||
      target.closest('[data-radix-popper-content-wrapper]') ||
      target.closest('button[aria-haspopup="menu"]') ||
      target.closest('[data-radix-dropdown-menu-content]')
    ) {
      return;
    }
    onLessonClick(lesson.id);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onLessonClick(lesson.id);
    }
  };

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={lessonCardLabel}
      onClick={handleCardClick}
      onKeyDown={handleKeyDown}
      className={`w-full text-left relative bg-white border rounded-lg p-3 sm:p-4 cursor-pointer hover:shadow-md transition-shadow focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${borderColor}`}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0 pr-2">
          {/* Time and Duration on left, Product name beside */}
          <div className="flex items-start gap-3 sm:gap-4 mb-2 sm:mb-3">
            <div className="flex flex-col flex-shrink-0">
              <div className="text-sm font-semibold text-gray-900">
                {formatTime(lesson.time)}
              </div>
              <div className="text-xs text-gray-500">
                {formatDuration(lesson.duration)}
              </div>
            </div>
            <div className="text-sm font-medium text-gray-900 truncate line-clamp-1 min-w-0 flex-1">
              {lesson.product_name || lesson.discipline || t("dashboard.lesson", { defaultValue: "Lesson" })}
            </div>
          </div>

          {/* Student with avatar */}
          <div className="flex items-center gap-2 mb-2 min-w-0">
            <Avatar className="w-8 h-8 flex-shrink-0">
              <AvatarImage src={lesson.student_avatar || undefined} />
              <AvatarFallback className="bg-purple-100 text-purple-700 text-xs font-semibold">
                {studentInitials}
              </AvatarFallback>
            </Avatar>
            <div className="text-sm font-medium text-gray-900 truncate flex-1 min-w-0">
              {studentName}
            </div>
          </div>

          {/* Instructor with avatar (same size as student) */}
          <div className="flex items-center gap-2 mb-2 min-w-0">
            <Avatar className="w-8 h-8 flex-shrink-0">
              <AvatarImage src={lesson.instructor_avatar || undefined} />
              <AvatarFallback className="bg-gray-100 text-gray-700 text-xs font-semibold">
                {instructorInitials}
              </AvatarFallback>
            </Avatar>
            <div className="text-sm font-medium text-gray-900 truncate flex-1 min-w-0">
              {instructorName} <span className="text-gray-500 font-normal hidden sm:inline">{t("dashboard.instructor", { defaultValue: "Instructor" })}</span>
            </div>
          </div>

          {/* School with avatar */}
          {lesson.school_name && (
            <div className="flex items-center gap-2 mb-2 min-w-0">
              <Avatar className="w-8 h-8 flex-shrink-0">
                <AvatarImage src={lesson.school_logo || undefined} />
                <AvatarFallback className="bg-blue-100 text-blue-700 text-xs font-semibold">
                  {schoolInitials}
                </AvatarFallback>
              </Avatar>
              <div className="text-sm font-medium text-gray-900 truncate flex-1 min-w-0">
                {schoolName}
              </div>
            </div>
          )}

          {/* Discipline badge */}
          {lesson.discipline && (
            <Badge variant="outline" className="text-xs max-w-full truncate">
              {lesson.discipline}
            </Badge>
          )}
        </div>

        <div className="flex flex-col items-end gap-2 ml-2 sm:ml-4 flex-shrink-0">
          <div className="flex flex-col sm:flex-row gap-1 items-end sm:items-center">
            {lesson.lesson_status_name && (
              <Badge className={`${getLessonStatusBadgeClass(lesson.lesson_status_name)} whitespace-nowrap`}>
                {t(`dashboard.lessonStatus.${lesson.lesson_status_name}`, {
                  defaultValue: lesson.lesson_status_name.charAt(0).toUpperCase() + lesson.lesson_status_name.slice(1)
                })}
              </Badge>
            )}
            {isPaid && (
              <Badge className="bg-green-100 text-green-800 hover:bg-green-100 text-xs whitespace-nowrap">
                {t("dashboard.paid", { defaultValue: "Paid" })}
              </Badge>
            )}
            {isUnpaid && (
              <Badge className="bg-red-100 text-red-800 hover:bg-red-100 text-xs whitespace-nowrap">
                {t("dashboard.unpaid", { defaultValue: "Unpaid" })}
              </Badge>
            )}
            {isPartiallyPaid && (
              <Badge className="bg-orange-100 text-orange-800 hover:bg-orange-100 text-xs whitespace-nowrap">
                {t("dashboard.partiallyPaid", { defaultValue: "Partially Paid" })}
              </Badge>
            )}
          </div>

          {!isInstructor && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={(e) => e.stopPropagation()}
                >
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                {/* Lesson Status Section */}
                {status === WAITING_STATUS_NAME ? (
                  <DropdownMenuItem
                    onSelect={() => onConfirmLesson(lesson.id)}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <User className="mr-2 h-4 w-4" />
                    {t("dashboard.confirmLesson", { defaultValue: "Confirm lesson" })}
                  </DropdownMenuItem>
                ) : status === normalizedConfirmedStatus ? (
                  <DropdownMenuItem
                    onSelect={() => onMarkAsWaiting(lesson.id)}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <User className="mr-2 h-4 w-4" />
                    {t("dashboard.markAsWaiting", { defaultValue: "Mark as waiting" })}
                  </DropdownMenuItem>
                ) : null}

                {/* Payment Status Section */}
                <DropdownMenuSeparator />
                {isPaid ? (
                  <>
                    <DropdownMenuItem
                      onSelect={() => onMarkAsUnpaid(lesson.id)}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <DollarSign className="mr-2 h-4 w-4" />
                      {t("dashboard.markAsUnpaid", { defaultValue: "Mark as unpaid" })}
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onSelect={() => onMarkAsPartiallyPaid(lesson.id)}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <DollarSign className="mr-2 h-4 w-4" />
                      {t("dashboard.markAsPartiallyPaid", { defaultValue: "Mark as partial" })}
                    </DropdownMenuItem>
                  </>
                ) : isUnpaid ? (
                  <>
                    <DropdownMenuItem
                      onSelect={() => onMarkAsPaid(lesson.id)}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <DollarSign className="mr-2 h-4 w-4" />
                      {t("dashboard.markAsPaid", { defaultValue: "Mark as paid" })}
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onSelect={() => onMarkAsPartiallyPaid(lesson.id)}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <DollarSign className="mr-2 h-4 w-4" />
                      {t("dashboard.markAsPartiallyPaid", { defaultValue: "Mark as partial" })}
                    </DropdownMenuItem>
                  </>
                ) : isPartiallyPaid ? (
                  <>
                    <DropdownMenuItem
                      onSelect={() => onMarkAsPaid(lesson.id)}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <DollarSign className="mr-2 h-4 w-4" />
                      {t("dashboard.markAsPaid", { defaultValue: "Mark as paid" })}
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onSelect={() => onMarkAsUnpaid(lesson.id)}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <DollarSign className="mr-2 h-4 w-4" />
                      {t("dashboard.markAsUnpaid", { defaultValue: "Mark as unpaid" })}
                    </DropdownMenuItem>
                  </>
                ) : (
                  <>
                    <DropdownMenuItem
                      onSelect={() => onMarkAsPaid(lesson.id)}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <DollarSign className="mr-2 h-4 w-4" />
                      {t("dashboard.markAsPaid", { defaultValue: "Mark as paid" })}
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onSelect={() => onMarkAsUnpaid(lesson.id)}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <DollarSign className="mr-2 h-4 w-4" />
                      {t("dashboard.markAsUnpaid", { defaultValue: "Mark as unpaid" })}
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onSelect={() => onMarkAsPartiallyPaid(lesson.id)}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <DollarSign className="mr-2 h-4 w-4" />
                      {t("dashboard.markAsPartiallyPaid", { defaultValue: "Mark as partial" })}
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>
    </div>
  );
};

const Dashboard: React.FC = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();

  const { user } = useAuthStore();
  const { selectedSchoolId, instructorSelectedSchoolId } = useSchoolSelectionStore();
  const isInstructor = user?.role === "INSTRUCTOR";
  const getTargetSchoolId = () => {
    if (user?.role === "SUPER_ADMIN") return selectedSchoolId || undefined;
    if (isInstructor) {
      // For instructors, we don't mandatorily filter by school unless one is specifically selected
      // If ALL_SCHOOLS_ID is selected, we return undefined to fetch for all schools
      return (instructorSelectedSchoolId && instructorSelectedSchoolId !== "ALL") ? instructorSelectedSchoolId : undefined;
    }
    return user?.schoolId;
  };
  const targetSchoolId = getTargetSchoolId();

  // School settings for currency (must be before any early returns)
  const { settings: schoolSettings } = useSchoolSettings(targetSchoolId);

  const [isLoading, setIsLoading] = React.useState(true);
  const [isLoadingPayments, setIsLoadingPayments] = React.useState(true);
  const [statsData, setStatsData] = React.useState({
    lessonsToday: 0,
    lessonsTodayChange: 0 as number | null,
    pendingLessons: 0,
    pendingLessonsChange: 0 as number | null,
    totalPayments: 0,
    totalPaymentsChange: 0 as number | null,
    activeInstructors: 0,
    activeInstructorsChange: 0 as number | null,
  });
  const [todayLessons, setTodayLessons] = React.useState<LessonListItem[]>([]);
  const [tomorrowLessons, setTomorrowLessons] = React.useState<LessonListItem[]>([]);
  const todayLessonsRef = React.useRef<LessonListItem[]>([]);
  const tomorrowLessonsRef = React.useRef<LessonListItem[]>([]);
  const inFlightRequestsRef = React.useRef<Set<string>>(new Set());
  const [error, setError] = React.useState<string | null>(null);
  const [retryCount, setRetryCount] = React.useState(0);
  const [activeTab, setActiveTab] = React.useState<"today" | "tomorrow">("today");

  // Keep refs in sync with state
  React.useEffect(() => {
    todayLessonsRef.current = todayLessons;
  }, [todayLessons]);

  React.useEffect(() => {
    tomorrowLessonsRef.current = tomorrowLessons;
  }, [tomorrowLessons]);

  // Status constants for stable filtering (not affected by locale)
  const PENDING_STATUS_NAME = "pending";
  const CONFIRMED_STATUS_NAME = "confirmed";
  const PAID_STATUS_NAME = "paid";

  // Fetch lesson and payment statuses (scoped by school to prevent cache bleed)
  const { data: lessonStatuses = [] } = useQuery({
    queryKey: ["lesson-statuses", targetSchoolId],
    queryFn: () => lessonCreationApi.getLessonStatuses(targetSchoolId || undefined),
    staleTime: 300000,
    enabled: Boolean(targetSchoolId) || isInstructor,
  });

  const { data: paymentStatuses = [] } = useQuery({
    queryKey: ["payment-statuses", targetSchoolId],
    queryFn: () => lessonCreationApi.getPaymentStatuses(targetSchoolId || undefined),
    staleTime: 300000,
    enabled: Boolean(targetSchoolId) || isInstructor,
  });

  // Fetch instructor stats using React Query to prevent duplicate calls
  const { data: instructorStats, isLoading: isLoadingStats } = useQuery({
    queryKey: ["instructor-stats", targetSchoolId],
    queryFn: () => instructorsApi.getStats(targetSchoolId || undefined),
    enabled: !isInstructor && Boolean(targetSchoolId),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Helper function to extract error message from API error
  const getErrorMessage = (error: any): string => {
    if (error?.response?.data?.error) {
      return error.response.data.error;
    }
    if (error?.response?.data?.message) {
      return error.response.data.message;
    }
    if (error?.message) {
      return error.message;
    }
    return "";
  };

  React.useEffect(() => {
    let isMounted = true; // Track if component is still mounted

    const fetchData = async () => {
      if (!isInstructor && !targetSchoolId) return;

      try {
        setIsLoading(true);
        const today = new Date();
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        const todayStr = format(today, "yyyy-MM-dd");
        const tomorrowStr = format(tomorrow, "yyyy-MM-dd");

        // Single API call for both days
        const allLessonsData = await lessonsApi.listByRange({
          startDate: todayStr,
          endDate: tomorrowStr,
          schoolId: targetSchoolId,
          instructorId: isInstructor ? user?.id : undefined,
        });

        // Filter client-side
        const todayLessonsData = allLessonsData.filter((l) => l.date === todayStr);
        const tomorrowLessonsData = allLessonsData.filter((l) => l.date === tomorrowStr);

        // Only update state if component is still mounted
        if (!isMounted) return;

        // Instructor avatars are already included in lesson responses from backend
        const finalTodayLessons = todayLessonsData;
        const finalTomorrowLessons = tomorrowLessonsData;

        // Sort lessons by time (ascending)
        const sortLessonsByTime = (lessons: LessonListItem[]) => {
          return [...lessons].sort((a, b) => {
            const timeA = a.time || "00:00:00";
            const timeB = b.time || "00:00:00";
            return timeA.localeCompare(timeB);
          });
        };

        setTodayLessons(sortLessonsByTime(finalTodayLessons));
        setTomorrowLessons(sortLessonsByTime(finalTomorrowLessons));

        // Calculate Stats
        const lessonsCount = todayLessonsData.length;

        // Use stable status name constant instead of hardcoded string
        // Include both "pending" and "waiting" statuses in pending count (by lesson status only)
        const pendingCount = todayLessonsData.filter(l => {
          const lessonStatus = l.lesson_status_name?.toLowerCase();
          return lessonStatus === PENDING_STATUS_NAME ||
            lessonStatus === WAITING_STATUS_NAME;
        }).length;

        setStatsData({
          lessonsToday: lessonsCount,
          lessonsTodayChange: null, // Historical data not yet implemented
          pendingLessons: pendingCount,
          pendingLessonsChange: null,
          totalPayments: 0, // Will be updated by lazy-loaded reporting data
          totalPaymentsChange: null,
          activeInstructors: 0, // Not used - value comes directly from instructorStats API
          activeInstructorsChange: null,
        });

      } catch (error) {
        // Don't log errors if component unmounted
        if (!isMounted) return;
        console.error("Failed to fetch dashboard data:", error);
        const errorMessage = error instanceof Error ? error.message : "Failed to load dashboard data";
        setError(errorMessage);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    if (isInstructor || targetSchoolId) {
      fetchData();
    } else if (user?.role === "SUPER_ADMIN" && !targetSchoolId) {
      // Super admin with no school selected might want to see nothing or everything?
      // Usually dashboard requires a school context for stats or shows empty.
      // But assuming existing behavior was fine for super admin.
      setIsLoading(false);
    } else {
      // Fallback
      setIsLoading(false);
    }

    return () => {
      isMounted = false;
    };
  }, [targetSchoolId, retryCount, isInstructor]);


  // Lazy load reporting data after initial render
  React.useEffect(() => {
    if (isInstructor || !targetSchoolId) {
      setIsLoadingPayments(false); // No payments data for instructors
      return;
    }

    const fetchReporting = async () => {
      const today = new Date();
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);

      try {
        setIsLoadingPayments(true);
        const reportingData = await reportingApi.getReportingData(
          targetSchoolId,
          format(startOfMonth, "yyyy-MM-dd"),
          format(endOfMonth, "yyyy-MM-dd")
        );

        setStatsData((prev) => ({
          ...prev,
          totalPayments: reportingData.overview.totalRevenue || 0,
        }));
      } catch (error) {
        console.error("Failed to fetch reporting data:", error);
      } finally {
        setIsLoadingPayments(false);
      }
    };

    // Delay reporting fetch by 500ms to prioritize critical data
    const timeoutId = setTimeout(fetchReporting, 500);
    return () => clearTimeout(timeoutId);
  }, [targetSchoolId, isInstructor]);

  // Helper function to optimistically update a lesson in both arrays
  const updateLessonOptimistically = (
    lessonId: string,
    updates: { lesson_status_name?: string; payment_status_name?: string }
  ): { previousLesson: LessonListItem | null; wasPending: boolean; isInToday: boolean } => {
    const currentTodayLessons = todayLessonsRef.current;
    const currentTomorrowLessons = tomorrowLessonsRef.current;

    // Find lesson in today's array
    const todayLessonIndex = currentTodayLessons.findIndex(lesson => lesson.id === lessonId);
    let previousLesson: LessonListItem | null = null;
    let wasPending = false;
    let isInToday = false;

    if (todayLessonIndex !== -1) {
      const lesson = currentTodayLessons[todayLessonIndex];
      previousLesson = { ...lesson }; // Save previous state for rollback
      const lessonStatus = lesson.lesson_status_name?.toLowerCase();
      wasPending = lessonStatus === PENDING_STATUS_NAME || lessonStatus === WAITING_STATUS_NAME;
      isInToday = true;
    } else {
      // Check tomorrow's lessons (only if not found in today)
      const tomorrowLessonIndex = currentTomorrowLessons.findIndex(lesson => lesson.id === lessonId);
      if (tomorrowLessonIndex !== -1) {
        const lesson = currentTomorrowLessons[tomorrowLessonIndex];
        previousLesson = { ...lesson }; // Save previous state for rollback
        const lessonStatus = lesson.lesson_status_name?.toLowerCase();
        wasPending = lessonStatus === PENDING_STATUS_NAME || lessonStatus === WAITING_STATUS_NAME;
        isInToday = false;
      }
    }

    setTodayLessons(currentTodayLessons =>
      currentTodayLessons.map(lesson =>
        lesson.id === lessonId ? { ...lesson, ...updates } : lesson
      )
    );

    setTomorrowLessons(currentTomorrowLessons =>
      currentTomorrowLessons.map(lesson =>
        lesson.id === lessonId ? { ...lesson, ...updates } : lesson
      )
    );

    // Update stats only if lesson_status_name changed AND lesson is in today's list
    if (previousLesson && isInToday && updates.lesson_status_name !== undefined) {
      const updateStatus = updates.lesson_status_name?.toLowerCase();
      const isNowPending = updateStatus === PENDING_STATUS_NAME || updateStatus === WAITING_STATUS_NAME;

      setStatsData(prev => {
        let pendingCount = prev.pendingLessons;
        if (wasPending && !isNowPending) {
          pendingCount = Math.max(0, pendingCount - 1);
        } else if (!wasPending && isNowPending) {
          pendingCount = pendingCount + 1;
        }

        return {
          ...prev,
          pendingLessons: pendingCount,
        };
      });
    }

    return { previousLesson, wasPending, isInToday };
  };

  // Helper function to rollback optimistic update on error
  const rollbackLessonUpdate = (
    lessonId: string,
    previousLesson: LessonListItem | null,
    wasPending: boolean,
    isInToday: boolean
  ) => {
    if (!previousLesson) return;

    // Get current optimistically updated lesson state before restoring
    let currentLesson: LessonListItem | null = null;
    if (isInToday) {
      currentLesson = todayLessonsRef.current.find(lesson => lesson.id === lessonId) || null;
    } else {
      currentLesson = tomorrowLessonsRef.current.find(lesson => lesson.id === lessonId) || null;
    }

    // Restore today's lessons
    setTodayLessons(prev => {
      return prev.map(lesson => {
        if (lesson.id === lessonId) {
          return previousLesson;
        }
        return lesson;
      });
    });

    // Restore tomorrow's lessons
    setTomorrowLessons(prev => {
      return prev.map(lesson => {
        if (lesson.id === lessonId) {
          return previousLesson;
        }
        return lesson;
      });
    });

    if (isInToday && currentLesson) {
      setStatsData(prev => {
        const currentStatus = currentLesson!.lesson_status_name?.toLowerCase();
        const isNowPending = currentStatus === PENDING_STATUS_NAME || currentStatus === WAITING_STATUS_NAME;

        let pendingCount = prev.pendingLessons;
        if (wasPending && !isNowPending) {
          pendingCount = pendingCount + 1;
        } else if (!wasPending && isNowPending) {
          pendingCount = Math.max(0, pendingCount - 1);
        }

        return {
          ...prev,
          pendingLessons: pendingCount,
        };
      });
    }
  };

  const handleConfirmLesson = async (lessonId: string) => {
    // Prevent concurrent updates on the same lesson
    if (inFlightRequestsRef.current.has(lessonId)) {
      return;
    }

    const confirmedStatus = lessonStatuses.find(s => s.name === CONFIRMED_STATUS_NAME);
    if (!confirmedStatus) {
      toast.error(t("dashboard.statusNotFound", { defaultValue: "Confirmed status not found" }));
      return;
    }

    inFlightRequestsRef.current.add(lessonId);
    const { previousLesson, wasPending, isInToday } = updateLessonOptimistically(lessonId, { lesson_status_name: CONFIRMED_STATUS_NAME });

    try {
      await lessonsApi.update(lessonId, { lessonStatusId: confirmedStatus.id });
      toast.success(t("dashboard.lessonConfirmed", { defaultValue: "Lesson confirmed" }));
    } catch (error: any) {
      // Rollback optimistic update on error
      if (previousLesson) {
        rollbackLessonUpdate(lessonId, previousLesson, wasPending, isInToday);
      }
      setRetryCount(c => c + 1);
      console.error("Failed to confirm lesson:", error);
      toast.error(getErrorMessage(error) || t("dashboard.confirmFailed", { defaultValue: "Failed to confirm lesson" }));
    } finally {
      inFlightRequestsRef.current.delete(lessonId);
    }
  };

  const handleMarkAsPaid = async (lessonId: string) => {
    // Prevent concurrent updates on the same lesson
    if (inFlightRequestsRef.current.has(lessonId)) {
      return;
    }

    const paidStatus = paymentStatuses.find(s => s.name === PAID_STATUS_NAME);
    if (!paidStatus) {
      toast.error(t("dashboard.statusNotFound", { defaultValue: "Paid status not found" }));
      return;
    }

    inFlightRequestsRef.current.add(lessonId);
    // Optimistically update UI and capture previous state for rollback
    const { previousLesson, wasPending, isInToday } = updateLessonOptimistically(lessonId, { payment_status_name: PAID_STATUS_NAME });

    try {
      await lessonsApi.update(lessonId, { paymentStatusId: paidStatus.id });
      toast.success(t("dashboard.markedAsPaid", { defaultValue: "Lesson marked as paid" }));
    } catch (error: any) {
      // Rollback optimistic update on error
      if (previousLesson) {
        rollbackLessonUpdate(lessonId, previousLesson, wasPending, isInToday);
      }
      setRetryCount(c => c + 1);
      console.error("Failed to mark lesson as paid:", error);
      toast.error(getErrorMessage(error) || t("dashboard.markPaidFailed", { defaultValue: "Failed to mark lesson as paid" }));
    } finally {
      inFlightRequestsRef.current.delete(lessonId);
    }
  };

  const handleMarkAsWaiting = async (lessonId: string) => {
    // Prevent concurrent updates on the same lesson
    if (inFlightRequestsRef.current.has(lessonId)) {
      return;
    }

    const waitingStatus = lessonStatuses.find(s => s.name === WAITING_STATUS_NAME);
    if (!waitingStatus) {
      toast.error(t("dashboard.statusNotFound", { defaultValue: "Waiting status not found" }));
      return;
    }

    inFlightRequestsRef.current.add(lessonId);
    // Optimistically update UI and capture previous state for rollback
    const { previousLesson, wasPending, isInToday } = updateLessonOptimistically(lessonId, { lesson_status_name: WAITING_STATUS_NAME });

    try {
      await lessonsApi.update(lessonId, { lessonStatusId: waitingStatus.id });
      toast.success(t("dashboard.markedAsWaiting", { defaultValue: "Lesson marked as waiting" }));
    } catch (error: any) {
      // Rollback optimistic update on error
      if (previousLesson) {
        rollbackLessonUpdate(lessonId, previousLesson, wasPending, isInToday);
      }
      setRetryCount(c => c + 1);
      console.error("Failed to mark lesson as waiting:", error);
      toast.error(getErrorMessage(error) || t("dashboard.markWaitingFailed", { defaultValue: "Failed to mark lesson as waiting" }));
    } finally {
      inFlightRequestsRef.current.delete(lessonId);
    }
  };

  const handleMarkAsUnpaid = async (lessonId: string) => {
    // Prevent concurrent updates on the same lesson
    if (inFlightRequestsRef.current.has(lessonId)) {
      return;
    }

    // Use proper undefined for "not_paid" status as per API expectation
    const notPaidStatusId = undefined;

    inFlightRequestsRef.current.add(lessonId);
    // Optimistically update UI and capture previous state for rollback
    const { previousLesson, wasPending, isInToday } = updateLessonOptimistically(lessonId, { payment_status_name: "not_paid" });

    try {
      await lessonsApi.update(lessonId, { paymentStatusId: notPaidStatusId });
      toast.success(t("dashboard.markedAsUnpaid", { defaultValue: "Lesson marked as unpaid" }));
    } catch (error: any) {
      // Rollback optimistic update on error
      if (previousLesson) {
        rollbackLessonUpdate(lessonId, previousLesson, wasPending, isInToday);
      }
      setRetryCount(c => c + 1);
      console.error("Failed to mark lesson as unpaid:", error);
      toast.error(getErrorMessage(error) || t("dashboard.markUnpaidFailed", { defaultValue: "Failed to mark lesson as unpaid" }));
    } finally {
      inFlightRequestsRef.current.delete(lessonId);
    }
  };

  const handleMarkAsPartiallyPaid = async (lessonId: string) => {
    // Prevent concurrent updates on the same lesson
    if (inFlightRequestsRef.current.has(lessonId)) {
      return;
    }

    const partiallyPaidStatus = paymentStatuses.find(s => s.name === "partially_paid");
    if (!partiallyPaidStatus) {
      toast.error(t("dashboard.statusNotFound", { defaultValue: "Partially paid status not found" }));
      return;
    }

    inFlightRequestsRef.current.add(lessonId);
    // Optimistically update UI and capture previous state for rollback
    const { previousLesson, wasPending, isInToday } = updateLessonOptimistically(lessonId, { payment_status_name: "partially_paid" });

    try {
      await lessonsApi.update(lessonId, { paymentStatusId: partiallyPaidStatus.id });
      toast.success(t("dashboard.markedAsPartiallyPaid", { defaultValue: "Lesson marked as partially paid" }));
    } catch (error: any) {
      // Rollback optimistic update on error
      if (previousLesson) {
        rollbackLessonUpdate(lessonId, previousLesson, wasPending, isInToday);
      }
      setRetryCount(c => c + 1);
      console.error("Failed to mark lesson as partially paid:", error);
      toast.error(getErrorMessage(error) || t("dashboard.markPartiallyPaidFailed", { defaultValue: "Failed to mark lesson as partially paid" }));
    } finally {
      inFlightRequestsRef.current.delete(lessonId);
    }
  };

  // Navigation handlers
  const handleLessonsTodayClick = () => navigate(isInstructor ? "/instructor-calendar" : "/calendar");
  const handlePendingLessonsClick = () => navigate(isInstructor ? "/instructor-calendar" : "/calendar");
  const handleActiveInstructorsClick = () => navigate("/instructors");
  const handleLessonClick = (lessonId: string) => navigate(`/lessons/${lessonId}`, { state: { from: 'dashboard' } });

  if (isLoading) {
    return (
      <div className="space-y-4 sm:space-y-6">
        {/* Page header skeleton */}
        <div>
          <Skeleton className="h-8 w-48 mb-2" />
          <Skeleton className="h-4 w-96 hidden md:block" />
        </div>

        {/* Stats grid skeleton */}
        <div className={`grid grid-cols-1 gap-3 sm:gap-5 sm:grid-cols-2 ${isInstructor ? 'lg:grid-cols-3' : 'lg:grid-cols-4'}`}>
          {Array.from({ length: isInstructor ? 3 : 4 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4 sm:p-6">
                <div className="flex items-center">
                  <Skeleton className="h-10 w-10 rounded-lg" />
                  <div className="ml-3 sm:ml-4 flex-1">
                    <Skeleton className="h-4 w-24 mb-2" />
                    <Skeleton className="h-7 w-16 mb-1" />
                    <Skeleton className="h-3 w-20" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Schedule section skeleton */}
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-40" />
          </CardHeader>
          <CardContent>
            {/* Tabs skeleton */}
            <div className="grid w-full grid-cols-2 mb-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>

            {/* Lesson count skeleton */}
            <Skeleton className="h-4 w-64 mb-4" />

            {/* Lesson items skeleton */}
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="border rounded-lg p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start gap-4 mb-3">
                        <div className="flex flex-col gap-2">
                          <Skeleton className="h-5 w-16" />
                          <Skeleton className="h-4 w-12" />
                        </div>
                        <Skeleton className="h-5 w-32" />
                      </div>

                      <div className="flex items-center gap-2 mb-2">
                        <Skeleton className="h-8 w-8 rounded-full" />
                        <Skeleton className="h-4 w-32" />
                      </div>

                      <div className="flex items-center gap-2 mb-2">
                        <Skeleton className="h-8 w-8 rounded-full" />
                        <Skeleton className="h-4 w-40" />
                      </div>

                      <Skeleton className="h-5 w-20 rounded-full" />
                    </div>

                    <div className="flex flex-col items-end gap-2 ml-4">
                      <div className="flex gap-1">
                        <Skeleton className="h-5 w-16 rounded-full" />
                        <Skeleton className="h-5 w-14 rounded-full" />
                      </div>
                      <Skeleton className="h-8 w-8 rounded-md" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!isInstructor && !targetSchoolId) {
    return (
      <div className="flex h-96 items-center justify-center flex-col space-y-4">
        <div className="text-xl font-semibold text-gray-700">{t("dashboard.selectSchoolTitle")}</div>
        <p className="text-gray-500">{t("dashboard.selectSchoolDescription")}</p>
      </div>
    );
  }

  // Error state with retry
  if (error) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center text-center space-y-4">
              <AlertCircle className="h-12 w-12 text-red-500" />
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  {t("dashboard.errorTitle", { defaultValue: "Failed to Load Dashboard" })}
                </h3>
                <p className="text-sm text-gray-600 mt-2">{error}</p>
              </div>
              <Button
                onClick={() => {
                  setError(null);
                  setRetryCount(c => c + 1);
                }}
                className="mt-4"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                {t("dashboard.retry", { defaultValue: "Retry" })}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Currency formatter using user's locale and school default currency (fallback to EUR)
  const currencyFormatter = new Intl.NumberFormat(i18n.language, {
    style: 'currency',
    currency: schoolSettings?.defaultCurrency || 'EUR',
  });

  const stats = [
    {
      title: t("dashboard.lessonsToday"),
      value: isLoading ? "-" : statsData.lessonsToday.toString(),
      change: t("dashboard.stats.today"),
      icon: Calendar,
      color: "text-blue-600",
      bgColor: "bg-blue-50",
      onClick: handleLessonsTodayClick,
      clickable: true,
    },
    {
      title: t("dashboard.pendingLessons"),
      value: isLoading ? "-" : statsData.pendingLessons.toString(),
      change: t("dashboard.stats.needsAction"),
      icon: Clock,
      color: "text-yellow-600",
      bgColor: "bg-yellow-50",
      onClick: handlePendingLessonsClick,
      clickable: true,
    },
    {
      title: t("dashboard.totalPayments"),
      value: isLoadingPayments ? "-" : currencyFormatter.format(statsData.totalPayments),
      change: t("dashboard.stats.thisMonth"),
      icon: DollarSign,
      color: "text-green-600",
      bgColor: "bg-green-50",
      onClick: undefined,
      clickable: false,
    },
    {
      title: t("dashboard.activeInstructors"),
      value: isLoadingStats ? "-" : (instructorStats?.activeCount || 0).toString(),
      change: t("dashboard.stats.availableNow"),
      icon: UserCheck,
      color: "text-purple-600",
      bgColor: "bg-purple-50",
      onClick: handleActiveInstructorsClick,
      clickable: true,
    },
  ].filter((_, index) => !isInstructor || index < 3); // Remove active instructors card for instructors

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          {t("dashboard.title")}
        </h1>
        <p className="hidden md:block text-gray-600">
          {t("dashboard.welcomeMessage", { defaultValue: "Welcome back! Here's what's happening today." })}
        </p>
      </div>

      {/* Stats grid */}
      <div className={`grid grid-cols-1 gap-4 sm:gap-5 sm:grid-cols-2 ${isInstructor ? 'lg:grid-cols-3' : 'lg:grid-cols-4'}`}>
        {stats.map((stat) => (
          <Card
            key={stat.title}
            className={stat.clickable ? "cursor-pointer hover:shadow-md transition-shadow" : ""}
            onClick={stat.onClick}
          >
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center">
                <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                  <stat.icon className={`h-5 w-5 sm:h-6 sm:w-6 ${stat.color}`} />
                </div>
                <div className="ml-3 sm:ml-4">
                  <p className="text-xs sm:text-sm font-medium text-gray-600">
                    {stat.title}
                  </p>
                  <p className="text-xl sm:text-2xl font-bold text-gray-900">
                    {stat.value}
                  </p>
                  <p className="text-xs text-gray-500">{stat.change}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Schedule section */}
      <Card>
        <CardHeader>
          <CardTitle>{t("dashboard.lessonSchedule", { defaultValue: "Lesson Schedule" })}</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "today" | "tomorrow")}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="today">
                {t("dashboard.today", { defaultValue: "Today" })} ({todayLessons.length})
              </TabsTrigger>
              <TabsTrigger value="tomorrow">
                {t("dashboard.tomorrow", { defaultValue: "Tomorrow" })} ({tomorrowLessons.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="today" className="mt-4">
              <p className="text-sm text-gray-600 mb-4">
                {t("dashboard.todayLessonsCount", { count: todayLessons.length, defaultValue: `${todayLessons.length} lessons scheduled for today` })}
              </p>
              <div className="space-y-3">
                {todayLessons.length > 0 ? (
                  todayLessons.map((lesson) => (
                    <LessonCard
                      key={lesson.id}
                      lesson={lesson}
                      onLessonClick={handleLessonClick}
                      onConfirmLesson={handleConfirmLesson}
                      onMarkAsWaiting={handleMarkAsWaiting}
                      onMarkAsPaid={handleMarkAsPaid}
                      onMarkAsUnpaid={handleMarkAsUnpaid}
                      onMarkAsPartiallyPaid={handleMarkAsPartiallyPaid}
                      isInstructor={isInstructor}
                      confirmedStatusName={CONFIRMED_STATUS_NAME}
                      t={t}
                    />
                  ))
                ) : (
                  <p className="text-gray-500 text-center py-8">
                    {t("dashboard.noLessons")}
                  </p>
                )}
              </div>
            </TabsContent>

            <TabsContent value="tomorrow" className="mt-4">
              <p className="text-sm text-gray-600 mb-4">
                {t("dashboard.tomorrowLessonsCount", { count: tomorrowLessons.length, defaultValue: `${tomorrowLessons.length} lessons scheduled for tomorrow` })}
              </p>
              <div className="space-y-3">
                {tomorrowLessons.length > 0 ? (
                  tomorrowLessons.map((lesson) => (
                    <LessonCard
                      key={lesson.id}
                      lesson={lesson}
                      onLessonClick={handleLessonClick}
                      onConfirmLesson={handleConfirmLesson}
                      onMarkAsWaiting={handleMarkAsWaiting}
                      onMarkAsPaid={handleMarkAsPaid}
                      onMarkAsUnpaid={handleMarkAsUnpaid}
                      onMarkAsPartiallyPaid={handleMarkAsPartiallyPaid}
                      isInstructor={isInstructor}
                      confirmedStatusName={CONFIRMED_STATUS_NAME}
                      t={t}
                    />
                  ))
                ) : (
                  <p className="text-gray-500 text-center py-8">
                    {t("dashboard.noLessons")}
                  </p>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default Dashboard;
