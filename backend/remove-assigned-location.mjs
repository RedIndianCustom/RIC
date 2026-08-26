// Script to remove "Assigned Warehouse Location" feature from ShipmentRegistration.jsx
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const filePath = path.join(__dirname, '../frontend/src/pages/dashboard/operational/ShipmentRegistration.jsx');

console.log('📄 Reading ShipmentRegistration.jsx...');
const content = fs.readFileSync(filePath, 'utf-8');
const lines = content.split('\n');

console.log(`📊 Total lines: ${lines.length}`);

// Remove sections in reverse order so line numbers stay valid
const modificationsLog = [];

// 1. Remove card display section (lines 1969-1985) - 17 lines
console.log('\n🗑️  Removing card display section (lines 1969-1985)...');
const cardSectionStart = 1969 - 1; // Convert to 0-index
const cardSectionEnd = 1985 - 1;
const removedCardLines = lines.splice(cardSectionStart, cardSectionEnd - cardSectionStart + 1);
modificationsLog.push(`Removed ${removedCardLines.length} lines from card display section`);

// 2. Remove form section (lines 1105-1233) - 129 lines
console.log('🗑️  Removing form section (lines 1105-1233)...');
const formSectionStart = 1105 - 1; // Convert to 0-index
const formSectionEnd = 1233 - 1;
const removedFormLines = lines.splice(formSectionStart, formSectionEnd - formSectionStart + 1);
modificationsLog.push(`Removed ${removedFormLines.length} lines from form section`);

// 3. Remove state variables (lines 27-29)
console.log('🗑️  Removing location picker state variables (lines 27-29)...');
const stateVarStart = 27 - 1;
const stateVarEnd = 29 - 1;
const removedStateLines = lines.splice(stateVarStart, stateVarEnd - stateVarStart + 1);
modificationsLog.push(`Removed ${removedStateLines.length} state variable lines`);

// 4. Now fix the remaining references by finding and replacing
let updatedContent = lines.join('\n');

// Remove assigned_location_id from formData initial state
console.log('🔧 Removing assigned_location_id from formData...');
updatedContent = updatedContent.replace(
  /(\s+product_breakdown: \[\],)\s+assigned_location_id: ''/g,
  '$1'
);

// Remove location restoration logic in handleEdit
console.log('🔧 Removing location restoration logic in handleEdit...');
updatedContent = updatedContent.replace(
  /\/\/ Restore selected location object for the picker[\s\S]*?setLocationSearch\(''\);/gm,
  ''
);

// Remove location state resets from resetForm
console.log('🔧 Removing location state resets from resetForm...');
updatedContent = updatedContent.replace(
  /setLocationSearch\(''\);\s+setShowLocationDropdown\(false\);\s+setSelectedLocationObj\(null\);/g,
  ''
);

// Clean up any double blank lines
updatedContent = updatedContent.replace(/\n\n\n+/g, '\n\n');

// Write the modified content
console.log('\n💾 Writing modified file...');
fs.writeFileSync(filePath, updatedContent, 'utf-8');

console.log('\n✅ Successfully removed "Assigned Warehouse Location" feature!');
console.log('\n📊 Modifications:');
modificationsLog.forEach(log => console.log(`   - ${log}`));

console.log('\n📝 Summary:');
console.log(`   - Original lines: ${lines.length + removedCardLines.length + removedFormLines.length + removedStateLines.length}`);
console.log(`   - New lines: ${updatedContent.split('\n').length}`);
console.log(`   - Lines removed: ${removedCardLines.length + removedFormLines.length + removedStateLines.length}`);

console.log('\n✨ Done!');
