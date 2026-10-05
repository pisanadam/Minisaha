// Download a clean, self-contained copy, never the current match's mutated DOM.
(function () {
  const button = document.getElementById('offlineDownloadBtn');
  const status = document.getElementById('offlineDownloadStatus');
  if (document.documentElement.hasAttribute('data-minisaha-offline')) {
    button.hidden = true;
    document.getElementById('mainTabOnline').disabled = true;
    status.textContent = 'Çevrim dışı sürüm · Hızlı maç ve kariyer oynanabilir. Yeni spiker replikleri ve çok oyunculu için sunucu gerekir.';
    return;
  }
  async function read(url, kind) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 60000);
    try {
      const response = await fetch(url, {signal: controller.signal, cache: 'no-cache'});
      if (!response.ok) throw new Error('Dosya alınamadı: ' + url);
      return await response[kind]();
    } finally { clearTimeout(timer); }
  }
  async function dataURL(url) {
    const blob = await read(url, 'blob');
    return await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(new Error('Dosya okunamadı: ' + url));
      reader.readAsDataURL(blob);
    });
  }
  button.addEventListener('click', async () => {
    button.disabled = true;
    status.textContent = 'HTML, kadrolar ve gömülü sesler hazırlanıyor…';
    let href;
    try {
      const sourceURL = new URL('index.html', document.baseURI);
      let html = await read(sourceURL.href, 'text');
      const scripts = [...html.matchAll(/<script src="(assets\/[^"<>]+\.js)"><\/script>/g)];
      // Serial reads bound peak memory on phones; nothing is downloaded until all files succeed.
      for (let i = 0; i < scripts.length; i++) {
        const [tag, asset] = scripts[i];
        const code = await read(new URL(asset, sourceURL).href, 'text');
        const bytes = new TextEncoder().encode(code);
        const blob = new Blob([bytes], {type: 'text/javascript'});
        const encoded = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result);
          reader.onerror = () => reject(new Error('Ses/kadro paketlenemedi'));
          reader.readAsDataURL(blob);
        });
        html = html.replace(tag, () => '<script src="' + encoded + '"></script>');
        status.textContent = 'Hazırlanıyor… ' + (i + 1) + '/' + scripts.length;
      }
      const images = new Set([...html.matchAll(/assets\/[a-zA-Z0-9_.-]+\.(?:jpg|png|webp)/g)].map(m => m[0]));
      for (const asset of images) html = html.split(asset).join(await dataURL(new URL(asset, sourceURL).href));
      html = html.replace(/<html\b/, '<html data-minisaha-offline');
      href = URL.createObjectURL(new Blob([html], {type: 'text/html;charset=utf-8'}));
      const link = document.createElement('a');
      link.href = href;
      link.download = 'Mini-Saha-Cevrimdisi.html';
      document.body.append(link);
      link.click();
      link.remove();
      status.textContent = 'HTML hazır. İndirilen dosyayı tarayıcıda açabilirsin. Kayıtlar mevcut siteden otomatik taşınmaz.';
    } catch (error) {
      status.textContent = 'İndirme tamamlanamadı. Bağlantını kontrol edip yeniden dene.';
      console.error(error);
    } finally {
      button.disabled = false;
      if (href) setTimeout(() => URL.revokeObjectURL(href), 60000);
    }
  });
})();
