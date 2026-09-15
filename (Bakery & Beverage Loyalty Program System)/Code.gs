/*******************************************************
 * SAM BAKERY — Web App (Google Apps Script)
 *******************************************************/

const CFG = {
  APP_NAME : 'Sam Bakery',
  PT_RATE  : 20,   // ใช้จ่าย 20 บาท = 1 แต้ม
  DELIVERY : 30,   // ค่าจัดส่ง
  WELCOME  : 20,   // แต้มต้อนรับสมาชิกใหม่
  PROMPTPAY: '052-123-4560'
};

/* ============ ENTRY POINT ============ */
function doGet() {
  return HtmlService.createTemplateFromFile('Index')
    .evaluate()
    .setTitle('Sam Bakery | อบสดใหม่ทุกวัน')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

/* ============ DATABASE (Google Sheets) ============ */
function getSS_() {
  // บังคับให้ใช้ Google Sheets ตาม ID ที่คุณกำหนด
  return SpreadsheetApp.openById('1Ic_dvMrqeL6J-Xv7262P7lCh8lBHuXvtmnpce7jEehs');
}

function sheet_(name, headers) {
  const ss = getSS_();
  let sh = ss.getSheetByName(name);
  if (!sh) {
    sh = ss.insertSheet(name);
    sh.appendRow(headers);
    sh.getRange(1, 1, 1, headers.length).setFontWeight('bold').setBackground('#f7e7d3');
    sh.setFrozenRows(1);
    const def = ss.getSheetByName('Sheet1');
    if (def && def.getLastRow() === 0) ss.deleteSheet(def);
  }
  return sh;
}

const usersSheet_  = () => sheet_('Users',
  ['email', 'name', 'tel', 'passHash', 'points', 'createdAt']);
const ordersSheet_ = () => sheet_('Orders',
  ['ref', 'email', 'itemCount', 'subTotal', 'discount', 'shipping',
   'net', 'pointsUsed', 'pointsGain', 'detail', 'status', 'createdAt']);

function hash_(text) {
  return Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, text, Utilities.Charset.UTF_8)
    .map(b => ('0' + (b & 0xFF).toString(16)).slice(-2)).join('');
}

function findUserRow_(email) {
  const sh = usersSheet_();
  const last = sh.getLastRow();
  if (last < 2) return -1;
  const col = sh.getRange(2, 1, last - 1, 1).getValues();
  for (let i = 0; i < col.length; i++) {
    if (String(col[i][0]).toLowerCase() === email.toLowerCase()) return i + 2;
  }
  return -1;
}

function readUser_(row) {
  const v = usersSheet_().getRange(row, 1, 1, 6).getValues()[0];
  return { email: v[0], name: v[1], tel: v[2], points: Number(v[4]) || 0 };
}

