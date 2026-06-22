import { dbConnect } from '@/config/database';
import CmsPage from '@/models/cms.model';

const SOCIAL_PLATFORM_ORDER = ['facebook', 'linkedin', 'youtube', 'instagram', 'x'];

const DEFAULT_SOCIAL_LINKS = [
  { platform: 'facebook', url: 'https://facebook.com/example', isActive: true, order: 1, iconKey: 'facebook' },
  { platform: 'linkedin', url: 'https://linkedin.com/company/example', isActive: true, order: 2, iconKey: 'linkedin' },
  { platform: 'youtube', url: 'https://youtube.com/@example', isActive: true, order: 3, iconKey: 'youtube' },
  { platform: 'instagram', url: 'https://instagram.com/example', isActive: true, order: 4, iconKey: 'instagram' },
  { platform: 'x', url: 'https://x.com/example', isActive: true, order: 5, iconKey: 'x' }
];

function buildAudienceFilters(audience = 'user') {
  const filters = [{ audience }, { audience: { $exists: false } }];
  if (audience !== 'shared') {
    filters.splice(1, 0, { audience: 'shared' });
  }

  return filters;
}

function normalizePlatformName(platform = '') {
  const normalized = String(platform).trim().toLowerCase();
  if (normalized === 'twitter') return 'x';
  return normalized;
}

function normalizeSocialLinks(links = []) {
  const byPlatform = new Map();

  links.forEach((item, index) => {
    const platform = normalizePlatformName(item?.platform);
    if (!SOCIAL_PLATFORM_ORDER.includes(platform)) {
      return;
    }

    byPlatform.set(platform, {
      platform,
      url: typeof item?.url === 'string' ? item.url.trim() : '',
      isActive: item?.isActive !== false,
      order: item?.order || index + 1,
      iconKey: item?.iconKey || platform
    });
  });

  return SOCIAL_PLATFORM_ORDER.map((platform, index) => ({
    platform,
    url: byPlatform.get(platform)?.url || '',
    isActive: byPlatform.get(platform)?.isActive !== false,
    order: index + 1,
    iconKey: platform
  }));
}

function buildSocialProfiles(links = []) {
  return normalizeSocialLinks(links).reduce((profiles, item) => {
    profiles[item.platform] = item.url || '';
    return profiles;
  }, {});
}

function parseCmsPageContent(page) {
  if (!page) return null;

  if (page.contentType === 'json') {
    try {
      return JSON.parse(page.content);
    } catch (error) {
      console.error(`Error parsing JSON for CMS page ${page.slug}:`, error);
      return { contentHtml: page.content };
    }
  }

  return {
    title: page.title,
    lastUpdated: page.updatedAt,
    contentHtml: page.content
  };
}

async function getSharedAppSettingsPage() {
  return CmsPage.findOne({
    slug: 'app-settings',
    isActive: true,
    $or: buildAudienceFilters('shared')
  }).sort({ updatedAt: -1 });
}

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
      ...DEFAULT_SOCIAL_LINKS
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
      $or: buildAudienceFilters(audience)
    }).sort({ updatedAt: -1 });

    if (page) {
      let data = parseCmsPageContent(page) || {};

      // Add common DB fields if not present in parsed JSON
      if (!data.title) data.title = page.title;
      data.updatedAt = page.updatedAt;
      data.slug = slug;
      data.audience = page.audience || audience;

      if (slug === 'contact-us') {
        const settingsPage = await getSharedAppSettingsPage();
        const settingsData = parseCmsPageContent(settingsPage) || {};
        const socialLinksSource = Array.isArray(settingsData.socialLinks) && settingsData.socialLinks.length
          ? settingsData.socialLinks
          : Array.isArray(data.socialLinks) && data.socialLinks.length
            ? data.socialLinks
            : DEFAULT_SOCIAL_LINKS;

        data.socialLinks = normalizeSocialLinks(socialLinksSource);
        data.socialProfiles = buildSocialProfiles(data.socialLinks);
      }

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
      const fallbackData = { ...defaultData };
      if (slug === 'contact-us') {
        const settingsPage = await getSharedAppSettingsPage();
        const settingsData = parseCmsPageContent(settingsPage) || {};
        const socialLinksSource = Array.isArray(settingsData.socialLinks) && settingsData.socialLinks.length
          ? settingsData.socialLinks
          : defaultData.socialLinks || DEFAULT_SOCIAL_LINKS;

        fallbackData.socialLinks = normalizeSocialLinks(socialLinksSource);
        fallbackData.socialProfiles = buildSocialProfiles(fallbackData.socialLinks);
      }

      return Response.json({
        success: true,
        message: 'Content fetched successfully (default)',
        data: {
          ...fallbackData,
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
