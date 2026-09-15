# เอกสารการออกแบบระบบ (Software Design Document)
## ระบบสะสมแต้มร้านขนมปังและเครื่องดื่ม (Bakery & Beverage Loyalty Program System)

---

## 1. บทนำและการกำหนดปัญหา (Problem Definition)
ในสภาวะการแข่งขันที่เข้มข้น การขาดระบบบริหารจัดการสมาชิกและบันทึกคะแนนสะสมผ่านแอปพลิเคชัน ส่งผลกระทบต่อการรักษาฐานลูกค้าประจำ (Customer Retention) ปัญหาที่พบคือ:
- การใช้บัตรสะสมคะแนนกระดาษเสี่ยงต่อการสูญหาย และลืมนำมาใช้
- ขาดระบบดิจิทัลในการจัดเก็บข้อมูลเชิงพฤติกรรม เพื่อนำไปกำหนดโปรโมชั่น
- ลูกค้าไม่สามารถตรวจสอบสถานะคะแนนได้แบบเรียลไทม์
- ขาดช่องทางสื่อสารโปรโมชั่น ข่าวสาร และคำแนะนำการเก็บรักษาสินค้า

## 2. กลุ่มผู้ใช้งาน (Stakeholders)
- **ลูกค้า (Customer):** ต้องการตรวจสอบคะแนน แลกรางวัล เข้าถึงง่ายผ่าน QR/NFC และรับคำแนะนำการเก็บรักษาสินค้า
- **พนักงาน (Staff):** ต้องการระบบบันทึกคะแนนที่รวดเร็ว แม่นยำ ไม่เป็นภาระในชั่วโมงเร่งด่วน
- **เจ้าของร้าน (Owner/Manager):** ต้องการข้อมูลสรุปยอดขาย (Dashboard) และการจัดการข้อมูลสมาชิกแบบรวมศูนย์ (Centralized Data)

## 3. ความต้องการของระบบ (System Requirements)
- **ระบบสมาชิกแบบไฮบริด:** รองรับบัตร Physical และ Mobile App / สแกน QR / แตะ NFC
- **ระบบจัดการเมนูและอายุสินค้า (Shelf Life):** 
  - ขนมปังสด/โฮมเมด: ระบบคำนวณวันหมดอายุอัตโนมัติ 7 วัน นับจากวันที่ผลิต
  - ขนมปังสำเร็จรูป: ระบบคำนวณวันหมดอายุอัตโนมัติ 2 เดือน นับจากวันที่ผลิต
- **ระบบคำนวณคะแนนอัตโนมัติ:** 
  - 20 บาท = 1 คะแนน
  - 50 บาท = 2 คะแนน
  - 60 บาท = 3 คะแนน
  - 100 บาท = 5 คะแนน
- **ระบบแจ้งเตือนวันหมดอายุคะแนน:** คะแนนมีอายุ 6 เดือน เตือนครั้งที่ 1 (ก่อน 30 วัน) และ ครั้งที่ 2 (ก่อน 7 วัน)

---

## 4. แผนผังภาพรวมระบบ (System Architecture)
แสดงการเชื่อมต่อระหว่าง หน้าร้าน, ระบบหลังบ้าน, ฐานข้อมูล และ LINE OA

```mermaid
graph TD
    classDef user fill:#f9d0c4,stroke:#333,stroke-width:2px;
    classDef system fill:#d4e6f1,stroke:#333,stroke-width:2px;
    classDef db fill:#d5f5e3,stroke:#333,stroke-width:2px;

    Customer(ลูกค้า):::user -->|สแกน QR / บอกเบอร์| POS[ระบบ POS หน้าร้าน]:::system
    Staff(พนักงาน):::user -->|คีย์ออเดอร์| POS
    
    POS -->|API: ส่งยอดซื้อ & ข้อมูลลูกค้า| Backend[Backend System Core
ระบบหลังบ้านหลัก]:::system
    Backend -->|บันทึกข้อมูล/อัปเดตแต้ม| DB[(Database
ฐานข้อมูล)]:::db
    DB -->|ดึงข้อมูลมาวิเคราะห์| Dashboard[Analytics Dashboard
แดชบอร์ดผู้บริหาร]:::system
    
    Manager(เจ้าของร้าน):::user -->|ดูรายงานยอดขาย/พฤติกรรม| Dashboard
    
    Backend -->|ส่งแจ้งแต้ม / วิธีเก็บขนมปัง| LineOA[LINE OA / Customer App]:::system
    LineOA -->|เช็คแต้ม / รับแจ้งเตือน| Customer
```

---

## 5. แผนภาพโครงสร้างฐานข้อมูล (ER Diagram)
การออกแบบ Database เบื้องต้นสำหรับจัดเก็บข้อมูลลูกค้า, ใบเสร็จ และสินค้า

