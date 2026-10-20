import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import { ProjectDetail } from '../ProjectDetail';
import * as projectsApi from '../../api/projects.api';

vi.mock('../../api/projects.api', () => ({
  getProjectBySlug: vi.fn(),
}));

vi.mock('../../../shared/components/Seo', () => ({
  default: () => <div data-testid="mock-seo" />,
}));

vi.mock('../../../enquiries/components/EnquiryForm', () => ({
  default: () => <div data-testid="mock-enquiry-form" />,
}));

describe('ProjectDetail Public View — Dynamic Keywords & Color Palette', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders dynamic keyword lists and color palette swatches when present', async () => {
    projectsApi.getProjectBySlug.mockResolvedValueOnce({
      success: true,
      data: {
        _id: 'proj-1',
        title: 'The Vasant Vihar Residence',
        slug: 'the-vasant-vihar-residence',
        description: 'A serene sanctuary in South Delhi.',
        keywords: {
          heading: 'Spatial & Material Highlights',
          items: ['Board-formed concrete', 'Smoked oak cabinetry', 'Lime plaster'],
        },
        palette: {
          heading: 'Material Palette',
          colors: [
            { name: 'Warm Alabaster', value: '#F4EFEA' },
            { name: 'Smoked Oak', value: '#3D342E' },
            { name: '', value: 'rgba(217, 199, 184, 0.5)' }, // color name optional
            { name: 'Burlywood Accent', value: 'burlywood' },
          ],
        },
      },
    });

    render(
      <BrowserRouter>
        <ProjectDetail />
      </BrowserRouter>
    );

    // Title renders
    expect(await screen.findByRole('heading', { level: 1, name: 'The Vasant Vihar Residence' })).toBeInTheDocument();

    // Feature A: Keywords section heading and items
    expect(screen.getByRole('heading', { level: 2, name: 'Spatial & Material Highlights' })).toBeInTheDocument();
    expect(screen.getByText('Board-formed concrete')).toBeInTheDocument();
    expect(screen.getByText('Smoked oak cabinetry')).toBeInTheDocument();
    expect(screen.getByText('Lime plaster')).toBeInTheDocument();

    // Feature B: Color palette heading and circular swatches
    expect(screen.getByRole('heading', { level: 2, name: 'Material Palette' })).toBeInTheDocument();
    expect(screen.getByText('Warm Alabaster')).toBeInTheDocument();
    expect(screen.getByText('Smoked Oak')).toBeInTheDocument();
    expect(screen.getByText('Burlywood Accent')).toBeInTheDocument();

    // Check swatches: circular swatches must have only color, no text inside
    const alabasterSwatch = screen.getByLabelText('Warm Alabaster');
    expect(alabasterSwatch).toBeInTheDocument();
    expect(alabasterSwatch).toHaveClass('rounded-full');
    expect(alabasterSwatch.children.length).toBe(0);
    expect(alabasterSwatch.textContent).toBe('');
    expect(alabasterSwatch.style.backgroundColor).toBe('rgb(244, 239, 234)');

    const alphaSwatch = screen.getByLabelText('rgba(217, 199, 184, 0.5)');
    expect(alphaSwatch).toBeInTheDocument();
    expect(alphaSwatch).toHaveClass('rounded-full');
    expect(alphaSwatch.children.length).toBe(0);
    expect(alphaSwatch.textContent).toBe('');
  });

  it('preserves existing project view without rendering empty keyword or palette sections', async () => {
    projectsApi.getProjectBySlug.mockResolvedValueOnce({
      success: true,
      data: {
        _id: 'proj-2',
        title: 'Studio Pavilion & Creative Workspace',
        slug: 'studio-pavilion',
        description: 'An open-concept creative studio.',
      },
    });

    render(
      <BrowserRouter>
        <ProjectDetail />
      </BrowserRouter>
    );

    expect(await screen.findByRole('heading', { level: 1, name: 'Studio Pavilion & Creative Workspace' })).toBeInTheDocument();

    // Keyword and palette sections should NOT be rendered
    expect(screen.queryByLabelText(/Color Palette/i)).not.toBeInTheDocument();
    expect(screen.queryByText('Spatial & Material Highlights')).not.toBeInTheDocument();
    expect(screen.queryByText('Material Palette')).not.toBeInTheDocument();

    // Existing description and layout preserved
    expect(screen.getByText('An open-concept creative studio.')).toBeInTheDocument();
  });
});
