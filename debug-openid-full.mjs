import * as openidModule from 'openid-client';

console.log('=== OPENID-CLIENT MODULE INSPECTION ===');
console.log('Top level exports:', Object.keys(openidModule));

// Check if any of the exports are functions that might be constructor-like
Object.keys(openidModule).forEach(key => {
  const item = openidModule[key];
  console.log(`\n=== Inspecting: ${key} ===`);
  console.log(`Type:`, typeof item);
  
  if (typeof item === 'function') {
    console.log('Is constructor:', /^[A-Z]/.test(key));
    console.log('Has prototype:', !!item.prototype);
    
    if (item.prototype) {
      console.log('Prototype methods:', Object.getOwnPropertyNames(item.prototype)
        .filter(name => name !== 'constructor'));
    }
  } else if (typeof item === 'object' && item !== null) {
    console.log('Properties:', Object.keys(item));
  }
});

// Is there a way to discover OpenID configurations?
console.log('\n=== Looking for discovery capabilities ===');
if (typeof openidModule.discovery === 'function') {
  console.log('Found discovery function in top-level exports');
}

// Look for something that might create clients
console.log('\n=== Looking for client creation capabilities ===');
Object.keys(openidModule).forEach(key => {
  const item = openidModule[key];
  if (typeof item === 'function' && /client/i.test(key)) {
    console.log(`Found potential client creator: ${key}`);
  }
});

// Can we directly use the Client constructor?
console.log('\n=== Checking if Client is directly available ===');
if (openidModule.Client && typeof openidModule.Client === 'function') {
  console.log('Client constructor is available at top level');
}