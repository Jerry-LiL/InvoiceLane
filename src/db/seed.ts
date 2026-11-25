import 'dotenv/config';
import { eq } from 'drizzle-orm';
import { addDays, appToday } from '../lib/dates';
import { hashPassword } from '../lib/passwords';
import { closeDb, getDb } from './index';
import { clients, invoices, lineItems, users } from './schema';

const demoEmail = 'demo@invoicelane.dev';

async function main() {
  const db = getDb();
  const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.email, demoEmail)).limit(1);
  if (existing) {
    console.log(`${demoEmail} already exists. Leaving the database as it is.`);
    return;
  }

  const password = process.env.SEED_PASSWORD ?? 'invoicelane-demo';
  const passwordHash = await hashPassword(password);
  const today = appToday();
  const now = new Date();
  const daysAgo = (days: number) => new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

  await db.transaction(async (tx) => {
    const [user] = await tx
      .insert(users)
      .values({ name: 'Demo User', email: demoEmail, passwordHash })
      .returning();

    const [ada] = await tx
      .insert(clients)
      .values({
        userId: user.id,
        name: 'Ada Ortega',
        email: 'ada@northwind.example',
        company: 'Northwind Studio',
        address: '18 Harbor Street\nPortland, OR 97201',
        phone: '503-555-0148',
      })
      .returning();
    const [samir] = await tx
      .insert(clients)
      .values({
        userId: user.id,
        name: 'Samir Shah',
        email: 'samir@lumen.example',
        company: 'Lumen & Co',
        address: '400 Market Street\nSan Francisco, CA 94105',
      })
      .returning();
    const [priya] = await tx
      .insert(clients)
      .values({
        userId: user.id,
        name: 'Priya Nair',
        email: 'priya@harbor.example',
        company: 'Harbor Goods',
        address: '9 Wharf Lane\nSeattle, WA 98104',
      })
      .returning();

    const [draft] = await tx
      .insert(invoices)
      .values({
        userId: user.id,
        clientId: ada.id,
        number: 1001,
        status: 'draft',
        issueDate: today,
        dueDate: addDays(today, 14),
        taxRateBps: 825,
        notes: 'Thank you for the spring catalog work.',
      })
      .returning();
    await tx.insert(lineItems).values([
      {
        invoiceId: draft.id,
        position: 0,
        description: 'Catalog design',
        quantityHundredths: 100,
        unitPriceCents: 180_000,
      },
      {
        invoiceId: draft.id,
        position: 1,
        description: 'Press check on site',
        quantityHundredths: 250,
        unitPriceCents: 12_000,
      },
    ]);

    const [upcoming] = await tx
      .insert(invoices)
      .values({
        userId: user.id,
        clientId: samir.id,
        number: 1002,
        status: 'sent',
        issueDate: today,
        dueDate: addDays(today, 7),
        taxRateBps: 0,
        sentAt: now,
        lastReminderAt: now,
        notes: 'Workshop booked for the brand team.',
      })
      .returning();
    await tx.insert(lineItems).values({
      invoiceId: upcoming.id,
      position: 0,
      description: 'Brand workshop',
      quantityHundredths: 100,
      unitPriceCents: 240_000,
    });

    const [pastDue] = await tx
      .insert(invoices)
      .values({
        userId: user.id,
        clientId: priya.id,
        number: 1003,
        status: 'sent',
        issueDate: addDays(today, -10),
        dueDate: addDays(today, -1),
        taxRateBps: 0,
        sentAt: daysAgo(10),
        lastReminderAt: daysAgo(10),
      })
      .returning();
    await tx.insert(lineItems).values({
      invoiceId: pastDue.id,
      position: 0,
      description: 'Freight audit',
      quantityHundredths: 300,
      unitPriceCents: 45_000,
    });

    const [overdue] = await tx
      .insert(invoices)
      .values({
        userId: user.id,
        clientId: ada.id,
        number: 1004,
        status: 'overdue',
        issueDate: addDays(today, -20),
        dueDate: addDays(today, -12),
        taxRateBps: 0,
        sentAt: daysAgo(20),
        lastReminderAt: daysAgo(6),
        reminderCount: 1,
      })
      .returning();
    await tx.insert(lineItems).values({
      invoiceId: overdue.id,
      position: 0,
      description: 'Catalog reprint',
      quantityHundredths: 400,
      unitPriceCents: 8_500,
    });

    const [paid] = await tx
      .insert(invoices)
      .values({
        userId: user.id,
        clientId: samir.id,
        number: 1005,
        status: 'paid',
        issueDate: addDays(today, -40),
        dueDate: addDays(today, -20),
        taxRateBps: 0,
        sentAt: daysAgo(40),
        paidAt: daysAgo(18),
        lastReminderAt: daysAgo(40),
      })
      .returning();
    await tx.insert(lineItems).values({
      invoiceId: paid.id,
      position: 0,
      description: 'Logo suite',
      quantityHundredths: 100,
      unitPriceCents: 90_000,
    });
  });

  console.log(`Seeded ${demoEmail}. The password is the SEED_PASSWORD value.`);
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await closeDb();
  });
