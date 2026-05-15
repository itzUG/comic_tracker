// =============================================
//   ComicForge - viewer.js (READ ONLY)
//   Reads from Firebase Firestore only. No writes.
// =============================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
  getFirestore, collection, onSnapshot
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyCCl8vbv8GeUg6uuDhNzDHshgnBPLhnQRA",
  authDomain: "comictracker-b5db3.firebaseapp.com",
  projectId: "comictracker-b5db3",
  storageBucket: "comictracker-b5db3.firebasestorage.app",
  messagingSenderId: "495825637844",
  appId: "1:495825637844:web:e99d114b2253aae200c641"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const booksCol = collection(db, "books");

const COLORS = [
  '#f5a623','#2dd4bf','#fb7185','#a78bfa',
  '#34d399','#60a5fa','#f472b6','#facc15',
  '#e8472a','#38bdf8'
];

onSnapshot(booksCol, (snapshot) => {
  const books = snapshot.docs
    .map(d => ({ id: d.id, ...d.data(), chapters: d.data().chapters || [] }))
    .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

  renderAll(books);
  document.getElementById('loadingMsg').classList.add('hidden');
});

function renderAll(books) {
  const cutoff = Date.now() - 24 * 60 * 60 * 1000;
  const recentBooks = books.filter(b => (b.createdAt || 0) > cutoff);
  const recentChapters = books.flatMap(b =>
    b.chapters
      .filter(c => c.createdAt && c.createdAt > cutoff)
      .map(c => ({ ...c, bookTitle: b.title, bookColor: b.color }))
  );

  renderRecentStrip(recentBooks, recentChapters);
  document.getElementById('recentBadge').textContent = recentBooks.length + recentChapters.length;

  const grid = document.getElementById('booksGrid');
  const emptyState = document.getElementById('emptyState');
  grid.innerHTML = '';

  if (books.length === 0) {
    emptyState.classList.add('visible');
  } else {
    emptyState.classList.remove('visible');
    books.forEach((book, i) => {
      const card = buildBookCard(book, cutoff);
      card.style.animationDelay = `${i * 0.04}s`;
      grid.appendChild(card);
    });
  }

  document.getElementById('statBooks').textContent = books.length;
  document.getElementById('statChapters').textContent = books.reduce((sum, b) => sum + b.chapters.length, 0);
  document.getElementById('statDone').textContent = books.reduce((sum, b) => sum + b.chapters.filter(c => c.done).length, 0);
}

function renderRecentStrip(recentBooks, recentChapters) {
  const strip = document.getElementById('recentStrip');
  const pills = document.getElementById('recentPills');
  const count = document.getElementById('recentCount');
  const total = recentBooks.length + recentChapters.length;

  pills.innerHTML = '';
  count.textContent = `${total} item${total !== 1 ? 's' : ''}`;

  if (total === 0) {
    strip.classList.remove('has-items');
    return;
  }

  strip.classList.add('has-items');

  recentBooks.forEach(book => {
    const pill = document.createElement('div');
    pill.className = 'recent-pill';
    pill.innerHTML = `
      <span class="pill-dot" style="background:${book.color || COLORS[0]}"></span>
      <span>${escHtml(book.title)}</span>
      <span class="pill-meta">book - ${timeAgo(book.createdAt)}</span>
    `;
    pills.appendChild(pill);
  });

  recentChapters.forEach(chapter => {
    const pill = document.createElement('div');
    pill.className = 'recent-pill';
    pill.innerHTML = `
      <span class="pill-dot" style="background:${chapter.bookColor || COLORS[0]}"></span>
      <span>${escHtml(chapter.name)}</span>
      <span class="pill-meta">in ${escHtml(chapter.bookTitle)} - ${timeAgo(chapter.createdAt)}</span>
    `;
    pills.appendChild(pill);
  });
}

function buildBookCard(book, cutoff) {
  const total = book.chapters.length;
  const done = book.chapters.filter(c => c.done).length;
  const progress = total > 0 ? Math.round((done / total) * 100) : 0;
  const color = book.color || COLORS[0];
  const isNew = (book.createdAt || 0) > cutoff;

  const card = document.createElement('div');
  card.className = 'book-card' + (isNew ? ' is-new' : '');

  const spine = document.createElement('div');
  spine.className = 'book-card-spine';
  spine.style.background = color;
  card.appendChild(spine);

  const header = document.createElement('div');
  header.className = 'book-card-header';
  header.innerHTML = `
    <div class="book-info">
      <div class="book-field-label">Book Name</div>
      <div class="book-title">${escHtml(book.title)}</div>
      <div class="book-tags">
        <span class="book-genre">${escHtml(book.genre || 'Uncategorized')}</span>
        ${isNew ? '<span class="book-new-tag">New</span>' : ''}
      </div>
    </div>
  `;
  card.appendChild(header);

  const progressWrap = document.createElement('div');
  progressWrap.className = 'book-progress-wrap';
  progressWrap.innerHTML = `
    <div class="book-progress-label">
      <span>${done}/${total} chapters done</span>
      <span>${progress}%</span>
    </div>
    <div class="progress-bar-bg">
      <div class="progress-bar-fill" style="width:${progress}%;background:${progress === 100 ? '#34d399' : color}"></div>
    </div>
  `;
  card.appendChild(progressWrap);

  const list = document.createElement('div');
  list.className = 'chapter-list';

  if (book.chapters.length === 0) {
    list.innerHTML = `<p class="chapters-empty">No chapters yet</p>`;
  } else {
    book.chapters.forEach(chapter => {
      const item = document.createElement('div');
      const isChapterNew = chapter.createdAt && chapter.createdAt > cutoff;
      const originalName = (chapter.originalName || '').trim();
      item.className = 'chapter-item';
      item.innerHTML = `
        <input type="checkbox" class="chapter-checkbox readonly" ${chapter.done ? 'checked' : ''} disabled/>
        <div class="chapter-copy">
          <span class="chapter-label">Chapter Name</span>
          <span class="chapter-name ${chapter.done ? 'done' : ''}">${escHtml(chapter.name)}</span>
          ${originalName ? `
            <span class="chapter-label">Original Chapter Name</span>
            <span class="chapter-original ${chapter.done ? 'done' : ''}">${escHtml(originalName)}</span>
          ` : ''}
        </div>
        ${isChapterNew ? '<span class="chapter-time" style="color:var(--amber)">new</span>' : (chapter.createdAt ? `<span class="chapter-time">${timeAgo(chapter.createdAt)}</span>` : '')}
      `;
      list.appendChild(item);
    });
  }

  card.appendChild(list);

  const footer = document.createElement('div');
  footer.className = 'book-card-footer';
  footer.innerHTML = '<p class="viewer-card-note">View only</p>';
  card.appendChild(footer);

  return card;
}

function timeAgo(ts) {
  if (!ts) return '';
  const diff = Date.now() - ts;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
