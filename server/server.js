// server/server.js

const express = require('express');
const { Pool } = require('pg');
const cors = require('cors'); 

const app = express();
const port = 3001; 

// 🚨 환경 변수 사용: Docker Compose에서 설정한 값들을 가져옵니다.
const pool = new Pool({
  user: process.env.DB_USER,        // safezone_user
  host: process.env.DB_HOST,        // safezone-db (Docker Compose 서비스 이름)
  database: process.env.POSTGRES_DB, // safezone
  password: process.env.DB_PASSWORD,    // safezone_pass
  port: 5432,
});

app.use(cors()); 
app.use(express.json({ limit: '5mb' })); 

// 🚨 알림 데이터 저장 API 엔드포인트 (기존 로직 유지)
app.post('/api/save-alert', async (req, res) => {
  const { id, recent_obj } = req.body;
  
  if (!recent_obj || recent_obj.length < 3) {
    return res.status(400).send({ message: 'Invalid payload structure.' });
  }

  const event_time = recent_obj[0];
  const detected_object = recent_obj[1];
  const base64_image = recent_obj[2]; 

  const query = `
    INSERT INTO alerts (device_id, event_time, detected_object, base64_image)
    VALUES ($1, $2, $3, $4)
  `;
  const values = [id, event_time, detected_object, base64_image];

  try {
    // DB 연결 테스트 및 쿼리 실행
    await pool.query(query, values);
    console.log(`Alert saved for device ${id} at ${event_time}`);
    res.status(200).send({ message: 'Alert saved successfully.' });
  } catch (err) {
    console.error('Database insertion error:', err.stack);
    res.status(500).send({ error: 'Failed to save alert.' });
  }
});

app.get('/api/alerts/recent', async (req, res) => {
  try {
    const deviceId = Number(req.query.device_id);
    if (!Number.isFinite(deviceId)) {
      return res.status(400).json({ error: 'device_id is required' });
    }

    const query = `
      SELECT device_id, event_time, detected_object, base64_image
      FROM alerts
      WHERE device_id = $1
      ORDER BY event_time DESC
      LIMIT 10
    `;

    const result = await pool.query(query, [deviceId]);
    console.log('GET /api/alerts/recent', deviceId, 'rows:', result.rowCount);
    return res.status(200).json(result.rows);
  } catch (err) {
    console.error('Database query error:', err.stack);
    return res.status(500).send({ error: 'Failed to retrieve alerts.' });
  }
});


app.listen(port, () => {
  console.log(`✅ Backend Server listening on port ${port}`);
});