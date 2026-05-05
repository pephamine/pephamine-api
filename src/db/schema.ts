import {
  pgTable,
  uuid,
  text,
  varchar,
  timestamp,
  boolean,
  decimal,
  integer,
  jsonb,
  foreignKey,
  primaryKey,
  index,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Users table
export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: varchar('email', { length: 255 }).unique().notNull(),
  passwordHash: text('password_hash').notNull(),
  firstName: varchar('first_name', { length: 255 }),
  lastName: varchar('last_name', { length: 255 }),
  bio: text('bio'),
  avatarUrl: text('avatar_url'),
  role: varchar('role', { length: 50 }).default('researcher').notNull(),
  isVerified: boolean('is_verified').default(false).notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  emailIdx: index('users_email_idx').on(table.email),
  roleIdx: index('users_role_idx').on(table.role),
}));

// Peptides table
export const peptides = pgTable('peptides', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id),
  name: varchar('name', { length: 255 }).notNull(),
  sequence: text('sequence').notNull(),
  description: text('description'),
  molecularWeight: decimal('molecular_weight', { precision: 10, scale: 4 }),
  properties: jsonb('properties').$type<Record<string, unknown>>(),
  isPublic: boolean('is_public').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  userIdIdx: index('peptides_user_id_idx').on(table.userId),
  nameIdx: index('peptides_name_idx').on(table.name),
}));

// Protocols table
export const protocols = pgTable('protocols', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id),
  peptideId: uuid('peptide_id').references(() => peptides.id),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  steps: jsonb('steps').$type<Array<Record<string, unknown>>>(),
  materials: jsonb('materials').$type<Array<Record<string, unknown>>>(),
  duration: integer('duration'), // in minutes
  isPublic: boolean('is_public').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  userIdIdx: index('protocols_user_id_idx').on(table.userId),
  peptideIdIdx: index('protocols_peptide_id_idx').on(table.peptideId),
}));

// Research Bonds table - relationships between researchers
export const researchBonds = pgTable('research_bonds', {
  id: uuid('id').primaryKey().defaultRandom(),
  initiatorId: uuid('initiator_id').notNull().references(() => users.id),
  collaboratorId: uuid('collaborator_id').notNull().references(() => users.id),
  status: varchar('status', { length: 50 }).default('pending').notNull(), // pending, accepted, rejected, active, inactive
  description: text('description'),
  startDate: timestamp('start_date'),
  endDate: timestamp('end_date'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  initiatorIdx: index('research_bonds_initiator_id_idx').on(table.initiatorId),
  collaboratorIdx: index('research_bonds_collaborator_id_idx').on(table.collaboratorId),
  statusIdx: index('research_bonds_status_idx').on(table.status),
}));

// Data Listings table - marketplace for research data
export const dataListings = pgTable('data_listings', {
  id: uuid('id').primaryKey().defaultRandom(),
  sellerId: uuid('seller_id').notNull().references(() => users.id),
  title: varchar('title', { length: 255 }).notNull(),
  description: text('description').notNull(),
  dataType: varchar('data_type', { length: 100 }).notNull(), // test_results, raw_data, analysis, etc.
  price: decimal('price', { precision: 10, scale: 2 }).notNull(),
  currency: varchar('currency', { length: 3 }).default('USD').notNull(),
  peptideIds: uuid('peptide_ids').$type<string[]>().$default(() => []),
  isActive: boolean('is_active').default(true).notNull(),
  viewCount: integer('view_count').default(0).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  sellerIdIdx: index('data_listings_seller_id_idx').on(table.sellerId),
  dataTypeIdx: index('data_listings_data_type_idx').on(table.dataType),
}));

// Relations
export const usersRelations = relations(users, ({ many, one }) => ({
  peptides: many(peptides),
  protocols: many(protocols),
  initiatedBonds: many(researchBonds, { relationName: 'initiator' }),
  collaboratorBonds: many(researchBonds, { relationName: 'collaborator' }),
  dataListings: many(dataListings),
}));

export const peptidesRelations = relations(peptides, ({ one, many }) => ({
  user: one(users, { fields: [peptides.userId], references: [users.id] }),
  protocols: many(protocols),
}));

export const protocolsRelations = relations(protocols, ({ one }) => ({
  user: one(users, { fields: [protocols.userId], references: [users.id] }),
  peptide: one(peptides, { fields: [protocols.peptideId], references: [peptides.id] }),
}));

export const researchBondsRelations = relations(researchBonds, ({ one }) => ({
  initiator: one(users, {
    fields: [researchBonds.initiatorId],
    references: [users.id],
    relationName: 'initiator',
  }),
  collaborator: one(users, {
    fields: [researchBonds.collaboratorId],
    references: [users.id],
    relationName: 'collaborator',
  }),
}));

export const dataListingsRelations = relations(dataListings, ({ one }) => ({
  seller: one(users, { fields: [dataListings.sellerId], references: [users.id] }),
}));
