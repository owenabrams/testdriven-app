import { useAuth } from '../contexts/AuthContext';

export const USER_ROLES = {
  SUPER_ADMIN: 'super_admin',
  ADMIN: 'admin',
  CHAIRPERSON: 'chairperson',
  SECRETARY: 'secretary',
  TREASURER: 'treasurer',
  MEMBER: 'user',
};

export const ROLE_PERMISSIONS = {
  [USER_ROLES.SUPER_ADMIN]: {
    canViewAllGroups: true,
    canManageUsers: true,
    canViewSystemReports: true,
    canManageSystem: true,
    canScheduleMeetings: true,
    canViewFinancials: true,
    canManageMembers: true,
  },
  [USER_ROLES.ADMIN]: {
    canViewAllGroups: true,
    canManageUsers: false,
    canViewSystemReports: true,
    canManageSystem: false,
    canScheduleMeetings: true,
    canViewFinancials: true,
    canManageMembers: true,
  },
  [USER_ROLES.CHAIRPERSON]: {
    canViewAllGroups: false,
    canManageUsers: false,
    canViewSystemReports: false,
    canManageSystem: false,
    canScheduleMeetings: true,
    canViewFinancials: true,
    canManageMembers: true,
  },
  [USER_ROLES.SECRETARY]: {
    canViewAllGroups: false,
    canManageUsers: false,
    canViewSystemReports: false,
    canManageSystem: false,
    canScheduleMeetings: true,
    canViewFinancials: false,
    canManageMembers: false,
  },
  [USER_ROLES.TREASURER]: {
    canViewAllGroups: false,
    canManageUsers: false,
    canViewSystemReports: false,
    canManageSystem: false,
    canScheduleMeetings: false,
    canViewFinancials: true,
    canManageMembers: false,
  },
  [USER_ROLES.MEMBER]: {
    canViewAllGroups: false,
    canManageUsers: false,
    canViewSystemReports: false,
    canManageSystem: false,
    canScheduleMeetings: false,
    canViewFinancials: false,
    canManageMembers: false,
  },
};

export function useUserRole() {
  const { user } = useAuth();
  
  const userRole = user?.role || USER_ROLES.MEMBER;
  const permissions = ROLE_PERMISSIONS[userRole] || ROLE_PERMISSIONS[USER_ROLES.MEMBER];
  
  const isAdmin = userRole === USER_ROLES.SUPER_ADMIN || userRole === USER_ROLES.ADMIN;
  const isGroupOfficer = [USER_ROLES.CHAIRPERSON, USER_ROLES.SECRETARY, USER_ROLES.TREASURER].includes(userRole);
  const isMember = userRole === USER_ROLES.MEMBER;
  
  const hasPermission = (permission) => {
    return permissions[permission] || false;
  };
  
  const getRoleName = () => {
    switch (userRole) {
      case USER_ROLES.SUPER_ADMIN:
        return 'System Administrator';
      case USER_ROLES.ADMIN:
        return 'Administrator';
      case USER_ROLES.CHAIRPERSON:
        return 'Group Chairperson';
      case USER_ROLES.SECRETARY:
        return 'Group Secretary';
      case USER_ROLES.TREASURER:
        return 'Group Treasurer';
      case USER_ROLES.MEMBER:
        return 'Group Member';
      default:
        return 'User';
    }
  };
  
  const getDashboardComponents = () => {
    const components = [];
    
    // All users see basic stats
    components.push('stats');
    
    if (hasPermission('canScheduleMeetings')) {
      components.push('meetingScheduler');
    }
    
    if (hasPermission('canViewFinancials')) {
      components.push('financialSummary');
    }
    
    if (hasPermission('canViewSystemReports')) {
      components.push('systemOverview');
    }
    
    if (hasPermission('canViewAllGroups')) {
      components.push('allGroups');
    } else {
      components.push('myGroups');
    }
    
    // All users see recent activity
    components.push('recentActivity');
    
    return components;
  };
  
  return {
    user,
    userRole,
    permissions,
    isAdmin,
    isGroupOfficer,
    isMember,
    hasPermission,
    getRoleName,
    getDashboardComponents,
  };
}
