import { NextRequest, NextResponse } from 'next/server';
import { createAdminSupabaseClient } from '@/lib/supabase/server';

const DSNV_COLUMNS = [
  '_RowNumber',
  'username',
  'password',
  'Họ và Tên',
  'Chức vụ',
  'Phòng',
  'Phân quyền',
  'Email',
  'Image',
  'Quyền View',
  'Số điện thoại',
  'Địa chỉ',
  'Ngày sinh',
  'Ngày vào làm',
  'Ghi chú',
];

function sanitizeDsnvRecord(raw: Record<string, any>, cleanUsername: string, cleanPassword: string) {
  const sanitized: Record<string, any> = {};
  for (const col of DSNV_COLUMNS) {
    if (raw[col] !== undefined) {
      sanitized[col] = raw[col];
    }
  }
  sanitized.username = cleanUsername;
  sanitized.password = cleanPassword;
  sanitized['Họ và Tên'] = String(raw['Họ và Tên'] || raw.fullName || raw.name || cleanUsername).trim();
  sanitized['Phân quyền'] = String(raw['Phân quyền'] || raw.role || 'Nhân viên').trim();
  sanitized['Chức vụ'] = String(raw['Chức vụ'] || '').trim();
  sanitized['Phòng'] = String(raw['Phòng'] || '').trim();
  sanitized.Email = String(raw.Email || raw.email || `${cleanUsername}@h2.com`).trim();
  return sanitized;
}

