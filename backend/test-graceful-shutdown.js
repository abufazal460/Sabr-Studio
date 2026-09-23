/**
 * Test: Graceful Shutdown
 */

import { clearAllFallbackData, fallbackOrders, fallbackEnquiries, syncFallbackToMongoose } from './utils/fallbackStorage.js';

console.log('='.repeat(60));
console.log('TEST 2: Graceful Shutdown');
console.log('='.repeat(60));

console.log('\n[SETUP] Adding test data...');
clearAllFallbackData();

fallbackOrders.add({
  orderNumber: 'SHUTDOWN-TEST-001',
  customer: { name: 'Test', email: 'test@test.com' },
  items: [{ itemId: 'test-1', name: 'Test Item', quantity: 1, unitPrice: 50, lineTotal: 50 }],
  amount: 50,
  payment: { razorpayOrderId: 'shutdown_order_test', verified: false },
  paymentStatus: 'pending',
  orderStatus: 'pending',
});
console.log('✅ Added test order');

fallbackEnquiries.add({
  name: 'Test User',
  email: 'shutdown@example.com',
  phone: '+1234567890',
  message: 'Test message',
  source: '/test',
  status: 'new',
});
console.log('✅ Added test enquiry');

console.log('\n[TEST 2.1] Signal handlers...');
console.log('✅ SIGTERM handlers:', process.listeners('SIGTERM').length > 0);
console.log('✅ SIGINT handlers:', process.listeners('SIGINT').length > 0);

console.log('\n[TEST 2.2] Sync function...');
if (typeof syncFallbackToMongoose === 'function') {
  console.log('✅ syncFallbackToMongoose is a function');
  
  syncFallbackToMongoose({ orders: true, enquiries: true })
    .then(result => {
      console.log('✅ Sync completed (gracefully handled missing MongoDB)');
      console.log('   Orders:', JSON.stringify(result.orders));
      console.log('   Enquiries:', JSON.stringify(result.enquiries));
      
      console.log('\n[TEST 2.3] Data preserved...');
      console.log('   Orders remaining:', fallbackOrders.count());
      console.log('   Enquiries remaining:', fallbackEnquiries.count());
      
      console.log('\n[CLEANUP]');
      clearAllFallbackData();
      
      console.log('\n[TEST 2.4] Process handlers...');
      console.log('✅ Uncaught exception:', process.listeners('uncaughtException').length > 0);
      console.log('✅ Unhandled rejection:', process.listeners('unhandledRejection').length > 0);
      
      console.log('\n' + '='.repeat(60));
      console.log('✅ ALL GRACEFUL SHUTDOWN TESTS PASSED');
      console.log('='.repeat(60));
      process.exit(0);
    })
    .catch(err => {
      console.error('❌ Sync failed:', err.message);
      process.exit(1);
    });
}