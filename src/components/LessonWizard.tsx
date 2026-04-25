import React, { useState, useEffect, useMemo } from "react";
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
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  ChevronLeft,
  ChevronRight,
  Clock,
  CheckCircle,
  Calendar,
  User,
  Users,
  Search,
  X,
  Phone,
} from "lucide-react";
import { roleAwareApi } from "@/services/role-aware-api";
import { useUserRole } from "@/hooks/useUserRole";
import { useDisciplines } from "@/hooks/useDisciplines";
import { toast } from "react-hot-toast";
import { useQuery } from "@tanstack/react-query";
import { lessonCreationApi } from "@/services/lessonCreation";
import { schoolsApi } from "@/services/schools";
import { useAuthStore } from "@/store/auth";
import { useSchoolSelectionStore } from "@/store/schoolSelection";
import { UserRole } from "@/types";
import { instructorsApi } from "@/services/instructors";
import { studentsApi } from "@/services/students";
import { useProducts } from "@/hooks/useProducts";
import { format } from "date-fns";
import { useBookingsList } from "@/hooks/useBookings";
import { Booking } from "@/services/bookings";
import { Package, CalendarCheck, Loader2 } from "lucide-react";

interface LessonWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (lessonData: any) => void;
  preselectedData?: {
    time: string;
    instructorId: string;
    date: string;
    duration?: number;
  };
  isLoading?: boolean;
}

