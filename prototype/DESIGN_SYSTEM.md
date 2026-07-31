# UniBoard Design System — Reusable Aesthetic Patterns

> Extracted from `dashboard.html` for use in all UniBoard pages (timetable, courses, deadlines, predict, digest).

---

## 1. CSS Variables & Color System

```css
:root {
  /* Accent Colors (Brand) */
  --orange:        #d97757;    /* Primary action, danger */
  --orange-soft:   rgba(217,119,87,0.11);
  --blue:          #6a9bcc;    /* Secondary, info */
  --blue-soft:     rgba(106,155,204,0.11);
  --green:         #788c5d;    /* Success, positive */
  --green-soft:    rgba(120,140,93,0.11);
  --amber:         #b08968;    /* Alerts, neutral */
  --amber-soft:    rgba(176,137,104,0.11);

  /* Neutral Palette */
  --dark:          #e8ddd0;    /* Dark sidebar bg */
  --cream:         #faf9f5;    /* Page background */
  --card-bg:       #f6f5f0;    /* Card background */
  --card-bg-hover: #efede6;    /* Card hover state */
  --card-border:   #e8e5dd;

  /* Text Colors (WCAG AA compliant) */
  --text-1:        #2d2d2a;    /* Primary text */
  --text-2:        #6b6b65;    /* Secondary text */
  --text-3:        #9b9b94;    /* Tertiary text, disabled */

  /* UI */
  --divider:       #eae7e0;    /* Table borders, separators */

  /* Layout */
  --sidebar-w:          68px;      /* Collapsed sidebar */
  --sidebar-w-expanded: 224px;     /* Expanded sidebar */
  --right-panel-w:      300px;     /* Right panel */
  --header-h:           56px;      /* Header height */

  /* Spacing & Radius */
  --radius:    14px;   /* Card border radius */
  --radius-sm: 8px;    /* Button, input radius */

  /* Shadows */
  --shadow:       0 1px 3px rgba(20,20,19,.04), 0 4px 14px rgba(20,20,19,.025);
  --shadow-hover: 0 2px 8px rgba(20,20,19,.06), 0 8px 24px rgba(20,20,19,.04);

  /* Animations */
  --ease:      0.28s cubic-bezier(.4,0,.2,1);   /* Standard transition */
  --ease-fast: 0.15s ease;                       /* Fast feedback */
}
```

**Font Stack:**
```css
html { font-size: 15px; }
body { font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif; }
h1, h2, h3, h4, h5 { font-family: 'Source Serif 4', Georgia, serif; }
```

---

## 2. Background Effects (Paper + Ruled Lines)

### Paper Grain Overlay (Fixed)
```css
/* Add to any page's <body> */
body::before {
  content: '';
  position: fixed; inset: 0; z-index: 9999;
  pointer-events: none; opacity: 0.12;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 300 300' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.82' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.035'/%3E%3C/svg%3E");
}
```

### Ruled Lines Background (Behind content)
```css
body::after {
  content: '';
  position: fixed; inset: 0; z-index: -1;
  pointer-events: none;
  background-image: repeating-linear-gradient(
    0deg,
    transparent, transparent 31px,
    rgba(139,115,85,0.02) 31px,
    rgba(139,115,85,0.02) 32px
  );
}
```

---

## 3. Card Component with Hand-Drawn Borders

### HTML Structure
```html
<div class="card" data-hand-border>
  <div class="card-header">
    <div class="card-title">
      <i data-lucide="icon-name" class="card-title-icon"></i>
      Title Text
    </div>
    <div class="card-badge">Badge</div>
  </div>
  <!-- Card content goes here -->
</div>
```

### CSS
```css
.card, .stat-card {
  background: var(--card-bg);
  border: none;
  border-radius: var(--radius);
  padding: 22px 30px;
  box-shadow: var(--shadow);
  transition: box-shadow var(--ease), transform var(--ease);
  position: relative;
  overflow: visible;
}
.card:hover, .stat-card:hover {
  box-shadow: var(--shadow-hover);
  transform: translateY(-1px);
}

/* Hand-drawn border SVG overlay (added by JS) */
.hand-border-svg {
  position: absolute; inset: 0;
  width: 100%; height: 100%;
  pointer-events: none; z-index: 2;
  overflow: visible;
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}
.card-title {
  font-size: 0.95rem;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 8px;
}
.card-title-icon { color: var(--orange); }
.card-badge {
  font-size: 0.7rem;
  padding: 3px 9px;
  border-radius: 6px;
  font-weight: 600;
  background: var(--orange-soft);
  color: var(--orange);
}
```

### JavaScript (Hand-Drawn Borders)
```javascript
// Call this after DOM is ready
requestAnimationFrame(function() {
  requestAnimationFrame(function() {
    document.querySelectorAll('[data-hand-border]').forEach(function(el) {
      var w = el.offsetWidth, h = el.offsetHeight;
      var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.setAttribute('class', 'hand-border-svg');
      svg.setAttribute('viewBox', '-4 -4 ' + (w + 8) + ' ' + (h + 8));
      el.prepend(svg);

      var rc = rough.svg(svg);
      var node = rc.rectangle(0, 0, w, h, {
        stroke: '#d0cdc4',
        strokeWidth: 0.8,
        roughness: 1.0,
        bowing: 1,
        fill: 'none'
      });
      svg.appendChild(node);
    });
  });
});
```

---

## 4. Sidebar Navigation

### HTML Structure
```html
<aside class="sidebar">
  <div class="sidebar-logo">
    <div class="logo-mark">U</div>
    <span class="logo-text">UniBoard</span>
  </div>
  <div class="sidebar-rule"></div>
  <ul class="sidebar-nav">
    <li><a class="nav-item active" href="#">
      <i data-lucide="icon-name" class="nav-icon"></i>
      <span class="nav-label">Label</span>
    </a></li>
  </ul>
  <div class="sidebar-bottom">
    <!-- Bottom nav items -->
  </div>
</aside>
```

