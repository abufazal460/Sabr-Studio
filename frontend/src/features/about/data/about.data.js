import founder from "../../../assets/images/founder/founder.jpeg"

export const aboutData = {
  hero: {
    titleMain: 'Designing with',
    accentWord: 'Sabr Studio',
    introParagraphs: [
      'Founded in 2016 by Ar. Anchal Garg, Design Sense Architects is a young, idea-driven architecture and interior design office based in New Delhi.',
      'We create contextual, artistic, and bespoke architecture and interiors — spaces that feel practical, comfortable, and inviting. From the first conversation to the last site visit, the studio stays close to proportion, material, light, and the people who will use the finished work.',
      'Based in New Delhi, we work across Delhi NCR and India on homes, hospitality, commercial interiors, and space styling for film and events.',
    ],
  },
  story: {
    heading: 'About Us',
    image: founder,
    imageAlt:
      'Studio interior — warm beige living room with sculptural seating, tall glazing and soft daylight',
    paragraphs: [
      {
        parts: [
          { text: 'Sculpt Design Studio ' },
          { text: 'best interior designers in delhi', emphasis: true },
          {
            text:
              ' derives its uniqueness and multifacetedness from its founders, who are well-versed in the realm of Architecture. In 2019, Vardha Aggarwal and Chirag Gupta founded Sculpt Design Studio with the ambition of delivering the highest quality architecture, planning, and design while providing exceptional customer service.',
          },
        ],
      },
      'Our studio’s basic ethos revolves around developing new, appealing, and enchanting solutions for our customers through the rapid development of projects that employ distinctive styles and architecture. In times of confusion or unawareness of what you want, we will assist you in achieving your dreams.',
      'Whether you want to combine two or more different styles, are fond of “Old is Gold”, or lack space in rooms, don’t worry we got you covered! The mystery is a well-oiled team of diverse individuals, each endowed with a unique skill. It is a MULTIDISCIPLINARY TEAM of designers and architects who are obsessed with detail and creative expression.',
      'Our mission is established on the conviction that a people-centered approach is at the heart of effective design. We approach each project with a young perspective, leaving our ego at the door, and most importantly, we are all ears! We and our team work together in our thriving studio to create captivating designs that portray each owner’s vision statement. We are always determined, evolving, and striving to be better than before.',
    ],
  },
  // Consumed by the home page AboutSection — intentionally distinct from founderProfile below.
  founder: {
    name: 'Ruchi Kapoor',
    role: 'Founder & Principal Interior Designer',
    badge: 'SABR STUDIO • EST. 2017',
    bio:
      'With a passion for creating functional, elegant and liveable spaces, I founded Sabr Studio in 2017 to design environments that feel like home. With a background in interior design and a keen eye for detail, I work across residential and commercial projects, blending aesthetics with practicality. My approach is rooted in thoughtful design, quality materials and a deep understanding of how people live, work and experience their spaces.',
    photo: founder,
  },
  founderProfile: {
    eyebrow: 'Founder',
    name: 'Ar. Anchal Garg',
    role: 'Founder & Principal Architect',
    bio: [
      'Anchal founded Design Sense Architects in 2016. A graduate of MBS School of Planning & Architecture, she blends modern design with traditional and unconventional ideas, and has also worked as a set designer on films including October and Veere Di Wedding.',
      'Her design sensibility is shaped by architectural practice and early work in the film industry as a set designer and art assistant. That experience strengthened an ability to design environments that evoke mood, narrative, and character — while still working hard for everyday life.',
      'Anchal believes great design is not only constructed; it is felt, lived, and remembered. Through Design Sense she aims to develop thoughtful, sensitive work that reflects users’ needs and infuses spaces with playfulness and joy.',
    ],
    portrait:
      'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=800&q=80',
    portraitAlt: 'Portrait of Ar. Anchal Garg, founder and principal architect',
    studioPanel: {
      monogram: 'DSA',
      line1: 'Design Sense Architects · New Delhi ·',
      line2: 'Architecture & interiors since 2016',
    },
  },
};
