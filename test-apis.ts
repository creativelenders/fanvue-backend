import dotenv from 'dotenv';
dotenv.config();

async function testDeepSeek() {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    console.log("❌ DEEPSEEK_API_KEY is missing");
    return;
  }
  
  try {
    const res = await fetch("https://api.deepseek.com/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: "deepseek-chat",
        messages: [{ role: "user", content: "Hello! Reply with exactly 'DeepSeek OK'." }],
        max_tokens: 10
      })
    });
    
    if (res.ok) {
      const data = await res.json();
      console.log(`✅ DeepSeek API is working! Response: ${data.choices[0].message.content.trim()}`);
    } else {
      const errorText = await res.text();
      console.log(`❌ DeepSeek API failed: ${res.status} ${res.statusText}`);
      console.log(`   Details: ${errorText}`);
    }
  } catch (err) {
    console.log(`❌ DeepSeek API error:`, err);
  }
}

async function testKimi() {
  const apiKey = process.env.KIMI_API_KEY;
  if (!apiKey) {
    console.log("❌ KIMI_API_KEY is missing");
    return;
  }
  
  try {
    const res = await fetch("https://api.moonshot.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: "moonshot-v1-8k",
        messages: [{ role: "user", content: "Hello! Reply with exactly 'Kimi OK'." }],
        max_tokens: 10
      })
    });
    
    if (res.ok) {
      const data = await res.json();
      console.log(`✅ Kimi (Moonshot) API is working! Response: ${data.choices[0].message.content.trim()}`);
    } else {
      const errorText = await res.text();
      console.log(`❌ Kimi API failed: ${res.status} ${res.statusText}`);
      console.log(`   Details: ${errorText}`);
    }
  } catch (err) {
    console.log(`❌ Kimi API error:`, err);
  }
}

async function main() {
  console.log("🧪 Testing API Keys...\n");
  await testDeepSeek();
  console.log("");
  await testKimi();
}

main();