### CSS
```css
.sidebar {
  position: fixed; inset: 0 auto 0 0;
  width: var(--sidebar-w);
  background: var(--dark);
  display: flex; flex-direction: column;
  padding: 20px 0; z-index: 100;
  transition: width var(--ease);
  overflow: hidden;
  box-shadow: 2px 0 16px rgba(20,20,19,.06);
}
.sidebar:hover { width: var(--sidebar-w-expanded); }

.sidebar-logo {
  display: flex; align-items: center; gap: 12px;
  padding: 6px 17px 24px;
  white-space: nowrap; width: 100%;
}

.logo-mark {
  width: 34px; height: 34px;
  background: var(--orange); border-radius: 9px;
  display: grid; place-items: center; flex-shrink: 0;
  font-family: 'Source Serif 4', serif;
  font-weight: 700; font-size: 17px; color: #fff;
}

.logo-text {
  font-family: 'Source Serif 4', serif;
  font-size: 1.18rem; font-weight: 700;
  color: #4a3f34; opacity: 0;
  transition: opacity var(--ease);
}
.sidebar:hover .logo-text { opacity: 1; }

.sidebar-rule {
  width: 26px; height: 1px;
  background: rgba(60,50,40,.1);
  margin: 0 auto 10px;
  transition: width var(--ease);
}
.sidebar:hover .sidebar-rule { width: calc(100% - 44px); }

.sidebar-nav {
  list-style: none; width: 100%; flex: 1;
  display: flex; flex-direction: column; gap: 2px;
  padding: 0 10px;
}

.nav-item {
  display: flex; align-items: center; gap: 14px;
  padding: 11px 14px; border-radius: 10px;
  color: rgba(60,50,40,.65); cursor: pointer;
  transition: all var(--ease-fast);
  white-space: nowrap; overflow: hidden;
  text-decoration: none;
}
.nav-item:hover { background: rgba(60,50,40,.06); color: rgba(60,50,40,.75); }
.nav-item.active { background: rgba(217,119,87,.18); color: var(--orange); }

.nav-icon { flex-shrink: 0; width: 20px; height: 20px; }
.nav-label {
  font-size: 0.84rem; font-weight: 500;
  opacity: 0; transition: opacity var(--ease);
}
.sidebar:hover .nav-label { opacity: 1; }
```

---

## 5. Header with Dropdowns

### HTML Structure
```html
<header class="header">
  <div class="header-brand">UniBoard</div>
  <div class="header-right">
    <div class="search-bar">
      <i data-lucide="search" class="search-icon"></i>
      <input type="text" placeholder="Search&hellip;">
    </div>
    <div class="hdr-dropdown-wrap">
      <button class="hdr-btn" id="notif-btn">
        <i data-lucide="bell"></i>
        <span class="notif-dot"></span>
      </button>
      <div class="hdr-dropdown notif-panel" id="notif-panel">
        <div class="dropdown-title">Title</div>
        <div class="dropdown-list">
          <!-- Items -->
        </div>
        <div class="dropdown-footer">View all</div>
      </div>
    </div>
    <div class="hdr-dropdown-wrap">
      <div class="avatar" id="avatar-btn">RQ</div>
      <div class="hdr-dropdown avatar-panel" id="avatar-panel">
        <!-- Avatar menu -->
      </div>
    </div>
  </div>
</header>
```

