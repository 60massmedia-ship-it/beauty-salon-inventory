import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';

const STORAGE_KEYS = {
  products: 'beauty_salon_inventory_products_v4_clean',
  transactions: 'beauty_salon_inventory_transactions_v4_clean',
  costHistory: 'beauty_salon_inventory_cost_history_v4_clean',
};

const categoryOptions = ['แชมพู / ทรีตเมนต์', 'เคมีทำสี / ยืด / ดัด', 'สกินแคร์ / บิวตี้', 'อุปกรณ์ทำผม', 'ของใช้สิ้นเปลือง', 'สินค้า Retail ขายหน้าร้าน', 'อื่น ๆ'];
const unitOptions = ['ชิ้น', 'ขวด', 'กล่อง', 'ซอง', 'แพ็ค', 'หลอด', 'กิโลกรัม', 'ลิตร'];
const productTypeOptions = ['สินค้าใช้แล้วหมดไป', 'อุปกรณ์ใช้ระยะยาว', 'สินค้าขายหน้าร้าน', 'วัสดุสิ้นเปลืองร้าน', 'สินทรัพย์ร้าน'];
const inboundReasons = ['ซื้อสินค้าเข้าใหม่', 'เติมสต็อคประจำรอบ', 'ของแถมจากซัพพลายเออร์', 'รับคืนจากพนักงาน', 'รับคืนจากลูกค้า', 'ปรับยอดจากการตรวจนับ', 'อื่น ๆ'];
const outboundReasons = ['ใช้กับลูกค้า', 'ใช้ในบริการหน้าร้าน', 'ขายหน้าร้าน', 'สินค้าชำรุด / เสียหาย', 'หมดอายุ', 'ทดลองใช้ / เทรนนิ่งพนักงาน', 'แจกโปรโมชัน / ของแถม', 'ปรับยอดจากการตรวจนับ', 'อื่น ๆ'];

