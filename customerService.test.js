const { getTargetCustomers, sendMarketingSMS } = require('./customerService');
const db = require('./database');

async function testCustomerFunctions() {
  try {
    // 測試客戶分群功能
    console.log('測試客戶分群功能:');
    const targetCustomers = await getTargetCustomers(30, 500);
    console.log(`符合條件的客戶數量: ${targetCustomers.length}`);
    console.log('客戶範例:', targetCustomers[0]);

    // 測試行銷簡訊功能
    if (targetCustomers.length > 0) {
      console.log('\n測試行銷簡訊功能:');
      const smsTemplate = '親愛的{name}您好,這絕對不是可疑的詐騙廣告,感謝您近期在創新新消費{amount}元,我們有新的優惠活動想邀請您參加...';
      await sendMarketingSMS([targetCustomers[0]], smsTemplate);
      console.log('簡訊發送測試完成');
    }

  } catch (error) {
    console.error('測試過程中發生錯誤:', error);
  } finally {
    // 關閉資料庫連接
    await db.end();
  }
}

testCustomerFunctions();