### CSS
```css
.header {
  position: sticky; top: 0; z-index: 50;
  height: var(--header-h);
  background: rgba(250,249,245,.82);
  backdrop-filter: blur(18px);
  -webkit-backdrop-filter: blur(18px);
  border-bottom: 1px solid var(--divider);
  display: flex; align-items: center;
  justify-content: space-between;
  padding: 0 32px;
}

.header-brand {
  font-family: 'Source Serif 4', serif;
  font-size: 0.95rem; font-weight: 600; color: var(--text-2);
}

.header-right { display: flex; align-items: center; gap: 8px; }

.search-bar {
  display: flex; align-items: center; gap: 8px;
  background: var(--card-bg); border: 1px solid var(--card-border);
  border-radius: 10px; padding: 7px 14px; width: 220px;
  transition: all var(--ease-fast);
}
.search-bar:focus-within {
  border-color: var(--orange);
  box-shadow: 0 0 0 3px var(--orange-soft);
  background: #fff;
}
.search-bar input {
  border: none; background: none; outline: none;
  font-family: inherit; font-size: 0.82rem;
  color: var(--text-1); width: 100%;
}
.search-bar input::placeholder { color: var(--text-3); }
.search-icon { color: var(--text-3); flex-shrink: 0; }

.hdr-btn {
  width: 36px; height: 36px; border-radius: 10px;
  border: 1px solid var(--card-border); background: var(--card-bg);
  display: grid; place-items: center; cursor: pointer;
  color: var(--text-2); transition: all var(--ease-fast);
  position: relative;
}
.hdr-btn:hover { background: var(--card-bg-hover); }

.notif-dot {
  position: absolute; top: 6px; right: 6px;
  width: 7px; height: 7px; background: var(--orange);
  border-radius: 50%; border: 1.5px solid var(--card-bg);
}

.avatar {
  width: 34px; height: 34px; border-radius: 10px;
  background: linear-gradient(135deg, var(--orange), #e8956e);
  display: grid; place-items: center;
  color: #fff; font-weight: 600; font-size: 12px;
  cursor: pointer; margin-left: 4px;
}

/* Dropdowns */
.hdr-dropdown-wrap { position: relative; }

.hdr-dropdown {
  display: none; position: absolute;
  top: calc(100% + 12px); right: 0;
  background: #fff; border-radius: 12px;
  border: 1.5px solid var(--card-border);
  box-shadow: 0 8px 32px rgba(20,20,19,.1), 0 2px 6px rgba(20,20,19,.04);
  z-index: 200; overflow: hidden;
  animation: dropIn .25s cubic-bezier(.16,1,.3,1) forwards;
}

/* Top arrow notch on dropdown */
.hdr-dropdown::before {
  content: ''; position: absolute;
  top: -7px; right: 14px;
  width: 12px; height: 12px;
  background: #fff;
  border-top: 1.5px solid var(--card-border);
  border-left: 1.5px solid var(--card-border);
  transform: rotate(45deg);
  z-index: 1;
}

@keyframes dropIn {
  from { opacity: 0; transform: translateY(-6px); }
  to   { opacity: 1; transform: translateY(0); }
}

.hdr-dropdown.show { display: block; }

.notif-panel { width: 320px; }
.avatar-panel { width: 240px; }

.dropdown-title {
  font-family: 'Source Serif 4', serif;
  font-size: 0.88rem; font-weight: 600;
  padding: 14px 16px 10px; color: var(--text-1);
}

.dropdown-list {
  max-height: 260px; overflow-y: auto; overflow-x: hidden;
}

.dropdown-item {
  display: flex; gap: 10px; align-items: flex-start;
  padding: 10px 16px;
  transition: background var(--ease-fast);
  cursor: pointer;
}
.dropdown-item:hover { background: var(--card-bg-hover); }
.dropdown-item.unread { background: rgba(217,119,87,.05); }
.dropdown-item.unread:hover { background: rgba(217,119,87,.09); }

.dropdown-icon {
  width: 28px; height: 28px; border-radius: 7px;
  display: grid; place-items: center; flex-shrink: 0;
}

.dropdown-text {
  font-size: 0.78rem; color: var(--text-2);
  line-height: 1.4;
}
.dropdown-text strong { color: var(--text-1); font-weight: 600; }

.dropdown-time {
  font-size: 0.66rem; color: var(--text-3);
  margin-top: 1px;
}

.dropdown-footer {
  padding: 10px 16px; text-align: center;
  font-size: 0.76rem; font-weight: 600;
  color: var(--orange);
  border-top: 1px solid var(--divider);
  cursor: pointer; transition: background var(--ease-fast);
}
.dropdown-footer:hover { background: var(--card-bg-hover); }

/* Avatar dropdown panel */
.avatar-panel-header {
  display: flex; gap: 12px; align-items: center;
  padding: 16px;
}

.avatar-panel-avatar {
  width: 40px; height: 40px; border-radius: 10px;
  background: linear-gradient(135deg, var(--orange), #e8956e);
  display: grid; place-items: center;
  color: #fff; font-family: 'Source Serif 4', serif;
  font-weight: 700; font-size: 17px; flex-shrink: 0;
}

.avatar-panel-name { font-weight: 600; font-size: 0.88rem; }
.avatar-panel-email { font-size: 0.72rem; color: var(--text-3); }

.dropdown-divider {
  height: 1px; background: var(--divider);
  margin: 4px 0;
}

.dropdown-menu-item {
  display: flex; align-items: center; gap: 10px;
  padding: 9px 16px; font-size: 0.82rem;
  color: var(--text-2); text-decoration: none;
  transition: background var(--ease-fast);
}
.dropdown-menu-item:hover {
  background: var(--card-bg-hover);
  color: var(--text-1);
}
.dropdown-menu-item.logout { color: #c45; }
.dropdown-menu-item.logout:hover { background: rgba(204,68,85,.05); }
```

### JavaScript (Dropdown Toggle)
```javascript
(function() {
  var notifPanel = document.getElementById('notif-panel');
  var avatarPanel = document.getElementById('avatar-panel');

  var notifWrap = notifPanel.parentElement;
  var avatarWrap = avatarPanel.parentElement;

  function toggle(panel) {
    var isOpen = panel.classList.contains('show');
    document.querySelectorAll('.hdr-dropdown').forEach(function(d) {
      d.classList.remove('show');
    });
    if (!isOpen) panel.classList.add('show');
  }

  notifWrap.addEventListener('click', function(e) {
    if (e.target.closest('.hdr-dropdown')) return;
    e.stopPropagation();
    toggle(notifPanel);
  });

  avatarWrap.addEventListener('click', function(e) {
    if (e.target.closest('.hdr-dropdown')) return;
    e.stopPropagation();
    toggle(avatarPanel);
  });

  document.addEventListener('click', function() {
    document.querySelectorAll('.hdr-dropdown').forEach(function(d) {
      d.classList.remove('show');
    });
  });

  document.querySelectorAll('.hdr-dropdown').forEach(function(d) {
    d.addEventListener('click', function(e) { e.stopPropagation(); });
  });
})();
```

---

## 6. Right Panel (Profile, Calendar, Activity)

### HTML Structure
```html
<div class="right-panel">
  <!-- Profile Card -->
  <div class="card profile-card anim d8" data-hand-border>
    <div class="profile-avatar">R</div>
    <div class="profile-name">User Name</div>
    <div class="profile-detail">CS Year 3</div>
    <div class="profile-stats-grid">
      <div class="pstat">
        <div class="pstat-val">4</div>
        <div class="pstat-lbl">Courses</div>
      </div>
      <div class="pstat">
        <div class="pstat-val">24</div>
        <div class="pstat-lbl">Credit Pts</div>
      </div>
    </div>
  </div>

  <!-- Calendar Card -->
  <div class="card anim d9" style="padding:16px 18px" data-hand-border>
    <div class="cal-nav">
      <button class="cal-btn"><i data-lucide="chevron-left"></i></button>
      <div class="cal-month">March 2026</div>
      <button class="cal-btn"><i data-lucide="chevron-right"></i></button>
    </div>
    <div class="cal-grid">
      <!-- Calendar grid: 7x6 -->
    </div>
  </div>

  <!-- Activity Card -->
  <div class="card anim d10" style="padding:18px" data-hand-border>
    <div class="card-title" style="margin-bottom:14px">
      <i data-lucide="activity" class="card-title-icon"></i>
      Recent Activity
    </div>
    <div class="act-list">
      <!-- Activity items -->
    </div>
  </div>
</div>
```

