'use client';

import { useState } from 'react';
import { ChevronUpIcon, ChevronDownIcon, ChevronsUpDownIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface Column<T> {
  key: string;
  header: string;
  cell: (row: T) => React.ReactNode;
  sortable?: boolean;
  width?: string;
}

interface DataTableProps<T> {
  readonly columns: Column<T>[];
  readonly data: T[];
  readonly keyExtractor: (row: T) => string;
  readonly className?: string;
  readonly caption?: string;
}

type SortDir = 'asc' | 'desc' | null;

export function DataTable<T>({
  columns,
  data,
  keyExtractor,
  className,
  caption,
}: DataTableProps<T>) {
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>(null);

  const handleSort = (key: string) => {
    if (sortKey !== key) {
      setSortKey(key);
      setSortDir('asc');
    } else if (sortDir === 'asc') {
      setSortDir('desc');
    } else {
      setSortKey(null);
      setSortDir(null);
    }
  };

  return (
    <div className={cn('w-full overflow-x-auto rounded-lg border border-border', className)}>
      <table className="w-full text-sm" aria-label={caption}>
        {caption && <caption className="sr-only">{caption}</caption>}
        <thead className="bg-muted/50">
          <tr>
            {columns.map((col) => (
              <th
                key={col.key}
                scope="col"
                className={cn(
                  'px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide',
                  col.sortable && 'cursor-pointer hover:text-foreground select-none',
                  col.width,
                )}
                onClick={col.sortable ? () => handleSort(col.key) : undefined}
                aria-sort={
                  sortKey === col.key
                    ? sortDir === 'asc'
                      ? 'ascending'
                      : 'descending'
                    : col.sortable
                    ? 'none'
                    : undefined
                }
              >
                <span className="inline-flex items-center gap-1">
                  {col.header}
                  {col.sortable && (
                    <span aria-hidden="true">
                      {sortKey === col.key ? (
                        sortDir === 'asc' ? (
                          <ChevronUpIcon className="h-3.5 w-3.5" />
                        ) : (
                          <ChevronDownIcon className="h-3.5 w-3.5" />
                        )
                      ) : (
                        <ChevronsUpDownIcon className="h-3.5 w-3.5 opacity-40" />
                      )}
                    </span>
                  )}
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {data.map((row) => (
            <tr
              key={keyExtractor(row)}
              className="hover:bg-muted/30 transition-colors"
            >
              {columns.map((col) => (
                <td key={col.key} className="px-4 py-3 text-foreground">
                  {col.cell(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
