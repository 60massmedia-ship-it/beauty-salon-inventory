# Beauty Salon Inventory

ระบบจัดการสต็อคร้านเสริมสวยแบบ React/Vite

## Features

- Dashboard ภาพรวมสต็อค
- เพิ่มสินค้าใหม่ / รับเข้าสินค้าเดิม
- บันทึกเบิกออก / รับเข้า
- จัดการสินค้าและจำนวนคงเหลือ
- ประวัติต้นทุนสินค้า
- Export / Import ข้อมูล
- Popup แบบ React Portal เพื่อให้แสดงผลหน้าสุด

## Run locally

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
npm run preview
```

## Notes

เวอร์ชันนี้ใช้ `localStorage` สำหรับเก็บข้อมูลใน browser เหมาะกับ prototype / demo / ใช้งานเครื่องเดียว หากต้องการใช้งานจริงหลายเครื่อง แนะนำต่อฐานข้อมูลกลาง เช่น Supabase หรือ Firebase
