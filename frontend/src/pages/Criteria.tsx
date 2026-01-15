import { useEffect, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Plus, Edit, Trash2, Scale, AlertTriangle } from 'lucide-react';
import { criteriaApi } from '../services/api';
import { Card, CardContent } from '../components/ui/Card';
import toast from 'react-hot-toast';

interface Criterion {
  id: number;
  name: string;
  description: string;
  weight: number;
  is_active: boolean;
  created_at: string;
}

export default function Criteria() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [criteria, setCriteria] = useState<Criterion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingCriterion, setEditingCriterion] = useState<Criterion | null>(null);
  const [formData, setFormData] = useState({ name: '', description: '', weight: 1 });
  const [originalFormData, setOriginalFormData] = useState({ name: '', description: '', weight: 1 });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showUnsavedWarning, setShowUnsavedWarning] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState<string | null>(null);

  // Track if form has unsaved changes
  const isDirty = useCallback(() => {
    if (!showCreateModal && !showEditModal) return false;
    return (
      formData.name !== originalFormData.name ||
      formData.description !== originalFormData.description ||
      formData.weight !== originalFormData.weight
    );
  }, [formData, originalFormData, showCreateModal, showEditModal]);

  // Handle beforeunload for browser navigation/refresh
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty()) {
        e.preventDefault();
        e.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty]);

  // Confirm leaving without saving
  const confirmLeave = useCallback(() => {
    setShowUnsavedWarning(false);
    setShowCreateModal(false);
    setShowEditModal(false);
    setEditingCriterion(null);
    setFormData({ name: '', description: '', weight: 1 });
    setOriginalFormData({ name: '', description: '', weight: 1 });
    if (pendingNavigation) {
      navigate(pendingNavigation);
      setPendingNavigation(null);
    }
  }, [navigate, pendingNavigation]);

  // Cancel leaving
  const cancelLeave = useCallback(() => {
    setShowUnsavedWarning(false);
    setPendingNavigation(null);
  }, []);

  const fetchCriteria = async () => {
    try {
      setIsLoading(true);
      const data = await criteriaApi.getAll();
      setCriteria(data);
    } catch (error) {
      console.error('Error fetching criteria:', error);
      toast.error(t('common.error', 'Failed to load data'));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCriteria();
  }, []);

  const handleCreateCriterion = async () => {
    if (!formData.name.trim()) {
      toast.error(t('criteria.nameRequired', 'Criterion name is required'));
      return;
    }

    try {
      setIsSubmitting(true);
      await criteriaApi.create({
        name: formData.name,
        description: formData.description,
        weight: formData.weight
      });
      toast.success(t('criteria.created', 'Criterion created successfully'));
      setShowCreateModal(false);
      setFormData({ name: '', description: '', weight: 1 });
      fetchCriteria();
    } catch (error) {
      console.error('Error creating criterion:', error);
      toast.error(t('common.error', 'Failed to create criterion'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateCriterion = async () => {
    if (!editingCriterion || !formData.name.trim()) {
      toast.error(t('criteria.nameRequired', 'Criterion name is required'));
      return;
    }

    try {
      setIsSubmitting(true);
      await criteriaApi.update(editingCriterion.id, {
        name: formData.name,
        description: formData.description,
        weight: formData.weight
      });
      toast.success(t('criteria.updated', 'Criterion updated successfully'));
      setShowEditModal(false);
      setEditingCriterion(null);
      setFormData({ name: '', description: '', weight: 1 });
      fetchCriteria();
    } catch (error) {
      console.error('Error updating criterion:', error);
      toast.error(t('common.error', 'Failed to update criterion'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteCriterion = async (id: number) => {
    if (!confirm(t('criteria.confirmDelete', 'Are you sure you want to delete this criterion?'))) {
      return;
    }

    try {
      await criteriaApi.delete(id);
      toast.success(t('criteria.deleted', 'Criterion deleted successfully'));
      fetchCriteria();
    } catch (error) {
      console.error('Error deleting criterion:', error);
      toast.error(t('common.error', 'Failed to delete criterion'));
    }
  };

  const openEditCriterionModal = (criterion: Criterion) => {
    setEditingCriterion(criterion);
    const editForm = {
      name: criterion.name,
      description: criterion.description || '',
      weight: criterion.weight,
    };
    setFormData(editForm);
    setOriginalFormData(editForm);
    setShowEditModal(true);
  };

  const getWeightBadgeColor = (weight: number) => {
    if (weight >= 4) return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
    if (weight >= 3) return 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400';
    if (weight >= 2) return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
    return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
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
            {t('criteria.title', 'Evaluation Criteria')}
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            {t('criteria.subtitle', 'Manage criteria used to evaluate calls')}
          </p>
        </div>
        <button
          onClick={() => {
            const emptyForm = { name: '', description: '', weight: 1 };
            setFormData(emptyForm);
            setOriginalFormData(emptyForm);
            setShowCreateModal(true);
          }}
          className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
        >
          <Plus className="w-5 h-5" />
          {t('criteria.add', 'Add Criterion')}
        </button>
      </div>

      {/* Criteria Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    {t('criteria.name', 'Name')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    {t('criteria.description', 'Description')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    {t('criteria.weight', 'Weight')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    {t('criteria.status', 'Status')}
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    {t('common.actions', 'Actions')}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {criteria.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">
                      {t('criteria.noCriteria', 'No criteria defined yet')}
                    </td>
                  </tr>
                ) : (
                  criteria.map((criterion) => (
                    <tr key={criterion.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <Scale className="w-4 h-4 text-gray-400" />
                          <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                            {criterion.name}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2">
                          {criterion.description || '-'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getWeightBadgeColor(criterion.weight)}`}>
                          {criterion.weight}x
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          criterion.is_active
                            ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                            : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                        }`}>
                          {criterion.is_active ? t('criteria.active', 'Active') : t('criteria.inactive', 'Inactive')}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => openEditCriterionModal(criterion)}
                            className="p-1 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                            title={t('common.edit', 'Edit')}
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteCriterion(criterion.id)}
                            className="p-1 text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                            title={t('common.delete', 'Delete')}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Create Criterion Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                {t('criteria.addTitle', 'Add New Criterion')}
              </h2>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('criteria.name', 'Name')} *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder={t('criteria.namePlaceholder', 'e.g., Greeting Quality')}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('criteria.description', 'Description')}
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  rows={3}
                  placeholder={t('criteria.descriptionPlaceholder', 'Describe what this criterion evaluates...')}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('criteria.weight', 'Weight')} (1-5)
                </label>
                <select
                  value={formData.weight}
                  onChange={(e) => setFormData({ ...formData, weight: Number(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-green-500 focus:border-transparent"
                >
                  <option value={1}>1 - {t('criteria.weightLow', 'Low importance')}</option>
                  <option value={2}>2 - {t('criteria.weightMediumLow', 'Medium-low importance')}</option>
                  <option value={3}>3 - {t('criteria.weightMedium', 'Medium importance')}</option>
                  <option value={4}>4 - {t('criteria.weightMediumHigh', 'Medium-high importance')}</option>
                  <option value={5}>5 - {t('criteria.weightHigh', 'High importance')}</option>
                </select>
              </div>
            </div>
            <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3">
              <button
                onClick={() => {
                  if (isDirty()) {
                    setShowUnsavedWarning(true);
                  } else {
                    setShowCreateModal(false);
                  }
                }}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                disabled={isSubmitting}
              >
                {t('common.cancel', 'Cancel')}
              </button>
              <button
                onClick={handleCreateCriterion}
                disabled={isSubmitting}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
              >
                {isSubmitting ? t('common.saving', 'Saving...') : t('common.create', 'Create')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Criterion Modal */}
      {showEditModal && editingCriterion && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                {t('criteria.editTitle', 'Edit Criterion')}
              </h2>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('criteria.name', 'Name')} *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('criteria.description', 'Description')}
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  rows={3}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('criteria.weight', 'Weight')} (1-5)
                </label>
                <select
                  value={formData.weight}
                  onChange={(e) => setFormData({ ...formData, weight: Number(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-green-500 focus:border-transparent"
                >
                  <option value={1}>1 - {t('criteria.weightLow', 'Low importance')}</option>
                  <option value={2}>2 - {t('criteria.weightMediumLow', 'Medium-low importance')}</option>
                  <option value={3}>3 - {t('criteria.weightMedium', 'Medium importance')}</option>
                  <option value={4}>4 - {t('criteria.weightMediumHigh', 'Medium-high importance')}</option>
                  <option value={5}>5 - {t('criteria.weightHigh', 'High importance')}</option>
                </select>
              </div>
            </div>
            <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3">
              <button
                onClick={() => {
                  if (isDirty()) {
                    setShowUnsavedWarning(true);
                  } else {
                    setShowEditModal(false);
                    setEditingCriterion(null);
                  }
                }}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                disabled={isSubmitting}
              >
                {t('common.cancel', 'Cancel')}
              </button>
              <button
                onClick={handleUpdateCriterion}
                disabled={isSubmitting}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
              >
                {isSubmitting ? t('common.saving', 'Saving...') : t('common.save', 'Save')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Unsaved Changes Warning Dialog */}
      {showUnsavedWarning && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                </div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  {t('common.unsavedChanges', 'Unsaved Changes')}
                </h2>
              </div>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                {t('common.unsavedChangesMessage', 'You have unsaved changes. Are you sure you want to leave this page? Your changes will be lost.')}
              </p>
              <div className="flex justify-end gap-3">
                <button
                  onClick={cancelLeave}
                  className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                  {t('common.stayOnPage', 'Stay on Page')}
                </button>
                <button
                  onClick={confirmLeave}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                >
                  {t('common.leaveWithoutSaving', 'Leave Without Saving')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