const LessonWizard: React.FC<LessonWizardProps> = ({
  open,
  onOpenChange,
  onSave,
  preselectedData,
  isLoading = false,
}) => {
  const { t } = useTranslation();
  const { getTranslatedError } = useErrorTranslation();
  const { role, permissions } = useUserRole();
  const { user } = useAuthStore();
  const { selectedSchoolId } = useSchoolSelectionStore();

  const isSuperAdmin = user?.role === UserRole.SUPER_ADMIN;
  const effectiveSchoolId = isSuperAdmin
    ? (selectedSchoolId ?? undefined)
    : user?.schoolId;

  const { disciplines } = useDisciplines(effectiveSchoolId);
  const [currentStep, setCurrentStep] = useState(1);
  const [studentSearchQuery, setStudentSearchQuery] = useState("");

  const {
    data: instructorsData,
    isLoading: instructorsLoading,
    error: instructorsError,
  } = useQuery({
    queryKey: [
      "instructors",
      "lesson-wizard",
      effectiveSchoolId,
      user?.role,
      role,
    ],
    queryFn: async () => {
      if (user?.role === UserRole.SUPER_ADMIN && effectiveSchoolId) {
        const response = await instructorsApi.getInstructors(
          1,
          100,
          "",
          effectiveSchoolId,
        );
        return { instructors: response.instructors };
      } else {
        return await roleAwareApi.getInstructors(role, 1, 100);
      }
    },
    enabled:
      open && (user?.role !== UserRole.SUPER_ADMIN || !!effectiveSchoolId),
    staleTime: 60000,
  });

  const instructors = instructorsData?.instructors || [];

  const {
    data: studentsData,
    isLoading: studentsLoading,
    error: studentsError,
  } = useQuery({
    queryKey: [
      "students",
      "lesson-wizard",
      effectiveSchoolId,
      user?.role,
      role,
    ],
    queryFn: async () => {
      if (user?.role === UserRole.SUPER_ADMIN && effectiveSchoolId) {
        return await studentsApi.getStudents(1, 100, "", effectiveSchoolId);
      } else {
        return await roleAwareApi.getStudents(role, 1, 100);
      }
    },
    enabled:
      open &&
      permissions.canViewStudents &&
      (user?.role !== UserRole.SUPER_ADMIN || !!effectiveSchoolId),
    staleTime: 60000,
  });

  const students = studentsData?.students || [];
  const loading = instructorsLoading || studentsLoading;
  const error: string =
    instructorsError || studentsError
      ? instructorsError?.message ||
        studentsError?.message ||
        "Failed to load data"
      : "";

  const { products, isLoading: productsLoading } = useProducts({
    schoolId: effectiveSchoolId,
  });

  const activeProducts = useMemo(() => {
    return products.filter((p) => p.active !== false && p.is_active !== false);
  }, [products]);

  const defaultDiscipline = disciplines.length > 0 ? disciplines[0].slug : "";

  // Fetch school defaults
  const { data: school } = useQuery({
    queryKey: ["school", effectiveSchoolId],
    queryFn: () => schoolsApi.getById(effectiveSchoolId!),
    enabled: !!effectiveSchoolId,
  });

  // Fetch lesson statuses
  const { data: lessonStatuses = [], isLoading: lessonStatusesLoading } =
    useQuery({
      queryKey: ["lesson-statuses"],
      queryFn: () => lessonCreationApi.getLessonStatuses(),
      staleTime: 300000,
    });

  // Form data
  const [formData, setFormData] = useState({
    instructorId: preselectedData?.instructorId || "",
    selectedStudentId: undefined as string | undefined,
    studentIds: [] as string[],
    bookingId: undefined as string | undefined,
    productId: "",
    date: preselectedData?.date || "",
    time: preselectedData?.time || "",
    durationHours: 1,
    duration: Math.max(preselectedData?.duration || 0, 60),
    notes: "",
    discipline: defaultDiscipline,
    lessonStatusId: undefined as string | undefined,
  });

  const totalSteps = 4;

  useEffect(() => {
    if (disciplines.length > 0) {
      const firstDiscipline = disciplines[0].slug;
      setFormData((prev) => ({
        ...prev,
        discipline: prev.discipline || firstDiscipline,
      }));
    }
  }, [disciplines]);

  const selectedProduct = useMemo(() => {
    return activeProducts.find((p) => p.id === formData.productId);
  }, [activeProducts, formData.productId]);

  // Fetch bookings for selected student
  const { data: studentBookingsResponse, isLoading: bookingsLoading } =
    useBookingsList({
      studentId: formData.selectedStudentId,
      ...(formData.date && {
        startDate: formData.date,
        endDate: formData.date,
      }),
      ...(isSuperAdmin && effectiveSchoolId && { schoolId: effectiveSchoolId }),
    });

  const studentBookings = studentBookingsResponse?.bookings ?? [];

  const selectedBooking = useMemo(() => {
    if (!formData.bookingId) return undefined;
    return studentBookings.find((b: Booking) => b.id === formData.bookingId);
  }, [formData.bookingId, studentBookings]);

  const remainingHours = useMemo(() => {
    if (!selectedBooking) return 0;
    return Number(selectedBooking.remaining_minutes || 0) / 60;
  }, [selectedBooking]);

  const formatHours = (hours: number) => {
    const rounded = Math.round(hours * 100) / 100;
    return Number.isInteger(rounded) ? `${rounded}` : `${rounded}`;
  };

  // Set default statuses in form
  useEffect(() => {
    if (open && school) {
      setFormData((prev) => ({
        ...prev,
        lessonStatusId: school.defaultLessonStatusId || prev.lessonStatusId,
      }));
    }
  }, [open, school]);

  // Reset form when preselected data changes
  useEffect(() => {
    if (preselectedData) {
      const safeDuration = Math.max(preselectedData.duration || 0, 60);
      setFormData((prev) => ({
        ...prev,
        instructorId: preselectedData.instructorId,
        date: preselectedData.date,
        time: preselectedData.time,
        duration: safeDuration,
        durationHours: Math.max(1, safeDuration / 60),
      }));
    }
  }, [preselectedData]);

  // Update duration in minutes when durationHours changes
  useEffect(() => {
    const durationInMinutes = Math.round(formData.durationHours * 60);
    if (formData.duration !== durationInMinutes) {
      setFormData((prev) => ({
        ...prev,
        duration: durationInMinutes,
      }));
    }
  }, [formData.durationHours]);

  // Update form data when booking is selected
  useEffect(() => {
    if (formData.bookingId && selectedBooking) {
      const bookingProductId = selectedBooking.product_id;
      if (bookingProductId) {
        let disciplineSlug = "";

        if (selectedBooking.products?.disciplines?.slug) {
          disciplineSlug = selectedBooking.products.disciplines.slug;
        } else if (selectedBooking.products?.disciplines?.id) {
          const discipline = disciplines.find(
            (d) => d.id === selectedBooking.products?.disciplines?.id,
          );
          if (discipline) {
            disciplineSlug = discipline.slug;
          }
        }

        if (!disciplineSlug) {
          const bookingProduct = activeProducts.find(
            (p) => p.id === bookingProductId,
          );
          if (bookingProduct) {
            if (bookingProduct.disciplines?.id) {
              const discipline = disciplines.find(
                (d) => d.id === bookingProduct.disciplines?.id,
              );
              if (discipline) {
                disciplineSlug = discipline.slug;
              }
            } else if (bookingProduct.discipline_id) {
              const discipline = disciplines.find(
                (d) => d.id === bookingProduct.discipline_id,
              );
              if (discipline) {
                disciplineSlug = discipline.slug;
              }
            }
          }
        }

        if (!disciplineSlug && disciplines.length > 0) {
          disciplineSlug = disciplines[0].slug;
        }

        setFormData((prev) => ({
          ...prev,
          productId: bookingProductId,
          discipline:
            disciplineSlug ||
            prev.discipline ||
            (disciplines.length > 0 ? disciplines[0].slug : ""),
        }));
      }

      const maxDuration = Number(selectedBooking.remaining_minutes || 0) / 60;
      setFormData((prev) => ({
        ...prev,
        durationHours: Math.min(prev.durationHours || 1, maxDuration || 1),
      }));
    }
  }, [formData.bookingId, selectedBooking, activeProducts, disciplines]);

  // Update studentIds when selectedStudentId changes and reset booking
  useEffect(() => {
    if (formData.selectedStudentId) {
      setFormData((prev) => ({
        ...prev,
        studentIds: [formData.selectedStudentId!],
        bookingId: undefined,
        productId: "",
      }));
    }
  }, [formData.selectedStudentId]);

  const handleNext = () => {
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSave = async () => {
    try {
      // Prepare lesson data with studentIds and productId
      const lessonData: any = {
        instructorId: formData.instructorId,
        date: formData.date,
        time: formData.time,
        duration: formData.duration,
        discipline: formData.discipline,
        notes: formData.notes || "",
        lessonStatusId: formData.lessonStatusId,
      };

      if (formData.studentIds.length > 0) {
        lessonData.studentIds = formData.studentIds;
      }

      if (formData.productId) {
        lessonData.productId = formData.productId;
      }

      if (formData.bookingId) {
        lessonData.bookingId = formData.bookingId;
      }

      if (isSuperAdmin && effectiveSchoolId) {
        lessonData.schoolId = effectiveSchoolId;
      }

      await onSave(lessonData);
    } catch (err: any) {
      // Handle lesson conflicts with toast
      if (
        err?.response?.data?.error?.includes(
          "already has a lesson scheduled",
        ) ||
        err?.response?.data?.error?.includes("Instructor already has a lesson")
      ) {
        toast.error(
          getTranslatedError(err) || t("lessons.instructorNotAvailable"),
        );
        return;
      }

      toast.error(getTranslatedError(err) || t("lessons.createFailed"));
    }
  };

  const updateFormData = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const selectedInstructor = instructors.find(
    (i) => i.id === formData.instructorId,
  );
  const selectedStudent = students.find(
    (s) => s.id === formData.selectedStudentId,
  );

  // Filter students based on search query
  const filteredStudents = useMemo(() => {
    if (!studentSearchQuery.trim()) return students;
    const query = studentSearchQuery.toLowerCase();
    return students.filter(
      (s) =>
        s.firstName.toLowerCase().includes(query) ||
        s.lastName.toLowerCase().includes(query) ||
        s.email.toLowerCase().includes(query),
    );
  }, [students, studentSearchQuery]);

  const renderStep1 = () => {
    // Format date for display
    const formattedDate = formData.date
      ? format(new Date(formData.date), "M/d/yyyy")
      : "";

    return (
      <div className="space-y-4">
        <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
          <div className="flex items-center gap-4 text-sm text-gray-700">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              <span>{formattedDate || t("lessonWizard.notSelected")}</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              <span>{formData.time || t("lessonWizard.notSelected")}</span>
            </div>
            {selectedInstructor && (
              <div className="flex items-center gap-2">
                <User className="h-4 w-4" />
                <span>
                  {selectedInstructor.firstName} {selectedInstructor.lastName}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* step1 :Student selection */}
        <div>
          <h3 className="text-lg font-medium mb-2">
            {t("lessonWizard.selectStudent", {
              defaultValue: "Select Student",
            })}
          </h3>
          <p className="text-sm text-gray-600 mb-4">
            {t("lessonWizard.step1Description", {
              defaultValue: "Choose a student for this lesson",
            })}
          </p>

          {/* Selected student display */}
          {selectedStudent && (
            <div className="mb-4 p-3 bg-pink-50 border border-pink-200 rounded-lg">
              <div className="flex items-center gap-2">
                <User className="h-5 w-5 text-pink-600" />
                <span className="font-medium">
                  {selectedStudent.firstName} {selectedStudent.lastName}
                </span>
                <button
                  onClick={() => updateFormData("selectedStudentId", undefined)}
                  className="ml-auto text-pink-600 hover:text-pink-800"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}

          {/* Search bar */}
          {!selectedStudent && (
            <div className="mb-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  type="text"
                  placeholder={t("lessonWizard.searchStudent", {
                    defaultValue: "Search students",
                  })}
                  value={studentSearchQuery}
                  onChange={(e) => setStudentSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
          )}

          {/* Student list */}
          {!selectedStudent && (
            <div className="border rounded-lg max-h-[400px] overflow-y-auto">
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-pink-600"></div>
                </div>
              ) : filteredStudents.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  {studentSearchQuery
                    ? t("lessonWizard.noStudentsFound", {
                        defaultValue: "No students found",
                      })
                    : t("lessonWizard.noStudentsAvailable", {
                        defaultValue: "No students available",
                      })}
                </div>
              ) : (
                <div className="divide-y">
                  {filteredStudents
                    // .filter((student) => student.isActive !== false)
                    .map((student) => {
                      const isSelected =
                        formData.selectedStudentId === student.id;
                      return (
                        <div
                          key={student.id}
                          className={`p-3 cursor-pointer hover:bg-gray-50 transition-colors ${
                            isSelected ? "bg-pink-50" : ""
                          }`}
                          onClick={() =>
                            updateFormData("selectedStudentId", student.id)
                          }
                        >
                          <div className="flex items-center gap-3">
                            <div
                              className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                                isSelected
                                  ? "bg-pink-600 border-pink-600"
                                  : "border-gray-300"
                              }`}
                            >
                              {isSelected && (
                                <CheckCircle className="h-4 w-4 text-white" />
                              )}
                            </div>
                            <User className="h-5 w-5 text-gray-400 flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-medium">
                                  {student.firstName} {student.lastName}
                                </span>
                                {student.skillLevel && (
                                  <Badge variant="outline" className="text-xs">
                                    {student.skillLevel}
                                  </Badge>
                                )}
                              </div>
                              <div className="text-sm text-gray-500 space-y-0.5">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="truncate">
                                    {student.email}
                                  </span>
                                  {student.whatsappNumber && (
                                    <>
                                      <span className="text-gray-300">•</span>
                                      <span className="flex items-center gap-1 text-xs">
                                        <Phone className="h-3 w-3" />
                                        <span>{student.whatsappNumber}</span>
                                      </span>
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderStep2 = () => {
    if (!formData.selectedStudentId) {
      return (
        <div className="text-center py-8 text-gray-500">
          {t("lessonWizard.selectStudentFirst", {
            defaultValue: "Please select a student first",
          })}
        </div>
      );
    }

    const formattedDate = formData.date
      ? format(new Date(formData.date), "M/d/yyyy")
      : "";

    return (
      <div className="space-y-4">
        {/* Lesson scheduled for info */}
        <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
          <div className="flex items-center gap-4 text-sm text-gray-700 mb-2">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              <span>{formattedDate || t("lessonWizard.notSelected")}</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              <span>{formData.time || t("lessonWizard.notSelected")}</span>
            </div>
            {selectedInstructor && (
              <div className="flex items-center gap-2">
                <User className="h-4 w-4" />
                <span>
                  {selectedInstructor.firstName} {selectedInstructor.lastName}
                </span>
              </div>
            )}
          </div>
          {selectedStudent && (
            <div className="text-sm text-gray-600">
              {t("lessonWizard.studentSelected", {
                defaultValue: "Student: {{name}}",
                name: `${selectedStudent.firstName} ${selectedStudent.lastName}`,
              })}
            </div>
          )}
        </div>

        {/* step2 : Booking selection */}
        <div>
          <h3 className="text-lg font-medium mb-2">
            {t("lessonWizard.selectBooking", {
              defaultValue: "Select Booking",
            })}
          </h3>
          <p className="text-sm text-gray-600 mb-4">
            {t("lessonWizard.step2Description", {
              defaultValue: "Choose a booking for this student",
            })}
          </p>

          {bookingsLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pink-600"></div>
            </div>
          ) : studentBookings.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              {t("lessonWizard.noBookingsAvailable", {
                defaultValue: "No bookings available for this student",
              })}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 max-h-[400px] overflow-y-auto">
              {studentBookings.map((booking: Booking) => {
                const productName =
                  booking.products?.title ||
                  booking.products?.name ||
                  "Unknown Product";
                const totalHours = Math.floor(
                  (booking.total_minutes || 0) / 60,
                );
                const remainingHours = Math.floor(
                  (booking.remaining_minutes || 0) / 60,
                );
                const usedHours = totalHours - remainingHours;
                const startDate = booking.start_date
                  ? format(new Date(booking.start_date), "MMM d, yyyy")
                  : "";
                const endDate = booking.end_date
                  ? format(new Date(booking.end_date), "MMM d, yyyy")
                  : "";
                const isSelected = formData.bookingId === booking.id;

                return (
                  <Card
                    key={booking.id}
                    className={`cursor-pointer transition-all ${
                      isSelected
                        ? "border-pink-500 border-2 bg-pink-50"
                        : "hover:border-pink-300"
                    }`}
                    onClick={() => updateFormData("bookingId", booking.id)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <Package className="h-4 w-4 text-gray-500" />
                            <h4 className="font-medium text-lg">
                              {productName}
                            </h4>
                          </div>
                          <div className="flex items-center gap-4 text-sm text-gray-600 mb-2">
                            <div className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              <span>
                                {t("lessonWizard.totalHours", {
                                  defaultValue: "Total: {{hours}}h",
                                  hours: totalHours,
                                })}
                              </span>
                            </div>
                            <div className="flex items-center gap-1">
                              <CalendarCheck className="h-3 w-3" />
                              <span>
                                {t("lessonWizard.remainingHours", {
                                  defaultValue: "Remaining: {{hours}}h",
                                  hours: remainingHours,
                                })}
                              </span>
                            </div>
                          </div>
                          {(startDate || endDate) && (
                            <div className="text-xs text-gray-500 mb-2">
                              {startDate && endDate
                                ? `${startDate} - ${endDate}`
                                : startDate || endDate}
                            </div>
                          )}
                          {usedHours > 0 && (
                            <div className="text-xs text-gray-500 mb-2">
                              {t("lessonWizard.usedHours", {
                                defaultValue: "Used: {{hours}}h",
                                hours: usedHours,
                              })}
                            </div>
                          )}
                          {/* display participants in booking */}
                          {booking.participants &&
                            booking.participants.length > 0 && (
                              <div className="mt-3 pt-2 border-t border-gray-200">
                                <div className="flex items-center gap-2 mb-2">
                                  <Users className="h-3 w-3 text-gray-500" />
                                  <span className="text-xs font-medium text-gray-700">
                                    {t("lessonWizard.participants", {
                                      defaultValue: "Participants:",
                                    })}
                                  </span>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                  {booking.participants.map((participant) => {
                                    const participantName = participant.users
                                      ? `${participant.users.first_name || ""} ${participant.users.last_name || ""}`.trim()
                                      : "Unknown Student";
                                    const isSelectedStudent =
                                      participant.student_id ===
                                      formData.selectedStudentId;

                                    return (
                                      <Badge
                                        key={participant.id}
                                        variant={
                                          isSelectedStudent
                                            ? "default"
                                            : "outline"
                                        }
                                        className={`text-xs ${
                                          isSelectedStudent
                                            ? "bg-pink-100 text-pink-700 border-pink-300"
                                            : "bg-gray-50 text-gray-600"
                                        }`}
                                      >
                                        <User className="h-3 w-3 mr-1" />
                                        {participantName}
                                      </Badge>
                                    );
                                  })}
                                </div>
                              </div>
                            )}
                        </div>
                        {isSelected && (
                          <CheckCircle className="h-5 w-5 text-pink-600 flex-shrink-0 ml-2" />
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderStep3 = () => {
    if (!formData.bookingId || !selectedBooking) {
      return (
        <div className="text-center py-8 text-gray-500">
          {t("lessonWizard.selectBookingFirst", {
            defaultValue: "Please select a booking first",
          })}
        </div>
      );
    }

    const formattedDate = formData.date
      ? format(new Date(formData.date), "M/d/yyyy")
      : "";

    const maxDuration = remainingHours;
    const quarterStepCount = Math.floor(maxDuration / 0.25);
    const durationOptions = Array.from({ length: quarterStepCount }, (_, i) =>
      Number(((i + 1) * 0.25).toFixed(2)),
    );

    // Validate duration doesn't exceed remaining hours
    const currentDuration = formData.durationHours;
    if (maxDuration > 0 && currentDuration > maxDuration) {
      setFormData((prev) => ({
        ...prev,
        durationHours: maxDuration,
      }));
    } else if (maxDuration === 0 && currentDuration > 0) {
      setFormData((prev) => ({
        ...prev,
        durationHours: 0,
      }));
    }

    return (
      <div className="space-y-4">
        {/* Lesson scheduled for info */}
        <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
          <div className="flex items-center gap-4 text-sm text-gray-700 mb-2">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              <span>{formattedDate || t("lessonWizard.notSelected")}</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              <span>{formData.time || t("lessonWizard.notSelected")}</span>
            </div>
            {selectedInstructor && (
              <div className="flex items-center gap-2">
                <User className="h-4 w-4" />
                <span>
                  {selectedInstructor.firstName} {selectedInstructor.lastName}
                </span>
              </div>
            )}
          </div>
          {selectedBooking && (
            <div className="text-sm text-gray-600">
              {t("lessonWizard.bookingDetails", {
                defaultValue: "Booking: {{product}} - {{remaining}}h remaining",
                product: selectedBooking.products?.title || "Unknown",
                remaining: formatHours(remainingHours),
              })}
            </div>
          )}
        </div>

        {/* step3 : Duration selection */}
        <div>
          <h3 className="text-lg font-medium mb-2">
            {t("lessonWizard.selectDuration", {
              defaultValue: "Select Duration",
            })}
          </h3>
          <p className="text-sm text-gray-600 mb-4">
            {t("lessonWizard.step3Description", {
              defaultValue:
                "Choose how many hours to use from this booking. Available: {{hours}} hours",
              hours: formatHours(remainingHours),
            })}
          </p>

          {remainingHours <= 0 ? (
            <div className="text-center py-8 text-gray-500 border border-red-200 bg-red-50 rounded-lg">
              {t("lessonWizard.noHoursRemaining", {
                defaultValue: "No hours remaining in this booking",
              })}
            </div>
          ) : (
            <div className="border-2 border-pink-300 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-3">
                <Clock className="h-5 w-5 text-pink-600" />
                <label className="block text-sm font-medium text-gray-700">
                  {t("lessonWizard.lessonDuration", {
                    defaultValue: "Lesson Duration",
                  })}
                </label>
              </div>
              <Select
                value={formData.durationHours.toString()}
                onValueChange={(value) => {
                  const hours = parseFloat(value);
                  if (hours <= remainingHours) {
                    updateFormData("durationHours", hours);
                  } else {
                    toast.error(
                      t("lessonWizard.insufficientHours", {
                        defaultValue: "Cannot select more than {{hours}} hours",
                        hours: formatHours(remainingHours),
                      }),
                    );
                  }
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue
                    placeholder={t("lessonWizard.chooseDuration", {
                      defaultValue: "Choose duration",
                    })}
                  />
                </SelectTrigger>
                <SelectContent>
                  {durationOptions.map((hours) => (
                    <SelectItem key={hours} value={hours.toString()}>
                      {formatHours(hours)}{" "}
                      {hours === 1
                        ? t("lessonWizard.hour", { defaultValue: "hour" })
                        : t("lessonWizard.hours", { defaultValue: "hours" })}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="mt-2 text-xs text-gray-500">
                {t("lessonWizard.remainingHours", {
                  defaultValue: "{{hours}} hours remaining in this booking",
                  hours: formatHours(remainingHours),
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderStep4 = () => {
    const formattedDate = formData.date
      ? format(new Date(formData.date), "M/d/yyyy")
      : "";

    return (
      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-medium mb-2">
            {t("lessonWizard.step4")}
          </h3>
          <p className="text-sm text-gray-600 mb-4">
            {t("lessonWizard.step4Description")}
          </p>
        </div>

        <Card>
          <CardContent className="p-4 space-y-4">
            {/* step4 : Student info */}
            {selectedStudent && (
              <div className="flex items-center gap-2 mb-2">
                <User className="h-4 w-4 text-gray-500" />
                <span className="font-medium">
                  {selectedStudent.firstName} {selectedStudent.lastName}
                </span>
              </div>
            )}

            {/* Booking info */}
            {selectedBooking && (
              <div className="flex items-center gap-2 mb-2">
                <CalendarCheck className="h-4 w-4 text-gray-500" />
                <span className="text-sm text-gray-600">
                  {t("lessonWizard.booking", {
                    defaultValue: "Booking: {{product}}",
                    product: selectedBooking.products?.title || "Unknown",
                  })}
                </span>
              </div>
            )}

            {/* Product and discipline tags */}
            {selectedProduct && (
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="secondary">{selectedProduct.title}</Badge>
                {selectedProduct.disciplines && (
                  <Badge
                    style={{
                      backgroundColor: selectedProduct.disciplines.color,
                      color: "white",
                    }}
                  >
                    {selectedProduct.disciplines.display_name}
                  </Badge>
                )}
                <Badge variant="outline">{formData.durationHours}h</Badge>
              </div>
            )}

            {/* Date and time */}
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-gray-500" />
                <span>{formattedDate}</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-gray-500" />
                <span>{formData.time}</span>
              </div>
            </div>

            {/* Instructor */}
            {selectedInstructor && (
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
                  <User className="h-5 w-5 text-gray-600" />
                </div>
                <div>
                  <div className="font-medium">
                    {selectedInstructor.firstName} {selectedInstructor.lastName}
                  </div>
                  <div className="text-sm text-gray-500">
                    {t("lessonWizard.instructor")}
                  </div>
                </div>
              </div>
            )}

            {/* Remaining hours info */}
            {selectedBooking && (
              <div className="text-sm text-gray-600">
                {t("lessonWizard.hoursWillBeDeducted", {
                  defaultValue:
                    "{{hours}} hours will be deducted from booking when lesson is confirmed",
                  hours: formatHours(formData.durationHours),
                })}
              </div>
            )}

          </CardContent>
        </Card>

        {/* Status Configuration */}
        <div className="space-y-4">
          <h4 className="font-medium">
            {t("lessonWizard.statusConfiguration")}
          </h4>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t("lessonWizard.lessonStatus")}
              </label>
              <Select
                value={formData.lessonStatusId || ""}
                onValueChange={(value) =>
                  updateFormData("lessonStatusId", value || undefined)
                }
              >
                <SelectTrigger>
                  <SelectValue
                    placeholder={t(
                      "calendar.createLessonDialog.selectLessonStatus",
                    )}
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
                        <div className="flex items-center gap-2">
                          <Badge
                            style={{
                              backgroundColor: status.color,
                              color: "white",
                            }}
                            className="text-xs"
                          >
                            {status.name}
                          </Badge>
                        </div>
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t("lessonWizard.notes")}
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => updateFormData("notes", e.target.value)}
              placeholder={t("lessonWizard.notesPlaceholder")}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-pink-500"
              rows={3}
            />
          </div>
        </div>
      </div>
    );
  };

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 1:
        return renderStep1();
      case 2:
        return renderStep2();
      case 3:
        return renderStep3();
      case 4:
        return renderStep4();
      default:
        return renderStep1();
    }
  };

  const canProceed = () => {
    switch (currentStep) {
      case 1:
        return formData.selectedStudentId !== undefined;
      case 2:
        return formData.bookingId !== undefined;
      case 3:
        return (
          formData.durationHours > 0 && remainingHours >= formData.durationHours
        );
      case 4:
        return true;
      default:
        return false;
    }
  };

  // Get step title
  const getStepTitle = () => {
    switch (currentStep) {
      case 1:
        return t("lessonWizard.selectStudent", {
          defaultValue: "Select Student",
        });
      case 2:
        return t("lessonWizard.selectBooking", {
          defaultValue: "Select Booking",
        });
      case 3:
        return t("lessonWizard.selectDuration", {
          defaultValue: "Select Duration",
        });
      case 4:
        return t("lessonWizard.confirmDetails", {
          defaultValue: "Confirm Details",
        });
      default:
        return t("calendar.createLessonDialog.createLesson");
    }
  };

  // Reset form when dialog closes
  useEffect(() => {
    if (!open) {
      setCurrentStep(1);
      setStudentSearchQuery("");
      setFormData({
        instructorId: preselectedData?.instructorId || "",
        selectedStudentId: undefined,
        studentIds: [],
        bookingId: undefined,
        productId: "",
        date: preselectedData?.date || "",
        time: preselectedData?.time || "",
        durationHours: 1,
        duration: 60,
        notes: "",
        discipline: defaultDiscipline,
        lessonStatusId: undefined,
      });
    }
  }, [open, preselectedData, defaultDiscipline]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">
            {getStepTitle()}
          </DialogTitle>
          <p className="text-sm text-gray-500 mt-1">
            {t("lessonWizard.stepOf", {
              current: currentStep,
              total: totalSteps,
            })}
          </p>
        </DialogHeader>

        {loading || productsLoading ? (
          <div className="flex items-center justify-center h-32">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pink-600 mx-auto mb-2"></div>
              <div className="text-gray-600">{t("lessonWizard.loading")}</div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col flex-1">
            {/* Progress Stepper */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-4">
                {[1, 2, 3, 4].map((step) => {
                  const isCompleted = step < currentStep;
                  const isCurrent = step === currentStep;
                  return (
                    <React.Fragment key={step}>
                      <div className="flex items-center">
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                            isCompleted
                              ? "bg-green-500 text-white"
                              : isCurrent
                                ? "bg-pink-600 text-white"
                                : "bg-gray-200 text-gray-600"
                          }`}
                        >
                          {isCompleted ? (
                            <CheckCircle className="h-5 w-5" />
                          ) : (
                            step
                          )}
                        </div>
                      </div>
                      {step < totalSteps && (
                        <div
                          className={`flex-1 h-0.5 mx-2 ${
                            isCompleted ? "bg-green-500" : "bg-gray-200"
                          }`}
                        />
                      )}
                    </React.Fragment>
                  );
                })}
              </div>
            </div>

            {/* Error Display */}
            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
                {error}
              </div>
            )}

            {/* Step Content */}
            <div className="min-h-[400px] flex-1 flex flex-col">
              {renderCurrentStep()}
            </div>

            {/* Navigation */}
            <div className="flex justify-between pt-6 border-t mt-6">
              <Button
                variant="outline"
                onClick={handlePrevious}
                disabled={currentStep === 1}
                className="hover:bg-gray-50"
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                {t("lessonWizard.back")}
              </Button>

              {currentStep < 4 && (
                <Button
                  onClick={handleNext}
                  disabled={!canProceed()}
                  className="bg-pink-600 hover:bg-pink-700 text-white"
                >
                  {t("lessonWizard.continue")}
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              )}
              {currentStep === 4 && (
                <Button
                  onClick={handleSave}
                  disabled={!canProceed() || isLoading}
                  className="bg-pink-600 hover:bg-pink-700 text-white"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {t("lessonWizard.saving")}
                    </>
                  ) : (
                    t("lessonWizard.saveLesson")
                  )}
                </Button>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default LessonWizard;
