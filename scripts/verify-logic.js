const SchemaGenerator = require('./src/main/services/SchemaGenerator');
const { generateTypedData } = require('./src/main/services/DataGenerator');

// Mock Configuration
const keyCount = 20;
const typeRatio = { float: 0.5, int: 0.2, string: 0.2, bool: 0.1 };

console.log('--- Verifying SchemaGenerator ---');
const schema = SchemaGenerator.generate(keyCount, typeRatio);
console.log(`Generated Schema Length: ${schema.length} (Expected: ${keyCount})`);

const counts = { float: 0, int: 0, string: 0, bool: 0 };
schema.forEach(item => counts[item.type]++);
console.log('Type Distribution:', counts);

// Verify Ratios
// Float: 20 * 0.5 = 10
// Int: 20 * 0.2 = 4
// String: 20 * 0.2 = 4
// Bool: 20 * 0.1 = 2
console.log(`Expected: Float=10, Int=4, String=4, Bool=2`);

console.log('\n--- Verifying DataGenerator (Full) ---');
const fullData = generateTypedData(schema, keyCount);
const fullKeys = Object.keys(fullData);
console.log(`Full Data Keys: ${fullKeys.length}`);
console.log('Sample Data:', JSON.stringify(fullData, null, 2));

console.log('\n--- Verifying DataGenerator (Partial - 30%) ---');
const partialCount = Math.floor(keyCount * 0.3); // 6
const partialData = generateTypedData(schema, partialCount);
const partialKeys = Object.keys(partialData);
console.log(`Partial Data Keys: ${partialKeys.length} (Expected: ${partialCount})`);
console.log('Partial Keys:', partialKeys);

// Verify Partial is a subset of the beginning
const isSubset = partialKeys.every((key, index) => key === schema[index].name);
console.log(`Is Partial Data strictly the first ${partialCount} keys? ${isSubset ? 'YES' : 'NO'}`);
