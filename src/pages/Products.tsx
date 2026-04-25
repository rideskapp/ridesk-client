import React, { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Loader2, Plus, Pencil, Trash2, Filter, AlertCircle, FileDown } from "lucide-react";
import { useProducts, Product } from "@/hooks/useProducts";
import { useProductCategories } from "@/hooks/useProductCategories";
import { useAllDisciplines } from "@/hooks/useDisciplines";
import { useStudentLevels } from "@/hooks/useStudentLevels";
import { useSystemConfig } from "@/hooks/useSystemConfig";
import { PRICE_TYPE, PriceType } from "@/constants/priceTypes";
import { useSchool } from "@/hooks/useSchool";
import { useSchoolSettings } from "@/hooks/useSchoolSettings";
import { getCurrencySymbol } from "@/lib/currency";
import { formatCurrency } from "@/lib/utils";
import { generatePriceListPdf } from "@/utils/generatePriceListPdf";
import { toast } from "react-hot-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface ProductsProps {
  schoolId?: string;
}

const Products: React.FC<ProductsProps> = ({ schoolId }) => {
  const { t } = useTranslation();
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [disciplineFilter, setDisciplineFilter] = useState<string>("all");
  const {
    products,
    isLoading,
    deleteProduct,
    createProduct,
    updateProduct,
    toggleStatus,
    isDeleting,
    isCreating,
    isUpdating,
    isToggling
  } = useProducts({
    category_id: categoryFilter && categoryFilter !== "all" ? categoryFilter : undefined,
    discipline_id: disciplineFilter && disciplineFilter !== "all" ? disciplineFilter : undefined,
    schoolId: schoolId,
  });
  const { categories } = useProductCategories(schoolId);
  const { disciplines } = useAllDisciplines(schoolId);
  const { studentLevels } = useStudentLevels(schoolId);
  const { config: systemConfig } = useSystemConfig();
  const { school, isLoading: isLoadingSchool } = useSchool(schoolId);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const { settings: schoolSettings } = useSchoolSettings(schoolId);

  const hasLevels = studentLevels && studentLevels.length > 0;
  const hasDisciplines = disciplines && disciplines.length > 0;
  const hasCategories = categories && categories.length > 0;
  const canCreateProduct = hasLevels && hasDisciplines && hasCategories;
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isFormDialogOpen, setIsFormDialogOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [formData, setFormData] = useState<{
    title: string;
    category_id: string;
    discipline_id: string;
    description_short: string;
    price: number;
    price_type: PriceType;
    duration_hours: number;
    max_participants: number;
    equipment_flag_discount: boolean;
    note: string;
    order_position: number;
    active: boolean;
    featured: boolean;
  }>({
    title: "",
    category_id: "",
    discipline_id: "",
    description_short: "",
    price: 65.00,
    price_type: PRICE_TYPE.PER_PERSON,
    duration_hours: 1,
    max_participants: 1,
    equipment_flag_discount: false,
    note: "",
    order_position: 0,
    active: true,
    featured: false,
  });

  const handleDeleteProduct = (product: Product) => {
    setSelectedProduct(product);
    setIsDeleteDialogOpen(true);
  };

  const handleCreateProduct = () => {
    setSelectedProduct(null);
    setFormData({
      title: "",
      category_id: "",
      discipline_id: "",
      description_short: "",
      price: 65.00,
      price_type: PRICE_TYPE.PER_PERSON,
      duration_hours: 1,
      max_participants: 1,
      equipment_flag_discount: false,
      note: "",
      order_position: products.length > 0 ? Math.max(...products.map(p => p.order_position)) + 1 : 0,
      active: true,
      featured: false,
    });
    setIsFormDialogOpen(true);
  };

  const handleEditProduct = (product: Product) => {
    setSelectedProduct(product);
    setFormData({
      title: product.title,
      category_id: product.category_id,
      discipline_id: product.discipline_id || "",
      description_short: product.description_short || "",
      price: product.price || 65.00,
      price_type: (product as any).price_type || PRICE_TYPE.PER_PERSON,
      duration_hours: product.duration_hours || 1,
      max_participants: product.max_participants || 1,
      equipment_flag_discount: (product as any).equipment_flag_discount || false,
      note: (product as any).note || "",
      order_position: product.order_position || 0,
      active: product.active,
      featured: product.featured,
    });
    setIsFormDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const submitData = {
        ...formData,
        discipline_id: formData.discipline_id || undefined,
        description_short: formData.description_short || undefined,
        duration_hours: formData.duration_hours || undefined,
        note: formData.note?.trim() || undefined,
      };

      if (selectedProduct) {
        await updateProduct({ id: selectedProduct.id, data: submitData });
      } else {
        await createProduct(submitData);
      }
      setIsFormDialogOpen(false);
      setSelectedProduct(null);
      setFormData({
        title: "",
        category_id: "",
        discipline_id: "",
        description_short: "",
        price: 65.00,
        price_type: PRICE_TYPE.PER_PERSON,
        duration_hours: 1,
        max_participants: 1,
        equipment_flag_discount: false,
        note: "",
        order_position: 0,
        active: true,
        featured: false,
      });
    } catch (error) {
      // Error is handled by the hook (toast notification)
    }
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === "number"
        ? (value === "" ? "" : (isNaN(parseFloat(value)) ? prev[name as keyof typeof prev] : parseFloat(value)))
        : type === "checkbox"
          ? (e.target as HTMLInputElement).checked
          : value,
    }));
  };

  const handleNumberBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value === "" ? 0 : (isNaN(parseFloat(value)) ? 0 : parseFloat(value)),
    }));
  };

  const effectiveCurrency = schoolSettings?.defaultCurrency || "EUR";
  const formatPriceDisplay = (amount: number) =>
    formatCurrency(amount, effectiveCurrency, "it-IT");

  const activeProducts = useMemo(
    () => products.filter(p => p.active || p.is_active),
    [products]
  );

  const handleGeneratePdf = async () => {
    if (!school) {
      toast.error(t("products.schoolDataRequired"));
      return;
    }

    if (activeProducts.length === 0) {
      toast.error(t("products.noProductsForPdf"));
      return;
    }

    setIsGeneratingPdf(true);
    try {
      await generatePriceListPdf(school, activeProducts, categories);
      toast.success(t("products.pdfGenerated"));
    } catch (error: any) {
      console.error("PDF generation error:", error);
      toast.error(t("products.pdfGenerationFailed"));
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-0">
        <div>
          <h2 className="text-lg sm:text-xl font-bold text-gray-900">{t("products.title")}</h2>
          <p className="text-sm sm:text-base text-gray-600">{t("products.subtitle")}</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <Button
            onClick={handleGeneratePdf}
            variant="outline"
            disabled={isGeneratingPdf || isLoadingSchool || !school || activeProducts.length === 0}
            className="border-gray-300 hover:bg-gray-50 w-full sm:w-auto"
          >
            {isGeneratingPdf ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                {t("products.generatingPdf")}
              </>
            ) : (
              <>
                <FileDown className="h-4 w-4 mr-2" />
                {t("products.generatePdf")}
              </>
            )}
          </Button>
          <Button
            onClick={handleCreateProduct}
            className="bg-pink-600 hover:bg-pink-700 w-full sm:w-auto"
            disabled={!canCreateProduct}
          >
            <Plus className="h-4 w-4 mr-2" />
            {t("products.newProduct")}
          </Button>
        </div>
      </div>

      {!canCreateProduct && (
        <Card className="border-orange-200 bg-orange-50">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-orange-600 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm text-orange-800">
                  {t("products.prerequisitesRequired", {
                    defaultValue: "Please create at least 1 Level, 1 Discipline, and 1 Category before creating products."
                  })}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            {t("common.filter")}
          </CardTitle>
          <p className="text-sm text-gray-600">{t("products.filterByCategory")} / {t("products.filterByDiscipline")}</p>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <label className="text-sm font-medium mb-2 block">{t("products.discipline")}</label>
              <Select value={disciplineFilter} onValueChange={setDisciplineFilter}>
                <SelectTrigger>
                  <SelectValue placeholder={t("products.allDisciplines")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("products.allDisciplines")}</SelectItem>
                  {disciplines.map((d) => (
                    <SelectItem key={d.id} value={d.id} textValue={d.display_name}>
                      {d.display_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1">
              <label className="text-sm font-medium mb-2 block">{t("products.category")}</label>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger>
                  <SelectValue placeholder={t("products.allCategories")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("products.allCategories")}</SelectItem>
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={c.id} textValue={c.name}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("products.productsList")}</CardTitle>
          <p className="text-sm text-gray-600">{t("products.subtitle")}</p>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center items-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pink-600"></div>
              <span className="ml-3 text-sm text-gray-500">{t("common.loading")}</span>
            </div>
          ) : products.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500">{t("products.noProductsFound")}</p>
            </div>
          ) : (
            <>
              {/* Desktop Table View */}
              <div className="hidden md:block overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t("products.titleColumn")}</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t("products.shortDescription")}</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t("products.disciplineColumn")}</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t("products.categoryColumn")}</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t("products.durationColumn")}</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t("products.priceColumn")}</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t("products.priceType")}</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t("products.statusColumn")}</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t("products.actionsColumn")}</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {products.map((product) => (
                      <tr key={product.id} className={!product.active ? "opacity-60" : ""}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{product.title}</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-900">{product.description_short || "-"}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {product.disciplines ? (
                            <span
                              className="inline-flex px-2 py-1 text-xs font-semibold rounded-full text-white"
                              style={{ backgroundColor: product.disciplines.color || "#6B7280" }}
                            >
                              {product.disciplines.display_name}
                            </span>
                          ) : (
                            <span className="text-sm text-gray-500">-</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {product.product_categories ? (
                            <span
                              className="inline-flex px-2 py-1 text-xs font-semibold rounded-full text-white"
                              style={{ backgroundColor: product.product_categories.color || "#6B7280" }}
                            >
                              {product.product_categories.name}
                            </span>
                          ) : (
                            <span className="text-sm text-gray-500">-</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{product.duration_hours ? `${product.duration_hours}h` : "-"}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {formatPriceDisplay(product.price ?? 0)}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {product.price_type === PRICE_TYPE.PER_PERSON && t("products.priceTypePerPerson")}
                            {product.price_type === PRICE_TYPE.PER_COUPLE && t("products.priceTypePerCouple")}
                            {product.price_type === PRICE_TYPE.FIXED && t("products.priceTypeFixed")}
                            {!product.price_type && "-"}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => toggleStatus(product.id)}
                            disabled={isToggling}
                            className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full cursor-pointer transition-all duration-200 ${product.active
                                ? "bg-green-100 text-green-800 hover:bg-green-200"
                                : "bg-red-100 text-red-800 hover:bg-red-200"
                              } disabled:opacity-50 disabled:cursor-not-allowed`}
                            aria-label={product.active ? t("common.deactivate") : t("common.activate")}
                            title={product.active ? t("common.deactivate") : t("common.activate")}
                          >
                            {product.active ? t("common.active") : t("common.inactive")}
                          </button>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => handleEditProduct(product)}
                              className="text-blue-600 hover:text-blue-800"
                              title="Edit"
                            >
                              <Pencil className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteProduct(product)}
                              className="text-red-600 hover:text-red-800"
                              title={t("common.delete")}
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Card View */}
              <div className="md:hidden space-y-4">
                {products.map((product) => (
                  <Card key={product.id} className={!product.active ? "opacity-60" : ""}>
                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-900">{product.title}</h3>
                          {product.description_short && (
                            <p className="text-sm text-gray-600 mt-1">{product.description_short}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-2 ml-2">
                          <button
                            type="button"
                            onClick={() => handleEditProduct(product)}
                            className="text-blue-600 hover:text-blue-800"
                            title="Edit"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteProduct(product)}
                            className="text-red-600 hover:text-red-800"
                            title={t("common.delete")}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        {product.disciplines && (
                          <span
                            className="inline-flex px-2 py-1 text-xs font-semibold rounded-full text-white"
                            style={{ backgroundColor: product.disciplines.color || "#6B7280" }}
                          >
                            {product.disciplines.display_name}
                          </span>
                        )}
                        {product.product_categories && (
                          <span
                            className="inline-flex px-2 py-1 text-xs font-semibold rounded-full text-white"
                            style={{ backgroundColor: product.product_categories.color || "#6B7280" }}
                          >
                            {product.product_categories.name}
                          </span>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <span className="text-gray-600">{t("products.durationColumn")}:</span>
                          <span className="ml-2 font-medium">{product.duration_hours ? `${product.duration_hours}h` : "-"}</span>
                        </div>
                        <div>
                          <span className="text-gray-600">{t("products.priceColumn")}:</span>
                          <span className="ml-2 font-medium">
                            {formatPriceDisplay(product.price ?? 0)}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-600">{t("products.priceType")}:</span>
                          <span className="ml-2 font-medium">
                            {product.price_type === PRICE_TYPE.PER_PERSON && t("products.priceTypePerPerson")}
                            {product.price_type === PRICE_TYPE.PER_COUPLE && t("products.priceTypePerCouple")}
                            {product.price_type === PRICE_TYPE.FIXED && t("products.priceTypeFixed")}
                            {!product.price_type && "-"}
                          </span>
                        </div>
                        <div>
                          <button
                            type="button"
                            onClick={() => toggleStatus(product.id)}
                            disabled={isToggling}
                            className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full cursor-pointer transition-all duration-200 ${product.active
                                ? "bg-green-100 text-green-800 hover:bg-green-200"
                                : "bg-red-100 text-red-800 hover:bg-red-200"
                              } disabled:opacity-50 disabled:cursor-not-allowed`}
                            aria-label={product.active ? t("common.deactivate") : t("common.activate")}
                            title={product.active ? t("common.deactivate") : t("common.activate")}
                          >
                            {product.active ? t("common.active") : t("common.inactive")}
                          </button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("products.confirmDelete")}</DialogTitle>
            <DialogDescription>
              {t("products.confirmDeleteMessage")}
              {selectedProduct && (
                <span className="block mt-2 font-medium text-gray-900">{selectedProduct.title}</span>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              {t("common.cancel")}
            </Button>
            <Button
              variant="destructive"
              onClick={async () => {
                if (selectedProduct) {
                  await deleteProduct(selectedProduct.id);
                  setIsDeleteDialogOpen(false);
                }
              }}
              disabled={isDeleting}
            >
              {isDeleting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              {t("common.delete")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create/Edit Form Dialog */}
      <Dialog open={isFormDialogOpen} onOpenChange={setIsFormDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedProduct ? t("products.edit") : t("products.createNew")}
            </DialogTitle>
            <DialogDescription>
              {selectedProduct ? t("products.updateInfo") : t("products.addNew")}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t("products.titleRequired")}
              </label>
              <Input
                name="title"
                value={formData.title}
                onChange={handleInputChange}
                placeholder={t("products.titlePlaceholder")}
                required
                minLength={2}
                maxLength={255}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t("products.categoryRequired")}
                </label>
                <Select
                  value={formData.category_id}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, category_id: value }))}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t("products.selectCategory")} />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((category) => (
                      <SelectItem key={category.id} value={category.id} textValue={category.name}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t("products.discipline")}
                </label>
                <Select
                  value={formData.discipline_id || undefined}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, discipline_id: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t("products.selectDiscipline")} />
                  </SelectTrigger>
                  <SelectContent>
                    {disciplines.map((discipline) => (
                      <SelectItem key={discipline.id} value={discipline.id} textValue={discipline.display_name}>
                        {discipline.display_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t("products.shortDescription")}
              </label>
              <textarea
                name="description_short"
                value={formData.description_short}
                onChange={handleInputChange}
                placeholder={t("products.shortDescriptionPlaceholder")}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-pink-500"
                rows={3}
                maxLength={500}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t("products.priceRequired")}
                </label>
                <Input
                  type="number"
                  name="price"
                  value={formData.price || ""}
                  onChange={handleInputChange}
                  onBlur={handleNumberBlur}
                  min="0"
                  step="0.01"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t("products.priceType")} *
                </label>
                <Select
                  value={formData.price_type}
                  onValueChange={(value: string) => setFormData(prev => ({ ...prev, price_type: value as PriceType }))}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t("products.priceType")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={PRICE_TYPE.PER_PERSON}>{t("products.priceTypePerPerson")}</SelectItem>
                    <SelectItem value={PRICE_TYPE.PER_COUPLE}>{t("products.priceTypePerCouple")}</SelectItem>
                    <SelectItem value={PRICE_TYPE.FIXED}>{t("products.priceTypeFixed")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t("products.durationHours")} *
                </label>
                <Input
                  type="number"
                  name="duration_hours"
                  value={formData.duration_hours || ""}
                  onChange={handleInputChange}
                  onBlur={handleNumberBlur}
                  min="0"
                  step="0.25"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t("products.maxParticipants")}
                </label>
                <Input
                  type="number"
                  name="max_participants"
                  value={formData.max_participants || ""}
                  onChange={handleInputChange}
                  onBlur={handleNumberBlur}
                  min="1"
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="equipment_flag_discount"
                name="equipment_flag_discount"
                checked={formData.equipment_flag_discount}
                onChange={handleInputChange}
                className="rounded border-gray-300 text-pink-600 focus:ring-pink-500"
              />
              <label htmlFor="equipment_flag_discount" className="text-sm font-medium text-gray-700">
                {systemConfig?.products?.equipmentDiscountAmount
                  ? t("products.equipmentDiscountTemplate", {
                    amount: systemConfig.products.equipmentDiscountAmount,
                    currency: (() => {
                      const effectiveCurrency =
                        schoolSettings?.defaultCurrency ||
                        systemConfig.products.equipmentDiscountCurrency ||
                        "EUR";
                      return getCurrencySymbol(effectiveCurrency);
                    })()
                  })
                  : t("products.equipmentDiscount")}
              </label>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t("products.note")}
              </label>
              <textarea
                name="note"
                value={formData.note}
                onChange={handleInputChange}
                placeholder={t("products.notePlaceholder")}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-pink-500"
                rows={3}
                maxLength={1000}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t("products.orderPosition")}
              </label>
              <Input
                type="number"
                name="order_position"
                value={formData.order_position || ""}
                onChange={handleInputChange}
                onBlur={handleNumberBlur}
                min="0"
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsFormDialogOpen(false);
                  setSelectedProduct(null);
                  setFormData({
                    title: "",
                    category_id: "",
                    discipline_id: "",
                    description_short: "",
                    price: 65.00,
                    price_type: PRICE_TYPE.PER_PERSON,
                    duration_hours: 1,
                    max_participants: 1,
                    equipment_flag_discount: false,
                    note: "",
                    order_position: 0,
                    active: true,
                    featured: false,
                  });
                }}
              >
                {t("common.cancel")}
              </Button>
              <Button
                type="submit"
                disabled={isCreating || isUpdating}
                className="bg-pink-600 hover:bg-pink-700 text-white"
              >
                {isCreating || isUpdating ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    {selectedProduct ? t("products.updating") : t("products.creating")}
                  </>
                ) : (
                  selectedProduct ? t("products.edit") : t("products.create")
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Products;
