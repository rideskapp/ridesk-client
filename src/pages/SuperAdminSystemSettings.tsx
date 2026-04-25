import React, { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { schoolsApi } from "@/services/schools";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Settings, Search } from "lucide-react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Pagination } from "@/store/auth";

const SuperAdminSystemSettings: React.FC = () => {
  const { t } = useTranslation();
  const [search, setSearch] = useState("");
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  });

  const { data: schools = [], isLoading: loading } = useQuery({
    queryKey: ['schools', 1, 100],
    queryFn: () => schoolsApi.getAll(1, 100),
    staleTime: 120000,
  });

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

  return (
    <div className="py-4">
      <h1 className="text-2xl font-semibold mb-4">{t("admin.systemSettings")}</h1>
      
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
                    {t("schoolCalendar.name")}
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t("schoolCalendar.email")}
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t("schoolCalendar.phone")}
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
                        <span className="ml-3 text-sm text-gray-500">{t("common.loading")}</span>
                      </div>
                    </td>
                  </tr>
                ) : paginatedSchools.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-6 text-center text-sm text-gray-500">
                      {t("admin.noSchoolsYet")}
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
                          <Link to={`/admin/settings/${s.id}`}>
                            <Settings className="h-4 w-4 mr-2" />
                            {t("admin.manageSettings") || "Manage Settings"}
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
    </div>
  );
};

export default SuperAdminSystemSettings;

