window.onload = () => {
  document.getElementById("btnExcel").classList.add("hidden");
  document.getElementById("btnPDF").classList.add("hidden");
};

/* ==================================================
   DIAS FIXOS + FERIADOS (BRASIL)
   ================================================== */

/**
 * Dias fixos da semana (0=Domingo ... 6=Sábado)
 * Ex.: [0] -> todo Domingo é folga fixa
 */
const DIAS_FIXOS_SEMANA = []; // exemplo: [0, 6]

/**
 * Dias fixos do mês (1..31)
 * Ex.: [5, 20] -> todo dia 5 e 20 é folga fixa
 */
const DIAS_FIXOS_MES = []; // exemplo: [5, 20]

/**
 * Datas fixas personalizadas no formato "MM-DD"
 * Ex.: ["02-02", "07-13"]
 */
const DATAS_FIXAS_PERSONALIZADAS = [];

/**
 * Feriados nacionais fixos por lei (MM-DD -> Nome)
 * Lei 662/1949 (com redação atual) + Lei 14.759/2023 (20/11).
 */
const FERIADOS_NACIONAIS_FIXOS = {
  "01-01": "Confraternização Universal",
  "04-21": "Tiradentes",
  "05-01": "Dia do Trabalho",
  "09-07": "Independência do Brasil",
  "10-12": "Nossa Senhora Aparecida",
  "11-02": "Finados",
  "11-15": "Proclamação da República",
  "11-20": "Dia Nacional de Zumbi e da Consciência Negra",
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
  
  document.getElementById("tituloFolgas").classList.add("hidden");
  document.getElementById("cardsMeses").classList.add("hidden");
  document.getElementById("tituloCalendario").classList.add("hidden");
  document.getElementById("calendario").classList.add("hidden");

  calendario.innerHTML = "";
  containerMeses.innerHTML = "";
  window.dadosEscala = [];

  // Validações (toast)
  if (!dataInput) return showToast("Selecione a data inicial da folga");
  if (!mesesSelect) return showToast("Selecione a quantidade de meses");
  if (!tipoEscalaRaw) return showToast("Selecione o tipo de escala");

  const meses = parseInt(mesesSelect, 10);
  const dataBase = normalizarData(new Date(dataInput + "T00:00:00"));
  const hoje = normalizarData(new Date());

  // Extrai código (resolve caso o value venha "6x2 – blabla")
  const escalaCodigo = extrairCodigoEscala(tipoEscalaRaw);
  if (!escalaCodigo) return showToast("Tipo de escala inválido. Selecione novamente.");

  const escala = obterEscala(escalaCodigo);
  if (!escala) return showToast("Tipo de escala não reconhecido.");

  const { diasTrabalho, diasFolga } = escala;
  const ciclo = diasTrabalho + diasFolga;
  if (!ciclo) return showToast("Erro ao calcular a escala. Verifique o tipo selecionado.");

  const isFolga = (data) => {
    // 1) folga fixa (semana/mes/data/feriado) tem prioridade
    if (isFolgaFixa(data)) return true;

    // 2) senão, segue a escala
    const diff = diasEntre(dataBase, data);
    const pos = mod(diff, ciclo);
    return pos < diasFolga;
  };

  /* ===============================
     CARDS + DADOS PARA EXPORTAÇÃO
     - Exportação: de hoje em diante
     - Cards: só folgas futuras (data > hoje)
     =============================== */
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
        dia: primeiraLetraMaiuscula(data.toLocaleDateString("pt-BR", { weekday: "long" })),
        tipo,
        obs
      });

      if (data > hoje && tipo === "Folga") {
        folgasFuturas.push({ data, obs });
      }
    }

    if (registroMes.dias.length) window.dadosEscala.push(registroMes);
    if (!folgasFuturas.length) continue;

    // Card por mês (accordion)
    const card = document.createElement("div");
    card.className = "mes-card";

    const header = document.createElement("div");
    header.className = "mes-header";
    header.innerHTML = `
      <span>Folgas De ${nomeMes}</span>
      <span><span class="mes-badge">${folgasFuturas.length}</span> ▼</span>
    `;

    const diasDiv = document.createElement("div");
    diasDiv.className = "mes-dias";
    diasDiv.innerHTML = folgasFuturas.map(item => {
      const linha = primeiraLetraMaiuscula(formatar(item.data));
      const tag = item.obs ? ` <span class="tag-motivo">(${primeiraLetraMaiuscula(item.obs)})</span>` : "";
      return `<div class="dia-item"><span>• ${linha}${tag}</span></div>`;
    }).join("");

    header.onclick = () => {
      document.querySelectorAll(".mes-card").forEach(c => { if (c !== card) c.classList.remove("ativo"); });
      card.classList.toggle("ativo");
    };

    card.appendChild(header);
    card.appendChild(diasDiv);
    containerMeses.appendChild(card);
  }

  /* ===============================
     CALENDÁRIO
     - passado neutro
     - hoje: branco com borda vermelha
     - futuro: trabalho/folga
     =============================== */
  for (let m = 0; m < meses; m++) {
    const dataMes = new Date(dataBase);
    dataMes.setMonth(dataBase.getMonth() + m);
    gerarCalendarioMes(dataMes, hoje, calendario, isFolga);
  }
  
  document.getElementById("tituloFolgas").classList.remove("hidden");
  document.getElementById("cardsMeses").classList.remove("hidden");
  document.getElementById("tituloCalendario").classList.remove("hidden");
  document.getElementById("calendario").classList.remove("hidden");
  document.getElementById("btnExcel").classList.remove("hidden");
  document.getElementById("btnPDF").classList.remove("hidden");

  document.getElementById("cardsMeses").classList.add("fade-in");
  document.getElementById("calendario").classList.add("fade-in");
  // MOSTRAR BOTÕES DE EXPORTAÇÃO (APÓS CALCULAR)
  const btnExcel = document.getElementById("btnExcel");
  const btnPDF = document.getElementById("btnPDF");

  btnExcel.classList.remove("hidden");
  btnPDF.classList.remove("hidden");

  btnExcel.classList.add("fade-in");
  btnPDF.classList.add("fade-in");
  showToast("Escala Calculada");
}

