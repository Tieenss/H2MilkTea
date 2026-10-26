import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { createClient } from '@supabase/supabase-js';

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  const client = createClient(url, anonKey);
  console.log('=== TEST RAPID TABLE SELECTION & CHANNEL LIFECYCLE ===');

  const tablesToSwitch = ['B001', 'B002', 'B001', 'BAN003', 'BAN003', 'B004'];
  let currentChannel: any = null;

  for (let i = 0; i < tablesToSwitch.length; i++) {
    const tableId = tablesToSwitch[i];
    console.log(`\n[Step ${i + 1}] Switching to table: ${tableId}`);

    const topicName = `pos-cart-draft:${tableId}`;

    // Clean up stale channel if present
    try {
      const existing = client.getChannels().find(
        (ch) => ch.topic === `realtime:${topicName}` || ch.topic === topicName
      );
      if (existing) {
        console.log(`  -> Found existing channel for ${topicName}, cleaning up safely...`);
        await client.removeChannel(existing);
      }
    } catch (e: any) {
      console.warn('  -> Cleanup warning:', e.message);
    }

    // Previous active channel cleanup
    if (currentChannel) {
      console.log('  -> Removing previous currentChannel...');
      await client.removeChannel(currentChannel);
      currentChannel = null;
    }

    // Create new channel with broadcast handlers
    try {
      const channel = client
        .channel(topicName, {
          config: { broadcast: { self: false } },
        })
        .on('broadcast', { event: 'cart_sync' }, (payload) => {
          console.log(`  -> [${tableId}] Received cart_sync:`, payload);
        })
        .on('broadcast', { event: 'cart_cleared' }, () => {
          console.log(`  -> [${tableId}] Received cart_cleared`);
        });

      await new Promise<void>((resolve, reject) => {
        channel.subscribe((status, err) => {
          if (err) {
            reject(err);
          } else if (status === 'SUBSCRIBED') {
            console.log(`  -> ✅ Subscribed successfully to ${topicName}`);
            resolve();
          } else if (status === 'CHANNEL_ERROR') {
            reject(new Error(`Channel error on ${topicName}`));
          }
        });
      });

      currentChannel = channel;
    } catch (err: any) {
      console.error(`  -> ❌ FAILED on step ${i + 1} (${tableId}):`, err.message);
      throw err;
    }
  }

  // Cleanup final channel
  if (currentChannel) {
    await client.removeChannel(currentChannel);
  }

  console.log('\n======================================================');
  console.log('ALL RAPID TABLE SELECTION TESTS PASSED WITH 0 ERRORS! 🎉');
  console.log('======================================================');
  process.exit(0);
}

main().catch((err) => {
  console.error('Test error:', err);
  process.exit(1);
});
