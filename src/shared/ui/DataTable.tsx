import React, { useState, useMemo } from 'react';
import { ArrowUpDown, ArrowUp, ArrowDown, Search } from 'lucide-react';
import { Input } from './Input';

export interface Column<T> {
  key: keyof T | string;
  header: string;
  render?: (row: T) => React.ReactNode;
  sortable?: boolean;
  align?: 'left' | 'right' | 'center';
  width?: string;
}

export interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyExtractor: (row: T) => string;
  searchPlaceholder?: string;
  searchFilter?: (row: T, query: string) => boolean;
  emptyMessage?: string;
  className?: string;
}

export function DataTable<T>({
  columns,
  data,
  keyExtractor,
  searchPlaceholder = 'Search records...',
  searchFilter,
  emptyMessage = 'No records found.',
  className = '',
}: DataTableProps<T>) {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortKey, setSortKey] = useState<keyof T | string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  const filteredData = useMemo(() => {
    if (!searchQuery.trim()) return data;
    if (searchFilter) {
      return data.filter((row) => searchFilter(row, searchQuery.toLowerCase().trim()));
    }
    return data.filter((row) =>
      Object.values(row as Record<string, unknown>).some((val) =>
        String(val ?? '').toLowerCase().includes(searchQuery.toLowerCase().trim())
      )
    );
  }, [data, searchQuery, searchFilter]);

  const sortedData = useMemo(() => {
    if (!sortKey) return filteredData;
    return [...filteredData].sort((a, b) => {
      const aVal = (a as Record<string, unknown>)[sortKey as string];
      const bVal = (b as Record<string, unknown>)[sortKey as string];

      if (aVal === bVal) return 0;
      if (aVal === null || aVal === undefined) return 1;
      if (bVal === null || bVal === undefined) return -1;

      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
      }

      const strA = String(aVal).toLowerCase();
      const strB = String(bVal).toLowerCase();
      return sortDirection === 'asc' ? strA.localeCompare(strB) : strB.localeCompare(strA);
    });
  }, [filteredData, sortKey, sortDirection]);

  const handleSort = (key: keyof T | string) => {
    if (sortKey === key) {
      if (sortDirection === 'asc') {
        setSortDirection('desc');
      } else {
        setSortKey(null);
        setSortDirection('asc');
      }
    } else {
      setSortKey(key);
      setSortDirection('asc');
    }
  };

  return (
    <div className={`space-y-3 ${className}`}>
      {searchFilter && (
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <Input
            placeholder={searchPlaceholder}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 text-xs"
          />
        </div>
      )}

      <div className="border border-slate-200 rounded-lg overflow-hidden bg-white">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-700 font-semibold uppercase tracking-wider">
                {columns.map((col) => {
                  const isSorted = sortKey === col.key;
                  const alignClass =
                    col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left';

                  return (
                    <th
                      key={String(col.key)}
                      style={{ width: col.width }}
                      className={`px-4 py-3 ${alignClass} whitespace-nowrap`}
                    >
                      {col.sortable ? (
                        <button
                          type="button"
                          onClick={() => handleSort(col.key)}
                          className="inline-flex items-center gap-1 hover:text-slate-900 cursor-pointer"
                        >
                          <span>{col.header}</span>
                          {isSorted ? (
                            sortDirection === 'asc' ? (
                              <ArrowUp className="h-3 w-3 text-blue-600" />
                            ) : (
                              <ArrowDown className="h-3 w-3 text-blue-600" />
                            )
                          ) : (
                            <ArrowUpDown className="h-3 w-3 text-slate-400" />
                          )}
                        </button>
                      ) : (
                        col.header
                      )}
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sortedData.length === 0 ? (
                <tr>
                  <td
                    colSpan={columns.length}
                    className="px-4 py-8 text-center text-slate-500 font-medium"
                  >
                    {emptyMessage}
                  </td>
                </tr>
              ) : (
                sortedData.map((row) => (
                  <tr
                    key={keyExtractor(row)}
                    className="hover:bg-slate-50 transition-colors"
                  >
                    {columns.map((col) => {
                      const alignClass =
                        col.align === 'right'
                          ? 'text-right tabular-nums'
                          : col.align === 'center'
                          ? 'text-center'
                          : 'text-left';

                      const content = col.render
                        ? col.render(row)
                        : String((row as Record<string, unknown>)[col.key as string] ?? '—');

                      return (
                        <td
                          key={String(col.key)}
                          className={`px-4 py-2.5 text-slate-800 ${alignClass}`}
                        >
                          {content}
                        </td>
                      );
                    })}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