/* ==================================================
   CALENDÁRIO
   ================================================== */
function gerarCalendarioMes(dataMes, hoje, container, isFolgaFn) {
  const ano = dataMes.getFullYear();
  const mes = dataMes.getMonth();

  const primeiroDia = new Date(ano, mes, 1);
  const ultimoDia = new Date(ano, mes + 1, 0).getDate();

  const bloco = document.createElement("div");
  bloco.className = "calendario-mes";

  bloco.innerHTML = `<h3>${primeiraLetraMaiuscula(
    dataMes.toLocaleDateString("pt-BR", { month: "long", year: "numeric" })
  )}</h3>`;

  const grid = document.createElement("div");
  grid.className = "calendario-grid";

  for (let i = 0; i < primeiroDia.getDay(); i++) {
    grid.appendChild(document.createElement("div")).className = "dia vazio";
  }

  for (let d = 1; d <= ultimoDia; d++) {
    const dataAtual = normalizarData(new Date(ano, mes, d));
    const div = document.createElement("div");
    div.textContent = d;
    div.className = "dia";

    if (dataAtual.getTime() === hoje.getTime()) {
      div.classList.add("hoje"); // hoje sem folga/trabalho
    } else if (dataAtual > hoje) {
      div.classList.add(isFolgaFn(dataAtual) ? "folga" : "trabalho");
      const title = getObsDia(dataAtual, isFolgaFn(dataAtual) ? "Folga" : "Trabalho");
      if (title) div.title = title;
    }
    // passado: neutro

    grid.appendChild(div);
  }

  bloco.appendChild(grid);
  container.appendChild(bloco);
}

/* ==================================================
   EXPORTAÇÃO (CELULAR): CSV
   ================================================== */
