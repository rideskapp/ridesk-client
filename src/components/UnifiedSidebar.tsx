import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useLocation, Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Menu,
  X,
  User,
  LogOut,
  Settings,
  Users,
  Building2,
  Calendar,
  GraduationCap,
  CreditCard,
  CalendarCheck,
  DollarSign,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/store/auth";
import { useSchoolSelectionStore } from "@/store/schoolSelection";
import Logo from "@/components/Logo";
import { UserRole, ALL_SCHOOLS_ID } from "@/types";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuItem,
} from "./ui/dropdown-menu";
import { DropdownMenuLabel } from "@radix-ui/react-dropdown-menu";
import { useGetDeploymentInfo } from "@/hooks/useGetDeploymentInfo";
import { useCompensationMode } from "@/hooks/useCompensationMode";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { schoolsApi } from "@/services/schools";
import { api } from "@/lib/api";
import { getInitialsFromSchoolName } from "@/utils/initials";

interface UnifiedSidebarProps {
  children: React.ReactNode;
  onLogout?: () => void;
}

const UnifiedSidebar: React.FC<UnifiedSidebarProps> = ({
  children,
  onLogout,
}) => {
  const { t } = useTranslation();
  const { user, logout } = useAuthStore();
  const {
    selectedSchoolId,
    setSelectedSchoolId,
    clearSelectedSchool,
    instructorSelectedSchoolId,
    setInstructorSelectedSchoolId,
  } = useSchoolSelectionStore();
  const versionInfo = useGetDeploymentInfo();
  const queryClient = useQueryClient();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const { isEnabled: isCompensationEnabled } = useCompensationMode();

  const { data: schools = [], isLoading: loadingSchools } = useQuery({
    queryKey: ["schools", 1, 100],
    queryFn: () => schoolsApi.getAll(1, 100),
    enabled: user?.role === UserRole.SUPER_ADMIN,
    staleTime: 120000,
  });

  // Fetch selected school data for avatar
  const { data: selectedSchool } = useQuery({
    queryKey: ["school", selectedSchoolId],
    queryFn: () => schoolsApi.getById(selectedSchoolId!),
    enabled: !!selectedSchoolId && user?.role === UserRole.SUPER_ADMIN,
    staleTime: 120000,
  });

  // Fetch instructor's schools (only for INSTRUCTOR role)
  const { data: instructorSchools = [], isLoading: loadingInstructorSchools } =
    useQuery({
      queryKey: ["instructor-schools", user?.id],
      queryFn: async () => {
        const response = await api.get(
          `/instructor-schools/instructor/${user?.id}`,
        );
        return (
          response.data.data as Array<{
            id: string;
            schoolId: string;
            schoolName: string;
            isPrimary: boolean;
            compensationMode?: "fixed" | "variable";
          }>
        ).map((school) => ({
          ...school,
          // Removed test-specific replacement as per review
          schoolName: school.schoolName,
        }));
      },
      enabled: user?.role === UserRole.INSTRUCTOR && !!user?.id,
      staleTime: 120000,
    });

  // Fetch school for SCHOOL_ADMIN to display name and logo
  const { data: userSchool } = useQuery({
    queryKey: ['school', 'by-user-id', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      return schoolsApi.getByUserId(user.id);
    },
    enabled: user?.role === UserRole.SCHOOL_ADMIN && !!user?.id,
    staleTime: 300000,
  });

  // Set default school to ALL_SCHOOLS_ID when instructor schools load
  useEffect(() => {
    if (
      user?.role === UserRole.INSTRUCTOR &&
      instructorSchools.length > 0 &&
      !instructorSelectedSchoolId
    ) {
      setInstructorSelectedSchoolId(ALL_SCHOOLS_ID);
    }
  }, [
    instructorSchools,
    user?.role,
    instructorSelectedSchoolId,
    setInstructorSelectedSchoolId,
  ]);

  // Memoize the selected instructor school name
  const selectedInstructorSchoolName = useMemo(
    () =>
      instructorSelectedSchoolId &&
        instructorSelectedSchoolId !== ALL_SCHOOLS_ID
        ? instructorSchools.find(
          (s) => s.schoolId === instructorSelectedSchoolId,
        )?.schoolName
        : t("admin.allSchools", { defaultValue: "All Schools" }),
    [instructorSelectedSchoolId, instructorSchools, t],
  );

  // Helper function to check if a route is current
  const isCurrentRoute = useCallback((href: string) => {
    if (href === "/instructor-calendar" && user?.role === UserRole.INSTRUCTOR) {
      return (
        location.pathname === href ||
        location.pathname.startsWith(href + "/") ||
        location.pathname.startsWith("/lessons/")
      );
    }
    if (
      href === "/instructor-availability" &&
      user?.role === UserRole.INSTRUCTOR
    ) {
      return (
        location.pathname === href || location.pathname.startsWith(href + "/")
      );
    }

    const searchParams = new URLSearchParams(location.search);
    const hasCreateParam = searchParams.get("create") === "true";

    if (href.includes("?create=true")) {
      const [path] = href.split("?");
      return location.pathname === path && hasCreateParam;
    }

    if (href === "/admin/school-profiles" && hasCreateParam) {
      return false;
    }

    return (
      location.pathname === href || location.pathname.startsWith(href + "/")
    );
  }, [location.pathname, location.search, user?.role]);

  // Determine if compensation tab should be hidden based on selected school's mode
  const isCompensationHidden = useMemo(() => {
    if (user?.role !== UserRole.INSTRUCTOR) return false;
    if (
      !instructorSelectedSchoolId ||
      instructorSelectedSchoolId === ALL_SCHOOLS_ID
    )
      return false;
    const school = instructorSchools.find(
      (s) => s.schoolId === instructorSelectedSchoolId,
    );
    return school?.compensationMode === "fixed";
  }, [user?.role, instructorSelectedSchoolId, instructorSchools]);

  // Define navigation based on user role
  const navigation = useMemo(() => {
    const createNavItem = (name: string, href: string, icon: any) => ({
      name,
      href,
      current: isCurrentRoute(href),
      icon,
    });

    const baseNavigation = [
      createNavItem(t("navigation.dashboard"), "/dashboard", User),
    ];

    switch (user?.role) {
      case UserRole.SUPER_ADMIN:
        return [
          ...baseNavigation,
          createNavItem(t("admin.userManagement"), "/admin/users", Users),
          createNavItem(
            t("admin.schools"),
            "/admin/school-profiles",
            Building2,
          ),
          createNavItem(t("navigation.lessonCalendar"), "/calendar", Calendar),
          createNavItem(t("navigation.instructors"), "/instructors", Users),
          createNavItem(t("navigation.students"), "/students", GraduationCap),
          createNavItem(
            t("bookings.title", { defaultValue: "Bookings" }),
            "/bookings",
            CalendarCheck,
          ),
          createNavItem(t("navigation.reporting"), "/reporting", CreditCard),
          createNavItem(
            t("navigation.instructorsCompensation", {
              defaultValue: "Instructors Compensation",
            }),
            "/compensations",
            DollarSign,
          ),
        ];

      case UserRole.SCHOOL_ADMIN:
        const schoolAdminNavigation = [
          ...baseNavigation,
          createNavItem(
            t("navigation.lessonCalendar", { defaultValue: "Lesson Calendar" }),
            "/calendar",
            Calendar,
          ),
          createNavItem(t("navigation.instructors"), "/instructors", Users),
          createNavItem(t("navigation.students"), "/students", GraduationCap),
          createNavItem(
            t("bookings.title", { defaultValue: "Bookings" }),
            "/bookings",
            CalendarCheck,
          ),
          createNavItem(t("navigation.reporting"), "/reporting", CreditCard),
        ];

        if (isCompensationEnabled) {
          schoolAdminNavigation.push(
            createNavItem(
              t("navigation.instructorsCompensation", {
                defaultValue: "Instructors Compensation",
              }),
              "/compensations",
              DollarSign,
            ),
          );
        }

        return schoolAdminNavigation;

      case UserRole.INSTRUCTOR:
        const instructorNav = [
          ...baseNavigation,
          createNavItem(
            t("navigation.lessonCalendar"),
            "/instructor-calendar",
            Calendar,
          ),
        ];

        if (!isCompensationHidden) {
          instructorNav.push(
            createNavItem(
              t("compensation.title", { defaultValue: "Compensations" }),
              "/compensations",
              DollarSign,
            ),
          );
        }

        return instructorNav;

      case UserRole.USER:
      default:
        return [
          ...baseNavigation,
          createNavItem(t("navigation.calendar"), "/calendar", Calendar),
          createNavItem(t("navigation.lessons"), "/lessons", Calendar),
          createNavItem(t("navigation.reporting"), "/reporting", CreditCard),
          createNavItem(t("navigation.settings"), "/settings", Settings),
        ];
    }
  }, [user?.role, t, isCurrentRoute, isCompensationEnabled, isCompensationHidden]);



  useEffect(() => {
    const handleSchoolCreated = () => {
      queryClient.invalidateQueries({ queryKey: ["schools"] });
    };

    window.addEventListener("schoolCreated", handleSchoolCreated);
    return () => {
      window.removeEventListener("schoolCreated", handleSchoolCreated);
    };
  }, [queryClient]);

  const handleLogout = () => {
    if (onLogout) {
      onLogout();
    } else {
      logout();
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile sidebar */}
      <div
        className={`fixed inset-0 ${sidebarOpen ? "z-[9999]" : "z-0"
          } lg:hidden pointer-events-none`}
      >
        <div
          className={`fixed inset-0 bg-gray-600 bg-opacity-75 transition-opacity duration-300 ease-in-out ${sidebarOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
            }`}
          onClick={() => setSidebarOpen(false)}
        />
        <div
          className={`relative flex w-full max-w-xs h-full flex-col bg-white transform transition-transform duration-300 ease-in-out ${sidebarOpen ? "translate-x-0 pointer-events-auto" : "-translate-x-full pointer-events-none"
            }`}
        >
          <div className="flex flex-shrink-0 items-center justify-between px-4 py-4 border-b border-gray-200">
            <Logo />
            <button
              type="button"
              className="flex h-8 w-8 items-center justify-center rounded-md text-gray-500 hover:text-gray-900 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-pink-500"
              onClick={() => setSidebarOpen(false)}
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto flex flex-col">
            <nav className="space-y-1 px-2 flex-1">
              {navigation.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    onClick={() => setSidebarOpen(false)}
                    className={`${item.current
                      ? "bg-pink-600 text-white rounded-full"
                      : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                      } group flex items-center px-2 py-2 text-base font-medium rounded-md relative`}
                  >
                    <Icon className="mr-3 h-5 w-5 flex-shrink-0" />
                    {item.name}
                    {item.current && (
                      <span className="absolute right-2 h-2 w-2 bg-white rounded-full animate-blink"></span>
                    )}
                  </Link>
                );
              })}
            </nav>
            {versionInfo && (
              <div className="px-4 py-2 mt-auto text-xs text-gray-500 flex flex-col space-y-1 border-t border-gray-200 pt-2">
                <p>Commit: {versionInfo.commit}</p>
                <p>
                  Build Date: {new Date(versionInfo.buildDate).toLocaleString()}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Desktop sidebar */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-64 lg:flex-col">
        <div className="flex min-h-0 flex-1 flex-col bg-white shadow">
          <div className="flex flex-1 flex-col overflow-y-auto pt-5 pb-4">
            <div className="flex flex-shrink-0 items-center px-4">
              <Logo />
            </div>
            <nav className="mt-5 flex-1 space-y-1 px-2">
              {navigation.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    className={`${item.current
                      ? "bg-pink-600 text-white rounded-full"
                      : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                      } group flex items-center px-2 py-2 text-sm font-medium rounded-md relative`}
                  >
                    <Icon className="mr-3 h-5 w-5 flex-shrink-0" />
                    {item.name}
                    {item.current && (
                      <span className="absolute right-2 h-2 w-2 bg-white rounded-full animate-blink"></span>
                    )}
                  </Link>
                );
              })}
            </nav>
            {versionInfo && (
              <div className="px-4 py-2 text-xs text-gray-500 flex items-center flex-col">
                <p>Commit: {versionInfo.commit}</p>
                <p>
                  Build Date: {new Date(versionInfo.buildDate).toLocaleString()}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="lg:pl-64 flex flex-col flex-1">
        {/* Top bar */}
        <div className="sticky top-0 z-40 flex-shrink-0 flex h-14 sm:h-16 bg-white shadow">
          <button
            type="button"
            className="px-3 sm:px-4 border-r border-gray-200 text-gray-500 focus:outline-none focus:ring-0 focus:ring-offset-0 lg:hidden relative z-[100]"
            onClick={() => setSidebarOpen(true)}
          >
            <span className="sr-only">
              {t("common.openSidebar", { defaultValue: "Open sidebar" })}
            </span>
            <Menu className="h-5 w-5 sm:h-6 sm:w-6" />
          </button>
          <div className="flex-1 px-2 sm:px-4 flex justify-between items-center">
            <div className="flex-1 flex">
              <div className="w-full flex md:ml-0">
                <div className="relative w-full text-gray-400 focus-within:text-gray-600">
                  <div className="absolute inset-y-0 left-0 flex items-center pointer-events-none">
                    <span className="hidden md:block text-sm font-medium text-gray-900">
                      {t("auth.welcome")}, {user?.role === UserRole.SCHOOL_ADMIN && userSchool ? userSchool.name : `${user?.firstName} ${user?.lastName}`}
                    </span>
                  </div>
                </div>
              </div>
            </div>
            <div className="ml-2 sm:ml-4 flex items-center md:ml-6 gap-2 sm:gap-3">
              {user?.role === UserRole.SUPER_ADMIN && (
                <Select
                  value={selectedSchoolId || "__all__"}
                  onValueChange={(value) => {
                    if (value === "__all__") {
                      clearSelectedSchool();
                    } else {
                      setSelectedSchoolId(value);
                    }
                  }}
                >
                  <SelectTrigger className="w-[140px] sm:w-[200px] focus:ring-0 focus:ring-offset-0">
                    <SelectValue
                      placeholder={t("admin.selectSchool", {
                        defaultValue: "Select School",
                      })}
                    />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">
                      <span className="truncate block max-w-[200px]">
                        {t("admin.allSchools", { defaultValue: "All Schools" })}
                      </span>
                    </SelectItem>
                    {loadingSchools ? (
                      <SelectItem value="__loading__" disabled>
                        {t("common.loading", { defaultValue: "Loading..." })}
                      </SelectItem>
                    ) : (
                      schools.map((school) => (
                        <SelectItem key={school.id} value={school.id}>
                          <span className="truncate block max-w-[200px]">
                            {school.name}
                          </span>
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              )}

              {user?.role === UserRole.INSTRUCTOR &&
                instructorSchools.length > 1 && (
                  <Select
                    value={instructorSelectedSchoolId || ALL_SCHOOLS_ID}
                    onValueChange={(value) => {
                      // Prevent selecting fixed compensation schools when on compensation page
                      const isOnCompensationPage =
                        location.pathname === "/compensations";
                      if (isOnCompensationPage && value !== ALL_SCHOOLS_ID) {
                        const selectedSchool = instructorSchools.find(
                          (s) => s.schoolId === value,
                        );
                        if (selectedSchool?.compensationMode === "fixed") {
                          return; // Don't allow selection
                        }
                      }
                      setInstructorSelectedSchoolId(value);
                    }}
                  >
                    <SelectTrigger className="w-[140px] sm:w-[200px] focus:ring-0 focus:ring-offset-0">
                      <div className="flex items-center gap-2 w-full overflow-hidden">
                        <Building2 className="h-4 w-4 text-gray-600 flex-shrink-0" />
                        <span className="text-sm truncate text-left flex-1 min-w-0">
                          {selectedInstructorSchoolName}
                        </span>
                      </div>
                    </SelectTrigger>
                    <SelectContent>
                      {loadingInstructorSchools ? (
                        <SelectItem value="__loading__" disabled>
                          {t("common.loading", { defaultValue: "Loading..." })}
                        </SelectItem>
                      ) : (
                        <>
                          <SelectItem value={ALL_SCHOOLS_ID}>
                            <span className="truncate block max-w-[200px]">
                              {t("admin.allSchools", {
                                defaultValue: "All Schools",
                              })}
                            </span>
                          </SelectItem>
                          {instructorSchools.map((school) => {
                            const isOnCompensationPage =
                              location.pathname === "/compensations";
                            const isFixedCompensation =
                              school.compensationMode === "fixed";
                            const isDisabled =
                              isOnCompensationPage && isFixedCompensation;

                            return (
                              <SelectItem
                                key={school.schoolId}
                                value={school.schoolId}
                                disabled={isDisabled}
                              >
                                <span className="truncate block max-w-[200px]">
                                  {school.schoolName}
                                  {isDisabled && (
                                    <span className="text-xs text-gray-400 ml-1">
                                      (
                                      {t("compensation.mode.fixed", {
                                        defaultValue: "Fixed",
                                      })}
                                      )
                                    </span>
                                  )}
                                </span>
                              </SelectItem>
                            );
                          })}
                        </>
                      )}
                    </SelectContent>
                  </Select>
                )}

              <div className="flex items-center gap-1 sm:gap-2">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="outline"
                      className="flex items-center gap-2 rounded-full pl-2 pr-1 py-1 h-auto border-gray-200 hover:shadow-md transition-all relative z-20 focus-visible:ring-0 focus-visible:ring-offset-0"
                    >
                      <Menu
                        size={16}
                        className="w-4 h-4 ml-1 text-gray-600 flex-shrink-0"
                      />
                      {user?.role === UserRole.SUPER_ADMIN ? (
                        selectedSchoolId ? (
                          <Avatar className="w-8 h-8 border flex-shrink-0">
                            <AvatarImage
                              src={selectedSchool?.logo}
                              alt="School Logo"
                              className="object-contain"
                              loading="lazy"
                            />
                            <AvatarFallback>
                              {getInitialsFromSchoolName(selectedSchool?.name)}
                            </AvatarFallback>
                          </Avatar>
                        ) : (
                          <Avatar className="w-8 h-8 border">
                            <AvatarImage
                              src="/ridesk-logo.png"
                              alt="Ridesk Logo"
                              className="object-contain"
                              loading="lazy"
                            />
                            <AvatarFallback>RK</AvatarFallback>
                          </Avatar>
                        )
                      ) : user?.role === UserRole.SCHOOL_ADMIN ? (
                        <Avatar className="w-8 h-8 border flex-shrink-0">
                          <AvatarImage src={userSchool?.logo} alt="School Logo" className="object-contain" loading="lazy" />
                          <AvatarFallback>
                            {getInitialsFromSchoolName(userSchool?.name || user?.schoolName)}
                          </AvatarFallback>
                        </Avatar>
                      ) : (
                        <Avatar className="w-8 h-8 border">
                          <AvatarImage
                            src={user?.avatar}
                            alt="Profile"
                            className="object-contain"
                            loading="lazy"
                          />
                          <AvatarFallback>
                            {user?.firstName?.[0] || ""}
                            {user?.lastName?.[0] || ""}
                            {!user?.firstName?.[0] && !user?.lastName?.[0] && (
                              <User className="h-4 w-4" />
                            )}
                          </AvatarFallback>
                        </Avatar>
                      )}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    className="mr-2 sm:mr-4 p-3 sm:p-4 pb-2 w-64 sm:w-72"
                    align="start"
                  >
                    <DropdownMenuLabel className="flex items-center space-x-2 border-b pb-3">
                      <User className="h-5 w-5 text-gray-400" />
                      <span className="text-sm text-gray-700">
                        {user?.role === UserRole.SUPER_ADMIN
                          ? t("admin.superAdmin")
                          : user?.role === UserRole.SCHOOL_ADMIN
                            ? t("admin.schoolAdmin")
                            : user?.role === UserRole.INSTRUCTOR
                              ? t("admin.instructor")
                              : t("admin.user")}
                      </span>
                    </DropdownMenuLabel>
                    {user?.role === UserRole.SUPER_ADMIN && (
                      <div className="space-y-1 border-b pb-3 mt-1">
                        {selectedSchoolId ? (
                          <>
                            <DropdownMenuItem asChild>
                              <Link
                                to={`/admin/school-profiles/${selectedSchoolId}`}
                                className="cursor-pointer"
                              >
                                {t("navigation.profile")}
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem asChild>
                              <Link
                                to={`/admin/system-configurations/${selectedSchoolId}`}
                                className="cursor-pointer"
                              >
                                {t("navigation.schoolSetup", {
                                  defaultValue: "School Setup",
                                })}
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem asChild>
                              <Link
                                to={`/admin/school-calendars/${selectedSchoolId}`}
                                className="cursor-pointer"
                              >
                                {t("navigation.openingDate", {
                                  defaultValue: "Opening Date",
                                })}
                              </Link>
                            </DropdownMenuItem>
                          </>
                        ) : (
                          <DropdownMenuItem asChild>
                            <Link
                              to="/admin/settings"
                              className="cursor-pointer"
                            >
                              {t("navigation.settings")}
                            </Link>
                          </DropdownMenuItem>
                        )}
                      </div>
                    )}
                    {user?.role === UserRole.SCHOOL_ADMIN && (
                      <div className="space-y-1 border-b pb-3 mt-1">
                        <DropdownMenuItem asChild>
                          <Link to="/school" className="cursor-pointer">
                            {t("navigation.profile")}
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link
                            to="/system-configurations"
                            className="cursor-pointer"
                          >
                            {t("navigation.schoolSetup")}
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link
                            to="/school-calendar"
                            className="cursor-pointer"
                          >
                            {t("navigation.openingDate")}
                          </Link>
                        </DropdownMenuItem>
                      </div>
                    )}
                    {user?.role === UserRole.INSTRUCTOR && (
                      <div className="space-y-1 border-b pb-3 mt-1">
                        <DropdownMenuItem asChild>
                          <Link
                            to="/instructor-profile"
                            className="cursor-pointer"
                          >
                            {t("navigation.profile")}
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link
                            to="/instructor-availability"
                            className="cursor-pointer"
                          >
                            {t("navigation.myAvailability")}
                          </Link>
                        </DropdownMenuItem>
                      </div>
                    )}
                    <DropdownMenuItem
                      className="flex items-center cursor-pointer mt-1"
                      onSelect={handleLogout}
                    >
                      <LogOut className="h-4 w-4 mr-2" />
                      <span>{t("auth.logout")}</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </div>
        </div>

        {/* Page content */}
        <main className="flex-1">
          <div className="py-4 sm:py-6">
            <div className="mx-auto max-w-7xl px-3 sm:px-4 lg:px-8">
              {children}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default UnifiedSidebar;
