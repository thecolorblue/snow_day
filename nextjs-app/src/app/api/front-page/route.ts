import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { getFrontPageData } from '@/lib/front-page-queries';
import { stringifyBigInts } from '@/lib/json-utils';

// GET /api/front-page - Get all data needed for the front page
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession();
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const frontPageData = await getFrontPageData(session.user.email);
    const serializableData = stringifyBigInts(frontPageData);

    return NextResponse.json(serializableData);
  } catch (error) {
    console.error('Error fetching front page data:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}