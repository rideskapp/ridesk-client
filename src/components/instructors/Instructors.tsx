import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useErrorTranslation } from "@/hooks/useErrorTranslation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Search,
  Plus,
  Phone,
  Mail,
  MoreVertical,
  User,
  Languages,
  CheckCircle,
  XCircle,
  Edit,
  Archive,
  Loader2,
  Euro,
  AlertTriangle,
  Calendar,
  Copy,
} from "lucide-react";
import {
  useInstructors,
  type Instructor,
  type CreateInstructorRequest,
  type UpdateInstructorRequest,
} from "@/hooks/useInstructors";
import { useNavigate } from "react-router-dom";
import { useLessons } from "@/hooks/useLessons";
import { toast } from "react-hot-toast";
import { useDisciplines } from "@/hooks/useDisciplines";
import { useAuthStore } from "@/store/auth";
import { useSchoolSelectionStore } from "@/store/schoolSelection";
import { UserRole } from "@/types";
import { InstructorForm } from "./InstructorForm";
import { useInstructorMissingRates } from "@/hooks/useInstructorMissingRates";
import { useCompensationMode } from "@/hooks/useCompensationMode";
import ManageCompensationDialog from "./ManageCompensationDialog";
import { AggregatedAvailabilityCalendar } from "@/components/availability/AggregatedAvailabilityCalendar";
import { NewAvailabilityManager } from "@/components/availability/NewAvailabilityManager";
import { instructorLessonPermissionsApi } from "@/services/instructorLessonPermissions";

