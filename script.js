window.onload = () => {
  document.getElementById("btnExcel").classList.add("hidden");
  document.getElementById("btnPDF").classList.add("hidden");
};

/* ==================================================
   CONFIGURAÇÕES FIXAS
   ================================================== */

const DIAS_FIXOS_SEMANA = [];
const DIAS_FIXOS_MES = [];
const DATAS_FIXAS_PERSONALIZADAS = [];

const FERIADOS_NACIONAIS_FIXOS = {
  "01-01": "Confraternização Universal",
  "04-21": "Tiradentes",
  "05-01": "Dia do Trabalho",
  "09-07": "Independência do Brasil",
  "10-12": "Nossa Senhora Aparecida",
  "11-02": "Finados",
  "11-15": "Proclamação da República",
  "11-20": "Consciência Negra",
  "12-25": "Natal"
};

window.dadosEscala = [];

/* ==================================================
   FUNÇÃO PRINCIPAL
   ================================================== */

function calcular() {
  const dataInput = document.getElementById("dataFolga").value;
  const mesesSelect = document.getElementById("qtdMeses").value;
  const tipoEscalaRaw = document.getElementById("tipoEscala").value;

  const calendario = document.getElementById("calendario");
  const containerMeses = document.getElementById("cardsMeses");

  calendario.innerHTML = "";
  containerMeses.innerHTML = "";
  window.dadosEscala = [];

  if (!dataInput) return showToast("Selecione a data inicial da folga");
  if (!mesesSelect) return showToast("Selecione a quantidade de meses");
  if (!tipoEscalaRaw) return showToast("Selecione o tipo de escala");

  const meses = parseInt(mesesSelect, 10);
  const dataBase = normalizarData(new Date(dataInput + "T00:00:00"));
  const hoje = normalizarData(new Date());

  const codigo = extrairCodigoEscala(tipoEscalaRaw);
  const escala = obterEscala(codigo);
  if (!escala) return showToast("Escala inválida");

  const ciclo = escala.diasTrabalho + escala.diasFolga;

  const isFolga = (data) => {
    if (isFolgaFixa(data)) return true;
    const diff = diasEntre(dataBase, data);
    return mod(diff, ciclo) < escala.diasFolga;
  };

  for (let m = 0; m < meses; m++) {
    const dataMes = new Date(dataBase);
    dataMes.setMonth(dataBase.getMonth() + m);

    const ano = dataMes.getFullYear();
    const mes = dataMes.getMonth();
    const ultimoDia = new Date(ano, mes + 1, 0).getDate();

    const nomeMes = primeiraLetraMaiuscula(
      dataMes.toLocaleDateString("pt-BR", { month: "long", year: "numeric" })
    );

    const registroMes = { mes: nomeMes, dias: [] };
    const folgasFuturas = [];

    for (let d = 1; d <= ultimoDia; d++) {
      const data = normalizarData(new Date(ano, mes, d));
      if (data < hoje) continue;

      const tipo = isFolga(data) ? "Folga" : "Trabalho";
      const obs = getObsDia(data, tipo);

      registroMes.dias.push({
        data: data.toLocaleDateString("pt-BR"),
        dia: primeiraLetraMaiuscula(
          data.toLocaleDateString("pt-BR", { weekday: "long" })
        ),
        tipo,
        obs
      });

      if (tipo === "Folga") folgasFuturas.push({ data, obs });
    }

    if (registroMes.dias.length) window.dadosEscala.push(registroMes);
    if (!folgasFuturas.length) continue;

    const card = document.createElement("div");
    card.className = "mes-card";

    const header = document.createElement("div");
    header.className = "mes-header";
    header.innerHTML = `
      <span>Folgas de ${nomeMes}</span>
      <span class="mes-badge">${folgasFuturas.length}</span>
    `;

    const diasDiv = document.createElement("div");
    diasDiv.className = "mes-dias";
    diasDiv.innerHTML = folgasFuturas
      .map(f => `• ${formatar(f.data)} ${f.obs ? `(${f.obs})` : ""}`)
      .join("<br>");

    header.onclick = () => card.classList.toggle("ativo");

    card.appendChild(header);
    card.appendChild(diasDiv);
    containerMeses.appendChild(card);
  }

  for (let m = 0; m < meses; m++) {
    const d = new Date(dataBase);
    d.setMonth(dataBase.getMonth() + m);
    gerarCalendarioMes(d, hoje, calendario, isFolga);
  }

  document.getElementById("tituloFolgas").classList.remove("hidden");
  document.getElementById("cardsMeses").classList.remove("hidden");
  document.getElementById("tituloCalendario").classList.remove("hidden");
  document.getElementById("calendario").classList.remove("hidden");
  document.getElementById("btnExcel").classList.remove("hidden");
  document.getElementById("btnPDF").classList.remove("hidden");

  showToast("Escala calculada");
}

