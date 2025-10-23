import postgres from "postgres";
import {
  CustomerField,
  CustomersTableType,
  InvoiceForm,
  InvoicesTable,
  LatestInvoiceRaw,
  Revenue,
} from "./definitions";
import { formatCurrency } from "./utils";

/**
 * Lazy DB initialization:
 * - only create the postgres client when POSTGRES_URL is present
 * - this prevents build-time attempts to connect to 127.0.0.1:5432 on Vercel build machines
 */
let sqlClient: ReturnType<typeof postgres> | null = null;
function getSql() {
  if (!process.env.POSTGRES_URL) return null;
  if (!sqlClient) {
    // Create client once (reused across imports)
    sqlClient = postgres(process.env.POSTGRES_URL, { ssl: "require" });
  }
  return sqlClient;
}

/* --------------------------
   Helper safe fallbacks
   -------------------------- */
const SAFE_EMPTY_REVENUE: Revenue[] = [];
const SAFE_EMPTY_INVOICES: LatestInvoiceRaw[] = [];
const SAFE_CARD_DATA = {
  numberOfCustomers: 0,
  numberOfInvoices: 0,
  totalPaidInvoices: formatCurrency(0),
  totalPendingInvoices: formatCurrency(0),
};

/* --------------------------
   Data functions (defensive)
   -------------------------- */

export async function fetchRevenue(): Promise<Revenue[]> {
  const sql = getSql();
  if (!sql) {
    console.warn(
      "fetchRevenue: POSTGRES_URL not set — returning empty revenue."
    );
    return SAFE_EMPTY_REVENUE;
  }

  try {
    const data = await sql<Revenue[]>`SELECT * FROM revenue`;
    return data ?? SAFE_EMPTY_REVENUE;
  } catch (error) {
    console.error("Database Error (fetchRevenue):", error);
    return SAFE_EMPTY_REVENUE;
  }
}

export async function fetchLatestInvoices() {
  const sql = getSql();
  if (!sql) {
    console.warn(
      "fetchLatestInvoices: POSTGRES_URL not set — returning empty latest invoices."
    );
    return SAFE_EMPTY_INVOICES;
  }

  try {
    const data = await sql<LatestInvoiceRaw[]>`
      SELECT invoices.amount, customers.name, customers.image_url, customers.email, invoices.id
      FROM invoices
      JOIN customers ON invoices.customer_id = customers.id
      ORDER BY invoices.date DESC
      LIMIT 5
    `;

    const latestInvoices = (data ?? []).map((invoice) => ({
      ...invoice,
      amount: formatCurrency(invoice.amount),
    }));
    return latestInvoices;
  } catch (error) {
    console.error("Database Error (fetchLatestInvoices):", error);
    return SAFE_EMPTY_INVOICES;
  }
}

export async function fetchCardData() {
  const sql = getSql();
  if (!sql) {
    console.warn(
      "fetchCardData: POSTGRES_URL not set — returning safe card data."
    );
    return SAFE_CARD_DATA;
  }

  try {
    const invoiceCountPromise = sql`SELECT COUNT(*) FROM invoices`;
    const customerCountPromise = sql`SELECT COUNT(*) FROM customers`;
    const invoiceStatusPromise = sql`SELECT
         SUM(CASE WHEN status = 'paid' THEN amount ELSE 0 END) AS "paid",
         SUM(CASE WHEN status = 'pending' THEN amount ELSE 0 END) AS "pending"
         FROM invoices`;

    const data = await Promise.all([
      invoiceCountPromise,
      customerCountPromise,
      invoiceStatusPromise,
    ]);

    const numberOfInvoices = Number(data[0]?.[0]?.count ?? 0);
    const numberOfCustomers = Number(data[1]?.[0]?.count ?? 0);
    const totalPaidInvoices = formatCurrency(Number(data[2]?.[0]?.paid ?? 0));
    const totalPendingInvoices = formatCurrency(
      Number(data[2]?.[0]?.pending ?? 0)
    );

    return {
      numberOfCustomers,
      numberOfInvoices,
      totalPaidInvoices,
      totalPendingInvoices,
    };
  } catch (error) {
    console.error("Database Error (fetchCardData):", error);
    return SAFE_CARD_DATA;
  }
}