const id = () => (crypto?.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`);
const nowIso = () => new Date().toISOString();
const n = (v, f = 0) => (Number.isFinite(Number(v)) ? Number(v) : f);
const norm = (v) => String(v || '').trim().replace(/[ ]+/g, ' ').toLowerCase();
const money = (v) => new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB', maximumFractionDigits: 0 }).format(n(v));

function product(data = {}) {
  return {
    id: data.id || id(),
    name: data.name || '',
    sku: data.sku || '',
    category: data.category || categoryOptions[0],
    productType: data.productType || productTypeOptions[0],
    stock: Math.max(0, n(data.stock)),
    unit: data.unit || unitOptions[0],
    minStock: Math.max(0, n(data.minStock, 5)),
    cost: Math.max(0, n(data.cost)),
    supplier: data.supplier || '',
    note: data.note || '',
    updatedAt: data.updatedAt || nowIso(),
  };
}

function costRecord(data = {}) {
  return {
    id: data.id || id(),
    productId: data.productId || '',
    productName: data.productName || '',
    quantity: Math.max(0, n(data.quantity)),
    unitCost: Math.max(0, n(data.unitCost)),
    supplier: data.supplier || '',
    invoiceNo: data.invoiceNo || '',
    note: data.note || '',
    createdAt: data.createdAt || nowIso(),
  };
}

const sampleProducts = [
  product({ name: 'แชมพู Keratin Smooth', sku: 'SH-KER-001', category: 'แชมพู / ทรีตเมนต์', productType: 'สินค้าใช้แล้วหมดไป', stock: 18, unit: 'ขวด', minStock: 6, cost: 220, supplier: 'Beauty Supply Bangkok', note: 'ใช้สำหรับงานสระไดร์และขายหน้าร้าน' }),
  product({ name: 'ครีมย้อมผม Ash Brown', sku: 'HC-ASH-005', category: 'เคมีทำสี / ยืด / ดัด', productType: 'สินค้าใช้แล้วหมดไป', stock: 8, unit: 'กล่อง', minStock: 10, cost: 120, supplier: 'Pro Hair Color', note: 'สีขายดี ควรเช็คทุกสัปดาห์' }),
  product({ name: 'ผ้าคลุมตัดผม Premium', sku: 'EQ-CAPE-010', category: 'อุปกรณ์ทำผม', productType: 'อุปกรณ์ใช้ระยะยาว', stock: 12, unit: 'ชิ้น', minStock: 4, cost: 180, supplier: 'Salon Tools', note: 'อุปกรณ์ใช้ในร้าน' }),
];
const sampleCostHistory = sampleProducts.map((p) => costRecord({ productId: p.id, productName: p.name, quantity: p.stock, unitCost: p.cost, supplier: p.supplier, invoiceNo: 'DEMO-001', note: 'ข้อมูลตัวอย่างเริ่มต้น', createdAt: p.updatedAt }));

const read = (key, fallback) => {
  try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : fallback; } catch { return fallback; }
};
const write = (key, value) => localStorage.setItem(key, JSON.stringify(value));

function statsForCosts(records) {
  const valid = records.filter((r) => n(r.quantity) > 0);
  if (!valid.length) return { latestCost: 0, averageCost: 0, minCost: 0, maxCost: 0, totalQty: 0 };
  const sorted = [...valid].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  const totalQty = valid.reduce((s, r) => s + n(r.quantity), 0);
  const totalValue = valid.reduce((s, r) => s + n(r.quantity) * n(r.unitCost), 0);
  const costs = valid.map((r) => n(r.unitCost));
  return { latestCost: n(sorted[0]?.unitCost), averageCost: totalQty ? totalValue / totalQty : 0, minCost: Math.min(...costs), maxCost: Math.max(...costs), totalQty };
}

function supplierStats(records) {
  const suppliers = records.map((r) => String(r.supplier || '').trim()).filter(Boolean);
  const unique = [...new Set(suppliers)];
  const sorted = [...records].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  return { latestSupplier: sorted.find((r) => String(r.supplier || '').trim())?.supplier || '', supplierCount: unique.length };
}

function duplicateProduct(products, form) {
  const sku = norm(form.sku);
  if (sku) {
    const found = products.find((p) => norm(p.sku) === sku);
    if (found) return { product: found, reason: 'SKU ซ้ำกัน' };
  }
  const found = products.find((p) => norm(p.name) === norm(form.name) && norm(p.category) === norm(form.category) && norm(p.unit) === norm(form.unit));
  return found ? { product: found, reason: 'ชื่อสินค้า หมวดหมู่ และหน่วยเหมือนกัน' } : null;
}

function buildCsv(rows) {
  return rows.map((row) => row.map((v) => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',')).join(String.fromCharCode(10));
}
function download(filename, body, type) {
  const blob = new Blob([body], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
}

function Button({ children, className = '', ...props }) {
  return <button {...props} className={`inline-flex items-center justify-center rounded-2xl px-4 py-3 text-sm font-black transition hover:-translate-y-0.5 active:scale-[0.98] disabled:opacity-50 ${className}`}>{children}</button>;
}
const Card = ({ children, className = '' }) => <div className={`rounded-3xl border border-white/70 bg-white/85 shadow-sm backdrop-blur ${className}`}>{children}</div>;
const Field = ({ label, children, helper, className = '' }) => <label className={`space-y-1 ${className}`}><span className="text-sm font-black text-neutral-700">{label}</span>{children}{helper ? <p className="text-xs text-neutral-400">{helper}</p> : null}</label>;
const TextInput = (props) => <input {...props} className={`w-full rounded-2xl border border-neutral-200 bg-white px-4 py-3 outline-none focus:border-neutral-950 ${props.className || ''}`} />;
const SelectInput = (props) => <select {...props} className={`w-full rounded-2xl border border-neutral-200 bg-white px-4 py-3 outline-none focus:border-neutral-950 ${props.className || ''}`} />;

function Modal({ title, subtitle, children, onCancel, onSave, saveText = '💾 บันทึกข้อมูล', maxWidth = 'max-w-xl', hideSave = false }) {
  useEffect(() => {
    const old = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = old; };
  }, []);
  return createPortal(
    <div className="fixed inset-0 z-[2147483647] bg-black/75">
      <div className="fixed inset-x-0 top-[92px] bottom-0 z-[2147483647] flex justify-center overflow-y-auto px-3 pb-5 md:top-[108px]">
        <div className={`relative my-4 flex max-h-[calc(100dvh-130px)] w-full ${maxWidth} flex-col overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-black/10`}>
          <div className="shrink-0 border-b border-neutral-100 bg-white px-5 py-4"><h3 className="text-xl font-black text-neutral-950">{title}</h3>{subtitle ? <p className="mt-1 text-xs text-neutral-500">{subtitle}</p> : null}</div>
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-4">{children}</div>
          <div className={`shrink-0 grid gap-3 border-t border-neutral-100 bg-white px-5 py-4 shadow-[0_-8px_24px_rgba(0,0,0,0.08)] ${hideSave ? 'grid-cols-1' : 'grid-cols-2'}`}>
            <Button className="w-full border border-red-200 bg-red-50 py-3 text-red-700 hover:bg-red-100" onClick={onCancel}>{hideSave ? 'ปิด' : '✕ ยกเลิก'}</Button>
            {!hideSave && <Button className="w-full bg-neutral-950 py-3 text-white hover:bg-neutral-800" onClick={onSave}>{saveText}</Button>}
          </div>
        </div>
      </div>
    </div>, document.body
  );
}

function StatCard({ icon, title, value, subtitle }) {
  return <Card className="p-5"><div className="flex items-center gap-4"><div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-neutral-950 text-xl text-white">{icon}</div><div><p className="text-sm text-neutral-500">{title}</p><p className="text-2xl font-black text-neutral-950">{value}</p><p className="text-xs text-neutral-400">{subtitle}</p></div></div></Card>;
}

function ProductForm({ products, setProducts, setTransactions, setCostHistory }) {
  const empty = { name: '', sku: '', category: categoryOptions[0], productType: productTypeOptions[0], purchaseQuantity: 0, minStock: 5, unit: unitOptions[0], cost: 0, supplier: '', invoiceNo: '', note: '' };
  const [mode, setMode] = useState('new');
  const [existingId, setExistingId] = useState(products[0]?.id || '');
  const [form, setForm] = useState(empty);
  const [duplicate, setDuplicate] = useState(null);
  const selected = products.find((p) => p.id === existingId);
  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  useEffect(() => { if (!existingId && products[0]) setExistingId(products[0].id); }, [products, existingId]);
  useEffect(() => { if (mode === 'existing' && selected) setForm((p) => ({ ...p, cost: selected.cost || 0, supplier: selected.supplier || '' })); }, [mode, selected]);

  const merge = (target, payload) => {
    setProducts((prev) => prev.map((p) => p.id === target.id ? { ...p, stock: n(p.stock) + payload.quantity, cost: payload.cost || p.cost, supplier: payload.supplier || p.supplier, updatedAt: nowIso() } : p));
    setCostHistory((prev) => [costRecord({ productId: target.id, productName: target.name, quantity: payload.quantity, unitCost: payload.cost, supplier: payload.supplier, invoiceNo: payload.invoiceNo, note: payload.note }), ...prev]);
    setTransactions((prev) => [{ id: id(), productId: target.id, productName: target.name, type: 'in', quantity: payload.quantity, reason: `รับเข้า/รวมเข้าสต็อคเดิม | ต้นทุน ${money(payload.cost)}`, createdAt: nowIso() }, ...prev]);
    setForm(empty); setDuplicate(null);
  };

  const addNew = (p) => {
    setProducts((prev) => [p, ...prev]);
    setCostHistory((prev) => [costRecord({ productId: p.id, productName: p.name, quantity: p.stock, unitCost: p.cost, supplier: p.supplier, invoiceNo: form.invoiceNo, note: form.note }), ...prev]);
    setTransactions((prev) => [{ id: id(), productId: p.id, productName: p.name, type: 'in', quantity: p.stock, reason: `เพิ่มสินค้าใหม่พร้อมจำนวนซื้อเข้า ต้นทุน ${money(p.cost)}`, createdAt: nowIso() }, ...prev]);
    setForm(empty); setDuplicate(null);
  };

  const submit = (e) => {
    e.preventDefault();
    const payload = { quantity: Math.max(0, n(form.purchaseQuantity)), cost: Math.max(0, n(form.cost)), supplier: form.supplier, invoiceNo: form.invoiceNo, note: form.note };
    if (payload.quantity <= 0) return alert('กรุณากรอกจำนวนซื้อเข้ามากกว่า 0');
    if (mode === 'existing') return selected ? merge(selected, payload) : alert('กรุณาเลือกสินค้าเดิม');
    if (!form.name.trim()) return alert('กรุณากรอกชื่อสินค้า');
    const p = product({ ...form, stock: payload.quantity, cost: payload.cost });
    const dup = duplicateProduct(products, form);
    if (dup) return setDuplicate({ ...dup, productToAdd: p, payload });
    addNew(p);
  };

  return <Card className="p-6"><div className="mb-5"><h2 className="text-xl font-black">รับเข้า / เพิ่มสินค้า</h2><p className="text-sm text-neutral-500">เลือกเติมสต็อคสินค้าเดิม หรือเพิ่มสินค้าใหม่จริง ๆ</p></div><div className="mb-5 grid grid-cols-2 gap-3 rounded-3xl bg-neutral-100 p-2"><button type="button" onClick={() => setMode('new')} className={`rounded-2xl px-4 py-3 text-sm font-black ${mode === 'new' ? 'bg-neutral-950 text-white' : 'text-neutral-600 hover:bg-white'}`}>เพิ่มสินค้าใหม่</button><button type="button" onClick={() => setMode('existing')} className={`rounded-2xl px-4 py-3 text-sm font-black ${mode === 'existing' ? 'bg-neutral-950 text-white' : 'text-neutral-600 hover:bg-white'}`}>รับเข้าสินค้าเดิม</button></div><form onSubmit={submit} className="grid gap-4 md:grid-cols-2">{mode === 'existing' ? <><Field label="เลือกสินค้าที่มีอยู่แล้ว" className="md:col-span-2"><SelectInput value={existingId} onChange={(e) => setExistingId(e.target.value)}>{products.map((p) => <option key={p.id} value={p.id}>{p.name} — คงเหลือ {p.stock} {p.unit}</option>)}</SelectInput></Field>{selected && <div className="md:col-span-2 rounded-2xl border bg-neutral-50 p-4 text-sm text-neutral-600"><b className="text-neutral-950">{selected.name}</b><div className="grid gap-1 sm:grid-cols-2"><span>SKU: {selected.sku || '-'}</span><span>คงเหลือ: {selected.stock} {selected.unit}</span><span>หมวดหมู่: {selected.category}</span><span>ประเภท: {selected.productType}</span></div></div>}</> : <><Field label="ชื่อสินค้า" className="md:col-span-2"><TextInput value={form.name} onChange={(e) => set('name', e.target.value)} /></Field><Field label="รหัสสินค้า / SKU"><TextInput value={form.sku} onChange={(e) => set('sku', e.target.value)} /></Field><Field label="หมวดหมู่"><SelectInput value={form.category} onChange={(e) => set('category', e.target.value)}>{categoryOptions.map((x) => <option key={x}>{x}</option>)}</SelectInput></Field><Field label="ประเภทสินค้า"><SelectInput value={form.productType} onChange={(e) => set('productType', e.target.value)}>{productTypeOptions.map((x) => <option key={x}>{x}</option>)}</SelectInput></Field><Field label="แจ้งเตือนขั้นต่ำ"><TextInput type="number" min="0" value={form.minStock} onChange={(e) => set('minStock', e.target.value)} /></Field><Field label="หน่วย"><SelectInput value={form.unit} onChange={(e) => set('unit', e.target.value)}>{unitOptions.map((x) => <option key={x}>{x}</option>)}</SelectInput></Field></>}<Field label="จำนวนซื้อเข้า"><TextInput type="number" min="0" value={form.purchaseQuantity} onChange={(e) => set('purchaseQuantity', e.target.value)} /></Field><Field label="ต้นทุนต่อหน่วยรอบนี้"><TextInput type="number" min="0" value={form.cost} onChange={(e) => set('cost', e.target.value)} /></Field><Field label="ซัพพลายเออร์"><TextInput value={form.supplier} onChange={(e) => set('supplier', e.target.value)} /></Field><Field label="เลขที่บิล / ใบเสร็จ"><TextInput value={form.invoiceNo} onChange={(e) => set('invoiceNo', e.target.value)} /></Field><Field label="หมายเหตุ" className="md:col-span-2"><textarea className="min-h-20 w-full rounded-2xl border border-neutral-200 px-4 py-3 outline-none" value={form.note} onChange={(e) => set('note', e.target.value)} /></Field><Button className="bg-neutral-950 py-4 text-white md:col-span-2">💾 {mode === 'existing' ? 'รับเข้าสินค้าเดิม' : 'เพิ่มสินค้าใหม่'}</Button></form>{duplicate && <Modal title="พบสินค้าที่อาจซ้ำกัน" subtitle={duplicate.reason} onCancel={() => setDuplicate(null)} hideSave maxWidth="max-w-lg"><div className="space-y-3"><div className="rounded-2xl bg-amber-50 p-4 text-amber-800">แนะนำให้รวมเข้าสต็อคเดิมถ้าเป็นสินค้าตัวเดียวกันจริง</div><Button className="w-full bg-neutral-950 text-white" onClick={() => merge(duplicate.product, duplicate.payload)}>รวมเข้าสต็อคเดิม</Button><Button className="w-full border border-neutral-200 bg-white" onClick={() => addNew(duplicate.productToAdd)}>เพิ่มเป็นสินค้าใหม่แยกต่างหาก</Button></div></Modal>}</Card>;
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
  const selected = products.find((p) => p.id === productId);
  useEffect(() => { if (!productId && products[0]) setProductId(products[0].id); }, [products, productId]);
  useEffect(() => { setReason(type === 'in' ? inboundReasons[0] : outboundReasons[0]); if (selected && type === 'in') { setUnitCost(selected.cost || 0); setSupplier(selected.supplier || ''); } }, [type, selected]);
  const submit = (e) => { e.preventDefault(); const qty = Math.max(0, n(quantity)); const cost = Math.max(0, n(unitCost)); if (!selected || qty <= 0) return alert('กรุณาเลือกสินค้าและกรอกจำนวนมากกว่า 0'); if (type === 'out' && selected.stock < qty) return alert('จำนวนเบิกมากกว่าสต็อคคงเหลือ'); const nextStock = type === 'in' ? selected.stock + qty : selected.stock - qty; setProducts((prev) => prev.map((p) => p.id === selected.id ? { ...p, stock: nextStock, cost: type === 'in' ? cost : p.cost, supplier: type === 'in' && supplier ? supplier : p.supplier, updatedAt: nowIso() } : p)); const detail = [reason, operator ? `ผู้ทำรายการ: ${operator}` : '', note ? `หมายเหตุ: ${note}` : '', type === 'in' ? `ต้นทุนรอบนี้: ${money(cost)}` : ''].filter(Boolean).join(' | '); if (type === 'in') setCostHistory((prev) => [costRecord({ productId: selected.id, productName: selected.name, quantity: qty, unitCost: cost, supplier, invoiceNo, note: detail }), ...prev]); setTransactions((prev) => [{ id: id(), productId: selected.id, productName: selected.name, type, quantity: qty, reason: detail, createdAt: nowIso() }, ...prev]); setQuantity(1); setOperator(''); setNote(''); setInvoiceNo(''); };
  return <Card className="p-6"><h2 className="text-xl font-black">🧾 บันทึกเบิก - รับเข้า</h2><p className="mt-2 inline-flex rounded-full bg-amber-100 px-4 py-2 text-sm font-black text-amber-800">ยอดคงเหลืออัปเดตทันทีหลังบันทึกรายการ</p><form onSubmit={submit} className="mt-5 space-y-4"><Field label="เลือกสินค้า"><SelectInput value={productId} onChange={(e) => setProductId(e.target.value)}>{products.map((p) => <option key={p.id} value={p.id}>{p.name} — คงเหลือ {p.stock} {p.unit}</option>)}</SelectInput></Field><div className="grid grid-cols-2 gap-3"><Button type="button" className={type === 'in' ? 'bg-emerald-600 text-white' : 'border bg-emerald-50 text-emerald-700'} onClick={() => setType('in')}>⬆ รับเข้า</Button><Button type="button" className={type === 'out' ? 'bg-amber-600 text-white' : 'border bg-amber-50 text-amber-700'} onClick={() => setType('out')}>⬇ เบิกออก</Button></div><Field label="จำนวน"><TextInput type="number" min="1" value={quantity} onChange={(e) => setQuantity(e.target.value)} /></Field>{type === 'in' && <div className="grid gap-4 md:grid-cols-2"><Field label="ต้นทุนต่อหน่วยรอบนี้"><TextInput type="number" min="0" value={unitCost} onChange={(e) => setUnitCost(e.target.value)} /></Field><Field label="ซัพพลายเออร์รอบนี้"><TextInput value={supplier} onChange={(e) => setSupplier(e.target.value)} /></Field><Field label="เลขที่บิล / ใบเสร็จ" className="md:col-span-2"><TextInput value={invoiceNo} onChange={(e) => setInvoiceNo(e.target.value)} /></Field></div>}<div className="grid gap-4 md:grid-cols-2"><Field label="เหตุผล"><SelectInput value={reason} onChange={(e) => setReason(e.target.value)}>{(type === 'in' ? inboundReasons : outboundReasons).map((x) => <option key={x}>{x}</option>)}</SelectInput></Field><Field label="ผู้ทำรายการ / ผู้เบิก"><TextInput value={operator} onChange={(e) => setOperator(e.target.value)} /></Field><Field label="หมายเหตุเพิ่มเติม" className="md:col-span-2"><TextInput value={note} onChange={(e) => setNote(e.target.value)} /></Field></div><Button className="w-full bg-neutral-950 text-white">บันทึกรายการ</Button></form></Card>;
}

function ProductTable({ products, setProducts, setTransactions, costHistory, setCostHistory }) {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('ทั้งหมด');
  const [type, setType] = useState('ทั้งหมด');
  const [edit, setEdit] = useState(null);
  const [stockEdit, setStockEdit] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [costViewer, setCostViewer] = useState(null);
  const [form, setForm] = useState({});
  const filtered = useMemo(() => products.filter((p) => `${p.name} ${p.sku} ${p.category} ${p.productType} ${p.supplier}`.toLowerCase().includes(query.toLowerCase()) && (category === 'ทั้งหมด' || p.category === category) && (type === 'ทั้งหมด' || p.productType === type)), [products, query, category, type]);
  const openEdit = (p) => { setEdit(p); setForm(p); };
  const saveEdit = () => { setProducts((prev) => prev.map((p) => p.id === edit.id ? product({ ...edit, ...form, updatedAt: nowIso() }) : p)); setTransactions((prev) => [{ id: id(), productId: edit.id, productName: form.name, type: 'edit', quantity: 0, reason: 'แก้ไขข้อมูลสินค้า', createdAt: nowIso() }, ...prev]); setEdit(null); };
  const saveStock = () => { setProducts((prev) => prev.map((p) => p.id === stockEdit.id ? { ...p, stock: Math.max(0, n(form.stock)), minStock: Math.max(0, n(form.minStock)), updatedAt: nowIso() } : p)); setStockEdit(null); };
  const remove = () => { setProducts((prev) => prev.filter((p) => p.id !== deleteTarget.id)); setCostHistory((prev) => prev.filter((r) => r.productId !== deleteTarget.id)); setTransactions((prev) => [{ id: id(), productId: deleteTarget.id, productName: deleteTarget.name, type: 'delete', quantity: deleteTarget.stock, reason: 'ลบสินค้าออกจากระบบ', createdAt: nowIso() }, ...prev]); setDeleteTarget(null); };
  return <Card className="p-6"><div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between"><div><h2 className="text-xl font-black">จัดการสินค้าและจำนวนคงเหลือ</h2><p className="text-sm text-neutral-500">ค้นหา แก้ไข ลบ และดูประวัติต้นทุนสินค้า</p></div><div className="flex flex-col gap-3 sm:flex-row"><TextInput placeholder="🔎 ค้นหา" value={query} onChange={(e) => setQuery(e.target.value)} /><SelectInput value={category} onChange={(e) => setCategory(e.target.value)}><option>ทั้งหมด</option>{categoryOptions.map((x) => <option key={x}>{x}</option>)}</SelectInput><SelectInput value={type} onChange={(e) => setType(e.target.value)}><option value="ทั้งหมด">ทุกประเภท</option>{productTypeOptions.map((x) => <option key={x}>{x}</option>)}</SelectInput></div></div><div className="overflow-hidden rounded-2xl border bg-white"><div className="max-h-[560px] overflow-auto"><table className="w-full min-w-[980px] text-left text-sm"><thead className="sticky top-0 bg-neutral-100"><tr>{['สินค้า', 'หมวดหมู่', 'ประเภท', 'คงเหลือ', 'ต้นทุน', 'เฉลี่ย', 'ซัพพลายเออร์ล่าสุด', 'จัดการ'].map((h) => <th key={h} className="px-3 py-3">{h}</th>)}</tr></thead><tbody>{filtered.map((p) => { const records = costHistory.filter((r) => r.productId === p.id); const c = statsForCosts(records); const s = supplierStats(records); const low = p.stock <= p.minStock; return <tr key={p.id} className="border-t hover:bg-neutral-50"><td className="px-3 py-3"><b>{p.name}</b><div className="text-xs text-neutral-400">SKU: {p.sku || '-'}</div></td><td className="px-3 py-3">{p.category}</td><td className="px-3 py-3"><span className="rounded-full bg-neutral-100 px-2 py-1 text-xs font-black">{p.productType}</span></td><td className="px-3 py-3"><span className={`rounded-full px-2 py-1 text-xs font-black ${low ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'}`}>{p.stock} {p.unit}</span><div className="text-[11px] text-neutral-400">≤ {p.minStock}</div></td><td className="px-3 py-3 font-black">{money(c.latestCost || p.cost)}</td><td className="px-3 py-3">{money(c.averageCost || p.cost)}</td><td className="px-3 py-3"><b>{s.latestSupplier || p.supplier || '-'}</b><div className="text-[11px] text-neutral-400">เคยซื้อ {s.supplierCount} เจ้า</div></td><td className="px-3 py-3"><div className="flex flex-nowrap gap-1.5"><button className="rounded-xl border border-blue-200 bg-blue-50 px-2.5 py-2 text-xs font-black text-blue-700" onClick={() => openEdit(p)}>✏️ แก้ไข</button><button className="rounded-xl border border-amber-200 bg-amber-50 px-2.5 py-2 text-xs font-black text-amber-800" onClick={() => { setStockEdit(p); setForm({ stock: p.stock, minStock: p.minStock }); }}>📦 สต็อค</button><button className="rounded-xl border border-purple-200 bg-purple-50 px-2.5 py-2 text-xs font-black text-purple-700" onClick={() => setCostViewer(p)}>📈 ต้นทุน</button><button className="rounded-xl border border-red-200 bg-red-50 px-2.5 py-2 text-xs font-black text-red-700" onClick={() => setDeleteTarget(p)}>🗑️ ลบ</button></div></td></tr>; })}</tbody></table></div></div>{edit && <Modal title="แก้ไขข้อมูลสินค้า" subtitle="แก้ไขรายละเอียดสินค้าโดยไม่กระทบจำนวนคงเหลือ" onCancel={() => setEdit(null)} onSave={saveEdit} maxWidth="max-w-lg"><div className="grid gap-4 md:grid-cols-2"><Field label="ชื่อสินค้า" className="md:col-span-2"><TextInput value={form.name || ''} onChange={(e) => setForm((x) => ({ ...x, name: e.target.value }))} /></Field><Field label="SKU"><TextInput value={form.sku || ''} onChange={(e) => setForm((x) => ({ ...x, sku: e.target.value }))} /></Field><Field label="หมวดหมู่"><SelectInput value={form.category} onChange={(e) => setForm((x) => ({ ...x, category: e.target.value }))}>{categoryOptions.map((x) => <option key={x}>{x}</option>)}</SelectInput></Field><Field label="ประเภทสินค้า"><SelectInput value={form.productType} onChange={(e) => setForm((x) => ({ ...x, productType: e.target.value }))}>{productTypeOptions.map((x) => <option key={x}>{x}</option>)}</SelectInput></Field><Field label="หน่วย"><SelectInput value={form.unit} onChange={(e) => setForm((x) => ({ ...x, unit: e.target.value }))}>{unitOptions.map((x) => <option key={x}>{x}</option>)}</SelectInput></Field><Field label="ต้นทุนล่าสุด"><TextInput type="number" value={form.cost || 0} onChange={(e) => setForm((x) => ({ ...x, cost: e.target.value }))} /></Field><Field label="ซัพพลายเออร์" className="md:col-span-2"><TextInput value={form.supplier || ''} onChange={(e) => setForm((x) => ({ ...x, supplier: e.target.value }))} /></Field><Field label="หมายเหตุ" className="md:col-span-2"><textarea className="min-h-20 w-full rounded-2xl border px-4 py-3" value={form.note || ''} onChange={(e) => setForm((x) => ({ ...x, note: e.target.value }))} /></Field></div></Modal>}{stockEdit && <Modal title="แก้ไขจำนวนคงเหลือ" subtitle={stockEdit.name} onCancel={() => setStockEdit(null)} onSave={saveStock} maxWidth="max-w-md"><div className="grid gap-4"><Field label="จำนวนคงเหลือใหม่"><TextInput type="number" value={form.stock} onChange={(e) => setForm((x) => ({ ...x, stock: e.target.value }))} /></Field><Field label="แจ้งเตือนขั้นต่ำ"><TextInput type="number" value={form.minStock} onChange={(e) => setForm((x) => ({ ...x, minStock: e.target.value }))} /></Field></div></Modal>}{deleteTarget && <Modal title="ยืนยันการลบสินค้า" subtitle={`คุณกำลังจะลบ ${deleteTarget.name}`} onCancel={() => setDeleteTarget(null)} onSave={remove} saveText="🗑️ ยืนยันลบสินค้า" maxWidth="max-w-md"><div className="rounded-2xl bg-red-50 p-4 text-red-700">การลบนี้จะนำสินค้าและประวัติต้นทุนของสินค้านี้ออกจากระบบ</div></Modal>}{costViewer && (() => { const records = costHistory.filter((r) => r.productId === costViewer.id).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)); const c = statsForCosts(records); return <Modal title="ประวัติต้นทุนสินค้า" subtitle={costViewer.name} onCancel={() => setCostViewer(null)} hideSave maxWidth="max-w-3xl"><div className="grid gap-3 sm:grid-cols-4"><div className="rounded-2xl bg-neutral-950 p-4 text-white"><p className="text-xs">ต้นทุนล่าสุด</p><b>{money(c.latestCost)}</b></div><div className="rounded-2xl bg-emerald-50 p-4 text-emerald-800"><p className="text-xs">ต้นทุนเฉลี่ย</p><b>{money(c.averageCost)}</b></div><div className="rounded-2xl bg-blue-50 p-4 text-blue-800"><p className="text-xs">ต่ำสุด/สูงสุด</p><b>{money(c.minCost)} / {money(c.maxCost)}</b></div><div className="rounded-2xl bg-amber-50 p-4 text-amber-800"><p className="text-xs">รวมซื้อเข้า</p><b>{c.totalQty} {costViewer.unit}</b></div></div><div className="mt-4 overflow-auto rounded-2xl border"><table className="w-full min-w-[760px] text-sm"><thead className="bg-neutral-100"><tr>{['วันที่', 'จำนวนเข้า', 'ต้นทุน/หน่วย', 'ซัพพลายเออร์', 'เลขที่บิล', 'หมายเหตุ'].map((h) => <th key={h} className="px-4 py-3 text-left">{h}</th>)}</tr></thead><tbody>{records.map((r) => <tr key={r.id} className="border-t"><td className="px-4 py-3">{new Date(r.createdAt).toLocaleDateString('th-TH')}</td><td className="px-4 py-3">{r.quantity} {costViewer.unit}</td><td className="px-4 py-3 font-black">{money(r.unitCost)}</td><td className="px-4 py-3">{r.supplier || '-'}</td><td className="px-4 py-3">{r.invoiceNo || '-'}</td><td className="px-4 py-3">{r.note || '-'}</td></tr>)}</tbody></table></div></Modal>; })()}</Card>;
}

function TransactionHistory({ transactions }) {
  return <Card className="p-6"><h2 className="text-xl font-black">🕘 ประวัติการเคลื่อนไหว</h2><div className="mt-5 space-y-3">{transactions.slice(0, 14).map((t) => <div key={t.id} className="rounded-2xl border bg-white p-4"><div className="flex items-center justify-between"><b>{t.productName}</b>{t.quantity > 0 && <span className="rounded-full bg-neutral-100 px-3 py-1 text-xs font-black">{t.type === 'out' ? '-' : '+'}{t.quantity}</span>}</div><p className="mt-1 text-sm text-neutral-500">{t.reason}</p><p className="mt-1 text-xs text-neutral-400">{new Date(t.createdAt).toLocaleString('th-TH')}</p></div>)}{transactions.length === 0 && <div className="rounded-2xl bg-white p-8 text-center text-neutral-500">ยังไม่มีประวัติรายการ</div>}</div></Card>;
}

function DevTestsPanel() {
  const avg = statsForCosts([costRecord({ quantity: 10, unitCost: 220 }), costRecord({ quantity: 12, unitCost: 245 }), costRecord({ quantity: 8, unitCost: 210 })]).averageCost;
  const csv = buildCsv([['สินค้า', 'หมายเหตุ'], ['แชมพู', 'มี "โปร" และ, comma']]);
  const tests = [
    ['เพิ่มสินค้าแล้วมี id', Boolean(product({ name: 'A' }).id)],
    ['คำนวณต้นทุนเฉลี่ยถ่วงน้ำหนักถูกต้อง', Math.round(avg * 100) / 100 === 227.33],
    ['CSV escape quote ได้', csv.includes('"มี ""โปร"" และ, comma"')],
    ['ตรวจเจอ SKU ซ้ำได้', duplicateProduct([product({ name: 'A', sku: 'SKU-1' })], { name: 'B', sku: 'SKU-1', category: categoryOptions[0], unit: unitOptions[0] })?.reason === 'SKU ซ้ำกัน'],
  ];
  return <Card className="p-6"><h2 className="text-xl font-black">✅ Developer Self Tests</h2><div className="mt-4 grid gap-3 md:grid-cols-2">{tests.map(([name, pass]) => <div key={name} className={`rounded-2xl border p-4 text-sm font-black ${pass ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-red-200 bg-red-50 text-red-700'}`}>{pass ? 'ผ่าน' : 'ไม่ผ่าน'} — {name}</div>)}</div></Card>;
}

export default function BeautySalonInventoryApp() {
  const [products, setProducts] = useState(() => (Array.isArray(read(STORAGE_KEYS.products, null)) ? read(STORAGE_KEYS.products, []).map(product) : sampleProducts));
  const [transactions, setTransactions] = useState(() => read(STORAGE_KEYS.transactions, []));
  const [costHistory, setCostHistory] = useState(() => (Array.isArray(read(STORAGE_KEYS.costHistory, null)) ? read(STORAGE_KEYS.costHistory, []).map(costRecord) : sampleCostHistory));
  const [activeTab, setActiveTab] = useState('dashboard');
  const [exportOpen, setExportOpen] = useState(false);
  useEffect(() => write(STORAGE_KEYS.products, products), [products]);
  useEffect(() => write(STORAGE_KEYS.transactions, transactions), [transactions]);
  useEffect(() => write(STORAGE_KEYS.costHistory, costHistory), [costHistory]);

  const dashboard = useMemo(() => {
    const totalProducts = products.length;
    const totalStock = products.reduce((s, p) => s + n(p.stock), 0);
    const lowStock = products.filter((p) => n(p.stock) <= n(p.minStock)).length;
    const inventoryValue = products.reduce((s, p) => { const c = statsForCosts(costHistory.filter((r) => r.productId === p.id)); return s + n(p.stock) * n(c.averageCost || p.cost); }, 0);
    return { totalProducts, totalStock, lowStock, inventoryValue };
  }, [products, costHistory]);
  const lowStockProducts = products.filter((p) => n(p.stock) <= n(p.minStock));
  const withCosts = products.map((p) => { const c = statsForCosts(costHistory.filter((r) => r.productId === p.id)); const latestCost = c.latestCost || p.cost || 0; const averageCost = c.averageCost || p.cost || 0; return { ...p, latestCost, averageCost, costDiff: latestCost - averageCost }; });
  const highestLatest = [...withCosts].sort((a, b) => b.latestCost - a.latestCost).slice(0, 5);
  const highestAvg = [...withCosts].sort((a, b) => b.averageCost - a.averageCost).slice(0, 5);
  const mostExpensive = highestLatest[0];
  const recent = transactions.slice(0, 5);
  const tabs = [{ id: 'dashboard', label: '📊 Dashboard' }, { id: 'stock', label: '🧾 บันทึกสต็อค' }, { id: 'products', label: '📦 จัดการสินค้า' }];

  const exportJson = () => download(`beauty-salon-inventory-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify({ products, transactions, costHistory, exportedAt: nowIso() }, null, 2), 'application/json');
  const exportProducts = () => download(`beauty-salon-products-${new Date().toISOString().slice(0, 10)}.csv`, '\uFEFF' + buildCsv([['ชื่อสินค้า', 'รหัสสินค้า', 'หมวดหมู่', 'ประเภทสินค้า', 'คงเหลือ', 'หน่วย', 'แจ้งเตือนขั้นต่ำ', 'ต้นทุนล่าสุด', 'ต้นทุนเฉลี่ย', 'ซัพพลายเออร์'], ...withCosts.map((p) => [p.name, p.sku, p.category, p.productType, p.stock, p.unit, p.minStock, p.latestCost, p.averageCost, p.supplier])]), 'text/csv;charset=utf-8;');
  const exportTransactions = () => download(`beauty-salon-transactions-${new Date().toISOString().slice(0, 10)}.csv`, '\uFEFF' + buildCsv([['วันที่', 'สินค้า', 'ประเภท', 'จำนวน', 'เหตุผล'], ...transactions.map((t) => [new Date(t.createdAt).toLocaleString('th-TH'), t.productName, t.type, t.quantity, t.reason])]), 'text/csv;charset=utf-8;');
  const exportCosts = () => download(`beauty-salon-cost-history-${new Date().toISOString().slice(0, 10)}.csv`, '\uFEFF' + buildCsv([['วันที่', 'สินค้า', 'จำนวนเข้า', 'ต้นทุนต่อหน่วย', 'ซัพพลายเออร์', 'เลขที่บิล', 'หมายเหตุ'], ...costHistory.map((c) => [new Date(c.createdAt).toLocaleString('th-TH'), c.productName, c.quantity, c.unitCost, c.supplier, c.invoiceNo, c.note])]), 'text/csv;charset=utf-8;');
  const doExport = (fn) => { fn(); setExportOpen(false); };
  const importData = (e) => { const file = e.target.files?.[0]; if (!file) return; const reader = new FileReader(); reader.onload = () => { try { const data = JSON.parse(String(reader.result)); if (!Array.isArray(data.products)) throw new Error('Invalid'); setProducts(data.products.map(product)); setTransactions(Array.isArray(data.transactions) ? data.transactions : []); setCostHistory(Array.isArray(data.costHistory) ? data.costHistory.map(costRecord) : []); } catch { alert('ไฟล์ไม่ถูกต้อง กรุณาใช้ไฟล์ JSON ที่ Export จากระบบนี้'); } }; reader.readAsText(file); e.target.value = ''; };

  return <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_#fde68a,_transparent_32%),linear-gradient(135deg,_#fff7ed,_#f5f5f4_45%,_#e7e5e4)] p-4 text-neutral-950 md:p-8"><div className="mx-auto max-w-7xl"><header className="mb-6 rounded-[2rem] bg-neutral-950 p-6 text-white shadow-xl md:p-8"><div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between"><div><div className="mb-4 inline-flex rounded-full bg-white/10 px-4 py-2 text-sm">✨ Beauty Salon Inventory System</div><h1 className="max-w-3xl text-3xl font-black md:text-5xl">ระบบจัดการสต็อคร้านเสริมสวย</h1><p className="mt-4 max-w-2xl text-neutral-300">Dashboard, บันทึกสต็อค, จัดการสินค้า และ Export/Import ข้อมูล</p></div><div className="flex flex-wrap gap-3"><Button className="bg-white text-neutral-950" onClick={() => setExportOpen(true)}>⬇ Export ข้อมูล</Button><label className="inline-flex cursor-pointer items-center rounded-2xl bg-white/10 px-4 py-3 text-sm font-black text-white">⬆ Import ข้อมูล<input type="file" accept="application/json" onChange={importData} className="hidden" /></label></div></div></header>{exportOpen && <Modal title="Export ข้อมูล" subtitle="เลือกประเภทไฟล์ที่ต้องการดาวน์โหลด" onCancel={() => setExportOpen(false)} hideSave maxWidth="max-w-lg"><div className="grid gap-3"><button className="rounded-2xl border p-4 text-left" onClick={() => doExport(exportJson)}>💾 Backup JSON สำหรับ Import กลับ</button><button className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-left" onClick={() => doExport(exportProducts)}>📦 รายการสินค้า CSV</button><button className="rounded-2xl border border-blue-200 bg-blue-50 p-4 text-left" onClick={() => doExport(exportTransactions)}>🧾 ประวัติรายการ CSV</button><button className="rounded-2xl border border-purple-200 bg-purple-50 p-4 text-left" onClick={() => doExport(exportCosts)}>📈 ประวัติต้นทุน CSV</button></div></Modal>}<nav className="sticky top-3 z-10 mb-8 rounded-3xl border bg-white/80 p-2 shadow-sm backdrop-blur"><div className="grid gap-2 md:grid-cols-3">{tabs.map((t) => <button key={t.id} onClick={() => setActiveTab(t.id)} className={`rounded-2xl px-4 py-3 text-sm font-black ${activeTab === t.id ? 'bg-neutral-950 text-white' : 'text-neutral-600 hover:bg-neutral-100'}`}>{t.label}</button>)}</div></nav>{activeTab === 'dashboard' && <div className="space-y-8"><section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4"><StatCard icon="📦" title="จำนวนรายการสินค้า" value={dashboard.totalProducts} subtitle="สินค้าทั้งหมด" /><StatCard icon="📊" title="จำนวนสต็อครวม" value={dashboard.totalStock} subtitle="รวมทุกหมวดหมู่" /><StatCard icon="⚠️" title="สินค้าใกล้หมด" value={dashboard.lowStock} subtitle="ควรสั่งเพิ่ม" /><StatCard icon="💰" title="มูลค่าสต็อค" value={money(dashboard.inventoryValue)} subtitle="ต้นทุนเฉลี่ย x คงเหลือ" /></section>{lowStockProducts.length > 0 && <section className="rounded-3xl border border-red-200 bg-red-50 p-5"><b className="text-red-700">⚠️ แจ้งเตือนสินค้าใกล้หมด</b><div className="mt-3 flex flex-wrap gap-2">{lowStockProducts.map((p) => <span key={p.id} className="rounded-full bg-white px-4 py-2 text-sm font-black text-red-700">{p.name}: เหลือ {p.stock} {p.unit}</span>)}</div></section>}<section className="grid gap-6 xl:grid-cols-3"><Card className="p-6"><h2 className="text-xl font-black">สินค้าต้นทุนล่าสุดแพงสุด</h2>{mostExpensive ? <div className="mt-5 rounded-3xl bg-neutral-950 p-5 text-white"><p>อันดับ 1</p><h3 className="mt-2 text-2xl font-black">{mostExpensive.name}</h3><p className="mt-3 text-3xl font-black">{money(mostExpensive.latestCost)}</p><p className="mt-2 text-xs">{mostExpensive.costDiff > 0 ? '+' : ''}{money(mostExpensive.costDiff)} เทียบกับเฉลี่ย</p></div> : null}</Card><Card className="p-6 xl:col-span-2"><h2 className="text-xl font-black">Top 5 ต้นทุนล่าสุดต่อหน่วย</h2><div className="mt-5 overflow-auto rounded-2xl border bg-white"><table className="w-full min-w-[680px] text-sm"><thead className="bg-neutral-100"><tr>{['สินค้า', 'ล่าสุด', 'เฉลี่ย', 'ส่วนต่าง', 'คงเหลือ'].map((h) => <th key={h} className="px-4 py-3 text-left">{h}</th>)}</tr></thead><tbody>{highestLatest.map((p) => <tr key={p.id} className="border-t"><td className="px-4 py-3 font-black">{p.name}</td><td className="px-4 py-3 font-black">{money(p.latestCost)}</td><td className="px-4 py-3">{money(p.averageCost)}</td><td className={`px-4 py-3 font-black ${p.costDiff > 0 ? 'text-red-600' : p.costDiff < 0 ? 'text-emerald-600' : 'text-neutral-500'}`}>{p.costDiff > 0 ? '+' : ''}{money(p.costDiff)}</td><td className="px-4 py-3">{p.stock} {p.unit}</td></tr>)}</tbody></table></div></Card></section><section className="grid gap-6 xl:grid-cols-2"><Card className="p-6"><h2 className="text-xl font-black">สินค้าต้นทุนเฉลี่ยสูงสุด</h2><div className="mt-5 space-y-3">{highestAvg.map((p) => <div key={p.id} className="flex justify-between rounded-2xl border bg-white p-4"><div><b>{p.name}</b><p className="text-xs text-neutral-400">คงเหลือ {p.stock} {p.unit}</p></div><b>{money(p.averageCost)}</b></div>)}</div></Card><Card className="p-6"><h2 className="text-xl font-black">รายการเคลื่อนไหวล่าสุด</h2><div className="mt-5 space-y-3">{recent.map((t) => <div key={t.id} className="rounded-2xl border bg-white p-4"><div className="flex justify-between"><b>{t.productName}</b>{t.quantity > 0 && <span className="rounded-full bg-neutral-100 px-3 py-1 text-xs font-black">{t.type === 'out' ? '-' : '+'}{t.quantity}</span>}</div><p className="mt-1 text-sm text-neutral-500">{t.reason}</p></div>)}</div></Card></section></div>}{activeTab === 'stock' && <div className="space-y-8"><section className="grid gap-6 xl:grid-cols-[1.25fr_0.75fr]"><ProductForm products={products} setProducts={setProducts} setTransactions={setTransactions} setCostHistory={setCostHistory} /><TransactionPanel products={products} setProducts={setProducts} setTransactions={setTransactions} setCostHistory={setCostHistory} /></section><TransactionHistory transactions={transactions} /></div>}{activeTab === 'products' && <ProductTable products={products} setProducts={setProducts} setTransactions={setTransactions} costHistory={costHistory} setCostHistory={setCostHistory} />}</div></main>;
}
