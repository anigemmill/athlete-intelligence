import { sql } from "drizzle-orm";
import { db } from "@workspace/db";

export class StripeStorage {
  async listProductsWithPrices() {
    const result = await db.execute(sql`
      WITH paginated_products AS (
        SELECT id, name, description, metadata, active
        FROM stripe.products
        WHERE active = true
        ORDER BY name
      )
      SELECT
        p.id AS product_id,
        p.name AS product_name,
        p.description AS product_description,
        p.active AS product_active,
        p.metadata AS product_metadata,
        pr.id AS price_id,
        pr.unit_amount,
        pr.currency,
        pr.recurring,
        pr.active AS price_active
      FROM paginated_products p
      LEFT JOIN stripe.prices pr ON pr.product = p.id AND pr.active = true
      ORDER BY p.name, pr.unit_amount
    `);
    return result.rows;
  }

  async getProduct(productId: string) {
    const result = await db.execute(sql`SELECT * FROM stripe.products WHERE id = ${productId}`);
    return result.rows[0] ?? null;
  }

  async getPrice(priceId: string) {
    const result = await db.execute(sql`SELECT * FROM stripe.prices WHERE id = ${priceId}`);
    return result.rows[0] ?? null;
  }

  async getCustomerByEmail(email: string) {
    const result = await db.execute(
      sql`SELECT * FROM stripe.customers WHERE email = ${email} AND deleted = false ORDER BY created DESC LIMIT 1`,
    );
    return result.rows[0] ?? null;
  }

  async getSubscriptionByCustomer(customerId: string) {
    const result = await db.execute(
      sql`SELECT * FROM stripe.subscriptions WHERE customer = ${customerId} ORDER BY created DESC LIMIT 1`,
    );
    return result.rows[0] ?? null;
  }
}

export const stripeStorage = new StripeStorage();
