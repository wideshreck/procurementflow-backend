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

async function testPhase2Path() {
  console.log('\n📌 TEST 1: Phase 2 Catalog Selection Path');
  console.log('=========================================\n');
  
  let conversationId = null;
  
  try {
    // Phase 1
    console.log('📤 Starting Phase 1...');
    let response = await sendMessage('Laptop almak istiyorum');
    conversationId = response.conversationId;
    console.log(`✅ Response Mode: ${response.MODE}`);
    
    // Answer Phase 1 questions
    response = await sendMessage('department_q1: IT, usage_purpose_q2: Yazılım geliştirme, quantity_q3: 2, urgency_q4: Yüksek', conversationId);
    console.log(`✅ Phase 1 Done: ${response.MODE}`);
    
    // Wait for Phase 2 catalog suggestions
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Select a catalog item in Phase 2
    console.log('\n📤 Selecting catalog item in Phase 2...');
    const catalogSelection = {
      selected_product: "Dell Latitude 5540",
      last_updated_price: "35000",
      technical_specifications: [
        { spec_key: "İşlemci", spec_value: "Intel Core i7", requirement_level: "Zorunlu" },
        { spec_key: "RAM", spec_value: "16 GB", requirement_level: "Zorunlu" },
        { spec_key: "Depolama", spec_value: "512 GB SSD", requirement_level: "Zorunlu" }
      ]
    };
    
    response = await sendMessage(`PHASE_TWO_SELECTED:${JSON.stringify(catalogSelection)}`, conversationId);
    console.log(`✅ Catalog Selected: ${response.MODE}`);
    
    // Phase 4: Delivery details
    if (response.MODE === 'ASKING_FOR_INFO' || response.MODE === 'ASKING_FOR_DELIVERY_DETAILS') {
      console.log('\n📤 Providing delivery details...');
      response = await sendMessage('delivery_location_q1: Ana Ofis, due_date_q2: 20-12-2024, urgency_q3: YÜKSEK', conversationId);
      console.log(`✅ Final Response Mode: ${response.MODE}`);
      
      if (response.MODE === 'PHASE_FOUR_DONE') {
        console.log('\n✅ SUCCESS: Phase 2 path completed!');
        console.log('📋 Delivery Date in Final Data:', response.COLLECTED_DATA?.delivery_details?.due_date);
        return true;
      } else {
        console.log('⚠️ WARNING: Expected PHASE_FOUR_DONE but got:', response.MODE);
        return false;
      }
    }
  } catch (error) {
    console.error('❌ Phase 2 path test failed:', error.message);
    return false;
  }
}

async function testPhase3Path() {
  console.log('\n📌 TEST 2: Phase 3 Profile Selection Path');
  console.log('=========================================\n');
  
  let conversationId = null;
  
  try {
    // Phase 1
    console.log('📤 Starting Phase 1...');
    let response = await sendMessage('Bilgisayar almak istiyorum');
    conversationId = response.conversationId;
    console.log(`✅ Response Mode: ${response.MODE}`);
    
    // Answer Phase 1 questions
    response = await sendMessage('department_q1: Muhasebe, usage_purpose_q2: Ofis işleri, quantity_q3: 3, urgency_q4: Orta', conversationId);
    console.log(`✅ Phase 1 Done: ${response.MODE}`);
    
    // Skip Phase 2 catalog
    console.log('\n📤 Skipping catalog suggestions...');
    response = await sendMessage('Katalog önerilerini istemiyorum', conversationId);
    console.log(`✅ Moving to Phase 3: ${response.MODE}`);
    
    // Select a predefined profile in Phase 3
    console.log('\n📤 Selecting predefined profile in Phase 3...');
    const profileSelection = {
      suggestion_name: "Ofis Bilgisayarı",
      item_name: "HP ProDesk 400",
      estimated_cost_per_unit: "25000",
      technical_specifications: [
        { spec_key: "İşlemci", spec_value: "Intel Core i5", requirement_level: "Zorunlu" },
        { spec_key: "RAM", spec_value: "8 GB", requirement_level: "Zorunlu" },
        { spec_key: "Depolama", spec_value: "256 GB SSD", requirement_level: "Zorunlu" }
      ]
    };
    
    response = await sendMessage(`PHASE_THREE_PROFILE_SELECTED:${JSON.stringify(profileSelection)}`, conversationId);
    console.log(`✅ Profile Selected: ${response.MODE}`);
    
    // Phase 4: Delivery details
    if (response.MODE === 'ASKING_FOR_INFO' || response.MODE === 'ASKING_FOR_DELIVERY_DETAILS') {
      console.log('\n📤 Providing delivery details...');
      response = await sendMessage('delivery_location_q1: Şube Ofisi, due_date_q2: 25-12-2024, urgency_q3: ORTA', conversationId);
      console.log(`✅ Final Response Mode: ${response.MODE}`);
      
      if (response.MODE === 'PHASE_FOUR_DONE') {
        console.log('\n✅ SUCCESS: Phase 3 path completed!');
        console.log('📋 Delivery Date in Final Data:', response.COLLECTED_DATA?.delivery_details?.due_date);
        return true;
      } else {
        console.log('⚠️ WARNING: Expected PHASE_FOUR_DONE but got:', response.MODE);
        return false;
      }
    }
  } catch (error) {
    console.error('❌ Phase 3 path test failed:', error.message);
    return false;
  }
}

async function runTests() {
  console.log('🚀 Starting both path tests...\n');
  
  if (!await login()) {
    return;
  }
  
  const phase2Success = await testPhase2Path();
  
  // Wait between tests
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  const phase3Success = await testPhase3Path();
  
  console.log('\n' + '='.repeat(50));
  console.log('📊 TEST RESULTS:');
  console.log('='.repeat(50));
  console.log(`Phase 2 Path (Catalog Selection): ${phase2Success ? '✅ PASSED' : '❌ FAILED'}`);
  console.log(`Phase 3 Path (Profile Selection): ${phase3Success ? '✅ PASSED' : '❌ FAILED'}`);
  console.log('='.repeat(50));
  
  if (phase2Success && phase3Success) {
    console.log('\n🎉 ALL TESTS PASSED! Both paths show final output correctly.');
  } else {
    console.log('\n⚠️ Some tests failed. Please check the logs above.');
  }
}

// Run the tests
runTests();