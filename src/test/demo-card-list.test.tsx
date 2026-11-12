import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { DemoCardList } from '@/components/demo-card-list';

describe('Demonstration card inspection', () => {
  it('opens the selected card rather than another card and closes its details', () => {
    render(<DemoCardList ar={true}/>);
    fireEvent.click(screen.getByRole('button', { name: 'تفاصيل الكرت DEMO-003' }));
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getAllByText('DEMO-003')[0]).toBeInTheDocument();
    expect(within(dialog).getByText('68.2%')).toBeInTheDocument();
    expect(within(dialog).queryByText('DEMO-001')).not.toBeInTheDocument();
    const close = within(dialog).getAllByRole('button', { name: 'إغلاق' })[0];
    if (!close) throw new Error('Missing close control');
    fireEvent.click(close);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});