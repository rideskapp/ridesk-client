import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useErrorTranslation } from "../../hooks/useErrorTranslation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "react-hot-toast";
import { authApi } from "../../services/auth";
import { schoolsApi } from "../../services/schools";
import { User as UserType, Pagination } from "../../store/auth";
import { School } from "../../services/schools";
import { InstructorSchoolAssignments } from "./InstructorSchoolAssignments";
import { useSchoolSelectionStore } from "../../store/schoolSelection";

const UserManagement: React.FC = () => {
  const { t } = useTranslation();
  const { getTranslatedError } = useErrorTranslation();
  const queryClient = useQueryClient();
  const { selectedSchoolId } = useSchoolSelectionStore();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingUser, setEditingUser] = useState<UserType | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  });
  const [showInstructorAssignments, setShowInstructorAssignments] =
    useState(false);
  const [selectedInstructor, setSelectedInstructor] = useState<UserType | null>(
    null,
  );

  const { data: usersData, isLoading: isLoadingUsers } = useQuery({
    queryKey: ['users', pagination.page, pagination.limit, searchTerm, selectedSchoolId],
    queryFn: async () => {
      const response = await authApi.getUsers(
        pagination.page,
        pagination.limit,
        searchTerm,
      );
      return response;
    },
    staleTime: 60000,
  });

  const users = usersData?.users || [];
  useEffect(() => {
    if (usersData?.pagination) {
      setPagination(usersData.pagination);
    }
  }, [usersData?.pagination]);

  // Reset pagination to page 1 when school changes
  useEffect(() => {
    setPagination((prev) => ({ ...prev, page: 1 }));
  }, [selectedSchoolId]);

  const { data: schools = [] } = useQuery<School[]>({
    queryKey: ['schools', 1, 100],
    queryFn: async () => {
      const response = await schoolsApi.getAll();
      return response || [];
    },
    staleTime: 120000,
  });

  const isLoading = isLoadingUsers;

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    role: "USER" as "SUPER_ADMIN" | "SCHOOL_ADMIN" | "INSTRUCTOR" | "USER",
    schoolId: "" as string | undefined,
  });

  const toggleStatusMutation = useMutation({
    mutationFn: ({ userId, isActive }: { userId: string; isActive: boolean }) =>
      authApi.updateUser(userId, { isActive }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      toast.success(t("admin.statusUpdated"));
    },
    onError: (error: any) => {
      toast.error(getTranslatedError(error) || t("admin.statusUpdateFailed"));
    },
  });

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleCreateUser = async () => {
    try {

      // Prepare data for submission - only include schoolId if it's required and not empty
      const submitData = { ...formData };

      if (formData.role === "SUPER_ADMIN") {
        submitData.schoolId = undefined;
      }

      if (formData.role === "SCHOOL_ADMIN") {
        if (!submitData.schoolId) {
          toast.error(t("admin.selectSchoolRequired"));
          return;
        }
      }

      // Remove schoolId if it's empty (for USER/INSTRUCTOR when no schools exist)
      if (submitData.schoolId === "") {
        submitData.schoolId = undefined;
      }

      await authApi.register(submitData);
      setShowCreateForm(false);
      setEditingUser(null);
      setFormData({
        firstName: "",
        lastName: "",
        email: "",
        password: "",
        role: "USER",
        schoolId: "",
      });
      await queryClient.invalidateQueries({ queryKey: ['users'] });
    } catch (error: any) {
      console.error("Failed to create user:", error);
    }
  };

  const handleEditUser = (user: UserType) => {
    setEditingUser(user);
    setFormData({
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      password: "", // Not used in edit mode
      role: user.role,
      schoolId: user.schoolId || "",
    });
    setShowCreateForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (editingUser) {
      await handleUpdateUser();
    } else {
      await handleCreateUser();
    }
  };

  const handleUpdateUser = async () => {
    if (!editingUser) return;

    try {

      // Prepare data for submission - only include schoolId if it's required and not empty
      const submitData = { ...formData };

      // Remove password if it's empty (don't update password if not provided)
      if (!submitData.password) {
        const { password, ...dataWithoutPassword } = submitData;
        Object.assign(submitData, dataWithoutPassword);
      }

      const { role, ...dataWithoutRole } = submitData;
      Object.assign(submitData, dataWithoutRole);

      if (editingUser.role === "SUPER_ADMIN") {
        submitData.schoolId = undefined;
      }

      // Remove schoolId if it's empty (for USER/INSTRUCTOR when no schools exist)
      if (submitData.schoolId === "") {
        submitData.schoolId = undefined;
      }

      await authApi.updateUser(editingUser.id, submitData);
      setShowCreateForm(false);
      setEditingUser(null);
      setFormData({
        firstName: "",
        lastName: "",
        email: "",
        password: "",
        role: "USER",
        schoolId: "",
      });
      await queryClient.invalidateQueries({ queryKey: ['users'] });
    } catch (error: any) {
      console.error("Failed to update user:", error);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (window.confirm(t("admin.confirmDelete"))) {
      try {
        await authApi.deleteUser(userId);
        await queryClient.invalidateQueries({ queryKey: ['users'] });
      } catch (error) {
        console.error("Failed to delete user:", error);
      }
    }
  };

  const handleManageInstructorSchools = (user: UserType) => {
    setSelectedInstructor(user);
    setShowInstructorAssignments(true);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  const handlePageChange = (page: number) => {
    setPagination((prev) => ({ ...prev, page }));
  };

  const getRoleDisplayName = (role: string) => {
    switch (role) {
      case "SUPER_ADMIN":
        return t("admin.superAdmin");
      case "SCHOOL_ADMIN":
        return t("admin.schoolAdmin");
      case "INSTRUCTOR":
        return t("admin.instructor");
      case "USER":
        return t("admin.user");
      default:
        return role;
    }
  };

  const handleToggleStatus = async (userId: string, currentStatus: boolean) => {
    toggleStatusMutation.mutate({ userId, isActive: !currentStatus });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  return (
    <div>
      <div className="mb-4 sm:mb-6 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 sm:gap-0">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-900">
          {t("admin.userManagement")}
        </h2>
        <button
          type="button"
          onClick={() => setShowCreateForm(true)}
          className="bg-pink-600 hover:bg-pink-700 text-white px-3 sm:px-4 py-2 rounded-md text-sm font-medium w-full sm:w-auto"
        >
          + {t("admin.createUser")}
        </button>
      </div>

      {/* Search Bar */}
      <form onSubmit={handleSearch} className="mb-4 sm:mb-6">
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-4">
          <input
            type="text"
            placeholder={t("admin.searchUsers")}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1 px-3 sm:px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-pink-500 focus:border-transparent text-sm sm:text-base"
          />
          <button
            type="submit"
            className="bg-gray-600 hover:bg-gray-700 text-white px-4 sm:px-6 py-2 rounded-md text-sm font-medium w-full sm:w-auto"
          >
            {t("common.search")}
          </button>
        </div>
      </form>

      {/* Users Table */}
      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        {isLoading ? (
          <div className="p-8 text-center">
            <div className="flex justify-center items-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pink-600"></div>
              <span className="ml-3 text-gray-500">{t("admin.loading")}</span>
            </div>
          </div>
        ) : users.length === 0 ? (
          <div className="p-8 text-center">
            <div className="text-gray-500 text-lg mb-4">
              {t("admin.noUsersYet")}
            </div>
            <button
              onClick={() => setShowCreateForm(true)}
              className="bg-pink-600 hover:bg-pink-700 text-white px-6 py-2 rounded-md text-sm font-medium"
            >
              {t("admin.createUser")}
            </button>
          </div>
        ) : (
          <>
            {/* Mobile Card View */}
            <div className="block sm:hidden">
              {users.map((user) => (
                <div key={user.id} className="border-b border-gray-200 p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-gray-900 truncate">
                        {user.firstName} {user.lastName}
                      </div>
                      <div className="text-sm text-gray-500 truncate">
                        {user.email}
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                        {getRoleDisplayName(user.role)}
                      </span>
                      <button
                        onClick={() => handleToggleStatus(user.id, user.isActive || false)}
                        disabled={toggleStatusMutation.isPending}
                        className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full cursor-pointer transition-all duration-200 ${
                          user.isActive
                            ? "bg-green-100 text-green-800 hover:bg-green-200"
                            : "bg-red-100 text-red-800 hover:bg-red-200"
                        } disabled:opacity-50 disabled:cursor-not-allowed`}
                        title={user.isActive ? t("admin.deactivateUser") : t("admin.activateUser")}
                      >
                        {user.isActive
                          ? t("admin.active")
                          : t("admin.inactive")}
                      </button>
                    </div>
                  </div>
                  <div className="mt-2 flex items-center justify-between">
                    <div className="text-xs text-gray-500">
                      {user.schoolName || "-"}
                    </div>
                    <div className="text-xs text-gray-500">
                      {formatDate(user.createdAt)}
                    </div>
                  </div>
                  <div className="mt-3 flex space-x-2">
                    <button
                      onClick={() => handleEditUser(user)}
                      className="text-indigo-600 hover:text-indigo-900 text-sm"
                    >
                      {t("admin.edit")}
                    </button>
                    <button
                      onClick={() => handleDeleteUser(user.id)}
                      className="text-red-600 hover:text-red-900 text-sm"
                    >
                      {t("admin.delete")}
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop Table View */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t("auth.firstName")} / {t("auth.lastName")}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t("auth.email")}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t("auth.role")}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t("admin.school")}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t("admin.active")}
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
                  {users.map((user) => (
                    <tr key={user.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {user.firstName} {user.lastName}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {user.email}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                          {getRoleDisplayName(user.role)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {user.schoolName || "-"}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <button
                          onClick={() => handleToggleStatus(user.id, user.isActive || false)}
                          disabled={toggleStatusMutation.isPending}
                          className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full cursor-pointer transition-all duration-200 ${
                            user.isActive
                              ? "bg-green-100 text-green-800 hover:bg-green-200"
                              : "bg-red-100 text-red-800 hover:bg-red-200"
                          } disabled:opacity-50 disabled:cursor-not-allowed`}
                          title={user.isActive ? t("admin.deactivateUser") : t("admin.activateUser")}
                        >
                          {user.isActive
                            ? t("admin.active")
                            : t("admin.inactive")}
                        </button>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(user.createdAt)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleEditUser(user)}
                            className="text-indigo-600 hover:text-indigo-900"
                          >
                            {t("admin.edit")}
                          </button>
                          {user.role === "INSTRUCTOR" && (
                            <button
                              onClick={() =>
                                handleManageInstructorSchools(user)
                              }
                              className="text-blue-600 hover:text-blue-900"
                              title={t("admin.manageSchoolAssignments")}
                            >
                              {t("admin.schools")}
                            </button>
                          )}
                          <button
                            onClick={() => handleDeleteUser(user.id)}
                            className="text-red-600 hover:text-red-900"
                          >
                            {t("admin.delete")}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {pagination.totalPages > 1 && (
              <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
                <div className="flex-1 flex justify-between sm:hidden">
                  <button
                    onClick={() => handlePageChange(pagination.page - 1)}
                    disabled={pagination.page === 1}
                    className="relative inline-flex items-center px-3 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {t("common.previous")}
                  </button>
                  <span className="flex items-center text-sm text-gray-700">
                    {t("admin.page")} {pagination.page} {t("admin.of")}{" "}
                    {pagination.totalPages}
                  </span>
                  <button
                    onClick={() => handlePageChange(pagination.page + 1)}
                    disabled={pagination.page === pagination.totalPages}
                    className="relative inline-flex items-center px-3 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {t("common.next")}
                  </button>
                </div>
                <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm text-gray-700">
                      {t("admin.showing")}{" "}
                      <span className="font-medium">
                        {(pagination.page - 1) * pagination.limit + 1}
                      </span>{" "}
                      {t("admin.to")}{" "}
                      <span className="font-medium">
                        {Math.min(
                          pagination.page * pagination.limit,
                          pagination.total,
                        )}
                      </span>{" "}
                      {t("admin.of")}{" "}
                      <span className="font-medium">{pagination.total}</span>{" "}
                      {t("admin.results")}
                    </p>
                  </div>
                  <div>
                    <nav
                      className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px"
                      aria-label="Pagination"
                    >
                      <button
                        onClick={() => handlePageChange(pagination.page - 1)}
                        disabled={pagination.page === 1}
                        className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {t("common.previous")}
                      </button>
                      {Array.from(
                        { length: pagination.totalPages },
                        (_, i) => i + 1,
                      ).map((page) => (
                        <button
                          key={page}
                          onClick={() => handlePageChange(page)}
                          className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                            page === pagination.page
                              ? "z-10 bg-pink-50 border-pink-500 text-pink-600"
                              : "bg-white border-gray-300 text-gray-500 hover:bg-gray-50"
                          }`}
                        >
                          {page}
                        </button>
                      ))}
                      <button
                        onClick={() => handlePageChange(pagination.page + 1)}
                        disabled={pagination.page === pagination.totalPages}
                        className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {t("common.next")}
                      </button>
                    </nav>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Create User Modal */}
      {showCreateForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center p-4">
          <div className="relative bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-semibold text-gray-900">
                  {editingUser ? t("admin.editUser") : t("admin.createUser")}
                </h3>
                <button
                  onClick={() => {
                    setShowCreateForm(false);
                    setEditingUser(null);
                    setFormData({
                      firstName: "",
                      lastName: "",
                      email: "",
                      password: "",
                      role: "USER",
                      schoolId: "",
                    });
                  }}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <svg
                    className="w-6 h-6"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>
            </div>
            <div className="px-6 py-6">
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t("admin.firstName")}
                    </label>
                    <input
                      type="text"
                      name="firstName"
                      value={formData.firstName}
                      onChange={handleInputChange}
                      required
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-pink-500 transition-colors"
                      placeholder="Enter first name"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t("admin.lastName")}
                    </label>
                    <input
                      type="text"
                      name="lastName"
                      value={formData.lastName}
                      onChange={handleInputChange}
                      required
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-pink-500 transition-colors"
                      placeholder="Enter last name"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t("admin.email")}
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-pink-500 transition-colors"
                    placeholder="Enter email address"
                  />
                </div>
                {!editingUser && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t("admin.password")}
                    </label>
                    <input
                      type="password"
                      name="password"
                      value={formData.password}
                      onChange={handleInputChange}
                      required
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-pink-500 transition-colors"
                      placeholder="Enter password"
                    />
                  </div>
                )}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {!editingUser && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        {t("admin.role")}
                      </label>
                      <select
                        name="role"
                        value={formData.role}
                        onChange={handleInputChange}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-pink-500 transition-colors"
                      >
                        <option value="USER">{t("admin.user")}</option>
                        <option value="INSTRUCTOR">
                          {t("admin.instructor")}
                        </option>
                        <option value="SCHOOL_ADMIN">
                          {t("admin.schoolAdmin")}
                        </option>
                        <option value="SUPER_ADMIN">
                          {t("admin.superAdmin")}
                        </option>
                      </select>
                    </div>
                  )}
                  {(() => {
                    const currentRole = editingUser?.role || formData.role;
                    return (currentRole === "USER" || currentRole === "SCHOOL_ADMIN") && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          {t("admin.school")}
                        </label>
                        <select
                          name="schoolId"
                          value={formData.schoolId}
                          onChange={handleInputChange}
                          className="w-full appearance-none pr-10 bg-[right_0.75rem_center] bg-no-repeat bg-[length:16px_16px] px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-pink-500 transition-colors"
                          required={currentRole === "SCHOOL_ADMIN"}
                          style={{
                            backgroundImage:
                              "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='16' height='16' fill='none' viewBox='0 0 24 24' stroke='%236b7280' stroke-width='2'><path stroke-linecap='round' stroke-linejoin='round' d='M19 9l-7 7-7-7'/></svg>\")",
                          }}
                        >
                          <option value="">
                            {schools.length === 0
                              ? t("admin.noSchoolsAvailable")
                              : t("admin.selectSchool")}
                          </option>
                          {schools.map((school) => (
                            <option key={school.id} value={school.id}>
                              {school.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    );
                  })()}
                  {(() => {
                    const currentRole = editingUser?.role || formData.role;
                    return currentRole === "INSTRUCTOR" && (
                    <div className="col-span-2">
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <div className="flex items-center">
                          <div className="flex-shrink-0">
                            <svg
                              className="h-5 w-5 text-blue-400"
                              viewBox="0 0 20 20"
                              fill="currentColor"
                            >
                              <path
                                fillRule="evenodd"
                                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                                clipRule="evenodd"
                              />
                            </svg>
                          </div>
                          <div className="ml-3">
                            <p className="text-sm text-blue-800">
                              <strong>{t("admin.instructorNote")}:</strong>{" "}
                              {t("admin.instructorSchoolNote")}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                    );
                  })()}
                </div>
                <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200">
                  <button
                    type="button"
                    onClick={() => {
                      setShowCreateForm(false);
                      setEditingUser(null);
                      setFormData({
                        firstName: "",
                        lastName: "",
                        email: "",
                        password: "",
                        role: "USER",
                        schoolId: "",
                      });
                    }}
                    className="px-6 py-3 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 transition-colors"
                  >
                    {t("admin.cancel")}
                  </button>
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="px-6 py-3 text-sm font-medium text-white bg-pink-600 hover:bg-pink-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {isLoading
                      ? t("admin.loading")
                      : editingUser
                      ? t("admin.update")
                      : t("admin.create")}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Instructor School Assignments Modal */}
      {selectedInstructor && (
        <InstructorSchoolAssignments
          instructorId={selectedInstructor.id}
          instructorName={`${selectedInstructor.firstName} ${selectedInstructor.lastName}`}
          isOpen={showInstructorAssignments}
          onClose={() => {
            setShowInstructorAssignments(false);
            setSelectedInstructor(null);
          }}
          onAssignmentChange={() => {
            queryClient.invalidateQueries({ queryKey: ['users'] });
          }}
        />
      )}
    </div>
  );
};

export default UserManagement;
