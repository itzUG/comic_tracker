// =============================================
//   ComicForge — script.js (ADMIN)
//   Reads & writes to Firebase Firestore.
// =============================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
  getFirestore, collection, doc,
  onSnapshot, addDoc, updateDoc, deleteDoc,
  arrayUnion, arrayRemove, setDoc
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// ── Firebase Config ──
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

// ── Spine colours ──
const SPINE_COLORS = [
  '#e8472a','#9b8ec4','#f0b429','#3dbf8a',
  '#4a90d9','#e86ba2','#5bc8af','#f76b1c'
];

let allBooks = [];   // local mirror of Firestore data
let activeBookId = null;

// ── Real-time listener ──
onSnapshot(booksCol, (snapshot) => {
  allBooks = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
  // Sort by createdAt descending (newest first)
  allBooks.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  renderAll();
  document.getElementById('loadingMsg').classList.add('hidden');
});

// ── Event Listeners ──
document.getElementById('addBookBtn').addEventListener('click', addBook);
document.getElementById('bookTitleInput').addEventListener('keydown', e => { if (e.key === 'Enter') addBook(); });
document.getElementById('resetBtn').addEventListener('click', async () => {
  if (!confirm('Delete ALL books and chapters? This cannot be undone.')) return;
  for (const book of allBooks) {
    await deleteDoc(doc(db, 'books', book.id));
  }
  showToast('🗑️ All data cleared!');
});
document.getElementById('copyViewLink').addEventListener('click', () => {
  // Build viewer URL based on current page location
  const viewUrl = window.location.href.replace('index.html', 'view.html').replace(/\/$/, '/view.html');
  navigator.clipboard.writeText(viewUrl).then(() => showToast('🔗 Viewer link copied!'));
});
document.getElementById('modalClose').addEventListener('click', closeModal);
document.getElementById('modalOverlay').addEventListener('click', e => {
  if (e.target === document.getElementById('modalOverlay')) closeModal();
});
document.getElementById('addChapterBtn').addEventListener('click', addChapter);
document.getElementById('chapterInput').addEventListener('keydown', e => { if (e.key === 'Enter') addChapter(); });

// ── Add Book ──
async function addBook() {
  const titleInput = document.getElementById('bookTitleInput');
  const genreInput = document.getElementById('bookGenreInput');
  const title = titleInput.value.trim();
  if (!title) {
    titleInput.style.borderColor = '#e8472a';
    setTimeout(() => titleInput.style.borderColor = '', 1000);
    titleInput.focus();
    return;
  }
  await addDoc(booksCol, {
    title,
    genre: genreInput.value.trim() || 'Uncategorized',
    chapters: [],
    colorIndex: allBooks.length % SPINE_COLORS.length,
    createdAt: Date.now()
  });
  titleInput.value = '';
  genreInput.value = '';
  titleInput.focus();
  showToast('📖 Book added!');
}

// ── Delete Book ──
async function deleteBook(bookId) {
  if (!confirm('Delete this book and all its chapters?')) return;
  await deleteDoc(doc(db, 'books', bookId));
  showToast('🗑️ Book deleted.');
}

// ── Modal ──
function openModal(bookId) {
  activeBookId = bookId;
  const book = allBooks.find(b => b.id === bookId);
  document.getElementById('modalBookTitle').textContent = book.title;
  document.getElementById('chapterInput').value = '';
  document.getElementById('modalOverlay').classList.add('open');
  setTimeout(() => document.getElementById('chapterInput').focus(), 80);
}
function closeModal() {
  document.getElementById('modalOverlay').classList.remove('open');
  activeBookId = null;
}

// ── Add Chapter ──
async function addChapter() {
  if (!activeBookId) return;
  const input = document.getElementById('chapterInput');
  const name = input.value.trim();
  if (!name) {
    input.style.borderColor = '#e8472a';
    setTimeout(() => input.style.borderColor = '', 1000);
    input.focus();
    return;
  }
  const newChapter = { id: generateId(), name, done: false };
  const bookRef = doc(db, 'books', activeBookId);
  await updateDoc(bookRef, { chapters: arrayUnion(newChapter) });
  input.value = '';
  input.focus();
  showToast('✅ Chapter added!');
}

// ── Toggle Chapter Done ──
async function toggleChapter(bookId, chapterId) {
  const book = allBooks.find(b => b.id === bookId);
  if (!book) return;
  const updatedChapters = book.chapters.map(ch =>
    ch.id === chapterId ? { ...ch, done: !ch.done } : ch
  );
  await updateDoc(doc(db, 'books', bookId), { chapters: updatedChapters });
}

// ── Delete Chapter ──
async function deleteChapter(bookId, chapterId) {
  const book = allBooks.find(b => b.id === bookId);
  if (!book) return;
  const updatedChapters = book.chapters.filter(ch => ch.id !== chapterId);
  await updateDoc(doc(db, 'books', bookId), { chapters: updatedChapters });
  showToast('🗑️ Chapter removed.');
}

// ── Render All ──
function renderAll() {
  const grid = document.getElementById('booksGrid');
  const emptyState = document.getElementById('emptyState');
  grid.innerHTML = '';

  if (allBooks.length === 0) {
    emptyState.classList.add('visible');
  } else {
    emptyState.classList.remove('visible');
    allBooks.forEach(book => grid.appendChild(buildBookCard(book)));
  }
  updateStats();
}

function buildBookCard(book) {
  const total    = book.chapters.length;
  const done     = book.chapters.filter(c => c.done).length;
  const progress = total > 0 ? Math.round((done / total) * 100) : 0;
  const color    = SPINE_COLORS[(book.colorIndex || 0) % SPINE_COLORS.length];

  const card = document.createElement('div');
  card.className = 'book-card';
  card.dataset.bookId = book.id;

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
      <span class="book-genre">${escHtml(book.genre)}</span>
    </div>
    <button class="book-delete-btn" title="Delete book">🗑</button>
  `;
  header.querySelector('.book-delete-btn').addEventListener('click', () => deleteBook(book.id));
  card.appendChild(header);

  // Progress
  const prog = document.createElement('div');
  prog.className = 'book-progress-wrap';
  prog.innerHTML = `
    <div class="book-progress-label">
      <span>Progress</span><span>${done}/${total} chapters</span>
    </div>
    <div class="progress-bar-bg"><div class="progress-bar-fill" style="width:${progress}%"></div></div>
  `;
  card.appendChild(prog);

  // Chapters
  const list = document.createElement('div');
  list.className = 'chapter-list';
  if (book.chapters.length === 0) {
    list.innerHTML = `<p class="chapters-empty">No chapters yet — add one below!</p>`;
  } else {
    book.chapters.forEach(ch => {
      const item = document.createElement('div');
      item.className = 'chapter-item';
      item.innerHTML = `
        <input type="checkbox" class="chapter-checkbox" ${ch.done ? 'checked' : ''} title="Mark as done"/>
        <span class="chapter-name ${ch.done ? 'done' : ''}">${escHtml(ch.name)}</span>
        <button class="chapter-delete-btn" title="Delete">✕</button>
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
  document.getElementById('statChapters').textContent = allBooks.reduce((s,b) => s + b.chapters.length, 0);
  document.getElementById('statDone').textContent     = allBooks.reduce((s,b) => s + b.chapters.filter(c=>c.done).length, 0);
}

function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2500);
}

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function escHtml(str) {
  return String(str)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
