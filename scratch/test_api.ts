async function test() {
  const types = ['ACADEMY', 'INDIVIDUAL', 'AGENCY'];
  for (const type of types) {
    const res = await fetch(`http://localhost:8080/api/subscriptions/plans?targetType=${type}&includeInactive=true`);
    const data = await res.json();
    console.log(`Type: ${type}, Count: ${data.data.length}`);
    console.log(`Plans: ${data.data.map(p => p.name).join(', ')}`);
  }
}

test();
