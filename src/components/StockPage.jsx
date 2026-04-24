import React, { useEffect, useState } from 'react';
import { outboundReasonOptions } from '../data/constants.js';
import { Button, Card, Field, SelectInput, TextArea, TextInput } from './ui.jsx';
import { createCostRecord, createId, createProduct, findDuplicateProduct, formatMoney, nowIso, toSafeNumber } from '../lib/inventory.js';

export default function StockPage({ products, setProducts, setTransactions, setCostHistory }) {
  return (
    <div className="space-y-8">
      <section className="grid gap-6 xl:grid-cols-[1.25fr_0.75fr]">
        <ProductReceiveForm products={products} setProducts={setProducts} setTransactions={setTransactions} setCostHistory={setCostHistory} />
        <IssueStockForm products={products} setProducts={setProducts} setTransactions={setTransactions} />
      </section>
      <TransactionHistory transactions={[]} />
    </div>
  );
}

function ProductReceiveForm({ products, setProducts, setTransactions, setCostHistory }) {
  const emptyForm = { name: '', sku: '', category: 'แชมพู / ทรีตเมนต์', productType: 'สินค้าใช้แล้วหมดไป', purchaseQuantity: 0, minStock: 5, unit: 'ชิ้น', cost: 0, supplier: '', invoiceNo: '', note: '' };
  const [mode, setMode] = useState('new');
  const [existingId, setExistingId] = useState(products[0]?.id || '');
  const [form, setForm] = useState(emptyForm);

  useEffect(() => {
    if (!existingId && products[0]) setExistingId(products[0].id);
  }, [existingId, products]);

  const selected = products.find((product) => product.id === existingId);
  const update = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  function receiveExisting(payload) {
    if (!selected) return;
    setProducts((prev) => prev.map((item) => item.id === selected.id ? {
      ...item,
      stock: toSafeNumber(item.stock) + payload.qty,
      cost: payload.cost || item.cost,
      supplier: payload.supplier || item.supplier,
      updatedAt: nowIso(),
    } : item));
    setCostHistory((prev) => [createCostRecord({ productId: selected.id, productName: selected.name, quantity: payload.qty, unitCost: payload.cost, supplier: payload.supplier, invoiceNo: payload.invoiceNo, note: payload.note }), ...prev]);
    setTransactions((prev) => [{ id: createId(), productId: selected.id, productName: selected.name, type: 'in', quantity: payload.qty, reason: `รับเข้าสินค้าเดิม | ต้นทุน ${formatMoney(payload.cost)}`, createdAt: nowIso() }, ...prev]);
  }

  function addNewProduct(payload) {
    const product = createProduct({ ...form, name: form.name.trim(), stock: payload.qty, cost: payload.cost });
    const duplicate = findDuplicateProduct(products, form);
    if (duplicate && !window.confirm(`พบสินค้าที่อาจซ้ำ: ${duplicate.product.name}\nต้องการเพิ่มเป็นสินค้าใหม่แยกต่างหากหรือไม่?`)) return;
    setProducts((prev) => [product, ...prev]);
    setCostHistory((prev) => [createCostRecord({ productId: product.id, productName: product.name, quantity: payload.qty, unitCost: payload.cost, supplier: form.supplier, invoiceNo: form.invoiceNo, note: form.note }), ...prev]);
    setTransactions((prev) => [{ id: createId(), productId: product.id, productName: product.name, type: 'in', quantity: payload.qty, reason: `เพิ่มสินค้าใหม่พร้อมจำนวนซื้อเข้า ต้นทุน ${formatMoney(payload.cost)}`, createdAt: nowIso() }, ...prev]);
  }

  function submit(event) {
    event.preventDefault();
    const qty = Math.max(0, toSafeNumber(form.purchaseQuantity));
    const cost = Math.max(0, toSafeNumber(form.cost));
    if (qty <= 0) return window.alert('กรุณากรอกจำนวนซื้อเข้ามากกว่า 0');
    const payload = { qty, cost, supplier: form.supplier, invoiceNo: form.invoiceNo, note: form.note };
    if (mode === 'existing') {
      if (!selected) return window.alert('กรุณาเลือกสินค้าเดิม');
      receiveExisting(payload);
    } else {
      if (!form.name.trim()) return window.alert('กรุณากรอกชื่อสินค้า');
      addNewProduct(payload);
    }
    setForm(emptyForm);
  }

  return (
    <Card className="p-4 md:p-6">
      <div className="mb-5"><h2 className="text-xl font-black text-neutral-950">รับเข้า / เพิ่มสินค้า</h2><p className="text-sm text-neutral-500">ของเข้าให้บันทึกที่ส่วนนี้ เพื่อเก็บต้นทุนและซัพพลายเออร์</p></div>
      <div className="mb-5 grid grid-cols-2 gap-2 rounded-3xl bg-neutral-100 p-2">
        <button type="button" onClick={() => setMode('new')} className={`rounded-2xl px-3 py-3 text-sm font-black ${mode === 'new' ? 'bg-neutral-950 text-white' : 'text-neutral-600'}`}>เพิ่มสินค้าใหม่</button>
        <button type="button" onClick={() => setMode('existing')} className={`rounded-2xl px-3 py-3 text-sm font-black ${mode === 'existing' ? 'bg-neutral-950 text-white' : 'text-neutral-600'}`}>รับเข้าสินค้าเดิม</button>
      </div>
      <form onSubmit={submit} className="grid gap-4 md:grid-cols-2">
        {mode === 'existing' ? (
          <Field label="เลือกสินค้าเดิม" className="md:col-span-2"><SelectInput value={existingId} onChange={(e) => setExistingId(e.target.value)}>{products.map((item) => <option key={item.id} value={item.id}>{item.name} — คงเหลือ {item.stock} {item.unit}</option>)}</SelectInput></Field>
        ) : (
          <>
            <Field label="ชื่อสินค้า" className="md:col-span-2"><TextInput value={form.name} onChange={(e) => update('name', e.target.value)} /></Field>
            <Field label="รหัสสินค้า / SKU"><TextInput value={form.sku} onChange={(e) => update('sku', e.target.value)} /></Field>
            <Field label="หมวดหมู่"><TextInput value={form.category} onChange={(e) => update('category', e.target.value)} /></Field>
            <Field label="ประเภทสินค้า"><TextInput value={form.productType} onChange={(e) => update('productType', e.target.value)} /></Field>
            <Field label="หน่วย"><TextInput value={form.unit} onChange={(e) => update('unit', e.target.value)} /></Field>
            <Field label="แจ้งเตือนขั้นต่ำ"><TextInput type="number" min="0" value={form.minStock} onChange={(e) => update('minStock', e.target.value)} /></Field>
          </>
        )}
        <Field label="จำนวนซื้อเข้า"><TextInput type="number" min="0" value={form.purchaseQuantity} onChange={(e) => update('purchaseQuantity', e.target.value)} /></Field>
        <Field label="ต้นทุนต่อหน่วยรอบนี้"><TextInput type="number" min="0" value={form.cost} onChange={(e) => update('cost', e.target.value)} /></Field>
        <Field label="ซัพพลายเออร์"><TextInput value={form.supplier} onChange={(e) => update('supplier', e.target.value)} /></Field>
        <Field label="เลขที่บิล / ใบเสร็จ"><TextInput value={form.invoiceNo} onChange={(e) => update('invoiceNo', e.target.value)} /></Field>
        <Field label="หมายเหตุ" className="md:col-span-2"><TextArea value={form.note} onChange={(e) => update('note', e.target.value)} /></Field>
        <Button type="submit" className="bg-neutral-950 py-4 text-white md:col-span-2">💾 บันทึกรับเข้า</Button>
      </form>
    </Card>
  );
}