### CSS
```css
.right-panel {
  width: var(--right-panel-w); flex-shrink: 0;
  display: flex; flex-direction: column; gap: 18px;
  position: sticky; top: calc(var(--header-h) + 28px);
  align-self: flex-start;
  max-height: calc(100vh - var(--header-h) - 56px);
  overflow-y: auto;
  overflow-x: hidden;
}

/* Profile Card */
.profile-card { text-align: center; padding: 24px 20px; }

.profile-avatar {
  width: 54px; height: 54px; border-radius: 14px;
  background: linear-gradient(135deg, var(--orange), #e8956e);
  display: grid; place-items: center;
  color: #fff; font-family: 'Source Serif 4', serif;
  font-weight: 700; font-size: 22px;
  margin: 0 auto 12px;
  box-shadow: 0 2px 10px rgba(217,119,87,.25);
}

.profile-name {
  font-family: 'Source Serif 4', serif;
  font-size: 1.02rem; font-weight: 600;
  margin-bottom: 2px;
}

.profile-detail {
  font-size: 0.76rem; color: var(--text-3);
}

.profile-stats-grid {
  display: grid; grid-template-columns: 1fr 1fr;
  gap: 8px; margin-top: 16px;
}

.pstat {
  background: rgba(250,249,245,.55);
  border: 1px solid var(--card-border);
  border-radius: var(--radius-sm);
  padding: 10px 6px;
}

.pstat-val {
  font-family: 'Source Serif 4', serif;
  font-size: 1.12rem; font-weight: 700;
}

.pstat-lbl {
  font-size: 0.66rem; color: var(--text-3);
  text-transform: uppercase; letter-spacing: 0.04em;
}

/* Calendar */
.cal-nav {
  display: flex; align-items: center;
  justify-content: space-between; margin-bottom: 10px;
}

.cal-month {
  font-family: 'Source Serif 4', serif;
  font-weight: 600; font-size: 0.88rem;
}

.cal-btn {
  background: none; border: none; cursor: pointer;
  color: var(--text-3); padding: 4px; border-radius: 6px;
  transition: all var(--ease-fast);
  display: grid; place-items: center;
}
.cal-btn:hover { background: var(--card-bg-hover); color: var(--text-1); }

.cal-grid {
  display: grid; grid-template-columns: repeat(7, 1fr);
  gap: 1px; text-align: center;
}

.cal-h {
  font-size: 0.62rem; font-weight: 600;
  color: var(--text-3); padding: 4px 0;
  text-transform: uppercase;
}

.cal-d {
  font-size: 0.74rem; padding: 5px 0;
  border-radius: 6px; color: var(--text-2);
}
.cal-d.today {
  background: var(--orange); color: #fff;
  font-weight: 600;
}
.cal-d.has-dl {
  background: var(--orange-soft); color: var(--orange);
  font-weight: 600;
}
.cal-d.muted { color: var(--text-3); opacity: 0.35; }

/* Activity */
.act-list { display: flex; flex-direction: column; gap: 14px; }

.act-item { display: flex; gap: 10px; align-items: flex-start; }

.act-icon {
  width: 30px; height: 30px; border-radius: 8px;
  display: grid; place-items: center; flex-shrink: 0;
}
.act-icon.grade { background: var(--green-soft); color: var(--green); }
.act-icon.discussion { background: var(--blue-soft); color: var(--blue); }
.act-icon.deadline { background: var(--orange-soft); color: var(--orange); }

.act-text {
  font-size: 0.76rem; color: var(--text-2);
  line-height: 1.4;
}
.act-text strong { color: var(--text-1); font-weight: 600; }

.act-time {
  font-size: 0.66rem; color: var(--text-3);
  margin-top: 1px;
}
```

### JavaScript (Auto-hide Scrollbar)
```javascript
// Right panel: auto-hide scrollbar when not scrolling
(function() {
  var rp = document.querySelector('.right-panel');
  if (!rp) return;
  var timer;
  rp.addEventListener('scroll', function() {
    rp.classList.add('scrolling');
    clearTimeout(timer);
    timer = setTimeout(function() {
      rp.classList.remove('scrolling');
    }, 1200);
  });
})();
```

### CSS (Auto-hide Scrollbar)
```css
/* Right panel: auto-hide scrollbar */
.right-panel::-webkit-scrollbar-thumb {
  background: transparent;
  transition: background 0.3s;
}
.right-panel.scrolling::-webkit-scrollbar-thumb {
  background: var(--card-border);
}

/* Global scrollbar */
::-webkit-scrollbar { width: 5px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb {
  background: var(--card-border);
  border-radius: 3px;
}
```

---

## 7. Animation Classes & Delays

### HTML Setup
```html
<!-- Add .anim class + delay class to any element for staggered entrance -->
<div class="card anim d1" data-hand-border></div>
<div class="card anim d2" data-hand-border></div>
<div class="card anim d3" data-hand-border></div>
<div class="stat-card anim d4" data-hand-border></div>
<div class="stat-card anim d5" data-hand-border></div>
<!-- ...up to d10 -->
```

### CSS
```css
@keyframes slideUp {
  from { opacity: 0; transform: translateY(18px); }
  to   { opacity: 1; transform: translateY(0); }
}

@keyframes fadeIn {
  from { opacity: 0; }
  to   { opacity: 1; }
}

@keyframes gentleBob {
  0%, 100% { transform: translateY(0); }
  50%      { transform: translateY(5px); }
}

/* Staggered entrance animation */
.anim {
  opacity: 0;
  animation: slideUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards;
}

/* Delay classes (incremental, 50ms steps) */
.d1 { animation-delay: 0.04s }
.d2 { animation-delay: 0.09s }
.d3 { animation-delay: 0.14s }
.d4 { animation-delay: 0.19s }
.d5 { animation-delay: 0.28s }
.d6 { animation-delay: 0.38s }
.d7 { animation-delay: 0.48s }
.d8 { animation-delay: 0.56s }
.d9 { animation-delay: 0.64s }
.d10 { animation-delay: 0.72s }

/* Hero-specific delays (larger, for welcome section) */
.hero-anim {
  opacity: 0;
  animation: slideUp 0.7s cubic-bezier(0.16, 1, 0.3, 1) forwards;
}
.hero-d1 { animation-delay: 0.1s; }
.hero-d2 { animation-delay: 0.35s; }
.hero-d3 { animation-delay: 0.6s; }
.hero-d4 { animation-delay: 1s; }
```

