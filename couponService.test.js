const Redis = require('ioredis');
const { claimCoupon, validateCoupon, getUserCoupons } = require('./couponService');
const db = require('./database');
const assert = require('assert');

const redis = new Redis({ host: 'localhost', port: 6379 });

const userId = 1;
const couponId = 1;

async function initializeTestEnvironment() {
  console.log('初始化測試環境...');
  await redis.del(`coupon_quantity:${couponId}`);
  await redis.del(`coupon_lock:${couponId}`);
  await redis.del(`user_coupons:${userId}`);
  await redis.set(`coupon_quantity:${couponId}`, 2); // 初始化優惠券數量
}

async function cleanupTestEnvironment() {
  console.log('清理測試環境...');
  await redis.del(`coupon_quantity:${couponId}`);
  await redis.del(`coupon_lock:${couponId}`);
  await redis.del(`user_coupons:${userId}`);
}

async function testClaimCoupon() {
  console.log('\n=== 測試: 單用戶領取優惠券 ===');
  const result = await claimCoupon(userId, couponId);
  console.log('領取結果:', result);
  assert.strictEqual(result.success, true, '應該成功領取優惠券');

  const remainingQuantity = await redis.get(`coupon_quantity:${couponId}`);
  console.log('剩餘優惠券數量:', remainingQuantity);
  assert.strictEqual(Number(remainingQuantity), 1, '剩餘數量應為1');
}

async function testValidateCoupon() {
  console.log('\n=== 測試: 驗證優惠券 ===');
  const result = await validateCoupon(userId, couponId);
  console.log('驗證結果:', result);
  assert.strictEqual(result.valid, true, '優惠券應該有效');
}

async function testGetUserCoupons() {
  console.log('\n=== 測試: 查詢用戶優惠券 ===');
  const coupons = await getUserCoupons(userId);
  console.log('用戶優惠券:', coupons);
  assert(Array.isArray(coupons), '應返回一個陣列');
}

async function testConcurrentClaim() {
  console.log('\n=== 測試: 多用戶併發領取 ===');
  
  // 重置數量
  const initialQuantity = 5;
  await redis.set(`coupon_quantity:${couponId}`, initialQuantity);

  const promises = Array.from({ length: initialQuantity + 2 }, (_, i) => claimCoupon(i + 1, couponId));
  
  const results = await Promise.allSettled(promises);
  
  const successCount = results.filter(result => result.status === 'fulfilled').length;
  
  console.log('成功領取人數:', successCount);
  
  assert(successCount <= initialQuantity, '成功領取人數不應超過初始數量');
  
  const remainingQuantity = await redis.get(`coupon_quantity:${couponId}`);
  
  console.log('剩餘優惠券數量:', remainingQuantity);
  
  assert.strictEqual(Number(remainingQuantity), Math.max(0, initialQuantity - successCount), '剩餘數量應正確更新');
}

async function testEdgeCases() {
  console.log('\n=== 測試: 邊界條件 ===');

  // 設置剩餘數量為1
  await redis.set(`coupon_quantity:${couponId}`, 1);

  const result1 = await claimCoupon(userId + 1, couponId);
  
  console.log('第一位用戶領取結果:', result1);

  assert.strictEqual(result1.success, true, '第一位用戶應該成功領取');

  try {
    await claimCoupon(userId + 2, couponId); // 第二位用戶嘗試領取
    assert.fail('第二位用戶不應該成功領取'); // 如果沒有拋出錯誤則失敗
  } catch (error) {
    console.log('第二位用戶領取失敗:', error.message);
    assert.strictEqual(error.message, '優惠券已被領完', '錯誤訊息應該為「優惠券已被領完」');
  }
}

async function runTests() {
  try {
    // 初始化環境
    await initializeTestEnvironment();

    // 執行各項測試
    await testClaimCoupon();
    await testValidateCoupon();
    await testGetUserCoupons();
    await testConcurrentClaim();
    await testEdgeCases();

    console.log('\n所有測試通過！');
    
    // 清理環境
    await cleanupTestEnvironment();
    
    // 關閉連接
    await db.end();
    await redis.quit();
    
    console.log('測試完成並釋放資源。');
    
  } catch (error) {
    console.error('測試失敗:', error.message);
    
    // 確保釋放資源
    await cleanupTestEnvironment();
    await db.end();
    await redis.quit();
    
    process.exit(1); // 非正常退出
  }
}

runTests();
