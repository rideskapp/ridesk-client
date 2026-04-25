/**
 * @fileoverview Invitation Acceptance Page
 * @description Page for users to accept invitations and create accounts
 * @author Ridesk Team
 * @version 1.0.0
 */

import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { useErrorTranslation } from "@/hooks/useErrorTranslation";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { toast } from "react-hot-toast";
import {
  CheckCircle,
  XCircle,
  Mail,
  User,
  Building,
  Clock,
  Eye,
  EyeOff,
} from "lucide-react";
import {
  invitationsApi,
  InvitationValidationResponse,
} from "../services/invitations";

export const InvitationAcceptance: React.FC = () => {
  const { t } = useTranslation();
  const { getTranslatedError } = useErrorTranslation();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [isAccepting, setIsAccepting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const [formData, setFormData] = useState({
    password: "",
    confirmPassword: "",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const token = searchParams.get("token");

  const { data: invitationResponse, isLoading, error: queryError } = useQuery<InvitationValidationResponse>({
    queryKey: ['invitation-validation', token],
    queryFn: () => invitationsApi.validateInvitation(token!),
    enabled: !!token,
    staleTime: 300000,
    retry: false,
  });

  const invitationData = invitationResponse?.data || null;
  const error = !token 
    ? t("invitations.noToken") 
    : queryError 
      ? (queryError as any)?.response?.data?.message || t("invitations.invalidToken")
      : null;

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.password) {
      newErrors.password = t("invitations.validation.passwordRequired");
    } else if (formData.password.length < 6) {
      newErrors.password = t("invitations.validation.passwordMinLength");
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = t(
        "invitations.validation.confirmPasswordRequired",
      );
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = t(
        "invitations.validation.passwordsDoNotMatch",
      );
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleAcceptInvitation = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm() || !token) {
      return;
    }

    try {
      setIsAccepting(true);
      await invitationsApi.acceptInvitation({
        token,
        password: formData.password,
      });

      toast.success(t("invitations.invitationAccepted"));
      navigate("/login");
    } catch (error: any) {
      toast.error(getTranslatedError(error) || t("invitations.acceptanceFailed"));
    } finally {
      setIsAccepting(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">{t("invitations.validating")}</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
          <div className="text-red-600 mb-4">
            <XCircle className="h-16 w-16 mx-auto" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            {t("invitations.invalidInvitation")}
          </h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={() => navigate("/login")}
            className="bg-pink-600 hover:bg-pink-700 text-white px-6 py-2 rounded-md font-medium"
          >
            {t("invitations.goToLogin")}
          </button>
        </div>
      </div>
    );
  }

  if (!invitationData) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        {/* Header */}
        <div className="text-center">
          <div className="text-green-600 mb-4">
            <CheckCircle className="h-16 w-16 mx-auto" />
          </div>
          <h2 className="text-3xl font-bold text-gray-900">
            {t("invitations.welcomeToRidesk")}
          </h2>
          <p className="mt-2 text-gray-600">
            {t("invitations.invitationValid")}
          </p>
        </div>

        {/* Invitation Details */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            {t("invitations.invitationDetails")}
          </h3>

          <div className="space-y-4">
            <div className="flex items-center">
              <User className="h-5 w-5 text-gray-400 mr-3" />
              <div>
                <p className="text-sm font-medium text-gray-900">
                  {invitationData.firstName} {invitationData.lastName}
                </p>
                <p className="text-sm text-gray-500">{invitationData.email}</p>
              </div>
            </div>

            <div className="flex items-center">
              <Building className="h-5 w-5 text-gray-400 mr-3" />
              <div>
                <p className="text-sm font-medium text-gray-900">
                  {t("invitations.school")}
                </p>
                <p className="text-sm text-gray-500">
                  {invitationData.schoolName}
                </p>
              </div>
            </div>

            <div className="flex items-center">
              <Mail className="h-5 w-5 text-gray-400 mr-3" />
              <div>
                <p className="text-sm font-medium text-gray-900">
                  {t("invitations.role")}
                </p>
                <p className="text-sm text-gray-500">
                  {t(`roles.${invitationData.role}`)}
                </p>
              </div>
            </div>

            <div className="flex items-center">
              <Clock className="h-5 w-5 text-gray-400 mr-3" />
              <div>
                <p className="text-sm font-medium text-gray-900">
                  {t("invitations.expiresAt")}
                </p>
                <p className="text-sm text-gray-500">
                  {formatDate(invitationData.expiresAt)}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Account Creation Form */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            {t("invitations.createAccount")}
          </h3>

          <form onSubmit={handleAcceptInvitation} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t("invitations.password")} *
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={formData.password}
                  onChange={(e) =>
                    handleInputChange("password", e.target.value)
                  }
                  className={`w-full px-3 py-2 pr-10 border rounded-md focus:ring-2 focus:ring-pink-500 focus:border-transparent ${
                    errors.password ? "border-red-500" : "border-gray-300"
                  }`}
                  placeholder={t("invitations.passwordPlaceholder")}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
              {errors.password && (
                <p className="mt-1 text-sm text-red-600">{errors.password}</p>
              )}
              <p className="mt-1 text-sm text-gray-500">
                {t("invitations.passwordHelp")}
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t("invitations.confirmPassword")} *
              </label>
              <input
                type="password"
                value={formData.confirmPassword}
                onChange={(e) =>
                  handleInputChange("confirmPassword", e.target.value)
                }
                className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-pink-500 focus:border-transparent ${
                  errors.confirmPassword ? "border-red-500" : "border-gray-300"
                }`}
                placeholder={t("invitations.confirmPasswordPlaceholder")}
              />
              {errors.confirmPassword && (
                <p className="mt-1 text-sm text-red-600">
                  {errors.confirmPassword}
                </p>
              )}
            </div>

            <div className="pt-4">
              <button
                type="submit"
                disabled={isAccepting}
                className="w-full bg-pink-600 hover:bg-pink-700 disabled:bg-pink-400 text-white py-2 px-4 rounded-md font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-pink-500"
              >
                {isAccepting
                  ? t("invitations.accepting")
                  : t("invitations.acceptInvitation")}
              </button>
            </div>
          </form>
        </div>

        {/* Footer */}
        <div className="text-center">
          <p className="text-sm text-gray-500">
            {t("invitations.alreadyHaveAccount")}{" "}
            <button
              onClick={() => navigate("/login")}
              className="text-pink-600 hover:text-pink-700 font-medium"
            >
              {t("invitations.loginHere")}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};