---

## 8. Rough.js Hand-Drawn Donut Chart

### HTML Container
```html
<div class="assess-chart"><div id="donut-chart"></div></div>
```

### JavaScript
```javascript
(function drawDonut() {
  var container = document.getElementById('donut-chart');
  if (!container) return;

  var W = 360, H = 300;
  var cx = W / 2, cy = H / 2;
  var outerR = 95, innerR = 55;
  var leaderR = outerR + 14;
  var elbowR = outerR + 42;
  var tailLen = 30;

  var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('width', '100%');
  svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
  svg.style.overflow = 'visible';
  container.appendChild(svg);

  var rc = rough.svg(svg);
  var data = [
    { value: 15, color: '#d97757', name: 'Assignment 1', pct: '15%' },
    { value: 20, color: '#6a9bcc', name: 'Mid-sem Exam', pct: '20%' },
    { value: 15, color: '#788c5d', name: 'Assignment 2', pct: '15%' },
    { value: 50, color: '#b08968', name: 'Final Exam', pct: '50%' }
  ];
  var total = 0;
  data.forEach(function(d) { total += d.value; });

  // Draw slices
  var startAngle = -Math.PI / 2;
  data.forEach(function(d) {
    var sweep = (d.value / total) * Math.PI * 2;
    var endAngle = startAngle + sweep;
    d._mid = startAngle + sweep / 2;

    var x1o = cx + outerR * Math.cos(startAngle);
    var y1o = cy + outerR * Math.sin(startAngle);
    var x2o = cx + outerR * Math.cos(endAngle);
    var y2o = cy + outerR * Math.sin(endAngle);
    var x1i = cx + innerR * Math.cos(endAngle);
    var y1i = cy + innerR * Math.sin(endAngle);
    var x2i = cx + innerR * Math.cos(startAngle);
    var y2i = cy + innerR * Math.sin(startAngle);
    var large = sweep > Math.PI ? 1 : 0;

    var path = 'M ' + x1o + ' ' + y1o +
      ' A ' + outerR + ' ' + outerR + ' 0 ' + large + ' 1 ' + x2o + ' ' + y2o +
      ' L ' + x1i + ' ' + y1i +
      ' A ' + innerR + ' ' + innerR + ' 0 ' + large + ' 0 ' + x2i + ' ' + y2i + ' Z';

    svg.appendChild(rc.path(path, {
      fill: d.color,
      fillStyle: 'cross-hatch',
      fillWeight: 1.8,
      stroke: d.color,
      strokeWidth: 1,
      roughness: 1.5
    }));

    startAngle = endAngle;
  });

  // Draw leader lines + labels
  data.forEach(function(d) {
    var mid = d._mid;
    var isRight = Math.cos(mid) >= 0;

    var sx = cx + leaderR * Math.cos(mid);
    var sy = cy + leaderR * Math.sin(mid);
    var ex = cx + elbowR * Math.cos(mid);
    var ey = cy + elbowR * Math.sin(mid);
    var tx = isRight ? ex + tailLen : ex - tailLen;
    var ty = ey;

    // Hand-drawn leader line
    svg.appendChild(rc.line(sx, sy, ex, ey, {
      stroke: d.color,
      strokeWidth: 1,
      roughness: 1.2
    }));
    svg.appendChild(rc.line(ex, ey, tx, ty, {
      stroke: d.color,
      strokeWidth: 1,
      roughness: 1.2
    }));

    // Dot at start
    svg.appendChild(rc.circle(sx, sy, 4, {
      fill: d.color,
      fillStyle: 'solid',
      stroke: d.color,
      strokeWidth: 0.5,
      roughness: 1
    }));

    // Text labels (SVG text for readability)
    var anchor = isRight ? 'start' : 'end';
    var labelX = isRight ? tx + 5 : tx - 5;

    var pctText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    pctText.setAttribute('x', labelX);
    pctText.setAttribute('y', ty - 1);
    pctText.setAttribute('text-anchor', anchor);
    pctText.setAttribute('font-family', "'Source Serif 4', Georgia, serif");
    pctText.setAttribute('font-size', '15');
    pctText.setAttribute('font-weight', '700');
    pctText.setAttribute('fill', d.color);
    pctText.textContent = d.pct;
    svg.appendChild(pctText);

    var nameText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    nameText.setAttribute('x', labelX);
    nameText.setAttribute('y', ty + 15);
    nameText.setAttribute('text-anchor', anchor);
    nameText.setAttribute('font-family', "'Inter', sans-serif");
    nameText.setAttribute('font-size', '12');
    nameText.setAttribute('fill', '#6b6b65');
    nameText.textContent = d.name;
    svg.appendChild(nameText);
  });
})();
```

---

## 9. Rough Notation Annotations

### HTML Markup (Elements to Annotate)
```html
<p>
  It's <span id="rn-day">Tuesday</span>,
  <span id="rn-week">Week 3</span> of Semester.
</p>
<p>
  <span id="rn-warm">You've been working so hard.</span>
</p>
<table>
  <tr data-score-color="#d97757">
    <td><span class="earned-cell">82.5%</span></td>
  </tr>
</table>
<div id="wam-value">78.5</div>
```

