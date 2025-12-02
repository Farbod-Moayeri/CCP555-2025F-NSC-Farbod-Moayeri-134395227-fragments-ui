// src/api.js

/**
 * The base URL for the Fragments API.
 * Defaults to localhost:8080 if not set in the environment.
 */
const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8080';

/**
 * Helper: Generates Basic Auth headers from username & password.
 * If `type` is provided, sets Content-Type, otherwise only Authorization.
 */
function basicAuthHeaders(email, password, type) {
  const encoded = btoa(`${email}:${password}`);
  const headers = {
    Authorization: `Basic ${encoded}`,
  };
  if (type) {
    headers['Content-Type'] = type;
  }
  return headers;
}

/**
 * Simple UI helper: show an error message.
 */
function showError(message, err) {
  console.error(message, err);
  alert(message);
}

/**
 * Fetches all fragments for the authenticated user using Basic Auth.
 * ?expand=1 returns full metadata objects.
 */
export async function getUserFragments(email, password) {
  try {
    const res = await fetch(`${apiUrl}/v1/fragments?expand=1`, {
      headers: basicAuthHeaders(email, password),
    });

    if (!res.ok) {
      throw new Error(`${res.status} ${res.statusText}`);
    }

    const data = await res.json();
    return data;
  } catch (err) {
    showError('Failed to fetch fragments. Check your credentials or API connection.', err);
  }
}

/**
 * Creates a new fragment.
 * @param {string} email
 * @param {string} password
 * @param {string} type - MIME type, e.g. "text/plain"
 * @param {string|ArrayBuffer|Blob} content
 */
export async function createFragment(email, password, type, content) {
  try {
    const res = await fetch(`${apiUrl}/v1/fragments`, {
      method: 'POST',
      headers: basicAuthHeaders(email, password, type),
      body: content,
    });

    if (!res.ok) {
      throw new Error(`${res.status} ${res.statusText}`);
    }

    const data = await res.json();
    return data;
  } catch (err) {
    showError('Failed to create fragment.', err);
  }
}

/**
 * Gets raw fragment data by id.
 * Returns object with { contentType, text?, blob? } depending on type.
 */
export async function getFragmentData(email, password, id) {
  try {
    const res = await fetch(`${apiUrl}/v1/fragments/${id}`, {
      headers: basicAuthHeaders(email, password),
    });

    if (res.status === 404) {
      return null;
    }

    if (!res.ok) {
      throw new Error(`${res.status} ${res.statusText}`);
    }

    const contentType = res.headers.get('Content-Type') || '';

    if (contentType.startsWith('image/')) {
      const blob = await res.blob();
      return { contentType, blob };
    }

    // default: treat as text
    const text = await res.text();
    return { contentType, text };
  } catch (err) {
    showError('Failed to fetch fragment data.', err);
  }
}

/**
 * Gets converted fragment data via /v1/fragments/:id.ext
 */
export async function getConvertedFragmentData(email, password, id, ext) {
  try {
    const res = await fetch(`${apiUrl}/v1/fragments/${id}.${ext}`, {
      headers: basicAuthHeaders(email, password),
    });

    if (res.status === 404 || res.status === 415) {
      // 404 = fragment not found, 415 = unsupported conversion
      return { errorStatus: res.status };
    }

    if (!res.ok) {
      throw new Error(`${res.status} ${res.statusText}`);
    }

    const contentType = res.headers.get('Content-Type') || '';

    if (contentType.startsWith('image/')) {
      const blob = await res.blob();
      return { contentType, blob };
    }

    const text = await res.text();
    return { contentType, text };
  } catch (err) {
    showError('Failed to fetch converted fragment data.', err);
  }
}

/**
 * Updates an existing fragment via PUT /v1/fragments/:id
 */
export async function updateFragment(email, password, id, type, content) {
  try {
    const res = await fetch(`${apiUrl}/v1/fragments/${id}`, {
      method: 'PUT',
      headers: basicAuthHeaders(email, password, type),
      body: content,
    });

    if (!res.ok) {
      throw new Error(`${res.status} ${res.statusText}`);
    }

    const data = await res.json();
    return data;
  } catch (err) {
    showError(err);
  }
}

/**
 * Deletes an existing fragment via DELETE /v1/fragments/:id
 */
export async function deleteFragment(email, password, id) {
  try {
    const res = await fetch(`${apiUrl}/v1/fragments/${id}`, {
      method: 'DELETE',
      headers: basicAuthHeaders(email, password),
    });

    if (res.status === 404) {
      return { status: 'not-found' };
    }

    if (!res.ok) {
      throw new Error(`${res.status} ${res.statusText}`);
    }

    const data = await res.json();
    return data;
  } catch (err) {
    showError('Failed to delete fragment.', err);
  }
}
