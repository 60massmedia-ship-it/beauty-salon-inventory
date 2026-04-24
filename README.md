# Beauty Salon Inventory

ระบบจัดการสต็อคร้านเสริมสวยด้วย **React + Vite + Tailwind CSS** สำหรับจัดการสินค้า รับเข้าสินค้า เบิกสินค้า ตรวจนับสต็อค และดู Dashboard ภาพรวมของร้าน

> สถานะปัจจุบัน: เวอร์ชันแยกโครงสร้างหลายไฟล์แล้ว เหมาะสำหรับต่อยอดฟีเจอร์และ Deploy ผ่าน Hostinger / GitHub ได้ง่ายขึ้น

---

## ฟีเจอร์หลัก

### Dashboard

- ภาพรวมจำนวนรายการสินค้า
- จำนวนสต็อครวม
- จำนวนสินค้าใกล้หมด
- มูลค่าสินค้าที่ใช้ไปเดือนนี้ โดยประมาณจากรายการเบิกออก
- ของที่ควรซื้อเพิ่มวันนี้
  - จำนวนคงเหลือ
  - จำนวนที่แนะนำให้ซื้อเพิ่ม
  - ซัพพลายเออร์ล่าสุด
  - งบประมาณโดยประมาณ
- สินค้าเบิกบ่อยที่สุดเดือนนี้
- สรุปตามหมวดหมู่
  - จำนวนรายการสินค้าในแต่ละหมวด
  - จำนวนสต็อครวม
  - มูลค่าสต็อคโดยประมาณ
  - จำนวนรายการที่ใกล้หมด
- สินค้าต้นทุนล่าสุดแพงสุด
- Top 5 ต้นทุนล่าสุดต่อหน่วย
- สินค้าต้นทุนเฉลี่ยสูงสุด
- รายการเคลื่อนไหวล่าสุด

### หน้าสต็อค

- เพิ่มสินค้าใหม่
- รับเข้าสินค้าเดิม
- บันทึกต้นทุนต่อหน่วยในแต่ละรอบการซื้อ
- บันทึกซัพพลายเออร์ / เลขที่บิล / หมายเหตุ
- บันทึกการเบิกสินค้าออก
- เลือกเหตุผลการเบิก
- บันทึกผู้เบิก / ผู้ทำรายการ
- แสดงจำนวนคงเหลือก่อนและหลังเบิก
- ตรวจนับสต็อคจริง
  - จำนวนในระบบ
  - จำนวนที่นับจริง
  - ส่วนต่าง
  - เหตุผลการตรวจนับ
  - ผู้ตรวจนับ
  - หมายเหตุ
- ประวัติการเคลื่อนไหวจริงจากรายการรับเข้า เบิกออก แก้ไข และตรวจนับ

### หน้าจัดการสินค้า

- ค้นหาสินค้า
- กรองตามหมวดหมู่
- กรองตามประเภทสินค้า
- แก้ไขข้อมูลสินค้า
- แก้ไขจำนวนคงเหลือ
- ตั้งค่าแจ้งเตือนขั้นต่ำรายสินค้า
- ดูประวัติต้นทุนสินค้า
- ดูซัพพลายเออร์ล่าสุด
- ลบสินค้า
- Mobile Product Card สำหรับมือถือ

### Export / Import

- Export ข้อมูลทั้งหมดเป็น JSON สำหรับ Backup และ Import กลับ
- Export รายการสินค้าเป็น CSV
- Export ประวัติรายการเป็น CSV
- Export ประวัติต้นทุนเป็น CSV
- Import ข้อมูลจากไฟล์ JSON ที่ Export จากระบบนี้

### UX/UI

- รองรับ Desktop และ Smartphone
- บนมือถือใช้ Bottom Navigation
- Popup ใช้ React Portal และแสดงอยู่บนสุดเสมอ
- Popup บนมือถือแสดงเป็น Bottom Sheet
- Product List บนมือถือแสดงเป็น Card แทน Table
- รองรับ iPhone Safe Area

---

## โครงสร้างโปรเจกต์ปัจจุบัน

```text
src/
├─ main.jsx
├─ AppSplit.jsx
├─ index.css
├─ data/
│  └─ constants.js
├─ lib/
│  ├─ export.js
│  └─ inventory.js
└─ components/
   ├─ Dashboard.jsx
   ├─ ProductPage.jsx
   ├─ StockPage.jsx
   └─ ui.jsx
```

