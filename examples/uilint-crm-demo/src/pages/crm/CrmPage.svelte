<script lang="ts">
  type Customer = {
    id: string;
    name: string;
    status: 'vip' | 'active' | 'inactive';
    lastOrder: string;
    spend: string;
  };

  const customers: Customer[] = [
    { id: 'c-01', name: 'Aurora Fashion', status: 'vip', lastOrder: '2 min ago', spend: '$248k' },
    { id: 'c-02', name: 'Pine & Co', status: 'active', lastOrder: '12 min ago', spend: '$124k' },
    { id: 'c-03', name: 'Marble Labs', status: 'active', lastOrder: '35 min ago', spend: '$87k' },
    { id: 'c-04', name: 'Polar Home', status: 'inactive', lastOrder: '3 days ago', spend: '$22k' },
  ];

  const kpis = [
    { label: 'Active deals', value: '48', trend: '+6.4%' },
    { label: 'Conversion', value: '32%', trend: '+2.1%' },
    { label: 'Avg. order', value: '$4.2k', trend: '+1.3%' },
    { label: 'Open escalations', value: '5', trend: '-2' },
  ];

  const timeline = [
    { id: 'ev-01', title: 'PO-12811 fulfilled', meta: '08:24 - Logistics', type: 'success' },
    { id: 'ev-02', title: 'Invoice retry scheduled', meta: '07:58 - Billing', type: 'warning' },
    { id: 'ev-03', title: 'Storefront theme updated', meta: '07:35 - Creative', type: 'info' },
  ];

  const inventory = [
    { sku: 'SKU-5528', name: 'Lighthouse hoodie', stock: 58, status: 'healthy' },
    { sku: 'SKU-3835', name: 'Horizon sneakers', stock: 14, status: 'low' },
    { sku: 'SKU-1120', name: 'Apex windbreaker', stock: 0, status: 'oos' },
  ];

  let selectedCustomer: Customer = customers[0];

  function selectCustomer(customer: Customer): void {
    selectedCustomer = customer;
  }
</script>

<svelte:head>
  <link
    rel="stylesheet"
    href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap"
  />
</svelte:head>

