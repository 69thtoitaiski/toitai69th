/**
 * microCMS API連携スクリプト
 * 
 * サービスID: toitai69th
 * エンドポイント: news, documents, schedule, results
 */

const MICROCMS_CONFIG = {
  serviceDomain: 'toitai69th',
  apiKey: 'o7VDv8kktmlvbsINqCfeBSPqpteFV6aUny9m',
  endpoints: {
    news: 'news',
    documents: 'documents',
    schedule: 'schedule',
    results: 'results'
  }
};

/**
 * microCMS API共通取得関数
 * @param {string} endpoint 
 * @param {object} params 
 * @returns {Promise<any>}
 */
async function fetchMicroCMS(endpoint, params = {}) {
  const url = new URL(`https://${MICROCMS_CONFIG.serviceDomain}.microcms.io/api/v1/${endpoint}`);
  Object.keys(params).forEach(key => url.searchParams.append(key, params[key]));

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      'X-MICROCMS-API-KEY': MICROCMS_CONFIG.apiKey
    }
  });

  if (!response.ok) {
    throw new Error(`microCMS API request failed: ${response.status} ${response.statusText} (${endpoint})`);
  }

  return await response.json();
}

/**
 * 日付文字列フォーマット (ISO文字列 -> YYYY.MM.DD)
 */
