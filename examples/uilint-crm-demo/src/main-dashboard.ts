import DashboardPage from './pages/dashboard/DashboardPage.svelte';

const target = document.getElementById('app');

if (target) {
  new DashboardPage({ target });
}

