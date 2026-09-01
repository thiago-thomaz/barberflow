'use client';

import React, { useState, useMemo } from 'react';
import { Search, ChevronLeft, ChevronRight, SlidersHorizontal, Filter } from 'lucide-react';

export interface Column<T> {
  key: string;
  header: string;
  render?: (row: T) => React.ReactNode;
  align?: 'left' | 'center' | 'right';
  className?: string;
}

export interface FilterOption {
  label: string;
  value: string;
}

export interface AdminDataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  searchPlaceholder?: string;
  searchKey?: keyof T | ((row: T) => string);
  filters?: {
    key: keyof T | ((row: T) => string);
    label: string;
    options: FilterOption[];
  }[];
  actions?: React.ReactNode;
  emptyMessage?: string;
  pageSize?: number;
  isLoading?: boolean;
}

export function AdminDataTable<T extends Record<string, any>>({
  columns,
  data,
  searchPlaceholder = 'Buscar registros...',
  searchKey,
  filters,
  actions,
  emptyMessage = 'Nenhum registro encontrado.',
  pageSize = 10,
  isLoading = false,
}: AdminDataTableProps<T>) {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilters, setActiveFilters] = useState<Record<string, string>>({});
  const [currentPage, setCurrentPage] = useState(1);

  const filteredData = useMemo(() => {
    return data.filter((row) => {
      // 1. Search filter
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase();
        if (typeof searchKey === 'function') {
          const val = searchKey(row).toLowerCase();
          if (!val.includes(query)) return false;
        } else if (searchKey) {
          const val = String(row[searchKey] || '').toLowerCase();
          if (!val.includes(query)) return false;
        } else {
          // General row search across string/number values
          const matched = Object.values(row).some((v) =>
            String(v || '').toLowerCase().includes(query)
          );
          if (!matched) return false;
        }
      }

      // 2. Custom dropdown filters
      if (filters) {
        for (let i = 0; i < filters.length; i++) {
          const f = filters[i];
          const filterKey = typeof f.key === 'string' ? f.key : `filter_${i}`;
          const selectedVal = activeFilters[filterKey];

          if (selectedVal && selectedVal !== 'ALL') {
            const rowVal = typeof f.key === 'function' ? f.key(row) : String(row[f.key] || '');
            if (rowVal !== selectedVal) {
              return false;
            }
          }
        }
      }

      return true;
    });
  }, [data, searchTerm, activeFilters, searchKey, filters]);

  const totalPages = Math.max(1, Math.ceil(filteredData.length / pageSize));
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredData.slice(start, start + pageSize);
  }, [filteredData, currentPage, pageSize]);

  const handleFilterChange = (filterKey: string, value: string) => {
    setActiveFilters((prev) => ({ ...prev, [filterKey]: value }));
    setCurrentPage(1);
  };

  return (
    <div className="rounded-2xl bg-[#0E1118] border border-[#232733] shadow-sm overflow-hidden">
      {/* Controls: Search, Filters, Actions */}
      <div className="p-4 sm:p-5 border-b border-[#232733] flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#0A0D14]/50">
        <div className="flex flex-1 flex-wrap items-center gap-3">
          {/* Search Bar */}
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              placeholder={searchPlaceholder}
              className="w-full rounded-xl bg-[#141824] border border-[#232733] pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 transition-colors"
            />
          </div>

          {/* Filters */}
          {filters &&
            filters.map((f, idx) => {
              const filterKey = typeof f.key === 'string' ? f.key : `filter_${idx}`;
              return (
                <div key={filterKey} className="relative flex items-center">
                  <select
                    value={activeFilters[filterKey] || 'ALL'}
                    onChange={(e) => handleFilterChange(filterKey, e.target.value)}
                    className="rounded-xl bg-[#141824] border border-[#232733] px-3 py-2 text-xs font-semibold text-slate-300 focus:outline-none focus:border-amber-500 transition-colors cursor-pointer"
                  >
                    <option value="ALL">Todos: {f.label}</option>
                    {f.options.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
              );
            })}
        </div>

        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>

      {/* Table Body */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs text-slate-300">
          <thead className="bg-[#141824]/80 text-[11px] font-bold uppercase tracking-wider text-slate-400 border-b border-[#232733]">
            <tr>
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={`px-4 sm:px-5 py-3.5 ${
                    col.align === 'center'
                      ? 'text-center'
                      : col.align === 'right'
                      ? 'text-right'
                      : 'text-left'
                  } ${col.className || ''}`}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#1C202C]">
            {isLoading ? (
              <tr>
                <td colSpan={columns.length} className="px-5 py-12 text-center text-slate-500">
                  <div className="flex items-center justify-center gap-2">
                    <div className="h-4 w-4 rounded-full border-2 border-amber-500 border-t-transparent animate-spin" />
                    <span>Carregando dados...</span>
                  </div>
                </td>
              </tr>
            ) : paginatedData.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-5 py-12 text-center text-slate-500">
                  <p className="font-semibold text-slate-400">{emptyMessage}</p>
                </td>
              </tr>
            ) : (
              paginatedData.map((row, rowIdx) => (
                <tr
                  key={row.id || rowIdx}
                  className="hover:bg-[#141824]/50 transition-colors"
                >
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      className={`px-4 sm:px-5 py-3.5 whitespace-nowrap ${
                        col.align === 'center'
                          ? 'text-center'
                          : col.align === 'right'
                          ? 'text-right'
                          : 'text-left'
                      } ${col.className || ''}`}
                    >
                      {col.render ? col.render(row) : row[col.key] ?? '—'}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      <div className="p-4 sm:p-5 border-t border-[#232733] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400 bg-[#0A0D14]/40">
        <div>
          Exibindo <span className="font-bold text-white">{filteredData.length > 0 ? (currentPage - 1) * pageSize + 1 : 0}</span> a{' '}
          <span className="font-bold text-white">
            {Math.min(currentPage * pageSize, filteredData.length)}
          </span>{' '}
          de <span className="font-bold text-white">{filteredData.length}</span> registros
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage <= 1 || isLoading}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#141824] border border-[#232733] text-slate-300 hover:bg-[#1A1E29] hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Anterior</span>
          </button>

          <span className="px-3 py-1.5 rounded-lg bg-[#0E1118] border border-[#232733] font-mono font-semibold text-amber-400">
            {currentPage} / {totalPages}
          </span>

          <button
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage >= totalPages || isLoading}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#141824] border border-[#232733] text-slate-300 hover:bg-[#1A1E29] hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <span>Próximo</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