function exportarExcel() {
  if (!window.dadosEscala) {
    mostrarToast("Calcule a escala primeiro");
    return;
  }

  let csv = "\uFEFF"; // BOM UTF-8
  csv += "Mês;Dia da semana;Data;Tipo\n";

  window.dadosEscala.forEach(item => {
    csv += `${item.mes};${item.diaSemana};${item.data};${item.tipo}\n`;
  });

  const blob = new Blob([csv], {
    type: "text/csv;charset=utf-8;"
  });

  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = "escala-folgas.csv";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

function exportarPDF() {
  if (/Android|iPhone/i.test(navigator.userAgent)) {
    mostrarToast("PDF funciona melhor no notebook");
    return;
  }

  window.print();
}

function baixarArquivo(conteudo, nomeArquivo, tipo) {
  try {
    const blob = new Blob([conteudo], { type: tipo });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = nomeArquivo;
    document.body.appendChild(a);
    a.click();

    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    showToast("Arquivo Gerado: " + nomeArquivo);
  } catch (e) {
    showToast("Não Foi Possível Gerar O Arquivo No Celular");
  }
}

/* ==================================================
   TOAST
   ================================================== */
function showToast(msg) {
  let toast = document.querySelector(".toast");
  if (!toast) {
    toast = document.createElement("div");
    toast.className = "toast";
    document.body.appendChild(toast);
  }
  toast.textContent = msg;
  toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), 3000);
}

/* ==================================================
   FIXOS / FERIADOS
   ================================================== */
function isFolgaFixa(data) {
  const diaMes = data.getDate();
  const diaSemana = data.getDay();
  const key = mmdd(data);

  if (FERIADOS_NACIONAIS_FIXOS[key]) return true;
  if (DATAS_FIXAS_PERSONALIZADAS.includes(key)) return true;
  if (DIAS_FIXOS_MES.includes(diaMes)) return true;
  if (DIAS_FIXOS_SEMANA.includes(diaSemana)) return true;

  return false;
}

function getObsDia(data, tipo) {
  if (tipo !== "Folga") return ""; // só coloca obs em folga

  const key = mmdd(data);
  if (FERIADOS_NACIONAIS_FIXOS[key]) return "Feriado: " + FERIADOS_NACIONAIS_FIXOS[key];
  if (DATAS_FIXAS_PERSONALIZADAS.includes(key)) return "Data fixa";
  if (DIAS_FIXOS_MES.includes(data.getDate())) return "Dia fixo do mês";
  if (DIAS_FIXOS_SEMANA.includes(data.getDay())) return "Dia fixo da semana";
  return "";
}

function mmdd(data) {
  const mm = String(data.getMonth() + 1).padStart(2, "0");
  const dd = String(data.getDate()).padStart(2, "0");
  return `${mm}-${dd}`;
}

/* ==================================================
   ESCALAS (parse robusto)
   ================================================== */
function extrairCodigoEscala(valor) {
  // pega padrões tipo "6x2", "5x2", "12x36", mesmo se vier "6x2 – ..."
  const m = String(valor).match(/(\d+\s*x\s*\d+)/i);
  return m ? m[1].replace(/\s+/g, "").toLowerCase() : "";
}

function obterEscala(codigo) {
  const map = {
    "6x1": { diasTrabalho: 6, diasFolga: 1 },
    "5x2": { diasTrabalho: 5, diasFolga: 2 },
    "6x2": { diasTrabalho: 6, diasFolga: 2 },
    "4x2": { diasTrabalho: 4, diasFolga: 2 },
    "12x36": { diasTrabalho: 1, diasFolga: 1 } // aproximado no modelo dia a dia
  };
  return map[codigo] || null;
}

/* ==================================================
   UTILITÁRIOS
   ================================================== */
function normalizarData(data) {
  return new Date(data.getFullYear(), data.getMonth(), data.getDate());
}

function formatar(data) {
  return data.toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  });
}

function primeiraLetraMaiuscula(texto) {
  if (!texto) return "";
  texto = String(texto).toLowerCase();
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

function mod(n, m) {
  return ((n % m) + m) % m;
}

function diasEntre(a, b) {
  return Math.floor((b - a) / (1000 * 60 * 60 * 24));
}