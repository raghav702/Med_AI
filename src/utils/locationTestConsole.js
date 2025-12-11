// Copy and paste this into your browser console to test location permission

console.log('🧪 Testing Location Permission...');

// Check if geolocation is supported
if (!navigator.geolocation) {
  console.error('❌ Geolocation is not supported by this browser');
} else {
  console.log('✅ Geolocation is supported');
}

// Check current permission status
navigator.permissions.query({name: 'geolocation'}).then(function(result) {
  console.log('📋 Current permission status:', result.state);
  
  if (result.state === 'granted') {
    console.log('✅ Location permission already granted');
  } else if (result.state === 'denied') {
    console.log('❌ Location permission denied');
  } else {
    console.log('❓ Location permission not yet requested');
  }
}).catch(function(error) {
  console.log('⚠️ Permission API not supported');
});

// Test location request
function testLocationRequest() {
  console.log('🔍 Requesting location... (you should see a popup!)');
  
  navigator.geolocation.getCurrentPosition(
    function(position) {
      console.log('✅ Location success!');
      console.log('📍 Latitude:', position.coords.latitude);
      console.log('📍 Longitude:', position.coords.longitude);
      console.log('🎯 Accuracy:', position.coords.accuracy, 'meters');
    },
    function(error) {
      console.error('❌ Location error:', error.message);
      switch(error.code) {
        case error.PERMISSION_DENIED:
          console.log('🚫 User denied location permission');
          break;
        case error.POSITION_UNAVAILABLE:
          console.log('📍 Location information unavailable');
          break;
        case error.TIMEOUT:
          console.log('⏰ Location request timed out');
          break;
      }
    },
    {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0
    }
  );
}

// Run the test
console.log('🚀 Starting location test in 2 seconds...');
setTimeout(testLocationRequest, 2000);