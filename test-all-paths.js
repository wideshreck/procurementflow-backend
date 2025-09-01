const axios = require('axios');

const API_URL = 'http://localhost:3000';
let authToken = '';

async function login() {
  try {
    const response = await axios.post(`${API_URL}/api/auth/signin`, {
      email: 'admin@procurementflow.com',
      password: 'Admin123!'
    });
    authToken = response.data.tokens.accessToken;
    console.log('✅ Logged in successfully');
    return true;
  } catch (error) {
    console.error('❌ Login failed:', error.response?.data || error.message);
    return false;
  }
}

async function sendMessage(message, conversationId = null) {
  try {
    const payload = conversationId ? { message, conversationId } : { message };
    const response = await axios.post(
      `${API_URL}/api/procurement/chat`,
      payload,
      {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    return response.data;
  } catch (error) {
    console.error('❌ Message failed:', error.response?.data || error.message);
    throw error;
  }
}

// Test 1: Phase 2 -> Phase 4 -> Final Output
async function testPhase2ToFinal() {
  console.log('\n' + '='.repeat(60));
  console.log('📌 TEST 1: Phase 2 Catalog Selection -> Final Output');
  console.log('='.repeat(60));
  
  let conversationId = null;
  
  try {
    // Phase 1
    console.log('\n1️⃣ Starting Phase 1...');
    let response = await sendMessage('Laptop almak istiyorum');
    conversationId = response.conversationId;
    console.log(`   Response: ${response.MODE}`);
    
    // Answer Phase 1 questions
    response = await sendMessage('department_q1: IT, usage_purpose_q2: Yazılım geliştirme, quantity_q3: 2, urgency_q4: Yüksek', conversationId);
    console.log(`   Phase 1 Complete: ${response.MODE}`);
    
    // Wait for catalog suggestions
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Phase 2: Select catalog item
    console.log('\n2️⃣ Phase 2: Selecting catalog item...');
    const catalogSelection = {
      selected_product: "Dell Latitude 5540",
      last_updated_price: "35000",
      technical_specifications: [
        { spec_key: "İşlemci", spec_value: "Intel Core i7", requirement_level: "Zorunlu" },
        { spec_key: "RAM", spec_value: "16 GB", requirement_level: "Zorunlu" }
      ]
    };
    
    response = await sendMessage(`PHASE_TWO_SELECTED:${JSON.stringify(catalogSelection)}`, conversationId);
    console.log(`   Catalog Selected: ${response.MODE}`);
    
    // Phase 4: Delivery details
    if (response.MODE === 'ASKING_FOR_INFO' || response.MODE === 'ASKING_FOR_DELIVERY_DETAILS') {
      console.log('\n4️⃣ Phase 4: Providing delivery details...');
      response = await sendMessage('delivery_location_q1: Ana Ofis, due_date_q2: 20-12-2024, urgency_q3: YÜKSEK', conversationId);
      console.log(`   Final Response: ${response.MODE}`);
      
      if (response.MODE === 'PHASE_FOUR_DONE') {
        console.log('\n✅ SUCCESS: Phase 2 path shows final output!');
        console.log('   Delivery Date:', response.COLLECTED_DATA?.delivery_details?.due_date);
        console.log('   Product:', response.COLLECTED_DATA?.selected_product);
        console.log('   Price:', response.COLLECTED_DATA?.unit_price);
        return true;
      } else {
        console.log('\n❌ FAILED: Expected PHASE_FOUR_DONE but got:', response.MODE);
        return false;
      }
    }
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    return false;
  }
}

// Test 2: Phase 3 Profile Selection -> Phase 4 -> Final Output
async function testPhase3ProfileToFinal() {
  console.log('\n' + '='.repeat(60));
  console.log('📌 TEST 2: Phase 3 Profile Selection -> Final Output');
  console.log('='.repeat(60));
  
  let conversationId = null;
  
  try {
    // Phase 1
    console.log('\n1️⃣ Starting Phase 1...');
    let response = await sendMessage('Bilgisayar almak istiyorum');
    conversationId = response.conversationId;
    console.log(`   Response: ${response.MODE}`);
    
    // Answer Phase 1 questions
    response = await sendMessage('department_q1: Muhasebe, usage_purpose_q2: Ofis işleri, quantity_q3: 3, urgency_q4: Orta', conversationId);
    console.log(`   Phase 1 Complete: ${response.MODE}`);
    
    // Phase 2: Skip catalog
    console.log('\n2️⃣ Phase 2: Skipping catalog...');
    response = await sendMessage('Katalog önerilerini istemiyorum', conversationId);
    console.log(`   Moving to Phase 3: ${response.MODE}`);
    
    // Phase 3: Select predefined profile
    console.log('\n3️⃣ Phase 3: Selecting predefined profile...');
    const profileSelection = {
      suggestion_name: "Ofis Bilgisayarı",
      item_name: "HP ProDesk 400",
      estimated_cost_per_unit: "25000",
      technical_specifications: [
        { spec_key: "İşlemci", spec_value: "Intel Core i5", requirement_level: "Zorunlu" },
        { spec_key: "RAM", spec_value: "8 GB", requirement_level: "Zorunlu" }
      ]
    };
    
    response = await sendMessage(`PHASE_THREE_PROFILE_SELECTED:${JSON.stringify(profileSelection)}`, conversationId);
    console.log(`   Profile Selected: ${response.MODE}`);
    
    // Phase 4: Delivery details
    if (response.MODE === 'PHASE_THREE_DONE') {
      console.log('   ⚠️  Got PHASE_THREE_DONE, waiting for Phase 4...');
      // The system should automatically transition to Phase 4
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    if (response.MODE === 'ASKING_FOR_INFO' || response.MODE === 'ASKING_FOR_DELIVERY_DETAILS' || response.MODE === 'PHASE_THREE_DONE') {
      console.log('\n4️⃣ Phase 4: Providing delivery details...');
      response = await sendMessage('delivery_location_q1: Şube Ofisi, due_date_q2: 25-12-2024, urgency_q3: ORTA', conversationId);
      console.log(`   Final Response: ${response.MODE}`);
      
      if (response.MODE === 'PHASE_FOUR_DONE') {
        console.log('\n✅ SUCCESS: Phase 3 profile path shows final output!');
        console.log('   Delivery Date:', response.COLLECTED_DATA?.delivery_details?.due_date);
        console.log('   Profile:', response.COLLECTED_DATA?.selected_profile);
        console.log('   Price:', response.COLLECTED_DATA?.unit_price);
        return true;
      } else {
        console.log('\n❌ FAILED: Expected PHASE_FOUR_DONE but got:', response.MODE);
        return false;
      }
    }
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    return false;
  }
}

// Test 3: Phase 3 Manual Specs -> Phase 4 -> Final Output
async function testPhase3ManualToFinal() {
  console.log('\n' + '='.repeat(60));
  console.log('📌 TEST 3: Phase 3 Manual Specs -> Final Output');
  console.log('='.repeat(60));
  
  let conversationId = null;
  
  try {
    // Phase 1
    console.log('\n1️⃣ Starting Phase 1...');
    let response = await sendMessage('Sunucu almak istiyorum');
    conversationId = response.conversationId;
    console.log(`   Response: ${response.MODE}`);
    
    // Answer Phase 1 questions
    response = await sendMessage('department_q1: IT, usage_purpose_q2: Veri depolama, quantity_q3: 1, urgency_q4: Yüksek', conversationId);
    console.log(`   Phase 1 Complete: ${response.MODE}`);
    
    // Phase 2: Skip catalog
    console.log('\n2️⃣ Phase 2: Skipping catalog...');
    response = await sendMessage('Katalog önerilerini istemiyorum', conversationId);
    console.log(`   Moving to Phase 3: ${response.MODE}`);
    
    // Phase 3: Manual technical specs
    console.log('\n3️⃣ Phase 3: Approving manual specs...');
    response = await sendMessage('Teknik Şartname Onaylandı: İşlemci: Intel Xeon, RAM: 64GB, Depolama: 4TB SSD', conversationId);
    console.log(`   Manual Specs: ${response.MODE}`);
    
    // Phase 4: Delivery details
    if (response.MODE === 'PHASE_THREE_DONE') {
      console.log('   ⚠️  Got PHASE_THREE_DONE, providing delivery details...');
    }
    
    if (response.MODE === 'ASKING_FOR_INFO' || response.MODE === 'ASKING_FOR_DELIVERY_DETAILS' || response.MODE === 'PHASE_THREE_DONE') {
      console.log('\n4️⃣ Phase 4: Providing delivery details...');
      response = await sendMessage('delivery_location_q1: Veri Merkezi, due_date_q2: 30-12-2024, urgency_q3: YÜKSEK', conversationId);
      console.log(`   Final Response: ${response.MODE}`);
      
      if (response.MODE === 'PHASE_FOUR_DONE') {
        console.log('\n✅ SUCCESS: Phase 3 manual specs path shows final output!');
        console.log('   Delivery Date:', response.COLLECTED_DATA?.delivery_details?.due_date);
        console.log('   Specs:', response.COLLECTED_DATA?.technical_specifications?.length, 'specifications');
        return true;
      } else {
        console.log('\n❌ FAILED: Expected PHASE_FOUR_DONE but got:', response.MODE);
        return false;
      }
    }
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    return false;
  }
}

async function runAllTests() {
  console.log('🚀 Starting comprehensive flow tests...\n');
  
  if (!await login()) {
    return;
  }
  
  const results = {
    phase2: false,
    phase3Profile: false,
    phase3Manual: false
  };
  
  // Test 1: Phase 2 path
  results.phase2 = await testPhase2ToFinal();
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // Test 2: Phase 3 profile path
  results.phase3Profile = await testPhase3ProfileToFinal();
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // Test 3: Phase 3 manual path
  results.phase3Manual = await testPhase3ManualToFinal();
  
  // Final results
  console.log('\n' + '='.repeat(60));
  console.log('📊 FINAL TEST RESULTS:');
  console.log('='.repeat(60));
  console.log(`Phase 2 -> Final Output: ${results.phase2 ? '✅ PASSED' : '❌ FAILED'}`);
  console.log(`Phase 3 Profile -> Final Output: ${results.phase3Profile ? '✅ PASSED' : '❌ FAILED'}`);
  console.log(`Phase 3 Manual -> Final Output: ${results.phase3Manual ? '✅ PASSED' : '❌ FAILED'}`);
  console.log('='.repeat(60));
  
  const allPassed = results.phase2 && results.phase3Profile && results.phase3Manual;
  if (allPassed) {
    console.log('\n🎉 ALL TESTS PASSED! All paths show final output correctly.');
  } else {
    console.log('\n⚠️ Some tests failed. Check the logs above for details.');
  }
}

// Run all tests
runAllTests();