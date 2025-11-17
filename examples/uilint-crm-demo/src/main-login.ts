import LoginPage from './pages/login/LoginPage.svelte';

const target = document.getElementById('app');

if (target) {
  new LoginPage({ target });
}

