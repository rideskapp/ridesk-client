import React, { useState, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/store/auth";
import {
  User,
  Mail,
  Phone,
  Award,
  Languages,
  Trash2,
  Edit as EditIcon,
  Globe,
  BookOpen,
  X,
  ArrowLeft,
  DollarSign,
  Calendar,
  Clock,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PhoneInput } from "@/components/ui/PhoneInput";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "react-hot-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { CustomUploadButton } from "@/components/schools/CustomUploadButton";
import { useParams, useNavigate } from "react-router-dom";
import { useSchoolSelectionStore } from "@/store/schoolSelection";
import { lessonsApi, LessonListItem } from "@/services/lessons";
import { compensationApi, InstructorRatesData } from "@/services/compensation";
import { instructorsApi, StudentFromLessons } from "@/services/instructors";
import { api } from "@/lib/api";
import { UserRole } from "@/types";
import { format } from "date-fns";
import enUS from "date-fns/locale/en-US";
import it from "date-fns/locale/it";

import { getProfileField } from "@/utils/profileHelpers";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { formatCurrency } from "@/lib/utils";

interface RatesTabContentProps {
  instructorId: string | undefined;
  availableSchools: any[];
  selectedSchoolForRates: string | null;
  setSelectedSchoolForRates: (schoolId: string | null) => void;
  isLoadingSchools: boolean;
}

const RatesTabContent: React.FC<RatesTabContentProps> = ({
  instructorId,
  availableSchools,
  selectedSchoolForRates,
  setSelectedSchoolForRates,
  isLoadingSchools,
}) => {
  const { t } = useTranslation();

  // Fetch unified rates data (rates, school settings, categories)
  const { data: ratesData, isLoading: isLoadingRatesData } =
    useQuery<InstructorRatesData>({
      queryKey: ["instructor-rates-data", instructorId, selectedSchoolForRates],
      queryFn: () => {
        if (!instructorId || !selectedSchoolForRates) {
          throw new Error("Instructor ID and School ID are required");
        }
        return compensationApi.getInstructorRatesData(
          instructorId,
          selectedSchoolForRates,
        );
      },
      enabled: !!instructorId && !!selectedSchoolForRates,
    });

  const rates = ratesData?.rates || [];
  const schoolSettings = ratesData?.schoolSettings;
  const categories = ratesData?.categories || [];
  const isLoading = isLoadingRatesData;

  const getCategoryById = (categoryId: string) => {
    return categories.find((cat) => cat.id === categoryId);
  };

  if (isLoadingSchools) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          {t("common.loading", { defaultValue: "Loading..." })}
        </CardContent>
      </Card>
    );
  }

  if (availableSchools.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center text-gray-500">
          {t("profile.noSchoolsAssigned", {
            defaultValue: "No schools assigned to this instructor.",
          })}
        </CardContent>
      </Card>
    );
  }

  const selectedSchool = availableSchools.find(
    (s: any) => s.schoolId === selectedSchoolForRates,
  );
  const isVariableCompensation =
    schoolSettings?.compensationMode === "variable";

  const formatRate = (value: number) =>
    formatCurrency(value, "EUR", "it-IT");

  return (
    <div className="space-y-6">
      {/* School Selector */}
      {availableSchools.length > 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center text-lg">
              <Globe className="w-5 h-5 mr-2 text-pink-600" />
              {t("profile.selectSchool", { defaultValue: "Select School" })}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Select
              value={selectedSchoolForRates || ""}
              onValueChange={(value) => setSelectedSchoolForRates(value)}
            >
              <SelectTrigger>
                <SelectValue
                  placeholder={t("profile.selectSchool", {
                    defaultValue: "Select School",
                  })}
                />
              </SelectTrigger>
              <SelectContent>
                {availableSchools.map((school: any) => (
                  <SelectItem key={school.schoolId} value={school.schoolId}>
                    {school.schoolName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>
      )}

      {/* Rates Display */}
      {selectedSchoolForRates && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center text-lg">
              <DollarSign className="w-5 h-5 mr-2 text-pink-600" />
              {t("profile.rates", { defaultValue: "Rates" })}
              {selectedSchool && (
                <span className="ml-2 text-sm font-normal text-gray-500">
                  - {selectedSchool.schoolName}
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="p-8 text-center">
                {t("common.loading", { defaultValue: "Loading..." })}
              </div>
            ) : !isVariableCompensation ? (
              <div className="p-8 text-center text-gray-500">
                <p className="mb-2">
                  {t("profile.fixedCompensationMessage", {
                    defaultValue: "This school uses fixed compensation mode.",
                  })}
                </p>
                <p className="text-sm">
                  {t("profile.noRatesForFixedCompensation", {
                    defaultValue:
                      "Rates are not applicable for fixed compensation.",
                  })}
                </p>
              </div>
            ) : rates.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                {t("profile.noRatesConfigured", {
                  defaultValue: "No rates configured for this school.",
                })}
              </div>
            ) : (
              <div className="space-y-3">
                {rates.map((rate) => {
                  const category = getCategoryById(rate.category_id);
                  return (
                    <div
                      key={rate.id}
                      className="flex items-center justify-between p-4 border rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <Badge
                          style={{
                            backgroundColor: category?.color || "#6B7280",
                            color: "white",
                          }}
                          className="min-w-[120px]"
                        >
                          {category?.name ||
                            t("compensation.unknown", {
                              defaultValue: "Unknown",
                            })}
                        </Badge>
                        <span className="text-sm font-medium">
                          {formatRate(rate.rate_value)}/hour
                        </span>
                      </div>
                      {!rate.is_active && (
                        <Badge variant="outline" className="text-xs">
                          {t("common.inactive", { defaultValue: "Inactive" })}
                        </Badge>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

interface LessonsTabContentProps {
  instructorId: string | undefined;
  effectiveSchoolId: string | null | undefined;
}

const LessonsTabContent: React.FC<LessonsTabContentProps> = ({
  instructorId,
  effectiveSchoolId,
}) => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [upcomingLessonsPage, setUpcomingLessonsPage] = useState(1);
  const [recentLessonsPage, setRecentLessonsPage] = useState(1);
  const itemsPerPage = 10;

  const locale = i18n.language === "it" ? it : enUS;

  // Fetch all lessons (past year and future)
  const { data: allLessons = [], isLoading: isLoadingLessons } = useQuery({
    queryKey: ["instructor-lessons", instructorId, effectiveSchoolId],
    queryFn: async () => {
      if (!instructorId) return [];
      const oneYearAgo = new Date();
      oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
      const oneYearFromNow = new Date();
      oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);

      return await lessonsApi.listByRange({
        startDate: oneYearAgo.toISOString().split("T")[0],
        endDate: oneYearFromNow.toISOString().split("T")[0],
        instructorId: instructorId,
        schoolId: effectiveSchoolId || undefined,
      });
    },
    enabled: !!instructorId,
  });

  // Separate into upcoming and recent
  const today = new Date().toISOString().split("T")[0];
  const upcomingLessons = useMemo(() => {
    return allLessons
      .filter((lesson) => lesson.date >= today)
      .sort((a, b) => {
        const dateA = new Date(`${a.date}T${a.time}`);
        const dateB = new Date(`${b.date}T${b.time}`);
        return dateA.getTime() - dateB.getTime(); // Ascending (earliest first)
      });
  }, [allLessons, today]);

  const recentLessons = useMemo(() => {
    return allLessons
      .filter((lesson) => lesson.date < today)
      .sort((a, b) => {
        const dateA = new Date(`${a.date}T${a.time}`);
        const dateB = new Date(`${b.date}T${b.time}`);
        return dateB.getTime() - dateA.getTime(); // Descending (most recent first)
      });
  }, [allLessons, today]);

  // Paginate upcoming lessons
  const paginatedUpcoming = useMemo(() => {
    const start = (upcomingLessonsPage - 1) * itemsPerPage;
    return upcomingLessons.slice(start, start + itemsPerPage);
  }, [upcomingLessons, upcomingLessonsPage]);

  // Paginate recent lessons
  const paginatedRecent = useMemo(() => {
    const start = (recentLessonsPage - 1) * itemsPerPage;
    return recentLessons.slice(start, start + itemsPerPage);
  }, [recentLessons, recentLessonsPage]);

  const upcomingTotalPages = Math.ceil(upcomingLessons.length / itemsPerPage);
  const recentTotalPages = Math.ceil(recentLessons.length / itemsPerPage);

  const formatLessonDateTime = (date: string, time: string) => {
    try {
      const dateTime = new Date(`${date}T${time}`);
      return format(dateTime, "dd/MM/yyyy - HH:mm:ss", { locale });
    } catch {
      return `${date} - ${time}`;
    }
  };

  const getStatusBadge = (lesson: LessonListItem) => {
    const statusName = lesson.lesson_status_name?.toLowerCase() || "";
    if (statusName.includes("confirm") || statusName === "confirmed") {
      return {
        label: t("profile.confirmed", { defaultValue: "Confirmed" }),
        variant: "default" as const,
        className: "bg-green-100 text-green-700",
      };
    }
    if (statusName.includes("pending") || statusName === "pending") {
      return {
        label: t("profile.pending", { defaultValue: "Pending" }),
        variant: "outline" as const,
        className: "bg-yellow-100 text-yellow-700",
      };
    }
    return {
      label: lesson.lesson_status_name || "Unknown",
      variant: "outline" as const,
      className: "",
    };
  };

  const getStudentInitial = (lesson: LessonListItem) => {
    if (lesson.student_first_name && lesson.student_last_name) {
      return `${lesson.student_first_name[0]}${lesson.student_last_name[0]}`.toUpperCase();
    }
    return "-";
  };

  const getStudentName = (lesson: LessonListItem) => {
    if (lesson.student_first_name && lesson.student_last_name) {
      return `${lesson.student_first_name} ${lesson.student_last_name}`;
    }
    return t("common.unknown", { defaultValue: "Unknown" });
  };

  return (
    <div className="space-y-6">
      {/* Upcoming Lessons */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center text-lg">
            <Calendar className="w-5 h-5 mr-2 text-pink-600" />
            {t("profile.upcomingLessons", {
              defaultValue: "Upcoming Lessons",
            })}{" "}
            ({upcomingLessons.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoadingLessons ? (
            <div className="p-8 text-center">
              {t("common.loading", { defaultValue: "Loading..." })}
            </div>
          ) : upcomingLessons.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              {t("profile.noLessonsScheduled", {
                defaultValue: "No lessons scheduled",
              })}
            </div>
          ) : (
            <>
              <div className="space-y-0">
                {paginatedUpcoming.map((lesson) => {
                  const status = getStatusBadge(lesson);
                  return (
                    <div
                      key={lesson.id}
                      className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 border-b last:border-b-0 gap-3"
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <Avatar className="w-10 h-10 flex-shrink-0">
                          <AvatarFallback className="bg-gray-200 text-gray-600">
                            {getStudentInitial(lesson)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                          <div className="font-semibold truncate">
                            {getStudentName(lesson)}
                          </div>
                          <div className="text-sm text-gray-500">
                            {formatLessonDateTime(lesson.date, lesson.time)}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <Badge
                          className={`text-xs whitespace-nowrap ${status.className}`}
                        >
                          {status.label}
                        </Badge>
                        <Button
                          variant="outline"
                          size="sm"
                          className="whitespace-nowrap"
                          onClick={() => navigate(`/lessons/${lesson.id}`)}
                        >
                          {t("profile.details", { defaultValue: "Details" })}
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
              {upcomingTotalPages > 1 && (
                <div className="flex flex-col sm:flex-row justify-between items-center mt-6 gap-4">
                  <div className="text-sm text-gray-700 text-center sm:text-left">
                    {t("admin.showing", { defaultValue: "Showing" })}{" "}
                    {(upcomingLessonsPage - 1) * itemsPerPage + 1}{" "}
                    {t("admin.to", { defaultValue: "to" })}{" "}
                    {Math.min(
                      upcomingLessonsPage * itemsPerPage,
                      upcomingLessons.length,
                    )}{" "}
                    {t("admin.of", { defaultValue: "of" })}{" "}
                    {upcomingLessons.length}
                  </div>
                  <div className="flex flex-wrap justify-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setUpcomingLessonsPage(1)}
                      disabled={upcomingLessonsPage === 1}
                    >
                      {t("common.first", { defaultValue: "First" })}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setUpcomingLessonsPage((prev) => Math.max(1, prev - 1))
                      }
                      disabled={upcomingLessonsPage === 1}
                    >
                      {t("common.previous", { defaultValue: "Previous" })}
                    </Button>
                    <span className="flex items-center px-3 py-2 text-sm">
                      {t("admin.page", { defaultValue: "Page" })}{" "}
                      {upcomingLessonsPage}{" "}
                      {t("admin.of", { defaultValue: "of" })}{" "}
                      {upcomingTotalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setUpcomingLessonsPage((prev) =>
                          Math.min(upcomingTotalPages, prev + 1),
                        )
                      }
                      disabled={upcomingLessonsPage === upcomingTotalPages}
                    >
                      {t("common.next", { defaultValue: "Next" })}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setUpcomingLessonsPage(upcomingTotalPages)}
                      disabled={upcomingLessonsPage === upcomingTotalPages}
                    >
                      {t("common.last", { defaultValue: "Last" })}
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Recent Lessons */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center text-lg">
            <Clock className="w-5 h-5 mr-2 text-pink-600" />
            {t("profile.recentLessons", { defaultValue: "Recent Lessons" })} (
            {recentLessons.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoadingLessons ? (
            <div className="p-8 text-center">
              {t("common.loading", { defaultValue: "Loading..." })}
            </div>
          ) : recentLessons.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              {t("profile.noRecentLessons", {
                defaultValue: "No recent lessons",
              })}
            </div>
          ) : (
            <>
              <div className="space-y-0">
                {paginatedRecent.map((lesson) => {
                  const status = getStatusBadge(lesson);
                  return (
                    <div
                      key={lesson.id}
                      className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 border-b last:border-b-0 gap-3"
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <Avatar className="w-10 h-10 flex-shrink-0">
                          <AvatarFallback className="bg-gray-200 text-gray-600">
                            {getStudentInitial(lesson)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                          <div className="font-semibold truncate">
                            {getStudentName(lesson)}
                          </div>
                          <div className="text-sm text-gray-500">
                            {formatLessonDateTime(lesson.date, lesson.time)}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <Badge
                          className={`text-xs whitespace-nowrap ${status.className}`}
                        >
                          {status.label}
                        </Badge>
                        <Button
                          variant="outline"
                          size="sm"
                          className="whitespace-nowrap"
                          onClick={() => navigate(`/lessons/${lesson.id}`)}
                        >
                          {t("profile.details", { defaultValue: "Details" })}
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
              {recentTotalPages > 1 && (
                <div className="flex flex-col sm:flex-row justify-between items-center mt-6 gap-4">
                  <div className="text-sm text-gray-700 text-center sm:text-left">
                    {t("admin.showing", { defaultValue: "Showing" })}{" "}
                    {(recentLessonsPage - 1) * itemsPerPage + 1}{" "}
                    {t("admin.to", { defaultValue: "to" })}{" "}
                    {Math.min(
                      recentLessonsPage * itemsPerPage,
                      recentLessons.length,
                    )}{" "}
                    {t("admin.of", { defaultValue: "of" })}{" "}
                    {recentLessons.length}
                  </div>
                  <div className="flex flex-wrap justify-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setRecentLessonsPage(1)}
                      disabled={recentLessonsPage === 1}
                    >
                      {t("common.first", { defaultValue: "First" })}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setRecentLessonsPage((prev) => Math.max(1, prev - 1))
                      }
                      disabled={recentLessonsPage === 1}
                    >
                      {t("common.previous", { defaultValue: "Previous" })}
                    </Button>
                    <span className="flex items-center px-3 py-2 text-sm">
                      {t("admin.page", { defaultValue: "Page" })}{" "}
                      {recentLessonsPage}{" "}
                      {t("admin.of", { defaultValue: "of" })} {recentTotalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setRecentLessonsPage((prev) =>
                          Math.min(recentTotalPages, prev + 1),
                        )
                      }
                      disabled={recentLessonsPage === recentTotalPages}
                    >
                      {t("common.next", { defaultValue: "Next" })}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setRecentLessonsPage(recentTotalPages)}
                      disabled={recentLessonsPage === recentTotalPages}
                    >
                      {t("common.last", { defaultValue: "Last" })}
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

interface StudentsTabContentProps {
  instructorId: string | undefined;
  effectiveSchoolId: string | null | undefined;
  userRole: string | undefined;
}

const StudentsTabContent: React.FC<StudentsTabContentProps> = ({
  instructorId,
  effectiveSchoolId: _effectiveSchoolId,
  userRole,
}) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [studentsPage, setStudentsPage] = useState(1);
  const itemsPerPage = 10;

  const { data, isLoading: isLoadingStudents } = useQuery({
    queryKey: [
      "instructor-students-from-lessons",
      instructorId,
      studentsPage,
      userRole,
    ],
    queryFn: () =>
      instructorsApi.getStudentsFromLessons({
        instructorId:
          userRole === UserRole.SCHOOL_ADMIN ||
          userRole === UserRole.SUPER_ADMIN
            ? instructorId
            : undefined,
        page: studentsPage,
        limit: itemsPerPage,
      }),
    enabled: !!instructorId,
  });

  const students = data?.students ?? [];
  const pagination = data?.pagination ?? {
    page: 1,
    limit: itemsPerPage,
    total: 0,
    totalPages: 0,
  };
  const totalPages = pagination.totalPages;

  const getStudentInitials = (student: StudentFromLessons) => {
    if (student.firstName && student.lastName) {
      return `${student.firstName[0]}${student.lastName[0]}`.toUpperCase();
    }
    if (student.firstName) {
      return student.firstName.substring(0, 2).toUpperCase();
    }
    return "??";
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center text-lg">
            <Users className="w-5 h-5 mr-2 text-pink-600" />
            {t("profile.followedStudents", {
              defaultValue: "Followed Students",
            })}{" "}
            ({pagination.total})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoadingStudents ? (
            <div className="p-8 text-center">
              {t("common.loading", { defaultValue: "Loading..." })}
            </div>
          ) : students.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              {t("profile.noStudentsFound", {
                defaultValue: "No students found",
              })}
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {students.map((student) => (
                  <div
                    key={student.id}
                    className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 border rounded-lg bg-white gap-3"
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <Avatar className="w-10 h-10 flex-shrink-0">
                        <AvatarFallback className="bg-gray-200 text-gray-600">
                          {getStudentInitials(student)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <div className="font-semibold truncate">
                          {student.firstName} {student.lastName}
                        </div>
                        <div className="text-sm text-gray-500">
                          {student.lessonCount}{" "}
                          {student.lessonCount === 1
                            ? t("profile.lesson", { defaultValue: "lesson" })
                            : t("profile.lessonsCount", {
                                defaultValue: "lessons",
                              })}
                        </div>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="whitespace-nowrap flex-shrink-0"
                      onClick={() => navigate(`/students/${student.id}`)}
                    >
                      <User className="w-4 h-4 mr-1" />
                      {t("profile.profile", { defaultValue: "Profile" })}
                    </Button>
                  </div>
                ))}
              </div>
              {totalPages > 1 && (
                <div className="flex flex-col sm:flex-row justify-between items-center mt-6 gap-4">
                  <div className="text-sm text-gray-700 text-center sm:text-left">
                    {t("admin.showing", { defaultValue: "Showing" })}{" "}
                    {(pagination.page - 1) * pagination.limit + 1}{" "}
                    {t("admin.to", { defaultValue: "to" })}{" "}
                    {Math.min(
                      pagination.page * pagination.limit,
                      pagination.total,
                    )}{" "}
                    {t("admin.of", { defaultValue: "of" })} {pagination.total}
                  </div>
                  <div className="flex flex-wrap justify-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setStudentsPage(1)}
                      disabled={studentsPage === 1}
                    >
                      {t("common.first", { defaultValue: "First" })}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setStudentsPage((prev) => Math.max(1, prev - 1))
                      }
                      disabled={studentsPage === 1}
                    >
                      {t("common.previous", { defaultValue: "Previous" })}
                    </Button>
                    <span className="flex items-center px-3 py-2 text-sm">
                      {t("admin.page", { defaultValue: "Page" })} {studentsPage}{" "}
                      {t("admin.of", { defaultValue: "of" })} {totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setStudentsPage((prev) =>
                          Math.min(totalPages, prev + 1),
                        )
                      }
                      disabled={studentsPage === totalPages}
                    >
                      {t("common.next", { defaultValue: "Next" })}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setStudentsPage(totalPages)}
                      disabled={studentsPage === totalPages}
                    >
                      {t("common.last", { defaultValue: "Last" })}
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

const InstructorProfilePage = () => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { selectedSchoolId } = useSchoolSelectionStore();

  // If there is an ID param, we are viewing another instructor (Admin View)
  const isViewingOtherInstructor = !!id;
  const instructorId = id || user?.id;

  // Use selected school context if available and viewing other
  const effectiveSchoolId = selectedSchoolId;

  const [isEditing, setIsEditing] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");
  const [selectedSchoolForRates, setSelectedSchoolForRates] = useState<
    string | null
  >(null);

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    whatsappNumber: "",
    email: "",
    languages: [] as string[],
    specialties: [] as string[],
    certifications: [] as string[],
    bio: "", // notes in API
    avatar: "",
    isActive: true, // Keep for admin updates
  });

  const [inputValues, setInputValues] = useState({
    language: "",
    specialty: "",
    certification: "",
  });

  const [isConfirmDeactivateOpen, setIsConfirmDeactivateOpen] = useState(false);

  // Fetch Profile Data
  const {
    data: profile,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["instructor-profile", instructorId, effectiveSchoolId],
    queryFn: async () => {
      if (isViewingOtherInstructor && instructorId) {
        return await instructorsApi.getInstructorById(
          instructorId,
          effectiveSchoolId || undefined,
        );
      } else {
        return await instructorsApi.getInstructorProfile();
      }
    },
    staleTime: 0,
  });

  // Fetch Instructor Schools
  const { data: instructorSchools = [], isLoading: isLoadingSchools } =
    useQuery({
      queryKey: ["instructor-schools", instructorId],
      queryFn: async () => {
        if (!instructorId) return [];
        const response = await api.get(
          `/instructor-schools/instructor/${instructorId}`,
        );
        return response.data.data || [];
      },
      enabled: !!instructorId,
    });

  // Determine available schools based on role
  const availableSchools = useMemo(() => {
    if (!instructorSchools.length) return [];

    if (user?.role === UserRole.SCHOOL_ADMIN) {
      // School admin can only see their school if instructor is assigned to it
      const schoolAdminSchool = instructorSchools.find(
        (school: any) => school.schoolId === user.schoolId,
      );
      return schoolAdminSchool ? [schoolAdminSchool] : [];
    }

    // Instructor and Super Admin can see all schools
    return instructorSchools;
  }, [instructorSchools, user?.role, user?.schoolId]);

  // Set default selected school for rates
  useEffect(() => {
    if (availableSchools.length > 0 && !selectedSchoolForRates) {
      // For super admin, prefer selectedSchoolId if available
      if (user?.role === UserRole.SUPER_ADMIN && selectedSchoolId) {
        const school = availableSchools.find(
          (s: any) => s.schoolId === selectedSchoolId,
        );
        if (school) {
          setSelectedSchoolForRates(school.schoolId);
          return;
        }
      }
      // Otherwise, use first available school
      setSelectedSchoolForRates(availableSchools[0].schoolId);
    }
  }, [availableSchools, selectedSchoolForRates, user?.role, selectedSchoolId]);

  // Populate Form Data
  useEffect(() => {
    if (profile) {
      const p = profile as any;
      setFormData({
        firstName: getProfileField(p, "firstName", "first_name", ""),
        lastName: getProfileField(p, "lastName", "last_name", ""),
        whatsappNumber:
          getProfileField(p, "whatsappNumber", "whatsapp_number", "") ||
          getProfileField(p, "whatsappNumber", "whatsapp_number", ""),
        email: p.email ?? (isViewingOtherInstructor ? "" : (user?.email ?? "")),
        languages: p.languages || [],
        specialties: p.specialties || [],
        certifications: p.certifications || [],
        bio: getProfileField(p, "notes", "notes", ""),
        isActive: getProfileField(p, "isActive", "is_active", true),
        avatar: p.avatar || "",
      });
    }
  }, [profile, isViewingOtherInstructor, user?.email]);

  // Mutations
  const updateMutation = useMutation({
    mutationFn: async (data: any) => {
      // Map form data back to API expected format
      const isProfileUpdate = !isViewingOtherInstructor;

      if (isProfileUpdate) {
        const payload = {
          firstName: data.firstName,
          lastName: data.lastName,
          whatsappNumber: data.whatsappNumber,
          languages: data.languages,
          specialties: data.specialties,
          certifications: data.certifications,
          avatar: data.avatar,
          notes: data.bio,
          isActive: data.isActive,
        };
        return await instructorsApi.updateInstructorProfile(payload);
      } else {
        // Admin updating instructor
        if (!instructorId) throw new Error("No instructor ID");
        const payload = {
          firstName: data.firstName,
          lastName: data.lastName,
          whatsappNumber: data.whatsappNumber,
          email: data.email,
          languages: data.languages,
          specialties: data.specialties,
          certifications: data.certifications,
          notes: data.bio,
          isActive: data.isActive,
          avatar: data.avatar,
        };
        return await instructorsApi.updateInstructor(
          instructorId,
          payload,
          effectiveSchoolId || undefined,
        );
      }
    },
    onSuccess: () => {
      toast.success(t("common.saved", { defaultValue: "Saved successfully" }));
      setIsEditing(false);
      queryClient.invalidateQueries({ queryKey: ["instructor-profile"] });
      queryClient.invalidateQueries({ queryKey: ["instructors"] });
    },
    onError: (err: any) => {
      console.error(err);
      toast.error(t("common.error", { defaultValue: "An error occurred" }));
    },
  });

  const deactivateMutation = useMutation({
    mutationFn: async () => {
      if (!instructorId) return;
      return await instructorsApi.deleteInstructor(
        instructorId,
        effectiveSchoolId || undefined,
      );
    },
    onSuccess: () => {
      toast.success(
        t("common.deleted", { defaultValue: "Instructor deactivated" }),
      );
      navigate("/instructors");
    },
    onError: () => {
      toast.error(t("common.error"));
    },
  });

  // Handlers
  const handleInputChange = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleAddItem = (
    field: "languages" | "specialties" | "certifications",
    value: string,
  ) => {
    if (!value.trim()) return;
    setFormData((prev) => ({
      ...prev,
      [field]: [...prev[field], value.trim()],
    }));
    setInputValues((prev) => ({
      ...prev,
      [field === "languages"
        ? "language"
        : field === "specialties"
          ? "specialty"
          : "certification"]: "",
    }));
  };

  const handleRemoveItem = (
    field: "languages" | "specialties" | "certifications",
    index: number,
  ) => {
    setFormData((prev) => ({
      ...prev,
      [field]: prev[field].filter((_, i) => i !== index),
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.whatsappNumber || formData.whatsappNumber.trim() === "") {
      toast.error(
        t("instructors.whatsappNumberRequired", {
          defaultValue: "WhatsApp number is required",
        }),
      );
      return;
    }

    updateMutation.mutate(formData);
  };

  const handleCancel = () => {
    setIsEditing(false);
    // Re-populate from profile
    if (profile) {
      const p = profile as any;
      const resetData = {
        firstName: getProfileField(p, "firstName", "first_name", ""),
        lastName: getProfileField(p, "lastName", "last_name", ""),
        whatsappNumber:
          getProfileField(p, "whatsappNumber", "whatsapp_number", "") ||
          getProfileField(p, "whatsappNumber", "whatsapp_number", ""),
        email: p.email ?? (isViewingOtherInstructor ? "" : (user?.email ?? "")),
        languages: p.languages || [],
        specialties: p.specialties || [],
        certifications: p.certifications || [],
        bio: getProfileField(p, "notes", "notes", ""),
        isActive: getProfileField(p, "isActive", "is_active", true),
        avatar: p.avatar || "",
      };
      setFormData(resetData);
    }
  };

  if (isLoading)
    return (
      <div className="p-8 text-center">
        {t("common.loading", { defaultValue: "Loading..." })}
      </div>
    );
  if (error)
    return (
      <div className="p-8 text-center text-red-500">{t("common.error")}</div>
    );

  return (
    <div className="max-w-5xl mx-auto py-8 px-4 sm:px-6 lg:px-8 space-y-6">
      {/* Navigation for Admin View */}
      {isViewingOtherInstructor && (
        <Button variant="ghost" className="mb-4" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          {t("common.back", { defaultValue: "Back" })}
        </Button>
      )}

      {/* Header Card */}
      <Card className="border-none shadow-sm bg-white overflow-hidden">
        <div className="h-32 bg-gradient-to-r from-pink-500 to-rose-400" />
        <CardContent className="relative pt-0 px-6 sm:px-10 pb-6">
          <div className="absolute top-4 right-4 sm:top-6 sm:right-6">
            <LanguageSwitcher />
          </div>
          <div className="flex flex-col sm:flex-row items-center sm:items-end -mt-12 mb-6 sm:space-x-5">
            <div className="relative">
              {/* Avatar with Upload Button */}
              <Avatar className="w-24 h-24 sm:w-32 sm:h-32 border-4 border-white shadow-md">
                <AvatarImage src={formData.avatar} className="object-cover" />
                <AvatarFallback className="text-2xl font-bold bg-gray-100 text-gray-500">
                  {formData.firstName?.[0]}
                  {formData.lastName?.[0]}
                </AvatarFallback>
              </Avatar>
              {isEditing && (
                <div className="absolute bottom-0 right-0">
                  <CustomUploadButton
                    endpoint="instructorProfilePic"
                    onClientUploadComplete={(res) => {
                      if (res?.[0]?.url)
                        handleInputChange("avatar", res[0].url);
                    }}
                    onUploadError={(error: Error) => {
                      toast.error(`Upload failed: ${error.message}`);
                    }}
                    buttonText={t("common.upload", { defaultValue: "Upload" })}
                  />
                </div>
              )}
            </div>

            <div className="mt-6 sm:mt-0 text-center sm:text-left flex-1">
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
                {formData.firstName} {formData.lastName}
              </h1>
              <div className="flex flex-wrap justify-center sm:justify-start gap-6 mt-2 text-sm text-gray-500">
                <div className="flex items-center">
                  <Mail className="w-4 h-4 mr-1" />
                  {formData.email}
                </div>
                {formData.whatsappNumber && (
                  <div className="flex items-center gap-6">
                    <div className="flex items-center">
                      <Phone className="w-4 h-4 mr-1" />
                      {formData.whatsappNumber}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-auto p-0 text-green-600 hover:text-green-700 hover:bg-transparent flex items-center gap-1"
                      onClick={() => {
                        const cleanNumber = formData.whatsappNumber?.replace(
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
                      title={t("instructors.sendWhatsApp")}
                    >
                      <svg
                        className="h-4 w-4"
                        viewBox="0 0 24 24"
                        fill="currentColor"
                      >
                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0020.885 3.785" />
                      </svg>
                      <span>Send a message</span>
                    </Button>
                  </div>
                )}
              </div>
            </div>

            <div className="mt-6 sm:mt-0 flex gap-3">
              {!isEditing ? (
                <>
                  <Button onClick={() => setIsEditing(true)} variant="outline">
                    <EditIcon className="w-4 h-4 mr-2" />
                    {t("common.edit", { defaultValue: "Edit Profile" })}
                  </Button>

                  {isViewingOtherInstructor && (
                    <AlertDialog
                      open={isConfirmDeactivateOpen}
                      onOpenChange={setIsConfirmDeactivateOpen}
                    >
                      <AlertDialogTrigger asChild>
                        <Button variant="destructive">
                          <Trash2 className="w-4 h-4 mr-2" />
                          {t("common.deactivate", {
                            defaultValue: "Deactivate",
                          })}
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>
                            {t("common.areYouSure", "Are you sure?")}
                          </AlertDialogTitle>
                          <AlertDialogDescription>
                            {t("instructor.deactivateConfirmation", {
                              defaultValue:
                                "This action will deactivate the instructor account.",
                            })}
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>
                            {t("common.cancel")}
                          </AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => deactivateMutation.mutate()}
                            className="bg-red-600"
                          >
                            {t("common.confirm")}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}
                </>
              ) : (
                <>
                  <Button variant="ghost" onClick={handleCancel}>
                    {t("common.cancel")}
                  </Button>
                  <Button
                    onClick={handleSubmit}
                    disabled={updateMutation.isPending}
                  >
                    {updateMutation.isPending
                      ? t("common.saving")
                      : t("common.save")}
                  </Button>
                </>
              )}
            </div>
          </div>

          <div className="flex flex-wrap gap-2 mt-4">
            {formData.languages.map((lang, i) => (
              <Badge key={i} variant="secondary" className="px-3 py-1">
                <Globe className="w-3 h-3 mr-1" />
                {lang}
              </Badge>
            ))}
            {formData.specialties.map((spec, i) => (
              <Badge
                key={i}
                variant="outline"
                className="px-3 py-1 border-pink-200 text-pink-700 bg-pink-50"
              >
                <Award className="w-3 h-3 mr-1" />
                {spec}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="space-y-6"
      >
        <TabsList className="bg-gray-100 p-1 rounded-lg w-full flex flex-wrap">
          <TabsTrigger
            value="overview"
            className="rounded-md flex-1 min-w-[120px]"
          >
            {t("profile.overview", { defaultValue: "Overview" })}
          </TabsTrigger>
          <TabsTrigger
            value="rates"
            className="rounded-md flex-1 min-w-[120px]"
          >
            {t("profile.rates", { defaultValue: "Rates" })}
          </TabsTrigger>
          <TabsTrigger
            value="lessons"
            className="rounded-md flex-1 min-w-[120px]"
          >
            {t("profile.lessonsTab", { defaultValue: "Lessons" })}
          </TabsTrigger>
          <TabsTrigger
            value="students"
            className="rounded-md flex-1 min-w-[120px]"
          >
            {t("profile.students", { defaultValue: "Students" })}
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center text-lg">
                  <User className="w-5 h-5 mr-2 text-pink-600" />
                  {t("profile.personalInfo", {
                    defaultValue: "Personal Information",
                  })}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label
                      htmlFor="instructor-first-name"
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      {t("profile.firstName", "First Name")}
                    </label>
                    <Input
                      id="instructor-first-name"
                      value={formData.firstName}
                      onChange={(e) =>
                        handleInputChange("firstName", e.target.value)
                      }
                      disabled={!isEditing}
                    />
                  </div>
                  <div className="space-y-2">
                    <label
                      htmlFor="instructor-last-name"
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      {t("profile.lastName", "Last Name")}
                    </label>
                    <Input
                      id="instructor-last-name"
                      value={formData.lastName}
                      onChange={(e) =>
                        handleInputChange("lastName", e.target.value)
                      }
                      disabled={!isEditing}
                    />
                  </div>
                  <div className="space-y-2">
                    <label
                      htmlFor="instructor-email"
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      {t("profile.email", "Email")}
                    </label>
                    <Input
                      id="instructor-email"
                      value={formData.email}
                      onChange={(e) =>
                        handleInputChange("email", e.target.value)
                      }
                      disabled={true}
                    />
                  </div>
                  <div className="space-y-2">
                    <label
                      htmlFor="instructor-whatsapp"
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      {t("profile.whatsappNumber", "WhatsApp Number")}
                    </label>
                    <PhoneInput
                      id="instructor-whatsapp"
                      value={formData.whatsappNumber}
                      onChange={(value) =>
                        handleInputChange("whatsappNumber", value || "")
                      }
                      defaultCountry="IT"
                      disabled={!isEditing}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label
                    htmlFor="instructor-bio"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    {t("profile.bio", "Bio / Notes")}
                  </label>
                  <textarea
                    id="instructor-bio"
                    className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    rows={4}
                    value={formData.bio}
                    onChange={(e) => handleInputChange("bio", e.target.value)}
                    disabled={!isEditing}
                    placeholder={t(
                      "profile.bioPlaceholder",
                      "Add some notes or bio...",
                    )}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center text-lg">
                  <Award className="w-5 h-5 mr-2 text-pink-600" />
                  {t("profile.qualifications", {
                    defaultValue: "Qualifications & Skills",
                  })}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Languages */}
                <div className="space-y-3">
                  <label
                    htmlFor="instructor-language-input"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    {t("profile.languages", "Languages")}
                  </label>
                  {isEditing && (
                    <div className="flex gap-2">
                      <Input
                        id="instructor-language-input"
                        value={inputValues.language}
                        onChange={(e) =>
                          setInputValues((prev) => ({
                            ...prev,
                            language: e.target.value,
                          }))
                        }
                        placeholder="Add language..."
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            handleAddItem("languages", inputValues.language);
                          }
                        }}
                      />
                      <Button
                        type="button"
                        onClick={() =>
                          handleAddItem("languages", inputValues.language)
                        }
                        size="sm"
                      >
                        <Languages className="w-4 h-4" />
                      </Button>
                    </div>
                  )}
                  <div className="flex flex-wrap gap-2">
                    {formData.languages.map((lang, i) => (
                      <Badge
                        key={i}
                        variant="secondary"
                        className="pl-2 pr-1 py-1 flex items-center gap-1"
                      >
                        {lang}
                        {isEditing && (
                          <button
                            type="button"
                            onClick={() => handleRemoveItem("languages", i)}
                            className="hover:bg-gray-200 rounded-full p-0.5"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        )}
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Specialties */}
                <div className="space-y-3">
                  <label
                    htmlFor="instructor-specialty-input"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    {t("profile.specialties", "Specialties")}
                  </label>
                  {isEditing && (
                    <div className="flex gap-2">
                      <Input
                        id="instructor-specialty-input"
                        value={inputValues.specialty}
                        onChange={(e) =>
                          setInputValues((prev) => ({
                            ...prev,
                            specialty: e.target.value,
                          }))
                        }
                        placeholder="Add specialty..."
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            handleAddItem("specialties", inputValues.specialty);
                          }
                        }}
                      />
                      <Button
                        type="button"
                        onClick={() =>
                          handleAddItem("specialties", inputValues.specialty)
                        }
                        size="sm"
                      >
                        <BookOpen className="w-4 h-4" />
                      </Button>
                    </div>
                  )}
                  <div className="flex flex-wrap gap-2">
                    {formData.specialties.map((item, i) => (
                      <Badge
                        key={i}
                        variant="outline"
                        className="pl-2 pr-1 py-1 border-blue-200 text-blue-700 bg-blue-50 flex items-center gap-1"
                      >
                        {item}
                        {isEditing && (
                          <button
                            type="button"
                            onClick={() => handleRemoveItem("specialties", i)}
                            className="hover:bg-blue-100 rounded-full p-0.5"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        )}
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Certifications */}
                <div className="space-y-3">
                  <label
                    htmlFor="instructor-certification-input"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    {t("profile.certifications", "Certifications")}
                  </label>
                  {isEditing && (
                    <div className="flex gap-2">
                      <Input
                        id="instructor-certification-input"
                        value={inputValues.certification}
                        onChange={(e) =>
                          setInputValues((prev) => ({
                            ...prev,
                            certification: e.target.value,
                          }))
                        }
                        placeholder="Add certification..."
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            handleAddItem(
                              "certifications",
                              inputValues.certification,
                            );
                          }
                        }}
                      />
                      <Button
                        type="button"
                        onClick={() =>
                          handleAddItem(
                            "certifications",
                            inputValues.certification,
                          )
                        }
                        size="sm"
                      >
                        <Award className="w-4 h-4" />
                      </Button>
                    </div>
                  )}
                  <div className="flex flex-wrap gap-2">
                    {formData.certifications.map((item, i) => (
                      <Badge
                        key={i}
                        variant="outline"
                        className="pl-2 pr-1 py-1 border-purple-200 text-purple-700 bg-purple-50 flex items-center gap-1"
                      >
                        {item}
                        {isEditing && (
                          <button
                            type="button"
                            onClick={() =>
                              handleRemoveItem("certifications", i)
                            }
                            className="hover:bg-purple-100 rounded-full p-0.5"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        )}
                      </Badge>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Rates Tab */}
        <TabsContent value="rates" className="space-y-6">
          <RatesTabContent
            instructorId={instructorId}
            availableSchools={availableSchools}
            selectedSchoolForRates={selectedSchoolForRates}
            setSelectedSchoolForRates={setSelectedSchoolForRates}
            isLoadingSchools={isLoadingSchools}
          />
        </TabsContent>

        {/* Lessons Tab */}
        <TabsContent value="lessons" className="space-y-6">
          <LessonsTabContent
            instructorId={instructorId}
            effectiveSchoolId={effectiveSchoolId || selectedSchoolForRates}
          />
        </TabsContent>

        {/* Students Tab */}
        <TabsContent value="students" className="space-y-6">
          <StudentsTabContent
            instructorId={instructorId}
            effectiveSchoolId={effectiveSchoolId || selectedSchoolForRates}
            userRole={user?.role}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default InstructorProfilePage;