export default function Instructors() {
  const { t } = useTranslation();
  const { getTranslatedError } = useErrorTranslation();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { selectedSchoolId } = useSchoolSelectionStore();
  const [manageCompensationDialogOpen, setManageCompensationDialogOpen] =
    useState(false);
  const [
    selectedInstructorForCompensation,
    setSelectedInstructorForCompensation,
  ] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [aggregatedAvailabilityOpen, setAggregatedAvailabilityOpen] =
    useState(false);
  const [editingInstructorAvailability, setEditingInstructorAvailability] =
    useState<{
      id: string;
      name: string;
    } | null>(null);

  const effectiveSchoolId =
    user?.role === UserRole.SUPER_ADMIN
      ? (selectedSchoolId ?? undefined)
      : user?.schoolId;

  const {
    instructors,
    loading: instructorsLoading,
    updateInstructor,
    refetch: refetchInstructors,
    createInstructor,
  } = useInstructors(effectiveSchoolId);
  const { lessons, loading: lessonsLoading } = useLessons({
    schoolId: effectiveSchoolId,
  });
  const { getDisciplineBySlug, disciplines } =
    useDisciplines(effectiveSchoolId);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedInstructor, setSelectedInstructor] =
    useState<Instructor | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [loadingActions, setLoadingActions] = useState<Set<string>>(new Set());

  const { isEnabled: isCompensationEnabled } = useCompensationMode();

  const isAnyActionLoading = loadingActions.size > 0;
  const loading = instructorsLoading || lessonsLoading;

  const handleCreate = () => {
    if (isAnyActionLoading) return;
    setSelectedInstructor(null);
    setIsFormOpen(true);
  };

  const handleCopyInstructorRegistrationLink = async () => {
    if (!effectiveSchoolId) return;
    const url = `${window.location.origin}/instructor-registration/${effectiveSchoolId}`;
    try {
      await navigator.clipboard.writeText(url);
      toast.success(t("common.linkCopiedToClipboard"));
    } catch (err) {
      console.error("Failed to copy instructor registration link:", err);
      toast.error(t("common.copyLinkFailed"));
    }
  };

  const handleEdit = (instructor: Instructor) => {
    if (isAnyActionLoading) return;
    setSelectedInstructor(instructor);
    setIsFormOpen(true);
  };

  const handleArchive = async (instructor: Instructor) => {
    setLoadingActions((prev) => new Set(prev).add(instructor.id));

    try {
      const newActiveStatus = !instructor.isActive;
      await updateInstructor({
        id: instructor.id,
        data: { isActive: newActiveStatus },
      });
      toast.success(
        newActiveStatus
          ? t("instructors.statusUpdated")
          : t("instructors.statusUpdated"),
      );
    } catch (error) {
      toast.error(
        getTranslatedError(error) || t("instructors.statusUpdateFailed"),
      );
    } finally {
      setLoadingActions((prev) => {
        const newSet = new Set(prev);
        newSet.delete(instructor.id);
        return newSet;
      });
    }
  };

  const handleToggleLessonEditPermission = async (instructor: Instructor) => {
    if (!effectiveSchoolId) return;
    setLoadingActions((prev) => new Set(prev).add(`perm-${instructor.id}`));
    try {
      const canEditLessons = !Boolean(instructor.canEditLessons);
      await instructorLessonPermissionsApi.setPermission({
        instructorId: instructor.id,
        schoolId: effectiveSchoolId,
        canEditLessons,
      });
      await refetchInstructors();
      toast.success(
        canEditLessons
          ? t("instructors.lessonEditPermissionGranted")
          : t("instructors.lessonEditPermissionRevoked"),
      );
    } catch (error: any) {
      toast.error(getTranslatedError(error) || t("instructors.permissionUpdateFailed"));
    } finally {
      setLoadingActions((prev) => {
        const next = new Set(prev);
        next.delete(`perm-${instructor.id}`);
        return next;
      });
    }
  };

  const handleCreateInstructor = (
    data: CreateInstructorRequest | UpdateInstructorRequest,
  ) => {
    createInstructor(data as CreateInstructorRequest, {
      onSuccess: () => {
        // Show clear confirmation that an invitation email was sent
        toast.success(t("instructors.invitationSent"));
        refetchInstructors();
        setIsFormOpen(false);
        setSelectedInstructor(null);
      },
      onError: (error: any) => {
        toast.error(
          getTranslatedError(error) || t("instructors.instructorCreateFailed"),
        );
      },
    });
  };

  const handleUpdateInstructor = (
    data: CreateInstructorRequest | UpdateInstructorRequest,
  ) => {
    if (!selectedInstructor) return;

    updateInstructor(
      { id: selectedInstructor.id, data: data as UpdateInstructorRequest },
      {
        onSuccess: () => {
          toast.success(t("instructors.instructorUpdated"));
          refetchInstructors();
          setIsFormOpen(false);
          setSelectedInstructor(null);
        },
        onError: (error: any) => {
          toast.error(
            getTranslatedError(error) ||
              t("instructors.instructorUpdateFailed"),
          );
        },
      },
    );
  };

  const filteredInstructors = instructors.filter(
    (instructor) =>
      `${instructor.firstName} ${instructor.lastName}`
        .toLowerCase()
        .includes(searchQuery.toLowerCase()) ||
      instructor.email.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const activeInstructors = instructors.filter(
    (instructor) => instructor.isActive === true,
  );

  const filteredActiveInstructors = filteredInstructors
    .filter((instructor) => instructor.isActive === true)
    .sort((a, b) =>
      `${a.firstName} ${a.lastName}`.localeCompare(
        `${b.firstName} ${b.lastName}`,
      ),
    );

  const filteredInactiveInstructors = filteredInstructors
    .filter((instructor) => instructor.isActive === false)
    .sort((a, b) =>
      `${a.firstName} ${a.lastName}`.localeCompare(
        `${b.firstName} ${b.lastName}`,
      ),
    );

  const getInstructorLessons = (instructorId: string) => {
    if (!lessons || !Array.isArray(lessons)) return [];
    return lessons.filter((lesson) => lesson.instructor_id === instructorId);
  };

  const getInstructorStats = (instructorId: string) => {
    const instructorLessons = getInstructorLessons(instructorId);
    const today = new Date().toISOString().split("T")[0];
    return {
      total: instructorLessons.length,
      today: instructorLessons.filter((l) => l.date === today).length,
      thisWeek: instructorLessons.filter((l) => {
        const lessonDate = new Date(l.date);
        const startOfWeek = new Date();
        startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 6);
        return lessonDate >= startOfWeek && lessonDate <= endOfWeek;
      }).length,
    };
  };

  const getSpecialtyColor = (disciplineSlug: string) => {
    if (!disciplineSlug) return "bg-gray-400 text-white";

    const discipline = getDisciplineBySlug(disciplineSlug.toLowerCase());
    if (discipline?.color) {
      return discipline.color;
    }

    switch (disciplineSlug.toLowerCase()) {
      case "kite":
        return "#EC4899";
      case "surf":
        return "#3B82F6";
      case "wing":
        return "#10B981";
      default:
        return "#6B7280";
    }
  };

  // show "select school" message for super admin if no school is selected
  if (user?.role === UserRole.SUPER_ADMIN && !selectedSchoolId) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">
            {t("instructors.title", { defaultValue: "Instructors" })}
          </h1>
        </div>
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <p className="text-lg text-gray-600">
                {t("admin.selectSchoolFromDropdown", {
                  defaultValue:
                    "Please select a school from the dropdown above",
                })}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const InstructorCard = ({ instructor }: { instructor: Instructor }) => {
    const stats = getInstructorStats(instructor.id);
    const isLoading = loadingActions.has(instructor.id);
    const { missingCount } = useInstructorMissingRates(
      instructor.id,
      effectiveSchoolId,
      isCompensationEnabled || user?.role === UserRole.INSTRUCTOR,
    );

    const handleManageCompensation = () => {
      setSelectedInstructorForCompensation({
        id: instructor.id,
        name: `${instructor.firstName} ${instructor.lastName}`,
      });
      setManageCompensationDialogOpen(true);
    };

    return (
      <Card className="shadow-soft hover:shadow-card transition-smooth">
        <CardContent className="p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <Avatar className="h-16 w-16">
                <AvatarImage
                  src={instructor.avatar}
                  alt={`${instructor.firstName} ${instructor.lastName}`}
                  className="object-cover w-full h-full"
                />
                <AvatarFallback className="bg-primary text-primary-foreground text-xl">
                  {(
                    instructor.firstName.charAt(0) +
                    instructor.lastName.charAt(0)
                  ).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div>
                <h3 className="font-semibold text-xl">
                  {instructor.firstName} {instructor.lastName}
                </h3>
                <div className="flex items-center gap-2 mt-1">
                  {instructor.isActive ? (
                    <div className="flex items-center gap-1 text-green-600">
                      <CheckCircle className="h-4 w-4" />
                      <span className="text-sm">{t("instructors.active")}</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1 text-red-600">
                      <XCircle className="h-4 w-4" />
                      <span className="text-sm">
                        {t("instructors.inactive")}
                      </span>
                    </div>
                  )}
                </div>
                {instructor.isActive &&
                  missingCount > 0 &&
                  isCompensationEnabled && (
                    <div className="flex items-center gap-1 text-yellow-600 mt-2">
                      <AlertTriangle className="h-4 w-4" />
                      <span className="text-sm">
                        Missing rates: {missingCount} category/ies need
                        configuration
                      </span>
                    </div>
                  )}
              </div>
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" disabled={isAnyActionLoading}>
                  {isAnyActionLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <MoreVertical className="h-4 w-4" />
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="bg-background border shadow-md"
              >
                <DropdownMenuItem
                  onClick={() => navigate(`/instructors/${instructor.id}`)}
                  disabled={isLoading}
                >
                  <User className="mr-2 h-4 w-4" />
                  {t("instructors.view")}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => handleEdit(instructor)}
                  disabled={isLoading}
                >
                  <Edit className="mr-2 h-4 w-4" />
                  {t("instructors.edit")}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => handleArchive(instructor)}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Archive className="mr-2 h-4 w-4" />
                  )}
                  {instructor.isActive
                    ? t("instructors.deactivate")
                    : t("instructors.reactivate")}
                </DropdownMenuItem>
                {instructor.isActive && isCompensationEnabled && (
                  <DropdownMenuItem
                    onClick={handleManageCompensation}
                    disabled={isLoading}
                  >
                    <Euro className="mr-2 h-4 w-4" />
                    <span className="flex items-center gap-2">
                      {t("compensation.manageCompensation")}
                      {missingCount > 0 && (
                        <Badge
                          variant="destructive"
                          className="h-5 w-5 p-0 flex items-center justify-center text-xs"
                        >
                          {missingCount}
                        </Badge>
                      )}
                    </span>
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem
                  onClick={() => handleToggleLessonEditPermission(instructor)}
                  disabled={isLoading || !effectiveSchoolId}
                >
                  <Edit className="mr-2 h-4 w-4" />
                  {instructor.canEditLessons
                    ? t("instructors.revokeLessonEditPermission")
                    : t("instructors.grantLessonEditPermission")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {instructor.isActive && (
            <div className="mb-4">
              <Button
                variant="outline"
                size="sm"
                className="w-full bg-blue-50 border-blue-200 text-gray-700 hover:bg-blue-100 justify-center"
                onClick={() =>
                  setEditingInstructorAvailability({
                    id: instructor.id,
                    name: `${instructor.firstName} ${instructor.lastName}`,
                  })
                }
                disabled={isLoading}
              >
                <Calendar className="h-4 w-4 mr-2" />
                {t("instructors.manageAvailability", {
                  defaultValue: "Manage Availability",
                })}
              </Button>
            </div>
          )}

          <div className="space-y-2 mb-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Mail className="h-4 w-4" />
              <a
                href={`mailto:${instructor.email}`}
                className="hover:text-primary"
              >
                {instructor.email}
              </a>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Phone className="h-4 w-4" />
                <a
                  href={`tel:${instructor.whatsappNumber}`}
                  className="hover:text-primary"
                >
                  {instructor.whatsappNumber}
                </a>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 text-green-600 hover:text-green-700 hover:bg-green-50"
                onClick={() => {
                  const cleanNumber = instructor.whatsappNumber?.replace(
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
                disabled={isAnyActionLoading}
              >
                <svg
                  className="h-3 w-3"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0020.885 3.785" />
                </svg>
              </Button>
            </div>
          </div>

          <div className="mb-4">
            <div className="text-sm font-medium mb-2">
              {t("instructors.specialties")}
            </div>
            <div className="flex flex-wrap gap-2">
              {instructor.specialties.map((specialty) => (
                <Badge
                  key={specialty}
                  style={{
                    backgroundColor: getSpecialtyColor(specialty),
                    color: "white",
                  }}
                >
                  {specialty.toUpperCase()}
                </Badge>
              ))}
            </div>
          </div>

          <div className="mb-4">
            <div className="flex items-center gap-2 mb-2">
              <Languages className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">
                {t("instructors.languages")}
              </span>
            </div>
            <div className="flex flex-wrap gap-1">
              {instructor.languages.map((language) => (
                <Badge key={language} variant="outline" className="text-xs">
                  {language}
                </Badge>
              ))}
            </div>
          </div>

          {instructor.isActive && (
            <div className="grid grid-cols-3 gap-4 mb-4">
              <div className="text-center">
                <div className="text-lg font-semibold">{stats.total}</div>
                <div className="text-xs text-muted-foreground">
                  {t("instructors.totalLessons")}
                </div>
              </div>
              <div className="text-center">
                <div className="text-lg font-semibold">{stats.today}</div>
                <div className="text-xs text-muted-foreground">
                  {t("instructors.today")}
                </div>
              </div>
              <div className="text-center">
                <div className="text-lg font-semibold">{stats.thisWeek}</div>
                <div className="text-xs text-muted-foreground">
                  {t("instructors.thisWeek")}
                </div>
              </div>
            </div>
          )}

          {instructor.notes && (
            <div className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">
              {instructor.notes}
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="h-8 bg-muted rounded w-48 animate-pulse mb-2"></div>
            <div className="h-5 bg-muted rounded w-72 animate-pulse"></div>
          </div>
          <div className="h-10 bg-muted rounded w-40 animate-pulse"></div>
        </div>

        <Card>
          <CardContent className="p-4">
            <div className="h-10 bg-muted rounded animate-pulse"></div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="h-20 bg-muted rounded animate-pulse"></div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="h-64 bg-muted rounded animate-pulse"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {t("instructors.title")}
          </h1>
          <p className="text-muted-foreground">{t("instructors.subtitle")}</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
          <Button
            type="button"
            size="lg"
            variant="outline"
            className="shadow-soft w-full md:w-auto"
            onClick={handleCopyInstructorRegistrationLink}
            disabled={isAnyActionLoading || !effectiveSchoolId}
          >
            <Copy className="mr-2 h-5 w-5" />
            {t("instructors.copySelfRegistrationLink")}
          </Button>
          <Button
            size="lg"
            className="shadow-soft w-full md:w-auto"
            onClick={handleCreate}
            disabled={isAnyActionLoading}
          >
            {isAnyActionLoading ? (
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            ) : (
              <Plus className="mr-2 h-5 w-5" />
            )}
            {t("instructors.addInstructor")}
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder={t("instructors.searchInstructors")}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
              disabled={isAnyActionLoading}
            />
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  {t("instructors.total")}
                </p>
                <p className="text-3xl font-bold">{instructors.length}</p>
              </div>
              <User className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  {t("instructors.available")}
                </p>
                <p className="text-3xl font-bold text-green-600">
                  {activeInstructors.length}
                </p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        {disciplines.map((d) => (
          <Card key={d.id}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    {d.display_name}
                  </p>
                  <p
                    className="text-3xl font-bold"
                    style={{ color: d.color || undefined }}
                  >
                    {
                      activeInstructors.filter((i) =>
                        i.specialties.some((s) => s === d.slug),
                      ).length
                    }
                  </p>
                </div>
                <div
                  className="h-8 w-8 rounded-full flex items-center justify-center text-white font-bold text-sm"
                  style={{ backgroundColor: d.color || "#6b7280" }}
                >
                  {d.display_name?.[0]?.toUpperCase() ||
                    d.slug?.[0]?.toUpperCase()}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredActiveInstructors.length > 0 && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-0">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5 text-green-600" />
              <h2 className="text-lg sm:text-xl font-semibold">
                {t("instructors.activeInstructors")}
              </h2>
              <Badge
                variant="outline"
                className="text-green-600 text-xs sm:text-sm"
              >
                {filteredActiveInstructors.length}
              </Badge>
            </div>
            <Button
              size="sm"
              variant="outline"
              className="shadow-soft w-full sm:w-auto"
              onClick={() => setAggregatedAvailabilityOpen(true)}
              disabled={isAnyActionLoading}
            >
              <Calendar className="mr-2 h-3 w-3 sm:h-4 sm:w-4" />
              <span className="text-xs sm:text-sm">
                Aggregator Availability
              </span>
            </Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {filteredActiveInstructors.map((instructor) => (
              <InstructorCard key={instructor.id} instructor={instructor} />
            ))}
          </div>
        </div>
      )}

      {filteredInactiveInstructors.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <XCircle className="h-5 w-5 text-red-600" />
            <h2 className="text-xl font-semibold text-muted-foreground">
              {t("instructors.inactiveInstructors")}
            </h2>
            <Badge variant="outline" className="text-red-600">
              {filteredInactiveInstructors.length}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            Inactive instructors stay here so they can be reactivated from the
            same page.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 opacity-60">
            {filteredInactiveInstructors.map((instructor) => (
              <InstructorCard key={instructor.id} instructor={instructor} />
            ))}
          </div>
        </div>
      )}

      {selectedInstructorForCompensation && (
        <ManageCompensationDialog
          open={manageCompensationDialogOpen}
          onOpenChange={(open) => {
            setManageCompensationDialogOpen(open);
            if (!open) {
              setSelectedInstructorForCompensation(null);
            }
          }}
          instructorId={selectedInstructorForCompensation.id}
          instructorName={selectedInstructorForCompensation.name}
        />
      )}

      {filteredActiveInstructors.length === 0 &&
        filteredInactiveInstructors.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center">
            <User className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">
              {t("instructors.noInstructorsFound")}
            </h3>
            <p className="text-muted-foreground">
              {searchQuery
                ? t("instructors.noInstructorsFoundDescription")
                : `${t("instructors.noInstructorsFoundCreate")} Deactivated instructors appear in the inactive section.`}
            </p>
          </CardContent>
        </Card>
        )}

      {isFormOpen && (
        <InstructorForm
          instructor={selectedInstructor}
          onSubmit={
            selectedInstructor ? handleUpdateInstructor : handleCreateInstructor
          }
          onClose={() => {
            if (isAnyActionLoading) return;
            setIsFormOpen(false);
            setSelectedInstructor(null);
          }}
          isLoading={isAnyActionLoading}
          schoolId={effectiveSchoolId}
        />
      )}

      {aggregatedAvailabilityOpen && (
        <AggregatedAvailabilityCalendar
          instructors={activeInstructors.map((instructor) => ({
            id: instructor.id,
            first_name: instructor.firstName,
            last_name: instructor.lastName,
            avatar: instructor.avatar,
            isActive: instructor.isActive,
            email: instructor.email,
            whatsapp_number: instructor.whatsappNumber,
          }))}
          open={aggregatedAvailabilityOpen}
          onOpenChange={setAggregatedAvailabilityOpen}
          onSlotClick={(instructorId: string) => {
            const instructor = activeInstructors.find(
              (i) => i.id === instructorId,
            );
            if (instructor) {
              setEditingInstructorAvailability({
                id: instructorId,
                name: `${instructor.firstName} ${instructor.lastName}`,
              });
            }
          }}
        />
      )}

      {editingInstructorAvailability && (
        <NewAvailabilityManager
          isOpen={!!editingInstructorAvailability}
          onOpenChange={(open) => {
            if (!open) {
              setEditingInstructorAvailability(null);
            }
          }}
          instructorId={editingInstructorAvailability.id}
          instructorName={editingInstructorAvailability.name}
          schoolId={effectiveSchoolId ?? undefined}
        />
      )}

      {manageCompensationDialogOpen && selectedInstructorForCompensation && (
        <ManageCompensationDialog
          open={manageCompensationDialogOpen}
          onOpenChange={setManageCompensationDialogOpen}
          instructorId={selectedInstructorForCompensation.id}
          instructorName={selectedInstructorForCompensation.name}
        />
      )}
    </div>
  );
}
