require('dotenv').config({ path: '.env.local' });
const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const tables = [
  'DMHH', 'DSNV', 'DSBAN', 'HOADON', 'HOADONDETAIL',
  'KHACHHANG', 'NGUYENLIEU', 'CAUHINH', 'KIEMKEKHO',
  'NHACUNGCAP', 'NHAPXUATKHO'
];

async function migrate() {
  for (const table of tables) {
    console.log(`Migrating table: ${table}...`);
    try {
      let data = JSON.parse(fs.readFileSync(`./src/data/${table}.json`, 'utf8'));
      if (!Array.isArray(data) || data.length === 0) {
        console.log(`Skipping empty or invalid data for ${table}`);
        continue;
      }
      
      // Clean up data
      data = data.map(item => {
        const cleanItem = { ...item };
        
        // Fix typos in JSON keys
        if (cleanItem['Hóa đọn liên quan'] !== undefined) {
          cleanItem['Hóa đơn liên quan'] = cleanItem['Hóa đọn liên quan'];
          delete cleanItem['Hóa đọn liên quan'];
        }

        // Convert empty strings to null for numeric fields
        Object.keys(cleanItem).forEach(key => {
          if (cleanItem[key] === "") {
            cleanItem[key] = null;
          }
        });

        return cleanItem;
      });

      const { data: result, error } = await supabase.from(table).insert(data);
      if (error) {
        console.error(`Error inserting into ${table}:`, error.message);
      } else {
        console.log(`Successfully migrated ${data.length} records into ${table}`);
      }
    } catch (e) {
      console.error(`Failed to read/migrate ${table}:`, e.message);
    }
  }
}

migrate();