const ITEMS_PER_PAGE = 6;
export async function fetchFilteredInvoices(
  query: string,
  currentPage: number
) {
  const sql = getSql();
  if (!sql) {
    console.warn(
      "fetchFilteredInvoices: POSTGRES_URL not set — returning empty page of invoices."
    );
    return [] as InvoicesTable[];
  }

  const offset = (currentPage - 1) * ITEMS_PER_PAGE;

  try {
    const invoices = await sql<InvoicesTable[]>`
      SELECT
        invoices.id,
        invoices.amount,
        invoices.date,
        invoices.status,
        customers.name,
        customers.email,
        customers.image_url
      FROM invoices
      JOIN customers ON invoices.customer_id = customers.id
      WHERE
        customers.name ILIKE ${`%${query}%`} OR
        customers.email ILIKE ${`%${query}%`} OR
        invoices.amount::text ILIKE ${`%${query}%`} OR
        invoices.date::text ILIKE ${`%${query}%`} OR
        invoices.status ILIKE ${`%${query}%`}
      ORDER BY invoices.date DESC
      LIMIT ${ITEMS_PER_PAGE} OFFSET ${offset}
    `;

    return invoices ?? [];
  } catch (error) {
    console.error("Database Error (fetchFilteredInvoices):", error);
    return [];
  }
}

export async function fetchInvoicesPages(query: string) {
  const sql = getSql();
  if (!sql) {
    console.warn(
      "fetchInvoicesPages: POSTGRES_URL not set — returning 0 total pages."
    );
    return 0;
  }

  try {
    const data = await sql`
      SELECT COUNT(*) FROM invoices
      JOIN customers ON invoices.customer_id = customers.id
      WHERE
        customers.name ILIKE ${`%${query}%`} OR
        customers.email ILIKE ${`%${query}%`} OR
        invoices.amount::text ILIKE ${`%${query}%`} OR
        invoices.date::text ILIKE ${`%${query}%`} OR
        invoices.status ILIKE ${`%${query}%`}
    `;

    const totalPages = Math.ceil(
      Number(data?.[0]?.count ?? 0) / ITEMS_PER_PAGE
    );
    return totalPages;
  } catch (error) {
    console.error("Database Error (fetchInvoicesPages):", error);
    return 0;
  }
}

export async function fetchInvoiceById(id: string) {
  const sql = getSql();
  if (!sql) {
    console.warn(
      "fetchInvoiceById: POSTGRES_URL not set — returning undefined invoice."
    );
    return undefined;
  }

  try {
    const data = await sql<InvoiceForm[]>`
      SELECT
        invoices.id,
        invoices.customer_id,
        invoices.amount,
        invoices.status
      FROM invoices
      WHERE invoices.id = ${id};
    `;

    const invoice = (data ?? []).map((invoice) => ({
      ...invoice,
      // Convert amount from cents to dollars
      amount: invoice.amount / 100,
    }));

    return invoice[0];
  } catch (error) {
    console.error("Database Error (fetchInvoiceById):", error);
    return undefined;
  }
}

export async function fetchCustomers() {
  const sql = getSql();
  if (!sql) {
    console.warn(
      "fetchCustomers: POSTGRES_URL not set — returning empty customers."
    );
    return [] as CustomerField[];
  }

  try {
    const customers = await sql<CustomerField[]>`
      SELECT
        id,
        name
      FROM customers
      ORDER BY name ASC
    `;

    return customers ?? [];
  } catch (err) {
    console.error("Database Error (fetchCustomers):", err);
    return [];
  }
}

export async function fetchFilteredCustomers(query: string) {
  const sql = getSql();
  if (!sql) {
    console.warn(
      "fetchFilteredCustomers: POSTGRES_URL not set — returning empty customer table."
    );
    return [] as CustomersTableType[];
  }

  try {
    const data = await sql<CustomersTableType[]>`
      SELECT
        customers.id,
        customers.name,
        customers.email,
        customers.image_url,
        COUNT(invoices.id) AS total_invoices,
        SUM(CASE WHEN invoices.status = 'pending' THEN invoices.amount ELSE 0 END) AS total_pending,
        SUM(CASE WHEN invoices.status = 'paid' THEN invoices.amount ELSE 0 END) AS total_paid
      FROM customers
      LEFT JOIN invoices ON customers.id = invoices.customer_id
      WHERE
        customers.name ILIKE ${`%${query}%`} OR
        customers.email ILIKE ${`%${query}%`}
      GROUP BY customers.id, customers.name, customers.email, customers.image_url
      ORDER BY customers.name ASC
    `;

    const customers = (data ?? []).map((customer) => ({
      ...customer,
      total_pending: formatCurrency(Number(customer.total_pending ?? 0)),
      total_paid: formatCurrency(Number(customer.total_paid ?? 0)),
    }));

    return customers;
  } catch (err) {
    console.error("Database Error (fetchFilteredCustomers):", err);
    return [];
  }
}
