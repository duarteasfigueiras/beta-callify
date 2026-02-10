import { useEffect, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Plus, Edit, Trash2, Scale, Users, Tag, Bell, Clock, MessageSquare, TrendingDown, Save, ToggleLeft, ToggleRight, Globe, AlertTriangle } from 'lucide-react';
import { criteriaApi, alertSettingsApi, AlertSettings, categoriesApi, Category } from '../services/api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import toast from 'react-hot-toast';

interface Criterion {
  id: number;
  name: string;
  description: string;
  weight: number;
  is_active: boolean;
  category: string;
  created_at: string;
}

// Tab type
type TabType = 'criteria' | 'alerts';

// Hardcoded limits
const MAX_CRITERIA_PER_CATEGORY = 8;
const MAX_DESCRIPTION_CHARS = 150;

export default function Criteria() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  // Active tab state
  const [activeTab, setActiveTab] = useState<TabType>('criteria');

  // Criteria state
  const [criteria, setCriteria] = useState<Criterion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingCriterion, setEditingCriterion] = useState<Criterion | null>(null);
  const [formData, setFormData] = useState({ name: '', description: '', weight: 1, category: '' });
  const [originalFormData, setOriginalFormData] = useState({ name: '', description: '', weight: 1, category: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showUnsavedWarning, setShowUnsavedWarning] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState<string | null>(null);
  const [filterCategory, setFilterCategory] = useState<string>('show_all');

  // Categories state (dynamic from backend)
  const [categories, setCategories] = useState<Category[]>([]);

  // Alert settings state
  const [alertSettings, setAlertSettings] = useState<AlertSettings | null>(null);
  const [isLoadingAlerts, setIsLoadingAlerts] = useState(false);
  const [isSavingAlerts, setIsSavingAlerts] = useState(false);
  const [riskWordsInput, setRiskWordsInput] = useState('');

  // Track if form has unsaved changes
  const isDirty = useCallback(() => {
    if (!showCreateModal && !showEditModal) return false;
    return (
      formData.name !== originalFormData.name ||
      formData.description !== originalFormData.description ||
      formData.weight !== originalFormData.weight ||
      formData.category !== originalFormData.category
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
    const defaultCategory = categories[0]?.key || '';
    setFormData({ name: '', description: '', weight: 1, category: defaultCategory });
    setOriginalFormData({ name: '', description: '', weight: 1, category: defaultCategory });
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

  const fetchCategories = async () => {
    try {
      const data = await categoriesApi.getAll();
      setCategories(data);
      // Set default category for forms if not set
      if (data.length > 0 && !formData.category) {
        setFormData(prev => ({ ...prev, category: data[0].key }));
        setOriginalFormData(prev => ({ ...prev, category: data[0].key }));
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const fetchAlertSettings = async () => {
    try {
      setIsLoadingAlerts(true);
      const data = await alertSettingsApi.get();
      setAlertSettings(data);
      setRiskWordsInput(data.risk_words_list || '');
    } catch (error) {
      console.error('Error fetching alert settings:', error);
      toast.error(t('alertSettings.fetchError', 'Failed to load alert settings'));
    } finally {
      setIsLoadingAlerts(false);
    }
  };

  useEffect(() => {
    fetchCriteria();
    fetchCategories();
  }, []);

  // Fetch alert settings when switching to alerts tab
  useEffect(() => {
    if (activeTab === 'alerts') {
      fetchAlertSettings();
    }
  }, [activeTab]);

  const handleSaveAlertSettings = async () => {
    if (!alertSettings) {
      console.error('No alert settings to save');
      return;
    }

    try {
      setIsSavingAlerts(true);
      console.log('Saving alert settings:', { ...alertSettings, risk_words_list: riskWordsInput });
      const updatedSettings = await alertSettingsApi.update({
        ...alertSettings,
        risk_words_list: riskWordsInput
      });
      console.log('Updated settings received:', updatedSettings);
      setAlertSettings(updatedSettings);
      setRiskWordsInput(updatedSettings.risk_words_list || '');
      toast.success(t('alertSettings.saved', 'Alert settings saved successfully'));
    } catch (error: any) {
      console.error('Error saving alert settings:', error);
      toast.error(t('alertSettings.saveError', 'Failed to save alert settings'));
    } finally {
      setIsSavingAlerts(false);
    }
  };

  const toggleAlertSetting = (key: keyof AlertSettings) => {
    if (!alertSettings) return;
    setAlertSettings({
      ...alertSettings,
      [key]: !alertSettings[key]
    });
  };

  const handleCreateCriterion = async () => {
    if (!formData.name.trim()) {
      toast.error(t('criteria.nameRequired', 'Criterion name is required'));
      return;
    }
    if (!formData.category) {
      toast.error(t('criteria.categoryRequired', 'Category is required'));
      return;
    }

    // Check if category already has max criteria
    const criteriaInCategory = criteria.filter(c => c.category === formData.category).length;
    if (criteriaInCategory >= MAX_CRITERIA_PER_CATEGORY) {
      toast.error(t('criteria.maxCriteriaReached', `Máximo de ${MAX_CRITERIA_PER_CATEGORY} critérios por categoria atingido`));
      return;
    }

    try {
      setIsSubmitting(true);
      await criteriaApi.create({
        name: formData.name,
        description: formData.description,
        weight: formData.weight,
        category: formData.category
      });
      toast.success(t('criteria.created', 'Criterion created successfully'));
      setShowCreateModal(false);
      const defaultCategory = categories[0]?.key || '';
      setFormData({ name: '', description: '', weight: 1, category: defaultCategory });
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
    if (!formData.category) {
      toast.error(t('criteria.categoryRequired', 'Category is required'));
      return;
    }

    try {
      setIsSubmitting(true);
      await criteriaApi.update(editingCriterion.id, {
        name: formData.name,
        description: formData.description,
        weight: formData.weight,
        category: formData.category
      });
      toast.success(t('criteria.updated', 'Criterion updated successfully'));
      setShowEditModal(false);
      setEditingCriterion(null);
      const defaultCategory = categories[0]?.key || '';
      setFormData({ name: '', description: '', weight: 1, category: defaultCategory });
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
      category: criterion.category || categories[0]?.key || '',
    };
    setFormData(editForm);
    setOriginalFormData(editForm);
    setShowEditModal(true);
  };

  // Get category info for display (from dynamic categories)
  const getCategoryInfo = (categoryKey: string) => {
    // Special case for "all" (global criteria)
    if (categoryKey === 'all') {
      return {
        name: t('criteria.categoryAll', 'Todos'),
        color_classes: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
      };
    }
    const category = categories.find(c => c.key === categoryKey);
    if (category) {
      return {
        name: category.name,
        color_classes: category.color_classes,
      };
    }
    // Fallback for unknown categories
    return {
      name: categoryKey,
      color_classes: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
    };
  };

  // Filter criteria based on selected category
  const filteredCriteria = filterCategory === 'show_all'
    ? criteria
    : criteria.filter(c => c.category === filterCategory);

  const getWeightBadgeColor = (weight: number) => {
    if (weight >= 4) return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
    if (weight >= 3) return 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400';
    if (weight >= 2) return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
    return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
  };

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
        {activeTab === 'criteria' && (
          <button
            onClick={() => {
              const defaultCategory = categories[0]?.key || '';
              const emptyForm = { name: '', description: '', weight: 1, category: defaultCategory };
              setFormData(emptyForm);
              setOriginalFormData(emptyForm);
              setShowCreateModal(true);
            }}
            className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            <Plus className="w-5 h-5" />
            {t('criteria.add', 'Add Criterion')}
          </button>
        )}
      </div>

      {/* Main Tabs: Criteria vs Alerts */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="-mb-px flex gap-4">
          <button
            onClick={() => setActiveTab('criteria')}
            className={`flex items-center gap-2 py-3 px-1 border-b-2 text-sm font-medium transition-colors ${
              activeTab === 'criteria'
                ? 'border-green-500 text-green-600 dark:text-green-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
            }`}
          >
            <Scale className="w-4 h-4" />
            {t('criteria.tabCriteria', 'Critérios de Avaliação')}
          </button>
          <button
            onClick={() => setActiveTab('alerts')}
            className={`flex items-center gap-2 py-3 px-1 border-b-2 text-sm font-medium transition-colors ${
              activeTab === 'alerts'
                ? 'border-green-500 text-green-600 dark:text-green-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
            }`}
          >
            <Bell className="w-4 h-4" />
            {t('criteria.tabAlerts', 'Configuração de Alertas')}
          </button>
        </nav>
      </div>

      {/* ALERTS TAB CONTENT */}
      {activeTab === 'alerts' && (
        <div className="space-y-6">
          {isLoadingAlerts ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-600"></div>
            </div>
          ) : alertSettings ? (
            <>
              {/* Low Score Alert */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <TrendingDown className="w-5 h-5 text-red-500" />
                      {t('alertSettings.lowScore', 'Alerta de Pontuação Baixa')}
                    </div>
                    <button
                      onClick={() => toggleAlertSetting('low_score_enabled')}
                      className={`p-1 rounded-lg transition-colors ${alertSettings.low_score_enabled ? 'text-green-600' : 'text-gray-400'}`}
                    >
                      {alertSettings.low_score_enabled ? <ToggleRight className="w-8 h-8" /> : <ToggleLeft className="w-8 h-8" />}
                    </button>
                  </CardTitle>
                </CardHeader>
                <CardContent className={alertSettings.low_score_enabled ? '' : 'opacity-50'}>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                    {t('alertSettings.lowScoreDesc', 'Gera um alerta quando a pontuação de uma chamada é inferior ao limite definido.')}
                  </p>
                  <div className="flex items-center gap-4">
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      {t('alertSettings.threshold', 'Limite')}:
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="10"
                      step="0.5"
                      value={alertSettings.low_score_threshold}
                      onChange={(e) => setAlertSettings({ ...alertSettings, low_score_threshold: parseFloat(e.target.value) || 0 })}
                      disabled={!alertSettings.low_score_enabled}
                      className="w-24 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-green-500 disabled:opacity-50"
                    />
                    <span className="text-sm text-gray-500 dark:text-gray-400">/ 10</span>
                  </div>
                </CardContent>
              </Card>

              {/* Risk Words Alert */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <MessageSquare className="w-5 h-5 text-yellow-500" />
                      {t('alertSettings.riskWords', 'Alerta de Palavras de Risco')}
                    </div>
                    <button
                      onClick={() => toggleAlertSetting('risk_words_enabled')}
                      className={`p-1 rounded-lg transition-colors ${alertSettings.risk_words_enabled ? 'text-green-600' : 'text-gray-400'}`}
                    >
                      {alertSettings.risk_words_enabled ? <ToggleRight className="w-8 h-8" /> : <ToggleLeft className="w-8 h-8" />}
                    </button>
                  </CardTitle>
                </CardHeader>
                <CardContent className={alertSettings.risk_words_enabled ? '' : 'opacity-50'}>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                    {t('alertSettings.riskWordsDesc', 'Gera um alerta quando palavras de risco são detetadas na transcrição da chamada.')}
                  </p>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      {t('alertSettings.wordsList', 'Lista de Palavras')} ({t('alertSettings.commaSeparated', 'separadas por vírgula')}):
                    </label>
                    <textarea
                      value={riskWordsInput}
                      onChange={(e) => setRiskWordsInput(e.target.value)}
                      disabled={!alertSettings.risk_words_enabled}
                      rows={4}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-green-500 disabled:opacity-50"
                      placeholder="cancelar, reclamação, advogado, insatisfeito..."
                    />
                    <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                      {t('alertSettings.riskWordsHint', 'Atual:')} {riskWordsInput.split(',').filter(w => w.trim()).length} {t('alertSettings.words', 'palavras')}
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Long Duration Alert */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Clock className="w-5 h-5 text-blue-500" />
                      {t('alertSettings.longDuration', 'Alerta de Duração Excessiva')}
                    </div>
                    <button
                      onClick={() => toggleAlertSetting('long_duration_enabled')}
                      className={`p-1 rounded-lg transition-colors ${alertSettings.long_duration_enabled ? 'text-green-600' : 'text-gray-400'}`}
                    >
                      {alertSettings.long_duration_enabled ? <ToggleRight className="w-8 h-8" /> : <ToggleLeft className="w-8 h-8" />}
                    </button>
                  </CardTitle>
                </CardHeader>
                <CardContent className={alertSettings.long_duration_enabled ? '' : 'opacity-50'}>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                    {t('alertSettings.longDurationDesc', 'Gera um alerta quando uma chamada excede a duração máxima definida.')}
                  </p>
                  <div className="flex items-center gap-4">
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      {t('alertSettings.maxDuration', 'Duração Máxima')}:
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="120"
                      value={alertSettings.long_duration_threshold_minutes}
                      onChange={(e) => setAlertSettings({ ...alertSettings, long_duration_threshold_minutes: parseInt(e.target.value) || 1 })}
                      disabled={!alertSettings.long_duration_enabled}
                      className="w-24 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-green-500 disabled:opacity-50"
                    />
                    <span className="text-sm text-gray-500 dark:text-gray-400">{t('common.min', 'minutos')}</span>
                  </div>
                </CardContent>
              </Card>

              {/* No Next Step Alert */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="w-5 h-5 text-purple-500" />
                      {t('alertSettings.noNextStep', 'Alerta de Próximo Passo')}
                    </div>
                    <button
                      onClick={() => toggleAlertSetting('no_next_step_enabled')}
                      className={`p-1 rounded-lg transition-colors ${alertSettings.no_next_step_enabled ? 'text-green-600' : 'text-gray-400'}`}
                    >
                      {alertSettings.no_next_step_enabled ? <ToggleRight className="w-8 h-8" /> : <ToggleLeft className="w-8 h-8" />}
                    </button>
                  </CardTitle>
                </CardHeader>
                <CardContent className={alertSettings.no_next_step_enabled ? '' : 'opacity-50'}>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {t('alertSettings.noNextStepDesc', 'Gera um alerta quando não é possível identificar um próximo passo claro na chamada.')}
                  </p>
                </CardContent>
              </Card>

              {/* Save Button */}
              <div className="flex justify-end">
                <button
                  onClick={handleSaveAlertSettings}
                  disabled={isSavingAlerts}
                  className="inline-flex items-center gap-2 px-6 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  {isSavingAlerts ? t('common.saving', 'A guardar...') : t('alertSettings.save', 'Guardar Configurações')}
                </button>
              </div>
            </>
          ) : (
            <div className="text-center text-gray-500 dark:text-gray-400 py-8">
              {t('alertSettings.loadError', 'Não foi possível carregar as configurações de alertas')}
            </div>
          )}
        </div>
      )}

      {/* CRITERIA TAB CONTENT */}
      {activeTab === 'criteria' && (
        <>
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-600"></div>
            </div>
          ) : (
            <>
              {/* Category Filter Tabs */}
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setFilterCategory('show_all')}
                  className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    filterCategory === 'show_all'
                      ? 'bg-green-600 text-white'
                      : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  <Users className="w-4 h-4" />
                  {t('criteria.showAll', 'Mostrar Todos')}
                </button>
                {/* "Todos" tab for global criteria (category: all) */}
                <button
                  onClick={() => setFilterCategory('all')}
                  className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    filterCategory === 'all'
                      ? 'bg-green-600 text-white'
                      : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  <Globe className="w-4 h-4" />
                  {t('criteria.categoryAll', 'Todos')}
                </button>
                {categories.map((cat) => (
                  <button
                    key={cat.key}
                    onClick={() => setFilterCategory(cat.key)}
                    className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                      filterCategory === cat.key
                        ? 'bg-green-600 text-white'
                        : `${cat.color_classes} hover:opacity-80`
                    }`}
                  >
                    <Tag className="w-4 h-4" />
                    {cat.name}
                  </button>
                ))}
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
                    {t('criteria.category', 'Category')}
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
                {filteredCriteria.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">
                      {t('criteria.noCriteria', 'No criteria defined yet')}
                    </td>
                  </tr>
                ) : (
                  filteredCriteria.map((criterion) => {
                    const catInfo = getCategoryInfo(criterion.category);
                    return (
                      <tr key={criterion.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <Scale className="w-4 h-4 text-gray-400" />
                            <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                              {criterion.name}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${catInfo.color_classes}`}>
                            <Tag className="w-3 h-3" />
                            {catInfo.name}
                          </span>
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
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
            </>
          )}
        </>
      )}

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
                  onChange={(e) => setFormData({ ...formData, description: e.target.value.slice(0, MAX_DESCRIPTION_CHARS) })}
                  maxLength={MAX_DESCRIPTION_CHARS}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  rows={3}
                  placeholder={t('criteria.descriptionPlaceholder', 'Describe what this criterion evaluates...')}
                />
                <p className={`mt-1 text-xs ${formData.description.length >= MAX_DESCRIPTION_CHARS ? 'text-red-500' : 'text-gray-500 dark:text-gray-400'}`}>
                  {formData.description.length}/{MAX_DESCRIPTION_CHARS} {t('criteria.characters', 'caracteres')}
                </p>
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
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('criteria.applyTo', 'Categoria')} *
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {/* "Todos" option for global criteria */}
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, category: 'all' })}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg border-2 transition-all ${
                      formData.category === 'all'
                        ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                        : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                    }`}
                  >
                    <Globe className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                    <span className="inline-block px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300">
                      {t('criteria.categoryAll', 'Todos')}
                    </span>
                  </button>
                  {categories.map((cat) => {
                    const isSelected = formData.category === cat.key;
                    return (
                      <button
                        key={cat.key}
                        type="button"
                        onClick={() => setFormData({ ...formData, category: cat.key })}
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg border-2 transition-all ${
                          isSelected
                            ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                            : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                        }`}
                      >
                        <span className={`inline-block px-2 py-0.5 rounded-full text-xs ${cat.color_classes}`}>
                          {cat.name}
                        </span>
                      </button>
                    );
                  })}
                </div>
                <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                  {t('criteria.categoryHelpAll', 'Selecione "Todos" para aplicar a todas as categorias, ou escolha uma categoria específica')}
                </p>
                {formData.category && (
                  <p className={`mt-1 text-xs ${criteria.filter(c => c.category === formData.category).length >= MAX_CRITERIA_PER_CATEGORY ? 'text-red-500 font-medium' : 'text-gray-500 dark:text-gray-400'}`}>
                    {criteria.filter(c => c.category === formData.category).length}/{MAX_CRITERIA_PER_CATEGORY} {t('criteria.criteriaInCategory', 'critérios nesta categoria')}
                  </p>
                )}
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
                disabled={isSubmitting || !formData.category || criteria.filter(c => c.category === formData.category).length >= MAX_CRITERIA_PER_CATEGORY}
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
                  onChange={(e) => setFormData({ ...formData, description: e.target.value.slice(0, MAX_DESCRIPTION_CHARS) })}
                  maxLength={MAX_DESCRIPTION_CHARS}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  rows={3}
                />
                <p className={`mt-1 text-xs ${formData.description.length >= MAX_DESCRIPTION_CHARS ? 'text-red-500' : 'text-gray-500 dark:text-gray-400'}`}>
                  {formData.description.length}/{MAX_DESCRIPTION_CHARS} {t('criteria.characters', 'caracteres')}
                </p>
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
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('criteria.applyTo', 'Categoria')} *
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {/* "Todos" option for global criteria */}
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, category: 'all' })}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg border-2 transition-all ${
                      formData.category === 'all'
                        ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                        : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                    }`}
                  >
                    <Globe className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                    <span className="inline-block px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300">
                      {t('criteria.categoryAll', 'Todos')}
                    </span>
                  </button>
                  {categories.map((cat) => {
                    const isSelected = formData.category === cat.key;
                    return (
                      <button
                        key={cat.key}
                        type="button"
                        onClick={() => setFormData({ ...formData, category: cat.key })}
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg border-2 transition-all ${
                          isSelected
                            ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                            : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                        }`}
                      >
                        <span className={`inline-block px-2 py-0.5 rounded-full text-xs ${cat.color_classes}`}>
                          {cat.name}
                        </span>
                      </button>
                    );
                  })}
                </div>
                <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                  {t('criteria.categoryHelpAll', 'Selecione "Todos" para aplicar a todas as categorias, ou escolha uma categoria específica')}
                </p>
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
                disabled={isSubmitting || !formData.category}
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
