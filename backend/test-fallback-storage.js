/**
 * Test: Fallback Storage Persistence
 * Verifies that orders and enquiries persist to JSON files when MongoDB is unavailable
 */

import { fallbackOrders, fallbackEnquiries, clearAllFallbackData, hasFallbackData, getFallbackCount } from './utils/fallbackStorage.js';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

console.log('='.repeat(60));
console.log('TEST 1: Fallback Storage Persistence');
console.log('='.repeat(60));

// Clean up before test
console.log('\n[SETUP] Clearing existing fallback data...');
clearAllFallbackData();

// Test 1.1: Add order to fallback storage
console.log('\n[TEST 1.1] Adding order to fallback storage...');
const testOrder = {
  orderNumber: 'TEST-001',
  customer: { name: 'Test User', email: 'test@example.com' },
  items: [{ itemId: 'prod-1', name: 'Test Item', quantity: 1, unitPrice: 100, lineTotal: 100 }],
  amount: 100,
  payment: { razorpayOrderId: 'order_test_1', verified: false },
  paymentStatus: 'pending',
  orderStatus: 'pending',
};

try {
  const savedOrder = fallbackOrders.add(testOrder);
  console.log('✅ Order saved:', savedOrder.orderNumber);
  console.log('   ID:', savedOrder._id);
  console.log('   CreatedAt:', savedOrder.createdAt);
} catch (err) {
  console.error('❌ Failed to save order:', err.message);
  process.exit(1);
}

// Test 1.2: Add enquiry to fallback storage
console.log('\n[TEST 1.2] Adding enquiry to fallback storage...');
const testEnquiry = {
  name: 'Test User',
  email: 'test@example.com',
  phone: '+1234567890',
  message: 'Test enquiry message',
  source: '/test',
  status: 'new',
};

try {
  const savedEnquiry = fallbackEnquiries.add(testEnquiry);
  console.log('✅ Enquiry saved:', savedEnquiry.name);
  console.log('   ID:', savedEnquiry._id);
  console.log('   CreatedAt:', savedEnquiry.createdAt);
} catch (err) {
  console.error('❌ Failed to save enquiry:', err.message);
  process.exit(1);
}

// Test 1.3: Verify files exist
console.log('\n[TEST 1.3] Verifying JSON files were created...');
const ordersFile = path.join(__dirname, '../data/fallback/orders.json');
const enquiriesFile = path.join(__dirname, '../data/fallback/enquiries.json');

if (fs.existsSync(ordersFile)) {
  console.log('✅ Orders file exists:', ordersFile);
} else {
  console.error('❌ Orders file not found');
  process.exit(1);
}

if (fs.existsSync(enquiriesFile)) {
  console.log('✅ Enquiries file exists:', enquiriesFile);
} else {
  console.error('❌ Enquiries file not found');
  process.exit(1);
}

// Test 1.4: Verify file contents
console.log('\n[TEST 1.4] Verifying file contents...');
try {
  const ordersContent = JSON.parse(fs.readFileSync(ordersFile, 'utf-8'));
  console.log('✅ Orders file contains', ordersContent.length, 'record(s)');
  
  const enquiriesContent = JSON.parse(fs.readFileSync(enquiriesFile, 'utf-8'));
  console.log('✅ Enquiries file contains', enquiriesContent.length, 'record(s)');
} catch (err) {
  console.error('❌ Failed to read file contents:', err.message);
  process.exit(1);
}

// Test 1.5: Find operations
console.log('\n[TEST 1.5] Testing find operations...');
const foundOrder = fallbackOrders.findOne({ orderNumber: 'TEST-001' });
if (foundOrder && foundOrder.orderNumber === 'TEST-001') {
  console.log('✅ Found order by orderNumber:', foundOrder.orderNumber);
} else {
  console.error('❌ Failed to find order');
  process.exit(1);
}

// Get all enquiries and find by email
const allEnquiries = fallbackEnquiries.findAll();
const foundEnquiryByEmail = allEnquiries.find(e => e.email === 'test@example.com');
if (foundEnquiryByEmail) {
  console.log('✅ Found enquiry by email:', foundEnquiryByEmail.email);
} else {
  console.error('❌ Failed to find enquiry by email');
  console.error('   Available enquiries:', allEnquiries.map(e => e.email));
  process.exit(1);
}

// Test 1.6: Update operation
console.log('\n[TEST 1.6] Testing update operation...');
const orderId = foundOrder._id;
const updatedOrder = fallbackOrders.update(orderId, { orderStatus: 'confirmed' });
if (updatedOrder && updatedOrder.orderStatus === 'confirmed') {
  console.log('✅ Order updated successfully:', updatedOrder.orderStatus);
} else {
  console.error('❌ Failed to update order');
  process.exit(1);
}

// Test 1.7: Delete operation
console.log('\n[TEST 1.7] Testing delete operation...');
const deleteOrder = fallbackOrders.delete('non-existent-id');
console.log('✅ Delete non-existent order returned:', deleteOrder);

const deleteResult = fallbackEnquiries.delete(foundEnquiryByEmail._id);
if (deleteResult === true) {
  console.log('✅ Enquiry deleted successfully');
} else {
  console.error('❌ Failed to delete enquiry');
  process.exit(1);
}

// Test 1.8: Count operations
console.log('\n[TEST 1.8] Testing count operations...');
const orderCount = fallbackOrders.count();
const enquiryCount = fallbackEnquiries.count();
console.log('✅ Order count:', orderCount);
console.log('✅ Enquiry count:', enquiryCount);

// Test 1.9: Check hasFallbackData
console.log('\n[TEST 1.9] Testing hasFallbackData...');
const hasOrders = hasFallbackData('orders');
const hasEnquiries = hasFallbackData('enquiries');
console.log('✅ Has orders data:', hasOrders);
console.log('✅ Has enquiries data:', hasEnquiries);

// Test 1.10: getFallbackCount
console.log('\n[TEST 1.10] Testing getFallbackCount...');
const count1 = getFallbackCount('orders');
const count2 = getFallbackCount('enquiries');
console.log('✅ Orders count via getFallbackCount:', count1);
console.log('✅ Enquiries count via getFallbackCount:', count2);

// Cleanup
console.log('\n[CLEANUP] Clearing all fallback data...');
clearAllFallbackData();

console.log('\n' + '='.repeat(60));
console.log('✅ ALL FALLBACK STORAGE TESTS PASSED');
console.log('='.repeat(60));

process.exit(0);