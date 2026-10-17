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

describe('AdminProjectsPage Category Form & CRUD', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    adminApi.getProjects.mockResolvedValue({
      data: [
        {
          _id: 'proj-1',
          id: 'proj-1',
          title: 'Contemporary 3 BHK Residence',
          category: 'Residential',
          published: true,
        },
        {
          _id: 'proj-2',
          id: 'proj-2',
          title: 'BHAVYA Jewellery Showroom',
          category: 'Commercial',
          published: true,
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

  it('hydrates saved category when editing an existing project', async () => {
    render(
      <BrowserRouter>
        <AdminDashboard />
      </BrowserRouter>
    );

    // Wait for projects table to render
    await waitFor(() => {
      expect(screen.getByText('BHAVYA Jewellery Showroom')).toBeInTheDocument();
    });

    // Find the edit button for project 2 (BHAVYA Jewellery Showroom)
    const editButtons = screen.getAllByTitle('Edit project');
    fireEvent.click(editButtons[1]);

    // Modal should open and Category field should show "Commercial", NOT "Residential"
    const categorySelect = screen.getByLabelText(/Category/i);
    expect(categorySelect).toBeInTheDocument();
    expect(categorySelect.value).toBe('Commercial');
  });

  it('submits updated category without resetting to Residential', async () => {
    adminApi.updateProject.mockResolvedValueOnce({
      success: true,
      data: {
        _id: 'proj-2',
        title: 'BHAVYA Jewellery Showroom',
        category: 'Hospitality',
      },
    });

    render(
      <BrowserRouter>
        <AdminDashboard />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('BHAVYA Jewellery Showroom')).toBeInTheDocument();
    });

    const editButtons = screen.getAllByTitle('Edit project');
    fireEvent.click(editButtons[1]);

    const categorySelect = screen.getByLabelText(/Category/i);
    fireEvent.change(categorySelect, { target: { value: 'Hospitality' } });

    // Submit save
    const saveButton = screen.getByRole('button', { name: /Save Project/i });
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(adminApi.updateProject).toHaveBeenCalledTimes(1);
    });

    const [id, payload] = adminApi.updateProject.mock.calls[0];
    expect(id).toBe('proj-2');
    expect(payload.category).toBe('Hospitality');
    expect(payload.title).toBe('BHAVYA Jewellery Showroom');
  });

  it('initializes category to Residential when creating a new project', async () => {
    render(
      <BrowserRouter>
        <AdminDashboard />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Contemporary 3 BHK Residence')).toBeInTheDocument();
    });

    const addBtn = screen.getByRole('button', { name: /Add Project/i });
    fireEvent.click(addBtn);

    const categorySelect = screen.getByLabelText(/Category/i);
    expect(categorySelect.value).toBe('Residential');
  });
});
