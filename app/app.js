const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// 创建SQLite3数据库连接
const db = new sqlite3.Database(':memory:', (err) => {
  if (err) {
    console.error('无法连接到SQLite数据库:', err.message);
  } else {
    console.log('已成功连接到SQLite数据库');
  }
});

// 初始化说说表结构
const createTableSql = `
CREATE TABLE IF NOT EXISTS essays (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  content TEXT NOT NULL,
  date TEXT NOT NULL,
  link TEXT,
  images TEXT
);
`;

db.run(createTableSql, (err) => {
  if (err) console.error('创建表结构失败:', err.message);
});

// 认证中间件
function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ error: '缺少授权头信息' });
  }

  const token = authHeader.split(' ')[1];
  if (token !== process.env.API_KEY) {
    return res.status(403).json({ error: '无效的API密钥' });
  }

  next();
}

// 获取所有说说
app.get('/api/essays', (req, res) => {
  const sql = 'SELECT * FROM essays order by date desc ';
  db.all(sql, [], (err, essays) => {
    if (err) {
      return res.status(500).json({ error: '获取说说列表失败' });
    }
    res.status(200).json(essays);
  });
});

// 创建新说说
app.post('/api/essays', authenticate, (req, res) => {
  const { content, date, link, images } = req.body;
  const currentDate = date || new Date().toISOString();
  const sql = 'INSERT INTO essays (content, date, link, images) VALUES (?, ?, ?, ?)';
  db.run(sql, [content, currentDate, link, JSON.stringify(images)], (err) => {
    if (err) {
      return res.status(500).json({ error: '创建说说失败' });
    }
    res.status(201).json({ message: '说说创建成功' });
  });
});

// 更新现有说说
app.put('/api/essays/:id', authenticate, (req, res) => {
  const { id } = req.params;
  const { content, date, link, images } = req.body;
  const sql = 'UPDATE essays SET content = ?, date = ?, link = ?, images = ? WHERE id = ?';
  db.run(sql, [content, date, link, JSON.stringify(images), id], function (err) {
    if (err) {
      return res.status(500).json({ error: '更新说说失败' });
    }
    if (this.changes === 0) {
      return res.status(404).json({ error: '找不到说说' });
    }
    res.status(200).json({ message: '说说更新成功' });
  });
});

// 删除现有说说
app.delete('/api/essays/:id', authenticate, (req, res) => {
  const { id } = req.params;
  const sql = 'DELETE FROM essays WHERE id = ?';
  db.run(sql, [id], function (err) {
    if (err) {
      return res.status(500).json({ error: '删除说说失败' });
    }
    if (this.changes === 0) {
      return res.status(404).json({ error: '找不到说说' });
    }
    res.status(200).json({ message: '说说删除成功' });
  });
});

app.listen(3000, () => {
  console.log('服务器正在运行，端口：3000');
});