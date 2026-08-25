// Єдиний транспортний шар. Cookie-based auth: браузер сам додає cookie,
// нам нічого зберігати вручну не треба. Уся мережа додатку ходить через це.

export async function apiFetch<T = unknown>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const response = await fetch(endpoint, {
    ...options,
    credentials: "same-origin",
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  if (response.status === 401) {
    // Сесія протухла — перезавантажуємо, React покаже LoginScreen.
    window.location.reload();
    throw new Error("Session expired");
  }

  if (!response.ok) {
    const err = await response
      .json()
      .catch(() => ({ error: `HTTP ${response.status}` }));
    throw new Error(
      (err as { error?: string }).error ?? `HTTP ${response.status}`
    );
  }

  return response.json() as Promise<T>;
}