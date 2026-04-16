'use client';

import { useState, useRef } from 'react';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import {
  FolderIcon,
  FileIcon,
  UploadIcon,
  TrashIcon,
  DownloadIcon,
  LoaderIcon,
  ChevronRightIcon,
} from 'lucide-react';
import { useFolders, useFiles, useUploadFile, useDeleteFile } from '@/hooks/use-files';
import { LoadingSkeleton } from '@/components/ui/loading-spinner';
import { ErrorMessage } from '@/components/ui/error-message';
import { EmptyState } from '@/components/ui/empty-state';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { GLASS } from '@/lib/design-tokens';
import { cn } from '@/lib/utils';

interface Folder {
  id: string;
  name: string;
  parentId: string | null;
  children?: Folder[];
}

interface FileItem {
  id: string;
  name: string;
  size: number;
  url: string;
  ownerName: string;
  createdAt: string;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function FilesPage() {
  const [selectedFolderId, setSelectedFolderId] = useState<string | undefined>(undefined);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: folders, isLoading: foldersLoading } = useFolders();
  const { data: files, isLoading: filesLoading, error: filesError, refetch: refetchFiles } = useFiles(selectedFolderId);
  const { mutateAsync: uploadFile, isPending: isUploading } = useUploadFile();
  const { mutateAsync: deleteFile, isPending: isDeleting } = useDeleteFile();

  const folderList = (folders as Folder[] | undefined) ?? [];
  const fileList = (files as FileItem[] | undefined) ?? [];

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      await uploadFile({ file, folderId: selectedFolderId });
    } catch {
      // 에러는 React Query가 처리
    }
    // 입력 초기화
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-foreground">파일 드라이브</h1>
          <p className="text-sm text-muted-foreground mt-0.5">팀 파일을 업로드하고 공유합니다.</p>
        </div>
        <div>
          <input
            ref={fileInputRef}
            type="file"
            className="sr-only"
            id="file-upload-input"
            onChange={handleFileChange}
            aria-label="파일 업로드"
          />
          <label
            htmlFor="file-upload-input"
            className={cn(
              'inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground cursor-pointer hover:bg-primary/90 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              isUploading && 'opacity-50 cursor-not-allowed',
            )}
          >
            {isUploading ? (
              <LoaderIcon className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <UploadIcon className="h-4 w-4" aria-hidden="true" />
            )}
            {isUploading ? '업로드 중...' : '파일 업로드'}
          </label>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* 폴더 트리 */}
        <aside className={cn(GLASS.card, 'p-4')} aria-label="폴더 목록">
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">폴더</h2>
          {foldersLoading ? (
            <LoadingSkeleton rows={4} />
          ) : !folderList.length ? (
            <p className="text-sm text-muted-foreground">폴더 없음</p>
          ) : (
            <nav aria-label="폴더 탐색">
              <button
                onClick={() => setSelectedFolderId(undefined)}
                className={cn('w-full flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-accent transition-colors text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring', !selectedFolderId && 'bg-primary/10 text-primary')}
                aria-current={!selectedFolderId ? 'true' : undefined}
              >
                <FolderIcon className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
                전체 파일
              </button>
              {folderList.map((folder) => (
                <button
                  key={folder.id}
                  onClick={() => setSelectedFolderId(folder.id)}
                  className={cn('w-full flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-accent transition-colors text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring mt-0.5', selectedFolderId === folder.id && 'bg-primary/10 text-primary')}
                  aria-current={selectedFolderId === folder.id ? 'true' : undefined}
                >
                  <FolderIcon className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
                  {folder.name}
                </button>
              ))}
            </nav>
          )}
        </aside>

        {/* 파일 목록 */}
        <section className={cn(GLASS.card, 'lg:col-span-3 overflow-hidden')} aria-labelledby="files-heading">
          <div className="flex items-center gap-2 px-4 py-3 border-b border-border/50">
            <FolderIcon className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
            <ChevronRightIcon className="h-3 w-3 text-muted-foreground" aria-hidden="true" />
            <h2 id="files-heading" className="text-sm font-medium text-foreground">
              {selectedFolderId
                ? folderList.find((f) => f.id === selectedFolderId)?.name ?? '폴더'
                : '전체 파일'}
            </h2>
          </div>

          {filesLoading ? (
            <div className="p-4"><LoadingSkeleton rows={5} /></div>
          ) : filesError ? (
            <ErrorMessage message="파일 목록을 불러오지 못했습니다." onRetry={() => refetchFiles()} />
          ) : !fileList.length ? (
            <EmptyState
              icon={FileIcon}
              title="파일 없음"
              message="이 폴더에 파일이 없습니다. 파일을 업로드해보세요."
            />
          ) : (
            <table className="w-full text-sm" aria-label="파일 목록">
              <thead className="bg-muted/50">
                <tr>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">파일명</th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase hidden md:table-cell">크기</th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase hidden sm:table-cell">업로드</th>
                  <th scope="col" className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase">작업</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {fileList.map((file) => (
                  <tr key={file.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <FileIcon className="h-4 w-4 text-muted-foreground flex-shrink-0" aria-hidden="true" />
                        <span className="font-medium text-foreground truncate max-w-[180px]">{file.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell text-muted-foreground text-xs">
                      {formatFileSize(file.size)}
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell text-muted-foreground text-xs">
                      <div>{file.ownerName}</div>
                      <div>{format(new Date(file.createdAt), 'yyyy.MM.dd', { locale: ko })}</div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <a
                          href={`${process.env.NEXT_PUBLIC_API_URL ?? ''}/api/files/${file.id}/download`}
                          className="rounded-md p-1.5 text-muted-foreground hover:text-foreground hover:bg-accent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                          aria-label={`"${file.name}" 다운로드`}
                          download
                        >
                          <DownloadIcon className="h-4 w-4" aria-hidden="true" />
                        </a>
                        <button
                          onClick={() => setDeleteTarget(file.id)}
                          className="rounded-md p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                          aria-label={`"${file.name}" 삭제`}
                        >
                          <TrashIcon className="h-4 w-4" aria-hidden="true" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      </div>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="파일 삭제"
        description="이 파일을 삭제하시겠습니까? 삭제된 파일은 복구할 수 없습니다."
        confirmLabel="삭제"
        variant="destructive"
        isLoading={isDeleting}
        onConfirm={async () => {
          if (!deleteTarget) return;
          await deleteFile(deleteTarget);
          setDeleteTarget(null);
        }}
      />
    </div>
  );
}