### ไฟล์สำคัญ

- `src/AppSplit.jsx` — Shell หลักของแอป, Tab Navigation, Export/Import
- `src/components/Dashboard.jsx` — Dashboard และสถิติทั้งหมด
- `src/components/StockPage.jsx` — รับเข้า, เบิกออก, ตรวจนับสต็อค, ประวัติรายการ
- `src/components/ProductPage.jsx` — จัดการสินค้า, แก้ไข, ลบ, ดูประวัติต้นทุน
- `src/components/ui.jsx` — UI components เช่น Button, Card, Modal, Field
- `src/lib/inventory.js` — Logic จัดการสินค้า, ต้นทุน, reorder suggestion
- `src/lib/export.js` — Export JSON / CSV
- `src/data/constants.js` — ค่าคงที่ เช่น หมวดหมู่, หน่วย, ประเภทสินค้า, เหตุผลการเบิก

---

## วิธีรันในเครื่อง

```bash
npm install
npm run dev
```

หลังจากรันแล้ว เปิด URL ที่ Vite แสดงใน Terminal เช่น:

```text
http://localhost:5173
```

---

## วิธี Build สำหรับ Production

```bash
npm run build
npm run preview
```

ไฟล์สำหรับ Deploy จะอยู่ในโฟลเดอร์:

```text
dist/
```

---

## Deploy บน Hostinger

ใช้ค่า Build ตามนี้:

```bash
npm install
npm run build
```

Output directory:

```text
dist
```

หากใช้ GitHub integration บน Hostinger ให้เลือก repository นี้ แล้วตั้งค่า build command/output directory ตามด้านบน จากนั้นกด Redeploy / Rebuild

---

## หมายเหตุเรื่องการเก็บข้อมูล

เวอร์ชันปัจจุบันใช้ `localStorage` ของ Browser เพื่อเก็บข้อมูล เหมาะสำหรับ:

- Prototype
- Demo
- ทดลองใช้งาน
- ใช้งานเครื่องเดียวหรือ Browser เดียว

ข้อจำกัด:

- เปิดคนละเครื่อง ข้อมูลจะไม่ Sync กัน
- ล้าง Browser หรือเปลี่ยนเครื่อง ข้อมูลอาจหาย
- ยังไม่มีระบบ Login / Permission
- ยังไม่มีฐานข้อมูลกลาง

หากต้องการใช้งานจริงหลายเครื่อง แนะนำอัปเกรดเป็นฐานข้อมูลกลาง เช่น:

- Supabase
- Firebase
- PostgreSQL Backend

---

## Roadmap ต่อไป

### Phase 1 — เสร็จแล้ว

- Dashboard ของที่ควรซื้อเพิ่มวันนี้
- มูลค่าสินค้าที่ใช้ไปเดือนนี้
- สินค้าเบิกบ่อยที่สุดเดือนนี้
- สรุปตามหมวดหมู่
- ตรวจนับสต็อคจริง
- ประวัติรายการในหน้าสต็อคแสดงข้อมูลจริง
- แยกโครงสร้างโปรเจกต์เป็นหลายไฟล์

### Phase 2 — แนะนำทำต่อ

- หน้า Supplier แยกโดยเฉพาะ
- รูปภาพสินค้า
- Barcode / QR Code สำหรับค้นหาและเบิกสินค้า
- ปิดใช้งานสินค้าแทนการลบถาวร
- รายงานรายเดือน
- ปรับ UX มือถือเพิ่มเติม

### Phase 3 — Production จริงหลายเครื่อง

- Login
- Role / Permission สำหรับเจ้าของร้านและพนักงาน
- Cloud Database เช่น Supabase
- Sync ข้อมูลทุกเครื่อง
- Realtime stock update
- Backup อัตโนมัติ

---

## Tech Stack

- React
- Vite
- Tailwind CSS v3
- localStorage
- GitHub + Hostinger Deployment

---

## Version Notes

เวอร์ชันปัจจุบันใช้ `AppSplit.jsx` เป็น entry component ผ่าน `src/main.jsx` และแยก logic / components ออกจากไฟล์ใหญ่แล้ว เพื่อให้แก้ไขและต่อยอดได้ปลอดภัยกว่าเดิม
