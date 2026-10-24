import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { createClient } from '@supabase/supabase-js';
import { diffCartItems } from '../src/lib/cart/mergeCart';

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  const adminClient = createClient(url, serviceKey);
  const device1 = createClient(url, anonKey);
  const device2 = createClient(url, anonKey);

  const tableId = 'BAN003'; // Bàn 05
  console.log('=== TEST MULTI-DEVICE CART SYNC ON TABLE', tableId, '===');

  // Device 1 state
  let device1Cart: any[] = [];
  let device1Version = 0;

  // Device 2 state
  let device2Cart: any[] = [];
  let device2Version = 0;

  // Channels
  const ch1 = device1.channel(`pos-cart-draft:${tableId}`, { config: { broadcast: { self: false } } });
  const ch2 = device2.channel(`pos-cart-draft:${tableId}`, { config: { broadcast: { self: false } } });

  ch1.on('broadcast', { event: 'cart_sync' }, (payload) => {
    const remote = payload.payload;
    if (remote.device_id === 'dev_1') return;
    console.log('[Device 1] Received remote cart sync:', remote.cart?.length, 'items, version:', remote.version);
    const diff = diffCartItems(device1Cart, remote.cart);
    if (diff.canAutoMerge) {
      device1Cart = diff.mergedCart;
      device1Version = Math.max(device1Version, remote.version);
    }
  });

  ch2.on('broadcast', { event: 'cart_sync' }, (payload) => {
    const remote = payload.payload;
    if (remote.device_id === 'dev_2') return;
    console.log('[Device 2] Received remote cart sync:', remote.cart?.length, 'items, version:', remote.version);
    const diff = diffCartItems(device2Cart, remote.cart);
    if (diff.canAutoMerge) {
      device2Cart = diff.mergedCart;
      device2Version = Math.max(device2Version, remote.version);
    }
  });

  // Subscribe both
  await Promise.all([
    new Promise((resolve) => ch1.subscribe((s) => { if (s === 'SUBSCRIBED') resolve(true); })),
    new Promise((resolve) => ch2.subscribe((s) => { if (s === 'SUBSCRIBED') resolve(true); })),
  ]);
  console.log('Both devices SUBSCRIBED to pos-cart-draft:', tableId);

  // STEP 1: Device 1 adds 1 item
  console.log('\n[STEP 1] Device 1 adds Trà sữa khoai môn (1 item)...');
  device1Cart = [{ id: 'SP001', name: 'Trà sữa khoai môn', price: 35000, quantity: 1 }];
  device1Version = 1;

  await adminClient.from('pos_cart_drafts').upsert({
    table_id: tableId,
    cart: device1Cart,
    version: device1Version,
    updated_at: new Date().toISOString(),
  });

  await ch1.send({
    type: 'broadcast',
    event: 'cart_sync',
    payload: {
      table_id: tableId,
      cart: device1Cart,
      version: device1Version,
      device_id: 'dev_1',
    },
  });

  // Wait 500ms
  await new Promise((r) => setTimeout(r, 600));
  console.log('Device 2 cart count:', device2Cart.length);
  if (device2Cart.length === 1 && device2Cart[0].name === 'Trà sữa khoai môn') {
    console.log('✅ STEP 1 PASSED: Device 2 instantly synced 1 item from Device 1');
  } else {
    throw new Error('STEP 1 FAILED');
  }

  // STEP 2: Device 1 adds 4 more items (total 5 items, matching user screenshot)
  console.log('\n[STEP 2] Device 1 adds 4 more items (total 5 items)...');
  device1Cart = [
    { id: 'SP001', name: 'Trà sữa khoai môn', price: 35000, quantity: 1 },
    { id: 'SP002', name: 'Trà sữa xoài kem cheese', price: 40000, quantity: 1 },
    { id: 'SP003', name: 'Trà sữa Matcha đậu đỏ', price: 42000, quantity: 1 },
    { id: 'SP004', name: 'Cafe Sữa Tươi', price: 32000, quantity: 1 },
    { id: 'SP005', name: 'Cafe sữa đá', price: 28000, quantity: 1 },
  ];
  device1Version = 2;

  await adminClient.from('pos_cart_drafts').upsert({
    table_id: tableId,
    cart: device1Cart,
    version: device1Version,
    updated_at: new Date().toISOString(),
  });

  await ch1.send({
    type: 'broadcast',
    event: 'cart_sync',
    payload: {
      table_id: tableId,
      cart: device1Cart,
      version: device1Version,
      device_id: 'dev_1',
    },
  });

  await new Promise((r) => setTimeout(r, 600));
  console.log('Device 2 cart count:', device2Cart.length);
  if (device2Cart.length === 5) {
    console.log('✅ STEP 2 PASSED: Device 2 instantly updated to 5 items');
  } else {
    throw new Error('STEP 2 FAILED');
  }

  // STEP 3: Device 2 adds Bạc xỉu concurrently
  console.log('\n[STEP 3] Device 2 concurrently adds Bạc xỉu...');
  const newItem = { id: 'SP006', name: 'Bạc xỉu', price: 30000, quantity: 1 };
  device2Cart = [...device2Cart, newItem];
  device2Version = 3;

  await ch2.send({
    type: 'broadcast',
    event: 'cart_sync',
    payload: {
      table_id: tableId,
      cart: device2Cart,
      version: device2Version,
      device_id: 'dev_2',
    },
  });

  await new Promise((r) => setTimeout(r, 600));
  console.log('Device 1 cart count:', device1Cart.length);
  if (device1Cart.length === 6 && device1Cart.some(i => i.name === 'Bạc xỉu')) {
    console.log('✅ STEP 3 PASSED: Device 1 auto-merged and now has all 6 items');
  } else {
    throw new Error('STEP 3 FAILED');
  }

  // Cleanup
  await adminClient.from('pos_cart_drafts').delete().eq('table_id', tableId);
  await device1.removeChannel(ch1);
  await device2.removeChannel(ch2);
  console.log('\n========================================');
  console.log('ALL MULTI-DEVICE SYNC TESTS PASSED! 🎉');
  console.log('========================================');
  process.exit(0);
}

main().catch((err) => {
  console.error('Test error:', err);
  process.exit(1);
});
