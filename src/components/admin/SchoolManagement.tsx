import React, { useState, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useErrorTranslation } from "../../hooks/useErrorTranslation";
import { schoolsApi, School } from "../../services/schools";
import { Pagination } from "../../store/auth";
import { useAllDisciplines } from "../../hooks/useDisciplines";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Search, Edit, Trash2, Plus } from "lucide-react";
import { toast } from "react-hot-toast";

const SchoolManagement: React.FC = () => {
  const { t } = useTranslation();
  const { getTranslatedError } = useErrorTranslation();
  const queryClient = useQueryClient();
  const { disciplines: allDisciplines } = useAllDisciplines();
  
  const disciplines = useMemo(() => {
    const seen = new Set<string>();
    return allDisciplines.filter((discipline) => {
      if (!discipline.slug) return false;
      if (seen.has(discipline.slug)) {
        return false;
      }
      seen.add(discipline.slug);
      return true;
    });
  }, [allDisciplines]);
  
  const [isLoading, setIsLoading] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingSchool, setEditingSchool] = useState<School | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  });

  const [formData, setFormData] = useState({
    name: "",
    address: "",
    phone: "",
    email: "",
    website: "",
    openHoursStart: "09:00",
    openHoursEnd: "18:00",
    disciplines: [] as string[],
  });

  const { data: schoolsData = [], isLoading: isLoadingSchools } = useQuery<School[]>({
    queryKey: ['schools', 1, 100],
    queryFn: async () => {
      try {
        return await schoolsApi.getAll(1, 100);
      } catch (error) {
        console.error("Failed to fetch schools:", error);
        toast.error(t("school.schoolFetchFailed"));
        throw error;
      }
    },
    staleTime: 120000,
  });

  const schools = schoolsData;

  useEffect(() => {
    setPagination((prev) => ({ ...prev, page: 1 }));
  }, [searchTerm]);

  const handleInputChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >,
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleDisciplineChange = (discipline: string, checked: boolean) => {
    if (checked) {
      setFormData((prev) => ({
        ...prev,
        disciplines: [...prev.disciplines, discipline],
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        disciplines: prev.disciplines.filter((d) => d !== discipline),
      }));
    }
  };

  const handleCreateSchool = async () => {
    try {
      setIsLoading(true);
      await schoolsApi.create(formData);
      setShowCreateForm(false);
      setFormData({
        name: "",
        address: "",
        phone: "",
        email: "",
        website: "",
        openHoursStart: "09:00",
        openHoursEnd: "18:00",
        disciplines: [],
      });
      await queryClient.invalidateQueries({ queryKey: ['schools'] });
      toast.success(t("school.schoolCreated"));
    } catch (error: any) {
      console.error("Failed to create school:", error);
      toast.error(getTranslatedError(error) || t("school.schoolCreateFailed"));
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditSchool = (school: School) => {
    setEditingSchool(school);
    setFormData({
      name: school.name,
      address: school.address || "",
      phone: school.phone || "",
      email: school.email || "",
      website: school.website || "",
      openHoursStart: school.openHoursStart || "09:00",
      openHoursEnd: school.openHoursEnd || "18:00",
      disciplines: school.disciplines || [],
    });
    setShowCreateForm(true);
  };

  const handleOpenCreateForm = () => {
    const allDisciplineSlugs = disciplines.length > 0 
      ? disciplines.map((d) => d.slug)
      : [];
    setEditingSchool(null);
    setFormData({
      name: "",
      address: "",
      phone: "",
      email: "",
      website: "",
      openHoursStart: "09:00",
      openHoursEnd: "18:00",
      disciplines: allDisciplineSlugs,
    });
    setShowCreateForm(true);
  };

  useEffect(() => {
    if (showCreateForm && !editingSchool && disciplines.length > 0) {
      const allDisciplineSlugs = disciplines.map((d) => d.slug);
      if (formData.disciplines.length === 0) {
        setFormData((prev) => ({
          ...prev,
          disciplines: allDisciplineSlugs,
        }));
      }
    }
  }, [showCreateForm, editingSchool, disciplines.length]);

  const handleUpdateSchool = async () => {
    if (!editingSchool) return;

    try {
      setIsLoading(true);
      await schoolsApi.update(editingSchool.id, formData);
      setShowCreateForm(false);
      setEditingSchool(null);
      setFormData({
        name: "",
        address: "",
        phone: "",
        email: "",
        website: "",
        openHoursStart: "09:00",
        openHoursEnd: "18:00",
        disciplines: [],
      });
      await queryClient.invalidateQueries({ queryKey: ['schools'] });
      toast.success(t("school.schoolUpdated"));
    } catch (error: any) {
      console.error("Failed to update school:", error);
      toast.error(getTranslatedError(error) || t("school.schoolUpdateFailed"));
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteSchool = async (schoolId: string) => {
    if (window.confirm(t("admin.confirmDelete"))) {
      try {
        await schoolsApi.delete(schoolId);
        await queryClient.invalidateQueries({ queryKey: ['schools'] });
        toast.success(t("school.schoolDeleted"));
      } catch (error: any) {
        console.error("Failed to delete school:", error);
        toast.error(getTranslatedError(error) || t("school.schoolDeleteFailed"));
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (editingSchool) {
      await handleUpdateSchool();
    } else {
      await handleCreateSchool();
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  // Filter schools based on search term
  const filteredSchools = schools.filter(
    (school) =>
      school.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      school.slug.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (school.email &&
        school.email.toLowerCase().includes(searchTerm.toLowerCase())),
  );

  // Client-side pagination
  const startIndex = (pagination.page - 1) * pagination.limit;
  const endIndex = startIndex + pagination.limit;
  const paginatedSchools = filteredSchools.slice(startIndex, endIndex);

  const totalPages = Math.ceil(filteredSchools.length / pagination.limit);

  const handlePageChange = (newPage: number) => {
    setPagination((prev) => ({ ...prev, page: newPage }));
  };

  if (isLoadingSchools && schools.length === 0) {
    return (
      <div className="flex justify-center items-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pink-600"></div>
        <span className="ml-3 text-sm text-gray-500">{t("common.loading")}</span>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900">
          {t("admin.schoolManagement")}
        </h1>
        <Button
          onClick={handleOpenCreateForm}
          className="bg-pink-600 hover:bg-pink-700 text-white"
        >
          <Plus className="h-4 w-4 mr-2" />
          {t("school.createSchool")}
        </Button>
      </div>

      {/* Search Bar */}
      <form onSubmit={handleSearch} className="mb-6">
        <div className="flex gap-4">
          <Input
            type="text"
            placeholder={t("admin.searchSchools")}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1"
          />
          <Button type="submit" variant="outline">
            <Search className="h-4 w-4 mr-2" />
            {t("common.search")}
          </Button>
        </div>
      </form>

      {/* Schools Table */}
      <Card>
        <CardHeader>
          <CardTitle>{t("admin.schools")}</CardTitle>
        </CardHeader>
        <CardContent>
          {paginatedSchools.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              {t("admin.noSchoolsYet")}
            </div>
          ) : (
            <>
              {/* Desktop Table */}
              <div className="hidden sm:block overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {t("school.schoolName")}
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {t("school.schoolSlug")}
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {t("school.email")}
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {t("school.disciplines")}
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {t("admin.createdAt")}
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {t("admin.actions")}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {paginatedSchools.map((school) => (
                      <tr key={school.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {school.name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {school.slug}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {school.email || "-"}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <div className="flex flex-wrap gap-1">
                            {school.disciplines.map((discipline) => (
                              <span
                                key={discipline}
                                className="px-2 py-1 bg-pink-100 text-pink-800 text-xs rounded-full capitalize"
                              >
                                {discipline}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatDate(school.createdAt)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex space-x-2">
                            <button
                              onClick={() => handleEditSchool(school)}
                              className="text-indigo-600 hover:text-indigo-900"
                            >
                              <Edit className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteSchool(school.id)}
                              className="text-red-600 hover:text-red-900"
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

              {/* Mobile Cards */}
              <div className="block sm:hidden space-y-4">
                {paginatedSchools.map((school) => (
                  <Card key={school.id} className="p-4">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-semibold text-lg">{school.name}</h3>
                      <div className="flex space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEditSchool(school)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteSchool(school.id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <div className="space-y-2 text-sm text-gray-600">
                      <div>
                        <span className="font-medium">
                          {t("school.schoolSlug")}:
                        </span>{" "}
                        {school.slug}
                      </div>
                      {school.email && (
                        <div>
                          <span className="font-medium">
                            {t("school.email")}:
                          </span>{" "}
                          {school.email}
                        </div>
                      )}
                      <div>
                        <span className="font-medium">
                          {t("school.disciplines")}:
                        </span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {school.disciplines.map((discipline) => (
                            <span
                              key={discipline}
                              className="px-2 py-1 bg-pink-100 text-pink-800 text-xs rounded-full capitalize"
                            >
                              {discipline}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div className="text-xs text-gray-500">
                        {formatDate(school.createdAt)}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>

              {/* Pagination */}
              {filteredSchools.length > 0 && (
                <div className="flex justify-between items-center mt-6">
                  <div className="text-sm text-gray-700">
                    {t("admin.showing")} {startIndex + 1} {t("admin.to")}{" "}
                    {Math.min(endIndex, filteredSchools.length)} {t("admin.of")}{" "}
                    {filteredSchools.length} {t("admin.results")}
                  </div>
                  {totalPages > 1 && (
                    <div className="flex space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePageChange(1)}
                        disabled={pagination.page === 1}
                      >
                        {t("common.first")}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePageChange(pagination.page - 1)}
                        disabled={pagination.page === 1}
                      >
                        {t("common.previous")}
                      </Button>
                      <span className="flex items-center px-3 py-2 text-sm">
                        {t("admin.page")} {pagination.page} {t("admin.of")}{" "}
                        {totalPages}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePageChange(pagination.page + 1)}
                        disabled={pagination.page === totalPages}
                      >
                        {t("common.next")}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePageChange(totalPages)}
                        disabled={pagination.page === totalPages}
                      >
                        {t("common.last")}
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit School Modal */}
      {showCreateForm && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-full max-w-2xl shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                {editingSchool
                  ? t("school.editSchool")
                  : t("school.createSchool")}
              </h3>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      {t("school.schoolName")} *
                    </label>
                    <Input
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      {t("school.address")}
                    </label>
                    <Input
                      name="address"
                      value={formData.address}
                      onChange={handleInputChange}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      {t("school.phone")}
                    </label>
                    <Input
                      name="phone"
                      value={formData.phone}
                      onChange={handleInputChange}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      {t("school.email")}
                    </label>
                    <Input
                      name="email"
                      type="email"
                      value={formData.email}
                      onChange={handleInputChange}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      {t("school.website")}
                    </label>
                    <Input
                      name="website"
                      type="url"
                      value={formData.website}
                      onChange={handleInputChange}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      {t("school.openHoursStart")} *
                    </label>
                    <Input
                      name="openHoursStart"
                      type="time"
                      value={formData.openHoursStart}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      {t("school.openHoursEnd")} *
                    </label>
                    <Input
                      name="openHoursEnd"
                      type="time"
                      value={formData.openHoursEnd}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t("school.disciplines")} *
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {disciplines.map((discipline) => (
                      <label
                        key={discipline.id}
                        className="flex items-center space-x-2"
                      >
                        <input
                          type="checkbox"
                          checked={formData.disciplines.includes(discipline.slug)}
                          onChange={(e) =>
                            handleDisciplineChange(discipline.slug, e.target.checked)
                          }
                          className="rounded border-gray-300 text-pink-600 focus:ring-pink-500"
                        />
                        <span className="text-sm text-gray-700">
                          {discipline.display_name}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="flex justify-end space-x-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setShowCreateForm(false);
                      setEditingSchool(null);
                      setFormData({
                        name: "",
                        address: "",
                        phone: "",
                        email: "",
                        website: "",
                            openHoursStart: "09:00",
                            openHoursEnd: "18:00",
                        disciplines: [],
                      });
                    }}
                  >
                    {t("admin.cancel")}
                  </Button>
                  <Button
                    type="submit"
                    disabled={isLoading}
                    className="bg-pink-600 hover:bg-pink-700 text-white"
                  >
                    {isLoading
                      ? t("admin.loading")
                      : editingSchool
                      ? t("admin.update")
                      : t("admin.create")}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SchoolManagement;
