/**
 * @fileoverview Student Management Component
 * @description Complete student management interface for school admins
 * @author Ridesk Team
 * @version 1.0.0
 */

import React, { useState, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useErrorTranslation } from "@/hooks/useErrorTranslation";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "react-hot-toast";
import {
  Plus,
  Search,
  Edit,
  Trash2,
  Users,
  Phone,
  Mail,
  Download,
  Globe,
  HelpCircle,
  Info,
  StickyNote,
  Copy,
  Camera,
  Megaphone,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { lessonsApi } from "@/services/lessons";
import {
  studentsApi,
  Student,
  CreateStudentRequest,
  UpdateStudentRequest,
} from "../../services/students";
import { StudentForm } from "./StudentForm";
import { WhatsAppIcon } from "@/components/ui/icons/WhatsAppIcon";
import { useStudentLevels } from "../../hooks/useStudentLevels";
import { useAuthStore } from "../../store/auth";
import { useDisciplines } from "../../hooks/useDisciplines";
import { useSchoolSelectionStore } from "../../store/schoolSelection";
import { exportStudentsToCsv } from "../../utils/exportStudentsToCsv";
import { UserRole } from "../../types";

// Constants for special needs categorization
const MOBILITY_KEYWORDS = [
  "wheelchair",
  "mobility",
  "chair",
  "accessibility",
  "handicap",
  "disab",
];

// Utility function to classify special needs
const classifySpecialNeed = (need: string): "mobility" | "other" => {
  const lowerNeed = need.toLowerCase();
  return MOBILITY_KEYWORDS.some((keyword) => lowerNeed.includes(keyword))
    ? "mobility"
    : "other";
};

export const StudentManagement: React.FC = () => {
  const { t } = useTranslation();
  const { getTranslatedError } = useErrorTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const { selectedSchoolId } = useSchoolSelectionStore();

  const effectiveSchoolId =
    user?.role === UserRole.SUPER_ADMIN
      ? (selectedSchoolId ?? undefined)
      : user?.schoolId;

  const { studentLevels } = useStudentLevels(effectiveSchoolId);
  const { getDisciplineBySlug } = useDisciplines(effectiveSchoolId);

  // State management
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [deletingStudent, setDeletingStudent] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  const pageSize = 10;

  const handleCopyStudentRegistrationLink = async () => {
    if (!effectiveSchoolId) return;
    const url = `${window.location.origin}/student-registration/${effectiveSchoolId}`;
    try {
      await navigator.clipboard.writeText(url);
      toast.success(t("common.linkCopiedToClipboard"));
    } catch (err) {
      console.error("Failed to copy student registration link:", err);
      toast.error(t("common.copyLinkFailed"));
    }
  };

  const getLevelName = (slug: string): string => {
    if (!slug) return "";
    const level = studentLevels.find((l) => l.slug === slug);
    if (level) return level.name;
    const translationKey = `students.${slug}`;
    const translated = t(translationKey);
    return translated === translationKey ? slug : translated;
  };

  // Fetch students
  const isSuperAdmin = user?.role === UserRole.SUPER_ADMIN;
  const hasSchoolId = isSuperAdmin ? effectiveSchoolId !== undefined : true;

  const {
    data: studentsData,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["students", currentPage, searchTerm, effectiveSchoolId],
    queryFn: () =>
      studentsApi.getStudents(
        currentPage,
        pageSize,
        searchTerm,
        effectiveSchoolId,
      ),
    placeholderData: (previousData) => previousData,
    retry: 1,
    retryDelay: 1000,
    enabled: hasSchoolId,
  });

  // Get student initials
  const getStudentInitials = (student: Student) => {
    const first = student.firstName?.charAt(0) || "";
    const last = student.lastName?.charAt(0) || "";
    return (first + last).toUpperCase() || "ST";
  };

  const openWhatsApp = (rawNumber?: string) => {
    const cleanNumber = rawNumber?.replace(/\D/g, "");
    if (!cleanNumber) return;
    const w = window.open(
      `https://wa.me/${cleanNumber}`,
      "_blank",
      "noopener,noreferrer",
    );
    if (w) w.opener = null;
  };

  // Fetch lesson counts for all students using optimized aggregated endpoint
  const today = new Date();
  const startDate = new Date(today.getFullYear(), 0, 1)
    .toISOString()
    .split("T")[0];
  const endDate = new Date(today.getFullYear(), 11, 31)
    .toISOString()
    .split("T")[0];
  const students = studentsData?.students || [];
  const studentIds = students.map((s) => s.id);

  const { data: lessonCounts = [] } = useQuery({
    queryKey: [
      "lesson-counts",
      studentIds.join(","),
      startDate,
      endDate,
      effectiveSchoolId,
    ],
    queryFn: async () => {
      if (!effectiveSchoolId || studentIds.length === 0) return [];
      return await lessonsApi.countsByStudents({
        startDate,
        endDate,
        studentIds,
        schoolId: effectiveSchoolId,
      });
    },
    enabled: hasSchoolId && studentIds.length > 0,
  });

  const getStudentLessonCounts = useMemo(() => {
    const countsMap = new Map<string, { total: number; upcoming: number }>();
    lessonCounts.forEach(
      (count: { studentId: string; total: number; upcoming: number }) => {
        countsMap.set(count.studentId, {
          total: count.total,
          upcoming: count.upcoming,
        });
      },
    );
    return countsMap;
  }, [lessonCounts]);

  // Create student mutation (using school admin endpoint)
  const createStudentMutation = useMutation({
    mutationFn: (data: CreateStudentRequest) =>
      studentsApi.createStudentBySchoolAdmin(data, effectiveSchoolId),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["students"] });
      setShowCreateForm(false);
      if (data.invitation) {
        toast.success(t("students.invitationSent"));
      } else {
        toast.success(t("students.studentCreated"));
      }
    },
    onError: (error: any) => {
      toast.error(
        getTranslatedError(error) || t("students.studentCreateFailed"),
      );
    },
  });

  // Update student mutation
  const updateStudentMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateStudentRequest }) =>
      studentsApi.updateStudent(id, data, effectiveSchoolId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["students"] });
      setEditingStudent(null);
      toast.success(t("students.studentUpdated"));
    },
    onError: (error: any) => {
      toast.error(
        getTranslatedError(error) || t("students.studentUpdateFailed"),
      );
    },
  });

  // Delete student mutation
  const deleteStudentMutation = useMutation({
    mutationFn: (id: string) =>
      studentsApi.deleteStudent(id, effectiveSchoolId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["students"] });
      setDeletingStudent(null);
      toast.success(t("students.studentDeleted"));
    },
    onError: (error: any) => {
      toast.error(
        getTranslatedError(error) || t("students.studentDeleteFailed"),
      );
    },
  });

  // Toggle active status mutation
  const toggleActiveMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      studentsApi.updateStudent(id, { isActive }, effectiveSchoolId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["students"] });
      toast.success(t("students.statusUpdated"));
    },
    onError: (error: any) => {
      toast.error(
        getTranslatedError(error) || t("students.statusUpdateFailed"),
      );
    },
  });

  // Handlers
  const handleCreateStudent = (data: CreateStudentRequest) => {
    createStudentMutation.mutate(data);
  };

  const handleUpdateStudent = (data: UpdateStudentRequest) => {
    if (editingStudent) {
      updateStudentMutation.mutate({ id: editingStudent.id, data });
    }
  };

  const handleEditStudent = (student: Student) => {
    setEditingStudent(student);
  };

  const handleDeleteStudent = (studentId: string) => {
    if (window.confirm(t("students.confirmDelete"))) {
      deleteStudentMutation.mutate(studentId);
    }
  };

  const handleToggleActive = (student: Student) => {
    toggleActiveMutation.mutate({
      id: student.id,
      isActive: !student.isActive,
    });
  };

  const handleExportStudents = async () => {
    setIsExporting(true);
    try {
      // Fetch all students via pagination to ensure we export every student
      const exportBatchSize = 100;
      let page = 1;
      const allStudents: Student[] = [];

      while (true) {
        const resp = await studentsApi.getStudents(
          page,
          exportBatchSize,
          "",
          effectiveSchoolId,
        );
        const batch = resp?.students || [];
        if (batch.length === 0) break;
        allStudents.push(...batch);

        const totalPages = resp?.pagination?.totalPages;
        const fetchedPage = resp?.pagination?.page;

        if (typeof totalPages === "number" && typeof fetchedPage === "number") {
          if (fetchedPage >= totalPages) break;
        } else {
          if (batch.length < exportBatchSize) break;
        }

        page += 1;
      }

      // Let exportStudentsToCsv handle empty-array errors itself
      exportStudentsToCsv(allStudents, t);
      toast.success(t("students.exportSuccess"));
    } catch (error: any) {
      const message = getTranslatedError(error) || t("students.exportFailed");
      toast.error(message);
    } finally {
      setIsExporting(false);
    }
  };

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1);
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  // Reset search when component mounts
  useEffect(() => {
    setSearchTerm("");
  }, []);

  // show "select school" message for super admin if no school is selected
  if (user?.role === UserRole.SUPER_ADMIN && !selectedSchoolId) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">
            {t("students.title")}
          </h1>
        </div>
        <div className="bg-white rounded-lg shadow p-12">
          <div className="text-center">
            <p className="text-lg text-gray-600">
              {t("admin.selectSchoolFromDropdown", {
                defaultValue: "Please select a school from the dropdown above",
              })}
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    console.error("Students API Error:", error);

    // Only show create school button for school association errors
    if (
      error.message?.includes("not associated with any school") ||
      error.message?.includes("User not associated with any school")
    ) {
      return (
        <div className="flex items-center justify-center h-64">
          <div className="text-center max-w-md">
            <div className="text-orange-500 text-lg mb-2">
              {t("school.createSchoolFirst")}
            </div>
            <div className="text-gray-600 mb-4">
              {t("school.createSchoolFirstMessage", {
                action: t("school.addStudents"),
              })}
            </div>
            <button
              onClick={() => navigate("/school")}
              className="inline-flex items-center px-4 py-2 bg-pink-600 text-white rounded-lg hover:bg-pink-700 transition-colors"
            >
              <Plus className="w-4 h-4 mr-2" />
              {t("school.createSchool")}
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center max-w-md">
          <div className="text-red-500 text-lg mb-2">
            {t("students.errorLoadingStudents")}
          </div>
          <div className="text-gray-600 mb-4">
            {error.message || t("students.errorLoadingStudentsMessage")}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {t("students.title")}
          </h1>
          <p className="text-gray-600">Manage your school's students</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleExportStudents}
            disabled={
              isExporting ||
              isLoading ||
              !studentsData?.students ||
              studentsData.students.length === 0
            }
            className="inline-flex items-center justify-center flex-1 sm:flex-none px-4 py-2 border border-gray-300 text-gray-700 bg-white rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isExporting ? (
              <>
                <div className="w-4 h-4 mr-2 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
                {t("students.exportingData")}
              </>
            ) : (
              <>
                <Download className="w-4 h-4 mr-2" />
                {t("students.exportData")}
              </>
            )}
          </button>
          <button
            type="button"
            onClick={handleCopyStudentRegistrationLink}
            disabled={!effectiveSchoolId}
            className="inline-flex items-center justify-center flex-1 sm:flex-none px-4 py-2 border border-gray-300 text-gray-700 bg-white rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Copy className="w-4 h-4 mr-2" />
            {t("students.copySelfRegistrationLink")}
          </button>
          <button
            onClick={() => setShowCreateForm(true)}
            className="inline-flex items-center justify-center flex-1 sm:flex-none px-4 py-2 bg-pink-600 text-white rounded-lg hover:bg-pink-700 transition-colors"
          >
            <Plus className="w-4 h-4 mr-2" />
            {t("students.createStudent")}
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
        <input
          type="text"
          placeholder={t("students.searchStudents")}
          value={searchTerm}
          onChange={handleSearch}
          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
        />
      </div>

      {/* Students Table */}
      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pink-600 mx-auto mb-2"></div>
            <div className="text-gray-600">{t("students.loadingStudents")}</div>
          </div>
        </div>
      ) : !studentsData ||
        !studentsData.students ||
        studentsData.students.length === 0 ? (
        <div className="text-center py-12">
          <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {t("students.noStudentsYet")}
          </h3>
          <p className="text-gray-600 mb-4">
            Get started by creating your first student
          </p>
          <button
            onClick={() => setShowCreateForm(true)}
            className="inline-flex items-center px-4 py-2 bg-pink-600 text-white rounded-lg hover:bg-pink-700 transition-colors"
          >
            <Plus className="w-4 h-4 mr-2" />
            {t("students.createStudent")}
          </button>
        </div>
      ) : (
        <>
          {/* Desktop Table */}
          <div className="hidden md:block bg-white rounded-lg shadow overflow-x-auto">
            <table
              className="divide-y divide-gray-200"
              style={{ minWidth: "1024px", width: "100%" }}
            >
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t("students.student", { defaultValue: "Student" })}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t("students.whatsappNumber", { defaultValue: "WhatsApp" })}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t("students.skillLevel", { defaultValue: "Level" })}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t("students.info", { defaultValue: "Info" })}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t("students.lessons", { defaultValue: "Lessons" })}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t("students.upcoming", { defaultValue: "Upcoming" })}
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t("students.actions", { defaultValue: "Actions" })}
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {(studentsData?.students || []).map((student) => {
                  const initials = getStudentInitials(student);
                  const lessonCounts = getStudentLessonCounts.get(
                    student.id,
                  ) || { total: 0, upcoming: 0 };

                  return (
                    <tr
                      key={student.id}
                      className="hover:bg-gray-50 cursor-pointer"
                      tabIndex={0}
                      aria-label={`${t("students.viewDetails", { defaultValue: "View details" })} ${student.firstName || ""} ${student.lastName || ""}`.trim()}
                      onClick={(e) => {
                        const target = e.target as HTMLElement;
                        if (
                          target.closest("button") ||
                          target.closest(".action-buttons")
                        ) {
                          return;
                        }
                        navigate(`/students/${student.id}`);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          const target = e.target as HTMLElement;
                          if (
                            target.closest("button") ||
                            target.closest(".action-buttons")
                          ) {
                            return;
                          }
                          e.preventDefault();
                          navigate(`/students/${student.id}`);
                        }
                      }}
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-10 w-10">
                            <AvatarFallback className="bg-pink-100 text-pink-700 text-sm font-semibold">
                              {initials}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {student.firstName} {student.lastName}
                            </div>
                            <div className="text-sm text-gray-500">
                              {student.email}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {student.whatsappNumber ? (
                          <div className="flex items-center gap-2">
                            <span>{student.whatsappNumber}</span>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                openWhatsApp(student.whatsappNumber);
                              }}
                              className="text-green-600 hover:text-green-700"
                              title={t("students.sendWhatsApp")}
                              aria-label={t("students.sendWhatsApp")}
                            >
                              <WhatsAppIcon className="h-4 w-4" />
                            </button>
                          </div>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {student.skillLevel ? (
                          <Badge
                            style={{
                              backgroundColor:
                                studentLevels.find(
                                  (l) => l.slug === student.skillLevel,
                                )?.color || "#6B7280",
                              color: "white",
                            }}
                            className="text-xs"
                          >
                            {getLevelName(student.skillLevel)}
                          </Badge>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div className="flex flex-wrap gap-2 items-center">
                          {Array.isArray(student.preferredLanguage) &&
                            student.preferredLanguage.length > 0 && (
                              <div className="flex flex-wrap gap-1 items-center">
                                <Globe className="w-3 h-3 text-gray-400" />
                                {student.preferredLanguage.map(
                                  (lang, idx) => (
                                    <Badge
                                      key={`${student.id}-${lang}-${idx}`}
                                      variant="outline"
                                      className="text-xs font-normal text-gray-600 border-gray-200"
                                    >
                                      {lang}
                                    </Badge>
                                  ),
                                )}
                              </div>
                            )}
                          {student.specialNeeds &&
                            student.specialNeeds.length > 0 && (
                              <div className="flex items-center gap-1">
                                {student.specialNeeds
                                  .slice(0, 2)
                                  .map((need: string, idx: number) => (
                                    <div
                                      key={`${student.id}-${need}-${idx}`}
                                      className="bg-yellow-100 p-1 rounded-full"
                                      title={need}
                                      role="img"
                                      aria-label={need}
                                    >
                                      {classifySpecialNeed(need) ===
                                      "mobility" ? (
                                        <Info
                                          className="w-3 h-3 text-yellow-700"
                                          aria-hidden="true"
                                        />
                                      ) : (
                                        <HelpCircle
                                          className="w-3 h-3 text-yellow-700"
                                          aria-hidden="true"
                                        />
                                      )}
                                    </div>
                                  ))}
                                {student.specialNeeds.length > 2 && (
                                  <span
                                    className="text-xs text-gray-500 bg-gray-100 px-1 rounded"
                                    title={t("students.moreSpecialNeeds", {
                                      defaultValue:
                                        "{{count}} more special needs",
                                      count: student.specialNeeds.length - 2,
                                    })}
                                  >
                                    +{student.specialNeeds.length - 2}
                                  </span>
                                )}
                              </div>
                            )}
                          {student.notes && (
                            <span
                              title={t("students.hasNotes", {
                                defaultValue: "Has notes",
                              })}
                              role="img"
                              aria-label={t("students.hasNotes", {
                                defaultValue: "Has notes",
                              })}
                            >
                              <StickyNote
                                className="w-4 h-4 text-gray-400"
                                aria-hidden="true"
                              />
                            </span>
                          )}
                          {/* Photos/Videos Consent */}
                          <span
                            title={student.consentPhotosVideos !== false 
                              ? t("students.consentPhotosVideos", { defaultValue: "Authorized photos/videos" })
                              : t("students.optedOutOfPhotos", { defaultValue: "Opted out of photos/videos" })
                            }
                            role="img"
                            aria-label={student.consentPhotosVideos !== false 
                              ? t("students.consentPhotosVideos")
                              : t("students.optedOutOfPhotos")
                            }
                          >
                            <Camera
                              className={`w-4 h-4 ${student.consentPhotosVideos !== false ? "text-blue-500" : "text-gray-300"}`}
                              aria-hidden="true"
                            />
                          </span>

                          {/* Marketing Consent */}
                          <span
                            title={student.consentMarketing !== false 
                              ? t("students.consentMarketing", { defaultValue: "Agreed to marketing" })
                              : t("students.optedOutOfMarketing", { defaultValue: "Opted out of marketing" })
                            }
                            role="img"
                            aria-label={student.consentMarketing !== false 
                              ? t("students.consentMarketing")
                              : t("students.optedOutOfMarketing")
                            }
                          >
                            <Megaphone
                              className={`w-4 h-4 ${student.consentMarketing !== false ? "text-green-500" : "text-gray-300"}`}
                              aria-hidden="true"
                            />
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {lessonCounts.total}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {lessonCounts.upcoming}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end space-x-2 action-buttons">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEditStudent(student);
                            }}
                            className="text-indigo-600 hover:text-indigo-900 p-1 rounded"
                            aria-label={t("students.editStudent", {
                              defaultValue: "Edit student",
                            })}
                            title={t("students.editStudent", {
                              defaultValue: "Edit student",
                            })}
                          >
                            <Edit className="w-4 h-4" aria-hidden="true" />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteStudent(student.id);
                            }}
                            disabled={deletingStudent === student.id}
                            className="text-red-600 hover:text-red-900 p-1 rounded disabled:opacity-50"
                            aria-label={t("students.deleteStudent", {
                              defaultValue: "Delete student",
                            })}
                            title={t("students.deleteStudent", {
                              defaultValue: "Delete student",
                            })}
                          >
                            <Trash2 className="w-4 h-4" aria-hidden="true" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden space-y-4">
            {(studentsData?.students || []).map((student) => (
              <div
                key={student.id}
                className="bg-white rounded-lg shadow p-4 cursor-pointer hover:bg-gray-50"
                onClick={() => navigate(`/students/${student.id}`)}
                role="button"
                tabIndex={0}
                aria-label={`${t("students.viewDetails", { defaultValue: "View details" })} ${student.firstName || ""} ${student.lastName || ""}`.trim()}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    navigate(`/students/${student.id}`);
                  }
                }}
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-medium text-gray-900">
                      {student.firstName} {student.lastName}
                    </h3>
                    <div className="flex items-center text-sm text-gray-600 mt-1">
                      <Mail className="w-4 h-4 mr-1" />
                      {student.email}
                    </div>
                    {student.whatsappNumber && (
                      <div className="flex items-center justify-between mt-1">
                        <div className="flex items-center text-sm text-gray-600">
                          <Phone className="w-4 h-4 mr-1" />
                          <span>{student.whatsappNumber}</span>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0 text-green-600 hover:text-green-700 hover:bg-green-50"
                          onClick={(e) => {
                            e.stopPropagation();
                            openWhatsApp(student.whatsappNumber);
                          }}
                          title={t("students.sendWhatsApp")}
                          aria-label={t("students.sendWhatsApp")}
                        >
                          <WhatsAppIcon className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                  <div className="flex space-x-2">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEditStudent(student);
                      }}
                      className="text-indigo-600 hover:text-indigo-900 p-1 rounded"
                      aria-label={t("students.editStudent", {
                        defaultValue: "Edit student",
                      })}
                      title={t("students.editStudent", {
                        defaultValue: "Edit student",
                      })}
                    >
                      <Edit className="w-4 h-4" aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteStudent(student.id);
                      }}
                      disabled={deletingStudent === student.id}
                      className="text-red-600 hover:text-red-900 p-1 rounded disabled:opacity-50"
                      aria-label={t("students.deleteStudent", {
                        defaultValue: "Delete student",
                      })}
                      title={t("students.deleteStudent", {
                        defaultValue: "Delete student",
                      })}
                    >
                      <Trash2 className="w-4 h-4" aria-hidden="true" />
                    </button>
                  </div>
                </div>
                <div className="space-y-2">
                  <div>
                    <span className="text-sm text-gray-500">Skill Level:</span>
                    {student.skillLevel ? (
                      <Badge
                        style={{
                          backgroundColor:
                            studentLevels.find(
                              (l) => l.slug === student.skillLevel,
                            )?.color || "#6B7280",
                          color: "white",
                        }}
                        className="ml-2 text-xs"
                      >
                        {getLevelName(student.skillLevel)}
                      </Badge>
                    ) : (
                      <span className="ml-2 text-gray-400">-</span>
                    )}
                  </div>
                  <div>
                    <span className="text-sm text-gray-500">Languages:</span>
                    {Array.isArray(student.preferredLanguage) &&
                    student.preferredLanguage.length > 0 ? (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {student.preferredLanguage.map((lang, idx) => (
                          <Badge
                            key={`${student.id}-mobile-lang-${lang}-${idx}`}
                            variant="outline"
                            className="bg-blue-50 text-blue-700 border-blue-200 text-xs"
                          >
                            {lang}
                          </Badge>
                        ))}
                      </div>
                    ) : (
                      <span className="ml-2 text-gray-400">-</span>
                    )}
                  </div>
                  <div>
                    <span className="text-sm text-gray-500">Disciplines:</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {(student.preferredDisciplines || []).map(
                        (discipline) => {
                          const disciplineObj = getDisciplineBySlug(discipline);
                          const displayName =
                            disciplineObj?.display_name || discipline;
                          return (
                            <Badge
                              key={discipline}
                              variant="outline"
                              className="bg-blue-50 text-blue-700 border-blue-200 text-xs"
                            >
                              {displayName}
                            </Badge>
                          );
                        },
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-500">
                      {t("students.consents", { defaultValue: "Consents:" })}
                    </span>
                    <div className="flex gap-2">
                      {/* Photos/Videos Authorization Badge */}
                      <span
                        title={student.consentPhotosVideos !== false 
                          ? t("students.consentPhotosVideos", { defaultValue: "Authorized photos/videos" })
                          : t("students.optedOutOfPhotos", { defaultValue: "Opted out of photos/videos" })
                        }
                        role="img"
                        aria-label={student.consentPhotosVideos !== false 
                          ? t("students.consentPhotosVideos", { defaultValue: "Authorized photos/videos" })
                          : t("students.optedOutOfPhotos", { defaultValue: "Opted out of photos/videos" })
                        }
                        className={`${student.consentPhotosVideos !== false ? "bg-blue-50" : "bg-gray-50"} p-1 rounded-full`}
                      >
                        <Camera className={`w-3.5 h-3.5 ${student.consentPhotosVideos !== false ? "text-blue-600" : "text-gray-400"}`} />
                      </span>

                      {/* Marketing Consent Badge */}
                      <span
                        title={student.consentMarketing !== false 
                          ? t("students.consentMarketing", { defaultValue: "Agreed to marketing" })
                          : t("students.optedOutOfMarketing", { defaultValue: "Opted out of marketing" })
                        }
                        role="img"
                        aria-label={student.consentMarketing !== false 
                          ? t("students.consentMarketing", { defaultValue: "Agreed to marketing" })
                          : t("students.optedOutOfMarketing", { defaultValue: "Opted out of marketing" })
                        }
                        className={`${student.consentMarketing !== false ? "bg-green-50" : "bg-gray-50"} p-1 rounded-full`}
                      >
                        <Megaphone className={`w-3.5 h-3.5 ${student.consentMarketing !== false ? "text-green-600" : "text-gray-400"}`} />
                      </span>
                    </div>
                  </div>
                  <div>
                    <button
                      onClick={() => handleToggleActive(student)}
                      disabled={toggleActiveMutation.isPending}
                      className={`inline-flex items-center px-3 py-1 text-xs font-semibold rounded-full transition-colors ${
                        student.isActive
                          ? "bg-green-100 text-green-800 hover:bg-green-200"
                          : "bg-red-100 text-red-800 hover:bg-red-200"
                      } disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                      {student.isActive
                        ? t("students.active")
                        : t("students.inactive")}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {studentsData?.pagination &&
            studentsData.pagination.totalPages > 1 && (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-0">
                <div className="text-sm text-gray-700 text-center sm:text-left">
                  Showing {(currentPage - 1) * pageSize + 1} to{" "}
                  {Math.min(
                    currentPage * pageSize,
                    studentsData.pagination.total,
                  )}{" "}
                  of {studentsData.pagination.total} students
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>
                  <span className="px-3 py-1 text-sm bg-pink-100 text-pink-800 rounded-md whitespace-nowrap">
                    {currentPage} of {studentsData.pagination.totalPages}
                  </span>
                  <button
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={
                      currentPage === studentsData.pagination.totalPages
                    }
                    className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
        </>
      )}

      {/* Create/Edit Student Modal */}
      {(showCreateForm || editingStudent) && (
        <StudentForm
          student={editingStudent}
          onSubmit={
            editingStudent ? handleUpdateStudent : (handleCreateStudent as any)
          }
          onClose={() => {
            setShowCreateForm(false);
            setEditingStudent(null);
          }}
          isLoading={
            createStudentMutation.isPending || updateStudentMutation.isPending
          }
          schoolId={effectiveSchoolId}
        />
      )}
    </div>
  );
};
