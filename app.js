(function () {
  "use strict";

  // --- Mock catalogs ---
  const PLC_CATALOG = [
    {
      family: "Siemens S7-1200",
      cpu: { name: "CPU 1211C", pn: "6ES7 211-1AE40-0XB0", di: 6, do: 4 },
      expansions: [
        { type: "DI", name: "SM 1221 8DI", pn: "6ES7 221-1BH32-0XB0", di: 8, do: 0 },
        { type: "DI", name: "SM 1221 16DI", pn: "6ES7 221-1BF32-0XB0", di: 16, do: 0 },
        { type: "DO", name: "SM 1222 8DO", pn: "6ES7 222-1BF32-0XB0", di: 0, do: 8 },
        { type: "DO", name: "SM 1222 16DO", pn: "6ES7 222-1HF32-0XB0", di: 0, do: 16 },
        { type: "DIDO", name: "SM 1223 8DI/8DO", pn: "6ES7 223-1PH32-0XB0", di: 8, do: 8 },
      ],
    },
    {
      family: "Siemens S7-1200",
      cpu: { name: "CPU 1212C", pn: "6ES7 212-1AE40-0XB0", di: 8, do: 6 },
      expansions: [
        { type: "DI", name: "SM 1221 8DI", pn: "6ES7 221-1BH32-0XB0", di: 8, do: 0 },
        { type: "DI", name: "SM 1221 16DI", pn: "6ES7 221-1BF32-0XB0", di: 16, do: 0 },
        { type: "DO", name: "SM 1222 8DO", pn: "6ES7 222-1BF32-0XB0", di: 0, do: 8 },
        { type: "DO", name: "SM 1222 16DO", pn: "6ES7 222-1HF32-0XB0", di: 0, do: 16 },
        { type: "DIDO", name: "SM 1223 8DI/8DO", pn: "6ES7 223-1PH32-0XB0", di: 8, do: 8 },
      ],
    },
    {
      family: "Siemens S7-1200",
      cpu: { name: "CPU 1214C", pn: "6ES7 214-1AG40-0XB0", di: 14, do: 10 },
      expansions: [
        { type: "DI", name: "SM 1221 8DI", pn: "6ES7 221-1BH32-0XB0", di: 8, do: 0 },
        { type: "DI", name: "SM 1221 16DI", pn: "6ES7 221-1BF32-0XB0", di: 16, do: 0 },
        { type: "DO", name: "SM 1222 8DO", pn: "6ES7 222-1BF32-0XB0", di: 0, do: 8 },
        { type: "DO", name: "SM 1222 16DO", pn: "6ES7 222-1HF32-0XB0", di: 0, do: 16 },
        { type: "DIDO", name: "SM 1223 8DI/8DO", pn: "6ES7 223-1PH32-0XB0", di: 8, do: 8 },
      ],
    },
  ];

  const POWER_SUPPLIES = [
    { name: "24VDC PSU 2.5A", pn: "PSU-24V-2.5A", outV: "24VDC", powerW: 60 },
    { name: "24VDC PSU 5A", pn: "PSU-24V-5A", outV: "24VDC", powerW: 120 },
    { name: "24VDC PSU 10A", pn: "PSU-24V-10A", outV: "24VDC", powerW: 240 },
    { name: "230VAC Control Transformer 100VA", pn: "XFMR-230-100VA", outV: "24VAC", powerW: 100 },
  ];

  const ENCLOSURES = [
    { name: "Steel IP54 300x300x150", pn: "ENC-STL-IP54-303015", ip: "IP54", material: "Steel", volume: 13.5 },
    { name: "Steel IP65 400x400x200", pn: "ENC-STL-IP65-404020", ip: "IP65", material: "Steel", volume: 32 },
    { name: "Stainless IP66 400x400x200", pn: "ENC-SS-IP66-404020", ip: "IP66", material: "Stainless Steel (304)", volume: 32 },
    { name: "Polycarbonate IP66 300x400x180", pn: "ENC-PC-IP66-304018", ip: "IP66", material: "Polycarbonate", volume: 21.6 },
    { name: "Steel IP67 500x500x250", pn: "ENC-STL-IP67-505025", ip: "IP67", material: "Steel", volume: 62.5 },
  ];

  const TERMINALS = [
    { name: "Terminal block, feed-through, 2.5mm²", pn: "TB-FT-2.5", unitQty: 1 },
    { name: "End clamp for DIN rail", pn: "EC-DIN", unitQty: 1 },
    { name: "DIN rail 35mm, 1m", pn: "DIN-35-1M", unitQty: 1 },
    { name: "Ground terminal, 2.5mm²", pn: "TB-GND-2.5", unitQty: 1 },
  ];

  // --- Utilities ---
  function clamp(min, val, max) {
    return Math.max(min, Math.min(max, val));
  }

  function computeModulePlan(requiredDI, requiredDO) {
    // Select a CPU that covers as much as possible
    const candidates = PLC_CATALOG
      .map(entry => ({
        family: entry.family,
        cpu: entry.cpu,
        expansions: entry.expansions,
        deficitDI: Math.max(0, requiredDI - entry.cpu.di),
        deficitDO: Math.max(0, requiredDO - entry.cpu.do),
      }))
      .sort((a, b) => (a.deficitDI + a.deficitDO) - (b.deficitDI + b.deficitDO));

    const base = candidates[0];
    let remainingDI = base.deficitDI;
    let remainingDO = base.deficitDO;

    const modules = [];

    function addBest(type, remaining) {
      if (remaining <= 0) return;
      // Greedy: pick the largest capacity of the requested type
      const pool = base.expansions
        .filter(m => (type === "DI" ? m.di > 0 : type === "DO" ? m.do > 0 : (m.di > 0 && m.do > 0)))
        .sort((m1, m2) => ((type === "DI") ? (m2.di - m1.di) : (type === "DO" ? (m2.do - m1.do) : ((m2.di + m2.do) - (m1.di + m1.do)))));

      while (remaining > 0 && pool.length > 0) {
        const pick = pool[0];
        modules.push(pick);
        if (type === "DI") remaining -= pick.di; else if (type === "DO") remaining -= pick.do; else { remaining -= Math.max(pick.di, pick.do); }
      }
    }

    addBest("DI", remainingDI);
    addBest("DO", remainingDO);

    // Count totals
    const totalDI = base.cpu.di + modules.reduce((acc, m) => acc + m.di, 0);
    const totalDO = base.cpu.do + modules.reduce((acc, m) => acc + m.do, 0);

    return { base, modules, totalDI, totalDO };
  }

  function estimatePowerBudget(voltage, di, doCount) {
    // Very rough mock power: CPU 10W, each module 3W, each DO load 0.1A @ 24V (2.4W)
    const baseW = 10;
    const moduleW = 3; // we will multiply by number of modules later
    const doLoadW = (voltage === "24VDC" ? doCount * 2.4 : 0);
    return { baseW, moduleW, doLoadW };
  }

  function selectPowerSupply(voltage, totalModules, doCount) {
    const { baseW, moduleW, doLoadW } = estimatePowerBudget(voltage, 0, doCount);
    const totalW = baseW + (totalModules * moduleW) + doLoadW;
    // Add 30% headroom
    const requiredW = totalW * 1.3;
    const candidates = POWER_SUPPLIES
      .filter(p => (voltage === "24VDC" ? p.outV === "24VDC" : p.outV === "24VAC"))
      .sort((a, b) => a.powerW - b.powerW);
    const chosen = candidates.find(p => p.powerW >= requiredW) || candidates[candidates.length - 1];
    return { chosen, requiredW: Math.ceil(requiredW) };
  }

  function selectEnclosure(ipRating, material, tempC, itemsCount) {
    const byFilter = ENCLOSURES
      .filter(e => e.ip === ipRating && e.material === material);
    const pool = byFilter.length > 0 ? byFilter : ENCLOSURES.filter(e => e.ip === ipRating);
    // naive size estimation by number of items
    const minVolume = Math.max(12, itemsCount * 4);
    const sorted = pool.sort((a, b) => a.volume - b.volume);
    const pick = sorted.find(e => e.volume >= minVolume) || sorted[sorted.length - 1];
    const tempNote = (tempC > 45) ? "Consider ventilation/derating above 45°C." : "";
    return { pick, tempNote };
  }

  function buildBOM(plan, voltage, enclosure) {
    const bom = [];
    const add = (name, pn, qty) => bom.push({ name, pn, qty });

    add(`${plan.base.cpu.name} CPU`, plan.base.cpu.pn, 1);
    const counts = {};
    plan.modules.forEach(m => {
      const key = m.pn;
      counts[key] = (counts[key] || { name: m.name, pn: m.pn, qty: 0 });
      counts[key].qty += 1;
    });
    Object.values(counts).forEach(entry => add(entry.name, entry.pn, entry.qty));

    // Power supply
    const totalModules = plan.modules.length;
    const estimatedDO = Math.max(0, plan.totalDO);
    const psu = selectPowerSupply(voltage, totalModules, estimatedDO);
    add(psu.chosen.name, psu.chosen.pn, 1);

    // Terminals (simplified estimation)
    const terminalQty = plan.totalDI + plan.totalDO + 10; // extra for power and spares
    add(TERMINALS[0].name, TERMINALS[0].pn, terminalQty);
    add(TERMINALS[3].name, TERMINALS[3].pn, 6);
    add(TERMINALS[1].name, TERMINALS[1].pn, 6);
    add(TERMINALS[2].name, TERMINALS[2].pn, 2);

    // Enclosure
    add(enclosure.pick.name, enclosure.pick.pn, 1);

    return bom;
  }

  function renderRecommendations(container, plan, voltage, enclosure, inputValues) {
    container.innerHTML = "";
    // compile module summary
    const moduleCountMap = {};
    for (const m of plan.modules) {
      const key = `${m.name} (${m.pn})`;
      moduleCountMap[key] = (moduleCountMap[key] || 0) + 1;
    }
    const moduleSummary = Object.entries(moduleCountMap).map(([k, v]) => `${k} x${v}`).join("; ") || "None";
    const items = [
      { title: "PLC Family", detail: plan.base.family },
      { title: "CPU", detail: `${plan.base.cpu.name} (${plan.base.cpu.pn})` },
      { title: "I/O Modules", detail: moduleSummary },
      { title: "I/O Capacity", detail: `DI ${plan.totalDI}, DO ${plan.totalDO}` },
      { title: "Operating voltage", detail: voltage },
      { title: "Enclosure", detail: `${enclosure.pick.name} (${enclosure.pick.pn})` },
      { title: "Notes", detail: [enclosure.tempNote, plan.totalDI < inputValues.numDI ? "DI under-provisioned" : "", plan.totalDO < inputValues.numDO ? "DO under-provisioned" : ""].filter(Boolean).join(" ") || "None" },
    ];

    for (const item of items) {
      const el = document.createElement("div");
      el.className = "rec-item";
      el.innerHTML = `<div class="rec-title">${item.title}</div><div class="rec-detail">${item.detail}</div>`;
      container.appendChild(el);
    }
  }

  function renderBOMTable(tbody, bom) {
    tbody.innerHTML = "";
    bom.forEach((row, idx) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `<td>${idx + 1}</td><td>${row.name}</td><td>${row.pn}</td><td>${row.qty}</td>`;
      tbody.appendChild(tr);
    });
  }

  function bomToCsv(bom) {
    const header = ["Item","Part name","Part number","Quantity"];
    const rows = bom.map((r, i) => [i + 1, r.name, r.pn, r.qty]);
    const all = [header, ...rows];
    return all.map(cols => cols.map(v => String(v).includes(',') || String(v).includes('"') ? '"' + String(v).replaceAll('"','""') + '"' : v).join(",")).join("\n");
  }

  function download(filename, text) {
    const link = document.createElement('a');
    link.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(text));
    link.setAttribute('download', filename);
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  function exportPdf(element, filename) {
    const opt = {
      margin: 10,
      filename,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };
    window.html2pdf().from(element).set(opt).save();
  }

  function getInputValues() {
    const numDI = clamp(0, parseInt(document.getElementById('numDI').value || '0', 10), 10000);
    const numDO = clamp(0, parseInt(document.getElementById('numDO').value || '0', 10), 10000);
    const voltage = document.getElementById('voltage').value;
    const ipRating = document.getElementById('ipRating').value;
    const material = document.getElementById('material').value;
    const temperature = parseFloat(document.getElementById('temperature').value || '25');
    return { numDI, numDO, voltage, ipRating, material, temperature };
  }

  function onGenerate(e) {
    e.preventDefault();
    const values = getInputValues();

    const plan = computeModulePlan(values.numDI, values.numDO);
    const enclosure = selectEnclosure(values.ipRating, values.material, values.temperature, 2 + plan.modules.length + 6);
    const bom = buildBOM(plan, values.voltage, enclosure);

    document.getElementById('designSection').classList.remove('hidden');
    renderRecommendations(document.getElementById('recommendations'), plan, values.voltage, enclosure, values);

    document.getElementById('bomSection').classList.remove('hidden');
    renderBOMTable(document.querySelector('#bomTable tbody'), bom);

    // attach handlers using closure state
    const csv = bomToCsv(bom);
    document.getElementById('exportCsv').onclick = () => download('bom.csv', csv);
    document.getElementById('copyCsv').onclick = async () => {
      try {
        await navigator.clipboard.writeText(csv);
        flashButton(document.getElementById('copyCsv'), 'Copied');
      } catch (err) {
        alert('Copy failed: ' + err.message);
      }
    };
    document.getElementById('exportPdf').onclick = () => {
      const clone = document.createElement('div');
      clone.innerHTML = `
        <h2 style="margin:0 0 8px 0; font-family: system-ui;">BOM</h2>
        <pre style="white-space: pre-wrap; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace;">${csv}</pre>
      `;
      exportPdf(clone, 'bom.pdf');
    };
  }

  function flashButton(btn, text) {
    const old = btn.textContent;
    btn.textContent = text;
    btn.disabled = true;
    setTimeout(() => { btn.textContent = old; btn.disabled = false; }, 900);
  }

  function onReset() {
    document.getElementById('specForm').reset();
    document.getElementById('designSection').classList.add('hidden');
    document.getElementById('bomSection').classList.add('hidden');
  }

  // Wire up
  document.getElementById('specForm').addEventListener('submit', onGenerate);
  document.getElementById('resetForm').addEventListener('click', onReset);
})();

