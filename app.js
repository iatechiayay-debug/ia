// High-level mock catalog for PLCs, modules, PSUs, terminals, and enclosures
const MOCK_CATALOG = {
  plcFamilies: [
    {
      familyName: 'Siemens S7-1200',
      cpus: [
        { model: 'CPU 1211C AC/DC/Relay', part: '6ES7 211-1BE40-0XB0', baseDI: 6, baseDO: 4, supply: 'AC' },
        { model: 'CPU 1212C DC/DC/DC', part: '6ES7 212-1AE40-0XB0', baseDI: 8, baseDO: 6, supply: 'DC' },
        { model: 'CPU 1214C DC/DC/DC', part: '6ES7 214-1AG40-0XB0', baseDI: 14, baseDO: 10, supply: 'DC' },
        { model: 'CPU 1215C DC/DC/DC', part: '6ES7 215-1AG40-0XB0', baseDI: 14, baseDO: 10, supply: 'DC' }
      ],
      diModules: [
        { model: 'SM 1221 8DI', part: '6ES7 221-1BF32-0XB0', di: 8 },
        { model: 'SM 1221 16DI', part: '6ES7 221-1BH32-0XB0', di: 16 }
      ],
      doModules: [
        { model: 'SM 1222 8DO (transistor)', part: '6ES7 222-1BF32-0XB0', do: 8 },
        { model: 'SM 1222 16DO (transistor)', part: '6ES7 222-1BH32-0XB0', do: 16 }
      ]
    }
  ],
  powerSupplies: [
    { model: 'Sitop PSU100C 24V/2.5A', part: '6EP1331-5BA10', output: '24VDC', current: 2.5 },
    { model: 'Sitop PSU100C 24V/4A', part: '6EP1332-5BA10', output: '24VDC', current: 4 },
    { model: 'Sitop PSU100C 24V/10A', part: '6EP1336-2BA10', output: '24VDC', current: 10 }
  ],
  terminalsPerSignal: 1.0,
  terminalBlock: { model: 'Weidmüller A-Series Terminal', part: 'A 2C 2.5', perPack: 50 },
  enclosures: [
    { model: 'Rittal AE Compact', part: 'AE 1032.500', material: 'Painted Steel', ip: 'IP66', width: 400, height: 400, depth: 200 },
    { model: 'Rittal AE Compact', part: 'AE 1033.500', material: 'Painted Steel', ip: 'IP66', width: 600, height: 600, depth: 250 },
    { model: 'Hoffman PolyLine', part: 'APL664', material: 'Polycarbonate', ip: 'IP66', width: 600, height: 600, depth: 250 },
    { model: 'Hygienic SS Enclosure', part: 'SS304-404020', material: 'Stainless Steel 304', ip: 'IP66', width: 400, height: 400, depth: 200 }
  ]
};

function selectCpuForSignals(requiredDi, requiredDo, operatingVoltage) {
  const family = MOCK_CATALOG.plcFamilies[0];
  // Prefer DC supply CPUs for 24VDC systems
  const preferDc = operatingVoltage === '24VDC';
  const sorted = [...family.cpus].sort((a, b) => (a.baseDI + a.baseDO) - (b.baseDI + b.baseDO));
  let candidate = sorted.find(cpu => cpu.baseDI >= requiredDi && cpu.baseDO >= requiredDo && (!preferDc || cpu.supply === 'DC'));
  if (!candidate) {
    // Allow supply mismatch if needed
    candidate = sorted.find(cpu => cpu.baseDI >= requiredDi && cpu.baseDO >= requiredDo);
  }
  // Fallback largest
  return candidate || sorted[sorted.length - 1];
}

function selectIoModules(family, requiredDi, requiredDo, cpu) {
  const extraDi = Math.max(0, requiredDi - cpu.baseDI);
  const extraDo = Math.max(0, requiredDo - cpu.baseDO);

  const diMods = [];
  let diRemaining = extraDi;
  const diSorted = [...family.diModules].sort((a, b) => b.di - a.di);
  while (diRemaining > 0) {
    const pick = diSorted.find(m => m.di <= diRemaining) || diSorted[diSorted.length - 1];
    diMods.push(pick);
    diRemaining -= pick.di;
  }

  const doMods = [];
  let doRemaining = extraDo;
  const doSorted = [...family.doModules].sort((a, b) => b.do - a.do);
  while (doRemaining > 0) {
    const pick = doSorted.find(m => m.do <= doRemaining) || doSorted[doSorted.length - 1];
    doMods.push(pick);
    doRemaining -= pick.do;
  }

  return { diMods, doMods };
}