/* ============ MENU DATA ============ */
function getMenu() {
  return [
    {id:1, n:'ครัวซองต์เนยสด', c:'bread', p:65, hot:1, d:'อบใหม่ กรอบนอกนุ่มใน เนยฝรั่งเศสแท้',
     img:'https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=500'},
    {id:2, n:'ขนมปังไส้ทะลักช็อกโกแลต', c:'bread', p:55, d:'ช็อกโกแลตเบลเยียมไหลเยิ้ม',
     img:'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=500'},
    {id:3, n:'บาแกตต์ฝรั่งเศส', c:'bread', p:75, d:'เปลือกกรอบ หมักธรรมชาติ 18 ชม.',
     img:'https://images.unsplash.com/photo-1549931319-a545dcf3bc73?w=500'},
    {id:4, n:'ซินนามอนโรล', c:'bread', p:70, hot:1, d:'อบเนยหอม ราดครีมชีสฟรอสติ้ง',
     img:'https://images.unsplash.com/photo-1509365465985-25d11c17e812?w=500'},
    {id:5, n:'เค้กช็อกโกแลตลาวา', c:'cake', p:120, hot:1, d:'ตัดปุ๊บ ช็อกโกแลตไหลปั๊บ',
     img:'https://images.unsplash.com/photo-1606313564200-e75d5e30476c?w=500'},
    {id:6, n:'ชีสเค้กนิวยอร์ก', c:'cake', p:110, d:'ครีมชีสแท้ เนื้อแน่นละมุน',
     img:'https://images.unsplash.com/photo-1533134242443-d4fd215305ad?w=500'},
    {id:7, n:'สตรอว์เบอร์รีชอร์ตเค้ก', c:'cake', p:135, d:'สปันจ์นุ่ม วิปสด สตรอว์เบอร์รีสด',
     img:'https://images.unsplash.com/photo-1565958011703-44f9829ba187?w=500'},
    {id:8, n:'บราวนี่ฟัดจ์', c:'cake', p:65, d:'หนึบเข้ม โกโก้ 70%',
     img:'https://images.unsplash.com/photo-1607920591413-4ec007e70023?w=500'},
    {id:9, n:'คุกกี้ช็อกชิพ (6 ชิ้น)', c:'cookie', p:90, d:'กรอบนอกหนึบใน ช็อกก้อนโต',
     img:'https://images.unsplash.com/photo-1499636136210-6f4ee915583e?w=500'},
    {id:10, n:'มาการองรวมรส (6 ชิ้น)', c:'cookie', p:180, d:'6 รสพาสเทลสุดคลาสสิก',
     img:'https://images.unsplash.com/photo-1569864358642-9d1684040f43?w=500'},
    {id:11, n:'บัตเตอร์คุกกี้กระป๋อง', c:'cookie', p:250, d:'เนยเดนมาร์ก หอมกรอบ ของฝากยอดฮิต',
     img:'https://images.unsplash.com/photo-1558961363-fa8fdf82db35?w=500'},
    {id:12, n:'อเมริกาโน่เย็น', c:'drink', p:55, d:'เมล็ดอาราบิก้าดอยช้าง คั่วกลาง',
     img:'https://images.unsplash.com/photo-1517701550927-30cf4ba1dba5?w=500'},
    {id:13, n:'ลาเต้ร้อน', c:'drink', p:65, hot:1, d:'นมสดฟองนุ่ม ละมุนกลมกล่อม',
     img:'https://images.unsplash.com/photo-1541167760496-1628856ab772?w=500'},
    {id:14, n:'ชาไทยเย็น', c:'drink', p:55, d:'ชาไทยแท้ หวานมันกำลังดี',
     img:'https://images.unsplash.com/photo-1558857563-b371033873b8?w=500'},
    {id:15, n:'มัทฉะลาเต้', c:'drink', p:75, d:'มัทฉะเกรดพิธีจากอุจิ ญี่ปุ่น',
     img:'https://images.unsplash.com/photo-1536256263959-770b48d82b0a?w=500'},
    {id:16, n:'ช็อกโกแลตเย็น', c:'drink', p:70, d:'โกโก้เข้มข้น ท็อปวิปครีม',
     img:'https://images.unsplash.com/photo-1594801124479-7987e85e263d?w=500'}
  ];
}

function getRewards() {
  return [
    { pt: 50,  label: 'ส่วนลด 30 บาท',  val: 30  },
    { pt: 100, label: 'ส่วนลด 70 บาท',  val: 70  },
    { pt: 200, label: 'ส่วนลด 160 บาท', val: 160 },
    { pt: 350, label: 'ส่วนลด 300 บาท', val: 300 }
  ];
}

function getConfig() {
  return { ptRate: CFG.PT_RATE, delivery: CFG.DELIVERY, promptpay: CFG.PROMPTPAY };
}

/* ============ AUTH ============ */
function registerUser(data) {
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const name = String(data.name || '').trim();
    const email = String(data.email || '').trim().toLowerCase();
    const tel = String(data.tel || '').trim();
    const pass = String(data.pass || '');

    if (!name || !email || !tel || !pass) return { ok: false, msg: 'กรุณากรอกข้อมูลให้ครบทุกช่อง' };
    if (!/^\S+@\S+\.\S+$/.test(email))     return { ok: false, msg: 'รูปแบบอีเมลไม่ถูกต้อง' };
    if (pass.length < 6)                   return { ok: false, msg: 'รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร' };
    if (findUserRow_(email) > 0)           return { ok: false, msg: 'อีเมลนี้ถูกใช้งานแล้ว' };

    usersSheet_().appendRow([email, name, tel, hash_(pass), CFG.WELCOME, new Date()]);
    return { ok: true, user: { email, name, tel, points: CFG.WELCOME }, msg: 'สมัครสำเร็จ! รับ ' + CFG.WELCOME + ' แต้มต้อนรับ 🎁' };
  } finally {
    lock.releaseLock();
  }
}