<div class="crm-shell">
  <header id="crm-header">
    <div>
      <strong>Commerce operating panel</strong>
      <span class="crm-version">Version 5.3 · realtime sync</span>
    </div>
    <button class="primary" type="button">Sync storefront</button>
  </header>

  <section id="crm-kpis">
    {#each kpis as card}
      <article class="kpi-card">
        <span class="kpi-label">{card.label}</span>
        <strong class="kpi-value">{card.value}</strong>
        <span class="kpi-trend">{card.trend}</span>
      </article>
    {/each}
  </section>

  <section id="crm-body">
    <aside id="crm-sidebar">
      <header class="sidebar-header">
        <span>Customer pipeline</span>
        <small>{customers.length} accounts</small>
      </header>
      <ul>
        {#each customers as customer}
          <li
            class:selected={customer.id === selectedCustomer.id}
          >
            <button type="button" on:click={() => selectCustomer(customer)}>
              <div>
                <span class="customer-name">{customer.name}</span>
                <span class={`status-pill status-${customer.status}`}>{customer.status}</span>
              </div>
              <div class="customer-meta">
                <span>{customer.lastOrder}</span>
                <span>{customer.spend}</span>
              </div>
            </button>
          </li>
        {/each}
      </ul>
    </aside>

    <section id="crm-detail">
      <article id="crm-profile-card">
        <header>
          <h2>{selectedCustomer.name}</h2>
          <span class={`status-pill status-${selectedCustomer.status}`}>
            {selectedCustomer.status}
          </span>
        </header>
        <p>
          Relationship run-rate, fulfillment latency and invoice confidence for {selectedCustomer.name}{' '}
          is trending above target. Monitor the signal KPIs before the quarterly business review.
        </p>
        <div class="profile-actions">
          <button type="button" class="secondary">Assign owner</button>
          <button type="button" class="primary">Open workspace</button>
        </div>
      </article>

      <section id="crm-orders">
        <header>
          <h3>Order timeline</h3>
          <button type="button" class="ghost">Export CSV</button>
        </header>
        <ul>
          {#each timeline as event}
            <li class={`timeline-item ${event.type}`}>
              <strong>{event.title}</strong>
              <span>{event.meta}</span>
            </li>
          {/each}
        </ul>
      </section>

      <section id="crm-inventory">
        <header>
          <h3>Inventory pulse</h3>
          <button type="button" class="ghost">Refresh</button>
        </header>
        <table>
          <thead>
            <tr>
              <th>SKU</th>
              <th>Product</th>
              <th>Stock</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {#each inventory as item}
              <tr>
                <td>{item.sku}</td>
                <td>{item.name}</td>
                <td>{item.stock}</td>
                <td>
                  <span class={`status-pill status-${item.status}`}>{item.status}</span>
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </section>

      <section id="crm-activity">
        <header>
          <h3>Engagement radar</h3>
          <span>Realtime sync · SLA 12m</span>
        </header>
        <div class="activity-canvas">
          <div class="activity-card">
            <strong>19</strong>
            <span>Tickets</span>
          </div>
          <div class="activity-card">
            <strong>8</strong>
            <span>Playbooks</span>
          </div>
          <div class="activity-card">
            <strong>4</strong>
            <span>Insights</span>
          </div>
        </div>
      </section>
    </section>
  </section>
</div>

<style>
  :global(body) {
    margin: 0;
    background: #0b1120;
    font-family: 'Inter', system-ui, sans-serif;
    color: #0f172a;
  }

  .crm-shell {
    min-height: 100vh;
    background: linear-gradient(180deg, #0b1120, #111827 220px, #f8fafc 220px);
  }

  #crm-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 24px 40px;
    color: #e2e8f0;
  }

  #crm-header strong {
    display: block;
    font-size: 18px;
  }

  .crm-version {
    font-size: 13px;
    opacity: 0.75;
    margin-left: 4px;
  }

  .primary {
    background: linear-gradient(120deg, #4f46e5, #0ea5e9);
    border: none;
    color: #fff;
    border-radius: 999px;
    padding: 10px 18px;
    font-weight: 600;
    cursor: pointer;
  }

  .secondary {
    border: 1px solid #cbd5f5;
    background: #fff;
    padding: 10px 16px;
    border-radius: 12px;
    font-weight: 600;
    cursor: pointer;
  }

  .ghost {
    border: none;
    background: transparent;
    color: #2563eb;
    font-weight: 600;
    cursor: pointer;
  }

  #crm-kpis {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
    gap: 20px;
    padding: 0 40px 24px;
    margin-top: 16px;
    max-width: 1400px;
    margin-left: auto;
    margin-right: auto;
  }

  .kpi-card {
    background: rgba(15, 23, 42, 0.8);
    border-radius: 20px;
    padding: 20px;
    color: #e2e8f0;
    border: 1px solid rgba(148, 163, 184, 0.2);
  }

  .kpi-label {
    text-transform: uppercase;
    font-size: 12px;
    letter-spacing: 0.08em;
    opacity: 0.7;
  }

  .kpi-value {
    display: block;
    font-size: 32px;
    margin-top: 12px;
  }

  .kpi-trend {
    font-size: 14px;
    color: #34d399;
  }

  #crm-body {
    display: grid;
    grid-template-columns: 320px 1fr;
    gap: 24px;
    padding: 0 40px 40px;
    max-width: 1600px;
    margin: 0 auto;
  }

  #crm-sidebar {
    background: #ffffff;
    border-radius: 24px;
    padding: 20px;
    box-shadow: 0 30px 90px rgba(15, 15, 45, 0.12);
  }

  .sidebar-header {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    font-weight: 600;
    margin-bottom: 16px;
  }

  #crm-sidebar ul {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  #crm-sidebar li {
    border: 1px solid #e2e8f0;
    border-radius: 18px;
    cursor: pointer;
    overflow: hidden;
  }

  #crm-sidebar li button {
    background: transparent;
    border: none;
    width: 100%;
    padding: 14px 16px;
    display: flex;
    flex-direction: column;
    gap: 10px;
    text-align: left;
    font: inherit;
    color: inherit;
  }

  #crm-sidebar li.selected {
    border-color: #4f46e5;
    box-shadow: 0 12px 30px rgba(79, 70, 229, 0.15);
  }

  .customer-name {
    font-weight: 600;
  }

  .customer-meta {
    display: flex;
    justify-content: space-between;
    font-size: 13px;
    color: #475569;
  }

  .status-pill {
    padding: 2px 10px;
    border-radius: 999px;
    font-size: 12px;
    text-transform: capitalize;
  }

  .status-vip {
    background: rgba(234, 179, 8, 0.15);
    color: #b45309;
  }

  .status-active {
    background: rgba(16, 185, 129, 0.15);
    color: #15803d;
  }

  .status-inactive,
  .status-oos {
    background: rgba(248, 113, 113, 0.15);
    color: #b91c1c;
  }

  .status-low {
    background: rgba(251, 191, 36, 0.15);
    color: #92400e;
  }

  .status-healthy {
    background: rgba(34, 197, 94, 0.15);
    color: #047857;
  }

  #crm-detail {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    grid-template-rows: auto auto;
    gap: 24px;
  }

  #crm-profile-card {
    grid-column: 1 / span 2;
    background: #ffffff;
    border-radius: 28px;
    padding: 28px;
    box-shadow: 0 30px 90px rgba(15, 15, 45, 0.12);
    border: 1px solid #e2e8f0;
  }

  #crm-profile-card header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 12px;
  }

  .profile-actions {
    margin-top: 18px;
    display: flex;
    gap: 12px;
  }

  #crm-orders,
  #crm-inventory,
  #crm-activity {
    background: #fff;
    border-radius: 24px;
    padding: 24px;
    border: 1px solid #e2e8f0;
    box-shadow: 0 20px 60px rgba(15, 15, 45, 0.08);
  }

  #crm-activity {
    grid-column: 1 / span 2;
  }

  #crm-orders header,
  #crm-inventory header,
  #crm-activity header {
    display: flex;
    justify-content: space-between;
    margin-bottom: 16px;
    align-items: center;
  }

  #crm-orders ul {
    list-style: none;
    padding: 0;
    margin: 0;
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .timeline-item {
    padding: 14px;
    border-radius: 16px;
    border: 1px solid #e2e8f0;
    display: flex;
    flex-direction: column;
  }

  .timeline-item.success {
    border-color: rgba(34, 197, 94, 0.3);
  }

  .timeline-item.warning {
    border-color: rgba(250, 204, 21, 0.4);
  }

  table {
    width: 100%;
    border-collapse: collapse;
  }

  th,
  td {
    text-align: left;
    padding: 12px 8px;
    border-bottom: 1px solid #e2e8f0;
  }

  .activity-canvas {
    display: flex;
    gap: 16px;
  }

  .activity-card {
    flex: 1;
    border-radius: 18px;
    padding: 20px;
    background: linear-gradient(135deg, #f8fafc, #eef2ff);
    text-align: center;
  }

  .activity-card strong {
    display: block;
    font-size: 32px;
    margin-bottom: 8px;
  }
  @media (max-width: 1200px) {
    #crm-body {
      grid-template-columns: minmax(0, 1fr);
    }

    #crm-detail {
      grid-template-columns: minmax(0, 1fr);
    }

    #crm-activity {
      grid-column: 1;
    }
  }

  @media (max-width: 900px) {
    #crm-kpis {
      padding: 0 24px 16px;
    }

    #crm-body {
      padding: 0 24px 32px;
      gap: 16px;
      display: flex;
      flex-direction: column;
    }

    #crm-sidebar {
      order: 2;
      width: 100%;
    }

    #crm-detail {
      order: 1;
      gap: 16px;
      width: 100%;
    }
  }

  @media (max-width: 600px) {
    .kpi-card {
      padding: 16px;
    }

    #crm-profile-card {
      padding: 20px;
    }

    #crm-header {
      flex-direction: column;
      padding: 16px 24px;
      gap: 8px;
    }
  }
</style>

