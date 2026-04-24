import { useEffect } from 'react';

export const LANGUAGE_STORAGE_KEY = 'beauty_salon_inventory_language_mode';

const dictionary = {
  'ระบบจัดการสต็อคร้านเสริมสวย': 'Beauty Salon Inventory System',
  'ออกแบบสำหรับเจ้าของร้านและพนักงาน ใช้งานง่ายบนมือถือ ดูต้นทุน เบิกสินค้า รับเข้า และเช็คของที่ควรซื้อเพิ่มได้เร็วขึ้น': 'Designed for salon owners and staff. Mobile-friendly for costs, stock issue, receiving, and reorder checks.',
  'วันนี้': 'Today',
  'สินค้าในระบบ': 'Products',
  'ใกล้หมด': 'Low stock',
  'รายการ': 'items',
  'ภาพรวมร้าน': 'Store overview',
  'บันทึกสต็อค': 'Stock Log',
  'รับเข้า / เบิกออก': 'Receive / Issue',
  'จัดการสินค้า': 'Products',
  'สินค้าและต้นทุน': 'Products & costs',
  'Export ข้อมูล': 'Export Data',
  'เลือกประเภทไฟล์ที่ต้องการดาวน์โหลด': 'Choose the file type to download',
  'สำรองข้อมูลทั้งหมด และใช้ Import กลับเข้าระบบได้': 'Back up all data and import it back into the system later',
  'รายการสินค้า CSV': 'Products CSV',
  'เปิดดูใน Excel / Google Sheets': 'Open in Excel / Google Sheets',
  'ประวัติรายการ CSV': 'Transaction History CSV',
  'Export ประวัติรับเข้า เบิกออก แก้ไข และลบสินค้า': 'Export receiving, issuing, editing, and deleting history',
  'ประวัติต้นทุน CSV': 'Cost History CSV',
  'Export ประวัติต้นทุนแต่ละรอบ': 'Export cost history by receiving round',

  'จำนวนรายการสินค้า': 'Product SKUs',
  'สินค้าทั้งหมดในระบบ': 'Total products in the system',
  'จำนวนสต็อครวม': 'Total stock quantity',
  'รวมทุกหมวดหมู่': 'Across all categories',
  'สินค้าใกล้หมด': 'Low stock products',
  'ควรตรวจสอบและสั่งเพิ่ม': 'Review and reorder soon',
  'มูลค่าสินค้าที่ใช้ไปเดือนที่เลือก': 'Usage value for selected month',
  'สรุปการเบิกสินค้ารายเดือน': 'Monthly Stock Issue Summary',
  'เลือกเดือนและปีได้ครบ 12 เดือน แม้เดือนนั้นยังไม่มีรายการเบิก ระบบจะแสดงว่าไม่มีข้อมูล': 'Choose any month and year. If there are no stock issues, the system will show an empty state.',
  'เดือน': 'Month',
  'ปี': 'Year',
  'จำนวนรายการเบิก': 'Issue entries',
  'จำนวนรวมที่ถูกเบิก': 'Total issued quantity',
  'มูลค่าใช้ไปโดยประมาณ': 'Estimated usage value',
  'เบิกมากที่สุด': 'Most issued item',
  'ยังไม่มีข้อมูล': 'No data yet',
  'รายการสินค้าที่ถูกเบิกในเดือนนี้': 'Items issued this month',
  'สินค้า': 'Product',
  'หมวดหมู่': 'Category',
  'จำนวนเบิก': 'Issued quantity',
  'จำนวนครั้ง': 'Entries',
  'มูลค่าโดยประมาณ': 'Estimated value',
  'ครั้ง': 'times',
  'เดือนนี้ยังไม่มีรายการเบิกออก': 'No stock issues this month',
  'สรุปตามหมวดหมู่ของเดือนที่เลือก': 'Category summary for selected month',
  'มูลค่ารวม': 'Total value',
  'หมวดหมู่': 'categories',
  'ไม่มีการเบิกในเดือนนี้': 'No stock issues this month',
  'สรุปรายวันในเดือนที่เลือก': 'Daily summary for selected month',
  'ยังไม่มีข้อมูลรายวัน': 'No daily data yet',
  'ของที่ควรซื้อเพิ่มวันนี้': 'Items to Reorder Today',
  'คำนวณจากจำนวนคงเหลือเทียบกับค่าแจ้งเตือนขั้นต่ำ และประเมินงบจากต้นทุนเฉลี่ย': 'Calculated from current stock vs. minimum stock, with budget estimated from average cost.',
  'รวมประมาณ': 'Estimated total',
  'ซัพพลายเออร์ล่าสุด': 'Latest supplier',
  'แนะนำซื้อ': 'Suggested order',
  'งบประมาณ': 'Budget',
  'วันนี้ยังไม่มีสินค้าใกล้หมด': 'No low-stock items today',
  'สต็อคทุกตัวสูงกว่าระดับแจ้งเตือนขั้นต่ำ': 'All items are above their minimum stock levels',
  'สรุปตามหมวดหมู่ของสต็อคปัจจุบัน': 'Current Stock by Category',
  'แสดงสัดส่วนตามมูลค่าสต็อค เพื่อดูว่าเงินจมอยู่ในหมวดไหนมากที่สุด': 'Shows stock value by category so you can see where inventory money is concentrated.',
  'จำนวนคงเหลือรวม': 'Total stock',
  'ยังไม่มีมูลค่าสต็อค': 'No stock value yet',
  'รายการเคลื่อนไหวล่าสุด': 'Latest Activity',
  'ยังไม่มีประวัติรายการ': 'No transaction history yet',
  'สินค้าต้นทุนล่าสุดแพงสุด': 'Highest Latest Unit Cost',
  'อันดับ 1': 'No. 1',
  'Top 5 ต้นทุนล่าสุดต่อหน่วย': 'Top 5 Latest Unit Costs',
  'สินค้าต้นทุนเฉลี่ยสูงสุด': 'Highest Average Unit Cost',

  'รับเข้า / เพิ่มสินค้า': 'Receive / Add Product',
  'ของเข้าให้บันทึกที่ส่วนนี้ เพื่อเก็บต้นทุนและซัพพลายเออร์': 'Record incoming stock here to keep cost and supplier history.',
  'เพิ่มสินค้าใหม่': 'Add New Product',
  'รับเข้าสินค้าเดิม': 'Receive Existing Product',
  'เลือกสินค้าเดิม': 'Select existing product',
  'ชื่อสินค้า': 'Product name',
  'รหัสสินค้า / SKU': 'SKU / Product code',
  'ประเภทสินค้า': 'Product type',
  'หน่วย': 'Unit',
  'แจ้งเตือนขั้นต่ำ': 'Minimum stock alert',
  'จำนวนซื้อเข้า': 'Received quantity',
  'ต้นทุนต่อหน่วยรอบนี้': 'Unit cost this round',
  'ซัพพลายเออร์': 'Supplier',
  'หมายเหตุ': 'Notes',
  'บันทึกรับเข้า': 'Save Receiving',
  'พบรายการสินค้าที่อาจซ้ำกัน': 'Possible Duplicate Product Found',
  'ตรวจสอบก่อนบันทึก เพื่อป้องกันสต็อคซ้ำหรือข้อมูลแยกผิดรายการ': 'Review before saving to prevent duplicate stock or split records.',
  'ระบบเจอสินค้าที่คล้ายกับรายการเดิม': 'The system found a similar product already in the system.',
  'รายการเดิมในระบบ': 'Existing product',
  'รายการที่กำลังเพิ่ม': 'New product being added',
  'คงเหลือ': 'Stock',
  'จำนวนรับเข้า': 'Receiving qty',
  'ต้นทุนรอบนี้': 'Cost this round',
  'รวมเข้าสต็อคเดิม': 'Merge into Existing Stock',
  'เพิ่มเป็นสินค้าใหม่': 'Add as New Product',
  'บันทึกการเบิกสินค้า': 'Record Stock Issue',
  'ใช้สำหรับตัดสต็อคออกเท่านั้น': 'Use this only to deduct stock.',
  'เลือกสินค้า': 'Select product',
  'คงเหลือปัจจุบัน': 'Current stock',
  'หลังเบิก': 'After issue',
  'วันที่เบิก': 'Issue date',
  'จำนวนที่เบิก': 'Issue quantity',
  'เหตุผลการเบิก': 'Issue reason',
  'ผู้เบิก / ผู้ทำรายการ': 'Staff / Operator',
  'หมายเหตุเพิ่มเติม': 'Additional notes',
  'ประวัติการเคลื่อนไหว': 'Stock Movement History',

  'จัดการสินค้าและจำนวนคงเหลือ': 'Manage Products & Stock',
  'ดูจำนวนคงเหลือ ต้นทุนเฉลี่ย และมูลค่าสต็อคคงเหลือของแต่ละสินค้า': 'View stock quantity, average cost, and remaining stock value by product.',
  'มูลค่าสต็อครวมทั้งหมด': 'Total inventory value',
  'มูลค่าของรายการที่แสดง': 'Value of displayed items',
  'สินค้ามูลค่าสต็อคสูงสุด': 'Highest stock-value item',
  'มูลค่าคงเหลือ': 'Remaining value',
  'ต้นทุนเฉลี่ย': 'Average cost',
  'ต้นทุนล่าสุด': 'Latest cost',
  'แก้ไข': 'Edit',
  'สต็อค': 'Stock',
  'ต้นทุน': 'Cost',
  'ลบ': 'Delete',
  'ไม่พบสินค้า': 'No products found',
  'แก้ไขข้อมูลสินค้า': 'Edit Product Details',
  'แก้ไขรายละเอียดสินค้าโดยไม่กระทบจำนวนคงเหลือ': 'Edit product details without changing stock quantity.',
  'แก้ไขจำนวนคงเหลือ': 'Edit Stock Quantity',
  'จำนวนคงเหลือใหม่': 'New stock quantity',
  'ยืนยันการลบสินค้า': 'Confirm Product Deletion',
  'ยืนยันลบสินค้า': 'Confirm delete',
  'ประวัติต้นทุนสินค้า': 'Product Cost History',
  'เปิดข้อมูลต้นทุนของสินค้าแล้ว': 'Product cost history is open.',
  'รวมซื้อเข้า': 'Total received',
  'วันที่': 'Date',
  'จำนวนเข้า': 'Received qty',
  'ต้นทุน/หน่วย': 'Cost/unit',
  'ยังไม่มีประวัติต้นทุนจากการรับเข้า': 'No cost history from receiving yet',
};

