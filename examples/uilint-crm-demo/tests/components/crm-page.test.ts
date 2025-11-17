import { render, screen } from '@testing-library/svelte';
import CrmPage from '../../src/pages/crm/CrmPage.svelte';

describe('CrmPage component', () => {
  it('shows KPI cards and customer list immediately (no sockets required)', () => {
    render(CrmPage);

    expect(screen.getAllByText(/Active deals|Conversion|Avg\. order|Open escalations/)).toHaveLength(4);
    expect(screen.getByText(/Commerce operating panel/i)).toBeInTheDocument();
    expect(screen.getByText(/Customer pipeline/i)).toBeInTheDocument();
  });
});