function loginUser(data) {
  const email = String(data.email || '').trim().toLowerCase();
  const pass = String(data.pass || '');
  const row = findUserRow_(email);
  if (row < 0) return { ok: false, msg: 'ไม่พบบัญชีนี้ในระบบ' };
  if (usersSheet_().getRange(row, 4).getValue() !== hash_(pass))
    return { ok: false, msg: 'รหัสผ่านไม่ถูกต้อง' };
  return { ok: true, user: readUser_(row) };
}

function getProfile(email) {
  const row = findUserRow_(email);
  return row < 0 ? { ok: false } : { ok: true, user: readUser_(row) };
}

/* ============ ORDER ============ */
function createOrder(payload) {
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const row = findUserRow_(payload.email);
    if (row < 0) return { ok: false, msg: 'กรุณาเข้าสู่ระบบก่อนสั่งซื้อ' };
    if (!payload.items || !payload.items.length) return { ok: false, msg: 'ตะกร้าว่างเปล่า' };

    const menu = {};
    getMenu().forEach(m => menu[m.id] = m);

    let sub = 0, count = 0;
    const detail = payload.items.map(it => {
      const m = menu[it.id];
      if (!m) return '';
      sub += m.p * it.q;
      count += it.q;
      return m.n + ' x' + it.q;
    }).filter(String).join(', ');

    const points = Number(usersSheet_().getRange(row, 5).getValue()) || 0;
    let used = 0, disc = 0;
    if (payload.couponPt) {
      const r = getRewards().filter(x => x.pt === payload.couponPt)[0];
      if (r && points >= r.pt) { used = r.pt; disc = Math.min(r.val, sub); }
    }

    const net = Math.max(0, sub - disc) + CFG.DELIVERY;
    const gain = Math.floor(sub / CFG.PT_RATE);
    const ref = 'SB' + Utilities.formatDate(new Date(), 'Asia/Bangkok', 'yyMMdd') +
                Math.floor(1000 + Math.random() * 9000);

    ordersSheet_().appendRow([ref, payload.email, count, sub, disc, CFG.DELIVERY,
                              net, used, gain, detail, 'PENDING', new Date()]);
    return { ok: true, ref, sub, disc, ship: CFG.DELIVERY, net, gain, used };
  } finally {
    lock.releaseLock();
  }
}

function confirmPayment(ref) {
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const sh = ordersSheet_();
    const data = sh.getDataRange().getValues();
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] !== ref) continue;
      if (data[i][10] === 'PAID') return { ok: false, msg: 'ออร์เดอร์นี้ชำระแล้ว' };

      sh.getRange(i + 1, 11).setValue('PAID');
      const uRow = findUserRow_(data[i][1]);
      const cur = Number(usersSheet_().getRange(uRow, 5).getValue()) || 0;
      const bal = Math.max(0, cur - Number(data[i][7]) + Number(data[i][8]));
      usersSheet_().getRange(uRow, 5).setValue(bal);

      return { ok: true, gain: Number(data[i][8]), balance: bal, net: Number(data[i][6]) };
    }
    return { ok: false, msg: 'ไม่พบคำสั่งซื้อนี้' };
  } finally {
    lock.releaseLock();
  }
}

function cancelOrder(ref) {
  const sh = ordersSheet_();
  const data = sh.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === ref && data[i][10] === 'PENDING') {
      sh.getRange(i + 1, 11).setValue('CANCELLED');
      return { ok: true };
    }
  }
  return { ok: false };
}

function getOrders(email) {
  const data = ordersSheet_().getDataRange().getValues();
  const tz = Session.getScriptTimeZone() || 'Asia/Bangkok';
  const out = [];
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][1]).toLowerCase() !== String(email).toLowerCase()) continue;
    if (data[i][10] === 'CANCELLED') continue;
    out.push({
      ref: data[i][0], items: data[i][2], net: data[i][6], gain: data[i][8],
      detail: data[i][9], status: data[i][10],
      date: Utilities.formatDate(new Date(data[i][11]), tz, 'dd/MM/yy HH:mm')
    });
  }
  return out.reverse();
}

/* ============ SETUP (รันครั้งเดียวก่อน Deploy) ============ */
function setup() {
  usersSheet_();
  ordersSheet_();
  Logger.log('✅ พร้อมใช้งาน — ฐานข้อมูล: ' + getSS_().getUrl());
}
