import { useState } from 'react';
import type { FormEvent } from 'react';
import type { Item } from '@cloudbox/shared';
import { errorText } from '../api/client';
import { renameItem } from '../api/items';
import { buttonPrimary, buttonSecondary, inputClass } from '../ui';

type Props = {
  item: Item;
  onOpen: (folder: Item) => void;
  /** Called after the item changed on the server, so the list can reload. */
  onChanged: () => void;
};

export function ItemRow({ item, onOpen, onChanged }: Props) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(item.name);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function startEditing() {
    setName(item.name);
    setError(null);
    setEditing(true);
  }

  async function save(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await renameItem(item.id, name);
      setEditing(false);
      onChanged();
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <li className="px-4 py-3">
      <div className="flex items-center gap-3">
        <span aria-hidden="true">{item.type === 'FOLDER' ? '📁' : '📄'}</span>

        {editing ? (
          <form onSubmit={(e) => void save(e)} className="flex flex-1 gap-2">
            <input
              aria-label="New name"
              className={`${inputClass} flex-1`}
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={255}
              autoFocus
            />
            <button type="submit" className={buttonPrimary} disabled={busy || !name.trim()}>
              Save
            </button>
            <button
              type="button"
              className={buttonSecondary}
              disabled={busy}
              onClick={() => setEditing(false)}
            >
              Cancel
            </button>
          </form>
        ) : (
          <>
            {item.type === 'FOLDER' ? (
              <button
                type="button"
                className="flex-1 text-left font-medium hover:underline"
                onClick={() => onOpen(item)}
              >
                {item.name}
              </button>
            ) : (
              <span className="flex-1">{item.name}</span>
            )}
            <button type="button" className={buttonSecondary} onClick={startEditing}>
              Rename
            </button>
          </>
        )}
      </div>

      {error && (
        <p role="alert" className="mt-2 text-sm text-red-600">
          {error}
        </p>
      )}
    </li>
  );
}
