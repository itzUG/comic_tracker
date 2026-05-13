// =============================================
//   ComicForge — script.js
//   All data is saved in localStorage.
//   Structure: { books: [ { id, title, genre, chapters: [{id, name, done}] } ] }
// =============================================

// ── Palette for book card spine colours (cycles) ──
const SPINE_COLORS = [
  '#e8472a', '#9b8ec4', '#f0b429', '#3dbf8a',
  '#4a90d9', '#e86ba2', '#5bc8af', '#f76b1c'
];

// ── State ──
let data = loadData();
let activeBookId = null; // which book the modal is editing

// ── On Page Load ──
renderAll();

// ── Event Listeners ──

// Add Book
document.getElementById('addBookBtn').addEventListener('click', addBook);
document.getElementById('bookTitleInput').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') addBook();
});

// Reset All
document.getElementById('resetBtn').addEventListener('click', () => {
  if (confirm('Reset everything? This will delete all books and chapters.')) {
    data = { books: [] };
    saveData();
    renderAll();
  }
});

// Modal: Close
document.getElementById('modalClose').addEventListener('click', closeModal);
document.getElementById('modalOverlay').addEventListener('click', (e) => {
  if (e.target === document.getElementById('modalOverlay')) closeModal();
});

// Modal: Add Chapter
document.getElementById('addChapterBtn').addEventListener('click', addChapter);
document.getElementById('chapterInput').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') addChapter();
});

// ── Functions ──

function loadData() {
  try {
    const stored = localStorage.getItem('comicforge_data');
    return stored ? JSON.parse(stored) : { books: [] };
  } catch {
    return { books: [] };
  }
}

function saveData() {
  localStorage.setItem('comicforge_data', JSON.stringify(data));
}

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function addBook() {
  const titleInput = document.getElementById('bookTitleInput');
  const genreInput = document.getElementById('bookGenreInput');

  const title = titleInput.value.trim();
  if (!title) {
    titleInput.focus();
    titleInput.style.borderColor = '#e8472a';
    setTimeout(() => titleInput.style.borderColor = '', 1000);
    return;
  }

  const book = {
    id: generateId(),
    title,
    genre: genreInput.value.trim() || 'Uncategorized',
    chapters: [],
    colorIndex: data.books.length % SPINE_COLORS.length
  };

  data.books.unshift(book); // newest first
  saveData();

  titleInput.value = '';
  genreInput.value = '';
  titleInput.focus();

  renderAll();
}

function deleteBook(bookId) {
  if (!confirm('Delete this book and all its chapters?')) return;
  data.books = data.books.filter(b => b.id !== bookId);
  saveData();
  renderAll();
}

function openModal(bookId) {
  activeBookId = bookId;
  const book = data.books.find(b => b.id === bookId);
  document.getElementById('modalBookTitle').textContent = book.title;
  document.getElementById('chapterInput').value = '';
  document.getElementById('modalOverlay').classList.add('open');
  setTimeout(() => document.getElementById('chapterInput').focus(), 80);
}

function closeModal() {
  document.getElementById('modalOverlay').classList.remove('open');
  activeBookId = null;
}

function addChapter() {
  if (!activeBookId) return;
  const input = document.getElementById('chapterInput');
  const name = input.value.trim();
  if (!name) {
    input.focus();
    input.style.borderColor = '#e8472a';
    setTimeout(() => input.style.borderColor = '', 1000);
    return;
  }

  const book = data.books.find(b => b.id === activeBookId);
  if (!book) return;

  book.chapters.push({ id: generateId(), name, done: false });
  saveData();
  input.value = '';
  input.focus();

  // Re-render just this book card + stats
  renderBookCard(book);
  updateStats();
}

function toggleChapter(bookId, chapterId) {
  const book = data.books.find(b => b.id === bookId);
  if (!book) return;
  const ch = book.chapters.find(c => c.id === chapterId);
  if (!ch) return;
  ch.done = !ch.done;
  saveData();
  renderBookCard(book);
  updateStats();
}

function deleteChapter(bookId, chapterId) {
  const book = data.books.find(b => b.id === bookId);
  if (!book) return;
  book.chapters = book.chapters.filter(c => c.id !== chapterId);
  saveData();
  renderBookCard(book);
  updateStats();
}

