import {
  LuPhone,
  LuMail,
  LuMapPin,
} from 'react-icons/lu';
import {
  FaWhatsapp,
  FaFacebookF,
  FaInstagram,
  FaXTwitter,
  FaYoutube,
} from 'react-icons/fa6';

export const contactData = {
  header: {
    eyebrow: 'Get in Touch',
    title: 'Keep In Touch',
    description:
      'Whether discussing an upcoming architectural commission, visiting our New Delhi workshop, or acquiring bespoke furniture, we welcome your conversation.',
  },
  infoCards: [
    {
      id: 'phone',
      icon: LuPhone,
      title: 'Call Directly',
      primaryText: '+91 11 4982 3000',
      secondaryText: 'Monday through Friday, 9:30 AM to 6:30 PM IST',
      href: 'tel:+911149823000',
    },
    {
      id: 'email',
      icon: LuMail,
      title: 'Email Correspondence',
      primaryText: 'contact@sabrstudio.com',
      secondaryText: 'Direct design and press enquiries',
      href: 'mailto:contact@sabrstudio.com',
    },
    {
      id: 'address',
      icon: LuMapPin,
      title: 'Studio & Workshop',
      primaryText: '4 Design Enclave, Lado Sarai',
      secondaryText: 'New Delhi 110030, India (By Appointment)',
      href: 'https://maps.google.com/?q=Lado+Sarai+New+Delhi',
    },
  ],
  socials: [
    {
      id: 'whatsapp',
      name: 'WhatsApp',
      handle: 'Chat with studio',
      icon: FaWhatsapp,
      href: 'https://wa.me/911149823000',
      hoverColorClass: 'hover:text-social-whatsapp hover:border-social-whatsapp',
    },
    {
      id: 'instagram',
      name: 'Instagram',
      handle: '@sabrstudio.arch',
      icon: FaInstagram,
      href: 'https://instagram.com',
      hoverColorClass: 'hover:text-social-instagram hover:border-social-instagram',
    },
    {
      id: 'facebook',
      name: 'Facebook',
      handle: 'Sabr Studio',
      icon: FaFacebookF,
      href: 'https://facebook.com',
      hoverColorClass: 'hover:text-social-facebook hover:border-social-facebook',
    },
    {
      id: 'x',
      name: 'X (Twitter)',
      handle: '@sabr_studio',
      icon: FaXTwitter,
      href: 'https://x.com',
      hoverColorClass: 'hover:text-social-x hover:border-social-x',
    },
    {
      id: 'youtube',
      name: 'YouTube',
      handle: 'Sabr Studio Craft',
      icon: FaYoutube,
      href: 'https://youtube.com',
      hoverColorClass: 'hover:text-social-youtube hover:border-social-youtube',
    },
  ],
};