### JavaScript
```javascript
// Hero annotations (delayed entrance)
setTimeout(function() {
  var RN = window.RoughNotation;
  if (!RN) return;

  var a1 = RN.annotate(document.getElementById('rn-day'), {
    type: 'underline',
    color: '#d97757',
    strokeWidth: 2,
    padding: 2,
    animationDuration: 600
  });
  var a2 = RN.annotate(document.getElementById('rn-week'), {
    type: 'circle',
    color: '#6a9bcc',
    strokeWidth: 1.5,
    padding: 5,
    animationDuration: 800
  });
  var a3 = RN.annotate(document.getElementById('rn-warm'), {
    type: 'highlight',
    color: 'rgba(217,119,87,0.10)',
    strokeWidth: 1,
    padding: 3,
    animationDuration: 1000
  });

  var group = RN.annotationGroup([a1, a2, a3]);
  group.show();
}, 900);

// Course earned grades: circle on hover
(function() {
  var RN = window.RoughNotation;
  if (!RN) return;
  document.querySelectorAll('.grade-table tbody tr').forEach(function(row) {
    var numEl = row.querySelector('.earned-cell');
    var color = row.dataset.scoreColor || '#d0cdc4';
    if (!numEl) return;
    var annotation = RN.annotate(numEl, {
      type: 'circle',
      color: color,
      strokeWidth: 1.2,
      padding: 4,
      animationDuration: 400
    });
    row.addEventListener('mouseenter', function() { annotation.show(); });
    row.addEventListener('mouseleave', function() { annotation.hide(); });
  });
})();

// WAM number: persistent circle (after page load)
setTimeout(function() {
  var RN = window.RoughNotation;
  var wam = document.getElementById('wam-value');
  if (!RN || !wam) return;
  var a = RN.annotate(wam, {
    type: 'circle',
    color: '#d97757',
    strokeWidth: 1.2,
    padding: 10,
    animationDuration: 800
  });
  a.show();
}, 2200);
```

---

## 10. Hand-Drawn Timeline with Dots

### HTML Structure
```html
<div class="card" data-hand-border>
  <div class="card-header">
    <div class="card-title">Upcoming Deadlines</div>
  </div>
  <div class="timeline" id="timeline">
    <div class="tl-item urgent">
      <div class="dl-top">
        <div class="dl-name">Lab 5</div>
        <div class="dl-days">3 days</div>
      </div>
      <div class="dl-course">COMP2017 · Wed 12 Mar</div>
    </div>
    <div class="tl-item soon">
      <!-- ... -->
    </div>
    <div class="tl-item later">
      <!-- ... -->
    </div>
  </div>
</div>
```

### CSS
```css
.timeline { position: relative; padding-left: 26px; }

.timeline-line-svg {
  position: absolute; left: 0; top: 0;
  width: 20px; height: 100%;
  pointer-events: none; overflow: visible;
}

.tl-item {
  position: relative; padding: 10px 14px;
  margin-bottom: 10px; border-radius: var(--radius-sm);
  transition: transform var(--ease-fast);
}
.tl-item:last-child { margin-bottom: 0; }
.tl-item:hover { transform: translateX(4px); }

.tl-item.urgent { background: rgba(217,119,87,.05); }
.tl-item.soon   { background: rgba(106,155,204,.05); }
.tl-item.later  { background: rgba(120,140,93,.05); }

.dl-top {
  display: flex; align-items: center;
  justify-content: space-between; margin-bottom: 2px;
}
.dl-name { font-weight: 600; font-size: 0.84rem; }
.dl-days {
  font-size: 0.7rem; font-weight: 600;
  padding: 2px 8px; border-radius: 5px;
}
.tl-item.urgent .dl-days {
  background: var(--orange-soft);
  color: var(--orange);
}
.tl-item.soon .dl-days {
  background: var(--blue-soft);
  color: var(--blue);
}
.tl-item.later .dl-days {
  background: var(--green-soft);
  color: var(--green);
}
.dl-course { font-size: 0.74rem; color: var(--text-3); }
```

### JavaScript
```javascript
function drawTimeline() {
  var tl = document.getElementById('timeline');
  if (!tl) return;
  var items = tl.querySelectorAll('.tl-item');
  if (!items.length) return;

  var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('class', 'timeline-line-svg');
  var tlH = tl.offsetHeight;
  svg.setAttribute('viewBox', '0 0 20 ' + tlH);
  tl.prepend(svg);

  var rc = rough.svg(svg);
  var colors = ['#d97757', '#6a9bcc', '#788c5d'];
  var yStart = items[0].offsetTop + 16;
  var yEnd = items[items.length - 1].offsetTop + 16;

  // Vertical line
  svg.appendChild(rc.line(8, yStart, 8, yEnd, {
    stroke: '#d5d2ca',
    strokeWidth: 1.2,
    roughness: 1.5
  }));

  // Dots
  items.forEach(function(item, i) {
    var y = item.offsetTop + 16;
    var col = colors[i] || '#d5d2ca';
    var filled = i === 0;
    svg.appendChild(rc.circle(8, y, 10, {
      stroke: col,
      strokeWidth: 1.2,
      roughness: 1.5,
      fill: filled ? col : 'none',
      fillStyle: 'solid'
    }));
  });
}
```

---

## 11. Hand-Drawn Progress Bars (Canvases)

### HTML
```html
<canvas class="cpb" data-p="0.40" data-c="#d97757" width="120" height="14"></canvas>
```

### JavaScript
```javascript
document.querySelectorAll('.cpb').forEach(function(c) {
  var p = parseFloat(c.dataset.p);  // progress (0..1)
  var col = c.dataset.c;            // color
  var w = c.width, h = c.height;
  var rc = rough.canvas(c);

  // Background bar
  rc.rectangle(0, 2, w, h - 4, {
    fill: '#eae7e0',
    fillStyle: 'solid',
    stroke: '#d5d2ca',
    strokeWidth: 0.7,
    roughness: 1.2
  });

  // Progress bar
  if (p > 0) {
    rc.rectangle(0, 2, w * p, h - 4, {
      fill: col,
      fillStyle: 'solid',
      stroke: col,
      strokeWidth: 0.7,
      roughness: 1.6
    });
  }
});
```

---

## 12. Hero Doodles (Rough.js Decorative Shapes)

### HTML
```html
<svg class="hero-doodles" id="hero-doodles"></svg>
```

