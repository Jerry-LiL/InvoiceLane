import { sql } from 'drizzle-orm';
import {
  check,
  date,
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';

export const invoiceStatusEnum = pgEnum('invoice_status', ['draft', 'sent', 'paid', 'overdue']);

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const clients = pgTable(
  'clients',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    email: text('email').notNull(),
    company: text('company'),
    address: text('address'),
    phone: text('phone'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index('clients_user_id_idx').on(table.userId)],
);

export const invoices = pgTable(
  'invoices',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    clientId: uuid('client_id')
      .notNull()
      .references(() => clients.id, { onDelete: 'restrict' }),
    number: integer('number').notNull(),
    status: invoiceStatusEnum('status').notNull().default('draft'),
    issueDate: date('issue_date').notNull(),
    dueDate: date('due_date').notNull(),
    taxRateBps: integer('tax_rate_bps').notNull().default(0),
    notes: text('notes'),
    sentAt: timestamp('sent_at', { withTimezone: true }),
    paidAt: timestamp('paid_at', { withTimezone: true }),
    lastReminderAt: timestamp('last_reminder_at', { withTimezone: true }),
    reminderCount: integer('reminder_count').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('invoices_user_number_idx').on(table.userId, table.number),
    index('invoices_user_status_idx').on(table.userId, table.status),
    index('invoices_status_due_idx').on(table.status, table.dueDate),
    check('invoices_tax_rate_bps_range', sql`${table.taxRateBps} >= 0 and ${table.taxRateBps} <= 10000`),
    check('invoices_due_not_before_issue', sql`${table.dueDate} >= ${table.issueDate}`),
    check('invoices_reminder_count_nonnegative', sql`${table.reminderCount} >= 0`),
    check('invoices_number_positive', sql`${table.number} > 0`),
  ],
);

export const lineItems = pgTable(
  'line_items',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    invoiceId: uuid('invoice_id')
      .notNull()
      .references(() => invoices.id, { onDelete: 'cascade' }),
    description: text('description').notNull(),
    quantityHundredths: integer('quantity_hundredths').notNull(),
    unitPriceCents: integer('unit_price_cents').notNull(),
    position: integer('position').notNull(),
  },
  (table) => [
    index('line_items_invoice_id_idx').on(table.invoiceId),
    uniqueIndex('line_items_invoice_position_idx').on(table.invoiceId, table.position),
    check('line_items_quantity_positive', sql`${table.quantityHundredths} > 0`),
    check('line_items_price_nonnegative', sql`${table.unitPriceCents} >= 0`),
    check('line_items_position_nonnegative', sql`${table.position} >= 0`),
  ],
);
