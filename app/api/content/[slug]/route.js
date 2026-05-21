import { dbConnect } from '@/config/database';
import CmsPage from '@/models/cms.model';

// Helper to parse HTML content into sections for mobile structured view
function parseHtmlToSections(html) {
  if (!html) return [];
  // Regex to match h2/h3/h4 headings and their subsequent content up to the next heading
  const regex = /<h[2-4][^>]*>(.*?)<\/h[2-4]>([\s\S]*?)(?=<h[2-4]|$)/g;
  const sections = [];
  let match;
  let id = 1;
  while ((match = regex.exec(html)) !== null) {
    const title = match[1].replace(/<[^>]*>/g, '').trim();
    const content = match[2].replace(/<\/?[^>]+(>|$)/g, "").trim(); // Strip internal html tags
    sections.push({
      id: String(id++),
      title: title,
      content: content,
      contentHtml: match[2].trim()
    });
  }
  if (sections.length === 0 && html) {
    sections.push({
      id: '1',
      title: 'General',
      content: html.replace(/<\/?[^>]+(>|$)/g, "").trim(),
      contentHtml: html.trim()
    });
  }
  return sections;
}

// Seed data definitions to return if the DB doesn't have the page yet.
const DEFAULT_CONTENT = {
  'about-us': {
    title: 'About Us',
    introParagraphs: [
      'Welcome to our platform. We are dedicated to providing the best local deals and store discoveries.',
      'Our mission is to connect local businesses with customers seamlessly.'
    ],
    sectionTitle: 'Why Choose Us',
    sectionParagraphs: [
      'We curate the top offers.',
      'We verify every store for quality and authenticity.'
    ],
    features: [
      { id: '1', title: 'Trusted Vendors', description: 'All our vendors are verified.', iconKey: 'shield', iconUrl: 'https://cdn-icons-png.flaticon.com/512/2091/2091665.png', order: 1, isActive: true },
      { id: '2', title: 'Best Deals', description: 'Unbeatable discounts every day.', iconKey: 'tag', iconUrl: 'https://cdn-icons-png.flaticon.com/512/1040/1040230.png', order: 2, isActive: true },
    ]
  },
  'contact-us': {
    title: 'Contact Us',
    heading: 'Get in Touch',
    subheading: 'We would love to hear from you. Reach out to our support team.',
    contactMethods: [
      { type: 'email', label: 'Email Support', value: 'support@example.com', actionLabel: 'Send Email', actionUrl: 'mailto:support@example.com', iconKey: 'email', iconUrl: 'https://cdn-icons-png.flaticon.com/512/542/542740.png' },
      { type: 'phone', label: 'Call Us', value: '+1 234 567 8900', actionLabel: 'Call Now', actionUrl: 'tel:+12345678900', iconKey: 'phone', iconUrl: 'https://cdn-icons-png.flaticon.com/512/724/724664.png' },
      { type: 'whatsapp', label: 'WhatsApp', value: '+1 234 567 8900', actionLabel: 'Chat', actionUrl: 'https://wa.me/12345678900', iconKey: 'whatsapp', iconUrl: 'https://cdn-icons-png.flaticon.com/512/733/733585.png' }
    ],
    socialLinks: [
      { platform: 'facebook', url: 'https://facebook.com/example', isActive: true, order: 1, iconKey: 'facebook' },
      { platform: 'instagram', url: 'https://instagram.com/example', isActive: true, order: 2, iconKey: 'instagram' },
      { platform: 'twitter', url: 'https://twitter.com/example', isActive: true, order: 3, iconKey: 'twitter' }
    ],
    footerText: '© 2026 Example Inc. All rights reserved.',
    officeAddress: '123 Main Street, City, Country',
    supportHours: 'Mon - Fri, 9:00 AM - 6:00 PM'
  },
  'terms-and-conditions': {
    title: 'Terms and Conditions',
    lastUpdated: new Date().toISOString(),
    contentHtml: '<h3>1. Introduction</h3><p>Welcome to our application. By using our app, you agree to these terms.</p><h3>2. Usage</h3><p>Do not misuse our services.</p>',
    sections: [
      { id: '1', title: '1. Introduction', content: 'Welcome to our application. By using our app, you agree to these terms.', contentHtml: '<p>Welcome to our application. By using our app, you agree to these terms.</p>' },
      { id: '2', title: '2. Usage', content: 'Do not misuse our services.', contentHtml: '<p>Do not misuse our services.</p>' }
    ]
  },
  'privacy-policy': {
    title: 'Privacy Policy',
    lastUpdated: new Date().toISOString(),
    contentHtml: '<h3>1. Data Collection</h3><p>We collect information to provide better services to our users.</p><h3>2. Data Sharing</h3><p>We do not sell your personal data.</p>',
    sections: [
      { id: '1', title: '1. Data Collection', content: 'We collect information to provide better services to our users.', contentHtml: '<p>We collect information to provide better services to our users.</p>' },
      { id: '2', title: '2. Data Sharing', content: 'We do not sell your personal data.', contentHtml: '<p>We do not sell your personal data.</p>' }
    ]
  }
};

export async function GET(request, { params }) {
  try {
    await dbConnect();
    const { slug } = await params;
    const { searchParams } = new URL(request.url);
    const audience = searchParams.get('audience') || 'user';

    const page = await CmsPage.findOne({
      slug,
      isActive: true,
      $or: [
        { audience },
        { audience: { $exists: false } }
      ]
    }).sort({ updatedAt: -1 });

    if (page) {
      let data = {};
      
      // If content is saved as JSON, parse it
      if (page.contentType === 'json') {
        try {
          data = JSON.parse(page.content);
        } catch (e) {
          console.error(`Error parsing JSON for CMS page ${slug}:`, e);
          data = { contentHtml: page.content }; // Fallback
        }
      } else {
        // Assume HTML content
        data = {
          title: page.title,
          lastUpdated: page.updatedAt,
          contentHtml: page.content
        };
      }

      // Add common DB fields if not present in parsed JSON
      if (!data.title) data.title = page.title;
      data.updatedAt = page.updatedAt;
      data.slug = slug;
      data.audience = page.audience || audience;

      // Automatically generate sections for legal pages if only HTML is available
      if ((slug === 'terms-and-conditions' || slug === 'privacy-policy') && !data.sections) {
        data.sections = parseHtmlToSections(data.contentHtml || page.content);
      }

      return Response.json({
        success: true,
        message: 'Content fetched successfully',
        data,
        pagination: null
      }, { status: 200 });
    }

    // Fallback to default content if the page doesn't exist yet in the database
    const defaultData = DEFAULT_CONTENT[slug];
    if (defaultData) {
      return Response.json({
        success: true,
        message: 'Content fetched successfully (default)',
        data: {
          ...defaultData,
          slug,
          audience
        },
        pagination: null
      }, { status: 200 });
    }

    return Response.json({
      success: false,
      message: 'Content not found',
      data: null,
      pagination: null
    }, { status: 404 });

  } catch (error) {
    console.error('Error in content API:', error);
    return Response.json({
      success: false,
      message: 'Failed to fetch content',
      data: null,
      pagination: null
    }, { status: 500 });
  }
}