/* ==================================================
   CALENDÁRIO
   ================================================== */

function gerarCalendarioMes(dataMes, hoje, container, isFolga) {
  const ano = dataMes.getFullYear();
  const mes = dataMes.getMonth();
  const primeiroDia = new Date(ano, mes, 1).getDay();
  const ultimoDia = new Date(ano, mes + 1, 0).getDate();

  const bloco = document.createElement("div");
  bloco.className = "calendario-mes";
  bloco.innerHTML = `<h3>${primeiraLetraMaiuscula(
    dataMes.toLocaleDateString("pt-BR", { month: "long", year: "numeric" })
  )}</h3>`;

  const grid = document.createElement("div");
  grid.className = "calendario-grid";

  for (let i = 0; i < primeiroDia; i++) {
    grid.appendChild(document.createElement("div")).className = "dia vazio";
  }

  for (let d = 1; d <= ultimoDia; d++) {
    const data = normalizarData(new Date(ano, mes, d));
    const div = document.createElement("div");
    div.textContent = d;
    div.className = "dia";

    if (data.getTime() === hoje.getTime()) {
      div.classList.add("hoje");
    } else if (data > hoje) {
      div.classList.add(isFolga(data) ? "folga" : "trabalho");
    }

    grid.appendChild(div);
  }

  bloco.appendChild(grid);
  container.appendChild(bloco);
}

/* ==================================================
   EXPORTAR CSV (EXCEL)
   ================================================== */

function exportarExcel() {
  if (!window.dadosEscala.length) {
    showToast("Calcule a escala primeiro");
    return;
  }

  let csv = "\uFEFFMês;Dia da semana;Data;Tipo;Observação\n";

  window.dadosEscala.forEach(mes => {
    mes.dias.forEach(d => {
      csv += `${mes.mes};${d.dia};${d.data};${d.tipo};${d.obs || ""}\n`;
    });
  });

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = "escala-folgas.csv";
  link.click();

  showToast("CSV exportado");
}

