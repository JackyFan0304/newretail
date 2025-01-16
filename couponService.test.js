const { claimCoupon, validateCoupon, getUserCoupons } = require('./couponService');
const db = require('./database');

// 模擬用戶和優惠券ID
const userId = 1;
const couponId = 1;

async function runTests() {
  try {
    // 測試領取優惠券
    console.log('測試領取優惠券:');
    const claimResult = await claimCoupon(userId, couponId);
    console.log(claimResult);

    // 測試驗證優惠券
    console.log('\n測試驗證優惠券:');
    const validateResult = await validateCoupon(userId, couponId);
    console.log(validateResult);

    // 測試獲取用戶優惠券
    console.log('\n測試獲取用戶優惠券:');
    const userCoupons = await getUserCoupons(userId);
    console.log(userCoupons);

  } catch (error) {
    console.error('測試過程中發生錯誤:', error);
  } finally {
    // 關閉資料庫連接
    await db.end();
  }
}

runTests();
