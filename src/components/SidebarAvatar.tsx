import React from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { User as UserIcon } from 'lucide-react';
import { User } from '@/store/auth';
import { UserRole } from '@/types';
import { getInitialsFromName, getInitialsFromSchoolName } from '@/utils/initials';

interface School {
    id: string;
    name: string;
    logo?: string;
}

interface SidebarAvatarProps {
    user: User | null;
    selectedSchool?: School | null;
    selectedSchoolId?: string | null;
}

export const SidebarAvatar: React.FC<SidebarAvatarProps> = ({
    user,
    selectedSchool,
    selectedSchoolId,
}) => {
    // Handle null user case
    if (!user) {
        return (
            <Avatar className="w-8 h-8 border">
                <AvatarFallback>
                    <UserIcon className="h-4 w-4" />
                </AvatarFallback>
            </Avatar>
        );
    }

    // Super Admin with a selected school
    if (user.role === UserRole.SUPER_ADMIN && selectedSchoolId) {
        return (
            <Avatar className="w-8 h-8 border">
                <AvatarImage src={selectedSchool?.logo} alt="School Logo" className="object-contain" />
                <AvatarFallback>
                    {getInitialsFromSchoolName(selectedSchool?.name)}
                </AvatarFallback>
            </Avatar>
        );
    }

    // Super Admin without a selected school (all schools view)
    if (user.role === UserRole.SUPER_ADMIN) {
        return (
            <Avatar className="w-8 h-8 border">
                <AvatarImage src="/ridesk-logo.png" alt="Ridesk Logo" className="object-contain" />
                <AvatarFallback>RK</AvatarFallback>
            </Avatar>
        );
    }

    // Regular user (School Admin, Instructor, etc.)
    const initials = getInitialsFromName(user.firstName, user.lastName);

    return (
        <Avatar className="w-8 h-8 border">
            <AvatarImage src={user.avatar} alt="Profile" className="object-contain" />
            <AvatarFallback>
                {initials || <UserIcon className="h-4 w-4" />}
            </AvatarFallback>
        </Avatar>
    );
};
