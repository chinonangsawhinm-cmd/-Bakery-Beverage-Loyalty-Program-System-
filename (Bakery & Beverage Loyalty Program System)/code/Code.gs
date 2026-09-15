// การตั้งค่า Google Sheets
// แนะนำให้ใส่ Spreadsheet ID ของคุณที่นี่ (นำมาจาก URL ของ Google Sheet)
const SPREADSHEET_ID = 'ใส่_SPREADSHEET_ID_ของคุณที่นี่'; 

function getSpreadsheet() {
  if (SPREADSHEET_ID === 'ใส่_SPREADSHEET_ID_ของคุณที่นี่') {
    return SpreadsheetApp.getActiveSpreadsheet(); // ใช้กรณีที่ผูก Script ไว้กับ Sheet โดยตรง
  }
  return SpreadsheetApp.openById(SPREADSHEET_ID);
}

// ฟังก์ชันรับ HTTP POST requests
function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const action = data.action;
    let result = {};

    if (action === 'register') {
      result = registerUser(data);
    } else if (action === 'addPoints') {
      result = addPoints(data);
    } else if (action === 'deductPoints') {
      result = deductPoints(data);
    } else if (action === 'getUserData') {
      result = getUserData(data);
    } else {
      result = { success: false, message: 'Action not found' };
    }

    return ContentService.createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ success: false, message: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// ฟังก์ชันรับ HTTP GET requests (เอาไว้ทดสอบว่า API ทำงานหรือไม่)
function doGet(e) {
  return ContentService.createTextOutput("ระบบ Bakery & Beverage Loyalty Program API ทำงานปกติ")
    .setMimeType(ContentService.MimeType.TEXT);
}

// ==========================================
// ส่วนของการจัดการข้อมูล (Business Logic)
// ==========================================

function registerUser(data) {
  const sheet = getSpreadsheet().getSheetByName('Users');
  const userId = data.userId || Utilities.getUuid();
  const name = data.name;
  const phone = data.phone;
  const timestamp = new Date();
  
  // ตรวจสอบว่ามีผู้ใช้นี้อยู่แล้วหรือไม่ (สมมติว่าเช็คจากเบอร์โทรศัพท์)
  const dataRange = sheet.getDataRange().getValues();
  for (let i = 1; i < dataRange.length; i++) {
    if (dataRange[i][2] == phone) { // คอลัมน์เบอร์โทรศัพท์ (Index 2)
      return { success: false, message: 'เบอร์โทรศัพท์นี้ถูกใช้งานแล้ว', userId: dataRange[i][0] };
    }
  }

  // เพิ่มผู้ใช้ใหม่ (UserID, Name, Phone, Points, CreatedAt)
  sheet.appendRow([userId, name, phone, 0, timestamp]);
  return { success: true, message: 'สมัครสมาชิกสำเร็จ', userId: userId };
}

function addPoints(data) {
  const sheet = getSpreadsheet().getSheetByName('Users');
  const userId = data.userId;
  const pointsToAdd = parseFloat(data.points);
  
  const dataRange = sheet.getDataRange().getValues();
  for (let i = 1; i < dataRange.length; i++) {
    if (dataRange[i][0] === userId) {
      const currentPoints = parseFloat(dataRange[i][3]) || 0;
      const newPoints = currentPoints + pointsToAdd;
      
      // อัปเดตคะแนนในชีต Users (แถวที่ i+1, คอลัมน์ที่ 4)
      sheet.getRange(i + 1, 4).setValue(newPoints);
      
      // บันทึกประวัติ
      logTransaction(userId, 'ADD', pointsToAdd);
      
      return { success: true, message: 'เพิ่มแต้มสำเร็จ', newPoints: newPoints };
    }
  }
  return { success: false, message: 'ไม่พบผู้ใช้งาน' };
}

function deductPoints(data) {
  const sheet = getSpreadsheet().getSheetByName('Users');
  const userId = data.userId;
  const pointsToDeduct = parseFloat(data.points);
  
  const dataRange = sheet.getDataRange().getValues();
  for (let i = 1; i < dataRange.length; i++) {
    if (dataRange[i][0] === userId) {
      const currentPoints = parseFloat(dataRange[i][3]) || 0;
      
      if (currentPoints < pointsToDeduct) {
        return { success: false, message: 'แต้มไม่พอสำหรับการแลก' };
      }
      
      const newPoints = currentPoints - pointsToDeduct;
      sheet.getRange(i + 1, 4).setValue(newPoints);
      
      // บันทึกประวัติ
      logTransaction(userId, 'DEDUCT', pointsToDeduct);
      
      return { success: true, message: 'หักแต้มสำเร็จ', newPoints: newPoints };
    }
  }
  return { success: false, message: 'ไม่พบผู้ใช้งาน' };
}

function getUserData(data) {
  const sheet = getSpreadsheet().getSheetByName('Users');
  const userId = data.userId;
  const phone = data.phone;
  
  const dataRange = sheet.getDataRange().getValues();
  for (let i = 1; i < dataRange.length; i++) {
    // หาจาก userId หรือ phone
    if ((userId && dataRange[i][0] === userId) || (phone && dataRange[i][2] == phone)) {
      return { 
        success: true, 
        user: {
          userId: dataRange[i][0],
          name: dataRange[i][1],
          phone: dataRange[i][2],
          points: dataRange[i][3]
        }
      };
    }
  }
  return { success: false, message: 'ไม่พบผู้ใช้งาน' };
}

function logTransaction(userId, action, points) {
  let sheet = getSpreadsheet().getSheetByName('Transactions');
  if (!sheet) {
    // สร้างชีตใหม่ถ้ายังไม่มี
    sheet = getSpreadsheet().insertSheet('Transactions');
    sheet.appendRow(['TransactionID', 'UserID', 'Action', 'Points', 'Timestamp']);
  }
  
  const transactionId = Utilities.getUuid();
  const timestamp = new Date();
  sheet.appendRow([transactionId, userId, action, points, timestamp]);
}

// ==========================================
// ฟังก์ชันสำหรับตั้งค่าเริ่มต้นใน Spreadsheet (รันครั้งเดียว)
// ==========================================
function setupInitialSheets() {
  const ss = getSpreadsheet();
  
  // ตั้งค่าชีต Users
  let usersSheet = ss.getSheetByName('Users');
  if (!usersSheet) {
    usersSheet = ss.insertSheet('Users');
    usersSheet.appendRow(['UserID', 'Name', 'Phone', 'Points', 'CreatedAt']);
    // ทำตัวหนาแถวแรก
    usersSheet.getRange("A1:E1").setFontWeight("bold");
  }
  
  // ตั้งค่าชีต Transactions
  let txSheet = ss.getSheetByName('Transactions');
  if (!txSheet) {
    txSheet = ss.insertSheet('Transactions');
    txSheet.appendRow(['TransactionID', 'UserID', 'Action', 'Points', 'Timestamp']);
    txSheet.getRange("A1:E1").setFontWeight("bold");
  }
}
