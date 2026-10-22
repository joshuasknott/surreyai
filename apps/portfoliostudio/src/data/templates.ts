import type { PortfolioDocument, PortfolioItem, PortfolioSection, PortfolioTemplate, PortfolioTheme } from '../../shared/portfolio';

const image = {
  sculpture: '/images/template-cobalt-sculpture.webp',
  studio: 'https://images.unsplash.com/photo-1558655146-d09347e92766?auto=format&fit=crop&w=1200&q=85',
  architecture: '/images/template-desert-concrete.webp',
  model: 'https://images.unsplash.com/photo-1511818966892-d7d671e672a2?auto=format&fit=crop&w=1200&q=85',
  field: 'https://images.unsplash.com/photo-1532094349884-543bc11b234d?auto=format&fit=crop&w=1500&q=85',
  neural: '/images/template-neural-branch.webp',
  forest: 'https://images.unsplash.com/photo-1448375240586-882707db888b?auto=format&fit=crop&w=1500&q=85',
  data: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=1400&q=85',
  product: 'https://images.unsplash.com/photo-1567016432779-094069958ea5?auto=format&fit=crop&w=1400&q=85',
  film: 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=1500&q=85',
  paper: 'https://images.unsplash.com/photo-1455390582262-044cdead277a?auto=format&fit=crop&w=1400&q=85',
  fashion: 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&w=1400&q=85',
  city: 'https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?auto=format&fit=crop&w=1500&q=85',
};

const profile: PortfolioDocument['profile'] = {
  name: 'Amina Patel',
  headline: 'Computer Science student & creative developer',
  bio: 'I turn complex problems into clear, useful digital experiences. I care about thoughtful details, accessible systems and work that helps people move forward.',
  location: 'Guildford, UK',
  email: 'hello@example.com',
  photo: '',
  links: [
    { id: 'github', label: 'GitHub', url: 'https://github.com/' },
    { id: 'linkedin', label: 'LinkedIn', url: 'https://www.linkedin.com/' },
  ],
};

type ThemeColors = Pick<PortfolioTheme, 'background' | 'surface' | 'color' | 'muted' | 'accent' | 'border' | 'headingFont' | 'bodyFont'> & Partial<Pick<PortfolioTheme, 'headingWeight' | 'radius' | 'maxWidth' | 'fontSize' | 'navigation'>>;
function theme(value: ThemeColors): PortfolioTheme {
  return { headingWeight: 600, radius: 8, maxWidth: 1200, fontSize: 16, navigation: 'minimal', ...value };
}
function style(themeValue: PortfolioTheme, overrides: Partial<PortfolioSection['style']> = {}): PortfolioSection['style'] {
  return {
    background: themeValue.background, color: themeValue.color, accent: themeValue.accent, paddingTop: 88, paddingBottom: 88,
    textAlign: 'left', columns: 2, imagePosition: 'right', imageWidth: 50, ...overrides,
  };
}
function item(id: string, title: string, description: string, imageUrl: string, tags: string[] = [], date = ''): PortfolioItem {
  return { id, title, subtitle: '', description, image: imageUrl, imageAlt: title, url: '', tags, date };
}
function section(themeValue: PortfolioTheme, id: string, type: PortfolioSection['type'], title: string, body: string, options: Partial<PortfolioSection> = {}): PortfolioSection {
  return {
    id, type, title, subtitle: '', body, image: '', imageAlt: '', layout: 'split', visible: true, style: style(themeValue),
    items: [], buttonLabel: '', buttonUrl: '', ...options,
  };
}
function makeDocument(id: string, name: string, themeValue: PortfolioTheme, sections: PortfolioSection[], person: PortfolioDocument['profile'] = profile): PortfolioDocument {
  return { version: 1, name, templateId: id, profile: person, theme: themeValue, sections, seo: { title: person.name + ' — ' + person.headline, description: person.bio } };
}

