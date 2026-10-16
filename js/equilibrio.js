let rows = [];
const $ = id => document.getElementById(id);
function statusOf(r) { const s = (r[11] || "").toLowerCase(); if (s.includes("necessidade")) return "need"; if (s.includes("excesso")) return "excess"; if (s === "ideal" || s.startsWith("ok.")) return "ideal"; return "neutral" }
function cleanNum(v) { const n = parseInt(String(v).replace(/[^\d-]/g, ""), 10); return Number.isFinite(n) ? n : 0 }
function actual(r) { return r[9] === "--" ? 0 : cleanNum(r[9]) }
function ideal(r) { return r[10] === "--" ? 0 : cleanNum(r[10]) }
function pill(r) { const s = statusOf(r); let cls = "pill-neutral"; if (s === "ideal") cls = "pill-ideal"; if (s === "need") cls = "pill-need"; if (s === "excess") cls = "pill-excess"; return `<span class="pill ${cls}">${esc(r[11])}</span>` }
function esc(s) { return String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])) }
function renderKpis() {
    const counts = CounterStatuses();
    const items = [["♬", "Instrumentos cadastrados", rows.length, "neutral"], ["✓", "Adequação ideal", counts.ideal, "ideal"], ["＋", "Necessidade de músicos", counts.need, "need"], ["↗", "Excesso de músicos", counts.excess, "excess"]];
    $("kpis").innerHTML = items.map(x => `<article class="kpi"><div class="kpi-icon">${x[0]}</div><div><div class="kpi-label">${x[1]}</div><div class="kpi-value">${x[2]}</div></div></article>`).join("");
}
function CounterStatuses() { return rows.reduce((a, r) => (a[statusOf(r)]++, a), { ideal: 0, need: 0, excess: 0, neutral: 0 }) }
function renderNaipes() {
    const groups = {};
    rows.forEach(r => { (groups[r[0]] ??= []).push(r) });
    const totalMusicians = rows.reduce((sum, r) => sum + actual(r), 0);
    $("naipes").innerHTML = Object.entries(groups).map(([name, list]) => {
        const c = list.reduce((a, r) => (a[statusOf(r)]++, a), { ideal: 0, need: 0, excess: 0, neutral: 0 });
        const total = list.length || 1;
        const musicians = list.reduce((sum, r) => sum + actual(r), 0);
        const percentage = totalMusicians > 0 ? (musicians / totalMusicians * 100) : 0;
        const percentageText = percentage.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
        return `<article class="naip-card">
   <div class="naip-head"><span>${esc(name)}</span><span class="naip-count">${list.length} ${list.length === 1 ? "instrumento" : "instrumentos"}</span></div>
   <div class="naip-participation">
    <div class="naip-participation-top"><div class="naip-musicians"><strong>${musicians.toLocaleString("pt-BR")}</strong> músicos atuais</div><div class="naip-percent">${percentageText}%</div></div>
    <div class="share-track" role="img" aria-label="${percentageText}% do total atual de músicos"><div class="share-fill" style="width:${Math.min(100, percentage)}%"></div></div>
    <div class="share-caption">Participação no total da orquestra (${totalMusicians.toLocaleString("pt-BR")} músicos)</div>
   </div>
   <div class="stats"><span class="ideal">${c.ideal} ideal</span><span class="need">${c.need} necessidade</span><span class="excess">${c.excess} excesso</span></div>
   <div class="bar" aria-label="Distribuição de instrumentos por adequação"><span class="b-ideal" style="width:${c.ideal / total * 100}%"></span><span class="b-need" style="width:${c.need / total * 100}%"></span><span class="b-excess" style="width:${c.excess / total * 100}%"></span><span class="b-neutral" style="width:${c.neutral / total * 100}%"></span></div>
  </article>`
    }).join("");
}
function renderFilters() { [...new Set(rows.map(r => r[0]))].sort().forEach(n => { $("filterNaipe").insertAdjacentHTML("beforeend", `<option value="${esc(n)}">${esc(n)}</option>`) }) }
function renderTable() {
    const q = $("search").value.trim().toLocaleLowerCase("pt-BR"), n = $("filterNaipe").value, s = $("filterStatus").value;
    const filtered = rows.filter(r => (!q || r.join(" ").toLocaleLowerCase("pt-BR").includes(q)) && (!n || r[0] === n) && (!s || statusOf(r) === s));
    $("tbody").innerHTML = filtered.map(r => `<tr><td>${esc(r[0])}</td><td class="instrument">${esc(r[1])}</td><td class="voice">${esc(r[2])}</td><td class="num">${esc(r[3])}</td><td class="num">${esc(r[4])}</td><td class="num">${esc(r[5])}</td><td class="num">${esc(r[6])}</td><td class="num">${esc(r[7])}</td><td class="num">${esc(r[8])}</td><td class="num">${esc(r[9])}</td><td class="num">${esc(r[10])}</td><td>${pill(r)}</td></tr>`).join("");
    $("empty").hidden = filtered.length !== 0; $("resultCount").textContent = `${filtered.length} de ${rows.length} instrumentos`; $("footerCount").textContent = `${filtered.length} registros exibidos`;
}
$("search").addEventListener("input", renderTable); $("filterNaipe").addEventListener("change", renderTable); $("filterStatus").addEventListener("change", renderTable);

