import { ItemResponse, ListChildrenResponse } from '@cloudbox/shared';
import type { Item } from '@cloudbox/shared';
import { apiRequest } from './client';

/** Contents of a folder; pass "root" for the top level. Folders come first, then by name. */
export const listChildren = async (folderId: string): Promise<Item[]> => {
  const { items } = await apiRequest(
    'GET',
    `/folders/${encodeURIComponent(folderId)}/children`,
    ListChildrenResponse,
  );
  return items;
};

export const createFolder = async (name: string, parentId: string): Promise<Item> => {
  const { item } = await apiRequest('POST', '/folders', ItemResponse, { name, parentId });
  return item;
};

export const renameItem = async (id: string, name: string): Promise<Item> => {
  const { item } = await apiRequest('PATCH', `/items/${encodeURIComponent(id)}`, ItemResponse, {
    name,
  });
  return item;
};
