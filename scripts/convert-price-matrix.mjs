import fs from "node:fs";

const inputPath = process.argv[2];
if (!inputPath) {
  console.error("Usage: node scripts/convert-price-matrix.mjs <input.csv>");
  process.exit(1);
}

const raw = fs.readFileSync(inputPath, "utf8").replace(/^\uFEFF/, "");
const lines = raw.split(/\r?\n/).filter((l) => l.trim().length > 0);

const delim = lines[0].includes("\t") ? "\t" : ",";
const cells = (line) => line.split(delim).map((c) => c.trim());

const headers = cells(lines[0]).map((h) => h.toLowerCase());
const idx = (name) => headers.indexOf(name.toLowerCase());
const productIdx = idx("Product Name") ?? idx("product name");
const serviceIdx = idx("Service");
const uomIdx = idx("UOM");
const priceIdx = idx("Price");
if (productIdx < 0 || serviceIdx < 0 || priceIdx < 0) {
  console.error("Header row must contain: Product Name, Service, UOM, Price");
  process.exit(1);
}

const rows = lines.slice(1).map(cells).filter((r) => r[productIdx]);
const bracket = (name) => {
  const m = name.match(/\[([^\]]+)\]/);
  return m ? m[1].trim() : "General";
};
const baseName = (name, service) => {
  const trailing = name.match(/\(([^)]*)\)\s*$/);
  if (trailing && trailing[1].trim().toLowerCase() === service.trim().toLowerCase()) {
    return name.slice(0, trailing.index).trim();
  }
  return name.trim();
};

const serviceMap = new Map();
const productMap = new Map();
const skipped = [];

for (const r of rows) {
  const productName = r[productIdx];
  const service = r[serviceIdx] ?? "";
  const uom = r[uomIdx] ?? "";
  const price = Number(r[priceIdx]);
  if (!productName || !service || Number.isNaN(price)) {
    skipped.push(productName || "<blank>");
    continue;
  }
  const type = bracket(productName);
  const skey = `${service.toLowerCase()}::${type.toLowerCase()}`;
  const cur = serviceMap.get(skey);
  serviceMap.set(skey, {
    name: service,
    type,
    price: cur ? Math.max(cur.price, price) : price,
  });

  const base = baseName(productName, service);
  const pkey = base.toLowerCase();
  const pcur = productMap.get(pkey);
  productMap.set(pkey, {
    name: base,
    unit: pcur ? pcur.unit : uom,
    price: pcur ? Math.max(pcur.price, price) : price,
  });
}

const q = (v) => `"${String(v).replace(/"/g, '""')}"`;
const servicesLines = headers.includes("service") && headers.includes("product type")
  ? []
  : ["Name,Product Type,Price,Active"];
const productsLines = ["Name,Unit,Price,Active"];

for (const s of [...serviceMap.values()].sort((a, b) => a.name.localeCompare(b.name) || a.type.localeCompare(b.type))) {
  servicesLines.push([q(s.name), q(s.type), s.price.toFixed(2), "true"].join(","));
}
for (const p of [...productMap.values()].sort((a, b) => a.name.localeCompare(b.name))) {
  productsLines.push([q(p.name), q(p.unit), p.price.toFixed(2), "true"].join(","));
}

fs.writeFileSync("services-import.csv", "\uFEFF" + servicesLines.join("\r\n"), "utf8");
fs.writeFileSync("products-import.csv", "\uFEFF" + productsLines.join("\r\n"), "utf8");

console.log(`Parsed ${rows.length} rows (${skipped.length} skipped: ${skipped.slice(0, 5).join(", ")}...)`);
console.log(`Services: ${serviceMap.size} -> services-import.csv`);
console.log(`Products: ${productMap.size} -> products-import.csv`);