// ── Render All ──
function renderAll() {
  const grid = document.getElementById('booksGrid');
  const emptyState = document.getElementById('emptyState');

  grid.innerHTML = '';

  if (data.books.length === 0) {
    emptyState.classList.add('visible');
  } else {
    emptyState.classList.remove('visible');
    data.books.forEach(book => {
      const card = buildBookCard(book);
      grid.appendChild(card);
    });
  }

  updateStats();
}

// Re-render a single book card in place (for chapter changes)
function renderBookCard(book) {
  const existing = document.querySelector(`[data-book-id="${book.id}"]`);
  if (!existing) return;
  const newCard = buildBookCard(book);
  existing.replaceWith(newCard);
}

function buildBookCard(book) {
  const totalChapters = book.chapters.length;
  const doneChapters  = book.chapters.filter(c => c.done).length;
  const progress      = totalChapters > 0 ? Math.round((doneChapters / totalChapters) * 100) : 0;
  const spineColor    = SPINE_COLORS[book.colorIndex % SPINE_COLORS.length];

  const card = document.createElement('div');
  card.className = 'book-card';
  card.dataset.bookId = book.id;

  // Spine
  const spine = document.createElement('div');
  spine.className = 'book-card-spine';
  spine.style.background = spineColor;
  card.appendChild(spine);

  // Header
  const header = document.createElement('div');
  header.className = 'book-card-header';
  header.innerHTML = `
    <div class="book-info">
      <div class="book-title">${escapeHtml(book.title)}</div>
      <span class="book-genre">${escapeHtml(book.genre)}</span>
    </div>
    <button class="book-delete-btn" title="Delete book">🗑</button>
  `;
  header.querySelector('.book-delete-btn').addEventListener('click', () => deleteBook(book.id));
  card.appendChild(header);

  // Progress
  const progressWrap = document.createElement('div');
  progressWrap.className = 'book-progress-wrap';
  progressWrap.innerHTML = `
    <div class="book-progress-label">
      <span>Progress</span>
      <span>${doneChapters}/${totalChapters} chapters</span>
    </div>
    <div class="progress-bar-bg">
      <div class="progress-bar-fill" style="width:${progress}%"></div>
    </div>
  `;
  card.appendChild(progressWrap);

  // Chapter list
  const list = document.createElement('div');
  list.className = 'chapter-list';

  if (book.chapters.length === 0) {
    list.innerHTML = `<p class="chapters-empty">No chapters yet — add one below!</p>`;
  } else {
    book.chapters.forEach(ch => {
      const item = document.createElement('div');
      item.className = 'chapter-item';
      item.innerHTML = `
        <input
          type="checkbox"
          class="chapter-checkbox"
          data-id="${ch.id}"
          ${ch.done ? 'checked' : ''}
          title="Mark as done"
        />
        <span class="chapter-name ${ch.done ? 'done' : ''}">${escapeHtml(ch.name)}</span>
        <button class="chapter-delete-btn" title="Delete chapter">✕</button>
      `;

      // Checkbox toggle
      item.querySelector('.chapter-checkbox').addEventListener('change', () => {
        toggleChapter(book.id, ch.id);
      });

      // Delete chapter
      item.querySelector('.chapter-delete-btn').addEventListener('click', () => {
        deleteChapter(book.id, ch.id);
      });

      list.appendChild(item);
    });
  }
  card.appendChild(list);

  // Footer
  const footer = document.createElement('div');
  footer.className = 'book-card-footer';
  const addBtn = document.createElement('button');
  addBtn.className = 'add-chapter-btn';
  addBtn.textContent = '+ Add Chapter';
  addBtn.addEventListener('click', () => openModal(book.id));
  footer.appendChild(addBtn);
  card.appendChild(footer);

  return card;
}

function updateStats() {
  const totalBooks    = data.books.length;
  const totalChapters = data.books.reduce((s, b) => s + b.chapters.length, 0);
  const totalDone     = data.books.reduce((s, b) => s + b.chapters.filter(c => c.done).length, 0);

  document.getElementById('statBooks').textContent    = totalBooks;
  document.getElementById('statChapters').textContent = totalChapters;
  document.getElementById('statDone').textContent     = totalDone;
}

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
