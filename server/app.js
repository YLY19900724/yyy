const express = require('express');
const multer = require('multer');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { randomUUID } = require('crypto');

const DATA_DIR = path.join(__dirname, 'data');
const UPLOAD_DIR = path.join(__dirname, 'uploads');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const DB_FILE = path.join(DATA_DIR, 'db.json');
function loadDB() {
  if (!fs.existsSync(DB_FILE)) {
    const init = { projects: [], shareholders: [], evaluations: [], nextProjectNo: 1 };
    fs.writeFileSync(DB_FILE, JSON.stringify(init, null, 2));
    return init;
  }
  return JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
}
function saveDB(db) { fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2)); }

const app = express();
app.use(cors());
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));
app.use('/uploads', express.static(UPLOAD_DIR));

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    // 兼容 Windows 中文文件名：multer 默认按 latin1 解码 Buffer，需要还原成 utf8
    let name = file.originalname;
    try {
      const buf = Buffer.from(name, 'latin1');
      const reDecoded = buf.toString('utf8');
      // 只有当重新解码后包含中文等非ASCII字符且不是乱码时才替换
      if (/[\u4e00-\u9fa5]/.test(reDecoded)) name = reDecoded;
    } catch (e) {}
    const safe = name.replace(/[\\/:*?"<>|]/g, '_');
    cb(null, Date.now() + '_' + Math.random().toString(36).slice(2, 8) + '_' + safe);
  }
});
const upload = multer({ storage, limits: { fileSize: 50 * 1024 * 1024 } });

// ========== 项目 ==========
app.get('/api/projects', (req, res) => {
  const db = loadDB();
  res.json(db.projects);
});

app.get('/api/projects/next-no', (req, res) => {
  const db = loadDB();
  res.json({ no: String(db.nextProjectNo).padStart(3, '0') });
});

app.post('/api/projects', (req, res) => {
  const db = loadDB();
  const { name, location, capacity, desc } = req.body;
  if (!name) return res.status(400).json({ error: '项目名称必填' });
  const no = String(db.nextProjectNo).padStart(3, '0');
  db.nextProjectNo += 1;
  const p = { id: randomUUID(), no, name, location: location||'', capacity: capacity||'', desc: desc||'', attachments: [], materials: { property: [], drawing: [], electricity: [], other: [] }, createdAt: new Date().toISOString() };
  db.projects.push(p);
  saveDB(db);
  res.json(p);
});

app.put('/api/projects/:id', (req, res) => {
  const db = loadDB();
  const p = db.projects.find(x => x.id === req.params.id);
  if (!p) return res.status(404).json({ error: '项目不存在' });
  const { name, location, capacity, desc } = req.body;
  if (name !== undefined) p.name = name;
  if (location !== undefined) p.location = location;
  if (capacity !== undefined) p.capacity = capacity;
  if (desc !== undefined) p.desc = desc;
  p.updatedAt = new Date().toISOString();
  saveDB(db);
  res.json(p);
});

app.delete('/api/projects/:id', (req, res) => {
  const db = loadDB();
  db.projects = db.projects.filter(x => x.id !== req.params.id);
  db.evaluations = db.evaluations.filter(e => e.projectId !== req.params.id);
  saveDB(db);
  res.json({ ok: true });
});

// ========== 项目描述附件 ==========
app.post('/api/projects/:id/attachments', upload.array('files', 20), (req, res) => {
  const db = loadDB();
  const p = db.projects.find(x => x.id === req.params.id);
  if (!p) return res.status(404).json({ error: '项目不存在' });
  if (!p.attachments) p.attachments = [];
  const allowedExt = ['.doc','.docx','.ppt','.pptx','.pdf','.xls','.xlsx'];
  (req.files || []).forEach(f => {
    const ext = path.extname(f.originalname).toLowerCase();
    if (!allowedExt.includes(ext)) return; // skip non-allowed types silently
    // 还原中文文件名
    let originalName = f.originalname;
    try {
      const buf = Buffer.from(originalName, 'latin1');
      const reDecoded = buf.toString('utf8');
      if (/[\u4e00-\u9fa5]/.test(reDecoded)) originalName = reDecoded;
    } catch (e) {}
    p.attachments.push({
      name: originalName, size: f.size, type: f.mimetype, ext,
      url: '/uploads/' + f.filename, uploadedAt: new Date().toISOString()
    });
  });
  p.updatedAt = new Date().toISOString();
  saveDB(db);
  res.json(p);
});

