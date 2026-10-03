/* app.js — TRAVELO Auth & Session Management */

class Store {
  static get(key) {
    try {
      return JSON.parse(localStorage.getItem(key)) || null;
    } catch (_) {
      return null;
    }
  }
  static set(key, data) {
    localStorage.setItem(key, JSON.stringify(data));
  }
}

if (!Store.get('users')) Store.set('users', []);

const Auth = {
  login(email, password) {
    const users = Store.get('users') || [];
    const user = users.find(u => u.email === email && u.password === password);
    if (user) {
      Store.set('session', user);
      return true;
    }
    return false;
  },
  signup(name, email, password) {
    const users = Store.get('users') || [];
    if (users.find(u => u.email === email)) return false;
    const newUser = { id: Date.now(), name, email, password };
    users.push(newUser);
    Store.set('users', users);
    Store.set('session', newUser);
    return true;
  },
  logout() {
    localStorage.removeItem('session');
    window.location.href = 'index.html';
  },
  getUser() {
    return Store.get('session');
  }
};

function updateNavigation() {
  const user = Auth.getUser();
  const navLinks = document.getElementById('nav-links');
  if (!navLinks) return;

  if (user) {
    navLinks.innerHTML = `
      <a href="profile.html" class="btn-login" style="border-color:#00e5ff; color:#00e5ff;">\uD83D\uDC64 ${user.name.toUpperCase()}</a>
      <button class="btn-signup" style="cursor:pointer;" onclick="Auth.logout()">LOGOUT</button>
    `;
  } else {
    navLinks.innerHTML = `
      <a href="login.html" class="btn-login">Login</a>
      <a href="signup.html" class="btn-signup">Sign Up</a>
    `;
  }
}

document.addEventListener('DOMContentLoaded', () => {
  updateNavigation();

  // Mobile Hamburger Menu
  const hamburger = document.getElementById('hamburger');
  const centerNav = document.getElementById('center-nav');
  if (hamburger && centerNav) {
    hamburger.addEventListener('click', (e) => {
      e.stopPropagation();
      centerNav.classList.toggle('mobile-active');
    });
  }
});