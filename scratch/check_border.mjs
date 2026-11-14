const res = await fetch('http://127.0.0.1:9280/json').catch(() => null)
console.log('port 9280 response:', res ? 'active' : 'inactive')

