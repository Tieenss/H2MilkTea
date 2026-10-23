import { z } from 'zod';

export const AiActionEnum = z.enum(['add', 'remove', 'select_table', 'qa', 'none']);
export type AiAction = z.infer<typeof AiActionEnum>;

export const ParsedItemSchema = z.object({
  productId: z.string().optional().default(''),
  productName: z.string().min(1, 'productName không được rỗng'),
  quantity: z.coerce.number().int().min(1, 'Số lượng tối thiểu là 1').max(10, 'Số lượng tối đa là 10').catch(1),
  note: z.string().optional().default(''),
  size: z.string().optional().default('M'),
  sugar: z.string().optional().default('100%'),
  ice: z.string().optional().default('100% đá'),
  toppings: z.preprocess((val) => {
    if (Array.isArray(val)) return val.map(String).filter(Boolean);
    if (typeof val === 'string' && val.trim()) return val.split(',').map((s) => s.trim()).filter(Boolean);
    return [];
  }, z.array(z.string()).default([])),
});
export type ParsedItem = z.infer<typeof ParsedItemSchema>;

export const TargetTableSchema = z.preprocess((val) => {
  if (!val) return null;
  if (typeof val === 'string') {
    const trimmed = val.trim();
    return trimmed ? { id: trimmed, name: trimmed } : null;
  }
  if (typeof val === 'object' && val !== null) {
    const obj = val as Record<string, unknown>;
    const id = String(obj.id || obj.name || '').trim();
    const name = String(obj.name || obj.id || '').trim();
    return id && name ? { id, name } : null;
  }
  return null;
}, z.object({
  id: z.string().min(1),
  name: z.string().min(1),
}).nullable().optional());
export type TargetTable = z.infer<typeof TargetTableSchema>;

export const AiOutputSchema = z.object({
  action: z.preprocess((val) => {
    const str = String(val || '').toLowerCase().trim();
    if (['add', 'remove', 'select_table', 'qa', 'none'].includes(str)) return str;
    return 'none';
  }, AiActionEnum),
  targetTable: TargetTableSchema.default(null),
  items: z.preprocess((val) => {
    if (Array.isArray(val)) return val;
    if (typeof val === 'object' && val !== null) return [val];
    return [];
  }, z.array(ParsedItemSchema).default([])),
  message: z.preprocess((val) => (val ? String(val) : ''), z.string().default('')),
  isBlocked: z.boolean().optional().default(false),
  blockedReason: z.string().optional().nullable(),
});
export type AiOutput = z.infer<typeof AiOutputSchema>;

export const AuditStatusEnum = z.enum(['previewed', 'confirmed', 'rejected', 'blocked']);
export type AuditStatus = z.infer<typeof AuditStatusEnum>;

export const AuditSourceEnum = z.enum(['rule', 'llm', 'fallback']);
export type AuditSource = z.infer<typeof AuditSourceEnum>;
