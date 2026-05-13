// =============================================
//   ComicForge Studio — script.js (ADMIN)
// =============================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
  getFirestore, collection, doc,
  onSnapshot, addDoc, updateDoc, deleteDoc
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// ── Firebase ──
const firebaseConfig = {
  apiKey: "AIzaSyCCl8vbv8GeUg6uuDhNzDHshgnBPLhnQRA",
  authDomain: "comictracker-b5db3.firebaseapp.com",
  projectId: "comictracker-b5db3",
  storageBucket: "comictracker-b5db3.firebasestorage.app",
  messagingSenderId: "495825637844",
  appId: "1:495825637844:web:e99d114b2253aae200c641"
};

const app = initializeApp(firebaseConfig);
const db  = getFirestore(app);
const booksCol = collection(db, "books");

// ── Palette ──
const COLORS = [
  '#f5a623','#2dd4bf','#fb7185','#a78bfa',
  '#34d399','#60a5fa','#f472b6','#facc15',
  '#e8472a','#38bdf8'
];

// ── State ──
let allBooks = [];
let activeBookId = null;
let activeFilter = 'all';
let selectedColor = COLORS[0];

// ── Build colour swatches ──
const swatchContainer = document.getElementById('colorSwatches');
COLORS.forEach((c, i) => {
  const s = document.createElement('div');
  s.className = 'color-swatch' + (i === 0 ? ' selected' : '');
  s.style.background = c;
  s.dataset.color = c;
  s.addEventListener('click', () => {
    document.querySelectorAll('.color-swatch').forEach(x => x.classList.remove('selected'));
    s.classList.add('selected');
    selectedColor = c;
  });
  swatchContainer.appendChild(s);
});

// ── Real-time listener ──
onSnapshot(booksCol, (snap) => {
  allBooks = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  allBooks.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  renderAll();
  document.getElementById('loadingMsg').classList.add('hidden');
});

// ── Nav filter ──
document.querySelectorAll('.nav-item').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    activeFilter = btn.dataset.section;
    updatePageTitle();
    renderAll();
  });
});

function updatePageTitle() {
  const map = {
    all: ['All Books', 'Your complete library'],
    recent: ['Recently Added', 'Books added in the last 24 hours'],
    inprogress: ['In Progress', 'Books with some chapters done'],
    completed: ['Completed', 'Books with all chapters finished']
  };
  const [title, sub] = map[activeFilter] || ['All Books', ''];
  document.getElementById('pageTitle').textContent = title;
  document.getElementById('pageSubtitle').textContent = sub;
}

// ── Add Book Drawer ──
document.getElementById('openAddBook').addEventListener('click', () => {
  document.getElementById('drawerOverlay').classList.add('open');
  document.getElementById('bookTitleInput').focus();
});
document.getElementById('drawerClose').addEventListener('click', closeDrawer);
document.getElementById('drawerOverlay').addEventListener('click', e => {
  if (e.target === document.getElementById('drawerOverlay')) closeDrawer();
});
function closeDrawer() { document.getElementById('drawerOverlay').classList.remove('open'); }

document.getElementById('addBookBtn').addEventListener('click', addBook);
document.getElementById('bookTitleInput').addEventListener('keydown', e => { if (e.key === 'Enter') addBook(); });

async function addBook() {
  const titleEl = document.getElementById('bookTitleInput');
  const genreEl = document.getElementById('bookGenreInput');
  const title = titleEl.value.trim();
  if (!title) { shake(titleEl); return; }

  await addDoc(booksCol, {
    title,
    genre: genreEl.value.trim() || 'Uncategorized',
    chapters: [],
    color: selectedColor,
    createdAt: Date.now()
  });

  titleEl.value = '';
  genreEl.value = '';
  closeDrawer();
  showToast('📖 Book created!');
}

// ── Delete Book ──
async function deleteBook(id) {
  if (!confirm('Delete this book and all chapters?')) return;
  await deleteDoc(doc(db, 'books', id));
  showToast('🗑 Book deleted.');
}

// ── Chapter Modal ──
document.getElementById('modalClose').addEventListener('click', closeModal);
document.getElementById('modalOverlay').addEventListener('click', e => {
  if (e.target === document.getElementById('modalOverlay')) closeModal();
});
document.getElementById('addChapterBtn').addEventListener('click', addChapter);
document.getElementById('chapterInput').addEventListener('keydown', e => { if (e.key === 'Enter') addChapter(); });

