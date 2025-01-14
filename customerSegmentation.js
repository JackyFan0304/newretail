const db = require('./database');

async function getTargetCustomers(days, minAmount) {
  const query = `
    SELECT c.id, c.name, c.phone, c.email, SUM(t.amount) as total_amount
    FROM customers c
    JOIN transactions t ON c.id = t.customer_id
    WHERE t.transaction_date >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
    GROUP BY c.id
    HAVING total_amount >= ?
  `;
  
  try {
    const [results] = await db.query(query, [days, minAmount]);
    return results;
  } catch (error) {
    console.error('查詢出錯:', error);
    throw error;
  }
}

module.exports = { getTargetCustomers };
