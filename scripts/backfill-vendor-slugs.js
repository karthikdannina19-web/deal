import mongoose from 'mongoose';
import { dbConnect } from './config/database.js';
import Vendor from './models/vendor.model.js';

async function backfillSlugs() {
  try {
    await dbConnect();
    console.log('Connected to DB. Starting backfill...');

    const vendors = await Vendor.find({ slug: { $exists: false } });
    console.log(`Found ${vendors.length} vendors without slugs.`);

    for (const vendor of vendors) {
      if (vendor.storeName) {
        console.log(`Generating slug for: ${vendor.storeName}`);
        await vendor.save(); // Model hook handles generation
      }
    }

    console.log('Backfill complete.');
    process.exit(0);
  } catch (err) {
    console.error('Error during backfill:', err);
    process.exit(1);
  }
}

backfillSlugs();