/* Exportar PDF */
   function exportarPDF() {
    const btnPDF = document.getElementById("btnPDF");
  
    const calendario = document.getElementById("calendario");
    if (!calendario || calendario.classList.contains("hidden")) {
      showToast("Calcule a escala antes de exportar");
      return;
    }
  
    // Evita duplo clique
    btnPDF.disabled = true;
    const oldText = btnPDF.textContent;
    btnPDF.textContent = "Gerando PDF...";
  
    setTimeout(() => {
      try {
        const { jsPDF } = window.jspdf;
        const pdf = new jsPDF("p", "mm", "a4");
  
        const pageW = 210;
        const pageH = 297;
  
        // ===== TÍTULO DINÂMICO =====
        const dataInicialStr = document.getElementById("dataFolga").value;
        const qtdMeses = parseInt(document.getElementById("qtdMeses").value, 10);
  
        const mesesNomes = [
          "Janeiro","Fevereiro","Março","Abril","Maio","Junho",
          "Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"
        ];
  
        const dataInicial = new Date(dataInicialStr + "T00:00:00");
        const dataFinal = new Date(dataInicial);
        dataFinal.setMonth(dataFinal.getMonth() + (qtdMeses - 1));
  
        const titulo =
          dataInicial.getFullYear() === dataFinal.getFullYear()
            ? `Calendário de folgas de ${mesesNomes[dataInicial.getMonth()]} a ${mesesNomes[dataFinal.getMonth()]} de ${dataFinal.getFullYear()}`
            : `Calendário de folgas de ${mesesNomes[dataInicial.getMonth()]}/${dataInicial.getFullYear()} a ${mesesNomes[dataFinal.getMonth()]}/${dataFinal.getFullYear()}`;
  
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(13);
        pdf.setTextColor(198, 40, 40);
        pdf.text(titulo, pageW / 2, 12, { align: "center" });
  
        // ===== PEGAR MESES DO DOM (mais fiel ao app) =====
        const mesesDOM = Array.from(calendario.querySelectorAll(".calendario-mes")).slice(0, 12);
        if (!mesesDOM.length) {
          showToast("Calendário não encontrado para exportar");
          btnPDF.disabled = false;
          btnPDF.textContent = oldText;
          return;
        }
  
        // ===== GRID 3x4 (ocupando a página) =====
        const cols = 3;
        const rows = 4;
  
        const marginX = 6;        // menor margem
        const topY = 16;          // área do título já usada
        const marginBottom = 6;
        const gap = 2;            // espaço entre cards
  
        const usableH = pageH - topY - marginBottom;
        const usableW = pageW - marginX * 2;
  
        const cardW = (usableW - gap * (cols - 1)) / cols;
        const cardH = (usableH - gap * (rows - 1)) / rows;
  
        // ===== FUNÇÃO DESENHAR UM MINI CALENDÁRIO (7x6) =====
        const drawMiniCalendar = (x, y, w, h, tituloMes, cells) => {
          // Card (bem discreto)
          pdf.setDrawColor(230);
          pdf.setLineWidth(0.3);
          pdf.roundedRect(x, y, w, h, 2, 2);
        
          // Título do mês
          pdf.setFont("helvetica", "bold");
          pdf.setFontSize(9);
          pdf.setTextColor(198, 40, 40);
          pdf.text(tituloMes, x + w / 2, y + 5.2, { align: "center" });
        
          // ===== CABEÇALHO DOS DIAS (D S T Q Q S S) =====
          const diasCab = ["D", "S", "T", "Q", "Q", "S", "S"];
        
          const pad = 1.6;
        
          // Ajustes finos de layout do card
          const headerY = y + 8.2;        // linha do cabeçalho
          const gridTop = y + 10.0;       // grid começa abaixo do cabeçalho
          const gridH = h - 11.2;         // altura restante pro grid (6 linhas)
          const gridW = w - pad * 2;
        
          const cellW = gridW / 7;
          const cellH = gridH / 6;
        
          // Linha do cabeçalho
          pdf.setFont("helvetica", "bold");
          pdf.setFontSize(6.2);
          pdf.setTextColor(120, 120, 120);
        
          for (let c = 0; c < 7; c++) {
            const cx = x + pad + c * cellW;
            pdf.text(diasCab[c], cx + cellW / 2, headerY, { align: "center" });
          }
        
          // Pequena linha separadora (bem leve)
          pdf.setDrawColor(235);
          pdf.setLineWidth(0.25);
          pdf.line(x + pad, headerY + 1.3, x + w - pad, headerY + 1.3);
        
          // ===== GRID 7x6 =====
          pdf.setFont("helvetica", "bold");
          pdf.setFontSize(6);
        
          for (let i = 0; i < 42; i++) {
            const r = Math.floor(i / 7);
            const c = i % 7;
        
            const cx = x + pad + c * cellW;
            const cy = gridTop + r * cellH;
        
            const cell = cells[i];
            const isVazio = cell.classList.contains("vazio");
            const isHoje = cell.classList.contains("hoje");
            const isFolga = cell.classList.contains("folga");
            const isTrabalho = cell.classList.contains("trabalho");
        
            if (isVazio) continue;
        
            if (isHoje) {
              pdf.setDrawColor(198, 40, 40);
              pdf.setLineWidth(0.6);
              pdf.roundedRect(cx + 0.25, cy + 0.2, cellW - 0.5, cellH - 0.4, 1.3, 1.3);
              pdf.setLineWidth(0.3);
              pdf.setDrawColor(230);
              pdf.setTextColor(198, 40, 40);
            } else if (isFolga) {
              pdf.setFillColor(232, 245, 233);
              pdf.setTextColor(46, 125, 50);
              pdf.roundedRect(cx + 0.25, cy + 0.2, cellW - 0.5, cellH - 0.4, 1.3, 1.3, "F");
            } else if (isTrabalho) {
              pdf.setFillColor(253, 236, 234);
              pdf.setTextColor(183, 28, 28);
              pdf.roundedRect(cx + 0.25, cy + 0.2, cellW - 0.5, cellH - 0.4, 1.3, 1.3, "F");
            } else {
              pdf.setFillColor(245, 245, 245);
              pdf.setTextColor(120, 120, 120);
              pdf.roundedRect(cx + 0.25, cy + 0.2, cellW - 0.5, cellH - 0.4, 1.3, 1.3, "F");
            }
        
            const diaTxt = String(cell.textContent || "").trim();
            pdf.text(diaTxt, cx + cellW / 2, cy + cellH / 2 + 1.2, { align: "center" });
        
            if (isHoje) {
              pdf.setFontSize(5.8);
              pdf.text("Hoje", cx + cellW / 2, cy + 2.7, { align: "center" });
              pdf.setFontSize(6);
            }
          }
        };        
  
        // ===== DESENHAR OS 12 CARDS =====
        mesesDOM.forEach((mesEl, idx) => {
          const col = idx % cols;
          const row = Math.floor(idx / cols);
  
          const x = marginX + col * (cardW + gap);
          const y = topY + row * (cardH + gap);
  
          const tituloMes = (mesEl.querySelector("h3")?.textContent || "").trim();
          const cells = Array.from(mesEl.querySelectorAll(".calendario-grid .dia"));
  
          // Garante 42 células (7x6). Se tiver menos, completa com vazios.
          while (cells.length < 42) {
            const fake = document.createElement("div");
            fake.className = "dia vazio";
            fake.textContent = "";
            cells.push(fake);
          }
  
          drawMiniCalendar(x, y, cardW, cardH, tituloMes, cells);
        });
  
        pdf.save("calendario-folgas.pdf");
        showToast("PDF gerado com sucesso");
      } catch (e) {
        console.error(e);
        showToast("Erro ao gerar PDF");
      } finally {
        btnPDF.disabled = false;
        btnPDF.textContent = oldText;
      }
    }, 60);
  }
   
