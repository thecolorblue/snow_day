import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { getFrontPageData } from '@/lib/front-page-queries';

// GET /api/front-page - Get all data needed for the front page
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession();
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const frontPageData = await getFrontPageData(session.user.email);

    return NextResponse.json(frontPageData);
  } catch (error) {
    console.error('Error fetching front page data:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}