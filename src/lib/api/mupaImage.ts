export async function getMupaToken() {
  const response = await fetch('http://srv-mupa.ddns.net:5050/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      username: 'antunes@mupa.app',
      password: '#Mupa04051623$'
    })
  });
  if (!response.ok) throw new Error('Erro ao obter token Mupa');
  const data = await response.json();
  return data.access_token || data.token || data;
}

export async function getProductImageAndColors(barcode: string, token: string) {
  const response = await fetch(`http://srv-mupa.ddns.net:5050/produto-imagem/${barcode}`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  if (!response.ok) throw new Error('Erro ao buscar imagem do produto');
  return response.json();
} 