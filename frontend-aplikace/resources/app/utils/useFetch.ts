export const useFetch = async (
  url: string,
  method: string = 'GET',
  data?: Record<string, any>,
  includeCredentials: boolean = true,
) => {

  const options: RequestInit = {
    method,
    headers: {
      Accept: 'application/json, text/html',
    },
    credentials: includeCredentials ? 'include' : undefined,
  };


  if (data && method !== 'GET') {
    options.headers = {
      ...options.headers,
      'Content-Type': 'application/json',
    };
    options.body = JSON.stringify(data);
  }

  const response = await fetch(url, options);

  if (!response.ok) {
    let errorDetails: Record<string, any> = { status: response.status };

    try {
      const errorJson = await response.json();
      errorDetails = {
        ...errorDetails,
        errors: errorJson.errors || null,
        message: errorJson.error ?? errorJson.message ?? `HTTP Error! Status: ${response.status}`,
      };
    } catch {
      errorDetails.message = `HTTP Error! Status: ${response.status}`;
    }

    console.error('Fetch error details:', errorDetails);
    throw errorDetails;
  }

  const contentType = response.headers.get('Content-Type');
  if (contentType?.includes('application/json')) {
    return response.json();
  } else if (contentType?.includes('text/html')) {
    return response.text();
  }

  return response;
};
