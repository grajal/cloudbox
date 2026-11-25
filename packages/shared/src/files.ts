import { z } from 'zod';
import { Item, ItemName, ParentId, ROOT_ID } from './items.js';

// 100 MB max file size to upload
export const MAX_FILE_SIZE = 100 * 1024 * 1024;

// POST /files
export const CreateUploadRequest = z.object({
  name: ItemName,
  parentId: ParentId.default(ROOT_ID),
  size: z.int().min(1, 'File cannot be empty').max(MAX_FILE_SIZE, 'File must be 100 MB or smaller'),
  contentType: z.string().min(1, 'File type is required').max(255),
});

// POST /files --> response 201
export const CreateUploadResponse = z.object({
  item: Item,
  upload: z.object({
    url: z.url('Must be a valid URL'),
    fields: z.record(z.string(), z.string()),
  }),
});
