import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';

const STORAGE_KEYS = {
  products: 'beauty_salon_inventory_products_v5_mobile',
  transactions: 'beauty_salon_inventory_transactions_v5_mobile',
  costHistory: 'beauty_salon_inventory_cost_history_v5_mobile',
};

const categoryOptions = ['แชมพู / ทรีตเมนต์', 'เคมีทำสี / ยืด / ดัด', 'สกินแคร์ / บิวตี้', 'อุปกรณ์ทำผม', 'ของใช้สิ้นเปลือง', 'สินค้า Retail ขายหน้าร้าน', 'อื่น ๆ'];
const unitOptions = ['ชิ้น', 'ขวด', 'กล่อง', 'ซอง', 'แพ็ค', 'หลอด', 'กิโลกรัม', 'ลิตร'];
const productTypeOptions = ['สินค้าใช้แล้วหมดไป', 'อุปกรณ์ใช้ระยะยาว', 'สินค้าขายหน้าร้าน', 'วัสดุสิ้นเปลืองร้าน', 'สินทรัพย์ร้าน'];
const inboundReasons = ['ซื้อสินค้าเข้าใหม่', 'เติมสต็อคประจำรอบ', 'ของแถมจากซัพพลายเออร์', 'รับคืนจากพนักงาน', 'รับคืนจากลูกค้า', 'ปรับยอดจากการตรวจนับ', 'อื่น ๆ'];
const outboundReasons = ['ใช้กับลูกค้า', 'ใช้ในบริการหน้าร้าน', 'ขายหน้าร้าน', 'สินค้าชำรุด / เสียหาย', 'หมดอายุ', 'ทดลองใช้ / เทรนนิ่งพนักงาน', 'แจกโปรโมชัน / ของแถม', 'ปรับยอดจากการตรวจนับ', 'อื่น ๆ'];

function createId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

const nowIso = () => new Date().toISOString();
const toNumber = (value, fallback = 0) => (Number.isFinite(Number(value)) ? Number(value) : fallback);
const normalizeText = (value) => String(value || '').trim().replace(/[ ]+/g, ' ').toLowerCase();
const formatMoney = (value) => new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB', maximumFractionDigits: 0 }).format(toNumber(value));
const formatNumber = (value) => new Intl.NumberFormat('th-TH', { maximumFractionDigits: 2 }).format(toNumber(value));

function createProduct(data = {}) {
  return {
    id: data.id || createId(),
    name: data.name || '',
    sku: data.sku || '',
    category: data.category || categoryOptions[0],
    productType: data.productType || productTypeOptions[0],
    stock: Math.max(0, toNumber(data.stock)),
    unit: data.unit || unitOptions[0],
    minStock: Math.max(0, toNumber(data.minStock, 5)),
    cost: Math.max(0, toNumber(data.cost)),
    supplier: data.supplier || '',
    note: data.note || '',
    updatedAt: data.updatedAt || nowIso(),
  };
}

function createCostRecord(data = {}) {
  return {
    id: data.id || createId(),
    productId: data.productId || '',
    productName: data.productName || '',
    quantity: Math.max(0, toNumber(data.quantity)),
    unitCost: Math.max(0, toNumber(data.unitCost)),
    supplier: data.supplier || '',
    invoiceNo: data.invoiceNo || '',
    note: data.note || '',
    createdAt: data.createdAt || nowIso(),
  };
}

const sampleProducts = [
  createProduct({ name: 'แชมพู Keratin Smooth', sku: 'SH-KER-001', category: 'แชมพู / ทรีตเมนต์', productType: 'สินค้าใช้แล้วหมดไป', stock: 18, unit: 'ขวด', minStock: 6, cost: 220, supplier: 'Beauty Supply Bangkok', note: 'ใช้สำหรับงานสระไดร์และขายหน้าร้าน' }),
  createProduct({ name: 'ครีมย้อมผม Ash Brown', sku: 'HC-ASH-005', category: 'เคมีทำสี / ยืด / ดัด', productType: 'สินค้าใช้แล้วหมดไป', stock: 8, unit: 'กล่อง', minStock: 10, cost: 120, supplier: 'Pro Hair Color', note: 'สีขายดี ควรเช็คทุกสัปดาห์' }),
  createProduct({ name: 'ผ้าคลุมตัดผม Premium', sku: 'EQ-CAPE-010', category: 'อุปกรณ์ทำผม', productType: 'อุปกรณ์ใช้ระยะยาว', stock: 12, unit: 'ชิ้น', minStock: 4, cost: 180, supplier: 'Salon Tools', note: 'อุปกรณ์ใช้ในร้าน' }),
];

const sampleCostHistory = sampleProducts.map((product) => createCostRecord({
  productId: product.id,
  productName: product.name,
  quantity: product.stock,
  unitCost: product.cost,
  supplier: product.supplier,
  invoiceNo: 'DEMO-001',
  note: 'ข้อมูลตัวอย่างเริ่มต้น',
  createdAt: product.updatedAt,
}));

