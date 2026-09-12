const fetch = require('node-fetch') || globalThis.fetch;

async function testApi() {
  const cpf = '42626506850';
  const url = `https://api.athenasbuscas.com/api/ext/v1/cadsus/${cpf}`;
  
  try {
    const response = await fetch(url, {
      headers: {
        'X-API-Key': 'atk_df4a825cb46f8a68e4a12b8fe2d1798e'
      }
    });
    
    console.log("Status:", response.status);
    const json = await response.json();
    console.log("Response JSON:", JSON.stringify(json, null, 2));
  } catch (err) {
    console.error("Error:", err);
  }
}

testApi();
