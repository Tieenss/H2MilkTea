import { NextRequest, NextResponse } from 'next/server';
import { createAdminSupabaseClient, getAuthenticatedStaff } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

const PRINT_SETTINGS_KEY = 'print_bridge_config';

export interface PrintBridgeCloudConfig {
  receiptPrinterName: string;
  labelPrinterName: string;
  bridgeUrl: string;
  autoFallbackToBrowser: boolean;
  updatedAt?: string;
}

const DEFAULT_CLOUD_CONFIG: PrintBridgeCloudConfig = {
  receiptPrinterName: '',
  labelPrinterName: '',
  bridgeUrl: 'http://127.0.0.1:18181',
  autoFallbackToBrowser: true,
};

/**
 * GET: Lấy cấu hình tên máy in USB đã lưu trên Cloud (để điện thoại biết tên máy in của quán)
 */
export async function GET() {
  try {
    const admin = createAdminSupabaseClient();
    if (!admin) {
      return NextResponse.json({ success: true, config: DEFAULT_CLOUD_CONFIG });
    }

    const { data, error } = await admin
      .from('app_settings')
      .select('value')
      .eq('key', PRINT_SETTINGS_KEY)
      .maybeSingle();

    if (error || !data?.value) {
      return NextResponse.json({ success: true, config: DEFAULT_CLOUD_CONFIG });
    }

    return NextResponse.json({
      success: true,
      config: { ...DEFAULT_CLOUD_CONFIG, ...(data.value as Record<string, any>) },
    });
  } catch (err: any) {
    console.warn('GET /api/print/dispatch warning:', err?.message);
    return NextResponse.json({ success: true, config: DEFAULT_CLOUD_CONFIG });
  }
}

/**
 * PUT: Lưu cấu hình tên máy in USB (Hóa đơn & Tem nhãn) lên Cloud
 */
export async function PUT(request: NextRequest) {
  try {
    const staff = await getAuthenticatedStaff(request.headers.get('cookie') || '');
    if (!staff) {
      return NextResponse.json({ success: false, error: 'Chưa đăng nhập' }, { status: 401 });
    }

    const body = await request.json();
    const admin = createAdminSupabaseClient();
    if (!admin) {
      return NextResponse.json(
        { success: false, error: 'Chưa cấu hình SUPABASE_SERVICE_ROLE_KEY' },
        { status: 503 }
      );
    }

    const nextConfig: PrintBridgeCloudConfig = {
      receiptPrinterName: String(body.receiptPrinterName || '').trim(),
      labelPrinterName: String(body.labelPrinterName || '').trim(),
      bridgeUrl: String(body.bridgeUrl || 'http://127.0.0.1:18181').trim(),
      autoFallbackToBrowser: body.autoFallbackToBrowser !== false,
      updatedAt: new Date().toISOString(),
    };

    const { error } = await admin.from('app_settings').upsert(
      [
        {
          key: PRINT_SETTINGS_KEY,
          value: nextConfig,
          updated_at: nextConfig.updatedAt,
        },
      ],
      { onConflict: 'key' }
    );

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, config: nextConfig });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || 'Lỗi lưu cấu hình máy in' },
      { status: 500 }
    );
  }
}

/**
 * POST: Điện thoại / Tablet gửi lệnh in từ xa (đúng bàn đang chọn) sang Máy tính cắm máy in USB
 */
export async function POST(request: NextRequest) {
  try {
    const staff = await getAuthenticatedStaff(request.headers.get('cookie') || '');
    if (!staff) {
      return NextResponse.json({ success: false, error: 'Bạn cần đăng nhập để gửi lệnh in.' }, { status: 401 });
    }

    const body = await request.json();
    const jobType: 'receipt' | 'label' = body.jobType === 'label' ? 'label' : 'receipt';
    const htmlList: string[] = Array.isArray(body.htmlList)
      ? body.htmlList.filter((h: unknown) => typeof h === 'string' && h.length > 0)
      : typeof body.html === 'string' && body.html
      ? [body.html]
      : [];

    if (htmlList.length === 0) {
      return NextResponse.json({ success: false, error: 'Thiếu nội dung bản in (htmlList).' }, { status: 400 });
    }

    const admin = createAdminSupabaseClient();
    if (!admin) {
      return NextResponse.json(
        { success: false, error: 'Không thể kết nối Supabase Realtime để gửi lệnh in từ xa.' },
        { status: 503 }
      );
    }

    // Lấy tên máy in cấu hình trên Cloud nếu client chưa truyền lên
    let printerName = String(body.printerName || '').trim();
    if (!printerName) {
      const { data: settingRow } = await admin
        .from('app_settings')
        .select('value')
        .eq('key', PRINT_SETTINGS_KEY)
        .maybeSingle();
      const cloudCfg = (settingRow?.value || {}) as Partial<PrintBridgeCloudConfig>;
      printerName =
        jobType === 'label'
          ? String(cloudCfg.labelPrinterName || '')
          : String(cloudCfg.receiptPrinterName || '');
    }

    const jobId = `pj_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const tableName = String(body.tableName || 'Khách mang về').trim();
    const requestedBy = String(
      body.requestedBy ||
        staff?.user_metadata?.fullName ||
        staff?.user_metadata?.name ||
        staff?.user_metadata?.username ||
        staff?.email ||
        'Thiết bị di động'
    ).trim();

    const channel = admin.channel('h2:print-bridge');
    await channel.subscribe();
    await channel.send({
      type: 'broadcast',
      event: 'remote_print_job',
      payload: {
        jobId,
        jobType,
        printerName,
        tableName,
        htmlList,
        widthMm: Number(body.widthMm) || (jobType === 'label' ? 50 : 80),
        heightMm: Number(body.heightMm) || (jobType === 'label' ? 30 : 0),
        requestedBy,
        sentAt: Date.now(),
      },
    });
    await admin.removeChannel(channel);

    return NextResponse.json({
      success: true,
      jobId,
      tableName,
      printerName: printerName || 'Mặc định Windows',
      count: htmlList.length,
      message: `Đã gửi lệnh in ${jobType === 'label' ? `${htmlList.length} tem` : 'hóa đơn'} của bàn "${tableName}" tới máy tính quầy!`,
    });
  } catch (err: any) {
    console.error('POST /api/print/dispatch error:', err);
    return NextResponse.json(
      { success: false, error: err?.message || 'Lỗi gửi lệnh in từ xa' },
      { status: 500 }
    );
  }
}
