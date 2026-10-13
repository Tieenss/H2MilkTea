import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: Request) {
  console.log("URL:", process.env.NEXT_PUBLIC_SUPABASE_URL);
  console.log("KEY exists:", !!process.env.SUPABASE_SERVICE_ROLE_KEY);

  // Khởi tạo Supabase client với quyền Admin (bỏ qua RLS)
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || ''
  );
  try {
    const { username, password } = await request.json();

    if (!username || !password) {
      return NextResponse.json({ error: 'Missing username or password' }, { status: 400 });
    }

    // Tự động gán đuôi email cho username
    const email = username.includes('@') ? username : `${username}@h2.com`;

    // Gọi API của Supabase để tạo User Authentication
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email: email,
      password: password,
      email_confirm: true, // Tự động xác nhận email
    });

    if (error) {
      // Bỏ qua lỗi nếu user đã tồn tại (để có thể cập nhật thông tin ở bước sau)
      if (error.message.includes('already exists')) {
        return NextResponse.json({ success: true, message: 'User already exists' }, { status: 200 });
      }
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true, user: data.user }, { status: 200 });
  } catch (error: any) {
    console.error('Create user error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
