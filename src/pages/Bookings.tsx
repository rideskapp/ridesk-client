import React, { useMemo, useState, useEffect, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuthStore } from "@/store/auth";
import { useSchoolSelectionStore } from "@/store/schoolSelection";
import {
  useBookingsList,
  useCreateBooking,
  useBookingDetail,
  useUpdateBooking,
  useBookingPayments,
  useAddBookingPayment,
  useDeleteBooking,
} from "@/hooks/useBookings";
import { useQuery } from "@tanstack/react-query";
import { roleAwareApi } from "@/services/role-aware-api";
import { studentsApi } from "@/services/students";
import { useProducts } from "@/hooks/useProducts";
import { useStudentLevels } from "@/hooks/useStudentLevels";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Calendar as CalendarIcon,
  Users,
  Package,
  Clock,
  DollarSign,
  ChevronDown,
  CheckCircle,
  User,
  Search,
  X,
  Phone,
  Eye,
  Pencil,
  Trash2,
} from "lucide-react";
import { UserRole } from "@/types";
import { cn, formatCurrency } from "@/lib/utils";
import { toast } from "react-hot-toast";
import { useSchoolSettings } from "@/hooks/useSchoolSettings";

export interface BookingsPageProps {
  /** Student context when embedded from the student profile. */
  embedForStudentId?: string;
  /**
   * `sheet` — create + list inside the parent dialog (nested edit/view use raised z-index).
   * `editOnly` — only the edit booking dialog (no outer shell); closing it ends the flow.
   */
  embedVariant?: "sheet" | "editOnly";
  /** Required when `embedVariant === "editOnly"` — which booking to edit. */
  embedInitialEditBookingId?: string | null;
  /** Called when the user dismisses an `editOnly` embed (close, cancel, or save). */
  onStudentEmbedClose?: () => void;
}

const EMBED_NESTED_DIALOG_OVERLAY_Z = "z-[100]";
const EMBED_NESTED_DIALOG_CONTENT_Z = "z-[101]";