app.delete('/api/projects/:id/attachments/:idx', (req, res) => {
  const db = loadDB();
  const p = db.projects.find(x => x.id === req.params.id);
  if (!p) return res.status(404).json({ error: '项目不存在' });
  const idx = parseInt(req.params.idx);
  if (!p.attachments || !p.attachments[idx]) return res.status(404).json({ error: '附件不存在' });
  p.attachments.splice(idx, 1);
  p.updatedAt = new Date().toISOString();
  saveDB(db);
  res.json(p);
});

// ========== 文件上传 ==========
app.post('/api/projects/:id/materials/:type', upload.array('files', 20), (req, res) => {
  const db = loadDB();
  const p = db.projects.find(x => x.id === req.params.id);
  if (!p) return res.status(404).json({ error: '项目不存在' });
  const validTypes = ['property', 'drawing', 'electricity', 'other'];
  if (!validTypes.includes(req.params.type)) return res.status(400).json({ error: '类型错误' });
  if (!p.materials[req.params.type]) p.materials[req.params.type] = [];
  (req.files || []).forEach(f => {
    // 还原中文文件名
    let originalName = f.originalname;
    try {
      const buf = Buffer.from(originalName, 'latin1');
      const reDecoded = buf.toString('utf8');
      if (/[\u4e00-\u9fa5]/.test(reDecoded)) originalName = reDecoded;
    } catch (e) {}
    p.materials[req.params.type].push({
      name: originalName, size: f.size, type: f.mimetype,
      url: '/uploads/' + f.filename, uploadedAt: new Date().toISOString()
    });
  });
  saveDB(db);
  res.json(p);
});

app.delete('/api/projects/:id/materials/:type/:idx', (req, res) => {
  const db = loadDB();
  const p = db.projects.find(x => x.id === req.params.id);
  if (!p) return res.status(404).json({ error: '项目不存在' });
  const idx = parseInt(req.params.idx);
  if (!p.materials[req.params.type] || !p.materials[req.params.type][idx]) return res.status(404).json({ error: '材料不存在' });
  p.materials[req.params.type].splice(idx, 1);
  saveDB(db);
  res.json(p);
});

// ========== 股东 ==========
app.get('/api/shareholders', (req, res) => {
  const db = loadDB();
  const list = db.shareholders.map(sh => ({
    ...sh,
    evalCount: db.evaluations.filter(e => e.shareholderId === sh.id).length
  }));
  res.json(list);
});

app.post('/api/shareholders', (req, res) => {
  const db = loadDB();
  const { name, note } = req.body;
  if (!name) return res.status(400).json({ error: '股东姓名必填' });
  const sh = { id: randomUUID(), name, note: note||'', token: randomUUID().replace(/-/g, '').slice(0, 16), createdAt: new Date().toISOString() };
  db.shareholders.push(sh);
  saveDB(db);
  res.json(sh);
});

app.delete('/api/shareholders/:id', (req, res) => {
  const db = loadDB();
  db.shareholders = db.shareholders.filter(x => x.id !== req.params.id);
  db.evaluations = db.evaluations.filter(e => e.shareholderId !== req.params.id);
  saveDB(db);
  res.json({ ok: true });
});

// ========== 股东评估入口 ==========
app.get('/api/shareholder/:token', (req, res) => {
  const db = loadDB();
  const sh = db.shareholders.find(s => s.token === req.params.token);
  if (!sh) return res.status(404).json({ error: '链接无效' });
  const projects = db.projects.map(p => ({
    ...p,
    evaluated: !!db.evaluations.find(e => e.projectId === p.id && e.shareholderId === sh.id)
  }));
  res.json({ shareholder: sh, projects });
});

