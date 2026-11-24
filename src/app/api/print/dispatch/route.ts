import { NextRequest, NextResponse } from 'next/server';
import { createAdminSupabaseClient, getAuthenticatedStaff } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

const PRINT_SETTINGS_KEY = 'print_bridge_config';
const PRINT_QUEUE_KEY = 'print_bridge_queue';
const JOB_TTL_MS = 3 * 60 * 1000;

export interface PrintBridgeCloudConfig {
  receiptPrinterName: string;
  labelPrinterName: string;
  bridgeUrl: string;
  autoFallbackToBrowser: boolean;
  updatedAt?: string;
}

export interface QueuedRemotePrintJob {
  jobId: string;
  jobType: 'receipt' | 'label';
  printerName: string;
  tableName: string;
  htmlList: string[];
  widthMm: number;
  heightMm: number;
  requestedBy: string;
  sentAt: number;
}

const DEFAULT_CLOUD_CONFIG: PrintBridgeCloudConfig = {
  receiptPrinterName: '',
  labelPrinterName: '',
  bridgeUrl: 'http://127.0.0.1:18181',
  autoFallbackToBrowser: true,
};

// Hàng đợi bộ nhớ đệm dự phòng song song với bảng app_settings
const memoryPrintQueue: QueuedRemotePrintJob[] = [];

/**
 * GET:
 * - Mặc định: Lấy cấu hình tên máy in USB đã lưu trên Cloud
 * - Khi có `?claim=1`: Máy tính quầy lấy và nhận (claim) các lệnh in từ xa đang chờ trong hàng đợi
 */
export async function GET(request: NextRequest) {
  try {
    const isClaim = request.nextUrl.searchParams.get('claim') === '1';
    const admin = createAdminSupabaseClient();

    if (isClaim) {
      const now = Date.now();
      const claimedMap = new Map<string, QueuedRemotePrintJob>();

      while (memoryPrintQueue.length > 0) {
        const item = memoryPrintQueue.shift()!;
        if (now - item.sentAt < JOB_TTL_MS) {
          claimedMap.set(item.jobId, item);
        }
      }

      if (admin) {
        const { data: queueRow } = await admin
          .from('app_settings')
          .select('value')
          .eq('key', PRINT_QUEUE_KEY)
          .maybeSingle();

        const dbJobs = Array.isArray((queueRow?.value as any)?.jobs)
          ? ((queueRow?.value as any).jobs as QueuedRemotePrintJob[])
          : [];

        const validDbJobs = dbJobs.filter((j) => j && j.jobId && now - Number(j.sentAt || 0) < JOB_TTL_MS);
        for (const job of validDbJobs) {
          claimedMap.set(job.jobId, job);
        }

        if (dbJobs.length > 0) {
          await admin.from('app_settings').upsert(
            [
              {
                key: PRINT_QUEUE_KEY,
                value: { jobs: [] },
                updated_at: new Date().toISOString(),
              },
            ],
            { onConflict: 'key' }
          );
        }
      }

      return NextResponse.json({
        success: true,
        jobs: Array.from(claimedMap.values()),
      });
    }

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
    return NextResponse.json({ success: true, config: DEFAULT_CLOUD_CONFIG, jobs: [] });
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

    // Lấy tên máy in cấu hình trên Cloud nếu client chưa truyền lên
    let printerName = String(body.printerName || '').trim();
    if (!printerName && admin) {
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

    const jobPayload: QueuedRemotePrintJob = {
      jobId,
      jobType,
      printerName,
      tableName,
      htmlList,
      widthMm: Number(body.widthMm) || (jobType === 'label' ? 50 : 80),
      heightMm: Number(body.heightMm) || (jobType === 'label' ? 30 : 0),
      requestedBy,
      sentAt: Date.now(),
    };

    // 1. Lưu vào hàng đợi bộ nhớ & Database (app_settings) để máy tính luôn nhận được 100% kể cả khi WebSocket lỗi
    memoryPrintQueue.push(jobPayload);
    while (memoryPrintQueue.length > 20) {
      memoryPrintQueue.shift();
    }

    if (admin) {
      try {
        const now = Date.now();
        const { data: existingQueue } = await admin
          .from('app_settings')
          .select('value')
          .eq('key', PRINT_QUEUE_KEY)
          .maybeSingle();

        const prevJobs = Array.isArray((existingQueue?.value as any)?.jobs)
          ? ((existingQueue?.value as any).jobs as QueuedRemotePrintJob[])
          : [];
        const nextJobs = [
          ...prevJobs.filter((j) => j && now - Number(j.sentAt || 0) < JOB_TTL_MS),
          jobPayload,
        ].slice(-15);

        await admin.from('app_settings').upsert(
          [
            {
              key: PRINT_QUEUE_KEY,
              value: { jobs: nextJobs },
              updated_at: new Date().toISOString(),
            },
          ],
          { onConflict: 'key' }
        );
      } catch (dbQueueErr) {
        console.warn('Save print_bridge_queue warning:', dbQueueErr);
      }

      // 2. Phát song song qua Supabase Realtime (timeout 900ms để không treo nếu CHANNEL_ERROR)
      try {
        const channel = admin.channel('h2:print-bridge');
        await new Promise<void>((resolve) => {
          const t = setTimeout(() => resolve(), 900);
          channel.subscribe((status) => {
            if (status === 'SUBSCRIBED' || status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
              clearTimeout(t);
              resolve();
            }
          });
        });
        await channel.send({
          type: 'broadcast',
          event: 'remote_print_job',
          payload: jobPayload,
        });
        await admin.removeChannel(channel);
      } catch {
        // ignore realtime error since DB queue is already persisted
      }
    }

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
      { success: false, error: err?.message || 'Lỗi khi gửi lệnh in tới máy tính' },
      { status: 500 }
    );
  }
}