function openModal(bookId) {
  activeBookId = bookId;
  const book = allBooks.find(b => b.id === bookId);
  document.getElementById('modalBookTitle').textContent = book.title;
  document.getElementById('modalBookChip').style.background = book.color || COLORS[0];
  document.getElementById('chapterInput').value = '';
  document.getElementById('modalOverlay').classList.add('open');
  setTimeout(() => document.getElementById('chapterInput').focus(), 80);
}
function closeModal() {
  document.getElementById('modalOverlay').classList.remove('open');
  activeBookId = null;
}

async function addChapter() {
  if (!activeBookId) return;
  const input = document.getElementById('chapterInput');
  const name = input.value.trim();
  if (!name) { shake(input); return; }

  const book = allBooks.find(b => b.id === activeBookId);
  const newChapter = { id: genId(), name, done: false, createdAt: Date.now() };
  const updated = [...(book.chapters || []), newChapter];
  await updateDoc(doc(db, 'books', activeBookId), { chapters: updated });
  input.value = '';
  input.focus();
  showToast('✅ Chapter added!');
}

// ── Toggle / Delete Chapter ──
async function toggleChapter(bookId, chapterId) {
  const book = allBooks.find(b => b.id === bookId);
  const chapters = book.chapters.map(c =>
    c.id === chapterId ? { ...c, done: !c.done } : c
  );
  await updateDoc(doc(db, 'books', bookId), { chapters });
}

async function deleteChapter(bookId, chapterId) {
  const book = allBooks.find(b => b.id === bookId);
  const chapters = book.chapters.filter(c => c.id !== chapterId);
  await updateDoc(doc(db, 'books', bookId), { chapters });
  showToast('🗑 Chapter removed.');
}

// ── Reset ──
document.getElementById('resetBtn').addEventListener('click', async () => {
  if (!confirm('Delete ALL data? This cannot be undone.')) return;
  for (const b of allBooks) await deleteDoc(doc(db, 'books', b.id));
  showToast('🗑 Everything cleared.');
});

// ── Copy viewer link ──
document.getElementById('copyViewLink').addEventListener('click', () => {
  const url = window.location.href.replace('index.html', 'view.html');
  navigator.clipboard.writeText(url).then(() => showToast('🔗 Viewer link copied!'));
});

// ── Render All ──
function renderAll() {
  const now = Date.now();
  const cutoff = now - 24 * 60 * 60 * 1000;

  // Recently added items (books or chapters added in last 24h)
  const recentBooks = allBooks.filter(b => b.createdAt > cutoff);
  const recentChapters = allBooks.flatMap(b =>
    (b.chapters || []).filter(c => c.createdAt && c.createdAt > cutoff)
      .map(c => ({ ...c, bookTitle: b.title, bookColor: b.color }))
  );

  renderRecentStrip(recentBooks, recentChapters);

  // Update recent badge
  const recentTotal = recentBooks.length + recentChapters.length;
  document.getElementById('recentBadge').textContent = recentTotal;

  // Filter books
  let books = [...allBooks];
  if (activeFilter === 'recent') {
    books = recentBooks;
  } else if (activeFilter === 'inprogress') {
    books = books.filter(b => {
      const t = b.chapters.length, d = b.chapters.filter(c => c.done).length;
      return t > 0 && d < t;
    });
  } else if (activeFilter === 'completed') {
    books = books.filter(b => b.chapters.length > 0 && b.chapters.every(c => c.done));
  }

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

  updateStats();
}

function renderRecentStrip(recentBooks, recentChapters) {
  const strip = document.getElementById('recentStrip');
  const pills = document.getElementById('recentPills');
  const count = document.getElementById('recentCount');
  const total = recentBooks.length + recentChapters.length;

  if (total === 0) {
    strip.classList.remove('has-items');
    return;
  }
  strip.classList.add('has-items');
  count.textContent = `${total} item${total !== 1 ? 's' : ''}`;
  pills.innerHTML = '';

  recentBooks.forEach(b => {
    const pill = document.createElement('div');
    pill.className = 'recent-pill';
    pill.innerHTML = `
      <span class="pill-dot" style="background:${b.color || COLORS[0]}"></span>
      <span>${escHtml(b.title)}</span>
      <span class="pill-meta">book · ${timeAgo(b.createdAt)}</span>
    `;
    pills.appendChild(pill);
  });

  recentChapters.forEach(c => {
    const pill = document.createElement('div');
    pill.className = 'recent-pill';
    pill.innerHTML = `
      <span class="pill-dot" style="background:${c.bookColor || COLORS[0]}"></span>
      <span>${escHtml(c.name)}</span>
      <span class="pill-meta">in ${escHtml(c.bookTitle)} · ${timeAgo(c.createdAt)}</span>
    `;
    pills.appendChild(pill);
  });
}

