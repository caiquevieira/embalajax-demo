/* Configuração do projeto: preencher a partir do briefing.md.
   IDs vazios = nenhum script de terceiros é carregado e o banner de cookies não aparece. */
const CONFIG = {
  ga4Id: '', // ex.: 'G-XXXXXXXXXX'
  metaPixelId: '', // ex.: '123456789012345'
};

const CHAVE_CONSENTIMENTO = 'ul-consentimento';

// data-track → eventos disparados (ver _docs/padrao-whatsapp.md)
const EVENTOS = {
  whatsapp: { ga: 'click_whatsapp', meta: 'Contact' },
  instagram: { ga: 'click_instagram' },
  'avaliar-google': { ga: 'click_avaliar_google' },
  'como-chegar': { ga: 'click_como_chegar', meta: 'FindLocation' },
};

let analyticsCarregado = false;

function lerConsentimento() {
  try {
    return localStorage.getItem(CHAVE_CONSENTIMENTO);
  } catch {
    return null;
  }
}

function salvarConsentimento(valor) {
  try {
    localStorage.setItem(CHAVE_CONSENTIMENTO, valor);
  } catch {
    // Sem armazenamento (aba anônima restrita): vale só para esta visita.
  }
}

function carregarAnalytics() {
  if (analyticsCarregado) return;
  analyticsCarregado = true;

  if (CONFIG.ga4Id) {
    const s = document.createElement('script');
    s.async = true;
    s.src = `https://www.googletagmanager.com/gtag/js?id=${CONFIG.ga4Id}`;
    document.head.appendChild(s);
    window.dataLayer = window.dataLayer || [];
    window.gtag = function () {
      window.dataLayer.push(arguments);
    };
    window.gtag('js', new Date());
    window.gtag('config', CONFIG.ga4Id);
  }

  if (CONFIG.metaPixelId) {
    /* Snippet oficial do Meta Pixel */
    !(function (f, b, e, v, n, t, s) {
      if (f.fbq) return;
      n = f.fbq = function () {
        n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments);
      };
      if (!f._fbq) f._fbq = n;
      n.push = n;
      n.loaded = !0;
      n.version = '2.0';
      n.queue = [];
      t = b.createElement(e);
      t.async = !0;
      t.src = v;
      s = b.getElementsByTagName(e)[0];
      s.parentNode.insertBefore(t, s);
    })(window, document, 'script', 'https://connect.facebook.net/en_US/fbevents.js');
    window.fbq('init', CONFIG.metaPixelId);
    window.fbq('track', 'PageView');
  }
}

function iniciarConsentimento() {
  const usaAnalytics = Boolean(CONFIG.ga4Id || CONFIG.metaPixelId);
  const banner = document.getElementById('consentimento');
  const botoesAbrir = document.querySelectorAll('[data-abrir-consentimento]');

  if (!usaAnalytics) {
    botoesAbrir.forEach((b) => (b.hidden = true));
    return;
  }

  const abrir = () => {
    if (!banner) return;
    banner.hidden = false;
    document.body.classList.add('consentimento-aberto');
  };
  const fechar = () => {
    if (!banner) return;
    banner.hidden = true;
    document.body.classList.remove('consentimento-aberto');
  };

  const escolha = lerConsentimento();
  if (escolha === 'aceito') carregarAnalytics();
  else if (!escolha) abrir();

  banner?.querySelector('[data-consentimento="aceitar"]')?.addEventListener('click', () => {
    salvarConsentimento('aceito');
    fechar();
    carregarAnalytics();
  });

  banner?.querySelector('[data-consentimento="recusar"]')?.addEventListener('click', () => {
    salvarConsentimento('recusado');
    fechar();
    // Scripts já carregados só saem da página com um recarregamento.
    if (analyticsCarregado) location.reload();
  });

  botoesAbrir.forEach((b) => b.addEventListener('click', abrir));
}

function iniciarTracking() {
  document.addEventListener('click', (e) => {
    const link = e.target.closest('[data-track]');
    if (!link || !analyticsCarregado) return;
    const evento = EVENTOS[link.dataset.track];
    if (!evento) return;
    const params = { origem: link.dataset.origem || '' };
    if (link.dataset.loja) params.loja = link.dataset.loja;
    if (window.gtag && evento.ga) window.gtag('event', evento.ga, params);
    if (window.fbq && evento.meta) window.fbq('track', evento.meta, params);
  });
}

/* WhatsApp por loja: links com data-whatsapp abrem o seletor #escolher-loja, que monta o
   link de cada unidade com a mensagem do botão clicado. Sem JS (ou sem <dialog>), o link
   segue para #lojas, onde cada card tem o WhatsApp da unidade. */
function iniciarSeletorWhatsapp() {
  const dialogo = document.getElementById('escolher-loja');
  if (!dialogo || typeof dialogo.showModal !== 'function') return;
  const lojas = dialogo.querySelectorAll('[data-wa-loja]');
  const bases = [...lojas].map((a) => a.href.split('?')[0]);

  document.addEventListener('click', (e) => {
    const gatilho = e.target.closest('[data-whatsapp]');
    if (!gatilho) return;
    e.preventDefault();
    const texto = encodeURIComponent(gatilho.dataset.waMsg || dialogo.dataset.waMsgPadrao || '');
    lojas.forEach((a, i) => {
      a.href = texto ? `${bases[i]}?text=${texto}` : bases[i];
      a.dataset.origem = gatilho.dataset.origem || '';
    });
    dialogo.showModal();
  });

  // Clique fora da caixa (no fundo escurecido) fecha
  dialogo.addEventListener('click', (e) => {
    if (e.target === dialogo) dialogo.close();
  });
  lojas.forEach((a) => a.addEventListener('click', () => setTimeout(() => dialogo.close(), 0)));
}

iniciarConsentimento();
iniciarTracking();
iniciarSeletorWhatsapp();
