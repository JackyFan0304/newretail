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
    return results || []; // 確保返回空陣列而不是 null
  } catch (error) {
    console.error('查詢出錯:', error.message);
    throw new Error(`無法獲取目標客戶: ${error.message}`);
  }
}

function generateSMSContent(template, customer) {
  if (!template.includes('{name}') || !template.includes('{total_amount}')) {
    throw new Error('模板格式錯誤，必須包含 {name} 和 {total_amount}');
  }
  
  return template.replace('{name}', customer.name)
                 .replace('{total_amount}', customer.total_amount.toLocaleString('en-US', { style: 'currency', currency: 'USD' }));
}

async function sendMarketingSMS(customers, template) {
  const sendPromises = customers.map(async (customer) => {
    const message = generateSMSContent(template, customer);
    console.log(`發送簡訊給 ${customer.name}: ${message}`);
    // 在此調用實際簡訊 API 發送
  });

  try {
    await Promise.all(sendPromises); // 並行發送簡訊
    console.log('所有簡訊已成功發送');
  } catch (error) {
    console.error('發送簡訊過程中出現錯誤:', error.message);
  }
}

module.exports = { getTargetCustomers, sendMarketingSMS };
