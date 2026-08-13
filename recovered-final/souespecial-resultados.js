(() => {
  const params = new URLSearchParams(window.location.search);
  const token = params.get("souespecial_token");
  const origem = params.get("souespecial_origem");
  if (!token || !origem || !window.opener) return;

  const niveis = [
    ["c-qu", "C ou QU?", "A Floresta das Vogais"],
    ["g-gu", "G ou GU?", "As Cavernas do Som"],
    ["r-rr", "R ou RR?", "O Vale dos Rugidos"],
    ["s-ss", "S ou SS?", "As Dunas do Sussurro"],
    ["s-z", "S ou Z?", "O Jardim dos Zumbidos"],
    ["c-ss-cedilha", "C ou Ç?", "A Cidade do Som /S/"],
    ["j-g", "J ou G?", "A Selva dos Sons"],
    ["x-ch", "X ou CH?", "O Castelo do Eco"],
    ["m-pb", "M antes de P e B", "A Ponte da Memória"],
    ["ao-am", "ÃO ou AM?", "O Rio do Tempo"],
    ["o-u", "O ou U?", "As Nuvens Enganadoras"],
    ["ce-ci-se-si", "CE, CI, SE ou SI?", "O Labirinto das Sílabas"],
  ];
  const inicio = Date.now();
  const enviados = new Set();
  let nivelAtivo = null;

  function enviar(nivel, coracoes = 3) {
    if (!nivel || enviados.has(nivel[0])) return;
    enviados.add(nivel[0]);
    window.opener.postMessage({
      tipo: "souespecial.resultado-jogo",
      versao: 1,
      token,
      resultadoId: `nivel-${nivel[0]}`,
      competencia: `Ortografia — ${nivel[1]}`,
      acertos: 10,
      tentativas: 10 + Math.max(0, 3 - coracoes),
      duracaoMinutos: Math.max(1, Math.round((Date.now() - inicio) / 60000)),
      observacoes: `Nível concluído: ${nivel[2]}. Corações restantes: ${coracoes}.`,
    }, origem);
  }

  document.addEventListener("click", (event) => {
    const texto = event.target instanceof Element ? event.target.closest("button")?.textContent : "";
    const numero = texto?.match(/Nível\s+(\d+)/i)?.[1];
    if (numero) nivelAtivo = niveis[Number(numero) - 1] ?? nivelAtivo;
  });

  const observar = () => {
    const texto = document.body.textContent ?? "";
    if (!/Nível concluído!/i.test(texto)) return;
    const coracoes = Number(texto.match(/(\d+)\s+coração/i)?.[1] ?? 3);
    enviar(nivelAtivo, coracoes);
  };
  new MutationObserver(observar).observe(document.body, { childList: true, subtree: true });

  let anteriores = new Set();
  try {
    const perfis = JSON.parse(localStorage.getItem("ortocraft-player-profiles-v1") || "[]");
    perfis.forEach((perfil) => perfil.completedLevels?.forEach((id) => anteriores.add(id)));
  } catch { /* perfil ainda não criado */ }
  setInterval(() => {
    try {
      const perfis = JSON.parse(localStorage.getItem("ortocraft-player-profiles-v1") || "[]");
      const atuais = new Set();
      perfis.forEach((perfil) => perfil.completedLevels?.forEach((id) => atuais.add(id)));
      atuais.forEach((id) => {
        if (!anteriores.has(id)) enviar(niveis.find((nivel) => nivel[0] === id));
      });
      anteriores = atuais;
    } catch { /* aguarda a próxima atualização */ }
  }, 1000);
})();