const cobalt = theme({ background: '#f7f4ec', surface: '#ffffff', color: '#253149', muted: '#667085', accent: '#173ed8', border: '#dce1eb', headingFont: 'inter', bodyFont: 'inter', headingWeight: 500, radius: 6, maxWidth: 1400 });
const form = theme({ background: '#ece6da', surface: '#f7f3eb', color: '#292622', muted: '#777067', accent: '#b95532', border: '#cec4b6', headingFont: 'fraunces', bodyFont: 'inter', headingWeight: 500, radius: 0, maxWidth: 1360, navigation: 'split' });
const fieldnotes = theme({ background: '#0d2b2a', surface: '#173a38', color: '#f7f1e8', muted: '#b9c8bf', accent: '#e9cf67', border: '#44625d', headingFont: 'fraunces', bodyFont: 'inter', headingWeight: 500, radius: 2, maxWidth: 1320, navigation: 'split' });
const signal = theme({ background: '#eef2f4', surface: '#ffffff', color: '#123247', muted: '#5d737e', accent: '#18a8b4', border: '#ccdae0', headingFont: 'space-grotesk', bodyFont: 'plex-mono', headingWeight: 600, radius: 10, maxWidth: 1240, fontSize: 15, navigation: 'centered' });
const studio = theme({ background: '#f4f1ea', surface: '#fffdf8', color: '#121212', muted: '#6c6964', accent: '#ef4b2f', border: '#d9d3c9', headingFont: 'space-grotesk', bodyFont: 'inter', headingWeight: 600, radius: 18, maxWidth: 1320, navigation: 'split' });
const bloom = theme({ background: '#f4eedf', surface: '#fffaf0', color: '#1f3a2f', muted: '#66756a', accent: '#e27b5f', border: '#d7d7bf', headingFont: 'fraunces', bodyFont: 'inter', headingWeight: 500, radius: 18, maxWidth: 1260 });
const frame = theme({ background: '#17171a', surface: '#242429', color: '#f1eee7', muted: '#a19e97', accent: '#f06a35', border: '#47464c', headingFont: 'space-grotesk', bodyFont: 'inter', headingWeight: 600, radius: 3, maxWidth: 1360, navigation: 'split' });
const archive = theme({ background: '#f4f0e8', surface: '#fffdf8', color: '#201e1d', muted: '#746e68', accent: '#6e2635', border: '#d7d0c7', headingFont: 'fraunces', bodyFont: 'inter', headingWeight: 500, radius: 0, maxWidth: 1080, navigation: 'centered' });
const patch = theme({ background: '#f1e9de', surface: '#fffaf4', color: '#492c45', muted: '#806d79', accent: '#c5da74', border: '#ddcfc5', headingFont: 'fraunces', bodyFont: 'inter', headingWeight: 500, radius: 4, maxWidth: 1360, navigation: 'split' });
const current = theme({ background: '#dcecf0', surface: '#f8fcfb', color: '#123b52', muted: '#557180', accent: '#c66a4b', border: '#b9d0d8', headingFont: 'fraunces', bodyFont: 'inter', headingWeight: 500, radius: 10, maxWidth: 1320, navigation: 'split' });

const twoProjects = (a: PortfolioItem, b: PortfolioItem) => [a, b];