### JavaScript
```javascript
(function drawHeroDoodles() {
  var svg = document.getElementById('hero-doodles');
  if (!svg) return;
  var w = window.innerWidth, h = window.innerHeight;
  svg.setAttribute('width', w);
  svg.setAttribute('height', h);
  svg.setAttribute('viewBox', '0 0 ' + w + ' ' + h);
  var rc = rough.svg(svg);

  // Helper: Star shape
  function star(cx, cy, r) {
    var pts = [];
    for (var i = 0; i < 10; i++) {
      var a = (Math.PI / 5) * i - Math.PI / 2;
      var rad = i % 2 === 0 ? r : r * 0.38;
      pts.push([cx + Math.cos(a) * rad, cy + Math.sin(a) * rad]);
    }
    return rc.polygon(pts, {
      stroke: '#d97757',
      strokeWidth: 4,
      roughness: 3,
      fill: 'none',
      bowing: 2.5
    });
  }

  // Helper: Sparkle (small x)
  function sparkle(x, y, s) {
    var g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    g.appendChild(rc.line(x - s, y, x + s, y, {
      stroke: '#d97757',
      strokeWidth: 3.5,
      roughness: 3
    }));
    g.appendChild(rc.line(x, y - s, x, y + s, {
      stroke: '#d97757',
      strokeWidth: 3.5,
      roughness: 3
    }));
    return g;
  }

  // Helper: Circle cluster
  function dots(x, y) {
    var g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    g.appendChild(rc.circle(x, y, 22, {
      stroke: '#6a9bcc',
      strokeWidth: 3.5,
      roughness: 3
    }));
    g.appendChild(rc.circle(x + 28, y - 20, 16, {
      stroke: '#788c5d',
      strokeWidth: 3.5,
      roughness: 3
    }));
    g.appendChild(rc.circle(x - 18, y + 22, 18, {
      stroke: '#d97757',
      strokeWidth: 3.5,
      roughness: 3
    }));
    return g;
  }

  // Helper: Wavy line
  function wave(x, y, len) {
    var d = 'M ' + x + ' ' + y;
    for (var i = 0; i < 4; i++) {
      var x1 = x + len / 4 * i + len / 8;
      var y1 = y + (i % 2 === 0 ? -20 : 20);
      var x2 = x + len / 4 * (i + 1);
      d += ' Q ' + x1 + ' ' + y1 + ', ' + x2 + ' ' + y;
    }
    return rc.path(d, {
      stroke: '#ddd8ce',
      strokeWidth: 3.5,
      roughness: 2
    });
  }

  // Place decorations
  var mx = w * 0.45, my = h * 0.45 - 50;
  var els = [
    { el: star(mx - 430, my - 200, 55), op: 0.25 },
    { el: star(mx + 270, my - 180, 75), op: 0.22 },
    { el: dots(mx - 490, my - 50), op: 0.22 },
    { el: sparkle(mx + 380, my - 10, 22), op: 0.22 },
    { el: sparkle(mx + 230, my + 130, 18), op: 0.2 },
    { el: dots(mx + 340, my + 110), op: 0.2 },
    { el: sparkle(mx - 520, my + 40, 20), op: 0.22 },
    { el: sparkle(mx - 510, my + 160, 16), op: 0.18 },
    { el: wave(mx - 470, my + 220, w * 0.5), op: 0.3 },
    { el: rc.circle(mx - 40, my - 160, 160, {
      stroke: '#eae7e0',
      strokeWidth: 0.8,
      roughness: 2,
      fill: 'none'
    }), op: 0.15 },
    { el: rc.circle(mx - 40, my - 160, 210, {
      stroke: '#eae7e0',
      strokeWidth: 0.5,
      roughness: 2.5,
      fill: 'none'
    }), op: 0.08 }
  ];

  els.forEach(function(o) {
    o.el.setAttribute('opacity', o.op);
    svg.appendChild(o.el);
  });
})();
```

---

## 13. Scroll Hint Animation (Breathing Text)

### HTML
```html
<div class="hero-scroll" onclick="document.getElementById('dashboard-start').scrollIntoView({behavior:'smooth'})">
  <span id="rn-scroll" class="scroll-text">your dashboard</span>
  <svg class="scroll-arrow" width="24" height="24" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8">
    <path d="M10 3 L10 17 M4 12 L10 17 L16 12"/>
  </svg>
</div>
```

### CSS
```css
.hero-scroll {
  position: absolute; bottom: 18vh;
  left: calc(50% - 50px); transform: translateX(-50%);
  z-index: 1;
  display: flex; flex-direction: column;
  align-items: center; gap: 10px;
  color: var(--text-3); cursor: pointer;
  transition: color var(--ease-fast);
}

.scroll-text {
  font-family: 'Source Serif 4', serif;
  font-style: italic;
  font-size: 1rem;
  font-weight: 400;
  letter-spacing: 0.04em;
  display: inline-block;
  opacity: 0.5;
  transform: scale(1);
  transition: opacity 0.8s ease, transform 0.8s ease, letter-spacing 0.8s ease;
}

.hero-scroll:hover { color: var(--text-2); }
.hero-scroll svg { transition: transform var(--ease-fast); }
.hero-scroll:hover svg { transform: translateY(3px); }
```

