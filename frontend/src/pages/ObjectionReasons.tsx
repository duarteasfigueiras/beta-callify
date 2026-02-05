import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, XCircle, Phone, ExternalLink } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { dashboardApi } from '../services/api';
import { GroupedObjection } from '../types';

export default function ObjectionReasons() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const selectedCategory = searchParams.get('category');

  const [groupedObjections, setGroupedObjections] = useState<GroupedObjection[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchObjections = async () => {
      setIsLoading(true);
      try {
        const data = await dashboardApi.getTopObjections({});
        setGroupedObjections(data);
      } catch (error) {
        console.error('Error fetching objections:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchObjections();
  }, []);

  // If a category is selected, show only that category's objections
  const displayData = selectedCategory
    ? groupedObjections.filter(g => g.category === selectedCategory)
    : groupedObjections;

  const totalObjections = displayData.reduce((sum, g) => sum + g.count, 0);

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
      <div className="flex items-center gap-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate(-1)}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          {t('common.back', 'Voltar')}
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            {selectedCategory || t('reports.topObjections', 'Principais Objeções')}
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            {totalObjections} {t('reports.totalObjections', 'objeções registadas')}
          </p>
        </div>
      </div>

      {/* Categories Grid or Single Category Detail */}
      {selectedCategory ? (
        // Single category detail view
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <XCircle className="w-5 h-5 text-amber-500" />
              {selectedCategory}
              <span className="ml-auto text-sm font-normal text-gray-500">
                {displayData[0]?.count || 0} {t('reports.objections', 'objeções')}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {displayData[0]?.objections.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                {t('common.noResults', 'Sem resultados')}
              </div>
            ) : (
              <div className="space-y-3">
                {displayData[0]?.objections.map((objection, idx) => {
                  const maxCount = Math.max(...(displayData[0]?.objections.map(o => o.count) || [1]), 1);
                  return (
                    <button
                      key={idx}
                      onClick={() => navigate(`/calls?objection=${encodeURIComponent(objection.objection)}`)}
                      className="w-full flex items-center gap-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg hover:bg-amber-50 dark:hover:bg-amber-900/20 hover:border-amber-200 dark:hover:border-amber-800 border border-transparent transition-all cursor-pointer text-left"
                    >
                      <div className="flex-1">
                        <p className="font-medium text-gray-900 dark:text-gray-100">
                          {objection.objection}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                          {t('reports.clickToViewCalls', 'Clica para ver chamadas')}
                        </p>
                      </div>
                      <div className="w-32">
                        <div className="h-2 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-amber-500 transition-all duration-500"
                            style={{ width: `${(objection.count / maxCount) * 100}%` }}
                          />
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200">
                          {objection.count}
                        </span>
                        <ExternalLink className="w-4 h-4 text-gray-400" />
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        // All categories grid view
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {groupedObjections.map((group) => {
            const maxCount = Math.max(...groupedObjections.map(g => g.count), 1);
            return (
              <Card
                key={group.category}
                className="cursor-pointer hover:shadow-lg transition-all hover:scale-[1.02]"
                onClick={() => navigate(`/objection-reasons?category=${encodeURIComponent(group.category)}`)}
              >
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center justify-between text-base">
                    <span className="flex items-center gap-2">
                      <XCircle className="w-4 h-4 text-amber-500" />
                      {group.category}
                    </span>
                    <span className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                      {group.count}
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden mb-3">
                    <div
                      className="h-full bg-amber-500 transition-all duration-500"
                      style={{ width: `${(group.count / maxCount) * 100}%` }}
                    />
                  </div>
                  <div className="space-y-1">
                    {group.objections.slice(0, 3).map((objection, idx) => (
                      <div key={idx} className="flex items-center justify-between text-sm">
                        <span className="text-gray-600 dark:text-gray-400 truncate max-w-[70%]">
                          {objection.objection}
                        </span>
                        <span className="text-gray-500 dark:text-gray-500 font-medium">
                          {objection.count}
                        </span>
                      </div>
                    ))}
                    {group.objections.length > 3 && (
                      <p className="text-xs text-amber-600 dark:text-amber-400 mt-2">
                        +{group.objections.length - 3} {t('common.more', 'mais')}...
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Back to all categories button when viewing single category */}
      {selectedCategory && (
        <div className="flex justify-center">
          <Button
            variant="outline"
            onClick={() => navigate('/objection-reasons')}
            className="flex items-center gap-2"
          >
            <Phone className="w-4 h-4" />
            {t('reports.viewAllCategories', 'Ver todas as categorias')}
          </Button>
        </div>
      )}
    </div>
  );
}
