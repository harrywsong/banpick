// Competitive-only map names to filter from valorant-api.com
// These are all maps that have ever been in or are currently in the competitive pool
const COMPETITIVE_MAP_NAMES = new Set([
  'Ascent', 'Split', 'Fracture', 'Bind', 'Breeze',
  'Icebox', 'Haven', 'Pearl', 'Lotus', 'Sunset',
  'Abyss', 'Corrode',
]);

export async function GET() {
  try {
    const res = await fetch('https://valorant-api.com/v1/maps', {
      next: { revalidate: 3600 }, // cache for 1 hour
    });

    if (!res.ok) {
      throw new Error(`valorant-api.com returned ${res.status}`);
    }

    const json = await res.json();

    const maps = json.data
      .filter((m) => COMPETITIVE_MAP_NAMES.has(m.displayName))
      .map((m) => ({
        name: m.displayName,
        splash: m.splash,
        listViewIcon: m.listViewIcon,
        listViewIconTall: m.listViewIconTall,
        uuid: m.uuid,
      }))
      .sort((a, b) => a.name.localeCompare(b.name));

    return Response.json({ success: true, maps });
  } catch (err) {
    console.error('[API/maps] Failed to fetch from valorant-api.com:', err);
    // Fallback: return known map names without images
    const fallback = [
      'Abyss', 'Ascent', 'Bind', 'Breeze', 'Corrode',
      'Fracture', 'Haven', 'Icebox', 'Lotus', 'Pearl',
      'Split', 'Sunset',
    ].map((name) => ({ name, splash: null, listViewIcon: null, listViewIconTall: null, uuid: null }));

    return Response.json({ success: false, maps: fallback, error: err.message });
  }
}
