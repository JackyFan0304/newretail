const Redis = require('ioredis');
const { claimCoupon, validateCoupon, getUserCoupons } = require('./couponService');
const db = require('./database');
const assert = require('assert');

const redis = new Redis({ host: 'localhost', port: 6379 });

const userId = 1;
const couponId = 1;

async function initializeTestEnvironment() {
  console.log('初始化測試環境...');
  
  // 清理 Redis
  await redis.del(`coupon_quantity:${couponId}`);
  await redis.del(`coupon_lock:${couponId}`);
  await redis.del(`user_coupons:${userId}`);
  
  // 初始化 Redis 數據
  await redis.set(`coupon_quantity:${couponId}`, 2);

  // 清理資料庫
  await db.query('DELETE FROM user_coupons WHERE user_id = ? AND coupon_id = ?', [userId, couponId]);
}

async function cleanupTestEnvironment() {
  console.log('清理測試環境...');
  
  // 清理 Redis
  await redis.del(`coupon_quantity:${couponId}`);
  await redis.del(`coupon_lock:${couponId}`);
  
  // 清理資料庫
  await db.query('DELETE FROM user_coupons WHERE user_id = ? AND coupon_id = ?', [userId, couponId]);
}

async function testClaimCoupon() {
  console.log('\n=== 測試: 單用戶領取優惠券 ===');
  
  const result = await claimCoupon(userId, couponId);
  
  console.log('領取結果:', result);
  
  assert.strictEqual(result.success, true, '應該成功領取優惠券');

  const remainingQuantity = await redis.get(`coupon_quantity:${couponId}`);
  
  console.log('剩餘優惠券數量:', remainingQuantity);
  
  assert.strictEqual(Number(remainingQuantity), 1, '剩餘數量應為1');

  const [rows] = await db.query('SELECT * FROM user_coupons WHERE user_id = ? AND coupon_id = ?', [userId, couponId]);
  
  assert.strictEqual(rows.length, 1, '應該新增一條 user_coupons 記錄');
}

async function testDuplicateClaim() {
  console.log('\n=== 測試: 重複領取優惠券 ===');
  
  try {
    await claimCoupon(userId, couponId); // 第一次領取
    await claimCoupon(userId, couponId); // 第二次領取應該失敗
    assert.fail('重複領取應該拋出錯誤');
  } catch (error) {
    console.log('重複領取失敗:', error.message);
    assert.strictEqual(error.message, '您已經領取過此優惠券', '錯誤訊息應該為「您已經領取過此優惠券」');
  }
}

async function testValidateCoupon() {
  console.log('\n=== 測試: 驗證優惠券 ===');
  
  const result = await validateCoupon(userId, couponId);
  
  console.log('驗證結果:', result);
  
  assert.strictEqual(result.valid, true, '優惠券應該有效');
}

async function testExpiredCoupon() {
  console.log('\n=== 測試: 驗證過期優惠券 ===');
  
  const expiredCouponId = 5; // 已過期的優惠券 ID
  
  const result = await validateCoupon(userId, expiredCouponId);
  
  console.log('驗證結果:', result);
  
  assert.strictEqual(result.valid, false, '過期的優惠券應該無效');
}

async function testGetUserCoupons() {
  console.log('\n=== 測試: 查詢用戶優惠券 ===');
  
  const coupons = await getUserCoupons(userId);
  
  console.log('用戶優惠券:', coupons);
  
  assert(Array.isArray(coupons), '應返回一個陣列');
}

async function testConcurrentClaim() {
  console.log('\n=== 測試: 多用戶併發領取 ===');
  
  const initialQuantity = 5;
  
  // 初始化 Redis 中的數量
  await redis.set(`coupon_quantity:${couponId}`, initialQuantity);

  const promises = Array.from({ length: initialQuantity + 2 }, (_, i) => claimCoupon(i + userId, couponId));
  
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
    await testDuplicateClaim();
    await testValidateCoupon();
    await testExpiredCoupon();
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
