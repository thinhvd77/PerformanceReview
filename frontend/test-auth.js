// Test script for authentication functionality
// This can be run in the browser console to test the auth system

console.log('=== Authentication System Test ===');

// Import the authService (assuming it's available globally)
// In practice, this would be tested through the UI or with proper testing framework

// Test 1: Token validation
console.log('\n1. Testing token validation:');
try {
    // Test with invalid token
    const invalidToken = 'invalid.token.here';
    console.log('Invalid token test:', !window.authService?.isValidToken(invalidToken));
    
    // Test with no token
    console.log('No token test:', !window.authService?.isValidToken(null));
    
    // Test getCurrentUser without valid token
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    console.log('getCurrentUser without token:', window.authService?.getCurrentUser() === null);
    
} catch (error) {
    console.error('Token validation test failed:', error);
}

// Test 2: Authentication state
console.log('\n2. Testing authentication state:');
try {
    console.log('Is authenticated (no token):', !window.authService?.isAuthenticated());
} catch (error) {
    console.error('Authentication state test failed:', error);
}

// Test 3: Browser history clearing (simulation)
console.log('\n3. Testing browser history clearing:');
try {
    // Simulate logout process
    const originalPushState = history.pushState;
    const originalReplaceState = history.replaceState;
    
    let pushStateCalled = false;
    let replaceStateCalled = false;
    
    // Mock history methods to check if they're called
    history.pushState = function(...args) {
        pushStateCalled = true;
        return originalPushState.apply(this, args);
    };
    
    history.replaceState = function(...args) {
        replaceStateCalled = true;
        return originalReplaceState.apply(this, args);
    };
    
    // Test logout functionality
    if (window.authService?.logout) {
        window.authService.logout();
        console.log('History manipulation during logout:', pushStateCalled || replaceStateCalled);
    }
    
    // Restore original methods
    history.pushState = originalPushState;
    history.replaceState = originalReplaceState;
    
} catch (error) {
    console.error('History clearing test failed:', error);
}

// Test 4: Storage clearing
console.log('\n4. Testing storage clearing:');
try {
    // Set some test data
    localStorage.setItem('test-token', 'test-value');
    sessionStorage.setItem('test-session', 'test-value');
    
    // Call logout
    if (window.authService?.logout) {
        window.authService.logout();
    }
    
    console.log('Token cleared:', !localStorage.getItem('token'));
    console.log('User cleared:', !localStorage.getItem('user'));
    console.log('Session storage cleared:', !sessionStorage.getItem('test-session'));
    
} catch (error) {
    console.error('Storage clearing test failed:', error);
}

console.log('\n=== Test Complete ===');
console.log('Note: For full testing, use the application UI to test:');
console.log('- Login with admin credentials and verify redirect to /admin');
console.log('- Login with regular user and verify redirect to /');
console.log('- Try accessing protected routes without authentication');
console.log('- Try accessing /admin as non-admin user');
console.log('- Test logout and browser back button behavior');