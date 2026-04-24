import { categoryOptions, productTypeOptions, unitOptions } from '../data/constants.js';

export function createId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function nowIso() {
  return new Date().toISOString();
}

export function toSafeNumber(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

export function normalizeText(value) {
  return String(value || '').trim().replace(/[ ]+/g, ' ').toLowerCase();
}

export function formatMoney(value) {
  return new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB', maximumFractionDigits: 0 }).format(toSafeNumber(value));
}

export function formatNumber(value) {
  return new Intl.NumberFormat('th-TH', { maximumFractionDigits: 2 }).format(toSafeNumber(value));
}

export function createProduct(data = {}) {
  return {
    id: data.id || createId(),
    name: data.name || '',
    sku: data.sku || '',
    category: data.category || categoryOptions[0],
    productType: data.productType || productTypeOptions[0],
    stock: Math.max(0, toSafeNumber(data.stock)),
    unit: data.unit || unitOptions[0],
    minStock: Math.max(0, toSafeNumber(data.minStock, 5)),
    cost: Math.max(0, toSafeNumber(data.cost)),
    supplier: data.supplier || '',
    note: data.note || '',
    updatedAt: data.updatedAt || nowIso(),
  };
}

export function createCostRecord(data = {}) {
  return {
    id: data.id || createId(),
    productId: data.productId || '',
    productName: data.productName || '',
    quantity: Math.max(0, toSafeNumber(data.quantity)),
    unitCost: Math.max(0, toSafeNumber(data.unitCost)),
    supplier: data.supplier || '',
    invoiceNo: data.invoiceNo || '',
    note: data.note || '',
    createdAt: data.createdAt || nowIso(),
  };
}

export const sampleProducts = [
  createProduct({ name: 'แชมพู Keratin Smooth', sku: 'SH-KER-001', category: 'แชมพู / ทรีตเมนต์', productType: 'สินค้าใช้แล้วหมดไป', stock: 18, unit: 'ขวด', minStock: 6, cost: 220, supplier: 'Beauty Supply Bangkok', note: 'ใช้สำหรับงานสระไดร์และขายหน้าร้าน' }),
  createProduct({ name: 'ครีมย้อมผม Ash Brown', sku: 'HC-ASH-005', category: 'เคมีทำสี / ยืด / ดัด', productType: 'สินค้าใช้แล้วหมดไป', stock: 8, unit: 'กล่อง', minStock: 10, cost: 120, supplier: 'Pro Hair Color', note: 'สีขายดี ควรเช็คทุกสัปดาห์' }),
  createProduct({ name: 'ผ้าคลุมตัดผม Premium', sku: 'EQ-CAPE-010', category: 'อุปกรณ์ทำผม', productType: 'อุปกรณ์ใช้ระยะยาว', stock: 12, unit: 'ชิ้น', minStock: 4, cost: 180, supplier: 'Salon Tools', note: 'อุปกรณ์ใช้ในร้าน' }),
];

export const sampleCostHistory = sampleProducts.map((product) => createCostRecord({
  productId: product.id,
  productName: product.name,
  quantity: product.stock,
  unitCost: product.cost,
  supplier: product.supplier,
  invoiceNo: 'DEMO-001',
  note: 'ข้อมูลตัวอย่างเริ่มต้น',
  createdAt: product.updatedAt,
}));

export function normalizeProducts(products) {
  return Array.isArray(products) ? products.map((item) => createProduct(item)) : sampleProducts;
}

export function normalizeCostHistory(records) {
  return Array.isArray(records) ? records.map((item) => createCostRecord(item)) : sampleCostHistory;
}

export function findDuplicateProduct(products, form) {
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

export function getSupplierStats(records) {
  const suppliers = records.map((record) => String(record.supplier || '').trim()).filter(Boolean);
  const uniqueSuppliers = Array.from(new Set(suppliers));
  const sortedRecords = [...records].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  return {
    latestSupplier: sortedRecords.find((record) => String(record.supplier || '').trim())?.supplier || '',
    supplierCount: uniqueSuppliers.length,
  };
}

export function getCostStats(records) {
  const validRecords = records.filter((item) => toSafeNumber(item.quantity) > 0 && toSafeNumber(item.unitCost) >= 0);
  if (validRecords.length === 0) {
    return { latestCost: 0, averageCost: 0, minCost: 0, maxCost: 0, totalQty: 0, totalValue: 0 };
  }

  const totalQty = validRecords.reduce((sum, item) => sum + toSafeNumber(item.quantity), 0);
  const totalValue = validRecords.reduce((sum, item) => sum + toSafeNumber(item.quantity) * toSafeNumber(item.unitCost), 0);
  const sorted = [...validRecords].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  const costs = validRecords.map((item) => toSafeNumber(item.unitCost));

  return {
    latestCost: toSafeNumber(sorted[0]?.unitCost),
    averageCost: totalQty > 0 ? totalValue / totalQty : 0,
    minCost: Math.min(...costs),
    maxCost: Math.max(...costs),
    totalQty,
    totalValue,
  };
}

export function getEstimatedUnitCost(product, costHistory) {
  const costStats = getCostStats(costHistory.filter((record) => record.productId === product.id));
  return costStats.averageCost || costStats.latestCost || product.cost || 0;
}

export function getReorderSuggestions(products, costHistory) {
  return products
    .filter((product) => toSafeNumber(product.stock) <= toSafeNumber(product.minStock))
    .map((product) => {
      const minStock = Math.max(0, toSafeNumber(product.minStock));
      const currentStock = Math.max(0, toSafeNumber(product.stock));
      const targetStock = Math.max(minStock * 2, minStock + 1);
      const suggestQty = Math.max(1, targetStock - currentStock);
      const unitCost = getEstimatedUnitCost(product, costHistory);
      const supplierInfo = getSupplierStats(costHistory.filter((record) => record.productId === product.id));
      return {
        ...product,
        suggestQty,
        unitCost,
        estimatedCost: suggestQty * unitCost,
        latestSupplier: supplierInfo.latestSupplier || product.supplier || '-',
      };
    })
    .sort((a, b) => b.estimatedCost - a.estimatedCost);
}

export function isCurrentMonth(dateValue) {
  const date = new Date(dateValue);
  const now = new Date();
  return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth();
}