const BookingsPage: React.FC<BookingsPageProps> = ({
  embedForStudentId,
  embedVariant,
  embedInitialEditBookingId,
  onStudentEmbedClose,
}) => {
  const isEmbeddedSheet = embedVariant === "sheet";
  const isEmbeddedEditOnly = embedVariant === "editOnly";
  const isEmbedded = isEmbeddedSheet || isEmbeddedEditOnly;
  const [searchParams] = useSearchParams();
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const { selectedSchoolId } = useSchoolSelectionStore();
  const [search, setSearch] = useState("");
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [productId, setProductId] = useState<string>("");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>(() => {
    const currentYear = new Date().getFullYear();
    return `${currentYear}-12-31`;
  });
  const [notes, setNotes] = useState<string>("");
  const [totalPrice, setTotalPrice] = useState<string>("");
  const [discountAmount, setDiscountAmount] = useState<string>("0");
  const [studentSearchQuery, setStudentSearchQuery] = useState("");
  const [productSearchQuery, setProductSearchQuery] = useState("");
  const [studentSelectorOpen, setStudentSelectorOpen] = useState(false);
  const studentSelectorRef = useRef<HTMLDivElement>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;
  const [viewModalBookingId, setViewModalBookingId] = useState<string | null>(
    null,
  );
  const [editModalBookingId, setEditModalBookingId] = useState<string | null>(
    () =>
      isEmbeddedEditOnly && embedInitialEditBookingId
        ? embedInitialEditBookingId
        : null,
  );
  const [editProductId, setEditProductId] = useState("");
  const [editStudentIds, setEditStudentIds] = useState<string[]>([]);
  const [editStartDate, setEditStartDate] = useState("");
  const [editEndDate, setEditEndDate] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [editTotalPrice, setEditTotalPrice] = useState("");
  const [editDiscountAmount, setEditDiscountAmount] = useState("0");
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentDate, setPaymentDate] = useState(
    () => new Date().toISOString().slice(0, 10),
  );
  const [paymentMethod, setPaymentMethod] = useState("");
  const [paymentNotes, setPaymentNotes] = useState("");
  const [editProductSelectOpen, setEditProductSelectOpen] = useState(false);
  const [editStudentSelectorOpen, setEditStudentSelectorOpen] = useState(false);
  const [editStudentSearchQuery, setEditStudentSearchQuery] = useState("");
  const [editProductSearchQuery, setEditProductSearchQuery] = useState("");
  const [deleteDialogBookingId, setDeleteDialogBookingId] = useState<string | null>(
    null,
  );
  const editProductSelectRef = useRef<HTMLDivElement>(null);
  const editStudentSelectorRef = useRef<HTMLDivElement>(null);

  const effectiveSchoolId =
    user?.role === UserRole.SUPER_ADMIN
      ? (selectedSchoolId ?? undefined)
      : user?.schoolId;

  // Students fetching
  const isSuperAdmin = user?.role === UserRole.SUPER_ADMIN;
  const hasSchoolId = isSuperAdmin ? effectiveSchoolId !== undefined : true;

  const { data: studentsData } = useQuery({
    queryKey: ["booking-students", user?.role, effectiveSchoolId],
    queryFn: async () => {
      if (isSuperAdmin && effectiveSchoolId) {
        return await studentsApi.getStudents(1, 100, "", effectiveSchoolId);
      } else {
        return await roleAwareApi.getStudents(
          user!.role as UserRole,
          1,
          100,
          "",
        );
      }
    },
    enabled:
      !!user?.role &&
      hasSchoolId &&
      (!!productId ||
        studentSelectorOpen ||
        !!editModalBookingId ||
        isEmbedded),
  });
  const students = (studentsData as any)?.students || [];

  const { products } = useProducts({ schoolId: effectiveSchoolId });
  const { studentLevels } = useStudentLevels(effectiveSchoolId);
  const [productSelectOpen, setProductSelectOpen] = useState(false);
  const productSelectRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!embedForStudentId) return;
    setSelectedStudentIds([embedForStudentId]);
  }, [embedForStudentId]);

  useEffect(() => {
    if (isEmbedded) return;
    const studentId = searchParams.get("studentId");
    if (studentId) {
      setSelectedStudentIds([studentId]);
    }
    const editBookingId = searchParams.get("editBookingId");
    if (editBookingId) {
      setEditModalBookingId(editBookingId);
    }
  }, [searchParams, isEmbedded]);

  useEffect(() => {
    if (!isEmbeddedEditOnly) return;
    if (embedInitialEditBookingId) {
      setEditModalBookingId(embedInitialEditBookingId);
    } else {
      setEditModalBookingId(null);
    }
  }, [isEmbeddedEditOnly, embedInitialEditBookingId]);

  const { settings: schoolSettings } = useSchoolSettings(effectiveSchoolId);
  const formatPrice = (amount: number) =>
    formatCurrency(
      amount,
      schoolSettings?.defaultCurrency || "EUR",
      "it-IT",
    );

  // Derived product duration
  const selectedProduct = useMemo(
    () => products.find((p) => p.id === productId),
    [products, productId],
  );
  const productDurationHours = selectedProduct?.duration_hours ?? 0;
  const maxParticipants = selectedProduct?.max_participants ?? 1;

  // Get first selected student's level info for group bookings
  const firstSelectedStudentLevel = useMemo(() => {
    if (!productId || maxParticipants <= 1 || selectedStudentIds.length === 0) {
      return null;
    }
    const firstStudent = students.find(
      (s: any) => s.id === selectedStudentIds[0],
    );
    if (!firstStudent?.skillLevel) {
      return null;
    }
    const level = studentLevels.find((l) => l.slug === firstStudent.skillLevel);
    return level
      ? { name: level.name, color: level.color, slug: level.slug }
      : null;
  }, [students, selectedStudentIds, productId, maxParticipants, studentLevels]);

  const filteredStudents = useMemo(() => {
    // const activeStudents = students.filter((s: any) => s.isActive !== false);

    // const activeStudents = students.filter((s: any) => s.isActive !== false);
    const activeStudents = students;
    let levelFilteredStudents = activeStudents;
    if (productId && maxParticipants > 1 && selectedStudentIds.length > 0) {
      const firstSelectedStudent = activeStudents.find(
        (s: any) => s.id === selectedStudentIds[0],
      );
      if (firstSelectedStudent?.skillLevel) {
        levelFilteredStudents = activeStudents.filter(
          (s: any) => s.skillLevel === firstSelectedStudent.skillLevel,
        );
      }
    }

    if (!studentSearchQuery.trim()) return levelFilteredStudents;
    const query = studentSearchQuery.toLowerCase();
    return levelFilteredStudents.filter(
      (s: any) =>
        s.firstName?.toLowerCase().includes(query) ||
        s.lastName?.toLowerCase().includes(query) ||
        s.email?.toLowerCase().includes(query) ||
        s.whatsappNumber?.toLowerCase().includes(query),
    );
  }, [
    students,
    studentSearchQuery,
    productId,
    maxParticipants,
    selectedStudentIds,
  ]);

  const activeProducts = useMemo(() => {
    return products.filter((p) => p.active !== false && p.is_active !== false);
  }, [products]);

  const filteredProducts = useMemo(() => {
    if (!productSearchQuery.trim()) return activeProducts;
    const query = productSearchQuery.toLowerCase();
    return activeProducts.filter((p) =>
      p.title?.toLowerCase().includes(query),
    );
  }, [activeProducts, productSearchQuery]);

  const editFilteredProducts = useMemo(() => {
    if (!editProductSearchQuery.trim()) return activeProducts;
    const query = editProductSearchQuery.toLowerCase();
    return activeProducts.filter((p) =>
      p.title?.toLowerCase().includes(query),
    );
  }, [activeProducts, editProductSearchQuery]);

  const editSelectedProduct = useMemo(
    () => products.find((p) => p.id === editProductId),
    [products, editProductId],
  );
  const editMaxParticipants = editSelectedProduct?.max_participants ?? 1;
  const editParticipantsExceeded = editStudentIds.length > editMaxParticipants;
  const editFirstSelectedStudentLevel = useMemo(() => {
    if (
      !editProductId ||
      editMaxParticipants <= 1 ||
      editStudentIds.length === 0
    ) {
      return null;
    }
    const first = students.find((s: any) => s.id === editStudentIds[0]);
    if (!first?.skillLevel) return null;
    const level = studentLevels.find((l) => l.slug === first.skillLevel);
    return level
      ? { name: level.name, color: level.color, slug: level.slug }
      : null;
  }, [
    students,
    editStudentIds,
    editProductId,
    editMaxParticipants,
    studentLevels,
  ]);
  const editFilteredStudents = useMemo(() => {
    let levelFiltered = students;
    if (
      editProductId &&
      editMaxParticipants > 1 &&
      editStudentIds.length > 0 &&
      editFirstSelectedStudentLevel
    ) {
      const strictLevelFiltered = students.filter(
        (s: any) => s.skillLevel === editFirstSelectedStudentLevel.slug,
      );
      // In edit mode, if strict level filtering would effectively block adding
      // more participants (e.g. only current student matches), fall back to all.
      levelFiltered =
        strictLevelFiltered.length > editStudentIds.length
          ? strictLevelFiltered
          : students;
    }
    if (!editStudentSearchQuery.trim()) return levelFiltered;
    const q = editStudentSearchQuery.toLowerCase();
    return levelFiltered.filter(
      (s: any) =>
        s.firstName?.toLowerCase().includes(q) ||
        s.lastName?.toLowerCase().includes(q) ||
        s.email?.toLowerCase().includes(q) ||
        s.whatsappNumber?.toLowerCase().includes(q),
    );
  }, [
    students,
    editStudentSearchQuery,
    editProductId,
    editMaxParticipants,
    editStudentIds,
    editFirstSelectedStudentLevel,
  ]);

  const handleEditStudentToggle = (studentId: string) => {
    let next: string[];
    if (editStudentIds.includes(studentId)) {
      next = editStudentIds.filter((id) => id !== studentId);
    } else {
      next = [...editStudentIds, studentId];
    }
    if (next.length > editMaxParticipants) {
      toast.error(
        t("bookings.maxParticipantsExceeded", {
          max: editMaxParticipants,
          defaultValue: `You can select a maximum of ${editMaxParticipants} students for this product.`,
        }),
      );
      return;
    }
    setEditStudentIds(next);
  };

  const handleEditStudentRemove = (id: string) => {
    setEditStudentIds(editStudentIds.filter((x) => x !== id));
  };

  // Validate and handle student selection changes
  const handleStudentToggle = (studentId: string) => {
    if (!selectedProduct) {
      if (selectedStudentIds.includes(studentId)) {
        setSelectedStudentIds(
          selectedStudentIds.filter((id) => id !== studentId),
        );
      } else {
        setSelectedStudentIds([...selectedStudentIds, studentId]);
      }
      return;
    }

    let newSelectedIds: string[];
    if (selectedStudentIds.includes(studentId)) {
      newSelectedIds = selectedStudentIds.filter((id) => id !== studentId);
    } else {
      newSelectedIds = [...selectedStudentIds, studentId];
    }

    // Check if the new selection exceeds max participants
    if (newSelectedIds.length > maxParticipants) {
      const message =
        maxParticipants === 1
          ? t("bookings.maxParticipantsExceededSingle", {
              defaultValue: `You can select a maximum of 1 student for this product.`,
            })
          : t("bookings.maxParticipantsExceeded", {
              max: maxParticipants,
              defaultValue: `You can select a maximum of ${maxParticipants} students for this product.`,
            });
      toast.error(message);
      return;
    }

    setSelectedStudentIds(newSelectedIds);
  };

  const handleStudentRemove = (studentId: string) => {
    setSelectedStudentIds(selectedStudentIds.filter((id) => id !== studentId));
  };

  const prevProductIdRef = useRef<string>("");

  useEffect(() => {
    if (productId && productId !== prevProductIdRef.current) {
      prevProductIdRef.current = productId;

      if (selectedProduct && selectedStudentIds.length > maxParticipants) {
        const trimmedSelection = selectedStudentIds.slice(0, maxParticipants);
        setSelectedStudentIds(trimmedSelection);
        const message =
          maxParticipants === 1
            ? t("bookings.selectionTrimmedSingle", {
                defaultValue: `Only 1 student allowed for this product. Selection has been adjusted.`,
              })
            : t("bookings.selectionTrimmed", {
                max: maxParticipants,
                defaultValue: `Only ${maxParticipants} students allowed for this product. Selection has been adjusted.`,
              });
        toast.error(message);
      }
    } else if (!productId) {
      prevProductIdRef.current = "";
    }
  }, [productId]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        productSelectRef.current &&
        !productSelectRef.current.contains(event.target as Node)
      ) {
        setProductSelectOpen(false);
      }
      if (
        studentSelectorRef.current &&
        !studentSelectorRef.current.contains(event.target as Node)
      ) {
        setStudentSelectorOpen(false);
      }
      if (
        editProductSelectRef.current &&
        !editProductSelectRef.current.contains(event.target as Node)
      ) {
        setEditProductSelectOpen(false);
      }
      if (
        editStudentSelectorRef.current &&
        !editStudentSelectorRef.current.contains(event.target as Node)
      ) {
        setEditStudentSelectorOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setProductSelectOpen(false);
        setStudentSelectorOpen(false);
        setEditProductSelectOpen(false);
        setEditStudentSelectorOpen(false);
      }
    };

    if (
      productSelectOpen ||
      studentSelectorOpen ||
      editProductSelectOpen ||
      editStudentSelectorOpen
    ) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleEscape);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [
    productSelectOpen,
    studentSelectorOpen,
    editProductSelectOpen,
    editStudentSelectorOpen,
  ]);

  // Bookings list
  const { data: bookingsData, isLoading } = useBookingsList(
    {
      search,
      schoolId: effectiveSchoolId,
      page: currentPage,
      limit: pageSize,
      ...(isEmbedded && embedForStudentId
        ? {
            studentId: embedForStudentId,
            // Match student profile Packages tab and /bookings without studentId: include completed / zero remaining
            activeOnly: false,
          }
        : {}),
    },
    { enabled: !isEmbeddedEditOnly },
  );
  const bookings = bookingsData?.bookings || [];
  const createBooking = useCreateBooking();
  const { data: viewBooking } = useBookingDetail(
    viewModalBookingId,
    effectiveSchoolId,
  );
  const { data: editBooking } = useBookingDetail(
    editModalBookingId,
    effectiveSchoolId,
  );
  const viewBookingHasLessonAssociation = useMemo(() => {
    if (!viewBooking) return false;
    const productSupportsLessons = Boolean(
      (viewBooking.products as any)?.disciplines?.id ||
        (viewBooking.products as any)?.disciplines?.slug,
    );
    return productSupportsLessons || (viewBooking.lessons_count ?? 0) > 0;
  }, [viewBooking]);
  const updateBooking = useUpdateBooking();
  const deleteBooking = useDeleteBooking();
  const paymentsBookingId = viewModalBookingId || editModalBookingId;
  const { data: bookingPayments } = useBookingPayments(
    paymentsBookingId,
    effectiveSchoolId,
  );
  const addBookingPayment = useAddBookingPayment();

  // Populate edit form when edit modal opens and booking is loaded
  useEffect(() => {
    if (editModalBookingId && editBooking) {
      setEditProductId(editBooking.product_id);
      setEditStudentIds(
        (editBooking.participants || []).map((p) => p.student_id),
      );
      setEditStudentSearchQuery("");
      setEditProductSearchQuery("");
      setEditStartDate(editBooking.start_date || "");
      setEditEndDate(
        editBooking.end_date || `${new Date().getFullYear()}-12-31`,
      );
      setEditNotes(editBooking.notes || "");
      setEditTotalPrice(String(editBooking.total_price ?? ""));
      setEditDiscountAmount(String(editBooking.discount_amount ?? 0));
    }
  }, [editModalBookingId, editBooking]);

  useEffect(() => {
    // Reset student search after changing product so selector doesn't appear empty
    // due to stale search text from previous product/modal interactions.
    setEditStudentSearchQuery("");
  }, [editProductId]);

  // Reset to page 1 when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [search]);

  const handlePageChange = (page: number) => setCurrentPage(page);

  const submitDisabled =
    createBooking.isPending ||
    !productId ||
    selectedStudentIds.length === 0 ||
    !startDate;

  const handleCreate = async () => {
    if (submitDisabled) return;

    // Check if all selected students have skill levels
    const studentsWithoutLevel = students.filter(
      (s: any) =>
        selectedStudentIds.includes(s.id) &&
        (!s.skillLevel || s.skillLevel.trim() === ""),
    );

    if (studentsWithoutLevel.length > 0) {
      const studentNames = studentsWithoutLevel
        .map(
          (s: any) =>
            `${s.firstName || ""} ${s.lastName || ""}`.trim() ||
            s.email ||
            t("common.unknown", { defaultValue: "Unknown" }),
        )
        .join(", ");
      toast.error(
        t("bookings.studentsSkillLevelRequired", {
          studentNames,
          defaultValue: `Cannot create booking: The following student(s) must have a skill level set: ${studentNames}. Please update their profile first.`,
        }),
      );
      return;
    }

    await createBooking.mutateAsync({
      product_id: productId,
      student_ids: selectedStudentIds,
      start_date: startDate,
      end_date: endDate || undefined,
      notes: notes?.trim() || undefined,
      total_price: totalPrice ? Number(totalPrice) : undefined,
      discount_amount: discountAmount ? Number(discountAmount) : 0,
      ...(isSuperAdmin && effectiveSchoolId && { schoolId: effectiveSchoolId }),
    });
    if (isEmbedded && embedForStudentId) {
      setSelectedStudentIds([embedForStudentId]);
    } else {
      setSelectedStudentIds([]);
    }
    setProductId("");
    setStartDate("");
    setEndDate(() => {
      const currentYear = new Date().getFullYear();
      return `${currentYear}-12-31`;
    });
    setNotes("");
    setTotalPrice("");
    setDiscountAmount("0");
  };

  const hideSheetBodyForSubmodal = Boolean(
    isEmbeddedSheet && !!(editModalBookingId || viewModalBookingId),
  );
  const showEmbeddedHint = isEmbeddedSheet && !hideSheetBodyForSubmodal;
  const showCreateAndList = !isEmbeddedEditOnly && !hideSheetBodyForSubmodal;
  const useNestedDialogElevation = isEmbeddedSheet;

  const closeEditBookingModal = () => {
    setEditModalBookingId(null);
    if (isEmbeddedEditOnly) onStudentEmbedClose?.();
  };

  const openDeleteDialog = (bookingId: string) => {
    setDeleteDialogBookingId(bookingId);
  };

  const closeDeleteDialog = () => {
    if (deleteBooking.isPending) return;
    setDeleteDialogBookingId(null);
  };

  const confirmDeleteBooking = async () => {
    if (!deleteDialogBookingId) return;
    await deleteBooking.mutateAsync({
      id: deleteDialogBookingId,
      schoolId: effectiveSchoolId,
    });
    if (editModalBookingId === deleteDialogBookingId) {
      closeEditBookingModal();
    }
    setDeleteDialogBookingId(null);
  };

  // "select school" message if no school is selected
  if (user?.role === UserRole.SUPER_ADMIN && !selectedSchoolId) {
    return (
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">
            {t("bookings.title", { defaultValue: "Bookings" })}
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

  const pageBody = (
    <>
      {!isEmbedded ? (
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">
            {t("bookings.title", { defaultValue: "Bookings" })}
          </h1>
        </div>
      ) : (
        showEmbeddedHint && (
          <p className="text-sm text-muted-foreground">
            {t("bookings.embeddedHint", {
              defaultValue:
                "Create bookings, record payments, and edit packages without leaving this profile.",
            })}
          </p>
        )
      )}

      {/* Create Booking */}
      {showCreateAndList && (
      <Card>
        <CardContent className="pt-6 space-y-6">
          <h2 className="text-lg font-medium">
            {t("bookings.create", { defaultValue: "Create Booking" })}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Product select */}
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2">
                <Package className="h-4 w-4" />
                {t("bookings.product", { defaultValue: "Product" })}
              </label>
              <div ref={productSelectRef} className="relative w-full">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setProductSelectOpen(!productSelectOpen)}
                  className={cn(
                    "w-full justify-between h-auto min-h-10 px-3 py-2 text-left font-normal",
                    !productId && "text-muted-foreground",
                  )}
                >
                  <div className="flex-1 text-left">
                    {selectedProduct ? (
                      <div className="flex items-center gap-2">
                        <span className="font-medium">
                          {selectedProduct.title}
                        </span>
                        {selectedProduct.disciplines && (
                          <Badge
                            style={{
                              backgroundColor:
                                selectedProduct.disciplines.color || "#gray",
                              color: "white",
                            }}
                            className="text-xs"
                          >
                            {selectedProduct.disciplines.display_name}
                          </Badge>
                        )}
                      </div>
                    ) : (
                      <span className="text-muted-foreground">
                        {t("bookings.selectProduct", {
                          defaultValue: "Select product",
                        })}
                      </span>
                    )}
                  </div>
                  <ChevronDown
                    className={cn(
                      "h-4 w-4 opacity-50 shrink-0 transition-transform",
                      productSelectOpen && "rotate-180",
                    )}
                  />
                </Button>

                {productSelectOpen && (
                  <div
                    className={cn(
                      "absolute z-50 w-full mt-1 rounded-md border border-gray-200 bg-white shadow-lg",
                      "animate-in fade-in-0 zoom-in-95",
                    )}
                    style={{
                      maxHeight: "240px",
                      display: "flex",
                      flexDirection: "column",
                    }}
                  >
                    {/* Search bar */}
                    <div className="p-2 border-b border-gray-200 flex-shrink-0">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <Input
                          type="text"
                          placeholder={t("bookings.searchProducts", {
                            defaultValue: "Search products",
                          })}
                          value={productSearchQuery}
                          onChange={(e) =>
                            setProductSearchQuery(e.target.value)
                          }
                          className="pl-10"
                        />
                      </div>
                    </div>

                    {/* Product list */}
                    <div
                      className="overflow-y-auto overflow-x-hidden flex-1"
                      style={{
                        scrollbarWidth: "thin",
                        scrollbarColor: "#cbd5e0 #f7fafc",
                      }}
                    >
                      <div className="p-2">
                        {filteredProducts.length === 0 ? (
                          <div className="px-2 py-1.5 text-sm text-muted-foreground">
                            {productSearchQuery
                              ? t("bookings.noProductsFound", {
                                  defaultValue: "No products found",
                                })
                              : t("bookings.noProductsAvailable", {
                                  defaultValue: "No products available",
                                })}
                          </div>
                        ) : (
                          <div className="space-y-2">
                            {filteredProducts.map((product) => {
                              const productName = product.title;
                              const disciplineName =
                                product.disciplines?.display_name || "Unknown";
                              const disciplineColor =
                                product.disciplines?.color || "#gray";
                              const maxParticipants =
                                product.max_participants || 1;
                              const durationHours = product.duration_hours || 1;
                              const isSelected = productId === product.id;

                              return (
                                <div
                                  key={product.id}
                                  onClick={() => {
                                    setProductId(product.id);
                                    setTotalPrice(String(product.price));
                                    setProductSelectOpen(false);
                                  }}
                                  className={cn(
                                    "relative cursor-pointer rounded-md border p-3 transition-all",
                                    isSelected
                                      ? "border-pink-500 border-2 bg-pink-50"
                                      : "border-gray-200 hover:border-pink-300 hover:bg-gray-50",
                                  )}
                                >
                                  <div className="flex items-start justify-between">
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                                        <h4 className="font-medium text-sm truncate">
                                          {productName}
                                        </h4>
                                        <Badge
                                          style={{
                                            backgroundColor: disciplineColor,
                                            color: "white",
                                          }}
                                          className="text-xs truncate max-w-full"
                                        >
                                          {disciplineName}
                                        </Badge>
                                      </div>
                                      <div className="flex items-center gap-3 text-xs text-gray-600 flex-wrap">
                                        <div className="flex items-center gap-1">
                                          <Users className="h-3 w-3 flex-shrink-0" />
                                          <span className="truncate">
                                            {maxParticipants === 1
                                              ? t("lessonWizard.individual", {
                                                  defaultValue: "Individual",
                                                })
                                              : t("lessonWizard.group", {
                                                  maxParticipants,
                                                  defaultValue: `Group (max ${maxParticipants})`,
                                                })}
                                          </span>
                                        </div>
                                        <div className="flex items-center gap-1">
                                          <Clock className="h-3 w-3 flex-shrink-0" />
                                          <span>{durationHours}h</span>
                                        </div>
                                        <div className="flex items-center gap-1">
                                          <DollarSign className="h-3 w-3 flex-shrink-0" />
                                          <span>{formatPrice(product.price)}</span>
                                        </div>
                                      </div>
                                      {product.description_short && (
                                        <p className="text-xs text-gray-500 mt-2 line-clamp-2">
                                          {product.description_short}
                                        </p>
                                      )}
                                      {maxParticipants > 1 && (
                                        <p className="text-xs text-gray-500 mt-1 truncate">
                                          {t("lessonWizard.maxParticipants", {
                                            maxParticipants,
                                            defaultValue: `max ${maxParticipants} participants`,
                                          })}
                                        </p>
                                      )}
                                    </div>
                                    {isSelected && (
                                      <CheckCircle className="h-5 w-5 text-pink-600 flex-shrink-0 ml-2" />
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
              {productId && selectedProduct && (
                <div className="text-xs text-gray-600 space-y-1">
                  <div>
                    {t("bookings.totalHours", { defaultValue: "Total hours" })}:{" "}
                    {productDurationHours}
                  </div>
                </div>
              )}
            </div>

            {/* Students multiselect  */}
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2">
                <Users className="h-4 w-4" />
                {t("bookings.students", { defaultValue: "Students" })}
              </label>

              {/* Selected students display */}
              {selectedStudentIds.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-2">
                  {selectedStudentIds.map((studentId) => {
                    const student = students.find(
                      (s: any) => s.id === studentId,
                    );
                    if (!student) return null;
                    return (
                      <div
                        key={studentId}
                        className="inline-flex items-center gap-2 px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-sm"
                      >
                        <User className="h-4 w-4 text-gray-600" />
                        <span className="font-medium text-gray-900">
                          {student.firstName} {student.lastName}
                        </span>
                        <button
                          onClick={() => handleStudentRemove(studentId)}
                          className="text-gray-600 hover:text-gray-800 transition-colors"
                          type="button"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Required level message for group bookings */}
              {firstSelectedStudentLevel && (
                <div className="flex items-center gap-2 mb-2 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm">
                  <span className="text-gray-700">
                    {t("bookings.requiredLevel", {
                      defaultValue: "Required level",
                    })}
                    :
                  </span>
                  <Badge
                    style={{
                      backgroundColor: firstSelectedStudentLevel.color,
                      color: "white",
                    }}
                    className="text-xs"
                  >
                    {firstSelectedStudentLevel.name}
                  </Badge>
                  <span className="text-gray-600 text-xs">
                    {t("bookings.allParticipantsSameLevel", {
                      defaultValue: "All participants must have the same level",
                    })}
                  </span>
                </div>
              )}

              {/* Student selector button */}
              <div ref={studentSelectorRef} className="relative w-full">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() =>
                    !(!productId && students.length > 0) &&
                    setStudentSelectorOpen(!studentSelectorOpen)
                  }
                  disabled={students.length === 0 || !productId}
                  className={cn(
                    "w-full justify-between h-auto min-h-10 px-3 py-2 text-left font-normal",
                    selectedStudentIds.length === 0 && "text-muted-foreground",
                  )}
                >
                  <div className="flex-1 text-left">
                    {selectedStudentIds.length === 0 ? (
                      <span className="text-muted-foreground">
                        {t("bookings.selectStudents", {
                          defaultValue: "Select students",
                        })}
                      </span>
                    ) : selectedStudentIds.length === 1 ? (
                      <span>
                        {(() => {
                          const student = students.find(
                            (s: any) => s.id === selectedStudentIds[0],
                          );
                          return student
                            ? `${student.firstName} ${student.lastName}`
                            : "";
                        })()}
                      </span>
                    ) : (
                      <span>
                        {t("bookings.studentsSelected", {
                          selected: selectedStudentIds.length,
                          max: maxParticipants,
                          defaultValue: `${selectedStudentIds.length} students selected`,
                        })}
                      </span>
                    )}
                  </div>
                  <ChevronDown
                    className={cn(
                      "h-4 w-4 opacity-50 shrink-0 transition-transform",
                      studentSelectorOpen && "rotate-180",
                    )}
                  />
                </Button>

                {/* Student selector dropdown */}
                {studentSelectorOpen && (
                  <div
                    className={cn(
                      "absolute z-50 w-full mt-1 rounded-md border border-gray-200 bg-white shadow-lg",
                      "animate-in fade-in-0 zoom-in-95",
                    )}
                    style={{
                      maxHeight: "240px",
                      display: "flex",
                      flexDirection: "column",
                    }}
                  >
                    {/* Search bar */}
                    <div className="p-2 border-b border-gray-200 flex-shrink-0">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <Input
                          type="text"
                          placeholder={t("bookings.searchStudents", {
                            defaultValue: "Search students",
                          })}
                          value={studentSearchQuery}
                          onChange={(e) =>
                            setStudentSearchQuery(e.target.value)
                          }
                          className="pl-10"
                        />
                      </div>
                    </div>

                    {/* Student list */}
                    <div
                      className="overflow-y-auto overflow-x-hidden flex-1"
                      style={{
                        scrollbarWidth: "thin",
                        scrollbarColor: "#cbd5e0 #f7fafc",
                      }}
                    >
                      {filteredStudents.length === 0 ? (
                        <div className="px-4 py-4 text-center text-sm text-gray-500">
                          {studentSearchQuery
                            ? t("bookings.noStudentsFound", {
                                defaultValue: "No students found",
                              })
                            : t("bookings.noStudents", {
                                defaultValue: "No students available",
                              })}
                        </div>
                      ) : (
                        <div className="divide-y">
                          {filteredStudents.map((student: any) => {
                            const isSelected = selectedStudentIds.includes(
                              student.id,
                            );
                            const isDisabled =
                              !isSelected &&
                              selectedStudentIds.length >= maxParticipants &&
                              productId;

                            return (
                              <div
                                key={student.id}
                                onClick={() =>
                                  !isDisabled && handleStudentToggle(student.id)
                                }
                                className={cn(
                                  "p-3 cursor-pointer transition-colors",
                                  isSelected
                                    ? "bg-pink-50"
                                    : isDisabled
                                      ? "bg-gray-50 opacity-50 cursor-not-allowed"
                                      : "hover:bg-gray-50",
                                )}
                              >
                                <div className="flex items-center gap-3">
                                  <div
                                    className={cn(
                                      "w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0",
                                      isSelected
                                        ? "bg-pink-600 border-pink-600"
                                        : "border-gray-300",
                                    )}
                                  >
                                    {isSelected && (
                                      <CheckCircle className="h-4 w-4 text-white" />
                                    )}
                                  </div>
                                  <User className="h-5 w-5 text-gray-400 flex-shrink-0" />
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <span className="font-medium">
                                        {student.firstName} {student.lastName}
                                      </span>
                                      {student.skillLevel &&
                                        (() => {
                                          const level = studentLevels.find(
                                            (l) =>
                                              l.slug === student.skillLevel,
                                          );
                                          return level ? (
                                            <Badge
                                              style={{
                                                backgroundColor: level.color,
                                                color: "white",
                                              }}
                                              className="text-xs"
                                            >
                                              {level.name}
                                            </Badge>
                                          ) : (
                                            <Badge
                                              variant="outline"
                                              className="text-xs"
                                            >
                                              {student.skillLevel}
                                            </Badge>
                                          );
                                        })()}
                                    </div>
                                    <div className="text-sm text-gray-500 space-y-0.5">
                                      <div className="flex items-center gap-2 flex-wrap">
                                        <span className="truncate">
                                          {student.email}
                                        </span>
                                        {student.whatsappNumber && (
                                          <>
                                            <span className="text-gray-300">
                                              •
                                            </span>
                                            <span className="flex items-center gap-1 text-xs">
                                              <Phone className="h-3 w-3" />
                                              <span>
                                                {student.whatsappNumber}
                                              </span>
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
                  </div>
                )}
              </div>

              {students.length === 0 && (
                <div className="text-sm text-gray-500">
                  {t("bookings.noStudents", {
                    defaultValue: "No students found",
                  })}
                </div>
              )}
              {productId && selectedProduct && (
                <div className="text-xs text-gray-600">
                  {maxParticipants === 1
                    ? t("bookings.studentsSelectedSingle", {
                        selected: selectedStudentIds.length,
                        defaultValue: `${selectedStudentIds.length} of 1 student selected`,
                      })
                    : t("bookings.studentsSelected", {
                        selected: selectedStudentIds.length,
                        max: maxParticipants,
                        defaultValue: `${selectedStudentIds.length} of ${maxParticipants} students selected`,
                      })}
                </div>
              )}
              {!productId && (
                <div className="text-xs text-gray-500">
                  {t("bookings.selectProductFirst", {
                    defaultValue: "Please select a product first",
                  })}
                </div>
              )}
            </div>

            {/* Date range */}
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2">
                <CalendarIcon className="h-4 w-4" />
                {t("bookings.startDate", { defaultValue: "Start date" })}
                <span className="text-red-500">*</span>
              </label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>

            {/* End date */}
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2">
                <CalendarIcon className="h-4 w-4" />
                {t("bookings.endDate", { defaultValue: "End date" })}
              </label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>

            {/* Notes */}
            <div className="md:col-span-2 space-y-2">
              <label className="text-sm font-medium">
                {t("bookings.notes", { defaultValue: "Notes" })}
              </label>
              <Input
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={
                  t("bookings.notesPlaceholder", {
                    defaultValue: "Optional notes",
                  }) as string
                }
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">
                {t("bookings.totalPrice", { defaultValue: "Total price" })}
              </label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={totalPrice}
                onChange={(e) => setTotalPrice(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">
                {t("bookings.discount", { defaultValue: "Discount" })}
              </label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={discountAmount}
                onChange={(e) => setDiscountAmount(e.target.value)}
              />
            </div>
          </div>
          <div className="flex justify-end">
            <Button onClick={handleCreate} disabled={submitDisabled}>
              {t("bookings.createCta", { defaultValue: "Create Booking" })}
            </Button>
          </div>
        </CardContent>
      </Card>
      )}

      {/* Bookings list */}
      {showCreateAndList && (
      <Card>
        <CardContent className="pt-6 space-y-4">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-lg font-medium">
              {isEmbedded
                ? t("bookings.listForStudent", {
                    defaultValue: "Bookings for this student",
                  })
                : t("bookings.list", { defaultValue: "Bookings" })}
            </h2>
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={
                t("bookings.searchPlaceholder", {
                  defaultValue: "Search by student or product",
                }) as string
              }
              className="max-w-sm"
            />
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t("bookings.students", { defaultValue: "Students" })}
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t("bookings.product", { defaultValue: "Product" })}
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t("bookings.totalHours", { defaultValue: "Total hours" })}
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t("bookings.remainingHours", {
                      defaultValue: "Remaining hours",
                    })}
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t("bookings.dateRange", { defaultValue: "Date range" })}
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t("bookings.status", { defaultValue: "Status" })}
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t("bookings.finalPrice", { defaultValue: "Final price" })}
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t("bookings.outstanding", { defaultValue: "Outstanding" })}
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t("common.actions", { defaultValue: "Actions" })}
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {isLoading ? (
                  <tr>
                    <td
                      colSpan={9}
                      className="px-4 py-8 text-center text-sm text-gray-500"
                    >
                      {t("common.loading", { defaultValue: "Loading..." })}
                    </td>
                  </tr>
                ) : bookings.length === 0 ? (
                  <tr>
                    <td
                      colSpan={9}
                      className="px-4 py-8 text-center text-sm text-gray-500"
                    >
                      {t("bookings.noData", {
                        defaultValue: "No bookings yet",
                      })}
                    </td>
                  </tr>
                ) : (
                  bookings.map((b: any) => {
                    const names =
                      b.participants
                        ?.map((p: any) =>
                          `${p.users?.first_name || ""} ${p.users?.last_name || ""}`.trim(),
                        )
                        .filter(Boolean)
                        .join(", ") || "-";
                    const title = b.products?.title || b.products?.name || "-";
                    const totalH = (b.total_minutes || 0) / 60;
                    const remainingH = (b.remaining_minutes || 0) / 60;
                    return (
                      <tr key={b.id}>
                        <td className="px-4 py-2 text-sm text-gray-700">
                          {names}
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-700">
                          {title}
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-700">
                          {totalH}
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-700">
                          {remainingH}
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-700">
                          {b.start_date}
                          {b.end_date ? ` to ${b.end_date}` : ""}
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-700 capitalize">
                          {b.payment_status || b.status}
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-700">
                          {formatPrice(Number(b.final_price || 0))}
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-700">
                          {formatPrice(Number(b.outstanding_amount || 0))}
                        </td>
                        <td className="px-4 py-2 text-sm">
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => setViewModalBookingId(b.id)}
                              className="text-gray-600 hover:text-gray-900 p-1 rounded"
                              title={t("bookings.viewDetails", {
                                defaultValue: "View details",
                              })}
                            >
                              <Eye className="h-4 w-4" />
                            </button>
                            <TooltipProvider delayDuration={300}>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <span className="inline-flex">
                                    <button
                                      type="button"
                                      onClick={() => setEditModalBookingId(b.id)}
                                      className={cn(
                                        "p-1 rounded",
                                        "text-gray-600 hover:text-gray-900",
                                      )}
                                    >
                                      <Pencil className="h-4 w-4" />
                                    </button>
                                  </span>
                                </TooltipTrigger>
                                <TooltipContent
                                  side="top"
                                  className="max-w-sm text-center"
                                >
                                  {t("bookings.edit", {
                                    defaultValue: "Edit",
                                  })}
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                            <TooltipProvider delayDuration={300}>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <span className="inline-flex">
                                    <button
                                      type="button"
                                      onClick={() => openDeleteDialog(b.id)}
                                      className={cn(
                                        "p-1 rounded",
                                        "text-red-600 hover:text-red-700",
                                      )}
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </button>
                                  </span>
                                </TooltipTrigger>
                                <TooltipContent
                                  side="top"
                                  className="max-w-sm text-center"
                                >
                                  {t("bookings.delete", {
                                    defaultValue: "Delete",
                                  })}
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
          {/* Pagination */}
          {bookingsData?.pagination && bookingsData.pagination.total > 0 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-0 mt-4 border-t border-gray-200 pt-4">
              <div className="w-full sm:w-auto">
                <p className="text-sm text-gray-700">
                  {t("common.showing")}{" "}
                  <span className="font-medium">
                    {(currentPage - 1) * pageSize + 1}
                  </span>{" "}
                  {t("common.to")}{" "}
                  <span className="font-medium">
                    {Math.min(
                      currentPage * pageSize,
                      bookingsData.pagination.total,
                    )}
                  </span>{" "}
                  {t("common.of")}{" "}
                  <span className="font-medium">
                    {bookingsData.pagination.total}
                  </span>{" "}
                  {t("bookings.paginationCountLabel", {
                    defaultValue: "bookings",
                  })}
                </p>
              </div>
              {bookingsData.pagination.totalPages > 1 && (
                <nav
                  className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px"
                  aria-label="Pagination"
                >
                  <button
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {t("common.previous")}
                  </button>
                  {Array.from(
                    { length: bookingsData.pagination.totalPages },
                    (_, i) => i + 1,
                  ).map((page) => (
                    <button
                      key={page}
                      onClick={() => handlePageChange(page)}
                      className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                        page === currentPage
                          ? "z-10 bg-pink-50 border-pink-500 text-pink-600"
                          : "bg-white border-gray-300 text-gray-500 hover:bg-gray-50"
                      }`}
                    >
                      {page}
                    </button>
                  ))}
                  <button
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={
                      currentPage === bookingsData.pagination.totalPages
                    }
                    className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {t("common.next")}
                  </button>
                </nav>
              )}
            </div>
          )}
        </CardContent>
      </Card>
      )}

      {/* View Booking Modal */}
      <Dialog
        open={!!viewModalBookingId}
        onOpenChange={(open) => {
          if (!open) {
            setViewModalBookingId(null);
          }
        }}
      >
        <DialogContent
          overlayClassName={
            useNestedDialogElevation
              ? EMBED_NESTED_DIALOG_OVERLAY_Z
              : undefined
          }
          className={cn(
            "max-w-5xl max-h-[90vh] overflow-y-auto",
            useNestedDialogElevation && EMBED_NESTED_DIALOG_CONTENT_Z,
          )}
        >
          <DialogHeader>
            <DialogTitle>
              {t("bookings.viewDetails", { defaultValue: "View details" })}
            </DialogTitle>
          </DialogHeader>
          {viewBooking ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="space-y-4">
              <div>
                <span className="text-sm font-medium text-gray-500">
                  {t("bookings.students", { defaultValue: "Students" })}
                </span>
                <p className="text-sm text-gray-900">
                  {(viewBooking.participants || [])
                    .map((p: any) =>
                      `${p.users?.first_name || ""} ${p.users?.last_name || ""}`.trim(),
                    )
                    .filter(Boolean)
                    .join(", ") || "-"}
                </p>
              </div>
              <div>
                <span className="text-sm font-medium text-gray-500">
                  {t("bookings.product", { defaultValue: "Product" })}
                </span>
                <p className="text-sm text-gray-900">
                  {viewBooking.products?.title ||
                    viewBooking.products?.name ||
                    "-"}
                </p>
              </div>
              {viewBookingHasLessonAssociation ? (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-sm font-medium text-gray-500">
                      {t("bookings.totalHours", { defaultValue: "Total hours" })}
                    </span>
                    <p className="text-sm text-gray-900">
                      {(viewBooking.total_minutes || 0) / 60}
                    </p>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-gray-500">
                      {t("bookings.remainingHours", {
                        defaultValue: "Remaining hours",
                      })}
                    </span>
                    <p className="text-sm text-gray-900">
                      {(viewBooking.remaining_minutes || 0) / 60}
                    </p>
                  </div>
                </div>
              ) : null}
              <div>
                <span className="text-sm font-medium text-gray-500">
                  {t("bookings.dateRange", { defaultValue: "Date range" })}
                </span>
                <p className="text-sm text-gray-900">
                  {viewBooking.start_date}
                  {viewBooking.end_date ? ` to ${viewBooking.end_date}` : ""}
                </p>
              </div>
              <div>
                <span className="text-sm font-medium text-gray-500">
                  {t("bookings.status", { defaultValue: "Status" })}
                </span>
                <p className="text-sm text-gray-900 capitalize">
                  {viewBooking.payment_status || viewBooking.status}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-sm font-medium text-gray-500">
                    {t("bookings.finalPrice", { defaultValue: "Final price" })}
                  </span>
                  <p className="text-sm text-gray-900">
                    {formatPrice(Number(viewBooking.final_price || 0))}
                  </p>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-500">
                    {t("bookings.amountPaid", { defaultValue: "Amount paid" })}
                  </span>
                  <p className="text-sm text-gray-900">
                    {formatPrice(
                      Math.max(
                        0,
                        Number(viewBooking.final_price || 0) -
                          Number(viewBooking.outstanding_amount || 0),
                      ),
                    )}
                  </p>
                </div>
              </div>
              <div>
                <span className="text-sm font-medium text-gray-500">
                  {t("bookings.outstanding", { defaultValue: "Outstanding" })}
                </span>
                <p className="text-sm text-gray-900">
                  {formatPrice(Number(viewBooking.outstanding_amount || 0))}
                </p>
              </div>
              {viewBookingHasLessonAssociation ? (
                <div>
                  <span className="text-sm font-medium text-gray-500">
                    {t("bookings.lessonsScheduled", {
                      defaultValue: "Lessons scheduled",
                    })}
                  </span>
                  <p className="text-sm text-gray-900">
                    {viewBooking.lessons_count ?? 0}
                  </p>
                </div>
              ) : null}
              {viewBooking.notes ? (
                <div>
                  <span className="text-sm font-medium text-gray-500">
                    {t("bookings.notes", { defaultValue: "Notes" })}
                  </span>
                  <p className="text-sm text-gray-900">{viewBooking.notes}</p>
                </div>
              ) : null}
              </div>
              <div className="space-y-4">
                <div>
                  <span className="text-sm font-medium text-gray-500">
                    {t("bookings.paymentHistory", { defaultValue: "Payment history" })}
                  </span>
                  <div className="mt-2 space-y-1">
                    {(bookingPayments || []).length === 0 ? (
                      <p className="text-sm text-gray-500">
                        {t("bookings.noPayments", { defaultValue: "No payments yet" })}
                      </p>
                    ) : (
                      bookingPayments?.map((p) => (
                        <p key={p.id} className="text-sm text-gray-900">
                          {p.payment_date?.slice(0, 10) || "N/A"} -{" "}
                          {formatPrice(Number(p.amount))}
                          {p.payment_method
                            ? ` (${p.payment_method})`
                            : ""}
                          {p.notes ? ` - ${p.notes}` : ""}
                        </p>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-sm text-gray-500 py-4">
              {t("common.loading", { defaultValue: "Loading..." })}
            </p>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setViewModalBookingId(null)}
            >
              {t("common.close", { defaultValue: "Close" })}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Booking Modal */}
      <Dialog
        open={!!editModalBookingId}
        onOpenChange={(open) => {
          if (!open) closeEditBookingModal();
        }}
      >
        <DialogContent
          overlayClassName={
            useNestedDialogElevation
              ? EMBED_NESTED_DIALOG_OVERLAY_Z
              : undefined
          }
          className={cn(
            "max-w-5xl max-h-[90vh] overflow-y-auto",
            useNestedDialogElevation && EMBED_NESTED_DIALOG_CONTENT_Z,
          )}
        >
          <DialogHeader>
            <DialogTitle>
              {t("bookings.editBooking", { defaultValue: "Edit booking" })}
            </DialogTitle>
          </DialogHeader>
          {editBooking ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 py-2">
              <div className="space-y-4">
                <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-2">
                  <Package className="h-4 w-4" />
                  {t("bookings.product", { defaultValue: "Product" })}
                </label>
                <div ref={editProductSelectRef} className="relative">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() =>
                      setEditProductSelectOpen(!editProductSelectOpen)
                    }
                    className={cn(
                      "w-full justify-between",
                      !editProductId && "text-muted-foreground",
                    )}
                  >
                    <span>
                      {editSelectedProduct?.title ||
                        t("bookings.selectProduct", {
                          defaultValue: "Select product",
                        })}
                    </span>
                    <ChevronDown
                      className={cn(
                        "h-4 w-4 shrink-0",
                        editProductSelectOpen && "rotate-180",
                      )}
                    />
                  </Button>
                  {editProductSelectOpen && (
                    <div
                      className="absolute z-50 w-full mt-1 rounded-md border bg-white shadow-lg flex flex-col"
                      style={{ maxHeight: "240px" }}
                    >
                      {/* Search bar */}
                      <div className="p-2 border-b border-gray-200 flex-shrink-0">
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                          <Input
                            type="text"
                            placeholder={t("bookings.searchProducts", {
                              defaultValue: "Search products",
                            })}
                            value={editProductSearchQuery}
                            onChange={(e) =>
                              setEditProductSearchQuery(e.target.value)
                            }
                            className="pl-10"
                          />
                        </div>
                      </div>

                      {/* Product list */}
                      <div
                        className="overflow-y-auto overflow-x-hidden flex-1"
                        style={{
                          scrollbarWidth: "thin",
                          scrollbarColor: "#cbd5e0 #f7fafc",
                        }}
                      >
                        {editFilteredProducts.length === 0 ? (
                          <div className="px-4 py-4 text-center text-sm text-gray-500">
                            {editProductSearchQuery
                              ? t("bookings.noProductsFound", {
                                  defaultValue: "No products found",
                                })
                              : t("bookings.noProductsAvailable", {
                                  defaultValue: "No products available",
                                })}
                          </div>
                        ) : (
                          <div>
                            {editFilteredProducts.map((p) => (
                              <div
                                key={p.id}
                                onClick={() => {
                                  setEditProductId(p.id);
                                  setEditTotalPrice(String(p.price));
                                  setEditProductSelectOpen(false);
                                }}
                                className={cn(
                                  "px-3 py-2 cursor-pointer hover:bg-gray-50",
                                  editProductId === p.id && "bg-pink-50",
                                )}
                              >
                                {p.title}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>

                <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  {t("bookings.students", { defaultValue: "Students" })}
                </label>
                {editStudentIds.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-2">
                    {editStudentIds.map((sid) => {
                      const s = students.find((x: any) => x.id === sid);
                      if (!s) return null;
                      return (
                        <div
                          key={sid}
                          className="inline-flex items-center gap-2 px-2 py-1 bg-gray-50 border rounded text-sm"
                        >
                          {s.firstName} {s.lastName}
                          <button
                            type="button"
                            onClick={() => handleEditStudentRemove(sid)}
                            className="text-gray-500 hover:text-gray-700"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
                <div ref={editStudentSelectorRef} className="relative">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() =>
                      setEditStudentSelectorOpen(!editStudentSelectorOpen)
                    }
                    className={cn(
                      "w-full justify-between",
                      editStudentIds.length === 0 && "text-muted-foreground",
                      editParticipantsExceeded &&
                        "border-red-500 ring-1 ring-red-500 text-red-700",
                    )}
                  >
                    <span>
                      {editStudentIds.length === 0
                        ? t("bookings.selectStudents", {
                            defaultValue: "Select students",
                          })
                        : t("bookings.studentsSelected", {
                            selected: editStudentIds.length,
                            max: editMaxParticipants,
                            defaultValue: `${editStudentIds.length} students selected`,
                          })}
                    </span>
                    <ChevronDown
                      className={cn(
                        "h-4 w-4 shrink-0",
                        editStudentSelectorOpen && "rotate-180",
                      )}
                    />
                  </Button>
                  {editStudentSelectorOpen && (
                    <div className="absolute z-50 w-full mt-1 rounded-md border bg-white shadow-lg flex flex-col max-h-48">
                      <div className="p-2 border-b">
                        <Input
                          placeholder={t("bookings.searchStudents", {
                            defaultValue: "Search students",
                          })}
                          value={editStudentSearchQuery}
                          onChange={(e) =>
                            setEditStudentSearchQuery(e.target.value)
                          }
                          className="h-9"
                        />
                      </div>
                      <div className="overflow-y-auto flex-1">
                        {editFilteredStudents.map((s: any) => {
                          const sel = editStudentIds.includes(s.id);
                          const dis =
                            !sel &&
                            editStudentIds.length >= editMaxParticipants;
                          return (
                            <div
                              key={s.id}
                              onClick={() =>
                                !dis && handleEditStudentToggle(s.id)
                              }
                              className={cn(
                                "px-3 py-2 cursor-pointer hover:bg-gray-50",
                                sel && "bg-pink-50",
                                dis && "opacity-50 cursor-not-allowed",
                              )}
                            >
                              {s.firstName} {s.lastName}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
                {editParticipantsExceeded && (
                  <p className="text-sm text-red-600">
                    {t("bookings.maxParticipantsExceeded", {
                      max: editMaxParticipants,
                      defaultValue: `You can select a maximum of ${editMaxParticipants} students for this product.`,
                    })}
                  </p>
                )}
              </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">
                  {t("bookings.startDate", { defaultValue: "Start date" })}
                    </label>
                    <Input
                      type="date"
                      value={editStartDate}
                      onChange={(e) => setEditStartDate(e.target.value)}
                      className="max-w-sm"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">
                  {t("bookings.endDate", { defaultValue: "End date" })}
                    </label>
                    <Input
                      type="date"
                      value={editEndDate}
                      onChange={(e) => setEditEndDate(e.target.value)}
                      className="max-w-sm"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">
                  {t("bookings.notes", { defaultValue: "Notes" })}
                  </label>
                  <Input
                    value={editNotes}
                    onChange={(e) => setEditNotes(e.target.value)}
                    placeholder={t("bookings.notesPlaceholder", {
                      defaultValue: "Optional notes",
                    })}
                    className="max-w-sm"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">
                  {t("bookings.totalPrice", { defaultValue: "Total price" })}
                    </label>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={editTotalPrice}
                      onChange={(e) => setEditTotalPrice(e.target.value)}
                      className="max-w-sm"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">
                  {t("bookings.discount", { defaultValue: "Discount" })}
                    </label>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={editDiscountAmount}
                      onChange={(e) => setEditDiscountAmount(e.target.value)}
                      className="max-w-sm"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-2 border rounded p-3">
                  <div className="text-sm font-medium">
                    {t("bookings.recordPayment", { defaultValue: "Record payment" })}
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <Input
                      type="number"
                      min="0.01"
                      step="0.01"
                      placeholder={t("bookings.amount", { defaultValue: "Amount" })}
                      value={paymentAmount}
                      onChange={(e) => setPaymentAmount(e.target.value)}
                    />
                    <Input
                      type="date"
                      value={paymentDate}
                      onChange={(e) => setPaymentDate(e.target.value)}
                    />
                  </div>
                  <Input
                    placeholder={t("bookings.paymentMethod", {
                      defaultValue: "Payment method",
                    })}
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                  />
                  <Input
                    placeholder={t("bookings.notes", { defaultValue: "Notes" })}
                    value={paymentNotes}
                    onChange={(e) => setPaymentNotes(e.target.value)}
                  />
                  <Button
                    disabled={
                      addBookingPayment.isPending ||
                      !editModalBookingId ||
                      !paymentAmount ||
                      Number(paymentAmount) <= 0
                    }
                    onClick={async () => {
                      if (!editModalBookingId) return;
                      await addBookingPayment.mutateAsync({
                        id: editModalBookingId,
                        schoolId: effectiveSchoolId,
                        amount: Number(paymentAmount),
                        payment_date: paymentDate,
                        payment_method: paymentMethod || undefined,
                        notes: paymentNotes || undefined,
                      });
                      setPaymentAmount("");
                      setPaymentDate(new Date().toISOString().slice(0, 10));
                      setPaymentMethod("");
                      setPaymentNotes("");
                    }}
                  >
                    {t("bookings.addPayment", { defaultValue: "Add payment" })}
                  </Button>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-500">
                    {t("bookings.paymentHistory", { defaultValue: "Payment history" })}
                  </span>
                  <div className="mt-2 space-y-1">
                    {(bookingPayments || []).length === 0 ? (
                      <p className="text-sm text-gray-500">
                        {t("bookings.noPayments", { defaultValue: "No payments yet" })}
                      </p>
                    ) : (
                      bookingPayments?.map((p) => (
                        <p key={p.id} className="text-sm text-gray-900">
                          {p.payment_date?.slice(0, 10) || "N/A"} -{" "}
                          {formatPrice(Number(p.amount))}
                          {p.payment_method
                            ? ` (${p.payment_method})`
                            : ""}
                          {p.notes ? ` - ${p.notes}` : ""}
                        </p>
                      ))
                    )}
                  </div>
                </div>
              </div>

              <DialogFooter className="lg:col-span-2">
                <Button
                  variant="outline"
                  onClick={closeEditBookingModal}
                  disabled={updateBooking.isPending}
                >
                  {t("common.cancel", { defaultValue: "Cancel" })}
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => editModalBookingId && openDeleteDialog(editModalBookingId)}
                  disabled={updateBooking.isPending || deleteBooking.isPending}
                >
                  {t("bookings.delete", { defaultValue: "Delete" })}
                </Button>
                <Button
                  disabled={
                    updateBooking.isPending ||
                    !editProductId ||
                    editStudentIds.length === 0 ||
                    editStudentIds.length > editMaxParticipants ||
                    !editStartDate
                  }
                  onClick={async () => {
                    if (
                      !editModalBookingId ||
                      !editProductId ||
                      editStudentIds.length === 0 ||
                      !editStartDate
                    )
                      return;
                    if (editStudentIds.length > editMaxParticipants) {
                      toast.error(
                        t("bookings.maxParticipantsExceeded", {
                          max: editMaxParticipants,
                          defaultValue: `You can select a maximum of ${editMaxParticipants} students for this product.`,
                        }),
                      );
                      return;
                    }
                    const withoutLevel = students.filter(
                      (s: any) =>
                        editStudentIds.includes(s.id) &&
                        (!s.skillLevel || String(s.skillLevel).trim() === ""),
                    );
                    if (withoutLevel.length > 0) {
                      const names = withoutLevel
                        .map(
                          (s: any) =>
                            `${s.firstName || ""} ${s.lastName || ""}`.trim() ||
                            s.email ||
                            t("common.unknown", { defaultValue: "Unknown" }),
                        )
                        .join(", ");
                      toast.error(
                        t("bookings.studentsSkillLevelRequired", {
                          studentNames: names,
                          defaultValue: `Cannot update: the following student(s) must have a skill level set: ${names}.`,
                        }),
                      );
                      return;
                    }
                    await updateBooking.mutateAsync({
                      id: editModalBookingId,
                      data: {
                        product_id: editProductId,
                        student_ids: editStudentIds,
                        start_date: editStartDate,
                        end_date: editEndDate?.trim() ? editEndDate : null,
                        notes: editNotes?.trim() || undefined,
                        total_price: editTotalPrice
                          ? Number(editTotalPrice)
                          : undefined,
                        discount_amount: editDiscountAmount
                          ? Number(editDiscountAmount)
                          : 0,
                      },
                      schoolId: effectiveSchoolId,
                    });
                    closeEditBookingModal();
                  }}
                >
                  {updateBooking.isPending
                    ? t("common.saving", { defaultValue: "Saving..." })
                    : t("common.save", { defaultValue: "Save" })}
                </Button>
              </DialogFooter>
            </div>
          ) : (
            <p className="text-sm text-gray-500 py-4">
              {t("common.loading", { defaultValue: "Loading..." })}
            </p>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteDialogBookingId} onOpenChange={(open) => !open && closeDeleteDialog()}>
        <DialogContent
          overlayClassName={
            useNestedDialogElevation ? EMBED_NESTED_DIALOG_OVERLAY_Z : undefined
          }
          className={cn(
            "max-w-md",
            useNestedDialogElevation && EMBED_NESTED_DIALOG_CONTENT_Z,
          )}
        >
          <DialogHeader>
            <DialogTitle>
              {t("bookings.deleteConfirmTitle", {
                defaultValue: "Delete booking?",
              })}
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            {t("bookings.deleteWarningAllLessons", {
              defaultValue:
                "This booking will be permanently deleted. All lessons linked to this booking will also be deleted. This action cannot be undone.",
            })}
          </p>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={closeDeleteDialog}
              disabled={deleteBooking.isPending}
            >
              {t("common.cancel", { defaultValue: "Cancel" })}
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDeleteBooking}
              disabled={deleteBooking.isPending}
            >
              {deleteBooking.isPending
                ? t("common.deleting", { defaultValue: "Deleting..." })
                : t("bookings.deleteConfirmAction", {
                    defaultValue: "Delete booking",
                  })}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );

  if (isEmbeddedEditOnly) {
    return pageBody;
  }

  return (
    <div className={cn("space-y-8", isEmbeddedSheet && "space-y-6")}>
      {pageBody}
    </div>
  );
};

export default BookingsPage;
