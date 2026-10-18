import { z } from 'zod';

export const AiActionEnum = z.enum(['add', 'remove', 'select_table', 'qa', 'none']);
export type AiAction = z.infer<typeof AiActionEnum>;

export const ParsedItemSchema = z.object({
  productId: z.string().min(1, 'productId không được rỗng'),
  productName: z.string().min(1, 'productName không được rỗng'),
  quantity: z.number().int().min(1, 'Số lượng tối thiểu là 1').max(10, 'Số lượng tối đa là 10'),
  note: z.string().optional().default(''),
  size: z.string().optional().default('M'),
  sugar: z.string().optional().default('100%'),
  ice: z.string().optional().default('100% đá'),
  toppings: z.array(z.string()).optional().default([]),
});
export type ParsedItem = z.infer<typeof ParsedItemSchema>;

export const TargetTableSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
}).nullable().optional();
export type TargetTable = z.infer<typeof TargetTableSchema>;

export const AiOutputSchema = z.object({
  action: AiActionEnum,
  targetTable: TargetTableSchema.default(null),
  items: z.array(ParsedItemSchema).default([]),
  message: z.string().default(''),
  isBlocked: z.boolean().optional().default(false),
  blockedReason: z.string().optional().nullable(),
});
export type AiOutput = z.infer<typeof AiOutputSchema>;

export const AuditStatusEnum = z.enum(['previewed', 'confirmed', 'rejected', 'blocked']);
export type AuditStatus = z.infer<typeof AuditStatusEnum>;

export const AuditSourceEnum = z.enum(['rule', 'llm', 'fallback']);
export type AuditSource = z.infer<typeof AuditSourceEnum>;
