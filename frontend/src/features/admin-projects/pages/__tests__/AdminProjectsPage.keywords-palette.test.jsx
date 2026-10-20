import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import { AdminDashboard } from '../AdminProjectsPage';
import adminApi from '../../api/adminProjects.api';

vi.mock('../../api/adminProjects.api', () => ({
  default: {
    getProjects: vi.fn(),
    getRetailItems: vi.fn(),
    getEnquiries: vi.fn(),
    getOrders: vi.fn(),
    getProjectCategories: vi.fn(),
    createProjectCategory: vi.fn(),
    createProject: vi.fn(),
    updateProject: vi.fn(),
    deleteProject: vi.fn(),
  },
}));

vi.mock('../../../../shared/hooks/useScrollLock', () => ({
  useScrollLock: () => ({
    lock: vi.fn(),
    unlock: vi.fn(),
    forceUnlock: vi.fn(),
  }),
}));

describe('AdminProjectsPage Dynamic Keywords & Color Palette', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    adminApi.getProjects.mockResolvedValue({
      data: [
        {
          _id: 'proj-1',
          id: 'proj-1',
          title: 'Vasant Vihar Residence',
          category: 'Residential',
          description: 'South Delhi sanctuary.',
          published: true,
          keywords: {
            heading: 'Spatial Highlights',
            items: ['Board-formed concrete', 'Smoked oak'],
          },
          palette: {
            heading: 'Material Palette',
            colors: [
              { name: 'Warm Alabaster', value: '#D9C7B8' },
              { name: '', value: 'rgba(217, 199, 184, 0.5)' },
            ],
          },
        },
      ],
    });
    adminApi.getRetailItems.mockResolvedValue({ data: [] });
    adminApi.getEnquiries.mockResolvedValue({ data: [] });
    adminApi.getOrders.mockResolvedValue({ data: [] });
    adminApi.getProjectCategories.mockResolvedValue({
      data: ['Residential', 'Commercial', 'Hospitality'],
    });
  });

  it('hydrates saved keywords and color palette when editing an existing project', async () => {
    render(
      <BrowserRouter>
        <AdminDashboard />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Vasant Vihar Residence')).toBeInTheDocument();
    });

    const editBtn = screen.getByTitle('Edit project');
    fireEvent.click(editBtn);

    // Modal opens - verify keywords heading and items are hydrated
    const kwHeadingInput = screen.getByLabelText(/Section Heading/i);
    expect(kwHeadingInput).toBeInTheDocument();
    expect(kwHeadingInput.value).toBe('Spatial Highlights');

    expect(screen.getByDisplayValue('Board-formed concrete')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Smoked oak')).toBeInTheDocument();

    // Verify palette heading and colors are hydrated
    const palHeadingInput = screen.getByLabelText(/Palette Heading/i);
    expect(palHeadingInput).toBeInTheDocument();
    expect(palHeadingInput.value).toBe('Material Palette');

    expect(screen.getByDisplayValue('#D9C7B8')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Warm Alabaster')).toBeInTheDocument();
    expect(screen.getByDisplayValue('rgba(217, 199, 184, 0.5)')).toBeInTheDocument();
  });

  it('rejects submitting invalid CSS color with alert', async () => {
    const alertMock = vi.spyOn(window, 'alert').mockImplementation(() => {});

    render(
      <BrowserRouter>
        <AdminDashboard />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Vasant Vihar Residence')).toBeInTheDocument();
    });

    const editBtn = screen.getByTitle('Edit project');
    fireEvent.click(editBtn);

    // Change the first color to an invalid value
    const colorInput = screen.getByDisplayValue('#D9C7B8');
    fireEvent.change(colorInput, { target: { value: 'not-a-real-color' } });

    // Submit form
    const saveBtn = screen.getByRole('button', { name: /Save Project/i });
    fireEvent.click(saveBtn);

    expect(alertMock).toHaveBeenCalledWith(
      expect.stringContaining('invalid CSS color value')
    );
    expect(adminApi.updateProject).not.toHaveBeenCalled();

    alertMock.mockRestore();
  });

  it('submits updated keywords and palette with preserved order', async () => {
    adminApi.updateProject.mockResolvedValueOnce({
      success: true,
      data: {
        _id: 'proj-1',
        title: 'Vasant Vihar Residence',
      },
    });

    render(
      <BrowserRouter>
        <AdminDashboard />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Vasant Vihar Residence')).toBeInTheDocument();
    });

    const editBtn = screen.getByTitle('Edit project');
    fireEvent.click(editBtn);

    // Add another keyword item
    const addKwBtn = screen.getByRole('button', { name: /Add Keyword Item/i });
    fireEvent.click(addKwBtn);

    const newKwInput = screen.getByPlaceholderText(/Item 3/i);
    fireEvent.change(newKwInput, { target: { value: 'Lime Plaster' } });

    // Submit form
    const saveBtn = screen.getByRole('button', { name: /Save Project/i });
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(adminApi.updateProject).toHaveBeenCalledTimes(1);
    });

    const submittedPayload = adminApi.updateProject.mock.calls[0][1];
    expect(submittedPayload.keywords).toEqual({
      heading: 'Spatial Highlights',
      items: ['Board-formed concrete', 'Smoked oak', 'Lime Plaster'],
    });
    expect(submittedPayload.palette.colors.length).toBe(2);
    expect(submittedPayload.palette.colors[0]).toEqual({
      name: 'Warm Alabaster',
      value: '#D9C7B8',
    });
  });
});
