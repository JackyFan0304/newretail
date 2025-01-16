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

function generateSMSContent(template, customer) {
    return template.replace('{name}', customer.name)
                   .replace('{amount}', customer.total_amount);
  }
  
  async function sendMarketingSMS(customers, template) {
    for (const customer of customers) {
      const message = generateSMSContent(template, customer);
      // 這裡模擬發送簡訊的過程
      console.log(`發送簡訊給 ${customer.name}: ${message}`);
      // 實際應用中,這裡應該調用簡訊服務的API
    }
  }

module.exports = { getTargetCustomers, sendMarketingSMS };