function normalizeHeader(value) {
    return String(value ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toUpperCase().replace(/\s+/g, " ");
}
function cellText(value) {
    if (value === null || value === undefined || String(value).trim() === "") return "--";
    if (typeof value === "number") return Number.isInteger(value) ? String(value) : String(value).replace(".", ",");
    return String(value).trim();
}
function loadWorkbook(file) {
    if (!window.XLSX) {
        alert("Não foi possível carregar o leitor de Excel. Verifique sua conexão com a internet e tente novamente.");
        return;
    }
    const reader = new FileReader();
    reader.onload = function (event) {
        try {
            const workbook = XLSX.read(event.target.result, { type: "array" });
            const sheet = workbook.Sheets[workbook.SheetNames[0]];
            const matrix = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "", raw: true });
            const required = ["NAIPE", "INSTRUMENTOS", "VOZES", "GEM", "ENSAIO", "RJM", "RJM / ENSAIO", "CULTO OFICIAL", "OFICIALIZADOS", "TOTAL ATUAL", "TOTAL IDEAL", "ADEQUACAO"];
            let headerIndex = -1, headerMap = {};
            for (let i = 0; i < Math.min(matrix.length, 30); i++) {
                const normalized = matrix[i].map(normalizeHeader);
                const map = {};
                normalized.forEach((h, j) => { if (h) map[h] = j });
                if (required.every(h => Object.prototype.hasOwnProperty.call(map, h))) { headerIndex = i; headerMap = map; break; }
            }
            if (headerIndex < 0) {
                alert("Não encontrei todos os cabeçalhos esperados na primeira aba do Excel. Confira os 12 nomes das colunas.");
                return;
            }
            const newRows = [];
            for (let i = headerIndex + 1; i < matrix.length; i++) {
                const line = matrix[i];
                const naipe = cellText(line[headerMap["NAIPE"]]);
                const instrumento = cellText(line[headerMap["INSTRUMENTOS"]]);
                if (naipe === "--" && instrumento === "--") continue;
                newRows.push(required.map(h => cellText(line[headerMap[h]])));
            }
            if (!newRows.length) {
                alert("O arquivo foi aberto, mas não encontrei linhas de instrumentos abaixo do cabeçalho.");
                return;
            }
            rows = newRows;
            $("filterNaipe").innerHTML = '<option value="">Todos os naipes</option>';
            renderKpis(); renderNaipes(); renderFilters(); renderTable();
            $("reportDate").textContent = "Arquivo: " + file.name + " • " + new Date().toLocaleDateString("pt-BR");
        } catch (error) {
            console.error(error);
            alert("Não foi possível ler esse arquivo Excel. Confira se ele está válido e tente novamente.");
        }
    };
    reader.onerror = function () { alert("Erro ao abrir o arquivo selecionado.") };
    reader.readAsArrayBuffer(file);
}
$("excelFile").addEventListener("change", function (event) {
    const file = event.target.files && event.target.files[0];
    if (file) loadWorkbook(file);
});
$("reportDate").textContent = "Selecione o arquivo Excel para carregar os dados";
renderKpis(); renderNaipes(); renderFilters(); renderTable();