```mermaid
erDiagram
    CUSTOMER ||--o{ TRANSACTION : "ทำรายการ"
    CUSTOMER {
        string customer_id PK "รหัสลูกค้า (เบอร์โทร/LINE ID)"
        string name "ชื่อลูกค้า"
        int total_points "คะแนนสะสมรวมปัจจุบัน"
        date point_expiry_date "วันหมดอายุคะแนน (6 เดือน)"
    }
    
    TRANSACTION ||--|{ TRANSACTION_ITEM : "ประกอบด้วย"
    TRANSACTION {
        string transaction_id PK "รหัสธุรกรรม (ใบเสร็จ)"
        string customer_id FK "รหัสลูกค้า"
        datetime timestamp "วันเวลาที่ซื้อ"
        decimal total_amount "ยอดเงินรวม"
        int points_awarded "คะแนนที่ได้รับ"
    }
    
    PRODUCT ||--o{ TRANSACTION_ITEM : "ถูกซื้อใน"
    PRODUCT {
        string product_id PK "รหัสสินค้า"
        string name "ชื่อสินค้า"
        decimal price "ราคา"
        int shelf_life_days "อายุการจัดเก็บ"
        string storage_instructions "วิธีเก็บรักษา"
    }
    
    TRANSACTION_ITEM {
        string transaction_id FK "รหัสธุรกรรม"
        string product_id FK "รหัสสินค้า"
        int quantity "จำนวนที่ซื้อ"
    }
```

---

## 6. ลำดับขั้นตอนการทำงาน (Sequence Diagram)
อธิบายลำดับการคุยกันของระบบ (API Flow) ตั้งแต่หน้าร้านไปจนถึงส่งแจ้งเตือน

```mermaid
sequenceDiagram
    autonumber
    actor Customer as ลูกค้า
    participant POS as หน้าร้าน (POS)
    participant Backend as ระบบหลังบ้านหลัก
    participant DB as ฐานข้อมูล
    participant Line as LINE OA

    Customer->>POS: สั่งซื้อสินค้า & แจ้งเบอร์โทร/สแกน QR
    POS->>Backend: ข้อมูลใบเสร็จ (รายการสินค้า, ยอดเงิน, รหัสลูกค้า)
    Backend->>DB: ดึงข้อมูลสินค้า (เช็คราคา และ Shelf Life)
    DB-->>Backend: ส่งข้อมูลสินค้ากลับมา
    Backend->>Backend: คำนวณแต้มตามเกณฑ์
    Backend->>DB: บันทึกใบเสร็จ และ อัปเดตแต้มลูกค้า
    DB-->>Backend: ยืนยันการบันทึกสำเร็จ
    Backend-->>POS: ส่งผลลัพธ์ (แต้มที่ได้รอบนี้, แต้มสะสมรวม)
    POS-->>Customer: พิมพ์ใบเสร็จ / พนักงานแจ้งแต้ม
    
    rect rgb(240, 248, 255)
    Note over Backend, Line: Background Process (ทำงานอัตโนมัติ)
    Backend->>Line: ส่งข้อความ: แจ้งแต้มสะสมล่าสุด
    Backend->>Line: ส่งข้อความ: แนะนำวิธีเก็บรักษาขนมปัง
    Line-->>Customer: เด้งแจ้งเตือนบนมือถือลูกค้า
    end
```

---

## 7. ขั้นตอนการสแกนสะสมแต้มหน้าร้าน (Flowchart)
เส้นทางการทำงานของพนักงานและลูกค้า (User Journey) ที่หน้าเคาน์เตอร์

```mermaid
flowchart TD
    A[พนักงานสรุปยอดซื้อสินค้า] --> B{ลูกค้าเป็นสมาชิกหรือไม่?}
    
    B -- เป็นสมาชิก --> C[ลูกค้าสแกน QR Code / แตะ NFC]
    B -- ไม่เป็นสมาชิก --> D{ลูกค้าต้องการสมัครหรือไม่?}
    
    D -- ต้องการ --> E[ลงทะเบียนผ่านเบอร์โทร/แอปพลิเคชัน]
    E --> C
    D -- ไม่ต้องการ --> F[จบการขายปกติ ไม่สะสมคะแนน]
    
    C --> G[ระบบดึงข้อมูลสมาชิกและคะแนนคงเหลือ]
    G --> H[คำนวณคะแนนอัตโนมัติตามยอดซื้อ]
    H --> I[อัปเดตคะแนนใหม่เข้าสู่ฐานข้อมูลส่วนกลาง]
    
    I --> J{มีคะแนนใกล้หมดอายุหรือไม่?}
    J -- มี (ภายใน 7 หรือ 30 วัน) --> K[ส่งการแจ้งเตือนให้ลูกค้าทราบ]
    K --> L[แสดงยอดคะแนนสะสมล่าสุด]
    J -- ไม่มี --> L
    
    L --> M[เสร็จสิ้นขั้นตอนการสะสมแต้ม]
```