const originalTextMap = new WeakMap();

function translateText(text, language) {
  if (language !== 'en') return text;
  const normalized = text.replace(/\s+/g, ' ').trim();
  return dictionary[normalized] || text;
}

function translateElement(root, language) {
  if (!root || typeof document === 'undefined') return;
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      const parent = node.parentElement;
      if (!parent) return NodeFilter.FILTER_REJECT;
      if (['SCRIPT', 'STYLE', 'INPUT', 'TEXTAREA', 'OPTION'].includes(parent.tagName)) return NodeFilter.FILTER_REJECT;
      if (!node.nodeValue || !node.nodeValue.trim()) return NodeFilter.FILTER_REJECT;
      return NodeFilter.FILTER_ACCEPT;
    },
  });

  const nodes = [];
  while (walker.nextNode()) nodes.push(walker.currentNode);

  nodes.forEach((node) => {
    if (!originalTextMap.has(node)) originalTextMap.set(node, node.nodeValue);
    const original = originalTextMap.get(node);
    node.nodeValue = language === 'en' ? translateText(original, 'en') : original;
  });
}

export function useAutoTranslate(language) {
  useEffect(() => {
    if (typeof document === 'undefined') return undefined;
    const root = document.getElementById('root');
    translateElement(root, language);
    document.documentElement.lang = language === 'en' ? 'en' : 'th';

    const observer = new MutationObserver(() => {
      translateElement(root, language);
    });
    if (root) observer.observe(root, { childList: true, subtree: true, characterData: true });
    return () => observer.disconnect();
  }, [language]);
}
