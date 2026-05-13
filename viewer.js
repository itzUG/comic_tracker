// =============================================
//   ComicForge — viewer.js (READ-ONLY)
//   Reads from Firebase Firestore only.
//   No write access.
// =============================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
  getFirestore, collection, onSnapshot
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

const SPINE_COLORS = [
  '#e8472a','#9b8ec4','#f0b429','#3dbf8a',
  '#4a90d9','#e86ba2','#5bc8af','#f76b1c'
];

// ── Real-time listener (read only) ──
onSnapshot(booksCol, (snapshot) => {
  let books = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
  books.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  renderAll(books);
  document.getElementById('loadingMsg').classList.add('hidden');
});

function renderAll(books) {
  const grid = document.getElementById('booksGrid');
  const emptyState = document.getElementById('emptyState');
  grid.innerHTML = '';

  if (books.length === 0) {
    emptyState.classList.add('visible');
  } else {
    emptyState.classList.remove('visible');
    books.forEach(book => grid.appendChild(buildBookCard(book)));
  }

  document.getElementById('statBooks').textContent    = books.length;
  document.getElementById('statChapters').textContent = books.reduce((s,b) => s + b.chapters.length, 0);
  document.getElementById('statDone').textContent     = books.reduce((s,b) => s + b.chapters.filter(c=>c.done).length, 0);
}

function buildBookCard(book) {
  const total    = book.chapters.length;
  const done     = book.chapters.filter(c => c.done).length;
  const progress = total > 0 ? Math.round((done / total) * 100) : 0;
  const color    = SPINE_COLORS[(book.colorIndex || 0) % SPINE_COLORS.length];

  const card = document.createElement('div');
  card.className = 'book-card';

  // Spine
  const spine = document.createElement('div');
  spine.className = 'book-card-spine';
  spine.style.background = color;
  card.appendChild(spine);

  // Header (no delete button)
  const header = document.createElement('div');
  header.className = 'book-card-header';
  header.innerHTML = `
    <div class="book-info">
      <div class="book-title">${escHtml(book.title)}</div>
      <span class="book-genre">${escHtml(book.genre)}</span>
    </div>
  `;
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

  // Chapters (read-only checkboxes, no delete)
  const list = document.createElement('div');
  list.className = 'chapter-list';
  if (book.chapters.length === 0) {
    list.innerHTML = `<p class="chapters-empty">No chapters added yet.</p>`;
  } else {
    book.chapters.forEach(ch => {
      const item = document.createElement('div');
      item.className = 'chapter-item';
      item.innerHTML = `
        <input type="checkbox" class="chapter-checkbox readonly" ${ch.done ? 'checked' : ''} title="Read-only"/>
        <span class="chapter-name ${ch.done ? 'done' : ''}">${escHtml(ch.name)}</span>
      `;
      list.appendChild(item);
    });
  }
  card.appendChild(list);

  // Footer — viewer message instead of add button
  const footer = document.createElement('div');
  footer.className = 'book-card-footer';
  footer.innerHTML = `<p style="font-size:0.78rem;color:#b0a8be;text-align:center;font-style:italic;">👁 View only</p>`;
  card.appendChild(footer);

  return card;
}

function escHtml(str) {
  return String(str)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
