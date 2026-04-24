import React, { useEffect, useState } from 'react';
import { categoryOptions, outboundReasonOptions, productTypeOptions, unitOptions } from '../data/constants.js';
import { Button, Card, Field, Modal, SelectInput, TextArea, TextInput } from './ui.jsx';
import { createCostRecord, createId, createProduct, findDuplicateProduct, formatMoney, nowIso, toSafeNumber } from '../lib/inventory.js';

function todayInputValue() {
  return new Date().toISOString().slice(0, 10);
}

function isoFromDateInput(dateValue) {
  if (!dateValue) return nowIso();
  const now = new Date();
  const [year, month, day] = dateValue.split('-').map(Number);
  const date = new Date(year, month - 1, day, now.getHours(), now.getMinutes(), now.getSeconds());
  return date.toISOString();
}

export default function StockPage({ products, setProducts, transactions, setTransactions, setCostHistory }) {
  return (
    <div className="space-y-8">
      <section className="grid gap-6 xl:grid-cols-[1.25fr_0.75fr]">
        <ProductReceiveForm products={products} setProducts={setProducts} setTransactions={setTransactions} setCostHistory={setCostHistory} />
        <IssueStockForm products={products} setProducts={setProducts} setTransactions={setTransactions} />
      </section>
      <TransactionHistory transactions={transactions} />
    </div>
  );
}

