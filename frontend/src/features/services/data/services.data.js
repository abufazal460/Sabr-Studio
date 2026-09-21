import {
  LuHouse,
  LuBuilding2,
  LuCompass,
  LuArmchair,
  LuLayers,
  LuPalette,
} from 'react-icons/lu';

export const servicesData = {
  eyebrow: 'Studio Practice',
  title: 'Our Services',
  description:
    'Six holistic disciplines covering spatial diagnosis, interior architecture, custom furniture, and contemplative material palettes.',
  services: [
    {
      id: 'residential-interiors',
      icon: LuHouse,
      title: 'Residential Interiors',
      description:
        'Comprehensive bespoke homes tailored for generational living, featuring tactile lime washes, hidden joinery, and private courtyards.',
      featured: true,
    },
    {
      id: 'commercial-interiors',
      icon: LuBuilding2,
      title: 'Commercial Interiors',
      description:
        'Monolithic flagships, boutique executive suites, and gallery spaces engineered for acoustic calm, enduring materiality, and purposeful flow.',
      featured: true,
    },
    {
      id: 'space-planning',
      icon: LuCompass,
      title: 'Space Planning',
      description:
        'Rigorous architectural re-sequencing that harnesses natural solar arcs, optimizes structural circulation, and establishes restful sightlines.',
      featured: false,
    },
    {
      id: 'furniture-layout',
      icon: LuArmchair,
      title: 'Furniture Layout',
      description:
        'Harmonious spatial choreography integrating bespoke studio pieces with heirloom objects to achieve human-scaled balance.',
      featured: false,
    },
    {
      id: '3d-visualization',
      icon: LuLayers,
      title: '3D Visualization',
      description:
        'Atmospheric digital renderings and light studies that communicate spatial mood, natural shadow play, and authentic textures before construction.',
      featured: false,
    },
    {
      id: 'material-colour-consultation',
      icon: LuPalette,
      title: 'Material & Colour Consultation',
      description:
        'Curating unlacquered metals, volcanic stones, local hardwoods, and mineral pigments that weather gracefully with time.',
      featured: true,
    },
  ],
};
