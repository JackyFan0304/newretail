const Redis = require('ioredis');
const db = require('./database');

const redis = new Redis({
  host: 'localhost',
  port: 6379
});


// 用戶領取優惠券,並確保不會超發
async function claimCoupon(userId, couponId) {
  const lockKey = `coupon_lock:${couponId}`;
  const quantityKey = `coupon_quantity:${couponId}`;
  const lockTimeout = 30000; // 鎖超時時間：30 秒
  const lockValue = `${userId}:${Date.now()}`;

  try {
    // 檢查優惠券是否存在
    const [couponExists] = await db.query('SELECT id FROM coupons WHERE id = ?', [couponId]);
    if (!couponExists) throw new Error('優惠券不存在');

    // 檢查用戶是否已經領取過該優惠券
    const [existingClaim] = await db.query(
      'SELECT id FROM user_coupons WHERE user_id = ? AND coupon_id = ?',
      [userId, couponId]
    );
    if (existingClaim.length > 0) {
      throw new Error('您已經領取過此優惠券');
    }

    // 嘗試獲取 Redis 鎖
    const lockAcquired = await redis.set(lockKey, lockValue, 'NX', 'PX', lockTimeout);
    if (!lockAcquired) throw new Error('無法獲取優惠券,請稍後再試');

    // 減少 Redis 中的優惠券數量
    const newQuantity = await redis.decr(quantityKey);
    if (newQuantity < 0) {
      // 如果數量小於 0，回滾操作
      await redis.incr(quantityKey);
      throw new Error('優惠券已被領完');
    }

    // 添加優惠券到用戶
    await db.query(
      'INSERT INTO user_coupons (user_id, coupon_id) VALUES (?, ?)',
      [userId, couponId]
    );

    return { success: true, message: '優惠券領取成功' };
  } catch (error) {
    throw error;
  } finally {
    // 確保釋放鎖
    if (await redis.get(lockKey) === lockValue) {
      await redis.del(lockKey);
    }
  }
}


// 驗證優惠券的可用性
async function validateCoupon(userId, couponId) {
  const cacheKey = `coupon:${userId}:${couponId}`;
  const cachedResult = await redis.get(cacheKey);

  if (cachedResult) {
    return JSON.parse(cachedResult);
  }

  const [userCoupon] = await db.query(
    'SELECT uc.*, c.end_date FROM user_coupons uc JOIN coupons c ON uc.coupon_id = c.id WHERE uc.user_id = ? AND uc.coupon_id = ? AND uc.status = "unused" AND NOW() <= c.end_date',
    [userId, couponId]
  );

  const result = userCoupon.length === 0
    ? { valid: false, message: '優惠券無效或已過期' }
    : { valid: true, message: '優惠券有效' };

  await redis.set(cacheKey, JSON.stringify(result), 'EX', 3600);
  return result;
}

// 查詢用戶的所有優惠券狀態
async function getUserCoupons(userId) {
  const cacheKey = `user_coupons:${userId}`;
  const cachedCoupons = await redis.get(cacheKey);

  if (cachedCoupons) {
    return JSON.parse(cachedCoupons);
  }

  const [coupons] = await db.query(
    'SELECT uc.*, c.name, c.type, c.value, c.end_date FROM user_coupons uc JOIN coupons c ON uc.coupon_id = c.id WHERE uc.user_id = ?',
    [userId]
  );

  const formattedCoupons = coupons.map(coupon => ({
    ...coupon,
    status: coupon.status === 'unused' && new Date() > new Date(coupon.end_date) ? 'expired' : coupon.status
  }));

  await redis.set(cacheKey, JSON.stringify(formattedCoupons), 'EX', 3600);
  return formattedCoupons;
}

module.exports = {
  claimCoupon,
  validateCoupon,
  getUserCoupons
};
