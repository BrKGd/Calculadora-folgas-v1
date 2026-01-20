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
  const { jsPDF } = window.jspdf;

  // ===== validações =====
  const dataInput = document.getElementById("dataFolga")?.value;
  const mesesSelect = document.getElementById("qtdMeses")?.value;
  const tipoEscalaRaw = document.getElementById("tipoEscala")?.value;

  if (!dataInput) return showToast("Selecione a data inicial da folga");
  if (!mesesSelect) return showToast("Selecione a quantidade de meses");
  if (!tipoEscalaRaw) return showToast("Selecione o tipo de escala");

  const qtdMeses = parseInt(mesesSelect, 10);
  if (!qtdMeses || qtdMeses < 1) return showToast("Quantidade de meses inválida");

  // ===== dados da escala (mesma regra do app) =====
  const dataBase = normalizarData(new Date(dataInput + "T00:00:00"));
  const hoje = normalizarData(new Date());

  const escalaCodigo = extrairCodigoEscala(tipoEscalaRaw);
  if (!escalaCodigo) return showToast("Tipo de escala inválido. Selecione novamente.");

  const escala = obterEscala(escalaCodigo);
  if (!escala) return showToast("Tipo de escala não reconhecido.");

  const { diasTrabalho, diasFolga } = escala;
  const ciclo = diasTrabalho + diasFolga;
  if (!ciclo) return showToast("Erro ao calcular a escala. Verifique o tipo selecionado.");

  const isFolga = (data) => {
    if (isFolgaFixa(data)) return true; // prioridade
    const diff = diasEntre(dataBase, data);
    const pos = mod(diff, ciclo);
    return pos < diasFolga;
  };

  // ===== título dinâmico =====
  const MESES = [
    "Janeiro","Fevereiro","Março","Abril","Maio","Junho",
    "Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"
  ];

  const dataFinal = new Date(dataBase);
  dataFinal.setMonth(dataFinal.getMonth() + (qtdMeses - 1));

  const mesInicio = MESES[dataBase.getMonth()];
  const anoInicio = dataBase.getFullYear();
  const mesFim = MESES[dataFinal.getMonth()];
  const anoFim = dataFinal.getFullYear();

  const tituloTexto =
    (anoInicio === anoFim)
      ? `Calendário de folgas de ${mesInicio} a ${mesFim} de ${anoInicio}`
      : `Calendário de folgas de ${mesInicio}/${anoInicio} a ${mesFim}/${anoFim}`;

  // ===== UI: evita travar / clique duplo =====
  const btn = document.getElementById("btnPDF");
  const oldText = btn?.textContent;
  if (btn) {
    btn.disabled = true;
    btn.style.opacity = "0.75";
    btn.textContent = "Gerando PDF...";
  }
  showToast("Gerando PDF...");

  // ===== PDF (leve) =====
  const doc = new jsPDF({ orientation: "p", unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();

  const margin = 8;
  const gutter = 3.2;

  // Cores (tema do app)
  const RED = { r: 198, g: 40, b: 40 };    // #c62828
  const RED_BG = { r: 253, g: 236, b: 234 }; // #fdecea
  const GREEN = { r: 46, g: 125, b: 50 };  // #2e7d32
  const GREEN_BG = { r: 232, g: 245, b: 233 }; // #e8f5e9
  const NEUTRAL_BG = { r: 245, g: 246, b: 248 }; // leve
  const BORDER = { r: 225, g: 227, b: 232 };
  const TEXT_GRAY = { r: 95, g: 99, b: 104 };

  // ===== helpers de desenho =====
  const setRGB = (c) => doc.setTextColor(c.r, c.g, c.b);
  const fillRGB = (c) => doc.setFillColor(c.r, c.g, c.b);
  const drawBorder = (c) => doc.setDrawColor(c.r, c.g, c.b);

  function drawCenteredText(text, x, y, maxW) {
    doc.text(text, x + maxW / 2, y, { align: "center" });
  }

  function drawMiniCalendar(x, y, cardW, cardH, year, monthIndex) {
    // Card
    drawBorder(BORDER);
    doc.setLineWidth(0.35);
    doc.roundedRect(x, y, cardW, cardH, 3, 3, "S");

    // ===== espaçamentos (ajustados) =====
    const padX = 4.0;
    const padTop = 5.0;

    const titleToWeek = 4.0;   // título -> cabeçalho
    const weekToLine = 2.2;    // cabeçalho -> linha
    const lineToGrid = 3.2;    // linha -> grid

    const gapX = 1.35;         // espaço entre células (X)
    const gapY = 1.35;         // espaço entre células (Y)

    // Título do mês
    const title = `${MESES[monthIndex]} de ${year}`;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    setRGB(RED);
    const titleY = y + padTop;
    drawCenteredText(title, x, titleY, cardW);

    // Cabeçalho D S T Q Q S S
    const weekLetters = ["D", "S", "T", "Q", "Q", "S", "S"];
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    setRGB(TEXT_GRAY);

    const weekY = titleY + titleToWeek;

    const gridX = x + padX;
    const gridW = cardW - padX * 2;

    const colW = gridW / 7;
    for (let i = 0; i < 7; i++) {
      const cx = gridX + colW * i + colW / 2;
      doc.text(weekLetters[i], cx, weekY, { align: "center" });
    }

    // Linha abaixo do cabeçalho
    const lineY = weekY + weekToLine;
    doc.setLineWidth(0.25);
    drawBorder(BORDER);
    doc.line(gridX, lineY, gridX + gridW, lineY);

    // Grid
    const gridY = lineY + lineToGrid;

    const bottomPad = 4.0;
    const gridH = (y + cardH - bottomPad) - gridY;

    const cellW = (gridW - gapX * 6) / 7;
    const cellH = (gridH - gapY * 5) / 6;

    const firstDay = new Date(year, monthIndex, 1);
    const lastDay = new Date(year, monthIndex + 1, 0).getDate();
    const startOffset = firstDay.getDay(); // 0=Dom ... 6=Sáb

    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);

    for (let d = 1; d <= lastDay; d++) {
      const idx = startOffset + (d - 1);
      const col = idx % 7;
      const row = Math.floor(idx / 7);

      const cx = gridX + col * (cellW + gapX);
      const cy = gridY + row * (cellH + gapY);

      const dateObj = normalizarData(new Date(year, monthIndex, d));
      const isToday = dateObj.getTime() === hoje.getTime();

      // passado neutro, hoje destaque, futuro colorido
      let bg = NEUTRAL_BG;
      let fg = TEXT_GRAY;

      if (isToday) {
        bg = { r: 255, g: 255, b: 255 };
        fg = RED;
      } else if (dateObj > hoje) {
        const folga = isFolga(dateObj);
        bg = folga ? GREEN_BG : RED_BG;
        fg = folga ? GREEN : RED;
      }

      // retângulo do dia
      fillRGB(bg);
      drawBorder(BORDER);
      doc.setLineWidth(0.25);
      doc.roundedRect(cx, cy, cellW, cellH, 2.2, 2.2, "FD");

      // destaque HOJE (borda vermelha + texto ajustado pra baixo)
      if (isToday) {
        doc.setLineWidth(0.6);
        drawBorder(RED);
        doc.roundedRect(cx, cy, cellW, cellH, 2.2, 2.2, "S");
      }

      // texto
      setRGB(fg);

      if (isToday) {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(5);

        // "Hoje" mais pra baixo (melhora leitura)
        doc.text("Hoje", cx + cellW / 2, cy + cellH * 0.38, { align: "center" });

        doc.setFont("helvetica");
        doc.setFontSize(6.5);
        doc.text(String(d), cx + cellW / 2, cy + cellH * 0.72, { align: "center" });
      } else {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(8);
        doc.text(String(d), cx + cellW / 2, cy + cellH * 0.63, { align: "center" });
      }
    }
  }

  // ===== layout: 3 colunas x 4 linhas (12 por página) =====
  const cols = 3;
  const rows = 4;
  const titleH = 14;

  // título
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  setRGB(RED);
  drawCenteredText(tituloTexto, 0, margin + 6, pageW);

  // área do grid
  const gridTop = margin + titleH;
  const gridAreaH = pageH - margin - gridTop;
  const gridAreaW = pageW - margin * 2;

  const cardW = (gridAreaW - gutter * (cols - 1)) / cols;
  const cardH = (gridAreaH - gutter * (rows - 1)) / rows;

  // desenha meses (paginando se passar de 12)
  let monthCursor = new Date(dataBase.getFullYear(), dataBase.getMonth(), 1);
  for (let i = 0; i < qtdMeses; i++) {
    const pageIndex = Math.floor(i / (cols * rows));
    const posInPage = i % (cols * rows);

    if (posInPage === 0 && pageIndex > 0) {
      doc.addPage();
      // repetir título em cada página
      doc.setFont("helvetica", "bold");
      doc.setFontSize(16);
      setRGB(RED);
      drawCenteredText(tituloTexto, 0, margin + 6, pageW);
    }

    const r = Math.floor(posInPage / cols);
    const c = posInPage % cols;

    const x = margin + c * (cardW + gutter);
    const y = gridTop + r * (cardH + gutter);

    drawMiniCalendar(x, y, cardW, cardH, monthCursor.getFullYear(), monthCursor.getMonth());

    monthCursor.setMonth(monthCursor.getMonth() + 1);
  }

  // ===== salvar =====
  const nomeArquivo = "calendario-folgas.pdf";
  doc.save(nomeArquivo);

  // ===== UI restore =====
  if (btn) {
    btn.disabled = false;
    btn.style.opacity = "";
    btn.textContent = oldText || "Exportar PDF";
  }
  showToast("PDF Gerado: " + nomeArquivo);
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
