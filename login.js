const users = [{ username: "admin", password: "admin" }];

const form = document.getElementById('loginForm');
const errEl = document.getElementById('loginError');

function isAuthenticated(){
  return !!localStorage.getItem('authUser');
}
if (isAuthenticated()) {
  location.href = 'todos.html';
}

form.addEventListener('submit', (e) => {
  e.preventDefault();
  errEl.textContent = '';

  const username = document.getElementById('username').value.trim();
  const password = document.getElementById('password').value;

  const valid = users.find(u => u.username === username && u.password === password);

  if (!valid) {
    errEl.textContent = 'Usuario o contraseña incorrectos';
    return;
  }

  localStorage.setItem('authUser', username);
  location.href = 'todos.html';
});