export const templates: PortfolioTemplate[] = [
  {
    id: 'cobalt', name: 'Cobalt', discipline: 'Creative development', description: 'An airy split layout for thoughtful digital work.', category: 'Creative',
    document: makeDocument('cobalt', 'Amina’s portfolio', cobalt, [
      section(cobalt, 'hero', 'hero', 'Useful ideas. Thoughtfully built.', profile.bio, { subtitle: profile.headline, image: image.sculpture, imageAlt: 'Abstract cobalt and chrome sculpture', layout: 'split', style: style(cobalt, { paddingTop: 112, paddingBottom: 108, imageWidth: 52, headingSize: 86 }) }),
      section(cobalt, 'work', 'projects', 'Selected work', 'A few projects at the intersection of technology, design and everyday life.', { items: twoProjects(item('campus-compass', 'Campus Compass', 'Accessible wayfinding for complex places.', image.architecture, ['Product design', 'React'], '2026'), item('open-library', 'Open Library', 'A calmer way to discover what to read.', image.paper, ['Research', 'Interface'], '2025')), layout: 'grid', style: style(cobalt, { columns: 2 }) }),
      section(cobalt, 'about', 'about', 'A little about me', profile.bio, { layout: 'columns' }),
      section(cobalt, 'contact', 'contact', 'Let’s make something useful.', 'Have a project, question or kind thought? I’d love to hear from you.', { buttonLabel: 'Get in touch', layout: 'centered', style: style(cobalt, { background: cobalt.accent, color: '#ffffff', accent: '#ffffff', textAlign: 'center' }) }),
    ]),
  },
  {
    id: 'form', name: 'Form', discipline: 'Architecture', description: 'A calm, image-led canvas for spatial thinkers.', category: 'Creative',
    document: makeDocument('form', 'Theo Okafor — Architecture', form, [
      section(form, 'hero', 'hero', 'Spaces for everyday life.', 'I study how light, material and movement make shared places feel like home.', { subtitle: 'Theo Okafor · Architecture student', image: image.architecture, imageAlt: 'Warm modern pavilion', layout: 'editorial', style: style(form, { paddingTop: 96, paddingBottom: 100, imageWidth: 64, headingSize: 94 }) }),
      section(form, 'work', 'gallery', 'Selected work', 'Small buildings, generous thresholds and the details between them.', { items: twoProjects(item('common-ground', 'Common Ground', 'A community pavilion for shared life.', image.model, ['Pavilion', 'Community'], '2026'), item('tidal-house', 'Tidal House', 'An adaptive coastal dwelling.', image.city, ['Housing', 'Coast'], '2025')), layout: 'editorial', style: style(form, { columns: 1 }) }),
      section(form, 'about', 'text', 'Material, memory, movement.', 'I’m interested in architecture that is clear without being cold — spaces that let people gather, pause and belong.', { layout: 'statement', style: style(form, { textAlign: 'center', columns: 1, headingSize: 54 }) }),
      section(form, 'contact', 'contact', 'Start a conversation.', 'For studio collaborations, placements or a good conversation about public space.', { buttonLabel: 'Email Theo', layout: 'centered', style: style(form, { background: form.accent, color: '#fff8f0', accent: '#fff8f0', textAlign: 'center' }) }),
    ], { ...profile, name: 'Theo Okafor', headline: 'Architecture student', bio: 'I study how light, material and movement make shared places feel like home.' }),
  },
  {
    id: 'fieldnotes', name: 'Fieldnotes', discipline: 'Research & neuroscience', description: 'A considered editorial system for questions in progress.', category: 'Academic',
    document: makeDocument('fieldnotes', 'Maya Chen — Research', fieldnotes, [
      section(fieldnotes, 'hero', 'hero', 'Making sense of how we think.', 'I’m a neuroscience student interested in how the brain turns information into perception, memory and action.', { subtitle: 'Maya Chen · Neuroscience student', image: image.neural, imageAlt: 'Electric neural branches in a dark research visualization', layout: 'split', style: style(fieldnotes, { imageWidth: 54, headingSize: 82 }) }),
      section(fieldnotes, 'research', 'projects', 'Selected research', 'Notes, reading and small experiments as I learn more about the mind and the methods we use to study it.', { items: twoProjects(item('attention', 'Attention, interrupted', 'How context changes what we notice.', image.data, ['Cognition', 'Reading note']), item('sleep-memory', 'Sleep & memory', 'A visual essay on consolidation.', image.field, ['Memory', 'Essay'])), layout: 'columns', style: style(fieldnotes, { background: fieldnotes.surface, columns: 2 }) }),
      section(fieldnotes, 'notes', 'text', 'More notes coming soon.', 'This portfolio is a record of questions in progress. Sources and reflections are added as I go.', { layout: 'statement', style: style(fieldnotes, { textAlign: 'center', columns: 1 }) }),
      section(fieldnotes, 'contact', 'contact', 'Let’s compare notes.', 'For a conversation about research, learning or a thoughtful collaboration.', { buttonLabel: 'Get in touch', layout: 'centered', style: style(fieldnotes, { background: fieldnotes.accent, color: fieldnotes.background, accent: fieldnotes.background, textAlign: 'center' }) }),
    ], { ...profile, name: 'Maya Chen', headline: 'Neuroscience student', bio: 'I’m interested in how the brain turns information into perception, memory and action.' }),
  },
  {
    id: 'signal', name: 'Signal', discipline: 'Data science', description: 'A precise, modular home for systems and evidence.', category: 'Technical',
    document: makeDocument('signal', 'Signal — Data portfolio', signal, [
      section(signal, 'hero', 'hero', 'Designing systems people can trust.', 'I translate messy questions into clear models, useful tools and decisions people can explain.', { subtitle: 'Data science · analysis · visualisation', image: image.data, imageAlt: 'Data visualisation on a screen', layout: 'split', style: style(signal, { background: signal.color, color: signal.background, imageWidth: 48, headingSize: 68 }) }),
      section(signal, 'work', 'projects', 'Case studies', 'Selected work with transparent assumptions and useful outcomes.', { items: twoProjects(item('transit-signal', 'Transit Signal', 'A clearer way to understand a city network.', image.city, ['Data product', 'Python']), item('open-model', 'Open Model', 'Making model decisions easier to inspect.', image.data, ['Research', 'Visualisation'])), layout: 'bento', style: style(signal, { columns: 2 }) }),
      section(signal, 'skills', 'skills', 'Tools I use', 'Python · SQL · TypeScript · Observable · user research', { layout: 'list', style: style(signal, { background: signal.surface, columns: 1 }) }),
      section(signal, 'contact', 'contact', 'Have a question worth measuring?', 'I’m open to thoughtful technical projects, research and placements.', { buttonLabel: 'Say hello', layout: 'centered', style: style(signal, { background: signal.accent, color: '#ffffff', accent: signal.color, textAlign: 'center' }) }),
    ], { ...profile, name: 'Noah Williams', headline: 'Data science student & analyst', bio: 'I translate messy questions into clear models, useful tools and decisions people can explain.' }),
  },
  {
    id: 'studio', name: 'Studio', discipline: 'Product design', description: 'A confident, tactile portfolio for making and prototyping.', category: 'Creative',
    document: makeDocument('studio', 'Studio — Product design', studio, [
      section(studio, 'hero', 'hero', 'Objects with a point of view.', 'I design products that are clear to use, satisfying to hold and honest about what they do.', { subtitle: 'Ravi Singh · Product design student', image: image.product, imageAlt: 'Minimal chair in a quiet studio', layout: 'full', style: style(studio, { imagePosition: 'background', imageWidth: 80, headingSize: 88 }) }),
      section(studio, 'work', 'projects', 'Made, tested, refined.', 'A small selection of objects, interfaces and the thinking behind them.', { items: twoProjects(item('quiet-kettle', 'Quiet Kettle', 'A warmer everyday ritual.', image.product, ['Industrial', 'Prototype']), item('carry-light', 'Carry Light', 'A modular light for small spaces.', image.studio, ['Object', 'Material'])), layout: 'grid', style: style(studio, { background: studio.surface, columns: 2 }) }),
      section(studio, 'process', 'experience', 'My process is a conversation.', 'Research first, prototypes early, and enough room for the useful surprise.', { layout: 'timeline', style: style(studio, { columns: 1 }) }),
      section(studio, 'contact', 'contact', 'Let’s make the next version.', 'Available for product placements, studio collaborations and good problems.', { buttonLabel: 'Start a conversation', layout: 'centered', style: style(studio, { background: studio.accent, color: studio.surface, accent: studio.surface, textAlign: 'center' }) }),
    ], { ...profile, name: 'Ravi Singh', headline: 'Product design student', bio: 'I design products that are clear to use, satisfying to hold and honest about what they do.' }),
  },
  {
    id: 'bloom', name: 'Bloom', discipline: 'Biology & environment', description: 'An organic field journal for patient, evidence-led work.', category: 'Academic',
    document: makeDocument('bloom', 'Bloom — Field journal', bloom, [
      section(bloom, 'hero', 'hero', 'Carefully made, in public.', 'A field journal for learning how living systems change, and how we can pay better attention.', { subtitle: 'Ivy Morgan · Biology student', image: image.forest, imageAlt: 'Sunlight through a green forest', layout: 'split', style: style(bloom, { background: bloom.color, color: bloom.background, imageWidth: 52, headingSize: 80 }) }),
      section(bloom, 'work', 'gallery', 'Field notes', 'Small observations, careful methods and work that leaves room for uncertainty.', { items: twoProjects(item('river-watch', 'River Watch', 'A student-led water quality study.', image.forest, ['Fieldwork', 'Water']), item('seed-library', 'Seed Library', 'A visual guide to local growing stories.', image.field, ['Community', 'Ecology'])), layout: 'columns', style: style(bloom, { columns: 2 }) }),
      section(bloom, 'about', 'about', 'Learning out loud.', 'I’m interested in the careful, collaborative work between a question and an answer.', { layout: 'statement', style: style(bloom, { background: bloom.surface, textAlign: 'center', columns: 1 }) }),
      section(bloom, 'contact', 'contact', 'Come and look closer.', 'For fieldwork, projects or a slow conversation about living systems.', { buttonLabel: 'Get in touch', layout: 'centered', style: style(bloom, { background: bloom.accent, color: bloom.surface, accent: bloom.surface, textAlign: 'center' }) }),
    ], { ...profile, name: 'Ivy Morgan', headline: 'Biology student & field researcher', bio: 'A field journal for learning how living systems change, and how we can pay better attention.' }),
  },
  {
    id: 'frame', name: 'Frame', discipline: 'Film & media', description: 'A cinematic reel with a crisp, readable credits system.', category: 'Creative',
    document: makeDocument('frame', 'Frame — Film portfolio', frame, [
      section(frame, 'hero', 'hero', 'Stories, cut with intention.', 'Director, editor and curious collaborator. I make room for the quiet moment before the cut.', { subtitle: 'Leila Ahmed · Film & media student', image: image.film, imageAlt: 'Cinema seats in a dark theatre', layout: 'full', style: style(frame, { imagePosition: 'background', imageWidth: 80, headingSize: 88 }) }),
      section(frame, 'work', 'gallery', 'Selected frames', 'Short films, branded stories and the work between takes.', { items: twoProjects(item('after-rain', 'After the Rain', 'A short film about the walk home.', image.film, ['Director', 'Editor'], '2026'), item('small-hours', 'Small Hours', 'A portrait of a city before breakfast.', image.city, ['Documentary', 'Camera'], '2025')), layout: 'grid', style: style(frame, { background: frame.surface, columns: 2 }) }),
      section(frame, 'credits', 'experience', 'Credits', 'Direction · Editing · Camera · Sound · Production', { layout: 'list', style: style(frame, { columns: 1 }) }),
      section(frame, 'contact', 'contact', 'Roll camera.', 'Open to kind teams, brave ideas and projects with a point of view.', { buttonLabel: 'Get in touch', layout: 'centered', style: style(frame, { background: frame.accent, color: frame.background, accent: frame.background, textAlign: 'center' }) }),
    ], { ...profile, name: 'Leila Ahmed', headline: 'Film & media student', bio: 'Director, editor and curious collaborator. I make room for the quiet moment before the cut.' }),
  },
  {
    id: 'archive', name: 'Archive', discipline: 'History & writing', description: 'A reading-room layout for essays, research and references.', category: 'Academic',
    document: makeDocument('archive', 'Archive — Writing portfolio', archive, [
      section(archive, 'hero', 'hero', 'A practice in progress.', 'Essays, archives and questions about the stories we keep — and the ones we leave out.', { subtitle: 'Jon Bell · History & English student', image: image.paper, imageAlt: 'Open notebook and handwritten notes', layout: 'editorial', style: style(archive, { imageWidth: 46, headingSize: 84 }) }),
      section(archive, 'work', 'projects', 'Recent writing', 'A catalogue of essays, close readings and research in public.', { items: twoProjects(item('ordinary-archives', 'The ordinary archive', 'What everyday objects remember.', image.paper, ['Essay', 'History'], '2026'), item('margin-notes', 'Margin notes', 'Reading beside the canon.', image.studio, ['Criticism', 'Culture'], '2025')), layout: 'list', style: style(archive, { background: archive.surface, columns: 1 }) }),
      section(archive, 'about', 'text', 'Read slowly. Make connections.', 'I’m interested in accessible scholarship, generous citations and the texture of a well-made sentence.', { layout: 'statement', style: style(archive, { background: archive.accent, color: archive.background, accent: archive.background, textAlign: 'center', columns: 1, headingSize: 54 }) }),
      section(archive, 'contact', 'contact', 'Let’s continue the footnote.', 'For collaborations, reading groups or a thoughtful exchange.', { buttonLabel: 'Write to Jon', layout: 'centered', style: style(archive, { textAlign: 'center' }) }),
    ], { ...profile, name: 'Jon Bell', headline: 'History & English student', bio: 'Essays, archives and questions about the stories we keep — and the ones we leave out.' }),
  },
  {
    id: 'patch', name: 'Patch', discipline: 'Fashion & textiles', description: 'An editorial lookbook for material, colour and craft.', category: 'Creative',
    document: makeDocument('patch', 'Patch — Textile portfolio', patch, [
      section(patch, 'hero', 'hero', 'Clothes that move with people.', 'Material experiments and wearable stories made with patience, curiosity and a little bit of play.', { subtitle: 'Samira Khan · Fashion & textiles student', image: image.fashion, imageAlt: 'Editorial fashion detail', layout: 'split', style: style(patch, { background: patch.color, color: patch.background, imageWidth: 50, headingSize: 80 }) }),
      section(patch, 'work', 'gallery', 'The lookbook', 'Selected collections, studies and the details that make a piece feel alive.', { items: twoProjects(item('soft-structure', 'Soft structure', 'Draping with room to breathe.', image.fashion, ['Collection', 'Draping'], '2026'), item('repair-club', 'Repair club', 'A community toolkit for mending.', image.studio, ['Textile', 'Community'], '2025')), layout: 'grid', style: style(patch, { columns: 2 }) }),
      section(patch, 'process', 'experience', 'Cut, pin, repeat.', 'I start with material, test without fear and keep the useful accidents.', { layout: 'timeline', style: style(patch, { background: patch.surface, columns: 1 }) }),
      section(patch, 'contact', 'contact', 'Let’s make something tactile.', 'Available for studio work, collaborations and thoughtful making.', { buttonLabel: 'Say hello', layout: 'centered', style: style(patch, { background: patch.accent, color: patch.color, accent: patch.color, textAlign: 'center' }) }),
    ], { ...profile, name: 'Samira Khan', headline: 'Fashion & textiles student', bio: 'Material experiments and wearable stories made with patience, curiosity and a little bit of play.' }),
  },
  {
    id: 'current', name: 'Current', discipline: 'Geography & urban studies', description: 'A route-led portfolio for places shaped by change.', category: 'Professional',
    document: makeDocument('current', 'Current — Urban studies', current, [
      section(current, 'hero', 'hero', 'Places shaped by change.', 'I study the everyday systems that make a city feel open, connected and worth staying in.', { subtitle: 'Elliot Green · Geography & urban studies', image: image.city, imageAlt: 'City buildings and street grid', layout: 'split', style: style(current, { background: current.color, color: current.background, imageWidth: 54, headingSize: 80 }) }),
      section(current, 'work', 'projects', 'On the ground', 'Case studies from streets, maps and conversations.', { items: twoProjects(item('night-bus', 'Night bus stories', 'What a route reveals after dark.', image.city, ['Mobility', 'Interview'], '2026'), item('common-ground', 'Common ground', 'A map of small public spaces.', image.architecture, ['Public space', 'Mapping'], '2025')), layout: 'timeline', style: style(current, { columns: 1 }) }),
      section(current, 'about', 'about', 'Start with the walk.', 'I’m interested in the gap between a plan and the way a place is actually used.', { layout: 'columns', style: style(current, { background: current.surface, columns: 2 }) }),
      section(current, 'contact', 'contact', 'Let’s trace a route.', 'For fieldwork, urban projects or a question about the places we share.', { buttonLabel: 'Get in touch', layout: 'centered', style: style(current, { background: current.accent, color: current.surface, accent: current.surface, textAlign: 'center' }) }),
    ], { ...profile, name: 'Elliot Green', headline: 'Geography & urban studies student', bio: 'I study the everyday systems that make a city feel open, connected and worth staying in.' }),
  },
];