function formatDate(dateStr) {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return dateStr;
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}.${m}.${d}`;
}

/**
 * HTMLタグ除去（抜粋生成用）
 */
function stripHtml(html) {
  if (!html) return '';
  const doc = new DOMParser().parseFromString(html, 'text/html');
  return doc.body.textContent || '';
}

/**
 * カテゴリ判定・スラッグ変換
 */
function parseCategory(categoryData) {
  let catName = 'お知らせ';
  if (typeof categoryData === 'string') {
    catName = categoryData;
  } else if (categoryData && typeof categoryData === 'object') {
    catName = categoryData.name || categoryData.title || 'お知らせ';
  } else if (Array.isArray(categoryData) && categoryData.length > 0) {
    catName = typeof categoryData[0] === 'string' ? categoryData[0] : (categoryData[0].name || 'お知らせ');
  }

  // スラッグ分類
  let slug = 'other';
  let badgeClass = 'badge-gray';

  if (catName.includes('重要')) {
    slug = 'important';
    badgeClass = 'badge-danger';
  } else if (catName.includes('要項') || catName.includes('エントリー') || catName.includes('書類')) {
    slug = 'documents';
    badgeClass = 'badge-primary';
  } else if (catName.includes('日程') || catName.includes('会場') || catName.includes('時間')) {
    slug = 'schedule';
    badgeClass = 'badge-primary';
  } else if (catName.includes('結果') || catName.includes('リザルト')) {
    slug = 'results';
    badgeClass = 'badge-gold';
  } else if (catName.includes('連絡') || catName.includes('広報')) {
    slug = 'other';
    badgeClass = 'badge-info';
  }

  return { name: catName, slug, badgeClass };
}

/**
 * 重要フラグの判定
 */
function checkIsImportant(item) {
  return Boolean(
    item.important === true ||
    item.isImportant === true ||
    item.is_important === true ||
    (Array.isArray(item.flags) && item.flags.includes('重要')) ||
    (typeof item.category === 'string' && item.category.includes('重要')) ||
    (item.category && item.category.name && item.category.name.includes('重要'))
  );
}

// ==========================================================================
// 1. トップページ お知らせ読み込み
// ==========================================================================
async function initTopNewsDynamic() {
  const container = document.getElementById('topNewsList');
  if (!container) return;

  try {
    const data = await fetchMicroCMS(MICROCMS_CONFIG.endpoints.news, { limit: 5 });
    if (data && data.contents && data.contents.length > 0) {
      container.innerHTML = ''; // 既存をクリア

      data.contents.forEach(item => {
        const isImportant = checkIsImportant(item);
        const date = formatDate(item.publishedAt || item.date || item.createdAt);
        const cat = parseCategory(item.category);
        const excerpt = item.excerpt || stripHtml(item.body || item.content || item.detail || '');
        const targetUrl = item.url || item.link || (item.file && item.file.url) || 'news.html';

        const newsEl = document.createElement('a');
        newsEl.href = targetUrl;
        newsEl.className = `news-item ${isImportant ? 'news-item-important' : ''}`;
        newsEl.innerHTML = `
          <div class="news-meta">
            <span class="news-date">${date}</span>
            ${isImportant ? '<span class="badge badge-danger">重要</span>' : ''}
            <span class="badge ${cat.badgeClass}">${cat.name}</span>
          </div>
          <div class="news-content">
            <h3 class="news-title">${item.title}</h3>
            ${excerpt ? `<p class="news-excerpt">${excerpt.substring(0, 80)}${excerpt.length > 80 ? '...' : ''}</p>` : ''}
          </div>
          <div class="news-arrow">
            <svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7"/>
            </svg>
          </div>
        `;
        container.appendChild(newsEl);
      });
    } else {
      // microCMSにデータがまだない場合
      const notice = document.createElement('div');
      notice.className = 'api-status-notice fallback';
      notice.innerHTML = `
        <svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
        <span>microCMS接続完了（現在登録データが0件のためサンプルを表示しています。管理画面に投稿すると自動で置き換わります）</span>
      `;
      container.parentNode.insertBefore(notice, container);
    }
  } catch (err) {
    console.warn('[microCMS] トップお知らせ取得スキップ:', err.message);
  }
}

// ==========================================================================
// 2. お知らせ一覧ページ (news.html) 読み込み
// ==========================================================================
async function initNewsPageDynamic() {
  const container = document.getElementById('newsContainer');
  if (!container) return;

  try {
    const data = await fetchMicroCMS(MICROCMS_CONFIG.endpoints.news, { limit: 50 });

    if (data && data.contents && data.contents.length > 0) {
      container.innerHTML = ''; // 既存の静的HTMLを動的データで置換

      data.contents.forEach(item => {
        const isImportant = checkIsImportant(item);
        const date = formatDate(item.publishedAt || item.date || item.createdAt);
        const cat = parseCategory(item.category);
        const rawContent = item.body || item.content || item.detail || '';
        const excerpt = item.excerpt || stripHtml(rawContent);
        const fileUrl = item.file ? (item.file.url || item.file) : (item.pdf ? item.pdf.url : null);
        const extUrl = item.url || item.link;

        // カテゴリ属性の構築（重要の場合は important も付加）
        const categoryAttrs = [cat.slug];
        if (isImportant) categoryAttrs.push('important');

        const article = document.createElement('article');
        article.className = `news-item ${isImportant ? 'news-item-important' : ''}`;
        article.setAttribute('data-category', categoryAttrs.join(' '));

        let actionBtnHtml = '';
        if (fileUrl) {
          actionBtnHtml = `<div style="margin-top: 0.6rem;"><a href="${fileUrl}" target="_blank" rel="noopener noreferrer" class="btn btn-sm btn-outline-primary">添付ファイルを開く</a></div>`;
        } else if (extUrl) {
          actionBtnHtml = `<div style="margin-top: 0.6rem;"><a href="${extUrl}" target="_blank" rel="noopener noreferrer" class="btn btn-sm btn-outline-primary">詳細リンクを開く</a></div>`;
        }

        article.innerHTML = `
          <div class="news-meta">
            <span class="news-date">${date}</span>
            ${isImportant ? '<span class="badge badge-danger">重要</span>' : ''}
            <span class="badge ${cat.badgeClass}">${cat.name}</span>
          </div>
          <div class="news-content">
            <h2 class="news-title">${item.title}</h2>
            ${excerpt ? `<p class="news-excerpt">${excerpt}</p>` : ''}
            ${actionBtnHtml}
          </div>
        `;
        container.appendChild(article);
      });

      // フィルタリング処理の再バインド
      if (typeof initNewsFilter === 'function') {
        initNewsFilter();
      }
    } else {
      // microCMSにデータ未登録時：お知らせ一覧にガイダンスバナーを表示
      const notice = document.createElement('div');
      notice.className = 'api-status-notice fallback';
      notice.innerHTML = `
        <svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
        <span>microCMS接続完了（管理画面で「重要フラグ」をONにして投稿すると、該当項目が赤い背景色で目立つように自動表示されます）</span>
      `;
      container.parentNode.insertBefore(notice, container);
    }
  } catch (err) {
    console.warn('[microCMS] お知らせ一覧取得スキップ:', err.message);
  }
}

// ==========================================================================
// 3. 大会要項・書類ダウンロードページ (documents.html) 読み込み
// ==========================================================================
async function initDocumentsPageDynamic() {
  const container = document.getElementById('documentsDynamicArea');
  if (!container) return;

  try {
    const data = await fetchMicroCMS(MICROCMS_CONFIG.endpoints.documents, { limit: 50 });
    if (data && data.contents && data.contents.length > 0) {
      container.innerHTML = ''; // クリアして動的カードを描画

      // カテゴリごとにグループ化
      const groups = {};
      data.contents.forEach(doc => {
        const cat = doc.category || '大会関連書類';
        if (!groups[cat]) groups[cat] = [];
        groups[cat].push(doc);
      });

      Object.keys(groups).forEach(catName => {
        const sec = document.createElement('section');
        sec.className = 'doc-section';
        sec.innerHTML = `
          <h2 class="doc-category-title">
            <svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
            ${catName}
          </h2>
          <div class="doc-grid"></div>
        `;

        const grid = sec.querySelector('.doc-grid');
        groups[catName].forEach(doc => {
          const fileObj = doc.file || doc.pdf || {};
          const fileUrl = typeof fileObj === 'string' ? fileObj : (fileObj.url || doc.url || 'assets/docs/sample_document.pdf');
          const fileType = (doc.fileType || doc.type || (fileUrl.endsWith('.xlsx') ? 'EXCEL' : 'PDF')).toUpperCase();
          const badgeClass = fileType === 'EXCEL' ? 'excel' : 'pdf';
          const updateDate = formatDate(doc.updatedAt || doc.publishedAt || doc.createdAt);
          const fileSizeStr = doc.fileSize || (fileObj.size ? `${Math.round(fileObj.size / 1024)} KB` : 'PDF');

          const card = document.createElement('div');
          card.className = 'doc-card';
          card.innerHTML = `
            <div class="doc-card-top">
              <span class="file-badge ${badgeClass}">${fileType}</span>
              <div class="doc-info">
                <h4>${doc.title}</h4>
                <p>${doc.description || doc.detail || ''}</p>
              </div>
            </div>
            <div class="doc-card-bottom">
              <span class="doc-meta">更新：${updateDate} | ${fileSizeStr}</span>
              <a href="${fileUrl}" target="_blank" download="${doc.title}.${fileType.toLowerCase()}" class="doc-download-btn">
                <svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
                ダウンロード
              </a>
            </div>
          `;
          grid.appendChild(card);
        });

        container.appendChild(sec);
      });
    } else {
      const notice = document.createElement('div');
      notice.className = 'api-status-notice fallback';
      notice.innerHTML = `
        <svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
        <span>microCMS documents エンドポイント接続中（管理画面から書類PDFを登録すると自動で本ページに反映されます）</span>
      `;
      container.parentNode.insertBefore(notice, container);
    }
  } catch (err) {
    console.warn('[microCMS] 書類一覧取得スキップ:', err.message);
  }
}

// ==========================================================================
// 4. 競技日程ページ (schedule.html) 読み込み
// ==========================================================================
async function initSchedulePageDynamic() {
  const tableBody = document.getElementById('scheduleTableBody');
  if (!tableBody) return;

  try {
    const data = await fetchMicroCMS(MICROCMS_CONFIG.endpoints.schedule, { limit: 50 });
    if (data && data.contents && data.contents.length > 0) {
      tableBody.innerHTML = ''; // クリアして動的スケジュールを描画

      data.contents.forEach(item => {
        const row = document.createElement('tr');
        row.innerHTML = `
          <td>
            <span class="schedule-day-badge">${item.dayBadge || item.day || '競技日'}</span><br>
            <strong style="font-size: 1.05rem; display: block; margin-top: 0.3rem;">${item.date || ''}</strong>
          </td>
          <td>${item.time || ''}</td>
          <td>
            <div class="schedule-event-title">${item.title || item.event || ''}</div>
            <div class="schedule-event-detail">${item.description || item.detail || ''}</div>
          </td>
          <td>${item.location || item.venue || ''}</td>
        `;
        tableBody.appendChild(row);
      });
    } else {
      console.log('[microCMS] schedule: 登録データなしまたはエンドポイント設定待ちのためサンプルデータを表示中');
    }
  } catch (err) {
    console.log('[microCMS] schedule エンドポイント準備中:', err.message);
  }
}

// ==========================================================================
// 5. 大会結果（リザルト）ページ (results.html) 読み込み
// ==========================================================================
async function initResultsPageDynamic() {
  const container = document.getElementById('resultsDynamicArea');
  if (!container) return;

  try {
    const data = await fetchMicroCMS(MICROCMS_CONFIG.endpoints.results, { limit: 50 });
    if (data && data.contents && data.contents.length > 0) {
      container.innerHTML = '';

      // カテゴリ別グループ
      const groups = {};
      data.contents.forEach(res => {
        const cat = res.category || 'リザルト';
        if (!groups[cat]) groups[cat] = [];
        groups[cat].push(res);
      });

      Object.keys(groups).forEach(catName => {
        const sec = document.createElement('section');
        sec.className = 'result-group';
        sec.innerHTML = `
          <h2 class="result-group-title">
            <svg width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
            ${catName}
          </h2>
          <div class="result-cards-grid"></div>
        `;

        const grid = sec.querySelector('.result-cards-grid');
        groups[catName].forEach(item => {
          const fileUrl = (item.file && item.file.url) || item.pdfUrl || item.url || 'assets/docs/sample_document.pdf';
          
          let podiumHtml = '';
          if (item.firstPlace || item.podium) {
            podiumHtml = `
              <div class="podium-preview">
                ${item.firstPlace ? `<div class="podium-item"><span class="medal-icon">🥇 1位</span><span class="podium-name">${item.firstPlace}</span><span class="podium-school">${item.firstPlaceSchool || ''}</span></div>` : ''}
                ${item.secondPlace ? `<div class="podium-item"><span class="medal-icon">🥈 2位</span><span class="podium-name">${item.secondPlace}</span><span class="podium-school">${item.secondPlaceSchool || ''}</span></div>` : ''}
                ${item.thirdPlace ? `<div class="podium-item"><span class="medal-icon">🥉 3位</span><span class="podium-name">${item.thirdPlace}</span><span class="podium-school">${item.thirdPlaceSchool || ''}</span></div>` : ''}
              </div>
            `;
          }

          const card = document.createElement('div');
          card.className = 'result-card';
          card.innerHTML = `
            <div class="result-card-top">
              <div class="result-card-header">
                <span class="badge badge-primary">${catName}</span>
                <span class="badge badge-info">公式リザルト</span>
              </div>
              <h3 class="result-title">${item.title}</h3>
              <p class="result-meta-info">${item.venue || item.location || ''} ${item.starters ? `| 出走: ${item.starters}` : ''}</p>
              ${podiumHtml}
            </div>
            <a href="${fileUrl}" target="_blank" download="${item.title}_リザルト.pdf" class="result-download-btn">
              <svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
              リザルトPDFをダウンロード (PDF)
            </a>
          `;
          grid.appendChild(card);
        });

        container.appendChild(sec);
      });
    } else {
      const notice = document.createElement('div');
      notice.className = 'api-status-notice fallback';
      notice.innerHTML = `
        <svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
        <span>microCMS results エンドポイント接続中（競技結果PDFを登録すると本ページに即時反映されます）</span>
      `;
      container.parentNode.insertBefore(notice, container);
    }
  } catch (err) {
    console.warn('[microCMS] リザルト取得スキップ:', err.message);
  }
}

// ページ読み込み時に自動初期化
document.addEventListener('DOMContentLoaded', () => {
  initTopNewsDynamic();
  initNewsPageDynamic();
  initDocumentsPageDynamic();
  initSchedulePageDynamic();
  initResultsPageDynamic();
});
