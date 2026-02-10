import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Users as UsersIcon, UserPlus, Trash2, Shield, User as UserIcon, Copy, Link, RefreshCw, AlertCircle, Building2, ChevronDown, ChevronRight, Phone, Edit2, Tag, Plus, X } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { usersApi, categoriesApi, dashboardApi, callsApi, Category, ColorOption } from '../services/api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { User, UserRole, isDeveloper } from '../types';
import toast from 'react-hot-toast';

const DEFAULT_MAX_USERS = 5;

// Built-in categories (always available as fallback)
const BUILTIN_CATEGORIES = [
  { key: 'comercial', name: 'Comercial', color_id: 'blue', color_classes: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300', is_builtin: true },
  { key: 'suporte', name: 'Suporte', color_id: 'green', color_classes: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300', is_builtin: true },
  { key: 'tecnico', name: 'Técnico', color_id: 'purple', color_classes: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300', is_builtin: true },
  { key: 'supervisor', name: 'Supervisor', color_id: 'orange', color_classes: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300', is_builtin: true },
];

// Extended User type with company name for developer view
interface UserWithCompany extends User {
  company_name?: string;
}

export default function Users() {
  const { t } = useTranslation();
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<UserWithCompany[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [userToDelete, setUserToDelete] = useState<UserWithCompany | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Invite modal state
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteRole, setInviteRole] = useState<UserRole>('agent');
  const [inviteCompanyId, setInviteCompanyId] = useState<number | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('comercial');
  const [isGeneratingInvite, setIsGeneratingInvite] = useState(false);
  const [inviteResult, setInviteResult] = useState<{ token: string; inviteUrl: string; expiresAt: string } | null>(null);

  // Change role modal state
  const [showChangeRoleModal, setShowChangeRoleModal] = useState(false);
  const [userToChangeRole, setUserToChangeRole] = useState<UserWithCompany | null>(null);
  const [newRole, setNewRole] = useState<UserRole>('agent');
  const [isChangingRole, setIsChangingRole] = useState(false);

  // Developer view: expanded companies
  const [expandedCompanies, setExpandedCompanies] = useState<Set<number>>(new Set());

  // Phone number modal state
  const [showPhoneModal, setShowPhoneModal] = useState(false);
  const [userToEditPhone, setUserToEditPhone] = useState<UserWithCompany | null>(null);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isSavingPhone, setIsSavingPhone] = useState(false);

  // Change category modal state (supports multiple categories)
  const [showChangeCategoryModal, setShowChangeCategoryModal] = useState(false);
  const [userToChangeCategory, setUserToChangeCategory] = useState<UserWithCompany | null>(null);
  const [editSelectedCategory, setEditSelectedCategory] = useState<string>('comercial');
  const [editSelectedCategories, setEditSelectedCategories] = useState<string[]>([]);  // Multiple categories support
  const [isChangingCategory, setIsChangingCategory] = useState(false);

  // Company invite limit (dynamic from backend)
  const [maxUsers, setMaxUsers] = useState<number>(DEFAULT_MAX_USERS);

  // Categories state
  const [categories, setCategories] = useState<Category[]>([]);
  const [colorOptions, setColorOptions] = useState<ColorOption[]>([]);
  const [showCreateCategoryModal, setShowCreateCategoryModal] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryColor, setNewCategoryColor] = useState('pink');
  const [isCreatingCategory, setIsCreatingCategory] = useState(false);
  const [showDeleteCategoryModal, setShowDeleteCategoryModal] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState<Category | null>(null);
  const [isDeletingCategory, setIsDeletingCategory] = useState(false);

  // Edit category modal state
  const [showEditCategoryModal, setShowEditCategoryModal] = useState(false);
  const [categoryToEdit, setCategoryToEdit] = useState<Category | null>(null);
  const [editCategoryName, setEditCategoryName] = useState('');
  const [editCategoryColor, setEditCategoryColor] = useState('');
  const [isEditingCategory, setIsEditingCategory] = useState(false);

  // Usage data per user (minutes + calls)
  const [userUsageData, setUserUsageData] = useState<Record<number, { totalCalls: number; totalMinutes: number }>>({});

  const isDev = currentUser?.role ? isDeveloper(currentUser.role) : false;

  useEffect(() => {
    fetchUsers();
    fetchCategories();
    fetchColorOptions();
    fetchUsageData();
  }, []);

  // Fetch company invite limit for admin users (separate effect to handle currentUser loading)
  useEffect(() => {
    if (currentUser?.role === 'admin_manager') {
      fetchCompanyInfo();
    }
  }, [currentUser?.role]);

  // Auto-expand all companies on first load for developer
  useEffect(() => {
    if (isDev && users.length > 0) {
      const companyIds = new Set(users.map(u => u.company_id).filter((id): id is number => id !== null));
      setExpandedCompanies(companyIds);
    }
  }, [isDev, users.length]);

  const fetchCompanyInfo = async () => {
    try {
      const company = await usersApi.getMyCompany();
      // Use invite_limit from company, or default to DEFAULT_MAX_USERS if not set
      if (company) {
        setMaxUsers(company.invite_limit || DEFAULT_MAX_USERS);
      }
    } catch (error) {
      console.error('Error fetching company info:', error);
      // Keep default max users on error
    }
  };

  const fetchUsers = async () => {
    try {
      setIsLoading(true);
      const data = await usersApi.getAll();
      setUsers(data);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error(t('users.fetchError', 'Failed to load users'));
    } finally {
      setIsLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const data = await categoriesApi.getAll();
      setCategories(data.length > 0 ? data : BUILTIN_CATEGORIES);
    } catch (error) {
      console.error('Error fetching categories:', error);
      setCategories(BUILTIN_CATEGORIES);
    }
  };

  const fetchColorOptions = async () => {
    try {
      const data = await categoriesApi.getColors();
      setColorOptions(data);
    } catch (error) {
      console.error('Error fetching color options:', error);
    }
  };

  const fetchUsageData = async () => {
    try {
      const [scoreData, callsData] = await Promise.all([
        dashboardApi.getScoreByAgent(),
        callsApi.getAll({ limit: 10000 }),
      ]);

      const usage: Record<number, { totalCalls: number; totalMinutes: number }> = {};

      // Get total_calls from score by agent
      if (Array.isArray(scoreData)) {
        scoreData.forEach((agent: any) => {
          if (agent.agent_id) {
            usage[agent.agent_id] = {
              totalCalls: agent.total_calls || 0,
              totalMinutes: 0,
            };
          }
        });
      }

      // Aggregate duration_seconds per agent from calls
      const calls = callsData?.calls || callsData || [];
      if (Array.isArray(calls)) {
        calls.forEach((call: any) => {
          if (call.agent_id) {
            if (!usage[call.agent_id]) {
              usage[call.agent_id] = { totalCalls: 0, totalMinutes: 0 };
            }
            usage[call.agent_id].totalMinutes += (call.duration_seconds || 0) / 60;
          }
        });
      }

      // Round minutes
      Object.keys(usage).forEach((id) => {
        usage[Number(id)].totalMinutes = Math.round(usage[Number(id)].totalMinutes);
      });

      setUserUsageData(usage);
    } catch (error) {
      console.error('Error fetching usage data:', error);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString(currentUser?.language_preference === 'pt' ? 'pt-PT' : 'en-US', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const getRoleBadge = (role: string, customRoleName?: string | null, userCategories?: string[]) => {
    if (role === 'admin_manager') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400">
          <Shield className="w-3 h-3" />
          {customRoleName || t('users.roles.admin', 'Admin')}
        </span>
      );
    }
    if (role === 'developer') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
          <Shield className="w-3 h-3" />
          {t('users.developer', 'Developer')}
        </span>
      );
    }

    // For 'agent' role (users), check if they have multiple categories
    const categoriesToShow = userCategories && userCategories.length > 0
      ? userCategories
      : customRoleName ? [customRoleName] : [];

    if (categoriesToShow.length > 0) {
      // Show multiple category badges
      return (
        <div className="flex flex-wrap gap-1">
          {categoriesToShow.map((catName, idx) => {
            const matchedCategory = categories.find(c =>
              c.name.toLowerCase() === catName.toLowerCase() ||
              c.key.toLowerCase() === catName.toLowerCase()
            );

            if (matchedCategory) {
              return (
                <span key={idx} className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${matchedCategory.color_classes}`}>
                  <UserIcon className="w-3 h-3" />
                  {catName}
                </span>
              );
            }

            // Fallback: Custom category not found in list - use gray
            return (
              <span key={idx} className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300">
                <UserIcon className="w-3 h-3" />
                {catName}
              </span>
            );
          })}
        </div>
      );
    }

    // Default user badge
    return (
      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
        <UserIcon className="w-3 h-3" />
        {t('users.user', 'User')}
      </span>
    );
  };

  const handleDeleteClick = (user: UserWithCompany) => {
    setUserToDelete(user);
    setShowDeleteModal(true);
  };

  const handleDeleteConfirm = async () => {
    if (!userToDelete) return;

    setIsDeleting(true);
    try {
      await usersApi.delete(userToDelete.id);
      setUsers(users.filter(u => u.id !== userToDelete.id));
      toast.success(t('users.deleteSuccess', 'User deleted successfully'));
      setShowDeleteModal(false);
      setUserToDelete(null);
    } catch (error: any) {
      console.error('Error deleting user:', error);
      toast.error(error.response?.data?.error || t('users.deleteError', 'Failed to delete user'));
    } finally {
      setIsDeleting(false);
    }
  };

  const handleInviteClick = (companyId?: number) => {
    setInviteRole('agent');
    setInviteCompanyId(companyId || null);
    setSelectedCategory('comercial');
    setInviteResult(null);
    setShowInviteModal(true);
  };

  // Get the final role name based on category selection
  const getFinalRoleName = () => {
    if (inviteRole === 'admin_manager') return undefined;
    const category = categories.find(c => c.key === selectedCategory);
    return category ? category.name : undefined;
  };

  // Create new category
  const handleCreateCategory = async () => {
    if (!newCategoryName.trim()) {
      toast.error(t('users.categoryNameRequired', 'Category name is required'));
      return;
    }

    setIsCreatingCategory(true);
    try {
      const newCategory = await categoriesApi.create(newCategoryName, newCategoryColor);
      setCategories([...categories, newCategory]);
      toast.success(t('users.categoryCreated', 'Category created with {{count}} criteria', { count: newCategory.criteria_count || 7 }));
      setShowCreateCategoryModal(false);
      setNewCategoryName('');
      setNewCategoryColor('pink');
    } catch (error: any) {
      console.error('Error creating category:', error);
      toast.error(error.response?.data?.error || t('users.categoryCreateError', 'Failed to create category'));
    } finally {
      setIsCreatingCategory(false);
    }
  };

  // Delete category
  const handleDeleteCategoryClick = (category: Category) => {
    setCategoryToDelete(category);
    setShowDeleteCategoryModal(true);
  };

  const handleDeleteCategoryConfirm = async () => {
    if (!categoryToDelete) return;

    setIsDeletingCategory(true);
    try {
      const result = await categoriesApi.delete(categoryToDelete.key);
      setCategories(categories.filter(c => c.key !== categoryToDelete.key));
      toast.success(t('users.categoryDeleted', 'Category deleted with {{count}} criteria', { count: result.deleted_criteria }));
      setShowDeleteCategoryModal(false);
      setCategoryToDelete(null);
    } catch (error: any) {
      console.error('Error deleting category:', error);
      toast.error(error.response?.data?.error || t('users.categoryDeleteError', 'Failed to delete category'));
    } finally {
      setIsDeletingCategory(false);
    }
  };

  // Edit category
  const handleEditCategoryClick = (category: Category) => {
    setCategoryToEdit(category);
    setEditCategoryName(category.name);
    setEditCategoryColor(category.color_id);
    setShowEditCategoryModal(true);
  };

  const handleEditCategoryConfirm = async () => {
    if (!categoryToEdit || !editCategoryName.trim()) return;

    setIsEditingCategory(true);
    try {
      const updatedCategory = await categoriesApi.update(categoryToEdit.key, editCategoryName.trim(), editCategoryColor);
      setCategories(categories.map(c => c.key === categoryToEdit.key ? updatedCategory : c));
      toast.success(t('users.categoryUpdated', 'Category updated successfully'));
      setShowEditCategoryModal(false);
      setCategoryToEdit(null);
      setEditCategoryName('');
      setEditCategoryColor('');
    } catch (error: any) {
      console.error('Error updating category:', error);
      toast.error(error.response?.data?.error || t('users.categoryUpdateError', 'Failed to update category'));
    } finally {
      setIsEditingCategory(false);
    }
  };

  const handleGenerateInvite = async () => {
    setIsGeneratingInvite(true);
    try {
      const roleName = getFinalRoleName();
      const result = await usersApi.invite(inviteRole, inviteCompanyId || undefined, roleName);
      setInviteResult(result);
      toast.success(t('users.inviteSuccess', 'Invitation link generated'));
    } catch (error: any) {
      console.error('Error generating invite:', error);
      toast.error(error.response?.data?.error || t('users.inviteError', 'Failed to generate invitation'));
    } finally {
      setIsGeneratingInvite(false);
    }
  };

  const handleCopyInviteLink = () => {
    if (inviteResult) {
      navigator.clipboard.writeText(inviteResult.inviteUrl);
      toast.success(t('users.linkCopied', 'Link copied to clipboard'));
    }
  };

  const handleCloseInviteModal = () => {
    setShowInviteModal(false);
    setInviteResult(null);
  };

  const handleChangeRoleClick = (user: UserWithCompany) => {
    setUserToChangeRole(user);
    setNewRole(user.role === 'admin_manager' ? 'agent' : 'admin_manager');
    setShowChangeRoleModal(true);
  };

  const handleChangeRoleConfirm = async () => {
    if (!userToChangeRole) return;

    setIsChangingRole(true);
    try {
      await usersApi.updateRole(userToChangeRole.id, newRole);
      setUsers(users.map(u =>
        u.id === userToChangeRole.id ? { ...u, role: newRole } : u
      ));
      toast.success(t('users.roleChangeSuccess', 'User role updated successfully'));
      setShowChangeRoleModal(false);
      setUserToChangeRole(null);
    } catch (error: any) {
      console.error('Error changing role:', error);
      toast.error(error.response?.data?.error || t('users.roleChangeError', 'Failed to update user role'));
    } finally {
      setIsChangingRole(false);
    }
  };

  const toggleCompanyExpanded = (companyId: number) => {
    const newExpanded = new Set(expandedCompanies);
    if (newExpanded.has(companyId)) {
      newExpanded.delete(companyId);
    } else {
      newExpanded.add(companyId);
    }
    setExpandedCompanies(newExpanded);
  };

  const handleEditPhoneClick = (user: UserWithCompany) => {
    setUserToEditPhone(user);
    setPhoneNumber(user.phone_number || '+351');
    setShowPhoneModal(true);
  };

  const handleSavePhone = async () => {
    if (!userToEditPhone) return;

    setIsSavingPhone(true);
    try {
      await usersApi.updatePhoneNumber(userToEditPhone.id, phoneNumber || null);
      setUsers(users.map(u =>
        u.id === userToEditPhone.id ? { ...u, phone_number: phoneNumber || null } : u
      ));
      toast.success(t('users.phoneSaved', 'Phone number updated successfully'));
      setShowPhoneModal(false);
      setUserToEditPhone(null);
    } catch (error: any) {
      console.error('Error updating phone:', error);
      toast.error(error.response?.data?.error || t('users.phoneError', 'Failed to update phone number'));
    } finally {
      setIsSavingPhone(false);
    }
  };

  const handleChangeCategoryClick = (user: UserWithCompany) => {
    setUserToChangeCategory(user);

    // Load existing categories from user (supports multiple categories)
    const userCategories = user.categories && Array.isArray(user.categories) && user.categories.length > 0
      ? user.categories
      : user.custom_role_name ? [user.custom_role_name] : [];

    // Map category names to category keys
    const selectedKeys = userCategories.map(catName => {
      const matchedCategory = categories.find(c =>
        c.name.toLowerCase() === catName.toLowerCase() ||
        c.key === catName.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '_')
      );
      return matchedCategory?.key || null;
    }).filter(Boolean) as string[];

    // Set multiple categories
    setEditSelectedCategories(selectedKeys.length > 0 ? selectedKeys : [categories[0]?.key || 'comercial']);

    // Also set single category for backwards compatibility
    setEditSelectedCategory(selectedKeys[0] || categories[0]?.key || 'comercial');

    setShowChangeCategoryModal(true);
  };

  // Toggle a category in the multi-select
  const toggleCategorySelection = (categoryKey: string) => {
    setEditSelectedCategories(prev => {
      if (prev.includes(categoryKey)) {
        // Remove if already selected (but keep at least one)
        if (prev.length > 1) {
          return prev.filter(k => k !== categoryKey);
        }
        return prev;
      } else {
        // Add to selection
        return [...prev, categoryKey];
      }
    });
  };

  const getEditFinalRoleNames = (): string[] => {
    return editSelectedCategories.map(key => {
      const category = categories.find(c => c.key === key);
      return category ? category.name : null;
    }).filter(Boolean) as string[];
  };

  const getEditFinalRoleName = () => {
    const category = categories.find(c => c.key === editSelectedCategory);
    return category ? category.name : null;
  };

  const handleChangeCategoryConfirm = async () => {
    if (!userToChangeCategory) return;

    setIsChangingCategory(true);
    try {
      const categoryNames = getEditFinalRoleNames();
      // Send categories array to API
      await usersApi.updateCategory(userToChangeCategory.id, categoryNames[0] || null, categoryNames);
      setUsers(users.map(u =>
        u.id === userToChangeCategory.id ? {
          ...u,
          custom_role_name: categoryNames[0] || null,
          categories: categoryNames
        } : u
      ));
      toast.success(t('users.categoryChangeSuccess', 'User category updated successfully'));
      setShowChangeCategoryModal(false);
      setUserToChangeCategory(null);
    } catch (error: any) {
      console.error('Error changing category:', error);
      toast.error(error.response?.data?.error || t('users.categoryChangeError', 'Failed to update user category'));
    } finally {
      setIsChangingCategory(false);
    }
  };

  // Group users by company for developer view
  const getUsersByCompany = () => {
    const grouped: { [companyId: number]: { name: string; users: UserWithCompany[] } } = {};

    users.forEach(user => {
      if (user.company_id !== null) {
        if (!grouped[user.company_id]) {
          grouped[user.company_id] = {
            name: user.company_name || `Company ${user.company_id}`,
            users: []
          };
        }
        grouped[user.company_id].users.push(user);
      }
    });

    return grouped;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-600"></div>
      </div>
    );
  }

  // Developer view - shows all users grouped by company
  if (isDev) {
    const usersByCompany = getUsersByCompany();
    const companyIds = Object.keys(usersByCompany).map(Number);
    const totalAdmins = users.filter(u => u.role === 'admin_manager').length;
    const totalUsers = users.filter(u => u.role === 'agent').length;

    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {t('users.allUsers', 'All Users')}
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              {t('users.developerSubtitle', 'View all users across all companies')}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400">
              <Shield className="w-4 h-4" />
              {totalAdmins} {t('users.admins', 'Admins')}
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
              <UserIcon className="w-4 h-4" />
              {totalUsers} {t('users.users', 'Users')}
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300">
              <Building2 className="w-4 h-4" />
              {companyIds.length} {t('users.companies', 'Companies')}
            </div>
          </div>
        </div>

        {/* Companies with Users */}
        {companyIds.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Building2 className="w-16 h-16 mx-auto text-gray-300 dark:text-gray-600 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
                {t('users.noCompanies', 'No companies found')}
              </h3>
              <p className="text-gray-500 dark:text-gray-400">
                {t('users.noCompaniesDescription', 'Companies will appear here once created.')}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {companyIds.map(companyId => {
              const company = usersByCompany[companyId];
              const isExpanded = expandedCompanies.has(companyId);
              const companyAdmins = company.users.filter(u => u.role === 'admin_manager');
              const companyUsers = company.users.filter(u => u.role === 'agent');

              return (
                <Card key={companyId}>
                  <CardHeader
                    className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                    onClick={() => toggleCompanyExpanded(companyId)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {isExpanded ? (
                          <ChevronDown className="w-5 h-5 text-gray-400" />
                        ) : (
                          <ChevronRight className="w-5 h-5 text-gray-400" />
                        )}
                        <div className="flex items-center justify-center w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/30">
                          <Building2 className="w-5 h-5 text-green-600 dark:text-green-400" />
                        </div>
                        <div>
                          <CardTitle className="text-lg">{company.name}</CardTitle>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            {companyAdmins.length} {t('users.admins', 'admins')} · {companyUsers.length} {t('users.users', 'users')}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-500 dark:text-gray-400 mr-2">
                          ID: {companyId}
                        </span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleInviteClick(companyId);
                          }}
                          className="inline-flex items-center gap-1 px-3 py-1.5 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition-colors"
                        >
                          <UserPlus className="w-4 h-4" />
                          {t('users.invite', 'Invite')}
                        </button>
                      </div>
                    </div>
                  </CardHeader>

                  {isExpanded && (
                    <CardContent className="pt-0">
                      {/* Admins Section */}
                      {companyAdmins.length > 0 && (
                        <div className="mb-4">
                          <h4 className="text-sm font-medium text-purple-600 dark:text-purple-400 mb-2 flex items-center gap-2">
                            <Shield className="w-4 h-4" />
                            {t('users.administrators', 'Administrators')}
                          </h4>
                          <div className="bg-purple-50 dark:bg-purple-900/10 rounded-lg overflow-hidden">
                            <table className="w-full">
                              <tbody>
                                {companyAdmins.map((user) => (
                                  <tr
                                    key={user.id}
                                    className="border-b border-purple-100 dark:border-purple-900/30 last:border-0"
                                  >
                                    <td className="py-3 px-4">
                                      <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                                          <span className="text-purple-600 dark:text-purple-400 font-medium text-sm">
                                            {user.username.charAt(0).toUpperCase()}
                                          </span>
                                        </div>
                                        <span className="font-medium text-gray-900 dark:text-gray-100">
                                          {user.username}
                                        </span>
                                      </div>
                                    </td>
                                    <td className="py-3 px-4">
                                      {getRoleBadge(user.role, user.custom_role_name, user.categories)}
                                    </td>
                                    <td className="py-3 px-4 text-center text-sm text-gray-600 dark:text-gray-400">
                                      {userUsageData[user.id]?.totalMinutes ?? 0} min
                                    </td>
                                    <td className="py-3 px-4 text-center text-sm text-gray-600 dark:text-gray-400">
                                      {userUsageData[user.id]?.totalCalls ?? 0}
                                    </td>
                                    <td className="py-3 px-4 text-gray-600 dark:text-gray-400">
                                      {formatDate(user.created_at)}
                                    </td>
                                    <td className="py-3 px-4 text-right">
                                      <div className="flex items-center justify-end gap-1">
                                        <button
                                          onClick={() => handleChangeRoleClick(user)}
                                          className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                                          title={t('users.changeRole', 'Change Role')}
                                        >
                                          <RefreshCw className="w-4 h-4" />
                                        </button>
                                        <button
                                          onClick={() => handleDeleteClick(user)}
                                          className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                          title={t('common.delete', 'Delete')}
                                        >
                                          <Trash2 className="w-4 h-4" />
                                        </button>
                                      </div>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}

                      {/* Users Section */}
                      {companyUsers.length > 0 && (
                        <div>
                          <h4 className="text-sm font-medium text-blue-600 dark:text-blue-400 mb-2 flex items-center gap-2">
                            <UserIcon className="w-4 h-4" />
                            {t('users.usersTitle', 'Users')}
                          </h4>
                          <div className="bg-blue-50 dark:bg-blue-900/10 rounded-lg overflow-hidden">
                            <table className="w-full">
                              <tbody>
                                {companyUsers.map((user) => (
                                  <tr
                                    key={user.id}
                                    className="border-b border-blue-100 dark:border-blue-900/30 last:border-0"
                                  >
                                    <td className="py-3 px-4">
                                      <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                                          <span className="text-blue-600 dark:text-blue-400 font-medium text-sm">
                                            {user.username.charAt(0).toUpperCase()}
                                          </span>
                                        </div>
                                        <span className="font-medium text-gray-900 dark:text-gray-100">
                                          {user.username}
                                        </span>
                                      </div>
                                    </td>
                                    <td className="py-3 px-4">
                                      {getRoleBadge(user.role, user.custom_role_name, user.categories)}
                                    </td>
                                    <td className="py-3 px-4 text-center text-sm text-gray-600 dark:text-gray-400">
                                      {userUsageData[user.id]?.totalMinutes ?? 0} min
                                    </td>
                                    <td className="py-3 px-4 text-center text-sm text-gray-600 dark:text-gray-400">
                                      {userUsageData[user.id]?.totalCalls ?? 0}
                                    </td>
                                    <td className="py-3 px-4 text-gray-600 dark:text-gray-400">
                                      {formatDate(user.created_at)}
                                    </td>
                                    <td className="py-3 px-4 text-right">
                                      <div className="flex items-center justify-end gap-1">
                                        <button
                                          onClick={() => handleChangeCategoryClick(user)}
                                          className="p-2 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg transition-colors"
                                          title={t('users.changeCategory', 'Change Category')}
                                        >
                                          <Tag className="w-4 h-4" />
                                        </button>
                                        <button
                                          onClick={() => handleChangeRoleClick(user)}
                                          className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                                          title={t('users.changeRole', 'Change Role')}
                                        >
                                          <RefreshCw className="w-4 h-4" />
                                        </button>
                                        <button
                                          onClick={() => handleDeleteClick(user)}
                                          className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                          title={t('common.delete', 'Delete')}
                                        >
                                          <Trash2 className="w-4 h-4" />
                                        </button>
                                      </div>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}

                      {companyAdmins.length === 0 && companyUsers.length === 0 && (
                        <p className="text-center py-4 text-gray-500 dark:text-gray-400">
                          {t('users.noUsersInCompany', 'No users in this company')}
                        </p>
                      )}
                    </CardContent>
                  )}
                </Card>
              );
            })}
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {showDeleteModal && userToDelete && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md mx-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                {t('users.deleteTitle', 'Delete User')}
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                {t('users.deleteConfirm', 'Are you sure you want to delete user "{{username}}"? This action cannot be undone.', { username: userToDelete.username })}
              </p>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => {
                    setShowDeleteModal(false);
                    setUserToDelete(null);
                  }}
                  className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                  disabled={isDeleting}
                >
                  {t('common.cancel', 'Cancel')}
                </button>
                <button
                  onClick={handleDeleteConfirm}
                  disabled={isDeleting}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
                >
                  {isDeleting ? t('common.deleting', 'Deleting...') : t('common.delete', 'Delete')}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Invite User Modal */}
        {showInviteModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md mx-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                {t('users.inviteTitle', 'Invite New User')}
                {inviteCompanyId && (
                  <span className="ml-2 text-sm font-normal text-gray-500 dark:text-gray-400">
                    ({usersByCompany[inviteCompanyId]?.name || `Company ${inviteCompanyId}`})
                  </span>
                )}
              </h3>

              {!inviteResult ? (
                <>
                  <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      {t('users.selectRole', 'Select Role')}
                    </label>
                    <div className="space-y-2">
                      <label className="flex items-center gap-3 p-3 border border-gray-200 dark:border-gray-700 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50">
                        <input
                          type="radio"
                          name="role"
                          value="agent"
                          checked={inviteRole === 'agent'}
                          onChange={() => setInviteRole('agent')}
                          className="w-4 h-4 text-green-600"
                        />
                        <div>
                          <div className="font-medium text-gray-900 dark:text-gray-100">
                            {t('users.user', 'User')}
                          </div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            {t('users.userDescription', 'Can view their own calls and performance')}
                          </div>
                        </div>
                      </label>
                      <label className="flex items-center gap-3 p-3 border border-gray-200 dark:border-gray-700 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50">
                        <input
                          type="radio"
                          name="role"
                          value="admin_manager"
                          checked={inviteRole === 'admin_manager'}
                          onChange={() => setInviteRole('admin_manager')}
                          className="w-4 h-4 text-green-600"
                        />
                        <div>
                          <div className="font-medium text-gray-900 dark:text-gray-100">
                            {t('users.roles.admin', 'Admin')}
                          </div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            {t('users.adminDescription', 'Full access to all features and settings')}
                          </div>
                        </div>
                      </label>
                    </div>
                  </div>

                  <div className="flex justify-end gap-3">
                    <button
                      onClick={handleCloseInviteModal}
                      className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                      disabled={isGeneratingInvite}
                    >
                      {t('common.cancel', 'Cancel')}
                    </button>
                    <button
                      onClick={handleGenerateInvite}
                      disabled={isGeneratingInvite || !inviteCompanyId}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                    >
                      {isGeneratingInvite ? t('common.generating', 'Generating...') : t('users.generateInvite', 'Generate Invite')}
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div className="mb-6">
                    <div className="flex items-center gap-2 mb-3 text-green-600 dark:text-green-400">
                      <Link className="w-5 h-5" />
                      <span className="font-medium">{t('users.inviteLinkReady', 'Invitation Link Ready')}</span>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                      {t('users.inviteLinkDescription', 'Share this link with the new user. The link will expire in 7 days.')}
                    </p>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        readOnly
                        value={inviteResult.inviteUrl}
                        className="flex-1 px-3 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg text-sm text-gray-900 dark:text-gray-100"
                      />
                      <button
                        onClick={handleCopyInviteLink}
                        className="p-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                        title={t('common.copy', 'Copy')}
                      >
                        <Copy className="w-5 h-5" />
                      </button>
                    </div>
                    <div className="mt-3 text-xs text-gray-500 dark:text-gray-400">
                      <strong>{t('users.token', 'Token')}:</strong> {inviteResult.token}
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <button
                      onClick={handleCloseInviteModal}
                      className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                    >
                      {t('common.close', 'Close')}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* Change Role Modal */}
        {showChangeRoleModal && userToChangeRole && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md mx-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                {t('users.changeRoleTitle', 'Change User Role')}
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                {t('users.changeRoleFor', 'Change role for user "{{username}}"', { username: userToChangeRole.username })}
              </p>

              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('users.selectNewRole', 'Select New Role')}
                </label>
                <div className="space-y-2">
                  <label className="flex items-center gap-3 p-3 border border-gray-200 dark:border-gray-700 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <input
                      type="radio"
                      name="newRole"
                      value="agent"
                      checked={newRole === 'agent'}
                      onChange={() => setNewRole('agent')}
                      className="w-4 h-4 text-green-600"
                    />
                    <div>
                      <div className="font-medium text-gray-900 dark:text-gray-100">
                        {t('users.user', 'User')}
                      </div>
                    </div>
                  </label>
                  <label className="flex items-center gap-3 p-3 border border-gray-200 dark:border-gray-700 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <input
                      type="radio"
                      name="newRole"
                      value="admin_manager"
                      checked={newRole === 'admin_manager'}
                      onChange={() => setNewRole('admin_manager')}
                      className="w-4 h-4 text-green-600"
                    />
                    <div>
                      <div className="font-medium text-gray-900 dark:text-gray-100">
                        {t('users.roles.admin', 'Admin')}
                      </div>
                    </div>
                  </label>
                </div>
              </div>

              <div className="flex justify-end gap-3">
                <button
                  onClick={() => {
                    setShowChangeRoleModal(false);
                    setUserToChangeRole(null);
                  }}
                  className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                  disabled={isChangingRole}
                >
                  {t('common.cancel', 'Cancel')}
                </button>
                <button
                  onClick={handleChangeRoleConfirm}
                  disabled={isChangingRole || newRole === userToChangeRole.role}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                >
                  {isChangingRole ? t('common.saving', 'Saving...') : t('users.confirmRoleChange', 'Change Role')}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Change Category Modal (Developer View) */}
        {showChangeCategoryModal && userToChangeCategory && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md mx-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
                <Tag className="w-5 h-5" />
                {t('users.changeCategoryTitle', 'Change Category')}
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                {t('users.changeCategoryFor', 'Change category for user "{{username}}"', { username: userToChangeCategory.username })}
              </p>

              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('users.selectCategory', 'Select Category')}
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {categories.map((category) => (
                    <div key={category.key} className="relative group">
                      <button
                        type="button"
                        onClick={() => setEditSelectedCategory(category.key)}
                        className={`w-full p-3 rounded-lg border-2 transition-all text-sm font-medium ${
                          editSelectedCategory === category.key
                            ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                            : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                        }`}
                      >
                        <span className={`inline-block px-2 py-0.5 rounded-full text-xs ${category.color_classes}`}>
                          {category.name}
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); handleEditCategoryClick(category); }}
                        className="absolute -top-2 right-4 p-1 bg-blue-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                        title={t('users.editCategory', 'Edit Category')}
                      >
                        <Edit2 className="w-3 h-3" />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); handleDeleteCategoryClick(category); }}
                        className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                        title={t('users.deleteCategory', 'Delete Category')}
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                  {/* Add new category button */}
                  <button
                    type="button"
                    onClick={() => setShowCreateCategoryModal(true)}
                    className="p-3 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600 hover:border-green-500 dark:hover:border-green-500 transition-all text-sm font-medium flex items-center justify-center gap-2 text-gray-500 hover:text-green-600"
                  >
                    <Plus className="w-4 h-4" />
                    {t('users.newCategory', 'New')}
                  </button>
                </div>
              </div>

              <div className="flex justify-end gap-3">
                <button
                  onClick={() => {
                    setShowChangeCategoryModal(false);
                    setUserToChangeCategory(null);
                  }}
                  className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                  disabled={isChangingCategory}
                >
                  {t('common.cancel', 'Cancel')}
                </button>
                <button
                  onClick={handleChangeCategoryConfirm}
                  disabled={isChangingCategory}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                >
                  {isChangingCategory ? t('common.saving', 'Saving...') : t('users.confirmCategoryChange', 'Change Category')}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Regular admin view - original code
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            {t('users.title', 'Users')}
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            {t('users.subtitle', 'Manage team members and their roles')}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Agent count indicator (admins don't count towards the limit) */}
          {(() => {
            const agentCount = users.filter(u => u.role === 'agent').length;
            const isAtLimit = agentCount >= maxUsers;
            return (
              <>
                <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium ${
                  isAtLimit
                    ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                    : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                }`}>
                  <UsersIcon className="w-4 h-4" />
                  {agentCount}/{maxUsers} {t('users.usersLabel', 'utilizadores')}
                </div>
                <button
                  onClick={() => handleInviteClick()}
                  disabled={isAtLimit}
                  className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                    isAtLimit
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed dark:bg-gray-700 dark:text-gray-500'
                      : 'bg-green-600 text-white hover:bg-green-700'
                  }`}
                  title={isAtLimit ? t('users.limitReached', 'User limit reached') : ''}
                >
                  <UserPlus className="w-5 h-5" />
                  {t('users.inviteUser', 'Invite User')}
                </button>
              </>
            );
          })()}
        </div>
      </div>

      {/* Limit Warning Banner */}
      {users.filter(u => u.role === 'agent').length >= maxUsers && (
        <div className="flex items-center gap-3 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
          <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0" />
          <div>
            <p className="text-sm font-medium text-amber-800 dark:text-amber-300">
              {t('users.limitReachedTitle', 'User limit reached')}
            </p>
            <p className="text-sm text-amber-700 dark:text-amber-400">
              {t('users.limitReachedMessage', 'You have reached the maximum of {{max}} users. Delete an existing user to invite a new one.', { max: maxUsers })}
            </p>
          </div>
        </div>
      )}

      {/* Users Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UsersIcon className="w-5 h-5" />
            {t('users.teamMembers', 'Team Members')} ({users.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {users.length === 0 ? (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              {t('users.noUsers', 'No users found')}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700">
                    <th className="text-left py-3 px-4 font-medium text-gray-600 dark:text-gray-400">
                      {t('users.username', 'Username')}
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-gray-600 dark:text-gray-400">
                      {t('users.role', 'Role')}
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-gray-600 dark:text-gray-400">
                      {t('users.phone', 'Phone')}
                    </th>
                    <th className="text-center py-3 px-4 font-medium text-gray-600 dark:text-gray-400">
                      {t('users.minutesUsed', 'Minutes Used')}
                    </th>
                    <th className="text-center py-3 px-4 font-medium text-gray-600 dark:text-gray-400">
                      {t('users.numberOfCalls', 'Calls')}
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-gray-600 dark:text-gray-400">
                      {t('users.createdAt', 'Created')}
                    </th>
                    <th className="text-right py-3 px-4 font-medium text-gray-600 dark:text-gray-400">
                      {t('common.actions', 'Actions')}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr
                      key={user.id}
                      className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50"
                    >
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                            <span className="text-green-600 dark:text-green-400 font-medium text-sm">
                              {user.username.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <span className="font-medium text-gray-900 dark:text-gray-100">
                            {user.username}
                            {user.id === currentUser?.id && (
                              <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">
                                ({t('users.you', 'you')})
                              </span>
                            )}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        {getRoleBadge(user.role, user.custom_role_name, user.categories)}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          {user.phone_number ? (
                            <span className="text-gray-900 dark:text-gray-100 text-sm">
                              {user.phone_number}
                            </span>
                          ) : (
                            <span className="text-gray-400 dark:text-gray-500 text-sm italic">
                              {t('users.noPhone', 'No phone')}
                            </span>
                          )}
                          <button
                            onClick={() => handleEditPhoneClick(user)}
                            className="p-1 text-gray-400 hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded transition-colors"
                            title={t('users.editPhone', 'Edit phone number')}
                          >
                            <Edit2 className="w-3 h-3" />
                          </button>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-center text-sm text-gray-600 dark:text-gray-400">
                        {userUsageData[user.id]?.totalMinutes ?? 0} min
                      </td>
                      <td className="py-3 px-4 text-center text-sm text-gray-600 dark:text-gray-400">
                        {userUsageData[user.id]?.totalCalls ?? 0}
                      </td>
                      <td className="py-3 px-4 text-gray-600 dark:text-gray-400">
                        {formatDate(user.created_at)}
                      </td>
                      <td className="py-3 px-4 text-right">
                        {user.id !== currentUser?.id && (
                          <div className="flex items-center justify-end gap-1">
                            {user.role === 'agent' && (
                              <button
                                onClick={() => handleChangeCategoryClick(user)}
                                className="p-2 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg transition-colors"
                                title={t('users.changeCategory', 'Change Category')}
                              >
                                <Tag className="w-4 h-4" />
                              </button>
                            )}
                            <button
                              onClick={() => handleChangeRoleClick(user)}
                              className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                              title={t('users.changeRole', 'Change Role')}
                            >
                              <RefreshCw className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteClick(user)}
                              className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                              title={t('common.delete', 'Delete')}
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && userToDelete && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
              {t('users.deleteTitle', 'Delete User')}
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              {t('users.deleteConfirm', 'Are you sure you want to delete user "{{username}}"? This action cannot be undone.', { username: userToDelete.username })}
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setUserToDelete(null);
                }}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                disabled={isDeleting}
              >
                {t('common.cancel', 'Cancel')}
              </button>
              <button
                onClick={handleDeleteConfirm}
                disabled={isDeleting}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {isDeleting ? t('common.deleting', 'Deleting...') : t('common.delete', 'Delete')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Invite User Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
              {t('users.inviteTitle', 'Invite New User')}
            </h3>

            {!inviteResult ? (
              <>
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {t('users.selectRole', 'Select Role')}
                  </label>
                  <div className="space-y-2">
                    <label className="flex items-center gap-3 p-3 border border-gray-200 dark:border-gray-700 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50">
                      <input
                        type="radio"
                        name="role"
                        value="agent"
                        checked={inviteRole === 'agent'}
                        onChange={() => setInviteRole('agent')}
                        className="w-4 h-4 text-green-600"
                      />
                      <div>
                        <div className="font-medium text-gray-900 dark:text-gray-100">
                          {t('users.user', 'User')}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          {t('users.userDescription', 'Can view their own calls and performance')}
                        </div>
                      </div>
                    </label>
                    <label className="flex items-center gap-3 p-3 border border-gray-200 dark:border-gray-700 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50">
                      <input
                        type="radio"
                        name="role"
                        value="admin_manager"
                        checked={inviteRole === 'admin_manager'}
                        onChange={() => setInviteRole('admin_manager')}
                        className="w-4 h-4 text-green-600"
                      />
                      <div>
                        <div className="font-medium text-gray-900 dark:text-gray-100">
                          {t('users.roles.admin', 'Admin')}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          {t('users.adminDescription', 'Full access to all features and settings')}
                        </div>
                      </div>
                    </label>
                  </div>
                </div>

                {/* User Category Selection - only show when role is 'agent' (user) */}
                {inviteRole === 'agent' && (
                  <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      {t('users.selectCategory', 'Select Category')}
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {categories.map((category) => (
                        <div key={category.key} className="relative group">
                          <button
                            type="button"
                            onClick={() => setSelectedCategory(category.key)}
                            className={`w-full p-3 rounded-lg border-2 transition-all text-sm font-medium ${
                              selectedCategory === category.key
                                ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                                : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                            }`}
                          >
                            <span className={`inline-block px-2 py-0.5 rounded-full text-xs ${category.color_classes}`}>
                              {category.name}
                            </span>
                          </button>
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); handleEditCategoryClick(category); }}
                            className="absolute -top-2 right-4 p-1 bg-blue-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                            title={t('users.editCategory', 'Edit Category')}
                          >
                            <Edit2 className="w-3 h-3" />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); handleDeleteCategoryClick(category); }}
                            className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                            title={t('users.deleteCategory', 'Delete Category')}
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                      {/* Add new category button */}
                      <button
                        type="button"
                        onClick={() => setShowCreateCategoryModal(true)}
                        className="p-3 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600 hover:border-green-500 dark:hover:border-green-500 transition-all text-sm font-medium flex items-center justify-center gap-2 text-gray-500 hover:text-green-600"
                      >
                        <Plus className="w-4 h-4" />
                        {t('users.newCategory', 'New')}
                      </button>
                    </div>
                  </div>
                )}

                <div className="flex justify-end gap-3">
                  <button
                    onClick={handleCloseInviteModal}
                    className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                    disabled={isGeneratingInvite}
                  >
                    {t('common.cancel', 'Cancel')}
                  </button>
                  <button
                    onClick={handleGenerateInvite}
                    disabled={isGeneratingInvite}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                  >
                    {isGeneratingInvite ? t('common.generating', 'Generating...') : t('users.generateInvite', 'Generate Invite')}
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="mb-6">
                  <div className="flex items-center gap-2 mb-3 text-green-600 dark:text-green-400">
                    <Link className="w-5 h-5" />
                    <span className="font-medium">{t('users.inviteLinkReady', 'Invitation Link Ready')}</span>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                    {t('users.inviteLinkDescription', 'Share this link with the new user. The link will expire in 7 days.')}
                  </p>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      readOnly
                      value={inviteResult.inviteUrl}
                      className="flex-1 px-3 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg text-sm text-gray-900 dark:text-gray-100"
                    />
                    <button
                      onClick={handleCopyInviteLink}
                      className="p-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                      title={t('common.copy', 'Copy')}
                    >
                      <Copy className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                <div className="flex justify-end">
                  <button
                    onClick={handleCloseInviteModal}
                    className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                  >
                    {t('common.close', 'Close')}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Change Role Modal */}
      {showChangeRoleModal && userToChangeRole && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
              {t('users.changeRoleTitle', 'Change User Role')}
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              {t('users.changeRoleFor', 'Change role for user "{{username}}"', { username: userToChangeRole.username })}
            </p>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('users.selectNewRole', 'Select New Role')}
              </label>
              <div className="space-y-2">
                <label className="flex items-center gap-3 p-3 border border-gray-200 dark:border-gray-700 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50">
                  <input
                    type="radio"
                    name="newRole"
                    value="agent"
                    checked={newRole === 'agent'}
                    onChange={() => setNewRole('agent')}
                    className="w-4 h-4 text-green-600"
                  />
                  <div>
                    <div className="font-medium text-gray-900 dark:text-gray-100">
                      {t('users.user', 'User')}
                    </div>
                  </div>
                </label>
                <label className="flex items-center gap-3 p-3 border border-gray-200 dark:border-gray-700 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50">
                  <input
                    type="radio"
                    name="newRole"
                    value="admin_manager"
                    checked={newRole === 'admin_manager'}
                    onChange={() => setNewRole('admin_manager')}
                    className="w-4 h-4 text-green-600"
                  />
                  <div>
                    <div className="font-medium text-gray-900 dark:text-gray-100">
                      {t('users.roles.admin', 'Admin')}
                    </div>
                  </div>
                </label>
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowChangeRoleModal(false);
                  setUserToChangeRole(null);
                }}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                disabled={isChangingRole}
              >
                {t('common.cancel', 'Cancel')}
              </button>
              <button
                onClick={handleChangeRoleConfirm}
                disabled={isChangingRole || newRole === userToChangeRole.role}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
              >
                {isChangingRole ? t('common.saving', 'Saving...') : t('users.confirmRoleChange', 'Change Role')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Phone Number Modal */}
      {showPhoneModal && userToEditPhone && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
              <Phone className="w-5 h-5" />
              {t('users.editPhoneTitle', 'Edit Phone Number')}
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              {t('users.editPhoneFor', 'Edit phone number for user "{{username}}"', { username: userToEditPhone.username })}
            </p>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('users.phoneNumber', 'Phone Number')}
              </label>
              <input
                type="tel"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder={t('users.phonePlaceholder', '+351 912 345 678')}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                {t('users.phoneHint', 'Enter phone number with country code (e.g., +351912345678). Leave empty to remove.')}
              </p>
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowPhoneModal(false);
                  setUserToEditPhone(null);
                }}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                disabled={isSavingPhone}
              >
                {t('common.cancel', 'Cancel')}
              </button>
              <button
                onClick={handleSavePhone}
                disabled={isSavingPhone}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
              >
                {isSavingPhone ? t('common.saving', 'Saving...') : t('common.save', 'Save')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Change Category Modal */}
      {showChangeCategoryModal && userToChangeCategory && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
              <Tag className="w-5 h-5" />
              {t('users.changeCategoryTitle', 'Change Category')}
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              {t('users.changeCategoryFor', 'Change category for user "{{username}}"', { username: userToChangeCategory.username })}
            </p>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('users.selectCategories', 'Select Categories (multiple allowed)')}
              </label>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                {t('users.multipleCategoriesHint', 'Select multiple categories if this agent works in different areas. The AI will detect which category applies to each call.')}
              </p>
              <div className="grid grid-cols-2 gap-2">
                {categories.map((category) => (
                  <div key={category.key} className="relative group">
                    <button
                      type="button"
                      onClick={() => toggleCategorySelection(category.key)}
                      className={`w-full p-3 rounded-lg border-2 transition-all text-sm font-medium ${
                        editSelectedCategories.includes(category.key)
                          ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                          : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                      }`}
                    >
                      <span className={`inline-block px-2 py-0.5 rounded-full text-xs ${category.color_classes}`}>
                        {category.name}
                      </span>
                      {editSelectedCategories.includes(category.key) && (
                        <span className="ml-2 text-green-600">✓</span>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); handleEditCategoryClick(category); }}
                      className="absolute -top-2 right-4 p-1 bg-blue-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                      title={t('users.editCategory', 'Edit Category')}
                    >
                      <Edit2 className="w-3 h-3" />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); handleDeleteCategoryClick(category); }}
                      className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                      title={t('users.deleteCategory', 'Delete Category')}
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
                {/* Add new category button */}
                <button
                  type="button"
                  onClick={() => setShowCreateCategoryModal(true)}
                  className="p-3 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600 hover:border-green-500 dark:hover:border-green-500 transition-all text-sm font-medium flex items-center justify-center gap-2 text-gray-500 hover:text-green-600"
                >
                  <Plus className="w-4 h-4" />
                  {t('users.newCategory', 'New')}
                </button>
              </div>
              {editSelectedCategories.length > 1 && (
                <p className="mt-2 text-xs text-blue-600 dark:text-blue-400">
                  {t('users.multipleCategoriesSelected', '{{count}} categories selected. AI will detect category per call.', { count: editSelectedCategories.length })}
                </p>
              )}
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowChangeCategoryModal(false);
                  setUserToChangeCategory(null);
                }}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                disabled={isChangingCategory}
              >
                {t('common.cancel', 'Cancel')}
              </button>
              <button
                onClick={handleChangeCategoryConfirm}
                disabled={isChangingCategory}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
              >
                {isChangingCategory ? t('common.saving', 'Saving...') : t('users.confirmCategoryChange', 'Change Category')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Category Modal */}
      {showCreateCategoryModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
              <Plus className="w-5 h-5" />
              {t('users.createCategory', 'Create New Category')}
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4 text-sm">
              {t('users.createCategoryDescription', 'This will create a new category with 7 default evaluation criteria.')}
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('users.categoryName', 'Category Name')}
                </label>
                <input
                  type="text"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  placeholder={t('users.categoryNamePlaceholder', 'e.g., Logistics, Quality...')}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 dark:bg-gray-700 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('users.categoryColor', 'Color')}
                </label>
                <div className="flex flex-wrap gap-2">
                  {colorOptions.map((color) => (
                    <button
                      key={color.id}
                      type="button"
                      onClick={() => setNewCategoryColor(color.id)}
                      className={`w-8 h-8 rounded-full ${color.preview || color.bg} border-2 transition-all ${
                        newCategoryColor === color.id
                          ? 'border-gray-900 dark:border-white scale-110 ring-2 ring-offset-2 ring-gray-400 dark:ring-gray-500'
                          : 'border-gray-300 dark:border-gray-600 hover:scale-105 hover:border-gray-400 dark:hover:border-gray-500'
                      }`}
                      title={color.id}
                    />
                  ))}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => {
                  setShowCreateCategoryModal(false);
                  setNewCategoryName('');
                  setNewCategoryColor('pink');
                }}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                disabled={isCreatingCategory}
              >
                {t('common.cancel', 'Cancel')}
              </button>
              <button
                onClick={handleCreateCategory}
                disabled={isCreatingCategory || !newCategoryName.trim()}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
              >
                {isCreatingCategory ? t('common.creating', 'Creating...') : t('users.createCategory', 'Create Category')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Category Modal */}
      {showEditCategoryModal && categoryToEdit && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
              <Edit2 className="w-5 h-5" />
              {t('users.editCategoryTitle', 'Edit Category')}
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('users.categoryName', 'Category Name')}
                </label>
                <input
                  type="text"
                  value={editCategoryName}
                  onChange={(e) => setEditCategoryName(e.target.value)}
                  placeholder={t('users.categoryNamePlaceholder', 'e.g., Logistics, Quality...')}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 dark:bg-gray-700 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('users.categoryColor', 'Color')}
                </label>
                <div className="grid grid-cols-5 gap-2">
                  {colorOptions.map((color) => (
                    <button
                      key={color.id}
                      type="button"
                      onClick={() => setEditCategoryColor(color.id)}
                      className={`w-10 h-10 rounded-lg ${color.preview || color.bg} border-2 transition-all ${
                        editCategoryColor === color.id
                          ? 'border-gray-900 dark:border-white scale-110 ring-2 ring-offset-2 ring-gray-400 dark:ring-gray-500'
                          : 'border-gray-300 dark:border-gray-600 hover:scale-105 hover:border-gray-400 dark:hover:border-gray-500'
                      }`}
                      title={color.id}
                    />
                  ))}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => {
                  setShowEditCategoryModal(false);
                  setCategoryToEdit(null);
                  setEditCategoryName('');
                  setEditCategoryColor('');
                }}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                disabled={isEditingCategory}
              >
                {t('common.cancel', 'Cancel')}
              </button>
              <button
                onClick={handleEditCategoryConfirm}
                disabled={isEditingCategory || !editCategoryName.trim()}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {isEditingCategory ? t('common.saving', 'Saving...') : t('common.save', 'Save')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Category Confirmation Modal */}
      {showDeleteCategoryModal && categoryToDelete && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
              <Trash2 className="w-5 h-5 text-red-500" />
              {t('users.deleteCategoryTitle', 'Delete Category')}
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              {t('users.deleteCategoryConfirm', 'Are you sure you want to delete the category "{{name}}"? This will also delete all criteria associated with this category.', { name: categoryToDelete.name })}
            </p>
            <p className="text-red-500 text-sm mb-4">
              {t('users.deleteCategoryWarning', 'This action cannot be undone.')}
            </p>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowDeleteCategoryModal(false);
                  setCategoryToDelete(null);
                }}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                disabled={isDeletingCategory}
              >
                {t('common.cancel', 'Cancel')}
              </button>
              <button
                onClick={handleDeleteCategoryConfirm}
                disabled={isDeletingCategory}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {isDeletingCategory ? t('common.deleting', 'Deleting...') : t('common.delete', 'Delete')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
