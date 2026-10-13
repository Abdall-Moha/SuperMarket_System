const API_URL = "/api";

function errorMessage(status, data) {
  if (data && data.message) {
    return data.message;
  }

  if (status === 401) {
    return "Your session has expired. Please sign in again.";
  }

  if (status === 403) {
    return "You do not have permission to do this.";
  }

  if (status === 429) {
    return "Too many attempts. Please wait and try again.";
  }

  if (status === 500) {
    return "Something went wrong. Please try again.";
  }

  return "Request failed";
}

export async function apiRequest(path, options) {
  const token = localStorage.getItem("token");
  const headers = {
    "Content-Type": "application/json",
  };

  if (token) {
    headers.Authorization = "Bearer " + token;
  }

  try {
    const response = await fetch(API_URL + path, {
      method: options && options.method ? options.method : "GET",
      headers: headers,
      body: options && options.body ? JSON.stringify(options.body) : undefined,
    });

    let data = {};

    try {
      data = await response.json();
    } catch (error) {
      data = {};
    }

    if (response.ok === false) {
      console.error("API request failed:", path, response.status, data);
      data.message = errorMessage(response.status, data);
    }

    return {
      ok: response.ok,
      status: response.status,
      data: data,
    };
  } catch (error) {
    console.error("API connection failed:", path, error);

    return {
      ok: false,
      status: 0,
      data: {
        message: "Could not connect to the server.",
      },
    };
  }
}
