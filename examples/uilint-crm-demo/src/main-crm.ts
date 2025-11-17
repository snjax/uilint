import CrmPage from './pages/crm/CrmPage.svelte';

const target = document.getElementById('app');

if (target) {
  new CrmPage({ target });
}

