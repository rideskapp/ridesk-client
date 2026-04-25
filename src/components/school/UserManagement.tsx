/**
 * @fileoverview School User Management Component
 * @description User management interface for school admins
 * @author Ridesk Team
 * @version 1.0.0
 */

import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { useErrorTranslation } from "../../hooks/useErrorTranslation";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "react-hot-toast";
import {
  Plus,
  Search,
  Edit,
  Trash2,
  Users,
  Mail,
} from "lucide-react";
import { authApi } from "../../services/auth";
import { invitationsApi, UserInvitation } from "../../services/invitations";
import { User as UserType } from "../../store/auth";
import { UserForm } from "./UserForm";

export const SchoolUserManagement: React.FC = () => {
  const { t } = useTranslation();
  const { getTranslatedError } = useErrorTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // State management
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingUser, setEditingUser] = useState<UserType | null>(null);
  const [deletingUser, setDeletingUser] = useState<string | null>(null);
  const [userInvitations, setUserInvitations] = useState<Record<string, UserInvitation>>({});
  const [resendingInvites, setResendingInvites] = useState<Record<string, boolean>>({});

  const pageSize = 10;

  // Fetch users for the school
  const {
    data: usersData,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["schoolUsers", currentPage, searchTerm],
    queryFn: () => authApi.getUsers(currentPage, pageSize, searchTerm),
    placeholderData: (previousData) => previousData,
    retry: 1,
    retryDelay: 1000,
  });

  // Create user mutation
  const createUserMutation = useMutation({
    mutationFn: authApi.register,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["schoolUsers"] });
      setShowCreateForm(false);
      setEditingUser(null);
      toast.success(t("users.userCreated"));
    },
    onError: (error: any) => {
      toast.error(getTranslatedError(error) || t("users.userCreateFailed"));
    },
  });

  // Create invitation mutation
  const createInvitationMutation = useMutation({
    mutationFn: invitationsApi.createInvitation,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["schoolUsers"] });
      setShowCreateForm(false);
      setEditingUser(null);
      toast.success(t("invitations.invitationCreated"));
    },
    onError: (error: any) => {
      toast.error(getTranslatedError(error) || t("invitations.invitationCreateFailed"));
    },
  });

  // Update user mutation
  const updateUserMutation = useMutation({
    mutationFn: ({ userId, userData }: { userId: string; userData: any }) =>
      authApi.updateUser(userId, userData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["schoolUsers"] });
      setEditingUser(null);
      toast.success(t("users.userUpdated"));
    },
    onError: (error: any) => {
      toast.error(getTranslatedError(error) || t("users.userUpdateFailed"));
    },
  });

  // Delete user mutation
  const deleteUserMutation = useMutation({
    mutationFn: authApi.deleteUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["schoolUsers"] });
      toast.success(t("users.userDeleted"));
      setDeletingUser(null);
    },
    onError: (error: any) => {
      toast.error(getTranslatedError(error) || t("users.userDeleteFailed"));
      setDeletingUser(null);
    },
  });

  // Toggle user status mutation
  const toggleStatusMutation = useMutation({
    mutationFn: ({ userId, isActive }: { userId: string; isActive: boolean }) =>
      authApi.updateUser(userId, { isActive }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["schoolUsers"] });
      toast.success(t("users.statusUpdated"));
    },
    onError: (error: any) => {
      toast.error(getTranslatedError(error) || t("users.statusUpdateFailed"));
    },
  });

  // Handlers
  const handleCreateUser = async (userData: any, isInvite = false) => {
    const payload = { ...userData };

    // Default instructors and students to active when manually creating
    if (!isInvite && (payload.role === 'INSTRUCTOR' || payload.role === 'USER')) {
      payload.isActive = true;
    }

    if (isInvite) {
      createInvitationMutation.mutate(payload);
    } else {
      createUserMutation.mutate(payload);
    }
  };

  const handleUpdateUser = async (userId: string, userData: any) => {
    updateUserMutation.mutate({ userId, userData });
  };

  const handleDeleteUser = async (userId: string) => {
    if (window.confirm(t("users.confirmDelete"))) {
      setDeletingUser(userId);
      deleteUserMutation.mutate(userId);
    }
  };

  const handleToggleStatus = async (userId: string, currentStatus: boolean) => {
    // If trying to activate an inactive user who has an invitation, check if they accepted
    // But backend should handle this generally. Here we just toggle.
    toggleStatusMutation.mutate({ userId, isActive: !currentStatus });
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const getRoleDisplayName = (role: string) => {
    switch (role) {
      case "SCHOOL_ADMIN":
        return t("roles.schoolAdmin");
      case "INSTRUCTOR":
        return t("roles.instructor");
      case "USER":
        return t("roles.user");
      default:
        return role;
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case "SCHOOL_ADMIN":
        return "bg-purple-100 text-purple-800";
      case "INSTRUCTOR":
        return "bg-blue-100 text-blue-800";
      case "USER":
        return "bg-green-100 text-green-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  React.useEffect(() => {
    let isMounted = true;

    const fetchInvitations = async () => {
      if (!usersData?.users || usersData.users.length === 0) return;

      const inactiveUsers = usersData.users.filter(user => !user.isActive);
      const invitationsMap: Record<string, UserInvitation> = {};

      await Promise.all(
        inactiveUsers.map(async (user) => {
          try {
            const response = await invitationsApi.getInvitationByUserId(user.id);
            if (response.success && response.data) {
              invitationsMap[user.id] = response.data;
            }
          } catch (error) {
            // Silently fail if no invitation found or error
            // console.error(`Failed to fetch invitation for user ${user.id}:`, error);
          }
        })
      );

      if (isMounted) {
        setUserInvitations(invitationsMap);
      }
    };

    fetchInvitations();

    return () => {
      isMounted = false;
    };
  }, [usersData?.users]);

  const handleResendInvite = async (userId: string, invitationId: string) => {
    setResendingInvites(prev => ({ ...prev, [userId]: true }));
    try {
      await invitationsApi.resendInvitation(invitationId);
      toast.success(t("invitations.resendSuccess"));

      const response = await invitationsApi.getInvitationByUserId(userId);
      if (response.success && response.data) {
        setUserInvitations(prev => ({ ...prev, [userId]: response.data! }));
      }
    } catch (error: any) {
      toast.error(getTranslatedError(error) || t("invitations.resendFailed"));
    } finally {
      setResendingInvites(prev => ({ ...prev, [userId]: false }));
    }
  };

  if (error) {
    // Only show create school button for school association errors
    if (error.message?.includes("not associated with any school") ||
      error.message?.includes("User not associated with any school")) {
      return (
        <div className="flex items-center justify-center h-64">
          <div className="text-center max-w-md">
            <div className="text-orange-500 text-lg mb-2">{t("school.createSchoolFirst")}</div>
            <div className="text-gray-600 mb-4">
              {t("school.createSchoolFirstMessage", { action: t("school.manageUsers") })}
            </div>
            <button
              onClick={() => navigate('/school')}
              className="inline-flex items-center px-4 py-2 bg-pink-600 text-white rounded-lg hover:bg-pink-700 transition-colors"
            >
              <Plus className="w-4 h-4 mr-2" />
              {t("school.createSchool")}
            </button>
          </div>
        </div>
      );
    }

    // For other errors, show a generic error message
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center max-w-md">
          <div className="text-red-500 text-lg mb-2">{t("users.loadError", { defaultValue: "Error Loading Users" })}</div>
          <div className="text-gray-600 mb-4">
            {error.message || t("users.loadErrorDescription", { defaultValue: "An error occurred while loading users. Please try again." })}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            {t("users.title")}
          </h2>
          <p className="text-gray-600 mt-1">{t("users.description")}</p>
        </div>
        <button
          onClick={() => setShowCreateForm(true)}
          disabled={createUserMutation.isPending || createInvitationMutation.isPending}
          className="bg-pink-600 hover:bg-pink-700 disabled:bg-pink-400 text-white px-4 py-2 rounded-md text-sm font-medium flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          {t("users.createUser")}
        </button>
      </div>

      {/* Search Bar */}
      <form onSubmit={handleSearch} className="flex gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder={t("users.searchUsers")}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-pink-500 focus:border-transparent"
          />
        </div>
        <button
          type="submit"
          className="bg-gray-600 hover:bg-gray-700 text-white px-6 py-2 rounded-md text-sm font-medium"
        >
          {t("common.search")}
        </button>
      </form>

      {/* Users Table */}
      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        {isLoading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pink-600 mx-auto"></div>
            <p className="mt-2 text-gray-500">{t("common.loading")}</p>
          </div>
        ) : usersData?.users.length === 0 ? (
          <div className="text-center py-12">
            <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {t("users.noUsers")}
            </h3>
            <p className="text-gray-500 mb-4">
              {t("users.noUsersDescription")}
            </p>
            <button
              onClick={() => setShowCreateForm(true)}
              className="bg-pink-600 hover:bg-pink-700 text-white px-4 py-2 rounded-md text-sm font-medium"
            >
              {t("users.createFirstUser")}
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t("users.user")}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t("users.role")}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t("users.status")}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t("users.createdAt")}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t("common.actions")}
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {usersData?.users.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10">
                          <div className="h-10 w-10 rounded-full bg-pink-100 flex items-center justify-center">
                            <span className="text-pink-600 font-medium text-sm">
                              {user.firstName[0]}
                              {user.lastName[0]}
                            </span>
                          </div>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">
                            {user.firstName} {user.lastName}
                          </div>
                          <div className="text-sm text-gray-500 flex items-center">
                            <Mail className="h-3 w-3 mr-1" />
                            {user.email}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getRoleColor(
                          user.role,
                        )}`}
                      >
                        {getRoleDisplayName(user.role)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => handleToggleStatus(user.id, user.isActive || false)}
                        disabled={toggleStatusMutation.isPending}
                        className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full cursor-pointer transition-all duration-200 ${user.isActive
                          ? "bg-green-100 text-green-800 hover:bg-green-200"
                          : "bg-red-100 text-red-800 hover:bg-red-200"
                          } disabled:opacity-50 disabled:cursor-not-allowed`}
                        aria-label={user.isActive ? t("users.deactivateUser") : t("users.activateUser")}
                        title={user.isActive ? t("users.deactivateUser") : t("users.activateUser")}
                      >
                        {user.isActive
                          ? t("users.active")
                          : t("users.inactive")}
                      </button>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(user.createdAt)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => setEditingUser(user)}
                          className="text-pink-600 hover:text-pink-900"
                          title={t("users.editUser")}
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        {!user.isActive && userInvitations[user.id] && (
                          <button
                            type="button"
                            onClick={() => handleResendInvite(user.id, userInvitations[user.id].id)}
                            disabled={resendingInvites[user.id]}
                            className="text-pink-600 hover:text-pink-900 disabled:opacity-50 disabled:cursor-not-allowed"
                            title={t("invitations.resendInviteTooltip")}
                          >
                            {resendingInvites[user.id] ? (
                              <div className="animate-spin h-4 w-4 border-2 border-pink-600 border-t-transparent rounded-full"></div>
                            ) : (
                              <Mail className="h-4 w-4" />
                            )}
                          </button>
                        )}
                        {user.role !== "SCHOOL_ADMIN" && (
                          <button
                            onClick={() => handleDeleteUser(user.id)}
                            disabled={deletingUser === user.id}
                            className="text-red-600 hover:text-red-900 disabled:text-red-400"
                            title={t("users.deleteUser")}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {usersData && usersData.pagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-700">
            {t("common.showing")} {(currentPage - 1) * pageSize + 1}{" "}
            {t("common.to")}{" "}
            {Math.min(currentPage * pageSize, usersData.pagination.total)}{" "}
            {t("common.of")} {usersData.pagination.total} {t("common.results")}
          </div>
          <div className="flex space-x-2">
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="px-3 py-1 text-sm border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              {t("common.previous")}
            </button>
            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === usersData.pagination.totalPages}
              className="px-3 py-1 text-sm border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              {t("common.next")}
            </button>
          </div>
        </div>
      )}

      {/* User Form Modal */}
      {(showCreateForm || editingUser) && (
        <UserForm
          user={editingUser}
          onSubmit={
            editingUser
              ? (userData) => handleUpdateUser(editingUser.id, userData)
              : handleCreateUser
          }
          onCancel={() => {
            setShowCreateForm(false);
            setEditingUser(null);
          }}
          isLoading={
            createUserMutation.isPending ||
            updateUserMutation.isPending ||
            createInvitationMutation.isPending
          }
        />
      )}
    </div>
  );
};
