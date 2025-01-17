const express = require('express');
const bodyParser = require('body-parser');
const { getTargetCustomers, sendMarketingSMS } = require('./customerService');
const { claimCoupon, validateCoupon, getUserCoupons } = require('./couponService');
const db = require('./database');
const redis = require('ioredis');

const app = express();
const PORT = 3000;

app.use(bodyParser.json());

// 初始化 Redis
const redisClient = new redis({
  host: 'localhost',
  port: 6379
});

// 同步優惠券數量到 Redis
const initializeCouponQuantities = async () => {
  try {
    const [coupons] = await db.query('SELECT id, total_quantity FROM coupons');
    for (const coupon of coupons) {
      await redisClient.set(`coupon_quantity:${coupon.id}`, coupon.total_quantity);
    }
    console.log('所有優惠券數量已初始化到 Redis');
  } catch (error) {
    console.error('初始化優惠券數量失敗:', error.message);
    throw error;
  }
};

// 測試連線功能
const testConnections = async () => {
  try {
    await db.query('SELECT NOW()');
    console.log('資料庫連線成功');
    
    await redisClient.ping();
    console.log('Redis 已成功連線');
    
  } catch (error) {
    console.error('連線測試失敗:', error.message);
    process.exit(1); // 終止伺服器啟動
  }
};

// 路由: 客戶相關功能
app.get('/api/customers/target', async (req, res) => {
  const { days, minAmount } = req.query;

  if (!days || !minAmount) {
    return res.status(400).json({ error: '請提供 days 和 minAmount 參數' });
  }

  try {
    const customers = await getTargetCustomers(Number(days), Number(minAmount));
    res.json(customers);
  } catch (error) {
    console.error('獲取目標客戶失敗:', error.message);
    res.status(500).json({ error: '無法獲取目標客戶' });
  }
});

app.post('/api/customers/marketing-sms', async (req, res) => {
  const { customers, template } = req.body;

  if (!customers || !template) {
    return res.status(400).json({ error: '請提供 customers 和 template 資料' });
  }

  try {
    await sendMarketingSMS(customers, template);
    res.json({ success: true, message: '行銷簡訊已成功發送' });
  } catch (error) {
    console.error('發送行銷簡訊失敗:', error.message);
    res.status(500).json({ error: '無法發送行銷簡訊' });
  }
});

// 路由: 優惠券相關功能
app.post('/api/coupons/claim', async (req, res) => {
  const { userId, couponId } = req.body;

  if (!userId || !couponId) {
    return res.status(400).json({ error: '請提供 userId 和 couponId' });
  }

  try {
    const result = await claimCoupon(userId, couponId);
    res.json(result);
  } catch (error) {
    console.error('領取優惠券失敗:', error.message);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/coupons/validate', async (req, res) => {
  const { userId, couponId } = req.query;

  if (!userId || !couponId) {
    return res.status(400).json({ error: '請提供 userId 和 couponId' });
  }

  try {
    const result = await validateCoupon(Number(userId), Number(couponId));
    res.json(result);
  } catch (error) {
    console.error('驗證優惠券失敗:', error.message);
    res.status(500).json({ error: '無法驗證優惠券' });
  }
});

app.get('/api/coupons/user/:userId', async (req, res) => {
  const { userId } = req.params;

  try {
    const coupons = await getUserCoupons(Number(userId));
    res.json(coupons);
  } catch (error) {
    console.error('獲取用戶優惠券失敗:', error.message);
    res.status(500).json({ error: '無法獲取用戶優惠券' });
  }
});

// 啟動伺服器並初始化優惠券數據
app.listen(PORT, async () => {
  console.log(`伺服器正在 http://localhost:${PORT} 運行`);
  
  // 測試連線並初始化數據
  await testConnections();

  // 初始化優惠券數據到 Redis
  await initializeCouponQuantities();
});
