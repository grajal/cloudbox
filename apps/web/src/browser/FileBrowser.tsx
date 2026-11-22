import { useState } from 'react';
import { ROOT_ID } from '@cloudbox/shared';
import { FolderView } from './FolderView';

type Crumb = { id: string; name: string };

/**
 * The file browser: breadcrumbs plus the folder you are in.
 * The path lives in memory for now, so a page reload returns to the top level
 * (URL-based navigation comes later).
 */
export function FileBrowser() {
  const [path, setPath] = useState<Crumb[]>([]); // folders from the top level down to the current one
  const folderId = path.at(-1)?.id ?? ROOT_ID;

  return (
    <div className="space-y-4">
      <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-1 text-sm">
        <button
          type="button"
          className="font-medium text-blue-700 hover:underline"
          onClick={() => setPath([])}
        >
          My files
        </button>

        {path.map((crumb, index) => (
          <span key={crumb.id} className="flex items-center gap-1">
            <span aria-hidden="true" className="text-slate-400">
              /
            </span>
            {index === path.length - 1 ? (
              <span aria-current="page" className="font-medium">
                {crumb.name}
              </span>
            ) : (
              <button
                type="button"
                className="font-medium text-blue-700 hover:underline"
                onClick={() => setPath(path.slice(0, index + 1))}
              >
                {crumb.name}
              </button>
            )}
          </span>
        ))}
      </nav>

      {/* key = folderId: moving to another folder starts with a fresh, empty view */}
      <FolderView
        key={folderId}
        folderId={folderId}
        onOpen={(folder) => setPath([...path, { id: folder.id, name: folder.name }])}
      />
    </div>
  );
}