function estimateLoadCurrentA(requiredDi, requiredDo, operatingVoltage) {
  // Simple mock: 10 mA per DI (sensor power) if 24VDC, 50 mA per DO (load driver) at 24VDC, else treat as 0 for AC
  if (operatingVoltage === '24VDC') {
    const diMa = requiredDi * 10;
    const doMa = requiredDo * 50;
    const plcOverheadMa = 250; // CPU + comms
    return (diMa + doMa + plcOverheadMa) / 1000.0;
  }
  // If AC panel, still provide a 24VDC PSU for I/O electronics with base 1.0A
  return 1.0;
}

function selectPsuForCurrent(currentA) {
  const sorted = [...MOCK_CATALOG.powerSupplies].sort((a, b) => a.current - b.current);
  return sorted.find(psu => psu.current >= currentA) || sorted[sorted.length - 1];
}

function selectEnclosure(ip, material, estimatedFootprintU) {
  const filtered = MOCK_CATALOG.enclosures.filter(e => e.ip === ip && e.material === material);
  // naive selection by area and estimated footprint
  const withArea = filtered.map(e => ({...e, area: e.width * e.height}));
  const sorted = withArea.sort((a, b) => a.area - b.area);
  // For v1: just return the smallest available matching enclosure
  return sorted[0] || MOCK_CATALOG.enclosures[0];
}

function buildBom(items) {
  return items.map((it, idx) => ({ index: idx + 1, ...it }));
}

