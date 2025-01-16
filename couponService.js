const db = require('./database');

// 用戶領取優惠券,並確保不會超發
async function claimCoupon(userId, couponId) {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    // 檢查優惠券是否可用
    const [coupon] = await connection.query(
      'SELECT * FROM coupons WHERE id = ? AND remaining_quantity > 0 AND NOW() BETWEEN start_date AND end_date FOR UPDATE',
      [couponId]
    );

    // 確保不會超發
    if (coupon.length === 0) {
      throw new Error('優惠券不可用或已被領完');
    }

    // 減少優惠券數量
    await connection.query(
      'UPDATE coupons SET remaining_quantity = remaining_quantity - 1 WHERE id = ?',
      [couponId]
    );

    // 為用戶添加優惠券
    await connection.query(
      'INSERT INTO user_coupons (user_id, coupon_id) VALUES (?, ?)',
      [userId, couponId]
    );

    await connection.commit();
    return { success: true, message: '優惠券領取成功' };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

// 驗證優惠券的可用性
async function validateCoupon(userId, couponId) {
  const [userCoupon] = await db.query(
    'SELECT uc.*, c.end_date FROM user_coupons uc JOIN coupons c ON uc.coupon_id = c.id WHERE uc.user_id = ? AND uc.coupon_id = ? AND uc.status = "unused" AND NOW() <= c.end_date',
    [userId, couponId]
  );

  if (userCoupon.length === 0) {
    return { valid: false, message: '優惠券無效或已過期' };
  }

  return { valid: true, message: '優惠券有效' };
}

// 查詢用戶的所有優惠券狀態
async function getUserCoupons(userId) {
  const [coupons] = await db.query(
    'SELECT uc.*, c.name, c.type, c.value, c.end_date FROM user_coupons uc JOIN coupons c ON uc.coupon_id = c.id WHERE uc.user_id = ?',
    [userId]
  );

  return coupons.map(coupon => ({
    ...coupon,
    status: coupon.status === 'unused' && new Date() > new Date(coupon.end_date) ? 'expired' : coupon.status
  }));
}

module.exports = {
  claimCoupon,
  validateCoupon,
  getUserCoupons
};
