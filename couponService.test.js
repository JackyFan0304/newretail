const Redis = require('ioredis');
const { claimCoupon, validateCoupon, getUserCoupons } = require('./couponService');
const db = require('./database');

const redis = new Redis({
  host: 'localhost',
  port: 6379
});

// 模擬用戶和優惠券ID
const userId = 1;
const couponId = 1;

async function initializeCoupon() {
  await redis.set(`coupon_quantity:${couponId}`, 2);
}

async function runTests() {
  try {
    // 初始化測試數據
    console.log('初始化優惠券數量為 2');
    await redis.del(`coupon_quantity:${couponId}`);
    await initializeCoupon();

    // 測試單用戶領取優惠券
    console.log('\n測試單用戶領取優惠券:');
    const result1 = await claimCoupon(userId, couponId);
    console.log(result1);

    // 檢查剩餘數量
    const remainingQuantity = await redis.get(`coupon_quantity:${couponId}`);
    console.log('剩餘優惠券數量:', remainingQuantity);

    // 測試優惠券驗證
    console.log('\n測試優惠券驗證:');
    const validationResult = await validateCoupon(userId, couponId);
    console.log('驗證結果:', validationResult);

    // 測試獲取用戶優惠券
    console.log('\n測試獲取用戶優惠券:');
    const userCoupons = await getUserCoupons(userId);
    console.log('用戶優惠券:', userCoupons);

    // 測試錯誤處理
    console.log('\n測試錯誤處理:');
    try {
      await claimCoupon(userId, 999); // 不存在的優惠券ID
    } catch (error) {
      console.log('領取不存在的優惠券:', error.message);
    }

    // 測試併發領取
    console.log('\n測試併發領取:');
    await simulateUsers(5);

    // 測試邊界條件
    console.log('\n測試邊界條件:');
    await redis.set(`coupon_quantity:${couponId}`, 1);
    const edgeCaseResult1 = await claimCoupon(userId + 1, couponId);
    console.log('優惠券數量為1時領取結果:', edgeCaseResult1);
    const edgeCaseResult2 = await claimCoupon(userId + 2, couponId);
    console.log('優惠券數量為0時領取結果:', edgeCaseResult2);

    // 測試Redis緩存
    console.log('\n測試Redis緩存:');
    const cachedCoupons = await redis.get(`user_coupons:${userId}`);
    console.log('Redis緩存的用戶優惠券:', cachedCoupons ? JSON.parse(cachedCoupons) : 'No cache');

    // 簡單性能測試
    console.log('\n簡單性能測試:');
    const startTime = Date.now();
    for (let i = 0; i < 100; i++) {
      await validateCoupon(userId, couponId);
    }
    console.log(`執行100次驗證的時間: ${Date.now() - startTime}ms`);

    // 清理測試數據
    console.log('\n清理測試數據...');
    await redis.del(`coupon_lock:${couponId}`);
    await redis.del(`coupon_quantity:${couponId}`);
    await redis.del(`user_coupons:${userId}`);
  } catch (error) {
    console.error('測試過程中發生錯誤:', error);
  } finally {
    await db.end();
    await redis.quit();
  }
}

// 模擬多用戶同時請求領取優惠券
async function simulateUsers(initialQuantity = 5) {
  await redis.set(`coupon_quantity:${couponId}`, initialQuantity);
  console.log(`重置優惠券數量為: ${initialQuantity}`);

  const promises = Array.from({ length: 10 }, (_, i) => claimCoupon(i + 1, couponId));
  const results = await Promise.allSettled(promises);
  
  results.forEach((result, index) => {
    console.log(`用戶 ${index + 1} 領取結果:`, 
      result.status === 'fulfilled' ? result.value : result.reason.message);
  });

  const remainingQuantity = await redis.get(`coupon_quantity:${couponId}`);
  console.log(`剩餘優惠券數量: ${remainingQuantity}`);
}

runTests();
