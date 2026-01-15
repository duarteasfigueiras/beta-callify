import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Users as UsersIcon, UserPlus, Trash2, Shield, User as UserIcon, Copy, Link, RefreshCw, AlertCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { usersApi } from '../services/api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { User, UserRole } from '../types';
import toast from 'react-hot-toast';

const MAX_USERS = 5;

export default function Users() {
  const { t } = useTranslation();
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Invite modal state
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteRole, setInviteRole] = useState<UserRole>('agent');
  const [isGeneratingInvite, setIsGeneratingInvite] = useState(false);
  const [inviteResult, setInviteResult] = useState<{ token: string; inviteUrl: string; expiresAt: string } | null>(null);

  // Change role modal state
  const [showChangeRoleModal, setShowChangeRoleModal] = useState(false);
  const [userToChangeRole, setUserToChangeRole] = useState<User | null>(null);
  const [newRole, setNewRole] = useState<UserRole>('agent');
  const [isChangingRole, setIsChangingRole] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, []);

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

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString(currentUser?.language_preference === 'pt' ? 'pt-PT' : 'en-US', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const getRoleBadge = (role: string) => {
    if (role === 'admin_manager') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400">
          <Shield className="w-3 h-3" />
          {t('users.roles.admin', 'Admin')}
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
        <UserIcon className="w-3 h-3" />
        {t('users.roles.agent', 'Agent')}
      </span>
    );
  };

  const handleDeleteClick = (user: User) => {
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

  const handleInviteClick = () => {
    setInviteRole('agent');
    setInviteResult(null);
    setShowInviteModal(true);
  };

  const handleGenerateInvite = async () => {
    setIsGeneratingInvite(true);
    try {
      const result = await usersApi.invite(inviteRole);
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

  const handleChangeRoleClick = (user: User) => {
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-600"></div>
      </div>
    );
  }

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
            const isAtLimit = agentCount >= MAX_USERS;
            return (
              <>
                <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium ${
                  isAtLimit
                    ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                    : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                }`}>
                  <UsersIcon className="w-4 h-4" />
                  {agentCount}/{MAX_USERS} {t('users.usersLabel', 'users')}
                </div>
                <button
                  onClick={handleInviteClick}
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
      {users.filter(u => u.role === 'agent').length >= MAX_USERS && (
        <div className="flex items-center gap-3 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
          <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0" />
          <div>
            <p className="text-sm font-medium text-amber-800 dark:text-amber-300">
              {t('users.limitReachedTitle', 'User limit reached')}
            </p>
            <p className="text-sm text-amber-700 dark:text-amber-400">
              {t('users.limitReachedMessage', 'You have reached the maximum of {{max}} users. Delete an existing user to invite a new one.', { max: MAX_USERS })}
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
                        {getRoleBadge(user.role)}
                      </td>
                      <td className="py-3 px-4 text-gray-600 dark:text-gray-400">
                        {formatDate(user.created_at)}
                      </td>
                      <td className="py-3 px-4 text-right">
                        {user.id !== currentUser?.id && (
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
                          {t('users.roles.agent', 'Agent')}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          {t('users.agentDescription', 'Can view their own calls and performance')}
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
                      {t('users.roles.agent', 'Agent')}
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
    </div>
  );
}
