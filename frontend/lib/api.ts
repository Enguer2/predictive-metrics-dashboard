const API_URL = "http://localhost:8000";


export async function checkBackendStatus() {
  try {
    const response = await fetch(`${API_URL}/`, {
      method: "GET",
      cache: 'no-store' 
    });

    if (!response.ok) {
      return { status: "offline" };
    }

    return await response.json();
  } catch (error) {
    return { status: "offline" };
  }
}

export async function getAiPrediction(cpu: number, ram: number) {
  try {
    const response = await fetch("http://localhost:8000/predict", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cpu_usage: cpu, ram_usage: ram }),
    });
    return await response.json();
  } catch (error) {
    return null;
  }
}