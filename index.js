const { getTargetCustomers } = require('./customerSegmentation');


async function testSegmentation() {
  try {
    const customers = await getTargetCustomers(30, 500);
    console.log('符合條件的客戶:', customers);
  } catch (error) {
    console.error('測試失敗:', error);
  }
}

testSegmentation();