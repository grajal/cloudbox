import { z } from 'zod';

/** Virtual parent of every top-level item. There is no stored record for it. */
export const ROOT_ID = 'root';

export const ItemId = z.uuid();
/** Where an item lives: the virtual root or a folder's id. */
export const ParentId = z.union([z.literal(ROOT_ID), ItemId]);

const ItemName = z
  .string()
  .trim()
  .min(1, 'Name cannot be empty')
  .max(255, 'Name must be 255 characters or fewer')
  .refine((name) => !name.includes('/'), 'Name cannot contain "/"');

export const ItemType = z.enum(['FOLDER', 'FILE']);

/** A folder or a file as the API returns it (the storage keys are an internal detail). */
export const Item = z.object({
  id: ItemId,
  type: ItemType,
  name: z.string(),
  parentId: ParentId,
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});
export type Item = z.infer<typeof Item>;

// POST /folders
export const CreateFolderRequest = z.object({
  name: ItemName,
  parentId: ParentId.default(ROOT_ID),
});

// PATCH /items/{id}
export const RenameItemRequest = z.object({ name: ItemName });

export const ItemResponse = z.object({ item: Item });
export const ListChildrenResponse = z.object({ items: z.array(Item) });