function ProductReceiveForm({ products, setProducts, setTransactions, setCostHistory }) {
  const emptyForm = { name: '', sku: '', category: categoryOptions[0], productType: productTypeOptions[0], purchaseQuantity: 0, minStock: 5, unit: unitOptions[0], cost: 0, supplier: '', note: '' };
  const [mode, setMode] = useState('new');
  const [existingId, setExistingId] = useState(products[0]?.id || '');
  const [form, setForm] = useState(emptyForm);
  const [successMessage, setSuccessMessage] = useState('');
  const [duplicatePrompt, setDuplicatePrompt] = useState(null);

  useEffect(() => {
    if (!existingId && products[0]) setExistingId(products[0].id);
    if (existingId && !products.some((product) => product.id === existingId)) setExistingId(products[0]?.id || '');
  }, [existingId, products]);

  const selected = products.find((product) => product.id === existingId);
  const update = (key, value) => {
    setSuccessMessage('');
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  function receiveExisting(payload) {
    if (!selected) return false;
    setProducts((prev) => prev.map((item) => item.id === selected.id ? {
      ...item,
      stock: toSafeNumber(item.stock) + payload.qty,
      cost: payload.cost || item.cost,
      supplier: payload.supplier || item.supplier,
      updatedAt: nowIso(),
    } : item));
    setCostHistory((prev) => [createCostRecord({ productId: selected.id, productName: selected.name, quantity: payload.qty, unitCost: payload.cost, supplier: payload.supplier, note: payload.note }), ...prev]);
    setTransactions((prev) => [{ id: createId(), productId: selected.id, productName: selected.name, type: 'in', quantity: payload.qty, reason: `รับเข้าสินค้าเดิม | ต้นทุน ${formatMoney(payload.cost)}`, createdAt: nowIso() }, ...prev]);
    setSuccessMessage(`บันทึกรับเข้า ${selected.name} จำนวน ${payload.qty} ${selected.unit} เรียบร้อยแล้ว`);
    return true;
  }

  function mergeIntoDuplicate(duplicateProduct, payload) {
    setProducts((prev) => prev.map((item) => item.id === duplicateProduct.id ? {
      ...item,
      stock: toSafeNumber(item.stock) + payload.qty,
      cost: payload.cost || item.cost,
      supplier: payload.supplier || item.supplier,
      updatedAt: nowIso(),
    } : item));
    setCostHistory((prev) => [createCostRecord({ productId: duplicateProduct.id, productName: duplicateProduct.name, quantity: payload.qty, unitCost: payload.cost, supplier: payload.supplier, note: payload.note }), ...prev]);
    setTransactions((prev) => [{ id: createId(), productId: duplicateProduct.id, productName: duplicateProduct.name, type: 'in', quantity: payload.qty, reason: `รวมเข้าสต็อคเดิมจากรายการที่อาจซ้ำ | ต้นทุน ${formatMoney(payload.cost)}`, createdAt: nowIso() }, ...prev]);
    setSuccessMessage(`รวมเข้าสต็อคเดิม ${duplicateProduct.name} จำนวน ${payload.qty} ${duplicateProduct.unit} เรียบร้อยแล้ว`);
    setDuplicatePrompt(null);
    setForm(emptyForm);
  }

  function addProductRecord(product, payload) {
    setProducts((prev) => [product, ...prev]);
    setCostHistory((prev) => [createCostRecord({ productId: product.id, productName: product.name, quantity: payload.qty, unitCost: payload.cost, supplier: payload.supplier, note: payload.note }), ...prev]);
    setTransactions((prev) => [{ id: createId(), productId: product.id, productName: product.name, type: 'in', quantity: payload.qty, reason: `เพิ่มสินค้าใหม่พร้อมจำนวนซื้อเข้า ต้นทุน ${formatMoney(payload.cost)}`, createdAt: nowIso() }, ...prev]);
    setSuccessMessage(`เพิ่มสินค้าใหม่ ${product.name} และบันทึกรับเข้า ${payload.qty} ${product.unit} เรียบร้อยแล้ว`);
    setDuplicatePrompt(null);
    setForm(emptyForm);
  }

  function addAsNewFromDuplicate() {
    if (!duplicatePrompt) return;
    addProductRecord(duplicatePrompt.newProduct, duplicatePrompt.payload);
  }

  function addNewProduct(payload) {
    const product = createProduct({ ...form, name: form.name.trim(), stock: payload.qty, cost: payload.cost });
    const duplicate = findDuplicateProduct(products, form);
    if (duplicate) {
      setDuplicatePrompt({ product: duplicate.product, reason: duplicate.reason, newProduct: product, payload });
      return false;
    }
    addProductRecord(product, payload);
    return true;
  }

  function submit(event) {
    event.preventDefault();
    setSuccessMessage('');
    const qty = Math.max(0, toSafeNumber(form.purchaseQuantity));
    const cost = Math.max(0, toSafeNumber(form.cost));
    if (qty <= 0) return window.alert('กรุณากรอกจำนวนซื้อเข้ามากกว่า 0');
    const payload = { qty, cost, supplier: form.supplier, note: form.note };
    let saved = false;
    if (mode === 'existing') {
      if (!selected) return window.alert('กรุณาเลือกสินค้าเดิม');
      saved = receiveExisting(payload);
    } else {
      if (!form.name.trim()) return window.alert('กรุณากรอกชื่อสินค้า');
      saved = addNewProduct(payload);
    }
    if (saved) setForm(emptyForm);
  }

  return (
    <>
      <Card className="p-4 md:p-6">
        <div className="mb-5"><h2 className="text-xl font-black text-neutral-950">รับเข้า / เพิ่มสินค้า</h2><p className="text-sm text-neutral-500">ของเข้าให้บันทึกที่ส่วนนี้ เพื่อเก็บต้นทุนและซัพพลายเออร์</p></div>
        {successMessage ? <div className="mb-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-black text-emerald-700">✅ {successMessage}</div> : null}
        <div className="mb-5 grid grid-cols-2 gap-2 rounded-3xl bg-neutral-100 p-2">
          <button type="button" onClick={() => { setMode('new'); setSuccessMessage(''); }} className={`rounded-2xl px-3 py-3 text-sm font-black ${mode === 'new' ? 'bg-neutral-950 text-white' : 'text-neutral-600'}`}>เพิ่มสินค้าใหม่</button>
          <button type="button" onClick={() => { setMode('existing'); setSuccessMessage(''); }} className={`rounded-2xl px-3 py-3 text-sm font-black ${mode === 'existing' ? 'bg-neutral-950 text-white' : 'text-neutral-600'}`}>รับเข้าสินค้าเดิม</button>
        </div>
        <form onSubmit={submit} className="grid gap-4 md:grid-cols-2">
          {mode === 'existing' ? (
            <Field label="เลือกสินค้าเดิม" className="md:col-span-2"><SelectInput value={existingId} onChange={(e) => setExistingId(e.target.value)}>{products.map((item) => <option key={item.id} value={item.id}>{item.name} — คงเหลือ {item.stock} {item.unit}</option>)}</SelectInput></Field>
          ) : (
            <>
              <Field label="ชื่อสินค้า" className="md:col-span-2"><TextInput value={form.name} onChange={(e) => update('name', e.target.value)} /></Field>
              <Field label="รหัสสินค้า / SKU"><TextInput value={form.sku} onChange={(e) => update('sku', e.target.value)} /></Field>
              <Field label="หมวดหมู่"><SelectInput value={form.category} onChange={(e) => update('category', e.target.value)}>{categoryOptions.map((item) => <option key={item}>{item}</option>)}</SelectInput></Field>
              <Field label="ประเภทสินค้า"><SelectInput value={form.productType} onChange={(e) => update('productType', e.target.value)}>{productTypeOptions.map((item) => <option key={item}>{item}</option>)}</SelectInput></Field>
              <Field label="หน่วย"><SelectInput value={form.unit} onChange={(e) => update('unit', e.target.value)}>{unitOptions.map((item) => <option key={item}>{item}</option>)}</SelectInput></Field>
              <Field label="แจ้งเตือนขั้นต่ำ"><TextInput type="number" min="0" value={form.minStock} onChange={(e) => update('minStock', e.target.value)} /></Field>
            </>
          )}
          <Field label="จำนวนซื้อเข้า"><TextInput type="number" min="0" value={form.purchaseQuantity} onChange={(e) => update('purchaseQuantity', e.target.value)} /></Field>
          <Field label="ต้นทุนต่อหน่วยรอบนี้"><TextInput type="number" min="0" value={form.cost} onChange={(e) => update('cost', e.target.value)} /></Field>
          <Field label="ซัพพลายเออร์"><TextInput value={form.supplier} onChange={(e) => update('supplier', e.target.value)} /></Field>
          <Field label="หมายเหตุ" className="md:col-span-2"><TextArea value={form.note} onChange={(e) => update('note', e.target.value)} /></Field>
          <Button type="submit" className="bg-neutral-950 py-4 text-white md:col-span-2">💾 บันทึกรับเข้า</Button>
        </form>
      </Card>

      {duplicatePrompt ? (
        <Modal
          title="พบรายการสินค้าที่อาจซ้ำกัน"
          subtitle="ตรวจสอบก่อนบันทึก เพื่อป้องกันสต็อคซ้ำหรือข้อมูลแยกผิดรายการ"
          onCancel={() => setDuplicatePrompt(null)}
          hideSave
          maxWidth="max-w-2xl"
        >
          <div className="space-y-5">
            <div className="rounded-[1.6rem] border border-amber-200 bg-gradient-to-br from-amber-50 to-pink-50 p-5 text-amber-900 shadow-sm">
              <div className="flex gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white text-2xl shadow-sm">⚠️</div>
                <div>
                  <p className="text-base font-black text-neutral-950">ระบบเจอสินค้าที่คล้ายกับรายการเดิม</p>
                  <p className="mt-1 text-sm leading-relaxed text-neutral-600">เหตุผล: <span className="font-black text-amber-800">{duplicatePrompt.reason}</span> ถ้าเป็นสินค้าตัวเดียวกัน ให้รวมเข้าสต็อคเดิม แต่ถ้าเป็นสินค้าคนละสูตร / คนละขนาด / คนละรุ่น ให้เพิ่มเป็นรายการใหม่</p>
                </div>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <div className="rounded-[1.35rem] border border-neutral-200 bg-white p-4 shadow-sm">
                <p className="text-xs font-black uppercase tracking-[0.08em] text-neutral-400">รายการเดิมในระบบ</p>
                <h4 className="mt-2 text-lg font-black text-neutral-950">{duplicatePrompt.product.name}</h4>
                <div className="mt-3 grid gap-2 text-sm text-neutral-600">
                  <div className="rounded-2xl bg-neutral-50 p-3"><span className="font-black text-neutral-700">SKU:</span> {duplicatePrompt.product.sku || '-'}</div>
                  <div className="rounded-2xl bg-neutral-50 p-3"><span className="font-black text-neutral-700">คงเหลือ:</span> {duplicatePrompt.product.stock} {duplicatePrompt.product.unit}</div>
                  <div className="rounded-2xl bg-neutral-50 p-3"><span className="font-black text-neutral-700">หมวดหมู่:</span> {duplicatePrompt.product.category}</div>
                </div>
              </div>

              <div className="rounded-[1.35rem] border border-pink-200 bg-pink-50 p-4 shadow-sm">
                <p className="text-xs font-black uppercase tracking-[0.08em] text-pink-500">รายการที่กำลังเพิ่ม</p>
                <h4 className="mt-2 text-lg font-black text-neutral-950">{duplicatePrompt.newProduct.name}</h4>
                <div className="mt-3 grid gap-2 text-sm text-neutral-600">
                  <div className="rounded-2xl bg-white p-3"><span className="font-black text-neutral-700">SKU:</span> {duplicatePrompt.newProduct.sku || '-'}</div>
                  <div className="rounded-2xl bg-white p-3"><span className="font-black text-neutral-700">จำนวนรับเข้า:</span> {duplicatePrompt.payload.qty} {duplicatePrompt.newProduct.unit}</div>
                  <div className="rounded-2xl bg-white p-3"><span className="font-black text-neutral-700">ต้นทุนรอบนี้:</span> {formatMoney(duplicatePrompt.payload.cost)}</div>
                </div>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <button type="button" className="rounded-[1.35rem] border border-pink-200 bg-neutral-950 p-5 text-left text-white shadow-lg transition hover:-translate-y-0.5 hover:shadow-xl active:scale-[0.98]" onClick={() => mergeIntoDuplicate(duplicatePrompt.product, duplicatePrompt.payload)}>
                <div className="text-xl font-black">รวมเข้าสต็อคเดิม</div>
                <p className="mt-2 text-sm leading-relaxed text-white/75">เลือกตัวนี้ถ้าเป็นสินค้าตัวเดียวกัน ระบบจะเพิ่มจำนวนเข้าในรายการเดิมและเก็บประวัติต้นทุนให้</p>
              </button>

              <button type="button" className="rounded-[1.35rem] border border-neutral-200 bg-white p-5 text-left text-neutral-950 shadow-sm transition hover:-translate-y-0.5 hover:bg-neutral-50 active:scale-[0.98]" onClick={addAsNewFromDuplicate}>
                <div className="text-xl font-black">เพิ่มเป็นสินค้าใหม่</div>
                <p className="mt-2 text-sm leading-relaxed text-neutral-500">เลือกตัวนี้ถ้าเป็นสินค้าคนละรุ่น คนละสูตร คนละขนาด หรือไม่ต้องการรวมกับรายการเดิม</p>
              </button>
            </div>
          </div>
        </Modal>
      ) : null}
    </>
  );
}

function IssueStockForm({ products, setProducts, setTransactions }) {
  const [productId, setProductId] = useState(products[0]?.id || '');
  const [quantity, setQuantity] = useState(1);
  const [issueDate, setIssueDate] = useState(todayInputValue());
  const [reason, setReason] = useState(outboundReasonOptions[0]);
  const [operatorName, setOperatorName] = useState('');
  const [note, setNote] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const selected = products.find((product) => product.id === productId);

  useEffect(() => {
    if (!productId && products[0]) setProductId(products[0].id);
    if (productId && !products.some((product) => product.id === productId)) setProductId(products[0]?.id || '');
  }, [productId, products]);

  function submit(event) {
    event.preventDefault();
    setSuccessMessage('');
    const qty = Math.max(0, toSafeNumber(quantity));
    if (!selected || qty <= 0) return window.alert('กรุณาเลือกสินค้าและกรอกจำนวนเบิกมากกว่า 0');
    if (selected.stock < qty) return window.alert('จำนวนเบิกมากกว่าสต็อคคงเหลือ');
    setProducts((prev) => prev.map((item) => item.id === selected.id ? { ...item, stock: item.stock - qty, updatedAt: nowIso() } : item));
    const detail = [reason, `วันที่เบิก: ${new Date(issueDate).toLocaleDateString('th-TH', { dateStyle: 'medium' })}`, operatorName ? `ผู้เบิก: ${operatorName}` : '', note ? `หมายเหตุ: ${note}` : ''].filter(Boolean).join(' | ');
    setTransactions((prev) => [{ id: createId(), productId: selected.id, productName: selected.name, type: 'out', quantity: qty, reason: detail, createdAt: isoFromDateInput(issueDate) }, ...prev]);
    setSuccessMessage(`บันทึกเบิก ${selected.name} จำนวน ${qty} ${selected.unit} เรียบร้อยแล้ว`);
    setQuantity(1);
    setOperatorName('');
    setNote('');
    setIssueDate(todayInputValue());
  }

  return (
    <Card className="p-4 md:p-6">
      <div className="mb-5"><h2 className="text-xl font-black text-neutral-950">🧾 บันทึกการเบิกสินค้า</h2><p className="mt-2 inline-flex rounded-full bg-amber-100 px-4 py-2 text-sm font-black text-amber-800">ใช้สำหรับตัดสต็อคออกเท่านั้น</p></div>
      {successMessage ? <div className="mb-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-black text-emerald-700">✅ {successMessage}</div> : null}
      <form onSubmit={submit} className="space-y-4">
        <Field label="เลือกสินค้า"><SelectInput value={productId} onChange={(e) => { setProductId(e.target.value); setSuccessMessage(''); }}>{products.map((item) => <option key={item.id} value={item.id}>{item.name} — คงเหลือ {item.stock} {item.unit}</option>)}</SelectInput></Field>
        {selected ? <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-4 text-sm text-neutral-600"><b className="text-neutral-950">{selected.name}</b><div>คงเหลือปัจจุบัน: {selected.stock} {selected.unit}</div><div>หลังเบิก: {Math.max(0, selected.stock - Math.max(0, toSafeNumber(quantity)))} {selected.unit}</div></div> : null}
        <Field label="วันที่เบิก"><TextInput type="date" value={issueDate} onChange={(e) => { setIssueDate(e.target.value); setSuccessMessage(''); }} /></Field>
        <Field label="จำนวนที่เบิก"><TextInput type="number" min="1" value={quantity} onChange={(e) => { setQuantity(e.target.value); setSuccessMessage(''); }} /></Field>
        <Field label="เหตุผลการเบิก"><SelectInput value={reason} onChange={(e) => { setReason(e.target.value); setSuccessMessage(''); }}>{outboundReasonOptions.map((item) => <option key={item}>{item}</option>)}</SelectInput></Field>
        <Field label="ผู้เบิก / ผู้ทำรายการ"><TextInput value={operatorName} onChange={(e) => { setOperatorName(e.target.value); setSuccessMessage(''); }} /></Field>
        <Field label="หมายเหตุเพิ่มเติม"><TextInput value={note} onChange={(e) => { setNote(e.target.value); setSuccessMessage(''); }} /></Field>
        <Button type="submit" className="w-full bg-neutral-950 text-white">บันทึกการเบิกสินค้า</Button>
      </form>
    </Card>
  );
}

function TransactionHistory({ transactions }) {
  return <Card className="p-4 md:p-6"><h2 className="text-xl font-black text-neutral-950">🕘 ประวัติการเคลื่อนไหว</h2><div className="mt-5 space-y-3">{transactions.slice(0, 12).map((item) => <div key={item.id} className="rounded-2xl border border-neutral-100 bg-white p-4"><div className="flex items-center justify-between"><b>{item.productName}</b>{item.quantity > 0 ? <span className="rounded-full bg-neutral-100 px-3 py-1 text-xs font-black">{item.type === 'out' ? '-' : '+'}{item.quantity}</span> : null}</div><p className="mt-1 text-sm text-neutral-500">{item.reason}</p><p className="mt-1 text-xs text-neutral-400">{new Date(item.createdAt).toLocaleString('th-TH', { dateStyle: 'medium', timeStyle: 'short' })}</p></div>)}{transactions.length === 0 ? <div className="rounded-2xl bg-white p-8 text-center text-neutral-500">ยังไม่มีประวัติรายการ</div> : null}</div></Card>;
}
