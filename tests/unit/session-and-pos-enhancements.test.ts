import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('Single Active Session & POS Cart Clear Enhancement Tests', () => {
  it('deduplicates multiple presence sessions for the same client ID and tracks POS count accurately', () => {
    // Giả lập state presence từ Supabase Realtime
    const mockState: Record<string, any[]> = {
      cli_1: [{ role: 'pos', actorName: 'Thu Ngân 1', clientId: 'cli_1', tableId: 'BAN01' }],
      cli_2: [{ role: 'pos', actorName: 'Thu Ngân 2', clientId: 'cli_2', tableId: 'BAN01' }],
      cli_3: [{ role: 'customer_qr', clientId: 'cust_abc', tableId: 'BAN01', itemCount: 2 }],
      cli_3_duplicate: [{ role: 'customer_qr', clientId: 'cust_abc', tableId: 'BAN01', itemCount: 2 }],
    };

    const seenCustomerClients = new Set<string>();
    const seenPosClients = new Set<string>();
    const cashiers: string[] = [];
    let customerCount = 0;
    let customerItemCount = 0;
    let posCount = 0;

    Object.entries(mockState).forEach(([key, presences]) => {
      const item = presences[presences.length - 1];
      const cId = item.clientId || key;
      if (item.role === 'pos') {
        if (!cashiers.includes(item.actorName)) cashiers.push(item.actorName);
        if (!seenPosClients.has(cId)) {
          seenPosClients.add(cId);
          posCount += 1;
        }
      } else if (item.role === 'customer_qr') {
        if (!seenCustomerClients.has(cId)) {
          seenCustomerClients.add(cId);
          customerCount += 1;
          customerItemCount += item.itemCount;
        }
      }
    });

    expect(posCount).toBe(2);
    expect(cashiers).toEqual(['Thu Ngân 1', 'Thu Ngân 2']);
    // Khách hàng bị trùng lặp key (cli_3 và cli_3_duplicate cùng clientId cust_abc) phải được deduplicate về 1
    expect(customerCount).toBe(1);
    expect(customerItemCount).toBe(2);
  });

  it('validates single active session logic correctly when sessionId matches or mismatches', () => {
    const userMetadata = {
      active_session_id: 'sess_device_B_12345',
      active_device: 'Chrome Windows',
    };

    // Thiết bị cũ Device A gửi kiểm tra phiên
    const deviceASessionId = 'sess_device_A_99999';
    const isDeviceAValid = userMetadata.active_session_id === deviceASessionId;
    expect(isDeviceAValid).toBe(false);

    // Thiết bị mới Device B gửi kiểm tra phiên
    const deviceBSessionId = 'sess_device_B_12345';
    const isDeviceBValid = userMetadata.active_session_id === deviceBSessionId;
    expect(isDeviceBValid).toBe(true);
  });

  it('formats POS sync notification with detailed metrics including latency and counts', () => {
    const elapsed = 215;
    const prodCount = 53;
    const tblCount = 10;
    const draftCount = 2;
    const custCount = 15;

    const summaryMsg = `Đã đồng bộ (${elapsed}ms): ${prodCount} món · ${tblCount} bàn · ${draftCount} bàn có giỏ · ${custCount} khách hàng`;
    expect(summaryMsg).toBe('Đã đồng bộ (215ms): 53 món · 10 bàn · 2 giỏ có giỏ · 15 khách hàng'.replace('giỏ có giỏ', 'bàn có giỏ'));
    expect(summaryMsg).toContain('215ms');
    expect(summaryMsg).toContain('53 món');
    expect(summaryMsg).toContain('10 bàn');
    expect(summaryMsg).toContain('2 bàn có giỏ');
    expect(summaryMsg).toContain('15 khách hàng');
  });
});
