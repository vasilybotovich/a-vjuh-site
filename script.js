const root = document.documentElement;
const themeButtons = [...document.querySelectorAll('[data-set-theme]')];
const metaTheme = document.querySelector('meta[name="theme-color"]');

function setTheme(theme) {
  root.dataset.theme = theme;
  localStorage.setItem('vjuh-theme', theme);
  themeButtons.forEach((button) => button.setAttribute('aria-pressed', String(button.dataset.setTheme === theme)));
  metaTheme?.setAttribute('content', theme === 'dark' ? '#171816' : '#f7f7f4');
}

themeButtons.forEach((button) => button.addEventListener('click', () => setTheme(button.dataset.setTheme)));
setTheme(root.dataset.theme || 'light');

const menuButton = document.querySelector('.menu-toggle');
const mobileNav = document.querySelector('#mobile-nav');
menuButton?.addEventListener('click', () => {
  const open = menuButton.getAttribute('aria-expanded') !== 'true';
  menuButton.setAttribute('aria-expanded', String(open));
  mobileNav.hidden = !open;
});
mobileNav?.querySelectorAll('a').forEach((link) => link.addEventListener('click', () => {
  menuButton.setAttribute('aria-expanded', 'false');
  mobileNav.hidden = true;
}));

const observer = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
      observer.unobserve(entry.target);
    }
  });
}, { threshold: 0.08 });
document.querySelectorAll('.reveal').forEach((node) => observer.observe(node));

document.querySelector('#contact-form')?.addEventListener('submit', async (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  const button = form.querySelector('button[type="submit"]');
  const status = form.querySelector('#form-status');
  const data = Object.fromEntries(new FormData(form));
  button.disabled = true;
  button.firstChild.textContent = 'Отправляем… ';
  status.textContent = 'Передаём заявку команде.';
  status.className = 'form-note';
  try {
    const response = await fetch('/api/contact', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(data),
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.error || 'Не удалось отправить заявку');
    form.reset();
    status.textContent = 'Спасибо! Заявка отправлена. Мы свяжемся с вами.';
    status.className = 'form-note form-success';
  } catch (error) {
    status.textContent = `${error.message}. Напишите нам: sales@a-vjuh.ru`;
    status.className = 'form-note form-error';
  } finally {
    button.disabled = false;
    button.firstChild.textContent = 'Отправить заявку ';
  }
});
