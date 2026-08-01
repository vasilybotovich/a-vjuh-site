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

document.querySelector('#contact-form')?.addEventListener('submit', (event) => {
  event.preventDefault();
  const data = new FormData(event.currentTarget);
  const subject = `Заявка с a-vjuh.ru — ${data.get('company') || data.get('name')}`;
  const body = [
    `Имя: ${data.get('name')}`,
    `Компания: ${data.get('company') || 'не указана'}`,
    `Контакт: ${data.get('contact')}`,
    '',
    'Задача:',
    data.get('message')
  ].join('\n');
  window.location.href = `mailto:sales@a-vjuh.ru?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
});
