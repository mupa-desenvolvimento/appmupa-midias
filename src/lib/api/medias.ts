// Função para buscar conteúdos do endpoint get_medias_
export async function fetchMedias({ _id, token }: { _id: string, token: string }) {
  const url = `https://mupa.app/api/1.1/wf/get_medias_?_id=${_id}`;
  const response = await fetch(url, {
    headers: {
      'Authorization': `Token ${token}`,
    },
  });
  if (!response.ok) {
    throw new Error('Erro ao buscar conteúdos');
  }
  return response.json();
} 