export function getTemplate(id: string): PortfolioTemplate {
  return templates.find((candidate) => candidate.id === id) ?? templates[0];
}

export function createFromTemplate(id: string, profileOverride: Partial<PortfolioDocument['profile']> = {}): PortfolioDocument {
  const cloned = JSON.parse(JSON.stringify(getTemplate(id).document)) as PortfolioDocument;
  const mergedProfile = { ...cloned.profile, ...profileOverride, links: profileOverride.links ?? cloned.profile.links };
  cloned.profile = mergedProfile;
  cloned.name = profileOverride.name ? profileOverride.name + '’s portfolio' : cloned.name;
  cloned.seo = { title: mergedProfile.name + ' — ' + mergedProfile.headline, description: mergedProfile.bio };
  return cloned;
}

export function blankPortfolio(profileOverride: Partial<PortfolioDocument['profile']> = {}): PortfolioDocument {
  const base = createFromTemplate('cobalt', profileOverride);
  return {
    ...base,
    name: profileOverride.name ? profileOverride.name + '’s portfolio' : 'Untitled portfolio',
    templateId: 'blank',
    sections: [
      section(cobalt, 'hero', 'hero', 'Your headline goes here.', profileOverride.bio || 'Tell people what you care about and what you are learning.', { subtitle: profileOverride.name || 'Your name', layout: 'centered', style: style(cobalt, { background: '#ffffff', color: '#171717', accent: '#ff4a00', paddingTop: 128, paddingBottom: 128, textAlign: 'center', columns: 1, headingSize: 76 }) }),
      section(cobalt, 'work', 'projects', 'Selected work', 'Add a project, case study or experience you are proud of.', { layout: 'grid', style: style(cobalt, { background: '#fafaf8', color: '#171717', columns: 2 }) }),
      section(cobalt, 'about', 'about', 'About you', 'Add a short introduction in your own words.', { layout: 'columns', style: style(cobalt, { background: '#ffffff', color: '#171717', columns: 2 }) }),
      section(cobalt, 'contact', 'contact', 'Let’s connect.', 'Add an email or link so people can find you.', { buttonLabel: 'Get in touch', layout: 'centered', style: style(cobalt, { background: '#171717', color: '#ffffff', accent: '#ff4a00', textAlign: 'center' }) }),
    ],
  };
}
