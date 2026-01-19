import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Building2, Users, Phone, Plus, Trash2, X, UserPlus, Copy, Check } from 'lucide-react';
import { companiesApi, usersApi } from '../services/api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Company } from '../types';
import toast from 'react-hot-toast';

export default function Companies() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [companyToDelete, setCompanyToDelete] = useState<Company | null>(null);
  const [newCompanyName, setNewCompanyName] = useState('');
  const [newInviteLimit, setNewInviteLimit] = useState<number>(10);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [companyToInvite, setCompanyToInvite] = useState<Company | null>(null);
  const [inviteLink, setInviteLink] = useState('');
  const [copied, setCopied] = useState(false);

  const { data: companies, isLoading, error } = useQuery({
    queryKey: ['companies'],
    queryFn: companiesApi.getAll,
  });

  const createMutation = useMutation({
    mutationFn: ({ name, invite_limit }: { name: string; invite_limit: number }) =>
      companiesApi.create(name, invite_limit),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['companies'] });
      toast.success(t('companies.createSuccess', 'Company created successfully'));
      setShowCreateModal(false);
      setNewCompanyName('');
      setNewInviteLimit(10);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || t('companies.createError', 'Failed to create company'));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: companiesApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['companies'] });
      toast.success(t('companies.deleteSuccess', 'Company deleted successfully'));
      setShowDeleteModal(false);
      setCompanyToDelete(null);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || t('companies.deleteError', 'Failed to delete company'));
    },
  });

  const inviteMutation = useMutation({
    mutationFn: (companyId: number) => usersApi.invite('admin_manager', companyId),
    onSuccess: (data) => {
      setInviteLink(data.inviteUrl);
      toast.success(t('companies.inviteSuccess', 'Admin invitation created'));
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || t('companies.inviteError', 'Failed to create invitation'));
    },
  });

  const handleCreate = () => {
    if (newCompanyName.trim()) {
      createMutation.mutate({ name: newCompanyName.trim(), invite_limit: newInviteLimit });
    }
  };

  const handleViewUsers = (companyId: number) => {
    navigate(`/users?company_id=${companyId}`);
  };

  const handleViewCalls = (companyId: number) => {
    navigate(`/calls?company_id=${companyId}`);
  };

  const handleDeleteClick = (company: Company) => {
    setCompanyToDelete(company);
    setShowDeleteModal(true);
  };

  const handleDeleteConfirm = () => {
    if (companyToDelete) {
      deleteMutation.mutate(companyToDelete.id);
    }
  };

  const handleInviteClick = (company: Company) => {
    setCompanyToInvite(company);
    setInviteLink('');
    setCopied(false);
    setShowInviteModal(true);
  };

  const handleInvite = () => {
    if (companyToInvite) {
      inviteMutation.mutate(companyToInvite.id);
    }
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(inviteLink);
      setCopied(true);
      toast.success(t('common.copied', 'Copied to clipboard'));
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast.error(t('common.copyError', 'Failed to copy'));
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg">
        {t('common.error')}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            {t('companies.title')}
          </h1>
          <p className="text-gray-500 dark:text-gray-400">
            {t('companies.subtitle')}
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center space-x-2 text-sm text-gray-500 dark:text-gray-400">
            <Building2 className="w-5 h-5" />
            <span>{companies?.length || 0} {t('companies.total')}</span>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            <Plus className="w-5 h-5" />
            {t('companies.create', 'New Company')}
          </button>
        </div>
      </div>

      {/* Companies Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {companies?.map((company: Company) => (
          <Card key={company.id} className="hover:shadow-lg transition-shadow relative group">
            <button
              onClick={() => handleDeleteClick(company)}
              className="absolute top-3 right-3 p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
              title={t('common.delete', 'Delete')}
            >
              <Trash2 className="w-4 h-4" />
            </button>
            <CardHeader className="pb-2">
              <div className="flex items-center space-x-3">
                <div className="flex items-center justify-center w-12 h-12 rounded-full bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400">
                  <Building2 className="w-6 h-6" />
                </div>
                <div>
                  <CardTitle className="text-lg">{company.name}</CardTitle>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {t('companies.usersCount', '{{count}} / {{limit}} users', {
                      count: company.users_count || 0,
                      limit: company.invite_limit || 10
                    })}
                  </p>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2 pt-4 border-t border-gray-100 dark:border-gray-700">
                <button
                  onClick={() => handleInviteClick(company)}
                  className="flex items-center gap-1 px-3 py-1.5 text-sm bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 rounded-lg hover:bg-green-200 dark:hover:bg-green-900/50 transition-colors"
                >
                  <UserPlus className="w-4 h-4" />
                  {t('companies.inviteAdmin', 'Invite Admin')}
                </button>
                <button
                  onClick={() => handleViewUsers(company.id)}
                  className="flex items-center gap-1 px-3 py-1.5 text-sm bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors"
                >
                  <Users className="w-4 h-4" />
                  {t('companies.users', 'Users')}
                </button>
                <button
                  onClick={() => handleViewCalls(company.id)}
                  className="flex items-center gap-1 px-3 py-1.5 text-sm bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 rounded-lg hover:bg-purple-200 dark:hover:bg-purple-900/50 transition-colors"
                >
                  <Phone className="w-4 h-4" />
                  {t('companies.calls', 'Calls')}
                </button>
              </div>
              <div className="mt-4 text-xs text-gray-400">
                {t('companies.created')}: {new Date(company.created_at).toLocaleDateString()}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Empty State */}
      {companies?.length === 0 && (
        <div className="text-center py-12">
          <Building2 className="w-16 h-16 mx-auto text-gray-300 dark:text-gray-600 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
            {t('companies.empty')}
          </h3>
          <p className="text-gray-500 dark:text-gray-400 mb-4">
            {t('companies.emptyDescription')}
          </p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            <Plus className="w-5 h-5" />
            {t('companies.create', 'Create First Company')}
          </button>
        </div>
      )}

      {/* Create Company Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                {t('companies.createTitle', 'Create New Company')}
              </h3>
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setNewCompanyName('');
                  setNewInviteLimit(10);
                }}
                className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('companies.name', 'Company Name')}
              </label>
              <input
                type="text"
                value={newCompanyName}
                onChange={(e) => setNewCompanyName(e.target.value)}
                placeholder={t('companies.namePlaceholder', 'Enter company name...')}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 dark:bg-gray-700 dark:text-white"
                autoFocus
              />
            </div>
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('companies.inviteLimit', 'User Invite Limit')}
              </label>
              <input
                type="number"
                min="1"
                max="1000"
                value={newInviteLimit}
                onChange={(e) => setNewInviteLimit(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 dark:bg-gray-700 dark:text-white"
              />
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                {t('companies.inviteLimitHelp', 'Maximum number of users the admin can invite')}
              </p>
            </div>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setNewCompanyName('');
                  setNewInviteLimit(10);
                }}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                {t('common.cancel', 'Cancel')}
              </button>
              <button
                onClick={handleCreate}
                disabled={!newCompanyName.trim() || createMutation.isPending}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
              >
                {createMutation.isPending ? t('common.creating', 'Creating...') : t('common.create', 'Create')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && companyToDelete && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
              {t('companies.deleteTitle', 'Delete Company')}
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              {t('companies.deleteConfirm', 'Are you sure you want to delete "{{name}}"? This action cannot be undone.', { name: companyToDelete.name })}
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setCompanyToDelete(null);
                }}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                {t('common.cancel', 'Cancel')}
              </button>
              <button
                onClick={handleDeleteConfirm}
                disabled={deleteMutation.isPending}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {deleteMutation.isPending ? t('common.deleting', 'Deleting...') : t('common.delete', 'Delete')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Invite Admin Modal */}
      {showInviteModal && companyToInvite && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                {t('companies.inviteAdminTitle', 'Invite Admin to {{name}}', { name: companyToInvite.name })}
              </h3>
              <button
                onClick={() => {
                  setShowInviteModal(false);
                  setCompanyToInvite(null);
                  setInviteLink('');
                }}
                className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {!inviteLink ? (
              <>
                <p className="text-gray-600 dark:text-gray-400 mb-6">
                  {t('companies.inviteAdminDesc', 'Generate an invitation link for a new admin. The link is single-use and expires in 7 days.')}
                </p>
                <div className="flex justify-end gap-3">
                  <button
                    onClick={() => {
                      setShowInviteModal(false);
                      setCompanyToInvite(null);
                    }}
                    className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                  >
                    {t('common.cancel', 'Cancel')}
                  </button>
                  <button
                    onClick={handleInvite}
                    disabled={inviteMutation.isPending}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                  >
                    {inviteMutation.isPending ? t('common.generating', 'Generating...') : t('companies.generateLink', 'Generate Link')}
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {t('companies.inviteLink', 'Invitation Link')}
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      readOnly
                      value={inviteLink}
                      className="flex-1 px-3 py-2 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-600 dark:text-gray-400"
                    />
                    <button
                      onClick={copyToClipboard}
                      className="px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                    >
                      {copied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                    </button>
                  </div>
                  <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                    {t('companies.inviteLinkNote', 'This link can only be used once and expires in 7 days.')}
                  </p>
                </div>
                <div className="flex justify-end">
                  <button
                    onClick={() => {
                      setShowInviteModal(false);
                      setCompanyToInvite(null);
                      setInviteLink('');
                    }}
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
    </div>
  );
}