export async function POST(request: NextRequest) {
  const supabaseAdmin = createAdminSupabaseClient();
  if (!supabaseAdmin) {
    return NextResponse.json(
      { success: false, error: 'Chưa cấu hình SUPABASE_SERVICE_ROLE_KEY trên máy chủ.' },
      { status: 503 }
    );
  }

  try {
    const body = await request.json();
    const rawUsername = body.username ?? body.employeeData?.username;
    const rawPassword = body.password ?? body.employeeData?.password;
    const employeePayload: Record<string, any> | null =
      body.employeeData && typeof body.employeeData === 'object'
        ? body.employeeData
        : body['Họ và Tên'] !== undefined || body['Phân quyền'] !== undefined
        ? body
        : null;

    const cleanUsername = String(rawUsername || '').trim();
    const cleanPassword = String(rawPassword || '');

    if (!cleanUsername) {
      return NextResponse.json(
        { success: false, error: 'Tên đăng nhập không được để trống.' },
        { status: 400 }
      );
    }

    if (cleanUsername.length < 3 || cleanUsername.length > 30) {
      return NextResponse.json(
        { success: false, error: 'Tên đăng nhập phải có độ dài từ 3 đến 30 ký tự.' },
        { status: 400 }
      );
    }

    // Chỉ cho phép chữ cái không dấu, số, dấu gạch dưới _, gạch ngang -, dấu chấm . (hoặc email hợp lệ)
    const validUsernameRegex = /^[a-zA-Z0-9._-]+(@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})?$/;
    if (!validUsernameRegex.test(cleanUsername)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Tên đăng nhập không được chứa khoảng trắng hoặc dấu tiếng Việt (chỉ dùng a-z, 0-9, _, -)',
        },
        { status: 400 }
      );
    }

    if (!cleanPassword || cleanPassword.length < 6) {
      return NextResponse.json(
        { success: false, error: 'Mật khẩu phải có ít nhất 6 ký tự' },
        { status: 400 }
      );
    }

    // 1. Kiểm tra xem username đã tồn tại trong bảng DSNV trên Supabase chưa
    const { data: existingDsnv, error: checkDsnvErr } = await supabaseAdmin
      .from('DSNV')
      .select('username')
      .ilike('username', cleanUsername)
      .maybeSingle();

    if (!checkDsnvErr && existingDsnv && !body.allowOverwrite) {
      return NextResponse.json(
        {
          success: false,
          error: `Tên đăng nhập "${cleanUsername}" đã tồn tại trong danh sách nhân viên!`,
        },
        { status: 400 }
      );
    }

    // 2. Tự động gán đuôi email @h2.com cho Supabase Auth
    const authEmail = cleanUsername.includes('@')
      ? cleanUsername.toLowerCase()
      : `${cleanUsername.toLowerCase()}@h2.com`;

    const fullName = String(
      employeePayload?.['Họ và Tên'] || body['Họ và Tên'] || cleanUsername
    ).trim();
    const role = String(
      employeePayload?.['Phân quyền'] || body['Phân quyền'] || 'Nhân viên'
    ).trim();

    let authUser: any = null;

    // 3. Tạo User trên Supabase Auth
    const { data: createdAuth, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: authEmail,
      password: cleanPassword,
      email_confirm: true,
      user_metadata: {
        username: cleanUsername,
        name: fullName,
        full_name: fullName,
        role,
      },
    });

    if (authError) {
      const errMsgLower = String(authError.message || '').toLowerCase();
      const isAlreadyRegistered =
        errMsgLower.includes('already exists') ||
        errMsgLower.includes('already been registered') ||
        errMsgLower.includes('already registered') ||
        (authError as any).code === 'email_exists';

      if (isAlreadyRegistered) {
        // Tìm user Auth đã tồn tại và cập nhật lại mật khẩu + metadata để đăng nhập được với mật khẩu mới
        const { data: listData, error: listErr } = await supabaseAdmin.auth.admin.listUsers({
          perPage: 1000,
        });

        if (listErr) {
          return NextResponse.json(
            { success: false, error: `Không thể đồng bộ tài khoản Auth: ${listErr.message}` },
            { status: 400 }
          );
        }

        const matchedUser = listData?.users?.find(
          (u) => String(u.email || '').toLowerCase() === authEmail
        );

        if (!matchedUser) {
          return NextResponse.json(
            {
              success: false,
              error: 'Tài khoản Auth đã tồn tại nhưng không thể tìm thấy để cập nhật mật khẩu.',
            },
            { status: 400 }
          );
        }

        const { data: updatedAuth, error: updateAuthErr } =
          await supabaseAdmin.auth.admin.updateUserById(matchedUser.id, {
            password: cleanPassword,
            email_confirm: true,
            user_metadata: {
              ...(matchedUser.user_metadata || {}),
              username: cleanUsername,
              name: fullName,
              full_name: fullName,
              role,
            },
          });

        if (updateAuthErr) {
          return NextResponse.json(
            {
              success: false,
              error: `Không thể cập nhật mật khẩu cho tài khoản: ${updateAuthErr.message}`,
            },
            { status: 400 }
          );
        }

        authUser = updatedAuth.user;
      } else {
        // Dịch một số lỗi phổ biến của Supabase Auth sang tiếng Việt
        let viMessage = authError.message;
        if (errMsgLower.includes('password should be at least')) {
          viMessage = 'Mật khẩu phải có ít nhất 6 ký tự.';
        } else if (errMsgLower.includes('invalid email') || errMsgLower.includes('unable to validate email')) {
          viMessage = 'Tên đăng nhập hoặc định dạng Email không hợp lệ.';
        }
        return NextResponse.json({ success: false, error: viMessage }, { status: 400 });
      }
    } else {
      authUser = createdAuth.user;
    }

    // 4. Lưu trực tiếp bản ghi nhân viên vào bảng DSNV trên Supabase để đảm bảo 100% đồng bộ
    let savedEmployee: Record<string, any> | null = null;
    if (employeePayload) {
      const recordToInsert = sanitizeDsnvRecord(employeePayload, cleanUsername, cleanPassword);

      // Tính _RowNumber tiếp theo nếu chưa có
      if (!recordToInsert._RowNumber) {
        try {
          const { data: rows } = await supabaseAdmin.from('DSNV').select('_RowNumber');
          const maxRow = Array.isArray(rows)
            ? rows.reduce((max, r: any) => Math.max(max, parseInt(r?._RowNumber) || 0), 1)
            : 1;
          recordToInsert._RowNumber = String(maxRow + 1);
        } catch {
          recordToInsert._RowNumber = String(Date.now()).slice(-4);
        }
      }

      let currentPayload = { ...recordToInsert };
      let dsnvData: any = null;
      let dsnvError: any = null;

      // Thử tối đa 3 lần nếu bảng trên Supabase thiếu một số cột tùy chọn
      for (let attempt = 0; attempt < 3; attempt++) {
        const res = await supabaseAdmin
          .from('DSNV')
          .upsert([currentPayload], { onConflict: 'username' })
          .select();

        dsnvData = res.data;
        dsnvError = res.error;

        if (!dsnvError) break;

        // Kiểm tra lỗi thiếu cột (PGRST204: Could not find the 'X' column of 'DSNV' in the schema cache)
        const colMatch = dsnvError.message?.match(/Could not find the '([^']+)' column/i);
        if (colMatch && colMatch[1] && colMatch[1] in currentPayload) {
          delete currentPayload[colMatch[1]];
          continue;
        }
        break;
      }

      if (dsnvError) {
        console.error('Lỗi lưu nhân viên vào bảng DSNV:', dsnvError);
        return NextResponse.json(
          {
            success: false,
            error: `Không thể lưu hồ sơ nhân viên vào bảng DSNV: ${dsnvError.message}`,
          },
          { status: 400 }
        );
      }

      savedEmployee = Array.isArray(dsnvData) && dsnvData.length > 0 ? dsnvData[0] : currentPayload;
    }

    return NextResponse.json(
      {
        success: true,
        user: authUser,
        employee: savedEmployee,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Create user error:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Lỗi máy chủ khi tạo tài khoản nhân viên' },
      { status: 500 }
    );
  }
}