function toCsv(bom) {
  const headers = ['Index', 'Item', 'Part Number', 'Quantity', 'Notes'];
  const rows = bom.map(r => [r.index, r.item, r.partNumber, r.quantity, r.notes ?? '']);
  const all = [headers, ...rows];
  return all.map(cols => cols.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
}

function download(filename, mimeType, content) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function exportTableToPdf() {
  // Lightweight PDF using print() flow for V1: open a print-friendly window
  const printHtml = document.getElementById('resultsSection').outerHTML;
  const w = window.open('', 'PRINT', 'height=600,width=900');
  if (!w) return;
  w.document.write('<html><head><title>BOM</title>');
  w.document.write('<style>body{font-family:Arial, sans-serif} table{width:100%;border-collapse:collapse} th,td{border:1px solid #aaa;padding:6px;text-align:left} thead th{background:#eee;}</style>');
  w.document.write('</head><body>');
  w.document.write(printHtml);
  w.document.write('</body></html>');
  w.document.close();
  w.focus();
  w.print();
  w.close();
}

function renderSummary(container, selection) {
  const { cpu, io, psu, enclosure, inputs } = selection;
  const summary = [
    `PLC: ${cpu.model} (${cpu.part})`,
    io.diMods.length ? `DI Modules: ${io.diMods.map(m=>`${m.model} (${m.part})`).join(', ')}` : 'DI Modules: none',
    io.doMods.length ? `DO Modules: ${io.doMods.map(m=>`${m.model} (${m.part})`).join(', ')}` : 'DO Modules: none',
    `Power Supply: ${psu.model} (${psu.part})`,
    `Enclosure: ${enclosure.model} ${enclosure.width}x${enclosure.height}x${enclosure.depth} (${enclosure.part})`,
    `Inputs: DI ${inputs.numDi}, DO ${inputs.numDo}, Voltage ${inputs.operatingVoltage}, IP ${inputs.ipRating}, Material ${inputs.enclosureMaterial}, Temp ${inputs.ambientTempC ?? '—'}°C`
  ];
  container.innerHTML = `<ul>${summary.map(s=>`<li>${s}</li>`).join('')}</ul>`;
}

function generateBom(inputs) {
  const family = MOCK_CATALOG.plcFamilies[0];
  const cpu = selectCpuForSignals(inputs.numDi, inputs.numDo, inputs.operatingVoltage);
  const io = selectIoModules(family, inputs.numDi, inputs.numDo, cpu);
  const loadCurrentA = estimateLoadCurrentA(inputs.numDi, inputs.numDo, inputs.operatingVoltage);
  const psu = selectPsuForCurrent(loadCurrentA * 1.5); // 50% headroom

  // Simple terminal count: DI + DO + 10% spare, round up
  const terminalQty = Math.ceil((inputs.numDi + inputs.numDo) * 1.1 * MOCK_CATALOG.terminalsPerSignal);
  const terminalPacks = Math.ceil(terminalQty / MOCK_CATALOG.terminalBlock.perPack);

  // Enclosure footprint heuristic: units based on components count
  const estimatedU = 1 + io.diMods.length + io.doMods.length;
  const enclosure = selectEnclosure(inputs.ipRating, inputs.enclosureMaterial, estimatedU);

  const bomItems = [];
  bomItems.push({ item: `PLC ${cpu.model}`, partNumber: cpu.part, quantity: 1, notes: 'Base CPU' });
  io.diMods.forEach(m => bomItems.push({ item: m.model, partNumber: m.part, quantity: 1, notes: 'DI expansion' }));
  io.doMods.forEach(m => bomItems.push({ item: m.model, partNumber: m.part, quantity: 1, notes: 'DO expansion' }));
  bomItems.push({ item: psu.model, partNumber: psu.part, quantity: 1, notes: '24VDC control power' });
  bomItems.push({ item: `${MOCK_CATALOG.terminalBlock.model}`, partNumber: MOCK_CATALOG.terminalBlock.part, quantity: terminalPacks, notes: `${terminalQty} total terminals (approx.)` });
  bomItems.push({ item: `${enclosure.model} ${enclosure.width}x${enclosure.height}x${enclosure.depth}`, partNumber: enclosure.part, quantity: 1, notes: `${enclosure.material}, ${enclosure.ip}` });

  // Optional accessories
  bomItems.push({ item: 'DIN Rail 35mm', partNumber: 'DIN-35-1M', quantity: 2, notes: '1 m each' });
  bomItems.push({ item: 'Circuit Breaker 2A DC', partNumber: 'CB-2A-DC', quantity: 1, notes: 'For PSU primary' });

  return { cpu, io, loadCurrentA, psu, enclosure, bom: buildBom(bomItems) };
}

function renderBomTable(tbody, bom) {
  tbody.innerHTML = '';
  for (const row of bom) {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${row.index}</td>
      <td>${row.item}</td>
      <td>${row.partNumber}</td>
      <td>${row.quantity}</td>
      <td>${row.notes ?? ''}</td>
    `;
    tbody.appendChild(tr);
  }
}

function serializeForm(form) {
  const data = new FormData(form);
  const numDi = Number(data.get('numDi')) || 0;
  const numDo = Number(data.get('numDo')) || 0;
  const operatingVoltage = String(data.get('operatingVoltage') || '');
  const ipRating = String(data.get('ipRating') || '');
  const enclosureMaterial = String(data.get('enclosureMaterial') || '');
  const ambientTempC = data.get('ambientTempC');
  return {
    numDi, numDo, operatingVoltage, ipRating, enclosureMaterial,
    ambientTempC: ambientTempC === null || ambientTempC === '' ? undefined : Number(ambientTempC)
  };
}

function onReady() {
  const form = document.getElementById('spec-form');
  const results = document.getElementById('resultsSection');
  const tbody = document.querySelector('#bomTable tbody');
  const summaryDiv = document.getElementById('recommendationSummary');
  const exportCsvBtn = document.getElementById('exportCsvBtn');
  const exportPdfBtn = document.getElementById('exportPdfBtn');
  const copyCsvBtn = document.getElementById('copyCsvBtn');
  const resetBtn = document.getElementById('resetBtn');

  let lastBom = null;
  let lastInputs = null;

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const inputs = serializeForm(form);
    lastInputs = inputs;
    const selection = generateBom(inputs);
    lastBom = selection.bom;

    renderSummary(summaryDiv, { ...selection, inputs });
    renderBomTable(tbody, lastBom);
    results.classList.remove('hidden');
    exportCsvBtn.disabled = false;
    exportPdfBtn.disabled = false;
    copyCsvBtn.disabled = false;
  });

  exportCsvBtn.addEventListener('click', () => {
    if (!lastBom) return;
    const csv = toCsv(lastBom);
    const title = 'bom_' + new Date().toISOString().replace(/[:.]/g, '-');
    download(`${title}.csv`, 'text/csv;charset=utf-8', csv);
  });

  exportPdfBtn.addEventListener('click', () => {
    exportTableToPdf();
  });

  copyCsvBtn.addEventListener('click', async () => {
    if (!lastBom) return;
    const csv = toCsv(lastBom);
    try {
      await navigator.clipboard.writeText(csv);
      copyCsvBtn.textContent = 'Copied!';
      setTimeout(() => (copyCsvBtn.textContent = 'Copy CSV'), 1200);
    } catch (err) {
      alert('Copy failed.');
    }
  });

  resetBtn.addEventListener('click', () => {
    form.reset();
    results.classList.add('hidden');
    exportCsvBtn.disabled = true;
    exportPdfBtn.disabled = true;
    copyCsvBtn.disabled = true;
    tbody.innerHTML = '';
    summaryDiv.innerHTML = '';
    lastBom = null;
    lastInputs = null;
  });
}

document.addEventListener('DOMContentLoaded', onReady);