function readStorage(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function normalizeProducts(products) {
  return Array.isArray(products) ? products.map((item) => createProduct(item)) : sampleProducts;
}

function normalizeCosts(records) {
  return Array.isArray(records) ? records.map((item) => createCostRecord(item)) : sampleCostHistory;
}

function csvEscape(value) {
  const text = String(value ?? '');
  return `"${text.replace(/"/g, '""')}"`;
}

function buildCsv(rows) {
  return rows.map((row) => row.map(csvEscape).join(',')).join(String.fromCharCode(10));
}

function downloadBlob(filename, body, type) {
  const blob = new Blob([body], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function getCostStats(records) {
  const valid = records.filter((item) => toNumber(item.quantity) > 0 && toNumber(item.unitCost) >= 0);
  if (!valid.length) return { latestCost: 0, averageCost: 0, minCost: 0, maxCost: 0, totalQty: 0 };
  const sorted = [...valid].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  const totalQty = valid.reduce((sum, item) => sum + toNumber(item.quantity), 0);
  const totalValue = valid.reduce((sum, item) => sum + toNumber(item.quantity) * toNumber(item.unitCost), 0);
  const costs = valid.map((item) => toNumber(item.unitCost));
  return {
    latestCost: toNumber(sorted[0]?.unitCost),
    averageCost: totalQty ? totalValue / totalQty : 0,
    minCost: Math.min(...costs),
    maxCost: Math.max(...costs),
    totalQty,
  };
}

function getSupplierStats(records) {
  const suppliers = records.map((record) => String(record.supplier || '').trim()).filter(Boolean);
  const unique = Array.from(new Set(suppliers));
  const sorted = [...records].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  return {
    latestSupplier: sorted.find((record) => String(record.supplier || '').trim())?.supplier || '',
    supplierCount: unique.length,
  };
}

function findDuplicateProduct(products, form) {
  const sku = normalizeText(form.sku);
  if (sku) {
    const skuMatch = products.find((product) => normalizeText(product.sku) === sku);
    if (skuMatch) return { product: skuMatch, reason: 'SKU ซ้ำกัน' };
  }
  const nameMatch = products.find((product) =>
    normalizeText(product.name) === normalizeText(form.name) &&
    normalizeText(product.category) === normalizeText(form.category) &&
    normalizeText(product.unit) === normalizeText(form.unit)
  );
  return nameMatch ? { product: nameMatch, reason: 'ชื่อสินค้า หมวดหมู่ และหน่วยเหมือนกัน' } : null;
}

function Button({ children, type = 'button', className = '', onClick, disabled }) {
  return <button type={type} onClick={onClick} disabled={disabled} className={`inline-flex min-h-[44px] items-center justify-center rounded-2xl px-4 py-3 text-sm font-black transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 ${className}`}>{children}</button>;
}

function Card({ children, className = '' }) {
  return <div className={`rounded-3xl border border-white/70 bg-white/85 shadow-sm backdrop-blur ${className}`}>{children}</div>;
}

function Field({ label, children, helper, className = '' }) {
  return <label className={`space-y-1 ${className}`}><span className="text-sm font-black text-neutral-700">{label}</span>{children}{helper ? <p className="text-xs text-neutral-400">{helper}</p> : null}</label>;
}

function TextInput(props) {
  return <input {...props} className={`w-full rounded-2xl border border-neutral-200 bg-white px-4 py-3 outline-none focus:border-neutral-950 ${props.className || ''}`} />;
}

function SelectInput(props) {
  return <select {...props} className={`w-full rounded-2xl border border-neutral-200 bg-white px-4 py-3 outline-none focus:border-neutral-950 ${props.className || ''}`} />;
}

function TextArea(props) {
  return <textarea {...props} className={`min-h-20 w-full rounded-2xl border border-neutral-200 bg-white px-4 py-3 outline-none focus:border-neutral-950 ${props.className || ''}`} />;
}

function Modal({ title, subtitle, children, onCancel, onSave, saveText = '💾 บันทึกข้อมูล', maxWidth = 'max-w-xl', hideSave = false }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, []);

  if (!mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-[2147483647] bg-black/75 pointer-events-auto">
      <div className="fixed inset-x-0 bottom-0 z-[2147483647] flex justify-center px-0 md:inset-x-0 md:top-[108px] md:bottom-0 md:overflow-y-auto md:px-3 md:pb-5">
        <div className={`relative flex h-[88dvh] w-full flex-col overflow-hidden rounded-t-[2rem] bg-white shadow-2xl ring-1 ring-black/10 md:my-4 md:h-auto md:max-h-[calc(100dvh-130px)] md:rounded-2xl ${maxWidth}`}>
          <div className="shrink-0 border-b border-neutral-100 bg-white px-5 pb-4 pt-3 md:py-4">
            <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-neutral-300 md:hidden" />
            <h3 className="text-lg font-black text-neutral-950 md:text-xl">{title}</h3>
            {subtitle ? <p className="mt-1 text-xs text-neutral-500">{subtitle}</p> : null}
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-4">{children}</div>
          <div className={`shrink-0 grid gap-3 border-t border-neutral-100 bg-white px-5 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-4 shadow-[0_-8px_24px_rgba(0,0,0,0.08)] ${hideSave ? 'grid-cols-1' : 'grid-cols-2'}`}>
            <Button className="w-full border border-red-200 bg-red-50 text-red-700 hover:bg-red-100" onClick={onCancel}>{hideSave ? 'ปิด' : '✕ ยกเลิก'}</Button>
            {!hideSave ? <Button className="w-full bg-neutral-950 text-white hover:bg-neutral-800" onClick={onSave}>{saveText}</Button> : null}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

function StatCard({ icon, title, value, subtitle }) {
  return <Card className="p-5"><div className="flex items-center gap-4"><div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-neutral-950 text-xl text-white shadow-sm">{icon}</div><div className="min-w-0"><p className="text-sm text-neutral-500">{title}</p><p className="truncate text-2xl font-black tracking-tight text-neutral-950">{value}</p><p className="text-xs text-neutral-400">{subtitle}</p></div></div></Card>;
}

function ProductForm({ products, setProducts, setTransactions, setCostHistory }) {
  const emptyForm = { name: '', sku: '', category: categoryOptions[0], productType: productTypeOptions[0], purchaseQuantity: 0, minStock: 5, unit: unitOptions[0], cost: 0, supplier: '', invoiceNo: '', note: '' };
  const [formMode, setFormMode] = useState('new');
  const [existingProductId, setExistingProductId] = useState(products[0]?.id || '');
  const [form, setForm] = useState(emptyForm);
  const [duplicatePrompt, setDuplicatePrompt] = useState(null);
  const selectedExistingProduct = products.find((product) => product.id === existingProductId);
  const updateField = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  useEffect(() => {
    if (!existingProductId && products[0]) setExistingProductId(products[0].id);
    if (existingProductId && !products.some((product) => product.id === existingProductId)) setExistingProductId(products[0]?.id || '');
  }, [products, existingProductId]);

  useEffect(() => {
    if (formMode === 'existing' && selectedExistingProduct) {
      setForm((prev) => ({ ...prev, cost: selectedExistingProduct.cost || 0, supplier: selectedExistingProduct.supplier || '' }));
    }
  }, [formMode, selectedExistingProduct]);

  const addAsNewProduct = (payload) => {
    setProducts((prev) => [payload.product, ...prev]);
    setCostHistory((prev) => [payload.costRecord, ...prev]);
    setTransactions((prev) => [{ id: createId(), productId: payload.product.id, productName: payload.product.name, type: 'in', quantity: payload.purchaseQuantity, reason: `เพิ่มสินค้าใหม่พร้อมจำนวนซื้อเข้า ต้นทุน ${formatMoney(payload.cost)}`, createdAt: nowIso() }, ...prev]);
    setForm(emptyForm);
    setDuplicatePrompt(null);
  };

  const mergeIntoExistingProduct = (targetProduct, payload) => {
    const nextStock = toNumber(targetProduct.stock) + payload.purchaseQuantity;
    const nextCost = payload.cost > 0 ? payload.cost : targetProduct.cost;
    const nextSupplier = payload.product?.supplier || targetProduct.supplier;
    setProducts((prev) => prev.map((item) => item.id === targetProduct.id ? { ...item, stock: nextStock, cost: nextCost, supplier: nextSupplier, updatedAt: nowIso() } : item));
    setCostHistory((prev) => [createCostRecord({ ...payload.costRecord, productId: targetProduct.id, productName: targetProduct.name }), ...prev]);
    setTransactions((prev) => [{ id: createId(), productId: targetProduct.id, productName: targetProduct.name, type: 'in', quantity: payload.purchaseQuantity, reason: `รวมเข้าสต็อคเดิมจากฟอร์มเพิ่มสินค้า | ต้นทุนรอบนี้ ${formatMoney(payload.cost)}`, createdAt: nowIso() }, ...prev]);
    setForm(emptyForm);
    setDuplicatePrompt(null);
  };

  const buildNewPayload = () => {
    const name = form.name.trim();
    const purchaseQuantity = Math.max(0, toNumber(form.purchaseQuantity));
    const cost = Math.max(0, toNumber(form.cost));
    const newProduct = createProduct({ name, sku: form.sku, category: form.category, productType: form.productType, stock: purchaseQuantity, unit: form.unit, minStock: form.minStock, cost, supplier: form.supplier, note: form.note });
    const newCostRecord = createCostRecord({ productId: newProduct.id, productName: newProduct.name, quantity: purchaseQuantity, unitCost: cost, supplier: form.supplier, invoiceNo: form.invoiceNo, note: form.note });
    return { product: newProduct, costRecord: newCostRecord, purchaseQuantity, cost };
  };

  const buildExistingPayload = (targetProduct) => {
    const purchaseQuantity = Math.max(0, toNumber(form.purchaseQuantity));
    const cost = Math.max(0, toNumber(form.cost));
    return {
      product: { ...targetProduct, supplier: form.supplier },
      costRecord: createCostRecord({ productId: targetProduct.id, productName: targetProduct.name, quantity: purchaseQuantity, unitCost: cost, supplier: form.supplier, invoiceNo: form.invoiceNo, note: form.note }),
      purchaseQuantity,
      cost,
    };
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    if (formMode === 'existing') {
      if (!selectedExistingProduct) return window.alert('กรุณาเลือกสินค้าที่มีอยู่แล้ว');
      const payload = buildExistingPayload(selectedExistingProduct);
      if (payload.purchaseQuantity <= 0) return window.alert('กรุณากรอกจำนวนซื้อเข้ามากกว่า 0');
      mergeIntoExistingProduct(selectedExistingProduct, payload);
      return;
    }
    if (!form.name.trim()) return window.alert('กรุณากรอกชื่อสินค้า');
    const payload = buildNewPayload();
    const duplicate = findDuplicateProduct(products, form);
    if (duplicate) return setDuplicatePrompt({ ...duplicate, payload });
    addAsNewProduct(payload);
  };

  return (
    <Card className="p-4 md:p-6">
      <div className="mb-5"><h2 className="text-xl font-black text-neutral-950">รับเข้า / เพิ่มสินค้า</h2><p className="text-sm text-neutral-500">เลือกเติมสต็อคสินค้าที่มีอยู่แล้ว หรือเพิ่มสินค้าใหม่จริง ๆ</p></div>
      <div className="mb-5 grid grid-cols-2 gap-2 rounded-3xl bg-neutral-100 p-2">
        <button type="button" onClick={() => setFormMode('new')} className={`rounded-2xl px-3 py-3 text-sm font-black transition ${formMode === 'new' ? 'bg-neutral-950 text-white shadow-sm' : 'text-neutral-600 hover:bg-white'}`}>เพิ่มสินค้าใหม่</button>
        <button type="button" onClick={() => setFormMode('existing')} className={`rounded-2xl px-3 py-3 text-sm font-black transition ${formMode === 'existing' ? 'bg-neutral-950 text-white shadow-sm' : 'text-neutral-600 hover:bg-white'}`}>รับเข้าสินค้าเดิม</button>
      </div>
      <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-2">
        {formMode === 'existing' ? (
          <>
            <Field label="เลือกสินค้าที่มีอยู่แล้ว" className="md:col-span-2"><SelectInput value={existingProductId} onChange={(event) => setExistingProductId(event.target.value)}>{products.length === 0 ? <option value="">ยังไม่มีสินค้า</option> : null}{products.map((product) => <option key={product.id} value={product.id}>{product.name} — คงเหลือ {product.stock} {product.unit}</option>)}</SelectInput></Field>
            {selectedExistingProduct ? <div className="md:col-span-2 rounded-2xl border border-neutral-200 bg-neutral-50 p-4 text-sm text-neutral-600"><div className="font-black text-neutral-950">{selectedExistingProduct.name}</div><div className="mt-1 grid gap-1 sm:grid-cols-2"><div>SKU: {selectedExistingProduct.sku || '-'}</div><div>คงเหลือ: {selectedExistingProduct.stock} {selectedExistingProduct.unit}</div><div>หมวดหมู่: {selectedExistingProduct.category}</div><div>ประเภท: {selectedExistingProduct.productType || '-'}</div></div></div> : null}
          </>
        ) : (
          <>
            <Field label="ชื่อสินค้า" className="md:col-span-2"><TextInput value={form.name} onChange={(event) => updateField('name', event.target.value)} placeholder="เช่น ทรีตเมนต์ / น้ำยายืด / ถุงมือ" /></Field>
            <Field label="รหัสสินค้า / SKU"><TextInput value={form.sku} onChange={(event) => updateField('sku', event.target.value)} placeholder="เช่น SH-001" /></Field>
            <Field label="หมวดหมู่"><SelectInput value={form.category} onChange={(event) => updateField('category', event.target.value)}>{categoryOptions.map((item) => <option key={item}>{item}</option>)}</SelectInput></Field>
            <Field label="ประเภทสินค้า"><SelectInput value={form.productType} onChange={(event) => updateField('productType', event.target.value)}>{productTypeOptions.map((item) => <option key={item}>{item}</option>)}</SelectInput></Field>
            <Field label="แจ้งเตือนขั้นต่ำ"><TextInput type="number" min="0" value={form.minStock} onChange={(event) => updateField('minStock', event.target.value)} /></Field>
            <Field label="หน่วย"><SelectInput value={form.unit} onChange={(event) => updateField('unit', event.target.value)}>{unitOptions.map((item) => <option key={item}>{item}</option>)}</SelectInput></Field>
          </>
        )}
        <Field label="จำนวนซื้อเข้า"><TextInput type="number" min="0" value={form.purchaseQuantity} onChange={(event) => updateField('purchaseQuantity', event.target.value)} /></Field>
        <Field label="ต้นทุนต่อหน่วยรอบนี้"><TextInput type="number" min="0" value={form.cost} onChange={(event) => updateField('cost', event.target.value)} /></Field>
        <Field label="ซัพพลายเออร์"><TextInput value={form.supplier} onChange={(event) => updateField('supplier', event.target.value)} placeholder="ชื่อร้าน / เบอร์โทร / ช่องทางติดต่อ" /></Field>
        <Field label="เลขที่บิล / ใบเสร็จ"><TextInput value={form.invoiceNo} onChange={(event) => updateField('invoiceNo', event.target.value)} placeholder="เช่น INV-2026-001" /></Field>
        <Field label="หมายเหตุ" className="md:col-span-2"><TextArea value={form.note} onChange={(event) => updateField('note', event.target.value)} placeholder="รายละเอียดเพิ่มเติม" /></Field>
        <Button type="submit" className="bg-neutral-950 py-4 text-white hover:bg-neutral-800 md:col-span-2">💾 {formMode === 'existing' ? 'รับเข้าสินค้าเดิม' : 'เพิ่มสินค้าใหม่'}</Button>
      </form>
      {duplicatePrompt ? <Modal title="พบสินค้าที่อาจซ้ำกัน" subtitle={duplicatePrompt.reason} onCancel={() => setDuplicatePrompt(null)} hideSave maxWidth="max-w-lg"><div className="space-y-4"><div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-800"><p className="font-black">ระบบพบว่าสินค้าที่กำลังเพิ่มอาจเป็นตัวเดียวกับสินค้าที่มีอยู่แล้ว</p><p className="mt-1 text-sm">แนะนำให้รวมเข้าสต็อคเดิมถ้าเป็นสินค้าตัวเดียวกันจริง</p></div><Button className="w-full bg-neutral-950 text-white hover:bg-neutral-800" onClick={() => mergeIntoExistingProduct(duplicatePrompt.product, duplicatePrompt.payload)}>รวมเข้าสต็อคเดิม</Button><Button className="w-full border border-neutral-200 bg-white text-neutral-950 hover:bg-neutral-50" onClick={() => addAsNewProduct(duplicatePrompt.payload)}>เพิ่มเป็นสินค้าใหม่แยกต่างหาก</Button></div></Modal> : null}
    </Card>
  );
}

function TransactionPanel({ products, setProducts, setTransactions, setCostHistory }) {
  const [productId, setProductId] = useState(products[0]?.id || '');
  const [type, setType] = useState('out');
  const [quantity, setQuantity] = useState(1);
  const [unitCost, setUnitCost] = useState(0);
  const [supplier, setSupplier] = useState('');
  const [invoiceNo, setInvoiceNo] = useState('');
  const [reason, setReason] = useState(outboundReasons[0]);
  const [operator, setOperator] = useState('');
  const [note, setNote] = useState('');
  const selectedProduct = products.find((product) => product.id === productId);

  useEffect(() => {
    if (!productId && products[0]) setProductId(products[0].id);
    if (productId && !products.some((product) => product.id === productId)) setProductId(products[0]?.id || '');
  }, [products, productId]);

  useEffect(() => {
    setReason(type === 'in' ? inboundReasons[0] : outboundReasons[0]);
    if (selectedProduct && type === 'in') {
      setUnitCost(selectedProduct.cost || 0);
      setSupplier(selectedProduct.supplier || '');
    }
  }, [type, selectedProduct]);

  const handleSubmit = (event) => {
    event.preventDefault();
    const qty = Math.max(0, toNumber(quantity));
    const cost = Math.max(0, toNumber(unitCost));
    if (!selectedProduct || qty <= 0) return window.alert('กรุณาเลือกสินค้าและกรอกจำนวนมากกว่า 0');
    if (type === 'out' && selectedProduct.stock < qty) return window.alert('จำนวนเบิกมากกว่าสต็อคคงเหลือ');
    const nextStock = type === 'in' ? selectedProduct.stock + qty : selectedProduct.stock - qty;
    setProducts((prev) => prev.map((item) => item.id === selectedProduct.id ? { ...item, stock: nextStock, cost: type === 'in' ? cost : item.cost, supplier: type === 'in' && supplier ? supplier : item.supplier, updatedAt: nowIso() } : item));
    const transactionReason = [reason, operator ? `ผู้ทำรายการ: ${operator}` : '', note ? `หมายเหตุ: ${note}` : '', type === 'in' ? `ต้นทุนรอบนี้: ${formatMoney(cost)}` : ''].filter(Boolean).join(' | ');
    if (type === 'in') setCostHistory((prev) => [createCostRecord({ productId: selectedProduct.id, productName: selectedProduct.name, quantity: qty, unitCost: cost, supplier, invoiceNo, note: transactionReason }), ...prev]);
    setTransactions((prev) => [{ id: createId(), productId: selectedProduct.id, productName: selectedProduct.name, type, quantity: qty, reason: transactionReason || (type === 'in' ? `รับสินค้าเข้า ต้นทุน ${formatMoney(cost)}` : 'เบิกสินค้าออก'), createdAt: nowIso() }, ...prev]);
    setQuantity(1);
    setOperator('');
    setNote('');
    setInvoiceNo('');
  };

  return <Card className="p-4 md:p-6"><div className="mb-5"><h2 className="text-xl font-black text-neutral-950">🧾 บันทึกเบิก - รับเข้า</h2><p className="mt-2 inline-flex rounded-full bg-amber-100 px-4 py-2 text-sm font-black text-amber-800 shadow-sm">ยอดคงเหลืออัปเดตทันทีหลังบันทึกรายการ</p></div><form onSubmit={handleSubmit} className="space-y-4"><Field label="เลือกสินค้า"><SelectInput value={productId} onChange={(event) => setProductId(event.target.value)}>{products.length === 0 ? <option>ยังไม่มีสินค้า</option> : null}{products.map((item) => <option key={item.id} value={item.id}>{item.name} — คงเหลือ {item.stock} {item.unit}</option>)}</SelectInput></Field><div className="grid grid-cols-2 gap-3"><Button className={type === 'in' ? 'bg-emerald-600 text-white hover:bg-emerald-700' : 'border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'} onClick={() => setType('in')}>⬆ รับเข้า</Button><Button className={type === 'out' ? 'bg-amber-600 text-white hover:bg-amber-700' : 'border border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100'} onClick={() => setType('out')}>⬇ เบิกออก</Button></div><Field label="จำนวน"><TextInput type="number" min="1" value={quantity} onChange={(event) => setQuantity(event.target.value)} /></Field>{type === 'in' ? <div className="grid gap-4 md:grid-cols-2"><Field label="ต้นทุนต่อหน่วยรอบนี้"><TextInput type="number" min="0" value={unitCost} onChange={(event) => setUnitCost(event.target.value)} /></Field><Field label="ซัพพลายเออร์รอบนี้"><TextInput value={supplier} onChange={(event) => setSupplier(event.target.value)} /></Field><Field label="เลขที่บิล / ใบเสร็จ" className="md:col-span-2"><TextInput value={invoiceNo} onChange={(event) => setInvoiceNo(event.target.value)} placeholder="เช่น INV-2026-001" /></Field></div> : null}<div className="grid gap-4 md:grid-cols-2"><Field label="เหตุผล"><SelectInput value={reason} onChange={(event) => setReason(event.target.value)}>{(type === 'in' ? inboundReasons : outboundReasons).map((item) => <option key={item}>{item}</option>)}</SelectInput></Field><Field label="ผู้ทำรายการ / ผู้เบิก"><TextInput value={operator} onChange={(event) => setOperator(event.target.value)} placeholder="เช่น ช่างเอ / แอดมิน" /></Field><Field label="หมายเหตุเพิ่มเติม" className="md:col-span-2"><TextInput value={note} onChange={(event) => setNote(event.target.value)} placeholder="พิมพ์เพิ่มเฉพาะกรณีจำเป็น" /></Field></div><Button type="submit" disabled={!selectedProduct} className="w-full bg-neutral-950 py-4 text-white hover:bg-neutral-800">บันทึกรายการ</Button></form></Card>;
}

function CostSummary({ stats, unit }) {
  return <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><div className="rounded-2xl bg-neutral-950 p-4 text-white"><p className="text-xs text-neutral-300">ต้นทุนล่าสุด</p><p className="text-xl font-black">{formatMoney(stats.latestCost)}</p></div><div className="rounded-2xl bg-emerald-50 p-4 text-emerald-800"><p className="text-xs">ต้นทุนเฉลี่ย</p><p className="text-xl font-black">{formatMoney(stats.averageCost)}</p></div><div className="rounded-2xl bg-blue-50 p-4 text-blue-800"><p className="text-xs">ต่ำสุด / สูงสุด</p><p className="text-xl font-black">{formatMoney(stats.minCost)} / {formatMoney(stats.maxCost)}</p></div><div className="rounded-2xl bg-amber-50 p-4 text-amber-800"><p className="text-xs">รวมซื้อเข้า</p><p className="text-xl font-black">{formatNumber(stats.totalQty)} {unit}</p></div></div>;
}

function ProductTable({ products, setProducts, setTransactions, costHistory, setCostHistory }) {
  const [query, setQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ทั้งหมด');
  const [typeFilter, setTypeFilter] = useState('ทั้งหมด');
  const [infoEditor, setInfoEditor] = useState(null);
  const [stockEditor, setStockEditor] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [costViewer, setCostViewer] = useState(null);
  const [infoForm, setInfoForm] = useState({ name: '', sku: '', category: categoryOptions[0], productType: productTypeOptions[0], unit: unitOptions[0], cost: 0, supplier: '', note: '' });
  const [stockForm, setStockForm] = useState({ stock: 0, minStock: 0 });

  const filteredProducts = useMemo(() => products.filter((item) => `${item.name} ${item.sku} ${item.category} ${item.productType} ${item.supplier}`.toLowerCase().includes(query.toLowerCase()) && (categoryFilter === 'ทั้งหมด' || item.category === categoryFilter) && (typeFilter === 'ทั้งหมด' || item.productType === typeFilter)), [products, query, categoryFilter, typeFilter]);
  const openInfoEditor = (product) => { setInfoEditor(product); setInfoForm({ name: product.name, sku: product.sku, category: product.category, productType: product.productType || productTypeOptions[0], unit: product.unit, cost: product.cost, supplier: product.supplier, note: product.note }); };
  const saveInfoEditor = () => { if (!infoEditor) return; const name = infoForm.name.trim(); if (!name) return window.alert('กรุณากรอกชื่อสินค้า'); const updatedProduct = createProduct({ ...infoEditor, name, sku: infoForm.sku, category: infoForm.category, productType: infoForm.productType, unit: infoForm.unit, cost: infoForm.cost, supplier: infoForm.supplier, note: infoForm.note, updatedAt: nowIso() }); setProducts((prev) => prev.map((item) => item.id === infoEditor.id ? updatedProduct : item)); setTransactions((prev) => [{ id: createId(), productId: updatedProduct.id, productName: updatedProduct.name, type: 'edit', quantity: 0, reason: 'แก้ไขข้อมูลสินค้า', createdAt: nowIso() }, ...prev]); setInfoEditor(null); };
  const openStockEditor = (product) => { setStockEditor(product); setStockForm({ stock: product.stock, minStock: product.minStock }); };
  const saveStockEditor = () => { if (!stockEditor) return; const oldStock = toNumber(stockEditor.stock); const nextStock = Math.max(0, toNumber(stockForm.stock)); const nextMinStock = Math.max(0, toNumber(stockForm.minStock)); setProducts((prev) => prev.map((item) => item.id === stockEditor.id ? { ...item, stock: nextStock, minStock: nextMinStock, updatedAt: nowIso() } : item)); setTransactions((prev) => [{ id: createId(), productId: stockEditor.id, productName: stockEditor.name, type: 'adjust', quantity: Math.abs(nextStock - oldStock), reason: `ปรับจำนวนคงเหลือจาก ${oldStock} เป็น ${nextStock} และตั้งเตือนขั้นต่ำ ${nextMinStock}`, createdAt: nowIso() }, ...prev]); setStockEditor(null); };
  const confirmDeleteProduct = () => { if (!deleteTarget) return; setProducts((prev) => prev.filter((item) => item.id !== deleteTarget.id)); setCostHistory((prev) => prev.filter((item) => item.productId !== deleteTarget.id)); setTransactions((prev) => [{ id: createId(), productId: deleteTarget.id, productName: deleteTarget.name, type: 'delete', quantity: toNumber(deleteTarget.stock), reason: 'ลบสินค้าออกจากระบบ', createdAt: nowIso() }, ...prev]); setDeleteTarget(null); };

  const productCard = (product) => {
    const productCosts = costHistory.filter((item) => item.productId === product.id);
    const costStats = getCostStats(productCosts);
    const supplierInfo = getSupplierStats(productCosts);
    const latestSupplier = supplierInfo.latestSupplier || product.supplier || '-';
    const lowStock = toNumber(product.stock) <= toNumber(product.minStock);
    return <div key={product.id} className="rounded-3xl border border-neutral-200 bg-white p-4 shadow-sm"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><h3 className="truncate text-base font-black text-neutral-950">{product.name}</h3><p className="mt-1 text-xs text-neutral-400">SKU: {product.sku || '-'}</p></div><span className={`shrink-0 rounded-full px-3 py-1 text-xs font-black ${lowStock ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'}`}>{lowStock ? '⚠ ' : '✓ '}{product.stock} {product.unit}</span></div><div className="mt-3 grid grid-cols-2 gap-2 text-xs"><div className="rounded-2xl bg-neutral-50 p-3"><p className="text-neutral-400">หมวดหมู่</p><p className="mt-1 font-black text-neutral-700">{product.category}</p></div><div className="rounded-2xl bg-neutral-50 p-3"><p className="text-neutral-400">ประเภท</p><p className="mt-1 font-black text-neutral-700">{product.productType || '-'}</p></div><div className="rounded-2xl bg-amber-50 p-3 text-amber-800"><p className="text-amber-600">ต้นทุนล่าสุด</p><p className="mt-1 font-black">{formatMoney(costStats.latestCost || product.cost)}</p></div><div className="rounded-2xl bg-blue-50 p-3 text-blue-800"><p className="text-blue-600">ต้นทุนเฉลี่ย</p><p className="mt-1 font-black">{formatMoney(costStats.averageCost || product.cost)}</p></div></div><div className="mt-3 rounded-2xl bg-neutral-50 p-3 text-xs text-neutral-500"><span className="font-black text-neutral-700">ซัพพลายเออร์ล่าสุด:</span> {latestSupplier}<div className="mt-0.5 text-neutral-400">เคยซื้อ {supplierInfo.supplierCount} เจ้า / แจ้งเตือน ≤ {product.minStock}</div></div><div className="mt-4 grid grid-cols-2 gap-2"><button type="button" className="rounded-2xl border border-blue-200 bg-blue-50 px-3 py-3 text-sm font-black text-blue-700" onClick={() => openInfoEditor(product)}>✏️ แก้ไข</button><button type="button" className="rounded-2xl border border-amber-200 bg-amber-50 px-3 py-3 text-sm font-black text-amber-800" onClick={() => openStockEditor(product)}>📦 สต็อค</button><button type="button" className="rounded-2xl border border-purple-200 bg-purple-50 px-3 py-3 text-sm font-black text-purple-700" onClick={() => setCostViewer(product)}>📈 ต้นทุน</button><button type="button" className="rounded-2xl border border-red-200 bg-red-50 px-3 py-3 text-sm font-black text-red-700" onClick={() => setDeleteTarget(product)}>🗑️ ลบ</button></div></div>;
  };

  return <Card className="p-4 md:p-6"><div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between"><div><h2 className="text-xl font-black text-neutral-950">จัดการสินค้าและจำนวนคงเหลือ</h2><p className="text-sm text-neutral-500">ดูจำนวนคงเหลือ ค้นหา แก้ไข ลบ และดูประวัติต้นทุนสินค้า</p></div><div className="flex flex-col gap-3 sm:flex-row"><TextInput placeholder="🔎 ค้นหาชื่อสินค้า / SKU / ซัพพลายเออร์" value={query} onChange={(event) => setQuery(event.target.value)} /><SelectInput value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)}><option>ทั้งหมด</option>{categoryOptions.map((item) => <option key={item}>{item}</option>)}</SelectInput><SelectInput value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)}><option value="ทั้งหมด">ทุกประเภท</option>{productTypeOptions.map((item) => <option key={item}>{item}</option>)}</SelectInput></div></div><div className="space-y-3 md:hidden">{filteredProducts.map(productCard)}{filteredProducts.length === 0 ? <div className="rounded-3xl bg-white p-8 text-center text-neutral-500">ไม่พบสินค้าที่ตรงกับการค้นหา</div> : null}</div><div className="hidden overflow-hidden rounded-2xl border border-neutral-200 bg-white md:block"><div className="max-h-[560px] overflow-auto"><table className="w-full min-w-[980px] text-left text-sm"><thead className="sticky top-0 bg-neutral-100 text-neutral-600"><tr><th className="px-3 py-3">สินค้า</th><th className="px-3 py-3">หมวดหมู่</th><th className="px-3 py-3">ประเภท</th><th className="px-3 py-3">คงเหลือ</th><th className="px-3 py-3">ต้นทุน</th><th className="px-3 py-3">เฉลี่ย</th><th className="px-3 py-3">ซัพพลายเออร์ล่าสุด</th><th className="px-3 py-3 text-right">จัดการ</th></tr></thead><tbody>{filteredProducts.map((product) => { const productCosts = costHistory.filter((item) => item.productId === product.id); const costStats = getCostStats(productCosts); const supplierInfo = getSupplierStats(productCosts); const latestSupplier = supplierInfo.latestSupplier || product.supplier || '-'; const lowStock = toNumber(product.stock) <= toNumber(product.minStock); return <tr key={product.id} className="border-t border-neutral-100 hover:bg-neutral-50"><td className="px-3 py-3"><div className="max-w-[190px] truncate font-black text-neutral-950" title={product.name}>{product.name}</div><div className="text-xs text-neutral-400">SKU: {product.sku || '-'}</div></td><td className="px-3 py-3 text-neutral-600"><div className="max-w-[135px] truncate" title={product.category}>{product.category}</div></td><td className="px-3 py-3 text-neutral-600"><div className="max-w-[140px] truncate rounded-full bg-neutral-100 px-2.5 py-1 text-xs font-black text-neutral-700" title={product.productType || '-'}>{product.productType || '-'}</div></td><td className="px-3 py-3"><div className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-black ${lowStock ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'}`}>{lowStock ? '⚠ ' : '✓ '}{product.stock} {product.unit}</div><div className="mt-1 text-[11px] text-neutral-400">≤ {product.minStock}</div></td><td className="px-3 py-3 font-black text-neutral-700">{formatMoney(costStats.latestCost || product.cost)}</td><td className="px-3 py-3 text-neutral-600">{formatMoney(costStats.averageCost || product.cost)}</td><td className="px-3 py-3 text-neutral-600"><div className="max-w-[130px] truncate font-black text-neutral-700" title={latestSupplier}>{latestSupplier}</div><div className="mt-1 text-[11px] text-neutral-400">เคยซื้อ {supplierInfo.supplierCount} เจ้า</div></td><td className="px-3 py-3 text-right"><div className="flex flex-nowrap justify-end gap-1.5"><button type="button" className="rounded-xl border border-blue-200 bg-blue-50 px-2.5 py-2 text-xs font-black text-blue-700 hover:bg-blue-100" onClick={() => openInfoEditor(product)}>✏️ แก้ไข</button><button type="button" className="rounded-xl border border-amber-200 bg-amber-50 px-2.5 py-2 text-xs font-black text-amber-800 hover:bg-amber-100" onClick={() => openStockEditor(product)}>📦 สต็อค</button><button type="button" className="rounded-xl border border-purple-200 bg-purple-50 px-2.5 py-2 text-xs font-black text-purple-700 hover:bg-purple-100" onClick={() => setCostViewer(product)}>📈 ต้นทุน</button><button type="button" className="rounded-xl border border-red-200 bg-red-50 px-2.5 py-2 text-xs font-black text-red-700 hover:bg-red-100" onClick={() => setDeleteTarget(product)}>🗑️ ลบ</button></div></td></tr>; })}</tbody></table>{filteredProducts.length === 0 ? <div className="p-10 text-center text-neutral-500">ไม่พบสินค้าที่ตรงกับการค้นหา</div> : null}</div></div>{infoEditor ? <Modal title="แก้ไขข้อมูลสินค้า" subtitle="แก้ไขรายละเอียดสินค้าโดยไม่กระทบจำนวนคงเหลือ" onCancel={() => setInfoEditor(null)} onSave={saveInfoEditor} maxWidth="max-w-lg"><div className="grid gap-4 md:grid-cols-2"><Field label="ชื่อสินค้า" className="md:col-span-2"><TextInput value={infoForm.name} onChange={(event) => setInfoForm((prev) => ({ ...prev, name: event.target.value }))} /></Field><Field label="รหัสสินค้า / SKU"><TextInput value={infoForm.sku} onChange={(event) => setInfoForm((prev) => ({ ...prev, sku: event.target.value }))} /></Field><Field label="หมวดหมู่"><SelectInput value={infoForm.category} onChange={(event) => setInfoForm((prev) => ({ ...prev, category: event.target.value }))}>{categoryOptions.map((item) => <option key={item}>{item}</option>)}</SelectInput></Field><Field label="ประเภทสินค้า"><SelectInput value={infoForm.productType} onChange={(event) => setInfoForm((prev) => ({ ...prev, productType: event.target.value }))}>{productTypeOptions.map((item) => <option key={item}>{item}</option>)}</SelectInput></Field><Field label="หน่วย"><SelectInput value={infoForm.unit} onChange={(event) => setInfoForm((prev) => ({ ...prev, unit: event.target.value }))}>{unitOptions.map((item) => <option key={item}>{item}</option>)}</SelectInput></Field><Field label="ต้นทุนล่าสุด"><TextInput type="number" min="0" value={infoForm.cost} onChange={(event) => setInfoForm((prev) => ({ ...prev, cost: event.target.value }))} /></Field><Field label="ซัพพลายเออร์" className="md:col-span-2"><TextInput value={infoForm.supplier} onChange={(event) => setInfoForm((prev) => ({ ...prev, supplier: event.target.value }))} /></Field><Field label="หมายเหตุ" className="md:col-span-2"><TextArea value={infoForm.note} onChange={(event) => setInfoForm((prev) => ({ ...prev, note: event.target.value }))} /></Field></div></Modal> : null}{stockEditor ? <Modal title="แก้ไขจำนวนคงเหลือ" subtitle={stockEditor.name} onCancel={() => setStockEditor(null)} onSave={saveStockEditor} maxWidth="max-w-md"><div className="grid gap-4"><Field label="จำนวนคงเหลือใหม่"><TextInput type="number" min="0" value={stockForm.stock} onChange={(event) => setStockForm((prev) => ({ ...prev, stock: event.target.value }))} /></Field><Field label="แจ้งเตือนเมื่อเหลือต่ำกว่าหรือเท่ากับ"><TextInput type="number" min="0" value={stockForm.minStock} onChange={(event) => setStockForm((prev) => ({ ...prev, minStock: event.target.value }))} /></Field></div></Modal> : null}{deleteTarget ? <Modal title="ยืนยันการลบสินค้า" subtitle={`คุณกำลังจะลบ ${deleteTarget.name} ออกจากระบบ`} onCancel={() => setDeleteTarget(null)} onSave={confirmDeleteProduct} saveText="🗑️ ยืนยันลบสินค้า" maxWidth="max-w-md"><div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-red-700"><p className="font-black">การลบนี้จะนำสินค้าและประวัติต้นทุนของสินค้านี้ออกจากระบบ</p><div className="mt-4 rounded-xl bg-white p-3 text-sm text-neutral-700"><div><strong>สินค้า:</strong> {deleteTarget.name}</div><div><strong>คงเหลือ:</strong> {deleteTarget.stock} {deleteTarget.unit}</div><div><strong>รหัส:</strong> {deleteTarget.sku || '-'}</div></div></div></Modal> : null}{costViewer ? (() => { const records = costHistory.filter((item) => item.productId === costViewer.id).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)); const stats = getCostStats(records); return <Modal title="ประวัติต้นทุนสินค้า" subtitle={costViewer.name} onCancel={() => setCostViewer(null)} hideSave maxWidth="max-w-3xl"><div className="space-y-4"><CostSummary stats={stats} unit={costViewer.unit} /><div className="overflow-auto rounded-2xl border border-neutral-200"><table className="w-full min-w-[760px] text-left text-sm"><thead className="bg-neutral-100 text-neutral-600"><tr><th className="px-4 py-3">วันที่</th><th className="px-4 py-3">จำนวนเข้า</th><th className="px-4 py-3">ต้นทุน/หน่วย</th><th className="px-4 py-3">ซัพพลายเออร์</th><th className="px-4 py-3">เลขที่บิล</th><th className="px-4 py-3">หมายเหตุ</th></tr></thead><tbody>{records.map((record) => <tr key={record.id} className="border-t border-neutral-100"><td className="px-4 py-3">{new Date(record.createdAt).toLocaleDateString('th-TH', { dateStyle: 'medium' })}</td><td className="px-4 py-3">{record.quantity} {costViewer.unit}</td><td className="px-4 py-3 font-black text-neutral-950">{formatMoney(record.unitCost)}</td><td className="px-4 py-3">{record.supplier || '-'}</td><td className="px-4 py-3">{record.invoiceNo || '-'}</td><td className="px-4 py-3">{record.note || '-'}</td></tr>)}</tbody></table>{records.length === 0 ? <div className="p-8 text-center text-neutral-500">ยังไม่มีประวัติต้นทุนของสินค้านี้</div> : null}</div></div></Modal>; })() : null}</Card>;
}

function TransactionHistory({ transactions }) {
  const label = { in: 'รับเข้า', out: 'เบิกออก', adjust: 'ปรับสต็อค', edit: 'แก้ไขข้อมูล', delete: 'ลบสินค้า' };
  return <Card className="p-4 md:p-6"><div className="mb-5"><h2 className="text-xl font-black text-neutral-950">🕘 ประวัติการเคลื่อนไหว</h2><p className="text-sm text-neutral-500">บันทึกทุกการรับเข้า เบิกออก แก้ไข ปรับสต็อค และลบสินค้า</p></div><div className="space-y-3">{transactions.slice(0, 14).map((item) => <div key={item.id} className="flex items-start justify-between gap-4 rounded-2xl border border-neutral-100 bg-white p-4"><div><div className="flex flex-wrap items-center gap-2"><span className={`rounded-full px-3 py-1 text-xs font-black ${item.type === 'in' ? 'bg-emerald-100 text-emerald-700' : item.type === 'out' ? 'bg-amber-100 text-amber-700' : item.type === 'delete' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>{label[item.type] || item.type}</span><p className="font-black text-neutral-950">{item.productName}</p></div><p className="mt-1 text-sm text-neutral-500">{item.reason}</p><p className="mt-1 text-xs text-neutral-400">{new Date(item.createdAt).toLocaleString('th-TH', { dateStyle: 'medium', timeStyle: 'short' })}</p></div>{item.quantity > 0 ? <p className="whitespace-nowrap text-lg font-black text-neutral-950">{item.type === 'out' ? '-' : '+'}{item.quantity}</p> : null}</div>)}{transactions.length === 0 ? <div className="rounded-2xl bg-white p-8 text-center text-neutral-500">ยังไม่มีประวัติรายการ</div> : null}</div></Card>;
}

export default function BeautySalonInventoryApp() {
  const [products, setProducts] = useState(() => normalizeProducts(readStorage(STORAGE_KEYS.products, sampleProducts)));
  const [transactions, setTransactions] = useState(() => readStorage(STORAGE_KEYS.transactions, []));
  const [costHistory, setCostHistory] = useState(() => normalizeCosts(readStorage(STORAGE_KEYS.costHistory, sampleCostHistory)));
  const [activeTab, setActiveTab] = useState('dashboard');
  const [showExportMenu, setShowExportMenu] = useState(false);

  useEffect(() => { localStorage.setItem(STORAGE_KEYS.products, JSON.stringify(products)); }, [products]);
  useEffect(() => { localStorage.setItem(STORAGE_KEYS.transactions, JSON.stringify(transactions)); }, [transactions]);
  useEffect(() => { localStorage.setItem(STORAGE_KEYS.costHistory, JSON.stringify(costHistory)); }, [costHistory]);

  const stats = useMemo(() => {
    const totalProducts = products.length;
    const totalStock = products.reduce((sum, item) => sum + toNumber(item.stock), 0);
    const lowStock = products.filter((item) => toNumber(item.stock) <= toNumber(item.minStock)).length;
    const inventoryValue = products.reduce((sum, item) => {
      const productCostStats = getCostStats(costHistory.filter((record) => record.productId === item.id));
      return sum + toNumber(item.stock) * toNumber(productCostStats.averageCost || item.cost);
    }, 0);
    return { totalProducts, totalStock, lowStock, inventoryValue };
  }, [products, costHistory]);

  const lowStockProducts = products.filter((item) => toNumber(item.stock) <= toNumber(item.minStock));
  const tabs = [{ id: 'dashboard', label: '📊 Dashboard' }, { id: 'stock', label: '🧾 สต็อค' }, { id: 'products', label: '📦 สินค้า' }];
  const recentTransactions = transactions.slice(0, 5);
  const productsWithCostStats = products.map((product) => {
    const productCostStats = getCostStats(costHistory.filter((record) => record.productId === product.id));
    const averageCost = productCostStats.averageCost || product.cost || 0;
    const latestCost = productCostStats.latestCost || product.cost || 0;
    return { ...product, averageCost, latestCost, costDiff: latestCost - averageCost };
  });
  const highestLatestCostProducts = [...productsWithCostStats].sort((a, b) => b.latestCost - a.latestCost).slice(0, 5);
  const highCostProducts = [...productsWithCostStats].sort((a, b) => b.averageCost - a.averageCost).slice(0, 5);
  const mostExpensiveLatestProduct = highestLatestCostProducts[0];

  const exportData = () => downloadBlob(`beauty-salon-inventory-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify({ products, transactions, costHistory, exportedAt: nowIso() }, null, 2), 'application/json');
  const exportProductsCsv = () => downloadBlob(`beauty-salon-products-${new Date().toISOString().slice(0, 10)}.csv`, '\uFEFF' + buildCsv([['ชื่อสินค้า', 'รหัสสินค้า', 'หมวดหมู่', 'ประเภทสินค้า', 'คงเหลือ', 'หน่วย', 'แจ้งเตือนขั้นต่ำ', 'ต้นทุนล่าสุด', 'ต้นทุนเฉลี่ย', 'ซัพพลายเออร์', 'หมายเหตุ'], ...products.map((product) => { const productCostStats = getCostStats(costHistory.filter((record) => record.productId === product.id)); return [product.name, product.sku, product.category, product.productType, product.stock, product.unit, product.minStock, productCostStats.latestCost || product.cost, productCostStats.averageCost || product.cost, product.supplier, product.note]; })]), 'text/csv;charset=utf-8;');
  const exportTransactionsCsv = () => downloadBlob(`beauty-salon-transactions-${new Date().toISOString().slice(0, 10)}.csv`, '\uFEFF' + buildCsv([['วันที่', 'สินค้า', 'ประเภท', 'จำนวน', 'เหตุผล'], ...transactions.map((item) => [new Date(item.createdAt).toLocaleString('th-TH', { dateStyle: 'medium', timeStyle: 'short' }), item.productName, item.type, item.quantity, item.reason])]), 'text/csv;charset=utf-8;');
  const exportCostHistoryCsv = () => downloadBlob(`beauty-salon-cost-history-${new Date().toISOString().slice(0, 10)}.csv`, '\uFEFF' + buildCsv([['วันที่', 'สินค้า', 'จำนวนเข้า', 'ต้นทุนต่อหน่วย', 'ซัพพลายเออร์', 'เลขที่บิล', 'หมายเหตุ'], ...costHistory.map((item) => [new Date(item.createdAt).toLocaleString('th-TH', { dateStyle: 'medium', timeStyle: 'short' }), item.productName, item.quantity, item.unitCost, item.supplier, item.invoiceNo, item.note])]), 'text/csv;charset=utf-8;');
  const handleExportChoice = (fn) => { fn(); setShowExportMenu(false); };

  const importData = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(String(reader.result));
        if (!Array.isArray(data.products)) throw new Error('Invalid products');
        setProducts(normalizeProducts(data.products));
        setTransactions(Array.isArray(data.transactions) ? data.transactions : []);
        setCostHistory(normalizeCosts(data.costHistory || []));
      } catch {
        window.alert('ไฟล์ไม่ถูกต้อง กรุณาใช้ไฟล์ JSON ที่ Export จากระบบนี้');
      }
    };
    reader.readAsText(file);
    event.target.value = '';
  };

  return <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_#fde68a,_transparent_32%),linear-gradient(135deg,_#fff7ed,_#f5f5f4_45%,_#e7e5e4)] p-4 pb-[calc(6.5rem+env(safe-area-inset-bottom))] text-neutral-950 md:p-8"><div className="mx-auto max-w-7xl"><header className="mb-6 overflow-hidden rounded-[2rem] bg-neutral-950 p-5 text-white shadow-xl md:p-8"><div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between"><div><div className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-xs text-neutral-200 md:text-sm">✨ Beauty Salon Inventory System</div><h1 className="max-w-3xl text-3xl font-black leading-tight tracking-tight md:text-5xl">ระบบจัดการสต็อคร้านเสริมสวย</h1><p className="mt-4 max-w-2xl text-sm text-neutral-300 md:text-base">Dashboard, บันทึกสต็อค และจัดการสินค้า รองรับ Desktop และ iPhone</p></div><div className="flex flex-wrap gap-3"><Button className="bg-white text-neutral-950 hover:bg-neutral-100" onClick={() => setShowExportMenu(true)}>⬇ Export ข้อมูล</Button><label className="inline-flex min-h-[44px] cursor-pointer items-center justify-center rounded-2xl bg-white/10 px-4 py-3 text-sm font-black text-white transition hover:bg-white/20 active:scale-[0.98]">⬆ Import ข้อมูล<input type="file" accept="application/json" onChange={importData} className="hidden" /></label></div></div></header>{showExportMenu ? <Modal title="Export ข้อมูล" subtitle="เลือกประเภทไฟล์ที่ต้องการดาวน์โหลด" onCancel={() => setShowExportMenu(false)} hideSave maxWidth="max-w-lg"><div className="grid gap-3"><button type="button" className="rounded-2xl border border-neutral-200 bg-white p-4 text-left hover:bg-neutral-50" onClick={() => handleExportChoice(exportData)}><div className="font-black text-neutral-950">💾 Backup JSON สำหรับ Import กลับ</div><div className="mt-1 text-sm text-neutral-500">สำรองข้อมูลทั้งหมด และใช้ Import กลับเข้าระบบได้</div></button><button type="button" className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-left hover:bg-emerald-100" onClick={() => handleExportChoice(exportProductsCsv)}><div className="font-black text-emerald-800">📦 รายการสินค้า CSV</div><div className="mt-1 text-sm text-emerald-700">เปิดดูใน Excel / Google Sheets</div></button><button type="button" className="rounded-2xl border border-blue-200 bg-blue-50 p-4 text-left hover:bg-blue-100" onClick={() => handleExportChoice(exportTransactionsCsv)}><div className="font-black text-blue-800">🧾 ประวัติรายการ CSV</div><div className="mt-1 text-sm text-blue-700">Export ประวัติรับเข้า เบิกออก แก้ไข และลบสินค้า</div></button><button type="button" className="rounded-2xl border border-purple-200 bg-purple-50 p-4 text-left hover:bg-purple-100" onClick={() => handleExportChoice(exportCostHistoryCsv)}><div className="font-black text-purple-800">📈 ประวัติต้นทุน CSV</div><div className="mt-1 text-sm text-purple-700">Export ประวัติต้นทุนแต่ละรอบ</div></button></div></Modal> : null}<nav className="sticky top-3 z-10 mb-8 hidden rounded-3xl border border-white/70 bg-white/80 p-2 shadow-sm backdrop-blur md:block"><div className="grid gap-2 md:grid-cols-3">{tabs.map((tab) => <button key={tab.id} type="button" onClick={() => setActiveTab(tab.id)} className={`rounded-2xl px-4 py-3 text-sm font-black transition ${activeTab === tab.id ? 'bg-neutral-950 text-white shadow-sm' : 'text-neutral-600 hover:bg-neutral-100 hover:text-neutral-950'}`}>{tab.label}</button>)}</div></nav>{activeTab === 'dashboard' ? <div className="space-y-8"><section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><StatCard icon="📦" title="จำนวนรายการสินค้า" value={stats.totalProducts} subtitle="สินค้าทั้งหมดในระบบ" /><StatCard icon="📊" title="จำนวนสต็อครวม" value={stats.totalStock} subtitle="รวมทุกหมวดหมู่" /><StatCard icon="⚠️" title="สินค้าใกล้หมด" value={stats.lowStock} subtitle="ควรตรวจสอบและสั่งเพิ่ม" /><StatCard icon="💰" title="มูลค่าสต็อค" value={formatMoney(stats.inventoryValue)} subtitle="ต้นทุนเฉลี่ย x คงเหลือ" /></section>{lowStockProducts.length > 0 ? <section className="rounded-3xl border border-red-200 bg-red-50 p-5"><div className="mb-3 font-black text-red-700">⚠️ แจ้งเตือนสินค้าใกล้หมด</div><div className="flex flex-wrap gap-2">{lowStockProducts.map((product) => <span key={product.id} className="rounded-full bg-white px-4 py-2 text-sm font-black text-red-700 shadow-sm">{product.name}: เหลือ {product.stock} {product.unit}</span>)}</div></section> : null}<section className="grid gap-6 xl:grid-cols-3"><Card className="p-5 md:p-6 xl:col-span-1"><h2 className="text-xl font-black text-neutral-950">สินค้าต้นทุนล่าสุดแพงสุด</h2>{mostExpensiveLatestProduct ? <div className="mt-5 rounded-3xl bg-neutral-950 p-5 text-white"><p className="text-sm text-neutral-300">อันดับ 1</p><h3 className="mt-2 text-2xl font-black">{mostExpensiveLatestProduct.name}</h3><p className="mt-3 text-3xl font-black">{formatMoney(mostExpensiveLatestProduct.latestCost)}</p><p className={`mt-2 inline-flex rounded-full px-3 py-1 text-xs font-black ${mostExpensiveLatestProduct.costDiff > 0 ? 'bg-red-100 text-red-700' : mostExpensiveLatestProduct.costDiff < 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-white/10 text-white'}`}>{mostExpensiveLatestProduct.costDiff > 0 ? '+' : ''}{formatMoney(mostExpensiveLatestProduct.costDiff)} เทียบกับเฉลี่ย</p></div> : null}</Card><Card className="p-5 md:p-6 xl:col-span-2"><h2 className="text-xl font-black text-neutral-950">Top 5 ต้นทุนล่าสุดต่อหน่วย</h2><div className="mt-5 space-y-3 md:hidden">{highestLatestCostProducts.map((product) => <div key={product.id} className="rounded-2xl border border-neutral-100 bg-white p-4"><div className="font-black text-neutral-950">{product.name}</div><div className="mt-2 grid grid-cols-2 gap-2 text-xs"><div className="rounded-xl bg-neutral-50 p-3">ล่าสุด<br /><b>{formatMoney(product.latestCost)}</b></div><div className="rounded-xl bg-neutral-50 p-3">เฉลี่ย<br /><b>{formatMoney(product.averageCost)}</b></div></div></div>)}</div><div className="mt-5 hidden overflow-hidden rounded-2xl border border-neutral-200 bg-white md:block"><table className="w-full min-w-[680px] text-left text-sm"><thead className="bg-neutral-100 text-neutral-600"><tr><th className="px-4 py-3">สินค้า</th><th className="px-4 py-3">ต้นทุนล่าสุด</th><th className="px-4 py-3">ต้นทุนเฉลี่ย</th><th className="px-4 py-3">ส่วนต่าง</th><th className="px-4 py-3">คงเหลือ</th></tr></thead><tbody>{highestLatestCostProducts.map((product) => <tr key={product.id} className="border-t border-neutral-100"><td className="px-4 py-3 font-black text-neutral-950">{product.name}</td><td className="px-4 py-3 font-black text-neutral-950">{formatMoney(product.latestCost)}</td><td className="px-4 py-3 text-neutral-600">{formatMoney(product.averageCost)}</td><td className={`px-4 py-3 font-black ${product.costDiff > 0 ? 'text-red-600' : product.costDiff < 0 ? 'text-emerald-600' : 'text-neutral-500'}`}>{product.costDiff > 0 ? '+' : ''}{formatMoney(product.costDiff)}</td><td className="px-4 py-3 text-neutral-600">{product.stock} {product.unit}</td></tr>)}</tbody></table></div></Card></section><section className="grid gap-6 xl:grid-cols-2"><Card className="p-5 md:p-6"><h2 className="text-xl font-black text-neutral-950">สินค้าต้นทุนเฉลี่ยสูงสุด</h2><div className="mt-5 space-y-3">{highCostProducts.map((product) => <div key={product.id} className="flex items-center justify-between rounded-2xl border border-neutral-100 bg-white p-4"><div><p className="font-black text-neutral-950">{product.name}</p><p className="text-xs text-neutral-400">คงเหลือ {product.stock} {product.unit}</p></div><div className="text-right"><p className="font-black text-neutral-950">{formatMoney(product.averageCost)}</p><p className="text-xs text-neutral-400">ต้นทุนเฉลี่ย</p></div></div>)}</div></Card><Card className="p-5 md:p-6"><h2 className="text-xl font-black text-neutral-950">รายการเคลื่อนไหวล่าสุด</h2><div className="mt-5 space-y-3">{recentTransactions.length > 0 ? recentTransactions.map((item) => <div key={item.id} className="rounded-2xl border border-neutral-100 bg-white p-4"><div className="flex items-center justify-between gap-3"><p className="font-black text-neutral-950">{item.productName}</p>{item.quantity > 0 ? <span className="rounded-full bg-neutral-100 px-3 py-1 text-xs font-black">{item.type === 'out' ? '-' : '+'}{item.quantity}</span> : null}</div><p className="mt-1 text-sm text-neutral-500">{item.reason}</p></div>) : <div className="rounded-2xl bg-white p-8 text-center text-neutral-500">ยังไม่มีประวัติรายการ</div>}</div></Card></section></div> : null}{activeTab === 'stock' ? <div className="space-y-8"><section className="grid gap-6 xl:grid-cols-[1.25fr_0.75fr]"><ProductForm products={products} setProducts={setProducts} setTransactions={setTransactions} setCostHistory={setCostHistory} /><TransactionPanel products={products} setProducts={setProducts} setTransactions={setTransactions} setCostHistory={setCostHistory} /></section><TransactionHistory transactions={transactions} /></div> : null}{activeTab === 'products' ? <ProductTable products={products} setProducts={setProducts} setTransactions={setTransactions} costHistory={costHistory} setCostHistory={setCostHistory} /> : null}<nav className="fixed inset-x-3 bottom-3 z-40 rounded-[1.7rem] border border-white/70 bg-white/90 p-2 shadow-2xl backdrop-blur md:hidden" style={{ paddingBottom: 'calc(0.5rem + env(safe-area-inset-bottom))' }}><div className="grid grid-cols-3 gap-2">{tabs.map((tab) => <button key={tab.id} type="button" onClick={() => setActiveTab(tab.id)} className={`rounded-2xl px-2 py-3 text-[11px] font-black transition ${activeTab === tab.id ? 'bg-neutral-950 text-white shadow-sm' : 'text-neutral-500 hover:bg-neutral-100'}`}>{tab.label}</button>)}</div></nav></div></main>;
}
