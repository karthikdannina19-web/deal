import dotenv from 'dotenv';
import mongoose from 'mongoose';

dotenv.config({ path: '.env.local', quiet: true });

const applyChanges = process.argv.includes('--apply');
const BAD_MANDAL_ID = '6a2866429decc2273560e603';
const EXPECTED_DISTRICT_ID = '6a194a278c18f718e80f1057';
const EXPECTED_BAD_NAME = '{id: 6a194a278c18f718e80f1058, name: Kurnool}';
const CORRECT_MANDAL_ID = '6a194a278c18f718e80f1058';

async function main() {
  if (!process.env.MONGODB_URI) {
    throw new Error('MONGODB_URI is required');
  }

  await mongoose.connect(process.env.MONGODB_URI, {
    maxPoolSize: 2,
    serverSelectionTimeoutMS: 10000,
    family: 4,
  });

  const mandals = mongoose.connection.collection('mandals');
  const [badRecord, correctRecord] = await Promise.all([
    mandals.findOne({ _id: new mongoose.Types.ObjectId(BAD_MANDAL_ID) }),
    mandals.findOne({ _id: new mongoose.Types.ObjectId(CORRECT_MANDAL_ID) }),
  ]);

  if (!badRecord) {
    console.log(JSON.stringify({ mode: applyChanges ? 'apply' : 'dry-run', status: 'already-absent' }, null, 2));
    return;
  }

  const badRecordMatches = (
    String(badRecord.districtId) === EXPECTED_DISTRICT_ID
    && badRecord.name === EXPECTED_BAD_NAME
  );
  const correctRecordMatches = (
    correctRecord
    && String(correctRecord.districtId) === EXPECTED_DISTRICT_ID
    && correctRecord.name === 'Kurnool'
  );

  if (!badRecordMatches || !correctRecordMatches) {
    throw new Error('Safety check failed: database records do not match the expected Kurnool records');
  }

  let deletedCount = 0;
  if (applyChanges) {
    const result = await mandals.deleteOne({
      _id: badRecord._id,
      districtId: badRecord.districtId,
      name: EXPECTED_BAD_NAME,
    });
    deletedCount = result.deletedCount;
    if (deletedCount !== 1) {
      throw new Error('Cleanup did not delete exactly one record');
    }
  }

  console.log(JSON.stringify({
    mode: applyChanges ? 'apply' : 'dry-run',
    status: applyChanges ? 'deleted' : 'safe-to-delete',
    badMandalId: BAD_MANDAL_ID,
    correctMandalId: CORRECT_MANDAL_ID,
    deletedCount,
  }, null, 2));
}

try {
  await main();
} finally {
  await mongoose.disconnect();
}
