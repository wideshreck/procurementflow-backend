const axios = require('axios');

const API_URL = 'http://localhost:3000';
let authToken = '';
let conversationId = '';

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

async function sendMessage(message) {
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
    
    conversationId = response.data.conversationId;
    console.log(`\n📤 Sent: ${message.substring(0, 100)}...`);
    console.log(`📥 Response Mode: ${response.data.MODE}`);
    
    if (response.data.COLLECTED_DATA) {
      console.log('📊 Collected Data:', JSON.stringify(response.data.COLLECTED_DATA, null, 2).substring(0, 500) + '...');
    }
    
    return response.data;
  } catch (error) {
    console.error('❌ Message failed:', error.response?.data || error.message);
    throw error;
  }
}

async function testPhase3ToPhase4Flow() {
  console.log('🚀 Starting Phase 3 to Phase 4 flow test...\n');
  
  // Login
  if (!await login()) {
    return;
  }
  
  try {
    // Phase 1: Initial request
    console.log('\n=== PHASE 1: Initial Request ===');
    let response = await sendMessage('Bilgisayar almak istiyorum');
    
    // Answer Phase 1 questions
    response = await sendMessage('department_q1: Bilgi İşlem, usage_purpose_q2: Yazılım geliştirme ve test, quantity_q3: 5, urgency_q4: Orta');
    
    // Phase 2: Catalog suggestions (skip)
    console.log('\n=== PHASE 2: Skipping Catalog ===');
    response = await sendMessage('Katalog önerilerini istemiyorum');
    
    // Phase 3: Get predefined profiles
    console.log('\n=== PHASE 3: Predefined Profiles ===');
    // The system should automatically show predefined profiles
    
    // Simulate selecting a predefined profile
    const profileSelection = {
      suggestion_name: "Yazılım Geliştirme Bilgisayarı",
      item_name: "Dell Precision 5570",
      estimated_cost_per_unit: "45000",
      technical_specifications: [
        { spec_key: "İşlemci", spec_value: "Intel Core i7-12700H", requirement_level: "Zorunlu" },
        { spec_key: "RAM", spec_value: "32 GB DDR5", requirement_level: "Zorunlu" },
        { spec_key: "Depolama", spec_value: "1 TB NVMe SSD", requirement_level: "Zorunlu" },
        { spec_key: "Ekran Kartı", spec_value: "NVIDIA RTX 3050", requirement_level: "Tercih Edilen" },
        { spec_key: "İşletim Sistemi", spec_value: "Windows 11 Pro", requirement_level: "Zorunlu" }
      ]
    };
    
    console.log('\n📌 Selecting predefined profile:', profileSelection.suggestion_name);
    response = await sendMessage(`PHASE_THREE_PROFILE_SELECTED:${JSON.stringify(profileSelection)}`);
    
    // Phase 4: Delivery details
    console.log('\n=== PHASE 4: Delivery Details ===');
    if (response.MODE === 'PHASE_THREE_DONE' || response.MODE === 'ASKING_FOR_INFO' || response.MODE === 'ASKING_FOR_DELIVERY_DETAILS') {
      // Provide delivery details
      response = await sendMessage('delivery_location_q1: Merkez Ofis İstanbul, due_date_q2: 15-10-2024, urgency_q3: ORTA');
      
      console.log('\n🎯 Final Response Mode:', response.MODE);
      
      if (response.MODE === 'PHASE_FOUR_DONE') {
        console.log('✅ SUCCESS: Phase 4 completed successfully!');
        console.log('\n📋 Final Procurement Request Data:');
        console.log(JSON.stringify(response.COLLECTED_DATA, null, 2));
      } else {
        console.log('⚠️  WARNING: Expected PHASE_FOUR_DONE but got:', response.MODE);
      }
    }
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
  }
}

// Run the test
testPhase3ToPhase4Flow();