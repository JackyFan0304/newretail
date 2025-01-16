const { getTargetCustomers, sendMarketingSMS } = require('./customerService');

async function runMarketingCampaign() {
  try {
    const targetCustomers = await getTargetCustomers(30, 500);
    if (targetCustomers.length > 0) {
      const smsTemplate = '親愛的{name}您好,這絕對不是可疑的詐騙廣告,感謝您近期在創新新消費{amount}元,我們有新的優惠活動想邀請您參加...';
      await sendMarketingSMS(targetCustomers, smsTemplate);
      console.log(`成功發送簡訊給 ${targetCustomers.length} 位客戶`);
    } else {
      console.log('無符合條件的客戶');
    }
  } catch (error) {
    console.error('行銷活動執行失敗:', error);
  }
}

runMarketingCampaign();