app.get('/api/shareholder/:token/project/:pid', (req, res) => {
  const db = loadDB();
  const sh = db.shareholders.find(s => s.token === req.params.token);
  const p = db.projects.find(x => x.id === req.params.pid);
  if (!sh || !p) return res.status(404).json({ error: '资源不存在' });
  const existing = db.evaluations.find(e => e.projectId === p.id && e.shareholderId === sh.id) || null;
  res.json({ project: p, existing });
});

app.post('/api/shareholder/:token/project/:pid/materials/:type', upload.array('files', 20), (req, res) => {
  const db = loadDB();
  const sh = db.shareholders.find(s => s.token === req.params.token);
  const p = db.projects.find(x => x.id === req.params.pid);
  if (!sh || !p) return res.status(404).json({ error: '资源不存在' });
  let ev = db.evaluations.find(e => e.projectId === p.id && e.shareholderId === sh.id);
  if (!ev) {
    ev = { id: randomUUID(), projectId: p.id, shareholderId: sh.id, checks: {}, notes: {}, materials: {}, advice: '', overall: '', createdAt: new Date().toISOString() };
    db.evaluations.push(ev);
  }
  if (!ev.materials[req.params.type]) ev.materials[req.params.type] = [];
  (req.files || []).forEach(f => {
    // 还原中文文件名
    let originalName = f.originalname;
    try {
      const buf = Buffer.from(originalName, 'latin1');
      const reDecoded = buf.toString('utf8');
      if (/[\u4e00-\u9fa5]/.test(reDecoded)) originalName = reDecoded;
    } catch (e) {}
    ev.materials[req.params.type].push({
      name: originalName, size: f.size, type: f.mimetype,
      url: '/uploads/' + f.filename, uploadedAt: new Date().toISOString()
    });
  });
  saveDB(db);
  res.json(ev);
});

// ========== 评估提交 ==========
app.post('/api/shareholder/:token/project/:pid/eval', (req, res) => {
  const db = loadDB();
  const sh = db.shareholders.find(s => s.token === req.params.token);
  const p = db.projects.find(x => x.id === req.params.pid);
  if (!sh || !p) return res.status(404).json({ error: '资源不存在' });
  const { checks, notes, advice, overall, investPercent } = req.body;
  if (!overall || !overall.trim()) return res.status(400).json({ error: '请填写整体评价' });
  if (investPercent === undefined || investPercent === null || investPercent === '' || isNaN(Number(investPercent))) {
    return res.status(400).json({ error: '请填写投资意愿百分比' });
  }
  const pct = Math.max(0, Math.min(100, Number(investPercent)));
  let ev = db.evaluations.find(e => e.projectId === p.id && e.shareholderId === sh.id);
  if (!ev) {
    ev = { id: randomUUID(), projectId: p.id, shareholderId: sh.id, createdAt: new Date().toISOString() };
    db.evaluations.push(ev);
  }
  ev.checks = checks || {}; ev.notes = notes || {};
  ev.advice = advice || ''; ev.overall = overall;
  ev.investPercent = pct;
  ev.updatedAt = new Date().toISOString();
  saveDB(db);
  res.json(ev);
});

// ========== 汇总 ==========
app.get('/api/summary/:pid', (req, res) => {
  const db = loadDB();
  const p = db.projects.find(x => x.id === req.params.pid);
  if (!p) return res.status(404).json({ error: '项目不存在' });
  const evs = db.evaluations.filter(e => e.projectId === p.id).map(e => {
    const sh = db.shareholders.find(s => s.id === e.shareholderId);
    return { ...e, shareholderName: sh ? sh.name : '未知股东' };
  });
  res.json({ project: p, evaluations: evs });
});

// ========== 静态文件服务 ==========
app.use(express.static(path.join(__dirname, '..')));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log('Server running on http://localhost:' + PORT));
