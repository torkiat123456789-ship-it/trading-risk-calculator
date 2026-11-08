// ===================================================
// Trading Risk Calculator — script.js
// คำนวณขนาด Lot จากเงินทุน, % ความเสี่ยง และ Stop Loss
// ===================================================

// ---------- 1) ดึง element จากหน้าเว็บ ----------
const form = document.getElementById("calcForm");
const balanceInput = document.getElementById("balance");
const riskInput = document.getElementById("riskPct");
const instrumentSelect = document.getElementById("instrument");
const pipValueField = document.getElementById("pipValueField");
const pipValueInput = document.getElementById("pipValue");
const slInput = document.getElementById("slPips");
const tpInput = document.getElementById("tpPips");
const errorBox = document.getElementById("error");
const chips = document.querySelectorAll(".chip");

const MIN_LOT = 0.01; // Lot เล็กที่สุดที่โบรกส่วนใหญ่ให้เปิด

// ---------- 2) ฟังก์ชันช่วยจัดรูปแบบตัวเลข ----------
function money(value) {
  return "$" + value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// ปัดลงทศนิยม 2 ตำแหน่ง (ปัดลงเพื่อไม่ให้เสี่ยงเกินที่ตั้งไว้)
function floorLot(value) {
  return Math.floor(value * 100 + 1e-9) / 100;
}

// ---------- 3) ฟังก์ชันคำนวณหลัก (ไม่ยุ่งกับหน้าเว็บ ทดสอบแยกได้) ----------
function calculateRisk(balance, riskPct, slPips, tpPips, pipValue) {
  const riskAmount = balance * (riskPct / 100);       // เงินที่ยอมเสียได้
  const rawLot = riskAmount / (slPips * pipValue);     // Lot ตามสูตร
  let lot = floorLot(rawLot);
  let tooSmall = false;

  if (lot < MIN_LOT) {        // ทุนน้อยเกินกว่าจะเปิด 0.01 Lot ได้
    lot = MIN_LOT;
    tooSmall = true;
  }

  const actualRisk = lot * slPips * pipValue;          // เสียจริงหลังปัด Lot
  const actualRiskPct = (actualRisk / balance) * 100;
  const profit = lot * tpPips * pipValue;              // กำไรถ้าถึง TP
  const rr = tpPips > 0 ? tpPips / slPips : 0;          // Risk:Reward

  return { riskAmount, lot, tooSmall, actualRisk, actualRiskPct, profit, rr };
}

// ---------- 4) แบ่งระดับความเสี่ยง ----------
function getRiskLevel(pct) {
  if (pct <= 1) return { cls: "safe", text: "ปลอดภัย", note: "เสี่ยงไม่เกิน 1% ต่อไม้ ตามหลักที่มืออาชีพนิยมใช้" };
  if (pct <= 2) return { cls: "normal", text: "ปกติ", note: "อยู่ในกรอบ 1–2% ที่ยอมรับได้" };
  if (pct <= 5) return { cls: "high", text: "เสี่ยงสูง", note: "แพ้ติดกันไม่กี่ไม้ พอร์ตจะลดลงเร็ว ควรลด % ความเสี่ยง" };
  return { cls: "danger", text: "อันตราย", note: "เสี่ยงเกิน 5% ต่อไม้ มีโอกาสพอร์ตแตกสูงมาก" };
}

// ---------- 5) ตรวจข้อมูลที่กรอก ----------
function validate(values) {
  // ล้างกรอบแดงเก่าออกก่อน
  document.querySelectorAll("input").forEach((el) => el.classList.remove("invalid"));

  const rules = [
    [balanceInput, values.balance > 0, "กรุณากรอกเงินทุนมากกว่า 0"],
    [riskInput, values.riskPct > 0 && values.riskPct <= 100, "ความเสี่ยงต้องอยู่ระหว่าง 0.01–100%"],
    [pipValueInput, values.pipValue > 0, "มูลค่าต่อ pip ต้องมากกว่า 0"],
    [slInput, values.slPips > 0, "Stop Loss ต้องมากกว่า 0 pips"],
    [tpInput, values.tpPips >= 0, "Take Profit ห้ามติดลบ (ใส่ 0 ถ้าไม่ตั้ง)"],
  ];

  for (const [input, ok, message] of rules) {
    if (!ok) {
      input.classList.add("invalid");
      return message;
    }
  }
  return null; // ไม่มีข้อผิดพลาด
}

// ---------- 6) อ่านค่าจากฟอร์ม ----------
function readValues() {
  const isCustom = instrumentSelect.value === "custom";
  return {
    balance: parseFloat(balanceInput.value),
    riskPct: parseFloat(riskInput.value),
    slPips: parseFloat(slInput.value),
    tpPips: tpInput.value === "" ? 0 : parseFloat(tpInput.value),
    pipValue: isCustom ? parseFloat(pipValueInput.value) : parseFloat(instrumentSelect.value),
  };
}

// ---------- 7) แสดงผลบนหน้าเว็บ ----------
function render() {
  const v = readValues();
  const error = validate(v);

  if (error) {
    errorBox.textContent = error;
    errorBox.hidden = false;
    return;
  }
  errorBox.hidden = true;

  const r = calculateRisk(v.balance, v.riskPct, v.slPips, v.tpPips, v.pipValue);
  const level = getRiskLevel(r.actualRiskPct);

  document.getElementById("lotOut").textContent = r.lot.toFixed(2);
  document.getElementById("riskAmtOut").textContent = money(r.riskAmount);
  document.getElementById("actualRiskOut").textContent = "-" + money(r.actualRisk);
  document.getElementById("profitOut").textContent = v.tpPips > 0 ? "+" + money(r.profit) : "ไม่ได้ตั้ง TP";
  document.getElementById("rrOut").textContent = v.tpPips > 0 ? "1 : " + r.rr.toFixed(2) : "—";

  const badge = document.getElementById("levelBadge");
  badge.className = "badge " + level.cls;
  document.getElementById("levelText").textContent =
    level.text + " · เสี่ยงจริง " + r.actualRiskPct.toFixed(2) + "%";

  let note = level.note;
  if (r.tooSmall) {
    note = "ทุนน้อยกว่าที่จะเปิดตาม % ที่ตั้งได้ แม้เปิดขั้นต่ำ 0.01 Lot ก็เสี่ยง " +
      r.actualRiskPct.toFixed(2) + "% · ลองเพิ่มทุนหรือลด Stop Loss";
  }
  document.getElementById("levelNote").textContent = note;

  renderStreak(v.balance, r.actualRiskPct);
  highlightChip(v.riskPct);
}

// ตาราง "ถ้าแพ้ติดกัน" — แต่ละไม้เสีย % เดิมของเงินที่เหลือ
function renderStreak(balance, riskPct) {
  const body = document.getElementById("streakBody");
  body.innerHTML = "";
  [3, 5, 10, 20].forEach((n) => {
    const left = balance * Math.pow(1 - riskPct / 100, n);
    const drop = (1 - left / balance) * 100;
    const row = document.createElement("tr");
    row.innerHTML = `<td>${n} ไม้</td><td>${money(Math.max(left, 0))}</td><td class="neg">-${Math.min(drop, 100).toFixed(1)}%</td>`;
    body.appendChild(row);
  });
}

function highlightChip(riskPct) {
  chips.forEach((chip) => chip.classList.toggle("active", parseFloat(chip.dataset.risk) === riskPct));
}

// ---------- 8) ผูก event ----------
form.addEventListener("submit", (e) => {
  e.preventDefault();
  render();
});

form.addEventListener("input", render); // คำนวณใหม่ทันทีเมื่อพิมพ์

instrumentSelect.addEventListener("change", () => {
  pipValueField.hidden = instrumentSelect.value !== "custom";
  render();
});

chips.forEach((chip) => {
  chip.addEventListener("click", () => {
    riskInput.value = chip.dataset.risk;
    render();
  });
});

document.getElementById("resetBtn").addEventListener("click", () => {
  balanceInput.value = 1000;
  riskInput.value = 1;
  instrumentSelect.value = "10";
  pipValueField.hidden = true;
  pipValueInput.value = 10;
  slInput.value = 50;
  tpInput.value = 100;
  render();
});

// คำนวณครั้งแรกตอนเปิดหน้า
render();
