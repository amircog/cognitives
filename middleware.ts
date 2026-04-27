import { NextRequest, NextResponse } from 'next/server';

const EXPERIMENT_SLUGS = new Set([
  'stroop', 'drm', 'bouba-kiki', 'mentalRep', 'summaryStats',
  'posnerCueing', 'visualSearch', 'CompositeFace', 'wordSuperiority',
]);

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const segments = pathname.split('/').filter(Boolean);

  // Only intercept exact landing pages — /slug with no sub-routes
  if (segments.length !== 1 || !EXPERIMENT_SLUGS.has(segments[0])) {
    return NextResponse.next();
  }

  // Admin bypass: set when the homepage password is entered correctly
  if (request.cookies.get('cognitives_admin')?.value === '1') {
    return NextResponse.next();
  }

  const supabaseUrl  = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey  = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseKey) return NextResponse.next();

  try {
    const slug = segments[0];
    const res  = await fetch(
      `${supabaseUrl}/rest/v1/experiment_locks?experiment_id=eq.${slug}&select=is_locked`,
      { headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` } }
    );
    const data: { is_locked: boolean }[] = await res.json();
    if (data?.[0]?.is_locked === true) {
      return NextResponse.redirect(
        new URL(`/locked?experiment=${slug}`, request.url)
      );
    }
  } catch {
    // Fail open — if Supabase is unreachable, allow through
  }

  return NextResponse.next();
}

// Only run on experiment landing pages (not sub-routes like /stroop/practice)
export const config = {
  matcher: [
    '/stroop', '/drm', '/bouba-kiki', '/mentalRep', '/summaryStats',
    '/posnerCueing', '/visualSearch', '/CompositeFace', '/wordSuperiority',
  ],
};
