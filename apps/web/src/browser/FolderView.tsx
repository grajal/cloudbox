import { useState } from 'react';
import type { FormEvent } from 'react';
import type { Item } from '@cloudbox/shared';
import { errorText } from '../api/client';
import { createFolder } from '../api/items';
import { buttonPrimary, inputClass } from '../ui';
import { ItemRow } from './ItemRow';
import { useChildren } from './useChildren';

type Props = {
  folderId: string;
  onOpen: (folder: Item) => void;
};

/** One folder's contents plus the "new folder" form. Render it with key={folderId}. */
export function FolderView({ folderId, onOpen }: Props) {
  const { state, reload } = useChildren(folderId);
  const [newName, setNewName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCreate(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await createFolder(newName, folderId);
      setNewName('');
      reload();
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <form onSubmit={(e) => void handleCreate(e)} className="flex gap-2">
        <input
          aria-label="New folder name"
          placeholder="New folder name"
          className={`${inputClass} flex-1`}
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          maxLength={255}
        />
        <button type="submit" className={buttonPrimary} disabled={busy || !newName.trim()}>
          Create folder
        </button>
      </form>

      {error && (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}

      {state.status === 'loading' && <p className="text-slate-500">Loading…</p>}

      {state.status === 'error' && (
        <p role="alert" className="text-red-600">
          Could not load this folder: {state.message}
        </p>
      )}

      {state.status === 'ok' &&
        (state.items.length === 0 ? (
          <p className="rounded-lg border border-dashed border-slate-300 p-8 text-center text-slate-500">
            This folder is empty.
          </p>
        ) : (
          <ul className="divide-y divide-slate-200 rounded-lg border border-slate-200 bg-white">
            {state.items.map((item) => (
              <ItemRow key={item.id} item={item} onOpen={onOpen} onChanged={reload} />
            ))}
          </ul>
        ))}
    </div>
  );
}
