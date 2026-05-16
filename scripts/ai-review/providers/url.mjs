function stripTrailingSlash(url) {
  return url.endsWith("/") ? url.slice(0, -1) : url;
}

export function resolveOpenAIEndpoint(baseUrl) {
  const normalized = stripTrailingSlash(baseUrl);
  if (normalized.endsWith("/chat/completions")) {
    return normalized;
  }
  return `${normalized}/chat/completions`;
}

export function resolveAnthropicEndpoint(baseUrl) {
  const normalized = stripTrailingSlash(baseUrl);
  if (normalized.endsWith("/messages")) {
    return normalized;
  }
  return `${normalized}/messages`;
}