/* Toast */
function showToast(msg) {
  let t = document.querySelector(".toast");
  if (!t) {
    t = document.createElement("div");
    t.className = "toast";
    document.body.appendChild(t);
  }
  t.textContent = msg;
  t.classList.add("show");
  setTimeout(() => t.classList.remove("show"), 3000);
}

/* ==================================================
   UTILITÁRIOS
   ================================================== */

function obterEscala(c) {
  return {
    "6x1": { diasTrabalho: 6, diasFolga: 1 },
    "5x2": { diasTrabalho: 5, diasFolga: 2 },
    "6x2": { diasTrabalho: 6, diasFolga: 2 },
    "4x2": { diasTrabalho: 4, diasFolga: 2 },
    "12x36": { diasTrabalho: 1, diasFolga: 1 }
  }[c];
}

function extrairCodigoEscala(v) {
  const m = String(v).match(/(\d+\s*x\s*\d+)/);
  return m ? m[1].replace(/\s/g, "") : "";
}

function normalizarData(d) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function diasEntre(a, b) {
  return Math.floor((b - a) / 86400000);
}

function mod(n, m) {
  return ((n % m) + m) % m;
}

function formatar(d) {
  return d.toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  });
}

function primeiraLetraMaiuscula(t) {
  return t.charAt(0).toUpperCase() + t.slice(1);
}

function isFolgaFixa(data) {
  const key = mmdd(data);
  return (
    FERIADOS_NACIONAIS_FIXOS[key] ||
    DATAS_FIXAS_PERSONALIZADAS.includes(key) ||
    DIAS_FIXOS_MES.includes(data.getDate()) ||
    DIAS_FIXOS_SEMANA.includes(data.getDay())
  );
}

function getObsDia(data, tipo) {
  if (tipo !== "Folga") return "";
  const key = mmdd(data);
  return FERIADOS_NACIONAIS_FIXOS[key] || "";
}

function mmdd(d) {
  return String(d.getMonth() + 1).padStart(2, "0") + "-" +
         String(d.getDate()).padStart(2, "0");
}
