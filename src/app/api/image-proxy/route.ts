import { NextRequest, NextResponse } from 'next/server';

const ALLOWED_HOST = 'images.unsplash.com';

const FALLBACK_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200" fill="none">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="200" y2="200" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#FFF7ED"/>
      <stop offset="100%" stop-color="#FFEDD5"/>
    </linearGradient>
  </defs>
  <rect width="200" height="200" rx="24" fill="url(#bg)"/>
  <path d="M74 64H126L119 144C118.4 150.2 113.2 155 107 155H93C86.8 155 81.6 150.2 81 144L74 64Z" fill="#FFFFFF" stroke="#EA580C" stroke-width="4" stroke-linejoin="round"/>
  <path d="M68 64H132" stroke="#EA580C" stroke-width="5" stroke-linecap="round"/>
  <path d="M100 64L108 40L122 36" stroke="#9A3412" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M80 102C88 96 112 108 120 102L116 142C115.6 146.4 111.9 149.8 107.5 149.8H92.5C88.1 149.8 84.4 146.4 84 142L80 102Z" fill="#FDBA74" opacity="0.85"/>
  <circle cx="92" cy="136" r="4" fill="#7C2D12"/>
  <circle cx="104" cy="140" r="4" fill="#7C2D12"/>
  <circle cx="110" cy="131" r="4" fill="#7C2D12"/>
</svg>`;

function fallbackSvgResponse() {
  return new NextResponse(FALLBACK_SVG, {
    status: 200,
    headers: {
      'Content-Type': 'image/svg+xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  });
}

export async function GET(request: NextRequest) {
  const rawUrl = request.nextUrl.searchParams.get('url');
  if (!rawUrl) {
    return fallbackSvgResponse();
  }

  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    return fallbackSvgResponse();
  }

  if (parsed.protocol !== 'https:' || parsed.hostname !== ALLOWED_HOST) {
    return fallbackSvgResponse();
  }

  try {
    const upstream = await fetch(parsed.toString(), {
      headers: {
        Accept: 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8',
      },
      signal: AbortSignal.timeout(5000),
      next: { revalidate: 86400 },
    });

    const contentType = upstream.headers.get('content-type') || '';
    if (!upstream.ok || !contentType.startsWith('image/')) {
      return fallbackSvgResponse();
    }

    const buffer = await upstream.arrayBuffer();
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800',
      },
    });
  } catch {
    return fallbackSvgResponse();
  }
}
