import { NextRequest, NextResponse } from 'next/server';
import defaultChunks from '@/data/project_knowledge_chunks.json';
import {
  createAdminSupabaseClient,
  getAuthenticatedStaff,
  getStaffRole,
  getSafeStaffUuid,
} from '@/lib/supabase/server';
import {
  retrieveProjectKnowledge,
  type ProjectKnowledgeChunk,
} from '@/lib/ai/ragEngine';

export const RAG_SETTINGS_KEY = 'store_custom_rag_chunks';

export async function GET(request: NextRequest) {
  try {
    const supabase = createAdminSupabaseClient();
    const staff = await getAuthenticatedStaff(request.headers.get('cookie') || '');
    const { isAdmin, role } = await getStaffRole(supabase, staff);
    const canManage = isAdmin || role === 'Quản lý';

    let chunks: ProjectKnowledgeChunk[] = defaultChunks as ProjectKnowledgeChunk[];

    if (supabase) {
      const { data } = await supabase
        .from('app_settings')
        .select('value')
        .eq('key', RAG_SETTINGS_KEY)
        .maybeSingle();

      if (data && Array.isArray(data.value) && data.value.length > 0) {
        chunks = data.value as ProjectKnowledgeChunk[];
      }
    }

    const query = request.nextUrl.searchParams.get('q')?.trim() || '';
    const roleScopeParam = request.nextUrl.searchParams.get('roleScope');
    const roleScope =
      roleScopeParam === 'customer' || roleScopeParam === 'staff' ? roleScopeParam : 'all';

    const retrievedResults = query
      ? retrieveProjectKnowledge(query, {
          topK: 5,
          roleScope,
          customChunks: chunks,
        })
      : [];

    return NextResponse.json({
      success: true,
      isAdmin: canManage,
      chunks,
      ...(query ? { retrievedResults } : {}),
    });
  } catch (error) {
    console.error('Lỗi khi tải RAG Chunks:', error);
    return NextResponse.json({
      success: true,
      isAdmin: false,
      chunks: defaultChunks as ProjectKnowledgeChunk[],
    });
  }
}

export async function PUT(request: NextRequest) {
  const staff = await getAuthenticatedStaff(request.headers.get('cookie') || '');
  if (!staff) {
    return NextResponse.json({ success: false, error: 'Phiên đăng nhập đã hết hạn.' }, { status: 401 });
  }

  const supabase = createAdminSupabaseClient();
  if (!supabase) {
    return NextResponse.json({ success: false, error: 'Không thể kết nối cơ sở dữ liệu.' }, { status: 503 });
  }

  const { isAdmin, role } = await getStaffRole(supabase, staff);
  if (!isAdmin && role !== 'Quản lý') {
    return NextResponse.json(
      { success: false, error: 'Chỉ Admin hoặc Quản lý mới có quyền cập nhật kho tri thức RAG.' },
      { status: 403 }
    );
  }

  try {
    const body = (await request.json()) as { chunks?: unknown };
    if (!body || !Array.isArray(body.chunks)) {
      return NextResponse.json({ success: false, error: 'Dữ liệu RAG Chunks không hợp lệ.' }, { status: 400 });
    }

    const cleanedChunks: ProjectKnowledgeChunk[] = body.chunks
      .filter((item): item is Record<string, any> => Boolean(item && typeof item === 'object'))
      .map((item, idx) => {
        const title = typeof item.title === 'string' ? item.title.trim() : '';
        const content = typeof item.content === 'string' ? item.content.trim() : '';
        const category = typeof item.category === 'string' && item.category.trim() ? item.category.trim() : 'Chung';
        const route = typeof item.route === 'string' ? item.route.trim() : '/user-guide';
        const sectionId = typeof item.sectionId === 'string' && item.sectionId.trim() ? item.sectionId.trim() : 'introduction';
        const sectionTitle = typeof item.sectionTitle === 'string' && item.sectionTitle.trim() ? item.sectionTitle.trim() : category;
        const roleScope: 'all' | 'staff' | 'customer' =
          item.roleScope === 'staff' || item.roleScope === 'customer' ? item.roleScope : 'all';
        const keywords = Array.isArray(item.keywords)
          ? item.keywords.map((k: any) => String(k).trim()).filter(Boolean)
          : [];
        const steps = Array.isArray(item.steps)
          ? item.steps.map((s: any) => String(s).trim()).filter(Boolean)
          : [];

        return {
          id: typeof item.id === 'string' && item.id.trim() ? item.id.trim() : `rag-chunk-${Date.now()}-${idx}`,
          category,
          title,
          route,
          sectionId,
          sectionTitle,
          roleScope,
          keywords,
          content,
          steps,
          isActive: typeof item.isActive === 'boolean' ? item.isActive : true,
        };
      })
      .filter((c) => c.title && c.content);

    const now = new Date().toISOString();
    const safeUpdatedBy = getSafeStaffUuid(staff.id);
    let { error: upsertError } = await supabase.from('app_settings').upsert(
      {
        key: RAG_SETTINGS_KEY,
        value: cleanedChunks,
        updated_by: safeUpdatedBy,
        updated_at: now,
      },
      { onConflict: 'key' }
    );

    if (upsertError && safeUpdatedBy) {
      const retryResult = await supabase.from('app_settings').upsert(
        {
          key: RAG_SETTINGS_KEY,
          value: cleanedChunks,
          updated_by: null,
          updated_at: now,
        },
        { onConflict: 'key' }
      );
      upsertError = retryResult.error;
    }

    if (upsertError) {
      console.error('Lỗi khi lưu RAG Chunks vào Supabase:', upsertError);
      return NextResponse.json({ success: false, error: 'Không thể lưu kho tri thức RAG.' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      isAdmin: true,
      chunks: cleanedChunks,
    });
  } catch (err) {
    console.error('Lỗi phân tích payload RAG:', err);
    return NextResponse.json({ success: false, error: 'Lỗi xử lý yêu cầu.' }, { status: 500 });
  }
}
