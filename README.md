# newretail
 newretail backend engineer examination questions

專案簡介
NewRetail 是一個基於 Node.js 開發的 CRM 系統，實現了客戶分群與行銷功能以及優惠券管理功能。

功能概述

1. 客戶分群與行銷功能
根據消費金額與最後消費時間篩選目標客戶（例如「近 30 天消費金額超過 500 元的客戶」）。
支援動態生成行銷簡訊模板，並群發給篩選出的客戶。

2. 優惠券管理功能
用戶可領取特定優惠券，並確保同一用戶無法重複領取相同優惠券。
提供驗證優惠券有效性（檢查是否過期或已使用）的 API。
提供查詢用戶所有優惠券狀態的 API（未使用、已使用、已過期）。
確保高併發場景下的優惠券數量一致性，避免超發。

資料庫設計

資料庫包含以下主要表格：

customers：存儲客戶基本資訊。
transactions：記錄客戶消費資訊。
coupons：存儲優惠券資訊，包括類型、數量和有效期。
user_coupons：記錄用戶領取的優惠券及其狀態。

詳細 SQL 結構請參考提供的 newretail_crm_system.sql 文件。

API 說明
1. 客戶相關 API
GET /api/customers/target：篩選目標客戶。
POST /api/customers/marketing-sms：發送行銷簡訊。
2. 優惠券相關 API
POST /api/coupons/claim：領取優惠券。
GET /api/coupons/validate：驗證優惠券是否有效。
GET /api/coupons/user/:userId：查詢用戶所有優惠券狀態。




