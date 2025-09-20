import React, { useState } from 'react';

export type AppCategory = {
  id: string;
  name: string;
  type: 'app' | 'domain';
  identifier: string;
  label: 'waste' | 'neutral' | 'study';
  active: boolean;
  created_at: string;
  updated_at: string;
};

export interface AppManagementPageProps {
  categories: AppCategory[];
  loading: boolean;
  error: string | null;
  onUpdateCategory: (id: string, label: 'waste' | 'neutral' | 'study') => Promise<void>;
  onToggleActive: (id: string, active: boolean) => Promise<void>;
  // newly discovered from sessions
  discovered?: { type: 'app' | 'domain'; identifier: string; lastSeen: string; count: number }[];
  onAddCategory?: (payload: { name: string; type: 'app' | 'domain'; identifier: string; label?: 'waste' | 'neutral' | 'study' }) => Promise<void>;
  onDeleteCategory?: (id: string) => Promise<void>;
}

export const AppManagementPage: React.FC<AppManagementPageProps> = ({
  categories,
  loading,
  error,
  onUpdateCategory,
  onToggleActive,
  discovered = [],
  onAddCategory,
  onDeleteCategory,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'app' | 'domain'>('all');
  const [filterLabel, setFilterLabel] = useState<'all' | 'waste' | 'neutral' | 'study'>('all');

  const filteredCategories = categories.filter(category => {
    const matchesSearch = category.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         category.identifier.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === 'all' || category.type === filterType;
    const matchesLabel = filterLabel === 'all' || category.label === filterLabel;
    return matchesSearch && matchesType && matchesLabel;
  });

  const getLabelColor = (label: string) => {
    switch (label) {
      case 'waste': return 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20';
      case 'neutral': return 'text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-900/20';
      case 'study': return 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20';
      default: return 'text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-900/20';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500 dark:text-gray-400">Loading app categories...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-red-500 dark:text-red-400">
          <div className="font-semibold">Error loading categories</div>
          <div className="text-sm mt-1">{error}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">App Management</h1>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Search
            </label>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by name or identifier..."
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Type
            </label>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as 'all' | 'app' | 'domain')}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
            >
              <option value="all">All Types</option>
              <option value="app">Applications</option>
              <option value="domain">Domains</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Label
            </label>
            <select
              value={filterLabel}
              onChange={(e) => setFilterLabel(e.target.value as 'all' | 'waste' | 'neutral' | 'study')}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
            >
              <option value="all">All Labels</option>
              <option value="waste">Waste</option>
              <option value="neutral">Neutral</option>
              <option value="study">Study</option>
            </select>
          </div>
        </div>
      </div>

      {/* Categories List */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
        <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
            Applications & Domains ({filteredCategories.length})
          </h3>
        </div>
        
        <div className="divide-y divide-gray-200 dark:divide-gray-700">
          {filteredCategories.length === 0 ? (
            <div className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
              No applications found matching your filters.
            </div>
          ) : (
            filteredCategories.map((category) => {
              const hasInvalidIdentifier = !category.identifier || 
                category.identifier === '(app)' || 
                category.identifier === '(domain)' || 
                category.identifier.length < 2;
              
              return (
                <div 
                  key={category.id} 
                  className={`px-4 py-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 ${
                    hasInvalidIdentifier ? 'border-l-4 border-yellow-400 bg-yellow-50/50 dark:bg-yellow-900/10' : ''
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <div className="flex-shrink-0">
                          <div className={`w-3 h-3 rounded-full ${
                            category.type === 'app' ? 'bg-blue-500' : 'bg-purple-500'
                          }`} />
                        </div>
                        <div>
                          <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100">
                            {category.name}
                            {hasInvalidIdentifier && (
                              <span className="ml-2 text-xs bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200 px-2 py-1 rounded">
                                Invalid Data
                              </span>
                            )}
                          </h4>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {category.identifier} ({category.type})
                          </p>
                        </div>
                      </div>
                    </div>
                  
                    <div className="flex items-center gap-4">
                      {/* Delete */}
                      {onDeleteCategory && (
                        <button
                          onClick={() => onDeleteCategory(category.id)}
                          className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
                          title="Delete category"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      )}
                      
                      {/* Active Toggle */}
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-500 dark:text-gray-400">Active</span>
                        <button
                          onClick={() => onToggleActive(category.id, !category.active)}
                          className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                            category.active ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'
                          }`}
                        >
                          <span
                            className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
                              category.active ? 'translate-x-5' : 'translate-x-1'
                            }`}
                          />
                        </button>
                      </div>

                      {/* Label Selector */}
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-500 dark:text-gray-400">Label</span>
                        <select
                          value={category.label}
                          onChange={(e) => onUpdateCategory(category.id, e.target.value as 'waste' | 'neutral' | 'study')}
                          className="text-xs px-2 py-1 border border-gray-300 dark:border-gray-600 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                        >
                          <option value="neutral">Neutral</option>
                          <option value="waste">Waste</option>
                          <option value="study">Study</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Discovered from sessions */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
        <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
            Discovered (last 30 days)
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400">Not registered yet. Add as Neutral by default.</p>
        </div>
        <div className="divide-y divide-gray-200 dark:divide-gray-700">
          {(!discovered || discovered.length === 0) ? (
            <div className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">No unregistered apps/domains detected.</div>
          ) : (
            discovered.map((d) => (
              <div key={`${d.type}-${d.identifier}`} className="px-4 py-4">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <div className="text-sm font-medium text-gray-900 dark:text-gray-100">{d.identifier}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">{d.type} · last seen {new Date(d.lastSeen).toLocaleString()} · {d.count} sessions</div>
                  </div>
                  {onAddCategory && (
                    <button
                      onClick={() => onAddCategory({ name: d.identifier, type: d.type, identifier: d.identifier, label: 'neutral' })}
                      className="px-3 py-1.5 text-xs rounded bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      Add as Neutral
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Legend */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
        <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-3">Legend</h3>
        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-3">
            <span className={`px-2 py-1 rounded text-xs ${getLabelColor('waste')}`}>
              Waste
            </span>
            <span className="text-gray-600 dark:text-gray-400">Time-wasting activities</span>
          </div>
          <div className="flex items-center gap-3">
            <span className={`px-2 py-1 rounded text-xs ${getLabelColor('neutral')}`}>
              Neutral
            </span>
            <span className="text-gray-600 dark:text-gray-400">Neutral activities</span>
          </div>
          <div className="flex items-center gap-3">
            <span className={`px-2 py-1 rounded text-xs ${getLabelColor('study')}`}>
              Study
            </span>
            <span className="text-gray-600 dark:text-gray-400">Learning & education</span>
          </div>
        </div>
      </div>
    </div>
  );
};