### JavaScript (Breathing Animation)
```javascript
(function() {
  var scrollEl = document.querySelector('.hero-scroll');
  var textEl = scrollEl.querySelector('.scroll-text');
  var arrowEl = scrollEl.querySelector('.scroll-arrow');
  if (!scrollEl || !textEl || !arrowEl) return;

  var hovered = false;
  var phase = 0;
  var speed = 0.02;

  scrollEl.addEventListener('mouseenter', function() {
    hovered = true;
    speed = 0.025;
  });
  scrollEl.addEventListener('mouseleave', function() {
    hovered = false;
    speed = 0.02;
  });

  function tick() {
    phase += speed;
    var t = (Math.sin(phase) + 1) / 2; // normalized 0..1

    if (hovered) {
      var s = 1.1 + t * 0.15;
      var o = 0.85 + t * 0.15;
      var ls = 0.06 + t * 0.04;
      textEl.style.transform = 'scale(' + s + ')';
      textEl.style.opacity = o;
      textEl.style.letterSpacing = ls + 'em';
      arrowEl.style.transform = 'scale(' + (1.2 + t * 0.2) + ')';
      arrowEl.style.opacity = 0.85 + t * 0.15;
    } else {
      var s = 1 + t * 0.06;
      var o = 0.45 + t * 0.3;
      var ls = 0.04 + t * 0.02;
      textEl.style.transform = 'scale(' + s + ')';
      textEl.style.opacity = o;
      textEl.style.letterSpacing = ls + 'em';
      arrowEl.style.transform = 'scale(' + (0.9 + t * 0.2) + ')';
      arrowEl.style.opacity = 0.5 + t * 0.3;
    }
    requestAnimationFrame(tick);
  }
  tick();
})();
```

---

## 14. Stats Row Component

### HTML
```html
<div class="stats-row">
  <div class="stat-card wam anim d2" data-hand-border>
    <div class="stat-label">Current WAM</div>
    <div class="stat-value">78.5</div>
    <div class="stat-sub">
      Weighted Average Mark
      <span class="grade-badge" style="background:var(--orange-soft);color:var(--orange)">Distinction</span>
    </div>
  </div>
  <div class="stat-card target anim d3" data-hand-border>
    <div class="stat-label">GPA Target</div>
    <div class="stat-value">85.0</div>
    <div class="stat-sub">High Distinction <span class="grade-badge" style="background:var(--blue-soft);color:var(--blue)">+6.5 to go</span></div>
  </div>
  <div class="stat-card alerts anim d4" data-hand-border>
    <div class="stat-label">Alerts</div>
    <div class="stat-value">2</div>
    <div class="stat-sub">Below target & 1 deadline</div>
  </div>
</div>
```

### CSS
```css
.stats-row { display: grid; grid-template-columns: repeat(3, 1fr); gap: 18px; }

.stat-card {
  padding: 20px 22px 20px 32px;
  overflow: visible;
}

.stat-label {
  font-size: 0.74rem;
  color: var(--text-3);
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  margin-bottom: 8px;
}

.stat-value {
  font-family: 'Source Serif 4', serif;
  font-size: 2rem;
  font-weight: 700;
  line-height: 1.1;
  margin-bottom: 5px;
}

.stat-card.wam .stat-value { color: var(--orange); }
.stat-card.target .stat-value { color: var(--blue); }
.stat-card.alerts .stat-value { color: var(--amber); }

.stat-sub {
  font-size: 0.78rem;
  color: var(--text-2);
}

.grade-badge {
  display: inline-block;
  padding: 1px 7px;
  border-radius: 4px;
  font-weight: 600;
  font-size: 0.7rem;
  margin-left: 4px;
}
```

---

## 15. Initialization Code Template

Add this to every new page to enable all aesthetic patterns:

```html
<html>
<head>
  <!-- Fonts -->
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Source+Serif+4:ital,wght@0,400;0,600;0,700;1,400&display=swap" rel="stylesheet">

  <!-- Lucide Icons -->
  <script src="https://unpkg.com/lucide@latest"></script>
  <!-- Rough.js (hand-drawn graphics) -->
  <script src="https://unpkg.com/roughjs@4.6.6/bundled/rough.js"></script>
  <!-- Rough Notation (text annotations) -->
  <script src="https://unpkg.com/rough-notation/lib/rough-notation.iife.js"></script>

  <style>
    /* Include all CSS variables, resets, animations from sections above */
  </style>
</head>
<body>
  <!-- Page content -->
  <script>
    // Enable Lucide icons
    lucide.createIcons();

    // Enable hand-drawn borders on all cards with data-hand-border
    requestAnimationFrame(function() {
      requestAnimationFrame(function() {
        document.querySelectorAll('[data-hand-border]').forEach(function(el) {
          var w = el.offsetWidth, h = el.offsetHeight;
          var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
          svg.setAttribute('class', 'hand-border-svg');
          svg.setAttribute('viewBox', '-4 -4 ' + (w + 8) + ' ' + (h + 8));
          el.prepend(svg);

          var rc = rough.svg(svg);
          var node = rc.rectangle(0, 0, w, h, {
            stroke: '#d0cdc4',
            strokeWidth: 0.8,
            roughness: 1.0,
            bowing: 1,
            fill: 'none'
          });
          svg.appendChild(node);
        });
      });
    });
  </script>
</body>
</html>
```

---

## Usage Summary

| Pattern | Where to Use | Key CSS Classes |
|---------|--------------|-----------------|
| Colors | All pages | `--orange`, `--blue`, `--green`, `--amber` |
| Paper Grain | Every page | `body::before` |
| Ruled Lines | Every page | `body::after` |
| Cards | Content sections | `.card` + `data-hand-border` |
| Sidebar | Layout | `.sidebar`, `.sidebar-nav`, `.nav-item` |
| Header | Navigation | `.header`, `.search-bar`, `.hdr-dropdown` |
| Right Panel | Sidebar info | `.right-panel`, `.profile-card`, `.cal-grid` |
| Animations | Entrance effects | `.anim .d1`–`.d10`, `.hero-anim` |
| Rough Notation | Highlights | `RN.annotate()` calls |
| Hand-drawn Timeline | Deadlines | `.timeline`, `.timeline-line-svg` |
| Progress Bars | Metrics | `<canvas class="cpb">` |
| Donut Chart | Assessment | `#donut-chart` |
| Hero Doodles | Background decoration | `#hero-doodles` |

---

## Dependencies

- **Lucide Icons** — SVG icon system
- **Rough.js** — Hand-drawn graphics engine
- **Rough Notation** — Text annotation library

All three are loaded from CDN in the HTML `<head>`.

---

**Generated from:** `/prototype/dashboard.html` (lines 1–1260)
**Last Updated:** March 20, 2026

