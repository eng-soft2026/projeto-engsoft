export const HOTEL_ID = "3f1c2a4e-8b7d-4c6a-9e21-5d0b7a1c9f33";

export function createJsonRequest(url, method, body, headers = {}) {
    return new Request(url, {
        method,
        headers: { "content-type": "application/json", ...headers },
        body: JSON.stringify(body),
    });
}

export function createRouteContext(id = HOTEL_ID) {
    return { params: Promise.resolve({ id }) };
}