function IssueStockForm({ products, setProducts, setTransactions }) {
  const [productId, setProductId] = useState(products[0]?.id || '');
  const [quantity, setQuantity] = useState(1);
  const [reason, setReason] = useState(outboundReasonOptions[0]);
  const [operatorName, setOperatorName] = useState('');
  const [note, setNote] = useState('');
  const selected = products.find((product) => product.id === productId);

  useEffect(() => {
    if (!productId && products[0]) setProductId(products[0].id);
  }, [productId, products]);

  function submit(event) {
    event.preventDefault();
    const qty = Math.max(0, toSafeNumber(quantity));
    if (!selected || qty <= 0) return window.alert('กรุณาเลือกสินค้าและกรอกจำนวนเบิกมากกว่า 0');
    if (selected.stock < qty) return window.alert('จำนวนเบิกมากกว่าสต็อคคงเหลือ');
    setProducts((prev) => prev.map((item) => item.id === selected.id ? { ...item, stock: item.stock - qty, updatedAt: nowIso() } : item));
    const detail = [reason, operatorName ? `ผู้เบิก: ${operatorName}` : '', note ? `หมายเหตุ: ${note}` : ''].filter(Boolean).join(' | ');
    setTransactions((prev) => [{ id: createId(), productId: selected.id, productName: selected.name, type: 'out', quantity: qty, reason: detail, createdAt: nowIso() }, ...prev]);
    setQuantity(1);
    setOperatorName('');
    setNote('');
  }

  return (
    <Card className="p-4 md:p-6">
      <div className="mb-5"><h2 className="text-xl font-black text-neutral-950">🧾 บันทึกการเบิกสินค้า</h2><p className="mt-2 inline-flex rounded-full bg-amber-100 px-4 py-2 text-sm font-black text-amber-800">ใช้สำหรับตัดสต็อคออกเท่านั้น</p></div>
      <form onSubmit={submit} className="space-y-4">
        <Field label="เลือกสินค้า"><SelectInput value={productId} onChange={(e) => setProductId(e.target.value)}>{products.map((item) => <option key={item.id} value={item.id}>{item.name} — คงเหลือ {item.stock} {item.unit}</option>)}</SelectInput></Field>
        {selected ? <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-4 text-sm text-neutral-600"><b className="text-neutral-950">{selected.name}</b><div>คงเหลือปัจจุบัน: {selected.stock} {selected.unit}</div><div>หลังเบิก: {Math.max(0, selected.stock - Math.max(0, toSafeNumber(quantity)))} {selected.unit}</div></div> : null}
        <Field label="จำนวนที่เบิก"><TextInput type="number" min="1" value={quantity} onChange={(e) => setQuantity(e.target.value)} /></Field>
        <Field label="เหตุผลการเบิก"><SelectInput value={reason} onChange={(e) => setReason(e.target.value)}>{outboundReasonOptions.map((item) => <option key={item}>{item}</option>)}</SelectInput></Field>
        <Field label="ผู้เบิก / ผู้ทำรายการ"><TextInput value={operatorName} onChange={(e) => setOperatorName(e.target.value)} /></Field>
        <Field label="หมายเหตุเพิ่มเติม"><TextInput value={note} onChange={(e) => setNote(e.target.value)} /></Field>
        <Button type="submit" className="w-full bg-neutral-950 text-white">บันทึกการเบิกสินค้า</Button>
      </form>
    </Card>
  );
}

function TransactionHistory({ transactions }) {
  return <Card className="p-4 md:p-6"><h2 className="text-xl font-black text-neutral-950">🕘 ประวัติการเคลื่อนไหว</h2><div className="mt-5 space-y-3">{transactions.slice(0, 12).map((item) => <div key={item.id} className="rounded-2xl border border-neutral-100 bg-white p-4"><div className="flex items-center justify-between"><b>{item.productName}</b>{item.quantity > 0 ? <span className="rounded-full bg-neutral-100 px-3 py-1 text-xs font-black">{item.type === 'out' ? '-' : '+'}{item.quantity}</span> : null}</div><p className="mt-1 text-sm text-neutral-500">{item.reason}</p></div>)}</div></Card>;
}
