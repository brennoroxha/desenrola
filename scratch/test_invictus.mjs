import fetch from "node-fetch";

const payload = {
  amount: 1000,
  paymentMethod: "pix",
  customer: {
    name: "João da Silva",
    email: "joao@email.com",
    document: "12345678909",
    phone: "11999999999"
  },
  items: [
    {
      quantity: 1,
      amount: 1000,
      offer_hash: "off_01m2nvs55eafrc4w3xm31kcqzy"
    }
  ],
  pix: {
    expirationInSeconds: 1800
  }
};

async function run() {
  try {
    const res = await fetch("https://api.invictuspayv2.com.br/api/v1/transactions", {
      method: "POST",
      headers: {
        "Accept": "application/json",
        "Content-Type": "application/json",
        "X-Api-Key": "sk_I8A9gb2jhneMItnpnlxUpXmNyD0KtzSH2YyOA9qtuSdztVLrBNNperIr"
      },
      body: JSON.stringify(payload)
    });
    
    const text = await res.text();
    console.log("Status:", res.status);
    console.log("Response:", text);
  } catch (err) {
    console.error("Error:", err);
  }
}

run();
