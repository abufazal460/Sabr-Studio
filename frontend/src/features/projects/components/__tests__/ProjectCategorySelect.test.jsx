import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import ProjectCategorySelect from '../ProjectCategorySelect';

describe('ProjectCategorySelect', () => {
  it('renders dropdown with standard and provided category options', () => {
    render(
      <ProjectCategorySelect
        value="Residential"
        categories={['Residential', 'Commercial', 'Hospitality']}
      />
    );

    const select = screen.getByLabelText(/Category/i);
    expect(select).toBeInTheDocument();
    expect(select.value).toBe('Residential');

    expect(screen.getByRole('option', { name: 'Residential' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Commercial' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Hospitality' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: '+ Add New Category...' })).toBeInTheDocument();
  });

  it('calls onChange when user selects an existing category', () => {
    const handleChange = vi.fn();
    render(
      <ProjectCategorySelect
        value="Residential"
        categories={['Residential', 'Commercial', 'Hospitality']}
        onChange={handleChange}
      />
    );

    const select = screen.getByLabelText(/Category/i);
    fireEvent.change(select, { target: { value: 'Commercial' } });

    expect(handleChange).toHaveBeenCalledWith('Commercial');
  });

  it('displays custom category input when + Add New Category... is selected', () => {
    render(
      <ProjectCategorySelect
        value="Residential"
        categories={['Residential', 'Commercial', 'Hospitality']}
      />
    );

    const select = screen.getByLabelText(/Category/i);
    fireEvent.change(select, { target: { value: '__custom__' } });

    expect(screen.getByPlaceholderText(/e\.g\. Mixed-Use, Restoration/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Add' })).toBeInTheDocument();
  });

  it('validates empty category input', async () => {
    render(
      <ProjectCategorySelect
        value="Residential"
        categories={['Residential', 'Commercial', 'Hospitality']}
      />
    );

    const select = screen.getByLabelText(/Category/i);
    fireEvent.change(select, { target: { value: '__custom__' } });

    const input = screen.getByPlaceholderText(/e\.g\. Mixed-Use, Restoration/i);
    fireEvent.change(input, { target: { value: '   ' } });

    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });

    expect(await screen.findByText(/Category name is required/i)).toBeInTheDocument();
  });

  it('creates and selects a new custom category via API', async () => {
    const mockCreateApi = vi.fn().mockResolvedValue({
      success: true,
      data: { name: 'Institutional', slug: 'institutional' },
    });
    const handleChange = vi.fn();
    const handleCategoryCreated = vi.fn();

    render(
      <ProjectCategorySelect
        value="Residential"
        categories={['Residential', 'Commercial', 'Hospitality']}
        onChange={handleChange}
        onCategoryCreated={handleCategoryCreated}
        createCategoryApi={mockCreateApi}
      />
    );

    const select = screen.getByLabelText(/Category/i);
    fireEvent.change(select, { target: { value: '__custom__' } });

    const input = screen.getByPlaceholderText(/e\.g\. Mixed-Use, Restoration/i);
    fireEvent.change(input, { target: { value: 'Institutional' } });

    const addButton = screen.getByRole('button', { name: 'Add' });
    fireEvent.click(addButton);

    await waitFor(() => {
      expect(mockCreateApi).toHaveBeenCalledWith('Institutional');
      expect(handleCategoryCreated).toHaveBeenCalledWith('Institutional');
      expect(handleChange).toHaveBeenCalledWith('Institutional');
    });

    expect(screen.queryByPlaceholderText(/e\.g\. Mixed-Use, Restoration/i)).not.toBeInTheDocument();
  });

  it('reuses existing category case-insensitively instead of duplicate', async () => {
    const mockCreateApi = vi.fn();
    const handleChange = vi.fn();

    render(
      <ProjectCategorySelect
        value="Residential"
        categories={['Residential', 'Commercial', 'Hospitality']}
        onChange={handleChange}
        createCategoryApi={mockCreateApi}
      />
    );

    const select = screen.getByLabelText(/Category/i);
    fireEvent.change(select, { target: { value: '__custom__' } });

    const input = screen.getByPlaceholderText(/e\.g\. Mixed-Use, Restoration/i);
    fireEvent.change(input, { target: { value: 'commercial' } });

    const addButton = screen.getByRole('button', { name: 'Add' });
    fireEvent.click(addButton);

    expect(mockCreateApi).not.toHaveBeenCalled();
    expect(handleChange).toHaveBeenCalledWith('Commercial');
    expect(screen.queryByPlaceholderText(/e\.g\. Mixed-Use, Restoration/i)).not.toBeInTheDocument();
  });

  it('cancels custom category addition when cancel button is clicked', () => {
    render(
      <ProjectCategorySelect
        value="Residential"
        categories={['Residential', 'Commercial', 'Hospitality']}
      />
    );

    const select = screen.getByLabelText(/Category/i);
    fireEvent.change(select, { target: { value: '__custom__' } });

    const cancelBtn = screen.getByRole('button', { name: /cancel/i });
    fireEvent.click(cancelBtn);

    expect(screen.queryByPlaceholderText(/e\.g\. Mixed-Use, Restoration/i)).not.toBeInTheDocument();
    expect(select.value).toBe('Residential');
  });
});
