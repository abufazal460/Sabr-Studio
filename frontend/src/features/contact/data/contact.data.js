import {
  LuPhone,
  LuMail,
} from 'react-icons/lu';
import {
  FaWhatsapp,
  FaFacebookF,
  FaInstagram,
  FaYoutube,
} from 'react-icons/fa6';

export const contactData = {
  header: {
    eyebrow: 'Get in Touch',
    title: "Let's Start a Conversation",
    description:
      "Have a project in mind, a question about our services, or an enquiry about our collection? We'd love to hear from you. Get in touch with Sabr Studio to discuss your ideas and requirements.",
  },
  infoCards: [
    {
      id: 'phone',
      icon: LuPhone,
      title: 'Call Directly',
      primaryText: '+91 8700655802',
      secondaryText: 'Monday through Friday, 9:30 AM to 6:30 PM IST',
      href: 'tel:+911149823000',
    },
    {
      id: 'email',
      icon: LuMail,
      title: 'Email Correspondence',
      primaryText: 'sabrstudio.design@gmail.com',
      secondaryText: 'Direct design and press enquiries',
      href: 'mailto:sabrstudio.design@gmail.com',
    },
    // {
    //   id: 'address',
    //   icon: LuMapPin,
    //   title: 'Studio & Workshop',
    //   primaryText: '4 Design Enclave, Lado Sarai',
    //   secondaryText: 'New Delhi 110030, India (By Appointment)',
    //   href: 'https://maps.google.com/?q=Lado+Sarai+New+Delhi',
    // },
  ],
  socials: [
    {
      id: 'whatsapp',
      name: 'WhatsApp',
      handle: 'Chat with studio',
      icon: FaWhatsapp,
      href: 'https://wa.me/8700655802',
      hoverColorClass: 'hover:text-social-whatsapp hover:border-social-whatsapp',
    },
    {
      id: 'instagram',
      name: 'Instagram',
      handle: '@sabrstudio.design',
      icon: FaInstagram,
      href: 'https://www.instagram.com/sabrstudio.design?utm_source=qr',
      hoverColorClass: 'hover:text-social-instagram hover:border-social-instagram',
    },
    {
      id: 'facebook',
      name: 'Facebook',
      handle: 'Sabr Studio',
      icon: FaFacebookF,
      href: 'https://www.facebook.com/people/Sabr-studio/61595038752053/?mibextid=wwXIfr',
      hoverColorClass: 'hover:text-social-facebook hover:border-social-facebook',
    },
    // {
    //   id: 'x',
    //   name: 'X (Twitter)',
    //   handle: '@sabr_studio',
    //   icon: FaXTwitter,
    //   href: 'https://x.com',
    //   hoverColorClass: 'hover:text-social-x hover:border-social-x',
    // },
    {
      id: 'youtube',
      name: 'YouTube',
      handle: 'Sabr Studio Craft',
      icon: FaYoutube,
      href: 'https://www.youtube.com/@sabrstudio-r',
      hoverColorClass: 'hover:text-social-youtube hover:border-social-youtube',
    },
  ],
};
