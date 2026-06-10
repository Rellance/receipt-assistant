// Единственное место во фронтенде, где живут HTTP-запросы.
// Компоненты не знают про fetch, URL'ы и заголовки.

const BASE_URL = '/api/receipts';

async function handleResponse(response) {
  // Пытаемся прочитать JSON даже при ошибке — бэкенд шлёт { error: "..." }
  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(data?.error || `Palvelinvirhe (${response.status})`);
  }
  return data;
}

export async function fetchReceipts() {
  const response = await fetch(BASE_URL);
  return handleResponse(response);
}

export async function fetchCategoryStats() {
  const response = await fetch(`${BASE_URL}/stats/categories`);
  return handleResponse(response);
}

export async function uploadReceipt(file) {
  const formData = new FormData();
  formData.append('receipt', file); // Имя поля = имя в multer .single('receipt')

  const response = await fetch(BASE_URL, {
    method: 'POST',
    body: formData,
    // ВАЖНО: НЕ ставим Content-Type вручную!
    // Браузер сам поставит multipart/form-data с правильным boundary.
  });
  return handleResponse(response);
}
export async function deleteReceipt(id) {
    const response = await fetch(`${BASE_URL}/${id}`, { method: 'DELETE' });
    if (!response.ok) {
      const data = await response.json().catch(() => null);
      throw new Error(data?.error || `Palvelinvirhe (${response.status})`);
    }
    // 204 — тела нет, парсить нечего
  }