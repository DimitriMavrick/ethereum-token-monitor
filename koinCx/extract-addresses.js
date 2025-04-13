const fs = require('fs');

// Read the CSV file
const csvData = fs.readFileSync('data.csv', 'utf8');
const lines = csvData.split('\n');

// Extract just the addresses
const addresses = [];
for (let i = 1; i < lines.length; i++) { // Skip header row
  const line = lines[i];
  if (line.trim()) {
    // Extract the address (second column) by splitting on commas and taking element at index 1
    const columns = line.split(',');
    if (columns.length >= 2) {
      // Remove quotes if present
      const address = columns[1].replace(/"/g, '').trim();
      addresses.push(address);
    }
  }
}

// Write to addresses.txt
fs.writeFileSync('addresses.txt', addresses.join('\n'));
console.log(`Extracted ${addresses.length} addresses to addresses.txt`);