import founder from "../../../assets/images/founder/founder.jpeg"

export const aboutData = {
  hero: {
    titleMain: 'Designing with',
    accentWord: 'Sabr Studio',
    introParagraphs: [
      'Founded in 2017 by Ruchi Kapoor, Sabr Studio is a thoughtful, design-led interior design studio committed to crafting functional and elegant spaces.',
      'We create contextual, artistic, and bespoke interiors — spaces that feel practical, comfortable, and inviting. From the first conversation to the last site visit, the studio stays close to proportion, material, light, and the people who will use the finished work.',
      'We work on residential homes, commercial environments, space planning, and turnkey interior projects designed to blend aesthetics with real-world living.',
    ],
  },
  story: {
    heading: 'About Us',
    image: founder,
    imageAlt:
      'Studio interior — warm beige living room with sculptural seating, tall glazing and soft daylight',

    "paragraphs": [
      {
        "parts": [
          { "text": "Sabr Studio " },
          { "text": "thoughtfully crafted interior design studio", "emphasis": true },
          {
            "text": " derives its uniqueness from a deep passion for creating functional, elegant, and liveable spaces. Founded in 2017 by Ruchi Kapoor, Sabr Studio was built with the ambition of designing environments that feel refined, balanced, and truly like home."
          }
        ]
      },
      "Our studio’s basic ethos revolves around developing thoughtful, appealing, and functional solutions for our clients through quality materials, timeless aesthetics, and a deep understanding of how people live, work, and experience their spaces. In times of confusion or uncertainty about your space, we assist you in bringing your vision to life.",
      "Whether you are looking to optimize room layouts, blend modern aesthetics with practical warmth, or need full execution support, don’t worry, we have got you covered! From residential interiors to commercial environments, our expertise spans space planning, 3D visualization, and complete end-to-end design.",
      "Our mission is established on the conviction that a people-centered approach is at the heart of effective design. We approach each project with thoughtful perseverance, listening closely to your needs, leaving ego at the door, and crafting bespoke spaces that feel natural, comfortable, and uniquely yours."
    ]

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
    name: 'Ruchi Kapoor',
    role: 'Founder & Principal Interior Designer',
    bio: [
      'Ruchi Kapoor founded Sabr Studio in 2017 with a passion for creating functional, elegant, and liveable spaces. With a strong background in interior design and a keen eye for detail, she crafts environments that seamlessly blend aesthetics with everyday practicality.',
      'Her design approach is rooted in thoughtful perseverance, quality materials, and a deep understanding of how people live, work, and experience their surroundings. That philosophy strengthens her ability to design spaces that evoke warmth and balance — while remaining deeply practical for modern life.',
      'Ruchi believes a well-designed space is not just about visual appeal; it is about how a space makes you feel and how naturally it fits into daily living. Through Sabr Studio, she aims to deliver refined, human-centric interiors that reflect each client’s unique vision.',
    ],
    portrait: founder,
    portraitAlt: 'Portrait of Ar. Anchal Garg, founder and principal architect',

  },
};
