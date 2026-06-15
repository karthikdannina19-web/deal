const baseUrl = process.argv[2] || 'https://rhock.vercel.app';
const stateId = process.argv[3] || '';
const districtId = process.argv[4] || '';
const mandalId = process.argv[5] || '';

function buildStoresUrl() {
  const params = new URLSearchParams({
    page: '1',
    limit: '20',
  });

  if (stateId) params.set('stateId', stateId);
  if (districtId) params.set('districtId', districtId);
  if (mandalId) params.set('mandalId', mandalId);

  return `${baseUrl}/api/stores?${params.toString()}`;
}

async function main() {
  const url = buildStoresUrl();
  console.log(`Checking: ${url}`);

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`);
  }

  const payload = await response.json();
  const items = payload?.data?.stores || [];

  console.log('');
  console.log('Returned items:');
  for (const item of items) {
    console.log(
      [
        item.name || item.storeName || 'Unknown',
        `type=${item.entityType || 'unknown'}`,
        `priority=${item.resolvedPriority ?? 'null'}`,
        `scope=${item.priorityScopeLevel ?? 'null'}`,
      ].join(' | ')
    );
  }

  console.log('');
  const matched = items.filter((item) => item.resolvedPriority !== null && item.resolvedPriority !== undefined);
  console.log(`Items with resolved priority: ${matched.length}/${items.length}`);

  if (matched.length === 0) {
    console.log('No matching priority rules were resolved for this request.');
    process.exitCode = 2;
  }
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
