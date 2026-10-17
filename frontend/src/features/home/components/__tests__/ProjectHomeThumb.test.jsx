import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import { ProjectHomeThumb } from '../ProjectHomeThumb';
import * as projectsApi from '../../../projects/api/projects.api';

vi.mock('../../../projects/api/projects.api', () => ({
  getProjects: vi.fn(),
}));

describe('ProjectHomeThumb', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders projects with their specific dynamic categories from API', async () => {
    const mockProjects = [
      {
        id: 'p1',
        title: 'Contemporary 3 BHK Residence',
        category: 'Residential',
        slug: 'contemporary-3-bhk',
        coverImage: 'https://example.com/res.jpg',
      },
      {
        id: 'p2',
        title: 'BHAVYA Jewellery Showroom',
        category: 'Commercial',
        slug: 'bhavya-jewellery',
        coverImage: 'https://example.com/comm.jpg',
      },
      {
        id: 'p3',
        title: 'Boutique Heritage Haveli',
        category: 'Heritage Restoration',
        slug: 'heritage-haveli',
        coverImage: 'https://example.com/haveli.jpg',
      },
    ];

    projectsApi.getProjects.mockResolvedValueOnce({
      success: true,
      data: mockProjects,
    });

    render(
      <BrowserRouter>
        <ProjectHomeThumb />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Contemporary 3 BHK Residence')).toBeInTheDocument();
    });

    expect(screen.getByText('Residential')).toBeInTheDocument();
    expect(screen.getByText('Commercial')).toBeInTheDocument();
    expect(screen.getByText('Heritage Restoration')).toBeInTheDocument();
  });

  it('falls back to fallback projects on API failure without throwing', async () => {
    projectsApi.getProjects.mockRejectedValueOnce(new Error('Network error'));

    render(
      <BrowserRouter>
        <ProjectHomeThumb />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('The Courtyard Pavilion')).toBeInTheDocument();
    });

    expect(screen.getByText('Ash & Travertine Penthouse')).toBeInTheDocument();
  });
});
