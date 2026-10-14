import { NextResponse } from 'next/server';

// Kept as an explicit migration response so stale clients never receive a false success.
export async function POST() {
  return NextResponse.json(
    { success: false, error: 'Phiên bản đặt món đã được cập nhật. Vui lòng tải lại trang và gửi lại đơn.' },
    { status: 410 },
  );
}
