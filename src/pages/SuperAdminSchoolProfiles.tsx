import React, { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { schoolsApi } from "@/services/schools";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { CustomUploadButton } from "@/components/schools/CustomUploadButton";
import { useAuthStore } from "@/store/auth";
import { useSchoolSelectionStore } from "@/store/schoolSelection";
import { Edit, Search, Plus } from "lucide-react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useErrorTranslation } from "@/hooks/useErrorTranslation";
import { Pagination } from "@/store/auth";
import { toast } from "react-hot-toast";

const SuperAdminSchoolProfiles: React.FC = () => {
  const { t } = useTranslation();
  const { getTranslatedError } = useErrorTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { selectedSchoolId } = useSchoolSelectionStore();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  });

  const { token } = useAuthStore();
  const [logoUrl, setLogoUrl] = useState<string>("");
  const [formData, setFormData] = useState({
    name: "",
    address: "",
    phone: "",
    email: "",
    website: "",
    logo: "",
    openHoursStart: "09:00",
    openHoursEnd: "18:00",
  });

  const { data: schools = [], isLoading: loading } = useQuery({
    queryKey: ["schools", 1, 100],
    queryFn: () => schoolsApi.getAll(1, 100),
    staleTime: 120000,
  });

  // redirect to selected school if on base route
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const isCreateMode = searchParams.get("create") === "true";

    if (
      selectedSchoolId &&
      location.pathname === "/admin/school-profiles" &&
      !isCreateMode
    ) {
      navigate(`/admin/school-profiles/${selectedSchoolId}`, { replace: true });
    }
  }, [selectedSchoolId, location.pathname, location.search, navigate]);

  useEffect(() => {
    setPagination((prev) => ({ ...prev, page: 1 }));
  }, [search]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return schools;
    return schools.filter((s) =>
      [s.name, s.slug, s.email ?? "", s.phone ?? ""].some((f) =>
        (f || "").toLowerCase().includes(q),
      ),
    );
  }, [search, schools]);

  const startIndex = (pagination.page - 1) * pagination.limit;
  const endIndex = startIndex + pagination.limit;
  const paginatedSchools = filtered.slice(startIndex, endIndex);

  const totalPages = Math.ceil(filtered.length / pagination.limit);

  const handlePageChange = (newPage: number) => {
    setPagination((prev) => ({ ...prev, page: newPage }));
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
  };

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

  const handleOpenCreateForm = () => {
    const { clearSelectedSchool } = useSchoolSelectionStore.getState();
    clearSelectedSchool();

    setLogoUrl("");
    setFormData({
      name: "",
      address: "",
      phone: "",
      email: "",
      website: "",
      logo: "",
      openHoursStart: "09:00",
      openHoursEnd: "18:00",
    });
    setShowCreateForm(true);

    const searchParams = new URLSearchParams(location.search);
    if (searchParams.get("create") !== "true") {
      navigate("/admin/school-profiles?create=true", { replace: true });
    }
  };

  const handleCreateSchool = async () => {
    try {
      // Convert empty strings to undefined for optional fields
      const submitData = {
        ...formData,
        logo: logoUrl || formData.logo || undefined,
        address: formData.address || undefined,
        phone: formData.phone || undefined,
        email: formData.email || undefined,
        website: formData.website || undefined,
        disciplines: [],
      };
      await schoolsApi.create(submitData);
      setLogoUrl("");
      setFormData({
        name: "",
        address: "",
        phone: "",
        email: "",
        website: "",
        logo: "",
        openHoursStart: "09:00",
        openHoursEnd: "18:00",
      });
      setShowCreateForm(false);
      navigate("/admin/school-profiles?create=true", { replace: true });
      await queryClient.invalidateQueries({ queryKey: ["schools"] });
      window.dispatchEvent(new Event("schoolCreated"));
      toast.success(t("school.schoolCreated"));
    } catch (error: any) {
      console.error("Failed to create school:", error);
      toast.error(getTranslatedError(error) || t("school.schoolCreateFailed"));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await handleCreateSchool();
  };

  return (
    <div className="py-4">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-semibold">
          {t("schoolProfile.schoolProfiles")}
        </h1>
        <Button
          onClick={handleOpenCreateForm}
          className="bg-pink-600 hover:bg-pink-700 text-white"
        >
          <Plus className="h-4 w-4 mr-2" />
          {t("schoolProfile.createNewSchool")}
        </Button>
      </div>

      {/* Search Bar */}
      <form onSubmit={handleSearch} className="mb-6">
        <div className="flex gap-4">
          <Input
            type="text"
            placeholder={t("admin.searchSchools")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1"
          />
          <Button type="submit" variant="outline">
            <Search className="h-4 w-4 mr-2" />
            {t("common.search")}
          </Button>
        </div>
      </form>

      <Card>
        <CardHeader>
          <CardTitle>{t("schoolProfile.allSchools")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t("schoolProfile.name")}
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t("schoolProfile.email")}
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t("schoolProfile.phone")}
                  </th>
                  <th className="px-4 py-2" />
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {loading ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-6 text-center">
                      <div className="flex justify-center items-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pink-600"></div>
                        <span className="ml-3 text-sm text-gray-500">
                          {t("schoolProfile.loading")}
                        </span>
                      </div>
                    </td>
                  </tr>
                ) : paginatedSchools.length === 0 ? (
                  <tr>
                    <td
                      colSpan={4}
                      className="px-4 py-6 text-center text-sm text-gray-500"
                    >
                      {t("schoolProfile.noSchoolsFound")}
                    </td>
                  </tr>
                ) : (
                  paginatedSchools.map((s) => (
                    <tr key={s.id}>
                      <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                        {s.name}
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
                        {s.email || "-"}
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
                        {s.phone || "-"}
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap text-right">
                        <Button asChild size="sm" variant="outline">
                          <Link to={`/admin/school-profiles/${s.id}`}>
                            <Edit className="h-4 w-4 mr-2" />
                            {t("schoolProfile.edit")}
                          </Link>
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {filtered.length > 0 && (
            <div className="flex justify-between items-center mt-6">
              <div className="text-sm text-gray-700">
                {t("admin.showing")} {startIndex + 1} {t("admin.to")}{" "}
                {Math.min(endIndex, filtered.length)} {t("admin.of")}{" "}
                {filtered.length} {t("admin.results")}
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
        </CardContent>
      </Card>

      {/* Create School */}
      {showCreateForm && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-full max-w-2xl shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                {t("school.createSchool")}
              </h3>
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Logo Upload Section */}
                <div className="space-y-3 mb-4">
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0">
                      <Avatar className="h-24 w-24 border-2 border-gray-300">
                        <AvatarImage
                          src={logoUrl || undefined}
                          alt="School logo"
                          className="object-cover"
                        />
                        <AvatarFallback className="bg-gray-100 text-gray-700 text-xl font-semibold">
                          {(() => {
                            const name = formData.name || "";
                            const words = name.trim().split(/\s+/);
                            if (words.length >= 2) {
                              return (
                                words[0].charAt(0) +
                                words[words.length - 1].charAt(0)
                              ).toUpperCase();
                            } else if (
                              words.length === 1 &&
                              words[0].length >= 2
                            ) {
                              return words[0].substring(0, 2).toUpperCase();
                            }
                            return "SC";
                          })()}
                        </AvatarFallback>
                      </Avatar>
                    </div>

                    <div className="flex-1 space-y-2">
                      <div>
                        <label className="block text-sm font-medium text-gray-700">
                          {t("schoolProfile.schoolLogo") || "School Logo"}{" "}
                          (Optional)
                        </label>
                      </div>

                      <p className="text-xs text-gray-500">
                        {t("schoolProfile.logoFormat")}
                      </p>

                      {token && (
                        <div className="pt-2">
                          <CustomUploadButton
                            endpoint="schoolLogo"
                            headers={() => ({
                              Authorization: `Bearer ${token}`,
                            })}
                            onClientUploadComplete={(
                              res: Array<{
                                url: string;
                                name: string;
                                size: number;
                                key: string;
                                ufsUrl?: string;
                              }>,
                            ) => {
                              if (res && res[0]) {
                                const newLogoUrl = res[0].ufsUrl || res[0].url;
                                setLogoUrl(newLogoUrl);
                                setFormData((prev) => ({
                                  ...prev,
                                  logo: newLogoUrl,
                                }));
                                toast.success(t("schoolProfile.logoUpdated"));
                              }
                            }}
                            onUploadError={(error: Error) => {
                              console.error("Upload failed:", error);
                              toast.error(
                                `${t("schoolProfile.uploadFailed")}: ${error.message}`,
                              );
                            }}
                            buttonText={
                              logoUrl
                                ? t("schoolProfile.changeLogo")
                                : t("schoolProfile.addLogo")
                            }
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </div>

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

                <div className="flex justify-end space-x-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setShowCreateForm(false);
                      setLogoUrl("");
                      setFormData({
                        name: "",
                        address: "",
                        phone: "",
                        email: "",
                        website: "",
                        logo: "",
                        openHoursStart: "09:00",
                        openHoursEnd: "18:00",
                      });
                      navigate("/admin/school-profiles?create=true", {
                        replace: true,
                      });
                    }}
                  >
                    {t("admin.cancel")}
                  </Button>
                  <Button
                    type="submit"
                    disabled={loading}
                    className="bg-pink-600 hover:bg-pink-700 text-white"
                  >
                    {loading
                      ? t("admin.loading")
                      : t("common.save", { defaultValue: "Save" })}
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

export default SuperAdminSchoolProfiles;
