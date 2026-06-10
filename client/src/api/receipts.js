// Single place on the frontend for HTTP requests.
// Components do not know about fetch, URLs, or headers.

const BASE_URL = '/api/receipts';

async function handleResponse(response) {
  // Try to parse JSON even on error — backend sends { error: "..." }
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
  formData.append('receipt', file); // Field name must match multer .single('receipt')

  const response = await fetch(BASE_URL, {
    method: 'POST',
    body: formData,
    // IMPORTANT: do NOT set Content-Type manually!
    // The browser sets multipart/form-data with the correct boundary.
  });
  return handleResponse(response);
}

export async function deleteReceipt(id) {
  const response = await fetch(`${BASE_URL}/${id}`, { method: 'DELETE' });
  if (!response.ok) {
    const data = await response.json().catch(() => null);
    throw new Error(data?.error || `Palvelinvirhe (${response.status})`);
  }
  // 204 — no body to parse
}