function buildBookCard(book, cutoff) {
  const chapters = book.chapters || [];
  const total    = chapters.length;
  const done     = chapters.filter(c => c.done).length;
  const progress = total > 0 ? Math.round((done / total) * 100) : 0;
  const color    = book.color || COLORS[0];
  const isNew    = (book.createdAt || 0) > cutoff;

  const card = document.createElement('div');
  card.className = 'book-card' + (isNew ? ' is-new' : '');

  // Spine
  const spine = document.createElement('div');
  spine.className = 'book-card-spine';
  spine.style.background = color;
  card.appendChild(spine);

  // Header
  const header = document.createElement('div');
  header.className = 'book-card-header';
  header.innerHTML = `
    <div class="book-info">
      <div class="book-title">${escHtml(book.title)}</div>
      <div class="book-tags">
        <span class="book-genre">${escHtml(book.genre)}</span>
        ${isNew ? '<span class="book-new-tag">New</span>' : ''}
      </div>
    </div>
    <button class="book-delete-btn" title="Delete book">✕</button>
  `;
  header.querySelector('.book-delete-btn').addEventListener('click', () => deleteBook(book.id));
  card.appendChild(header);

  // Progress
  const prog = document.createElement('div');
  prog.className = 'book-progress-wrap';
  prog.innerHTML = `
    <div class="book-progress-label">
      <span>${done}/${total} chapters done</span>
      <span>${progress}%</span>
    </div>
    <div class="progress-bar-bg">
      <div class="progress-bar-fill" style="width:${progress}%;background:${progress===100?'#34d399':color}"></div>
    </div>
  `;
  card.appendChild(prog);

  // Chapters
  const list = document.createElement('div');
  list.className = 'chapter-list';
  if (chapters.length === 0) {
    list.innerHTML = `<p class="chapters-empty">No chapters yet</p>`;
  } else {
    chapters.forEach(ch => {
      const item = document.createElement('div');
      item.className = 'chapter-item';
      const chIsNew = ch.createdAt && ch.createdAt > cutoff;
      item.innerHTML = `
        <input type="checkbox" class="chapter-checkbox" ${ch.done ? 'checked' : ''}/>
        <span class="chapter-name ${ch.done ? 'done' : ''}">${escHtml(ch.name)}</span>
        ${chIsNew ? `<span class="chapter-time" style="color:var(--amber)">new</span>` : (ch.createdAt ? `<span class="chapter-time">${timeAgo(ch.createdAt)}</span>` : '')}
        <button class="chapter-delete-btn">✕</button>
      `;
      item.querySelector('.chapter-checkbox').addEventListener('change', () => toggleChapter(book.id, ch.id));
      item.querySelector('.chapter-delete-btn').addEventListener('click', () => deleteChapter(book.id, ch.id));
      list.appendChild(item);
    });
  }
  card.appendChild(list);

  // Footer
  const footer = document.createElement('div');
  footer.className = 'book-card-footer';
  const btn = document.createElement('button');
  btn.className = 'add-chapter-btn';
  btn.textContent = '+ Add Chapter';
  btn.addEventListener('click', () => openModal(book.id));
  footer.appendChild(btn);
  card.appendChild(footer);

  return card;
}

function updateStats() {
  document.getElementById('statBooks').textContent    = allBooks.length;
  document.getElementById('statChapters').textContent = allBooks.reduce((s,b) => s + (b.chapters||[]).length, 0);
  document.getElementById('statDone').textContent     = allBooks.reduce((s,b) => s + (b.chapters||[]).filter(c=>c.done).length, 0);
}

// ── Helpers ──
function timeAgo(ts) {
  if (!ts) return '';
  const diff = Date.now() - ts;
  const m = Math.floor(diff / 60000);
  const h = Math.floor(diff / 3600000);
  if (m < 1)  return 'just now';
  if (m < 60) return `${m}m ago`;
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h/24)}d ago`;
}

function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2600);
}

function shake(el) {
  el.style.borderColor = '#fb7185';
  el.style.animation = 'none';
  el.offsetHeight;
  el.style.animation = 'shakeX 0.4s ease';
  setTimeout(() => { el.style.borderColor = ''; el.style.animation = ''; }, 600);
  el.focus();
}

function genId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

function escHtml(s) {
  return String(s)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// CSS for shake (inject once)
const styleEl = document.createElement('style');
styleEl.textContent = `@keyframes shakeX {
  0%,100%{transform:translateX(0)} 20%,60%{transform:translateX(-6px)} 40%,80%{transform:translateX(6px)}
}`;
document.head.appendChild(styleEl);
