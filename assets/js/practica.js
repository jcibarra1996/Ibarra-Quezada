// Ibarra Quezada Abogados — comportamiento compartido de las páginas de práctica
// (mismo patrón que el script inline de index.html)

function openMobileNav(){
  document.getElementById('mobileNav').classList.add('open');
  document.getElementById('mobileOverlay').classList.add('open');
  document.body.style.overflow='hidden';
}
function closeMobileNav(){
  document.getElementById('mobileNav').classList.remove('open');
  document.getElementById('mobileOverlay').classList.remove('open');
  document.body.style.overflow='';
}

window.addEventListener('scroll', () => {
  const nav = document.getElementById('mainNav');
  if (nav) nav.classList.toggle('scrolled', window.scrollY > 60);
});

const practicaObserver = new IntersectionObserver(entries => {
  entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('visible'); practicaObserver.unobserve(e.target); } });
}, { threshold: 0.1 });
document.querySelectorAll('.fade-up').forEach(el => practicaObserver.observe(el));

function toggleFaq(el) {
  const item = el.parentElement;
  item.classList.toggle('open');
}
