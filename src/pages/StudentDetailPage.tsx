import React, { useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  studentsApi,
  Student,
  UpdateStudentRequest,
} from "@/services/students";
import { bookingsApi } from "@/services/bookings";
import { lessonsApi, LessonListItem } from "@/services/lessons";
import { useDeleteBooking } from "@/hooks/useBookings";
import { useAuthStore } from "@/store/auth";
import { useSchoolSelectionStore } from "@/store/schoolSelection";
import { useStudentLevels } from "@/hooks/useStudentLevels";
import { useDisciplines } from "@/hooks/useDisciplines";
import { useErrorTranslation } from "@/hooks/useErrorTranslation";
import { UserRole } from "@/types";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { StudentForm } from "@/components/students/StudentForm";
import { toast } from "react-hot-toast";
import { parseLessonDateTime } from "@/utils/parseLessonDateTime";
import BookingsPage from "@/pages/Bookings";
import {
  ArrowLeft,
  Edit,
  Mail,
  Phone,
  MessageCircle,
  Clock,
  Calendar as CalendarIcon,
  CheckCircle,
  Globe,
  User,
  Weight,
  Ruler,
  Pencil,
  Trash2,
  Plus,
} from "lucide-react";


// ConsentRow component to reduce repetition
interface ConsentRowProps {
  labelKey: string;
  value?: boolean;
  required?: boolean;
  t: (key: string, options?: { defaultValue: string }) => string;
}

const ConsentRow: React.FC<ConsentRowProps> = ({
  labelKey,
  value = false,
  required = false,
  t,
}) => {
  // Determine background and text colors based on required and value
  const bgColor = value
    ? "bg-green-100 text-green-600"
    : required
      ? "bg-red-100 text-red-600"
      : "bg-gray-100 text-gray-400";

  const dotColor = value
    ? "" // CheckCircle will be shown
    : required
      ? "bg-red-400"
      : "bg-gray-400";

  const textColor = value
    ? "text-gray-900"
    : required
      ? "text-gray-500 line-through"
      : "text-gray-500";

  return (
    <div className="flex items-center gap-2">
      <div
        className={`w-4 h-4 rounded-full flex items-center justify-center ${bgColor}`}
      >
        {value ? (
          <CheckCircle className="w-3 h-3" />
        ) : (
          <div className={`w-1.5 h-1.5 rounded-full ${dotColor}`} />
        )}
      </div>
      <span className={`text-sm ${textColor}`}>
        {t(labelKey, { defaultValue: labelKey.split(".").pop() || "" })}
      </span>
    </div>
  );
};

const StudentDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const { getTranslatedError } = useErrorTranslation();

  const locale = i18n.language === "it" ? "it-IT" : "en-US";
  const queryClient = useQueryClient();
  const { user } = useAuthStore();

  // Helper function to safely format date strings
  const formatDateSafe = (dateString: string | null | undefined): string => {
    if (!dateString) return "";
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      return dateString;
    }
    return date.toLocaleDateString(locale, {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };
  const { selectedSchoolId } = useSchoolSelectionStore();
  const [activeTab, setActiveTab] = useState("overview");
  const [showEditForm, setShowEditForm] = useState(false);
  const [scrollToSection, setScrollToSection] = useState<string | null>(null);
  /** Full “Bookings & payments” sheet (create + list). */
  const [bookingSheetOpen, setBookingSheetOpen] = useState(false);
  /** Standalone edit dialog from Packages → Edit (no outer shell). */
  const [editOnlyBookingId, setEditOnlyBookingId] = useState<string | null>(
    null,
  );

  const openBookingSheet = () => {
    setEditOnlyBookingId(null);
    setBookingSheetOpen(true);
  };

  const openBookingEditOnly = (bookingId: string) => {
    setEditOnlyBookingId(bookingId);
  };

  const effectiveSchoolId =
    user?.role === UserRole.SUPER_ADMIN
      ? (selectedSchoolId ?? undefined)
      : user?.schoolId;

  const { studentLevels } = useStudentLevels(effectiveSchoolId);
  const { getDisciplineBySlug } = useDisciplines(effectiveSchoolId);

  // Fetch student details
  const {
    data: student,
    isLoading: isLoadingStudent,
    error: studentError,
  } = useQuery<Student>({
    queryKey: ["student", id, effectiveSchoolId],
    queryFn: () => studentsApi.getStudentById(id!, effectiveSchoolId),
    enabled: !!id,
  });

  // Fetch bookings for this student
  const { data: bookingsResponse, isLoading: isLoadingBookings } = useQuery({
    queryKey: ["bookings", id, effectiveSchoolId],
    queryFn: () =>
      bookingsApi.list({
        studentId: id,
        schoolId: effectiveSchoolId,
        activeOnly: false,
      }),
    enabled: !!id,
  });

  const bookings = bookingsResponse?.bookings ?? [];
  const bookingProductNameByBookingId = useMemo(() => {
    const map = new Map<string, string>();
    for (const booking of bookings) {
      const name = booking.products?.title || booking.products?.name;
      if (booking.id && name) {
        map.set(booking.id, name);
      }
    }
    return map;
  }, [bookings]);

  // Fetch lessons for this student
  const today = new Date();
  const startDate = new Date(today.getFullYear(), 0, 1)
    .toISOString()
    .split("T")[0];
  const endDate = new Date(today.getFullYear(), 11, 31)
    .toISOString()
    .split("T")[0];

  const { data: lessons = [], isLoading: isLoadingLessons } = useQuery({
    queryKey: ["lessons", id, startDate, endDate, effectiveSchoolId],
    queryFn: async () => {
      if (!id) return [];
      return await lessonsApi.listByRange({
        startDate,
        endDate,
        studentId: id,
        schoolId: effectiveSchoolId,
      });
    },
    enabled: !!id,
  });

  // Get level info
  const levelInfo = useMemo(() => {
    if (!student?.skillLevel) return null;
    return studentLevels.find((l) => l.slug === student.skillLevel);
  }, [student?.skillLevel, studentLevels]);

  // Get student initials
  const initials = useMemo(() => {
    if (!student) return "";
    const first = student.firstName?.charAt(0) || "";
    const last = student.lastName?.charAt(0) || "";
    return (first + last).toUpperCase() || "ST";
  }, [student]);

  // Filter lessons by completed/upcoming using Date objects
  const now = useMemo(() => new Date(), []);

  const completedLessons = useMemo(() => {
    return lessons.filter((lesson: LessonListItem) => {
      const lessonDateTime = parseLessonDateTime(lesson);
      if (!lessonDateTime) return false;
      return lessonDateTime < now;
    });
  }, [lessons, now]);

  const upcomingLessons = useMemo(() => {
    return lessons.filter((lesson: LessonListItem) => {
      const lessonDateTime = parseLessonDateTime(lesson);
      if (!lessonDateTime) return false;
      return lessonDateTime >= now;
    });
  }, [lessons, now]);

  // Get scheduled lessons for bookings
  const getScheduledLessonsForBooking = (
    bookingId: string,
  ): LessonListItem[] => {
    return lessons.filter((lesson: LessonListItem) => {
      return lesson.booking_id === bookingId;
    });
  };

  const getLessonProductName = (lesson: LessonListItem) => {
    if (lesson.product_name) return lesson.product_name;
    if (lesson.booking_id) {
      return bookingProductNameByBookingId.get(lesson.booking_id);
    }
    return undefined;
  };

  const formatHours = (hours: number) => {
    // Keep quarter-hour precision (e.g. 1.25h) and avoid noisy trailing zeros.
    return Number(hours.toFixed(2)).toString();
  };

  const updateStudentMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateStudentRequest }) =>
      studentsApi.updateStudent(id, data, effectiveSchoolId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["student", id] });
      queryClient.invalidateQueries({ queryKey: ["students"] });
      setShowEditForm(false);
      toast.success(t("students.studentUpdated"));
    },
    onError: (error: any) => {
      toast.error(
        getTranslatedError(error) || t("students.studentUpdateFailed"),
      );
    },
  });

  const deleteBookingMutation = useDeleteBooking();
  const deleteLessonMutation = useMutation({
    mutationFn: (lessonId: string) => lessonsApi.delete(lessonId),
    onSuccess: async () => {
      toast.success(
        t("lessons.deleted", { defaultValue: "Lesson deleted successfully" }),
      );
      await queryClient.invalidateQueries({ queryKey: ["lessons"], exact: false });
      await queryClient.invalidateQueries({ queryKey: ["bookings"], exact: false });
    },
    onError: (error: any) => {
      toast.error(
        getTranslatedError(error) ||
          t("lessons.deleteFailed", { defaultValue: "Failed to delete lesson" }),
      );
    },
  });

  const handleUpdateStudent = (data: UpdateStudentRequest) => {
    if (id) {
      updateStudentMutation.mutate({ id, data });
    }
  };

  if (isLoadingStudent) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pink-600 mx-auto mb-2"></div>
          <div className="text-gray-600">
            {t("common.loading", { defaultValue: "Loading..." })}
          </div>
        </div>
      </div>
    );
  }

  if (studentError || !student) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="text-red-500 text-lg mb-2">
            {t("students.errorLoadingStudent", {
              defaultValue: "Error loading student",
            })}
          </div>
          <Button onClick={() => navigate("/students")} variant="outline">
            <ArrowLeft className="w-4 h-4 mr-2" />
            {t("common.back", { defaultValue: "Back" })}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          onClick={() => navigate("/students")}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>
            {t("students.backToStudents", { defaultValue: "Back to students" })}
          </span>
        </Button>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16">
              <AvatarFallback className="bg-pink-100 text-pink-700 text-xl font-semibold">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {student.firstName} {student.lastName}
              </h1>
              {levelInfo && (
                <Badge
                  style={{
                    backgroundColor: levelInfo.color,
                    color: "white",
                  }}
                  className="mt-2"
                >
                  {levelInfo.name}
                </Badge>
              )}
            </div>
          </div>
          <Button
            onClick={() => setShowEditForm(true)}
            className="bg-pink-600 hover:bg-pink-700 text-white"
          >
            <Edit className="w-4 h-4 mr-2" />
            {t("students.editProfile", { defaultValue: "Edit Profile" })}
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="space-y-6"
      >
        <TabsList className="bg-gray-100 p-1 rounded-lg w-full">
          <TabsTrigger value="overview" className="rounded-md flex-1">
            {t("students.overview", { defaultValue: "Overview" })}
          </TabsTrigger>
          <TabsTrigger value="stay" className="rounded-md flex-1">
            {t("students.stay", { defaultValue: "Stay" })}
          </TabsTrigger>
          <TabsTrigger value="packages" className="rounded-md flex-1">
            {t("students.packages", { defaultValue: "Packages" })}
          </TabsTrigger>
          <TabsTrigger value="lessons" className="rounded-md flex-1">
            {t("students.lessons", { defaultValue: "Lessons" })} (
            {lessons.length})
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          {/* Contact Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5" />
                {t("students.contactInformation", {
                  defaultValue: "Contact Information",
                })}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <Mail className="w-5 h-5 text-gray-400 flex-shrink-0" />
                <span className="text-gray-900 break-words">
                  {student.email}
                </span>
              </div>
              {student.whatsappNumber && (
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <Phone className="w-5 h-5 text-gray-400" />
                    <span className="text-gray-900 break-words">
                      {student.whatsappNumber}
                    </span>
                  </div>
                  <Button
                    onClick={() => {
                      const numberToUse = student.whatsappNumber;
                      const cleanNumber = numberToUse?.replace(/\D/g, "");
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
                    className="bg-green-600 hover:bg-green-700 text-white w-full sm:w-auto"
                  >
                    <MessageCircle className="w-4 h-4 mr-2" />
                    <span className="hidden sm:inline">
                      {t("students.sendWhatsAppMessage", {
                        defaultValue: "Send WhatsApp message",
                      })}
                    </span>
                    <span className="sm:hidden">
                      {t("students.sendWhatsApp", { defaultValue: "WhatsApp" })}
                    </span>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Physical Data */}
            <Card>
              <CardHeader>
                <CardTitle>
                  {t("students.physicalData", {
                    defaultValue: "Physical Data",
                  })}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {student.weight ||
                student.height ||
                student.nationality ||
                student.canSwim !== undefined ||
                student.primarySport ||
                student.ridingBackground ? (
                  <div className="space-y-3">
                    {student.weight && (
                      <div className="flex items-center gap-2">
                        <span className="text-gray-500 w-5 flex justify-center">
                          <Weight className="w-4 h-4" />
                        </span>
                        <span className="text-gray-900">
                          {student.weight} kg
                        </span>
                      </div>
                    )}
                    {student.height && (
                      <div className="flex items-center gap-2">
                        <span className="text-gray-500 w-5 flex justify-center">
                          <Ruler className="w-4 h-4" />
                        </span>
                        <span className="text-gray-900">
                          {student.height} cm
                        </span>
                      </div>
                    )}
                    {student.nationality && (
                      <div>
                        <div className="text-sm font-medium text-gray-700">
                          {t("students.nationality", {
                            defaultValue: "Nationality",
                          })}
                        </div>
                        <div className="text-gray-900">
                          {student.nationality}
                        </div>
                      </div>
                    )}
                    {student.canSwim !== undefined && (
                      <div>
                        <div className="text-sm font-medium text-gray-700">
                          {t("students.canSwim", {
                            defaultValue: "Can you swim?",
                          })}
                        </div>
                        <div className="text-gray-900">
                          {student.canSwim
                            ? t("students.canSwimYes", { defaultValue: "Yes" })
                            : t("students.canSwimNo", { defaultValue: "No" })}
                        </div>
                      </div>
                    )}
                    {student.primarySport && (
                      <div>
                        <div className="text-sm font-medium text-gray-700">
                          {t("students.primarySport", {
                            defaultValue: "Sport",
                          })}
                        </div>
                        <div className="text-gray-900">
                          {student.primarySport}
                        </div>
                      </div>
                    )}
                    {student.ridingBackground && (
                      <div>
                        <div className="text-sm font-medium text-gray-700">
                          {t("students.ridingBackground", {
                            defaultValue: "Riding Background",
                          })}
                        </div>
                        <div className="text-gray-900">
                          {student.ridingBackground}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-gray-500 text-sm">
                    {t("students.noDataAvailable", {
                      defaultValue: "No data available",
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Languages */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Globe className="w-5 h-5" />
                  {t("students.languages", { defaultValue: "Languages" })}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {Array.isArray(student.preferredLanguage) &&
                student.preferredLanguage.length > 0 ? (
                  <div>
                    <div className="text-sm font-medium text-gray-500 mb-1">
                      {t("students.preferredLanguage", {
                        defaultValue: "Languages spoken:",
                      })}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {student.preferredLanguage.map((lang, idx) => (
                        <Badge
                          key={`${lang}-${idx}`}
                          variant="outline"
                          className="px-3 py-1 text-sm"
                        >
                          {lang}
                        </Badge>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="text-gray-500 text-sm">
                    {t("students.noDataAvailable", {
                      defaultValue: "No data available",
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Special Needs */}
          <Card>
            <CardHeader>
              <CardTitle>
                {t("students.specialNeeds", { defaultValue: "Special Needs" })}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {student.specialNeeds && student.specialNeeds.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {student.specialNeeds.map((need, idx) => (
                    <Badge
                      key={idx}
                      variant="secondary"
                      className="px-3 py-1 text-sm bg-gray-100 text-gray-800 hover:bg-gray-200"
                    >
                      {need}
                    </Badge>
                  ))}
                </div>
              ) : (
                <div className="text-gray-500 text-sm">
                  {t("students.noSpecialNeeds", {
                    defaultValue: "No special needs indicated",
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* General Notes */}
          <Card>
            <CardHeader>
              <CardTitle>
                {t("students.generalNotes", { defaultValue: "General Notes" })}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {student.notes ? (
                <div className="text-gray-900 whitespace-pre-wrap">
                  {student.notes}
                </div>
              ) : (
                <div className="text-gray-500 text-sm">
                  {t("students.noNotes", {
                    defaultValue: "No notes available",
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Preferences */}
          <Card>
            <CardHeader>
              <CardTitle>
                {t("students.preferences", { defaultValue: "Preferences" })}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <div className="text-sm font-medium text-gray-700 mb-2">
                    {t("students.preferredTimeSlots", {
                      defaultValue: "Preferred Time Slots",
                    })}
                  </div>
                  {student.preferredTimeSlots &&
                  student.preferredTimeSlots.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {student.preferredTimeSlots.map((slot) => (
                        <Badge
                          key={slot}
                          variant="outline"
                          className="bg-blue-50 text-blue-700 border-blue-200"
                        >
                          {t(`students.${slot}`, { defaultValue: slot })}
                        </Badge>
                      ))}
                    </div>
                  ) : (
                    <div className="text-sm text-gray-500">
                      {t("students.noDataAvailable", {
                        defaultValue: "No data available",
                      })}
                    </div>
                  )}
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-700 mb-2">
                    {t("students.preferredLessonTypes", {
                      defaultValue: "Lesson Types",
                    })}
                  </div>
                  {student.preferredLessonTypes &&
                  student.preferredLessonTypes.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {student.preferredLessonTypes.map((type) => (
                        <Badge
                          key={type}
                          variant="outline"
                          className="bg-purple-50 text-purple-700 border-purple-200"
                        >
                          {t(`students.${type}`, { defaultValue: type })}
                        </Badge>
                      ))}
                    </div>
                  ) : (
                    <div className="text-sm text-gray-500">
                      {t("students.noDataAvailable", {
                        defaultValue: "No data available",
                      })}
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Consents */}
          <Card>
            <CardHeader>
              <CardTitle>
                {t("students.declarationsConsents", {
                  defaultValue: "Consents & Declarations",
                })}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <ConsentRow
                  labelKey="students.consentPhysicalCondition"
                  value={student.consentPhysicalCondition}
                  required
                  t={t}
                />
                <ConsentRow
                  labelKey="students.consentTermsConditions"
                  value={student.consentTermsConditions}
                  required
                  t={t}
                />
                <ConsentRow
                  labelKey="students.consentGdpr"
                  value={student.consentGdpr}
                  required
                  t={t}
                />
                <ConsentRow
                  labelKey="students.consentPhotosVideos"
                  value={student.consentPhotosVideos}
                  t={t}
                />
                <ConsentRow
                  labelKey="students.consentMarketing"
                  value={student.consentMarketing}
                  t={t}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Stay Tab */}
        <TabsContent value="stay" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <CalendarIcon className="w-5 h-5" />
                  {t("students.stay", { defaultValue: "Stay" })}
                </CardTitle>
                <Button
                  onClick={() => {
                    setScrollToSection("stay");
                    setShowEditForm(true);
                  }}
                  className="bg-pink-600 hover:bg-pink-700 text-white"
                >
                  <CalendarIcon className="w-4 h-4 mr-2" />
                  {t("students.addDates", { defaultValue: "+ Add Dates" })}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {student.arrivalDate ||
              student.departureDate ||
              student.stayNotes ? (
                <div className="space-y-4">
                  {(student.arrivalDate || student.departureDate) && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {student.arrivalDate && (
                        <div>
                          <div className="text-sm font-medium text-gray-700 mb-1">
                            {t("students.arrivalDate", {
                              defaultValue: "Arrival Date",
                            })}
                          </div>
                          <div className="text-gray-900">
                            {formatDateSafe(student.arrivalDate)}
                          </div>
                        </div>
                      )}
                      {student.departureDate && (
                        <div>
                          <div className="text-sm font-medium text-gray-700 mb-1">
                            {t("students.departureDate", {
                              defaultValue: "Departure Date",
                            })}
                          </div>
                          <div className="text-gray-900">
                            {formatDateSafe(student.departureDate)}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                  {student.stayNotes && (
                    <div>
                      <div className="text-sm font-medium text-gray-700 mb-1">
                        {t("students.stayNotes", {
                          defaultValue: "Stay Notes",
                        })}
                      </div>
                      <div className="text-gray-900 whitespace-pre-wrap">
                        {student.stayNotes}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center text-gray-500 py-12">
                  <CalendarIcon className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                  <p className="mb-4">
                    {t("students.noStayInformation", {
                      defaultValue: "No stay information available",
                    })}
                  </p>
                  <Button
                    onClick={() => {
                      setScrollToSection("stay");
                      setShowEditForm(true);
                    }}
                    className="bg-pink-600 hover:bg-pink-700 text-white"
                  >
                    <CalendarIcon className="w-4 h-4 mr-2" />
                    {t("students.addDates", {
                      defaultValue: "+ Aggiungi Date",
                    })}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Packages Tab */}
        <TabsContent value="packages" className="space-y-6">
          {isLoadingBookings ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pink-600"></div>
            </div>
          ) : bookings.length === 0 ? (
            <Card>
              <CardContent className="py-12">
                <div className="text-center text-gray-500 space-y-4">
                  <p>
                    {t("students.noPackages", {
                      defaultValue: "No packages found",
                    })}
                  </p>
                  <Button
                    onClick={() => openBookingSheet()}
                    className="bg-pink-600 hover:bg-pink-700 text-white"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    {t("bookings.create", { defaultValue: "Create Booking" })}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <>
              <div>
                <h2 className="text-xl font-semibold">
                  {t("students.activePackages", {
                    defaultValue: "Active Bookings",
                  })}{" "}
                  {student.firstName} {student.lastName}
                </h2>
                <p className="text-sm text-gray-600 mt-1">
                  {t("students.packageProgressDescription", {
                    defaultValue:
                      "Progress based on purchased bookings and completed lessons",
                  })}
                </p>
              </div>
              <div className="flex justify-end">
                <Button
                  onClick={() => openBookingSheet()}
                  className="bg-pink-600 hover:bg-pink-700 text-white"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  {t("bookings.create", { defaultValue: "Create Booking" })}
                </Button>
              </div>
              <div className="space-y-4">
                {bookings.map((booking) => {
                  const scheduledLessons = getScheduledLessonsForBooking(
                    booking.id,
                  );
                  const completedLessonsCount = completedLessons.filter((lesson) => {
                    return lesson.booking_id === booking.id;
                  }).length;
                  let productSupportsLessons = Boolean(
                    booking.products?.disciplines?.id ||
                      booking.products?.disciplines?.slug,
                  );

                  if (booking.products?.product_categories?.associable_to_lessons === false) {
                    productSupportsLessons = false;
                  }

                  const hasLessonAssociation =
                    productSupportsLessons ||
                    scheduledLessons.length > 0 ||
                    completedLessonsCount > 0 ||
                    (booking.lessons_count ?? 0) > 0;
                  const totalHours = booking.total_minutes / 60;
                  const remainingHours = booking.remaining_minutes / 60;
                  const usedHours = totalHours - remainingHours;
                  const progressPercent =
                    totalHours > 0 ? (usedHours / totalHours) * 100 : 0;
                  const scheduledHours = scheduledLessons.reduce(
                    (sum, lesson) => {
                      return sum + lesson.duration / 60;
                    },
                    0,
                  );

                  return (
                    <Card key={booking.id}>
                      <CardContent className="pt-6 space-y-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h3 className="text-lg font-semibold">
                              {booking.products?.title ||
                                booking.products?.name ||
                                t("students.unknownPackage", {
                                  defaultValue: "Unknown Package",
                                })}
                            </h3>
                            {(booking.products as any)?.description_short && (
                              <p className="text-sm text-gray-600 mt-1">
                                {(booking.products as any).description_short}
                              </p>
                            )}
                          </div>
                          {hasLessonAssociation ? (
                            <Badge className="bg-green-100 text-green-800">
                              {formatHours(remainingHours)}h{" "}
                              {t("students.remaining", {
                                defaultValue: "rimanenti",
                              })}
                            </Badge>
                          ) : null}
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              openBookingEditOnly(booking.id)
                            }
                          >
                            <Pencil className="w-3 h-3 mr-1" />
                            {t("common.edit", { defaultValue: "Edit" })}
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={async () => {
                              const ok = window.confirm(
                                t("bookings.confirmDelete", {
                                  defaultValue:
                                    "Delete this booking? This action cannot be undone.",
                                }),
                              );
                              if (!ok) return;
                              await deleteBookingMutation.mutateAsync({
                                id: booking.id,
                                schoolId: effectiveSchoolId,
                              });
                            }}
                            disabled={deleteBookingMutation.isPending}
                          >
                            <Trash2 className="w-3 h-3 mr-1" />
                            {t("common.delete", { defaultValue: "Delete" })}
                          </Button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2 border-t">
                          <div>
                            <div className="text-sm font-medium">
                              {t("bookings.dateRange", {
                                defaultValue: "Date range",
                              })}
                            </div>
                            <div className="text-sm text-gray-600">
                              {booking.start_date}
                              {booking.end_date ? ` - ${booking.end_date}` : ""}
                            </div>
                          </div>
                          <div>
                            <div className="text-sm font-medium">
                              {t("bookings.status", { defaultValue: "Status" })}
                            </div>
                            <div className="text-sm text-gray-600 capitalize">
                              {booking.payment_status || booking.status}
                            </div>
                          </div>
                          <div>
                            <div className="text-sm font-medium">
                              {t("bookings.finalPrice", {
                                defaultValue: "Final price",
                              })}
                            </div>
                            <div className="text-sm text-gray-600">
                              {booking.final_price ?? "-"}
                            </div>
                          </div>
                        </div>
                        {hasLessonAssociation ? (
                          <div className="space-y-2">
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-gray-600">
                                {formatHours(usedHours)}h{" "}
                                {t("students.of", { defaultValue: "of" })}{" "}
                                {formatHours(totalHours)}h (
                                {progressPercent.toFixed(0)}%)
                              </span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2.5">
                              <div
                                className="bg-pink-600 h-2.5 rounded-full transition-all"
                                style={{
                                  width: `${Math.min(progressPercent, 100)}%`,
                                }}
                              ></div>
                            </div>
                          </div>
                        ) : null}

                        {hasLessonAssociation ? (
                          <>
                            <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                              <div className="flex items-center gap-2">
                                <Clock className="w-4 h-4 text-gray-400" />
                                <div>
                                  <div className="text-sm font-medium">
                                    {t("students.scheduledHours", {
                                      defaultValue: "Ore programmate",
                                    })}
                                  </div>
                                  <div className="text-sm text-gray-600">
                                    {formatHours(scheduledHours)}h
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <CalendarIcon className="w-4 h-4 text-gray-400" />
                                <div>
                                  <div className="text-sm font-medium">
                                    {t("students.scheduledLessons", {
                                      defaultValue: "Lezioni programmate",
                                    })}{" "}
                                    ({scheduledLessons.length})
                                  </div>
                                  {scheduledLessons.length > 0 && (
                                    <div className="text-sm text-gray-600">
                                      {scheduledLessons
                                        .slice(0, 2)
                                        .map((lesson) => (
                                          <div key={lesson.id}>
                                            {new Date(
                                              lesson.date,
                                            ).toLocaleDateString(locale)}{" "}
                                            - {lesson.time?.substring(0, 5)}
                                          </div>
                                        ))}
                                      {scheduledLessons.length > 2 && (
                                        <div className="text-xs text-gray-500">
                                          +{scheduledLessons.length - 2}{" "}
                                          {t("students.more", {
                                            defaultValue: "more",
                                          })}
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>

                            <div className="pt-2 text-sm text-gray-600">
                              {completedLessonsCount}{" "}
                              {t("students.of", { defaultValue: "of" })}{" "}
                              {scheduledLessons.length}{" "}
                              {t("students.lessonsCompleted", {
                                defaultValue: "lessons completed",
                              })}
                            </div>
                          </>
                        ) : null}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </>
          )}
        </TabsContent>

        {/* Lessons Tab */}
        <TabsContent value="lessons" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <CalendarIcon className="w-5 h-5" />
                  {t("students.lessonHistory", {
                    defaultValue: "Lesson History",
                  })}
                </CardTitle>
                <Button
                  onClick={() => navigate("/calendar")}
                  className="bg-pink-600 hover:bg-pink-700 text-white"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  {t("lessons.create", { defaultValue: "Create Lesson" })}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="completed" className="w-full">
                <TabsList className="mb-4">
                  <TabsTrigger
                    value="completed"
                    className="flex items-center gap-2"
                  >
                    <CheckCircle className="w-4 h-4" />
                    {t("students.completed", { defaultValue: "Completed" })} (
                    {completedLessons.length})
                  </TabsTrigger>
                  <TabsTrigger
                    value="upcoming"
                    className="flex items-center gap-2"
                  >
                    <Clock className="w-4 h-4" />
                    {t("students.upcoming", { defaultValue: "Upcoming" })} (
                    {upcomingLessons.length})
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="completed">
                  {isLoadingLessons ? (
                    <div className="flex items-center justify-center h-32">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pink-600"></div>
                    </div>
                  ) : completedLessons.length === 0 ? (
                    <div className="text-center text-gray-500 py-8">
                      {t("students.noCompletedLessons", {
                        defaultValue: "No completed lessons",
                      })}
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {completedLessons.map((lesson) => {
                        const disciplineObj = lesson.discipline
                          ? getDisciplineBySlug(lesson.discipline)
                          : undefined;
                        const disciplineColor =
                          disciplineObj?.color || "#6B7280";
                        return (
                          <div
                            key={lesson.id}
                            className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
                          >
                            <div className="flex items-center gap-4 flex-1">
                              <Badge
                                style={{
                                  backgroundColor: disciplineColor,
                                  color: "white",
                                }}
                                className="text-xs"
                              >
                                {lesson.discipline || "kite"}
                              </Badge>
                              <div className="flex-1">
                                <div className="font-medium">
                                  {new Date(lesson.date).toLocaleDateString(
                                    locale,
                                  )}{" "}
                                  - {lesson.time?.substring(0, 5)}
                                </div>
                                <div className="text-sm text-gray-600">
                                  {t("students.withInstructor", {
                                    defaultValue: "with",
                                  })}{" "}
                                  {lesson.instructor_first_name}{" "}
                                  {lesson.instructor_last_name}
                                </div>
                                <div className="text-sm text-gray-600">
                                  {getLessonProductName(lesson) ||
                                    t("students.noProduct", {
                                      defaultValue: "No product",
                                    })}
                                </div>
                              </div>
                            </div>
                            <div className="ml-4 flex items-center gap-2">
                              <Badge>
                                {lesson.lesson_status_name ||
                                  t("common.unknown", { defaultValue: "Unknown" })}
                              </Badge>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => navigate(`/lessons/${lesson.id}`)}
                              >
                                <Pencil className="w-3 h-3 mr-1" />
                                {t("common.edit", { defaultValue: "Edit" })}
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={async () => {
                                  const ok = window.confirm(
                                    t("lessons.confirmDelete", {
                                      defaultValue:
                                        "Delete this lesson? This action cannot be undone.",
                                    }),
                                  );
                                  if (!ok) return;
                                  await deleteLessonMutation.mutateAsync(lesson.id);
                                }}
                                disabled={deleteLessonMutation.isPending}
                              >
                                <Trash2 className="w-3 h-3 mr-1" />
                                {t("common.delete", { defaultValue: "Delete" })}
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="upcoming">
                  {isLoadingLessons ? (
                    <div className="flex items-center justify-center h-32">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pink-600"></div>
                    </div>
                  ) : upcomingLessons.length === 0 ? (
                    <div className="text-center text-gray-500 py-8">
                      {t("students.noUpcomingLessons", {
                        defaultValue: "No upcoming lessons",
                      })}
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {upcomingLessons.map((lesson) => {
                        const disciplineObj = lesson.discipline
                          ? getDisciplineBySlug(lesson.discipline)
                          : undefined;
                        const disciplineColor =
                          disciplineObj?.color || "#6B7280";
                        return (
                          <div
                            key={lesson.id}
                            className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
                          >
                            <div className="flex items-center gap-4 flex-1">
                              <Badge
                                style={{
                                  backgroundColor: disciplineColor,
                                  color: "white",
                                }}
                                className="text-xs"
                              >
                                {lesson.discipline || "kite"}
                              </Badge>
                              <div className="flex-1">
                                <div className="font-medium">
                                  {new Date(lesson.date).toLocaleDateString(
                                    locale,
                                  )}{" "}
                                  - {lesson.time?.substring(0, 5)}
                                </div>
                                <div className="text-sm text-gray-600">
                                  {t("students.withInstructor", {
                                    defaultValue: "with",
                                  })}{" "}
                                  {lesson.instructor_first_name}{" "}
                                  {lesson.instructor_last_name}
                                </div>
                                <div className="text-sm text-gray-600">
                                  {getLessonProductName(lesson) ||
                                    t("students.noProduct", {
                                      defaultValue: "No product",
                                    })}
                                </div>
                              </div>
                            </div>
                            <div className="ml-4 flex items-center gap-2">
                              <Badge>
                                {lesson.lesson_status_name ||
                                  t("common.unknown", { defaultValue: "Unknown" })}
                              </Badge>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => navigate(`/lessons/${lesson.id}`)}
                              >
                                <Pencil className="w-3 h-3 mr-1" />
                                {t("common.edit", { defaultValue: "Edit" })}
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={async () => {
                                  const ok = window.confirm(
                                    t("lessons.confirmDelete", {
                                      defaultValue:
                                        "Delete this lesson? This action cannot be undone.",
                                    }),
                                  );
                                  if (!ok) return;
                                  await deleteLessonMutation.mutateAsync(lesson.id);
                                }}
                                disabled={deleteLessonMutation.isPending}
                              >
                                <Trash2 className="w-3 h-3 mr-1" />
                                {t("common.delete", { defaultValue: "Delete" })}
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Edit Student Modal */}
      {showEditForm && student && (
        <StudentForm
          student={student}
          onSubmit={handleUpdateStudent}
          onClose={() => {
            setShowEditForm(false);
            setScrollToSection(null);
          }}
          isLoading={updateStudentMutation.isPending}
          schoolId={effectiveSchoolId}
          scrollToSection={scrollToSection}
        />
      )}

      <Dialog
        open={bookingSheetOpen}
        onOpenChange={(open) => {
          setBookingSheetOpen(open);
        }}
      >
        <DialogContent className="flex max-h-[92vh] max-w-6xl w-[95vw] flex-col gap-4 overflow-y-auto sm:max-w-6xl">
          <DialogHeader>
            <DialogTitle>
              {t("bookings.studentPanelTitle", {
                defaultValue: "Bookings & payments",
              })}
            </DialogTitle>
          </DialogHeader>
          {id && bookingSheetOpen ? (
            <BookingsPage
              key={`booking-sheet-${id}`}
              embedForStudentId={id}
              embedVariant="sheet"
            />
          ) : null}
        </DialogContent>
      </Dialog>

      {editOnlyBookingId && id ? (
        <BookingsPage
          key={`booking-edit-${id}-${editOnlyBookingId}`}
          embedForStudentId={id}
          embedVariant="editOnly"
          embedInitialEditBookingId={editOnlyBookingId}
          onStudentEmbedClose={() => setEditOnlyBookingId(null)}
        />
      ) : null}
    </div>
  );
};

export default StudentDetailPage;
