/**
 * 東医体スキー競技 大会ホームページ メインスクリプト
 */

document.addEventListener('DOMContentLoaded', () => {
  initMobileNav();
  initNewsFilter();
  highlightCurrentNav();
  initDemoDownloadButtons();
});

/**
 * モバイルナビゲーション（ハンバーガーメニュー・ドロワー）
 */
function initMobileNav() {
  const toggleBtn = document.getElementById('mobileToggle');
  const closeBtn = document.getElementById('drawerClose');
  const drawer = document.getElementById('mobileDrawer');
  const overlay = document.getElementById('drawerOverlay');

  if (!toggleBtn || !drawer || !overlay) return;

  function openDrawer() {
    drawer.classList.add('is-active');
    overlay.classList.add('is-active');
    document.body.style.overflow = 'hidden';
  }

  function closeDrawer() {
    drawer.classList.remove('is-active');
    overlay.classList.remove('is-active');
    document.body.style.overflow = '';
  }

  toggleBtn.addEventListener('click', openDrawer);
  if (closeBtn) closeBtn.addEventListener('click', closeDrawer);
  overlay.addEventListener('click', closeDrawer);

  // ESCキーでドロワーを閉じる
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && drawer.classList.contains('is-active')) {
      closeDrawer();
    }
  });

  // ドロワー内のリンククリックで閉じる
  const drawerLinks = drawer.querySelectorAll('.drawer-link');
  drawerLinks.forEach(link => {
    link.addEventListener('click', () => {
      closeDrawer();
    });
  });
}

/**
 * お知らせ一覧ページのカテゴリ別フィルタリング
 */
function initNewsFilter() {
  const filterButtons = document.querySelectorAll('.filter-btn');
  const newsItems = document.querySelectorAll('.news-item[data-category]');

  if (filterButtons.length === 0 || newsItems.length === 0) return;

  filterButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      // アクティブタブ切り替え
      filterButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      const targetCategory = btn.getAttribute('data-filter');

      newsItems.forEach(item => {
        const itemCategories = item.getAttribute('data-category').split(' ');
        if (targetCategory === 'all' || itemCategories.includes(targetCategory)) {
          item.style.display = 'flex';
        } else {
          item.style.display = 'none';
        }
      });
    });
  });
}

/**
 * 現在ページのナビゲーションリンクのアクティブ化
 */
function highlightCurrentNav() {
  const currentPath = window.location.pathname.split('/').pop() || 'index.html';
  const navLinks = document.querySelectorAll('.nav-link, .drawer-link');

  navLinks.forEach(link => {
    const href = link.getAttribute('href');
    if (href === currentPath || (currentPath === '' && href === 'index.html')) {
      link.classList.add('active');
    }
  });
}

/**
 * サンプルPDF・書類ダウンロードクリック時の案内演出
 */
function initDemoDownloadButtons() {
  const downloadLinks = document.querySelectorAll('a[download], .doc-download-btn, .result-download-btn');
  downloadLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      const href = link.getAttribute('href');
      // リンク先が空や#、存在しないpdfダミーの場合
      if (!href || href === '#' || href.endsWith('.pdf')) {
        // 通常のブラウザ挙動に任せつつ、コンソールログを出力
        console.log(`[ダウンロード要求]: ${link.textContent.trim()} (${href})`);
      }
    });
  });
}
